import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { PGlite } from "@electric-sql/pglite";
const db = new PGlite(),
  alice = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  bob = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
  admin = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const id = (p, n) => `${p}-0000-4000-8000-${String(n).padStart(12, "0")}`;
const template = id("c5400000", 5),
  attempt = crypto.randomUUID(),
  q1 = id("c5200000", 1),
  q2 = id("c5200000", 2),
  option = id("c5300000", 1);
const rows = async (sql, args = []) => (await db.query(sql, args)).rows;
async function role(name, user = "") {
  await db.exec("reset role");
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [user]);
  await db.exec(`set role ${name}`);
}
async function rpc(name, args = []) {
  return (
    await rows(
      `select public.${name}(${args.map((_, i) => "$" + (i + 1)).join(",")}) data`,
      args,
    )
  )[0].data;
}
before(async () => {
  await db.exec(
    `create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key,email_confirmed_at timestamptz default now(),raw_user_meta_data jsonb not null default '{}');create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema auth to anon,authenticated;grant execute on function auth.uid() to anon,authenticated;`,
  );
  for (const f of fs.readdirSync("supabase/migrations").sort())
    await db.exec(fs.readFileSync("supabase/migrations/" + f, "utf8"));
  await db.exec(
    fs.readFileSync("supabase/seeds/20261024_task5_drafts.sql", "utf8"),
  );
  await rows("insert into auth.users(id) values($1),($2),($3)", [
    alice,
    bob,
    admin,
  ]);
  await rows("insert into private.admin_users values($1)", [admin]);
});
after(() => db.close());
test("draft sample catalog is visible but no exam can begin before human review", async () => {
  await role("anon");
  const catalog = await rpc("exam_catalog");
  assert.equal(catalog.length, 5);
  assert.ok(catalog.every((t) => !t.available));
  assert.equal(
    (await rows("select * from public.questions where id::text like 'c520%'"))
      .length,
    0,
  );
  await assert.rejects(
    () => rpc("start_exam", [attempt, template]),
    /permission denied/,
  );
  await role("authenticated", alice);
  await assert.rejects(
    () => rpc("start_exam", [attempt, template]),
    /Insufficient/,
  );
});
test("ordinary learners cannot create, approve or publish questions", async () => {
  await assert.rejects(
    () => rpc("admin_exam_question", [q1, {}, "review"]),
    /Administrator/,
  );
  await assert.rejects(
    () =>
      rows("update public.questions set exam_status='published' where id=$1", [
        q1,
      ]).then(async () => {
        const row = await rows("select * from public.questions where id=$1", [
          q1,
        ]);
        if (!row.length) throw Error("Denied by RLS");
      }),
    /Denied/,
  );
  await assert.rejects(() => rpc("admin_exam_list"), /Administrator/);
});
test("admin workflow enforces transitions and records reviewer and date", async () => {
  await role("authenticated", admin);
  await assert.rejects(
    () => rpc("admin_exam_question", [q1, {}, "publish"]),
    /Invalid review/,
  );
  for (const q of [q1, q2])
    for (const action of ["review", "approve", "publish"])
      await rpc("admin_exam_question", [q, {}, action]);
  const library = await rpc("admin_exam_list");
  assert.equal(library.find((q) => q.id === q1).reviews.length, 3);
  assert.equal(library.find((q) => q.id === q1).reviews[1].reviewer_id, admin);
  assert.ok(library.find((q) => q.id === q1).reviews[1].created_at);
});
test("start persists deadline and restores the same question snapshot and ID", async () => {
  await role("authenticated", alice);
  assert.equal(await rpc("start_exam", [attempt, template]), attempt);
  const a = await rpc("get_exam", [attempt]);
  assert.equal(a.questions.length, 2);
  assert.equal(a.status, "active");
  assert.ok(Date.parse(a.expires_at) > Date.parse(a.started_at));
  assert.equal(await rpc("start_exam", [attempt, template]), attempt);
  const restored = await rpc("get_exam", [attempt]);
  assert.equal(restored.expires_at, a.expires_at);
  assert.deepEqual(restored.questions, a.questions);
});
test("quick counts and difficulties are validated by the database", async () => {
  const charlie = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
  await role("postgres");
  await rows("insert into auth.users(id) values($1)", [charlie]);
  await role("authenticated", charlie);
  const quick = id("c5400000", 1);
  await assert.rejects(
    () => rpc("start_exam", [crypto.randomUUID(), quick, 2, "mixed"]),
    /Invalid exam configuration/,
  );
  await assert.rejects(
    () => rpc("start_exam", [crypto.randomUUID(), quick, 1, "hard"]),
    /Insufficient/,
  );
  await assert.rejects(
    () => rpc("start_exam", [crypto.randomUUID(), template, 1, "mixed"]),
    /Invalid exam configuration/,
  );
  const single = crypto.randomUUID();
  await rpc("start_exam", [single, quick, 1, "easy"]);
  assert.equal((await rpc("get_exam", [single])).questions.length, 1);
  await rpc("submit_exam", [single]);
  await role("authenticated", alice);
});
test("active payloads and public tables never expose keys or explanations", async () => {
  const a = await rpc("get_exam", [attempt]);
  assert.equal(a.result, null);
  assert.ok(!JSON.stringify(a).includes("correctOptionId"));
  assert.ok(!JSON.stringify(a).includes("explanation"));
  await assert.rejects(
    () => rows("select * from private.exam_items"),
    /permission denied/,
  );
  await assert.rejects(
    () => rows("select * from private.answer_keys"),
    /permission denied/,
  );
  assert.equal((await rows("select * from public.exam_results")).length, 0);
});
test("answers and flags persist, invalid options and foreign questions are rejected", async () => {
  assert.equal(
    await rpc("save_exam_response", [attempt, q1, option, true]),
    true,
  );
  const a = await rpc("get_exam", [attempt]);
  assert.equal(a.questions.find((q) => q.id === q1).selectedOptionId, option);
  assert.equal(a.questions.find((q) => q.id === q1).flagged, true);
  await assert.rejects(
    () => rpc("save_exam_response", [attempt, q1, id("c5300000", 5), false]),
    /Invalid option/,
  );
  await assert.rejects(
    () => rpc("save_exam_response", [attempt, id("c5200000", 3), null, false]),
    /Invalid option/,
  );
});
test("ownership holds for reads, saves, result retrieval and submission", async () => {
  await role("authenticated", bob);
  for (const fn of [
    () => rpc("get_exam", [attempt]),
    () => rpc("save_exam_response", [attempt, q1, option, false]),
    () => rpc("submit_exam", [attempt]),
  ])
    await assert.rejects(fn, /Attempt unavailable/);
  assert.equal((await rows("select * from public.exam_attempts")).length, 0);
  assert.equal((await rows("select * from public.exam_responses")).length, 0);
  assert.equal(
    (await rows("select * from public.exam_section_attempts")).length,
    0,
  );
  await assert.rejects(
    () => rpc("start_exam", [attempt, template]),
    /Attempt conflict/,
  );
});
test("learners cannot forge deadlines, response writes, scores or result rows", async () => {
  await role("authenticated", alice);
  for (const sql of [
    "update public.exam_attempts set expires_at=now()+interval '1 day'",
    "insert into public.exam_results(attempt_id,result) values('" +
      attempt +
      "','{}')",
    "update public.exam_responses set option_id=null",
  ])
    await assert.rejects(() => rows(sql), /permission denied/);
  await assert.rejects(
    () => rpc("start_exam", [crypto.randomUUID(), template]),
    /Resume/,
  );
});
test("legacy guest grading cannot expose private exam bank keys", async () => {
  await role("anon");
  await assert.rejects(
    () => rpc("practice_quiz", [id("c5100000", 1), []]),
    /unavailable/i,
  );
  await role("postgres");
  await assert.rejects(
    () =>
      rows("update public.question_banks set published=true where id=$1", [
        id("c5100000", 1),
      ]),
    /exam_bank_is_private/,
  );
});
test("grading is server-controlled, supports unanswered questions and is idempotent", async () => {
  await role("authenticated", alice);
  const r = await rpc("submit_exam", [attempt]);
  assert.equal(r.total, 2);
  assert.equal(r.correct, 1);
  assert.equal(r.unanswered, 1);
  assert.equal(r.answers.find((q) => q.id === q1).correctOptionId, option);
  assert.ok(r.answers.every((q) => q.explanation.length > 10));
  assert.deepEqual(await rpc("submit_exam", [attempt]), r);
  assert.equal((await rows("select * from public.exam_results")).length, 1);
  assert.equal(
    await rpc("save_exam_response", [attempt, q1, null, false]),
    false,
  );
  const a = await rpc("get_exam", [attempt]);
  assert.equal(a.status, "submitted");
  assert.deepEqual(a.result, r);
});
test("completed question keys cannot reappear as a new active examination", async () => {
  await assert.rejects(
    () => rpc("start_exam", [crypto.randomUUID(), template]),
    /Insufficient/,
  );
});
test("deadline expiry rejects late answers and finalizes on recovery without resetting time", async () => {
  await role("authenticated", bob);
  const late = crypto.randomUUID();
  await rpc("start_exam", [late, template]);
  const start = await rpc("get_exam", [late]);
  await role("postgres");
  await rows(
    "update public.exam_attempts set expires_at=clock_timestamp()-interval '1 second' where id=$1",
    [late],
  );
  await role("authenticated", bob);
  assert.equal(
    await rpc("save_exam_response", [late, q1, option, false]),
    false,
  );
  const recovered = await rpc("get_exam", [late]);
  assert.equal(recovered.status, "submitted");
  assert.equal(recovered.result.unanswered, 2);
  assert.equal(recovered.result.correct, 0);
  assert.notEqual(recovered.expires_at, start.expires_at);
  assert.ok(Date.parse(recovered.expires_at) < Date.now());
  assert.equal((await rows("select * from public.exam_results")).length, 1);
});
test("editing published options invalidates review without changing historical results", async () => {
  await role("authenticated", admin);
  await rows("update public.question_options set text=$1 where id=$2", [
    "に（改訂）",
    option,
  ]);
  assert.equal(
    (
      await rows("select exam_status from public.questions where id=$1", [q1])
    )[0].exam_status,
    "draft",
  );
  await role("authenticated", alice);
  const a = await rpc("get_exam", [attempt]);
  assert.equal(a.result.answers.find((q) => q.id === q1).options[0].text, "に");
});
test("full mocks and listening remain unavailable", async () => {
  await role("postgres");
  const full = crypto.randomUUID();
  await rows(
    "insert into public.exam_templates(id,title,level,mode,published) values($1,'Unavailable full mock','n5','full',true)",
    [full],
  );
  await role("authenticated", alice);
  await assert.rejects(
    () => rpc("start_exam", [crypto.randomUUID(), full]),
    /unavailable/i,
  );
  await role("authenticated", admin);
  const library = await rpc("admin_exam_list");
  const data = { ...library[0].data, subject: "listening", type: "listening" };
  await assert.rejects(
    () => rpc("admin_exam_question", [null, data, "save"]),
    /Invalid question/,
  );
});
test("question creation, draft editing, archive, and malformed documents are enforced in PostgreSQL", async () => {
  await role("authenticated", admin);
  const library = await rpc("admin_exam_list");
  const data = {
    ...library.find((q) => q.id === q2).data,
    prompt: "日本語（　）勉強します。",
    type: "grammar_completion",
    options: ["を", "が", "へ", "と"],
    correctIndex: 0,
    explanation: "を marks the object of 勉強します in this sentence.",
    japaneseExplanation: "「を」は動作の対象を表します。",
  };
  const q = await rpc("admin_exam_question", [null, data, "save"]);
  assert.ok(q);
  let current = (await rpc("admin_exam_list")).find((item) => item.id === q);
  assert.equal(current.status, "draft");
  assert.equal(current.data.correctIndex, 0);
  await rpc("admin_exam_question", [
    q,
    { ...data, prompt: "毎日、日本語（　）勉強します。" },
    "save",
  ]);
  for (const action of ["review", "approve", "publish", "archive"])
    await rpc("admin_exam_question", [q, {}, action]);
  current = (await rpc("admin_exam_list")).find((item) => item.id === q);
  assert.equal(current.status, "archived");
  assert.equal(current.reviews.at(-1).status, "archived");
  await assert.rejects(
    () =>
      rpc("admin_exam_question", [
        null,
        { ...data, options: ["を", "を"] },
        "save",
      ]),
    /Invalid options/,
  );
  await assert.rejects(
    () => rpc("admin_exam_question", [null, { ...data, level: null }, "save"]),
    /Invalid question/,
  );
});
test("draft fixture is repeatable without republishing edited or reviewed questions", async () => {
  await role("postgres");
  await db.exec(
    fs.readFileSync("supabase/seeds/20261024_task5_drafts.sql", "utf8"),
  );
  assert.equal(
    (
      await rows("select exam_status from public.questions where id=$1", [q1])
    )[0].exam_status,
    "draft",
  );
  assert.equal(
    (
      await rows("select text from public.question_options where id=$1", [
        option,
      ])
    )[0].text,
    "に（改訂）",
  );
});
test("SQL review rejects duplicate options even after direct admin edits", async () => {
  await role("authenticated", admin);
  const options = await rows(
    "select id,text from public.question_options where question_id=$1 order by position",
    [q2],
  );
  await rows("update public.question_options set text=$1 where id=$2", [
    options[0].text,
    options[1].id,
  ]);
  await assert.rejects(
    () => rpc("admin_exam_question", [q2, {}, "review"]),
    /options validation/,
  );
});
