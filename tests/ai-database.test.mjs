import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { PGlite } from "@electric-sql/pglite";
const db = new PGlite(),
  alice = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  bob = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
  scenario = "d7010000-0000-4000-8000-000000000001";
const settings = {
  scenarioId: scenario,
  level: "n5",
  target: 5,
  locale: "en",
  furigana: true,
  translation: true,
  correctionMode: "each",
};
const rows = async (sql, args = []) => (await db.query(sql, args)).rows;
async function role(name, user = "") {
  await db.exec("reset role");
  await rows("select set_config('request.jwt.claim.sub',$1,false)", [user]);
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
const output = {
  dialogue: "そうですか。何が好きですか。",
  translation: "What do you like?",
  category: "correct",
  correction: null,
  explanation: "A correct example.",
  natural: null,
  polite: null,
  grammar: null,
  example: null,
  vocabulary: [{ term: "本", meaning: "book" }],
};
const session = crypto.randomUUID(),
  request = crypto.randomUUID();
before(async () => {
  await db.exec(
    `create role anon;create role authenticated;create role service_role;create schema auth;create table auth.users(id uuid primary key,email_confirmed_at timestamptz default now(),raw_user_meta_data jsonb not null default '{}');create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema auth to anon,authenticated;grant execute on function auth.uid() to anon,authenticated;`,
  );
  for (const file of fs.readdirSync("supabase/migrations").sort())
    await db.exec(fs.readFileSync(`supabase/migrations/${file}`, "utf8"));
  await db.exec(
    fs.readFileSync("supabase/seeds/20261024_task7_scenarios.sql", "utf8"),
  );
  await rows("insert into auth.users(id) values($1),($2)", [alice, bob]);
});
after(() => db.close());
test("six scenario definitions extend the existing table without replacing legacy sessions", async () => {
  assert.equal(
    (await rows("select * from public.ai_scenarios where slug is not null"))
      .length,
    6,
  );
  assert.equal(
    (await rows("select count(*)::int n from public.ai_roleplay_sessions"))[0]
      .n,
    0,
  );
});
test("learners cannot write trusted replies, sessions, feedback or usage", async () => {
  await role("authenticated", alice);
  for (const name of ["ai_sessions", "ai_messages", "ai_feedback", "ai_usage"])
    await assert.rejects(
      () =>
        rows(`insert into public.${name}(id) values($1)`, [
          crypto.randomUUID(),
        ]),
      /permission denied/,
    );
  await assert.rejects(
    () => rpc("ai_start", [alice, session, settings]),
    /permission denied/,
  );
  await assert.rejects(
    () => rpc("ai_reserve", [alice, session, request, "はい", "test-model"]),
    /permission denied/,
  );
});
test("server start is idempotent and creates one private opening plus settings", async () => {
  await role("service_role");
  assert.equal(await rpc("ai_start", [alice, session, settings]), session);
  assert.equal(await rpc("ai_start", [alice, session, settings]), session);
  await role("authenticated", alice);
  assert.equal((await rows("select * from public.ai_messages")).length, 1);
  assert.equal(
    (await rows("select * from public.ai_user_settings"))[0].settings.level,
    "n5",
  );
  await role("authenticated", bob);
  assert.equal((await rows("select * from public.ai_sessions")).length, 0);
  assert.equal((await rows("select * from public.ai_messages")).length, 0);
});
test("reservation locks a turn and rejects overlapping or repeated provider requests", async () => {
  await role("service_role");
  const reserved = await rpc("ai_reserve", [
    alice,
    session,
    request,
    "今日は本を読みました。",
    "test-model",
  ]);
  assert.equal(reserved.turn, 1);
  await assert.rejects(
    () =>
      rpc("ai_reserve", [
        alice,
        session,
        crypto.randomUUID(),
        "はい",
        "test-model",
      ]),
    /Reply pending/,
  );
  await assert.rejects(
    () => rpc("ai_reserve", [alice, session, request, "はい", "test-model"]),
    /already attempted/,
  );
});
test("completion persists a single pair, feedback and token usage and retry cannot charge again", async () => {
  await rpc("ai_finish", [alice, session, request, output, 123, 45, 0.001]);
  assert.deepEqual(
    await rpc("ai_reserve", [
      alice,
      session,
      request,
      "今日は本を読みました。",
      "test-model",
    ]),
    { replay: true },
  );
  await role("authenticated", alice);
  assert.equal((await rows("select * from public.ai_messages")).length, 3);
  assert.equal(
    (await rows("select * from public.ai_feedback"))[0].original,
    "今日は本を読みました。",
  );
  assert.equal(
    (await rows("select * from public.ai_usage"))[0].input_tokens,
    123,
  );
  await role("authenticated", bob);
  assert.equal((await rows("select * from public.ai_feedback")).length, 0);
  assert.equal((await rows("select * from public.ai_usage")).length, 0);
});
test("failed provider requests release the turn without fake saved answers and still count against limits", async () => {
  await role("service_role");
  const id = crypto.randomUUID();
  await rpc("ai_reserve", [alice, session, id, "こんにちは", "test-model"]);
  await rpc("ai_finish", [alice, session, id, null, 0, 0, null]);
  await assert.rejects(
    () => rpc("ai_reserve", [alice, session, id, "こんにちは", "test-model"]),
    /Request failed/,
  );
  await role("authenticated", alice);
  assert.equal((await rows("select * from public.ai_messages")).length, 3);
  assert.equal(
    (await rows("select * from public.ai_usage where status='failed'")).length,
    1,
  );
});
test("settings remain owner scoped and do not grant any permission", async () => {
  await rpc("ai_save_settings", [
    {
      ...settings,
      level: "n2",
      scenarioId: "d7010000-0000-4000-8000-000000000003",
    },
  ]);
  assert.equal(
    (await rows("select settings from public.ai_user_settings"))[0].settings
      .level,
    "n2",
  );
  assert.equal(await rpc("is_admin"), false);
  await assert.rejects(
    () => rpc("ai_save_settings", [{ ...settings, target: 99 }]),
    /Invalid settings/,
  );
  await role("authenticated", bob);
  assert.equal((await rows("select * from public.ai_user_settings")).length, 0);
});
test("complete target ends the session and blocks further generation", async () => {
  await role("postgres");
  await rows(
    "update public.ai_usage set created_at=now()-interval '2 minutes'",
  );
  await role("service_role");
  for (let i = 0; i < 4; i++) {
    const id = crypto.randomUUID();
    await rpc("ai_reserve", [alice, session, id, "はい", "test-model"]);
    await rpc("ai_finish", [alice, session, id, output, 10, 10, null]);
  }
  await role("authenticated", alice);
  assert.equal(
    (await rows("select status from public.ai_sessions"))[0].status,
    "completed",
  );
  await role("service_role");
  await assert.rejects(
    () =>
      rpc("ai_reserve", [
        alice,
        session,
        crypto.randomUUID(),
        "はい",
        "test-model",
      ]),
    /Session ended/,
  );
});
test("cross-owner mutation and unpublished scenario starts fail", async () => {
  await assert.rejects(
    () =>
      rpc("ai_reserve", [
        bob,
        session,
        crypto.randomUUID(),
        "はい",
        "test-model",
      ]),
    /unavailable/,
  );
  await role("postgres");
  await rows("update public.ai_scenarios set published=false where id=$1", [
    scenario,
  ]);
  await role("service_role");
  await assert.rejects(
    () => rpc("ai_start", [alice, crypto.randomUUID(), settings]),
    /unavailable/,
  );
  await role("postgres");
  await rows("update public.ai_scenarios set published=true where id=$1", [
    scenario,
  ]);
});
test("minute and daily quotas survive session deletion", async () => {
  await role("postgres");
  await rows(
    "insert into public.ai_usage(id,user_id,model,status) select gen_random_uuid(),$1,'test-model','failed' from generate_series(1,6)",
    [bob],
  );
  const s = crypto.randomUUID();
  await role("service_role");
  await rpc("ai_start", [bob, s, settings]);
  await assert.rejects(
    () =>
      rpc("ai_reserve", [bob, s, crypto.randomUUID(), "はい", "test-model"]),
    /Quota exceeded/,
  );
  await role("postgres");
  await rows(
    "update public.ai_usage set created_at=now()-interval '2 minutes' where user_id=$1",
    [bob],
  );
  await rows(
    "insert into public.ai_usage(id,user_id,model,status,created_at) select gen_random_uuid(),$1,'test-model','failed',now()-interval '2 minutes' from generate_series(1,24)",
    [bob],
  );
  await role("service_role");
  await assert.rejects(
    () =>
      rpc("ai_reserve", [bob, s, crypto.randomUUID(), "はい", "test-model"]),
    /Quota exceeded/,
  );
});
test("owner deletion cascades transcripts and feedback while preserving non-content quota records", async () => {
  await role("authenticated", bob);
  await rows("delete from public.ai_sessions where id=$1", [session]);
  await role("authenticated", alice);
  assert.equal((await rows("select * from public.ai_sessions")).length, 1);
  await rows("delete from public.ai_sessions where id=$1", [session]);
  assert.equal((await rows("select * from public.ai_messages")).length, 0);
  assert.equal((await rows("select * from public.ai_feedback")).length, 0);
  const usage = await rows("select * from public.ai_usage");
  assert.equal(usage.length, 6);
  assert(usage.every((r) => r.session_id === null));
  assert(!Object.keys(usage[0]).includes("content"));
});
test("stale reservations recover and an old response cannot overwrite a new reply", async () => {
  await role("service_role");
  const s = crypto.randomUUID(),
    old = crypto.randomUUID(),
    next = crypto.randomUUID();
  await rpc("ai_start", [alice, s, settings]);
  await role("postgres");
  await rows(
    "update public.ai_usage set created_at=now()-interval '3 minutes' where user_id=$1",
    [alice],
  );
  await role("service_role");
  await rpc("ai_reserve", [alice, s, old, "古い文", "test-model"]);
  await role("postgres");
  await rows(
    "update public.ai_sessions set request_started_at=now()-interval '2 minutes' where id=$1",
    [s],
  );
  await role("service_role");
  await rpc("ai_reserve", [alice, s, next, "新しい文", "test-model"]);
  await assert.rejects(
    () => rpc("ai_finish", [alice, s, old, output, 1, 1, null]),
    /unavailable/,
  );
  await rpc("ai_finish", [alice, s, next, output, 1, 1, null]);
  await rpc("ai_end", [alice, s]);
  await role("authenticated", alice);
  assert.equal(
    (await rows("select status from public.ai_sessions where id=$1", [s]))[0]
      .status,
    "completed",
  );
  assert.equal(
    (await rows("select content from public.ai_messages where role='user'"))[0]
      .content,
    "新しい文",
  );
});
