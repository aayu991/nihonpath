import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { PGlite } from "@electric-sql/pglite";
const db = new PGlite();
const alice = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const bob = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const admin = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const data = JSON.parse(
  fs.readFileSync("src/data/study-curriculum.json", "utf8"),
);
const bank = data.banks.find(
  (b) => b.level === "n4" && b.subject === "grammar",
);
const card = data.cards[0].id;
const course = "60000000-0000-4000-8000-000000000002";
const rows = async (sql, args = []) => (await db.query(sql, args)).rows;
async function role(name, user = "") {
  await db.exec("reset role");
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [user]);
  await db.exec(`set role ${name}`);
}
before(async () => {
  await db.exec(
    `create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key,email_confirmed_at timestamptz default now(),raw_user_meta_data jsonb not null default '{}');create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema auth to anon,authenticated;grant execute on function auth.uid() to anon,authenticated;`,
  );
  for (const f of fs.readdirSync("supabase/migrations").sort())
    await db.exec(fs.readFileSync("supabase/migrations/" + f, "utf8"));
  await db.exec(
    fs.readFileSync("supabase/seeds/20261024_task4_demo.sql", "utf8"),
  );
  await db.query("insert into auth.users(id) values($1),($2),($3)", [
    alice,
    bob,
    admin,
  ]);
  await db.query("insert into private.admin_users values($1)", [admin]);
});
after(() => db.close());
test("optional fixture is repeatable without resetting content or progress", async () => {
  await role("postgres");
  await db.exec(
    fs.readFileSync("supabase/seeds/20261024_task4_demo.sql", "utf8"),
  );
  const n = await rows("select count(*)::int n from public.lessons");
  assert.equal(n[0].n, 10);
  assert.equal(
    (await rows("select count(*)::int n from public.vocabulary"))[0].n,
    29,
  );
});
test("all five courses expose decks; real subject lesson counts and listening emptiness are honest", async () => {
  await role("anon");
  assert.equal((await rows("select * from public.courses")).length, 5);
  assert.equal((await rows("select * from public.flashcards")).length, 29);
  assert.equal(
    (await rows("select * from public.lessons where subject='grammar'")).length,
    4,
  );
  assert.equal(
    (await rows("select * from public.lessons where subject='listening'"))
      .length,
    0,
  );
  await assert.rejects(
    () => rows("select * from private.answer_keys"),
    /permission denied/,
  );
});
test("new learners get empty enrollment, review and quiz statistics", async () => {
  await role("authenticated", alice);
  const result = (await rows("select public.learning_dashboard() data"))[0]
    .data;
  assert.deepEqual(result.enrollments, []);
  assert.deepEqual(result.due, []);
  assert.deepEqual(result.accuracy, []);
});
test("enrollment and completion survive subsequent queries and cannot cross owners", async () => {
  await role("authenticated", alice);
  await rows(
    "insert into public.course_enrollments(user_id,course_id) values($1,$2)",
    [alice, course],
  );
  const lesson = data.lessons.find((l) => l.level === "n4");
  await rows(
    "insert into public.lesson_progress(user_id,lesson_id,completed_at) values($1,$2,now())",
    [alice, lesson.id],
  );
  await role("authenticated", bob);
  assert.equal(
    (await rows("select * from public.course_enrollments")).length,
    0,
  );
  assert.equal((await rows("select * from public.lesson_progress")).length, 0);
  await assert.rejects(
    () =>
      rows(
        "insert into public.course_enrollments(user_id,course_id) values($1,$2)",
        [alice, course],
      ),
    /row-level security/,
  );
  await role("authenticated", alice);
  assert.equal(
    (await rows("select * from public.course_enrollments")).length,
    1,
  );
  assert.equal(
    (await rows("select * from public.lesson_progress"))[0].lesson_id,
    lesson.id,
  );
});
test("schedule follows 1,2,4,8,16,30 days, retries do not advance it, Again resets it", async () => {
  await role("authenticated", alice);
  for (const days of [1, 2, 4, 8, 16, 30, 30]) {
    const event = crypto.randomUUID();
    await rows("select public.record_review($1,$2,'known')", [event, card]);
    const first = (await rows("select * from public.flashcard_schedule"))[0];
    assert.equal(first.interval_days, days);
    await rows("select public.record_review($1,$2,'known')", [event, card]);
    assert.equal(
      (await rows("select * from public.flashcard_schedule"))[0].streak,
      first.streak,
    );
    assert.equal(
      Math.round(
        (new Date(first.due_at) - new Date(first.last_reviewed_at)) / 86400000,
      ),
      days,
    );
  }
  await rows("select public.record_review($1,$2,'again')", [
    crypto.randomUUID(),
    card,
  ]);
  const reset = (await rows("select * from public.flashcard_schedule"))[0];
  assert.equal(reset.streak, 0);
  assert.equal(reset.interval_days, 1);
  await assert.rejects(
    () => rows("update public.flashcard_schedule set due_at=now()"),
    /permission denied/,
  );
  await assert.rejects(
    () =>
      rows(
        "insert into public.flashcard_reviews(id,user_id,flashcard_id,rating,created_at) values($1,$2,$3,'known','2000-01-01')",
        [crypto.randomUUID(), alice, card],
      ),
    /permission denied/,
  );
  await role("authenticated", bob);
  assert.equal(
    (await rows("select * from public.flashcard_schedule")).length,
    0,
  );
});
test("due queue contains only actual dates and stays owner scoped", async () => {
  await role("postgres");
  await rows(
    "update public.flashcard_schedule set due_at=now()-interval '1 minute' where user_id=$1",
    [alice],
  );
  await role("authenticated", alice);
  assert.equal(
    (await rows("select public.learning_dashboard() data"))[0].data.due[0]
      .count,
    1,
  );
  await role("authenticated", bob);
  assert.deepEqual(
    (await rows("select public.learning_dashboard() data"))[0].data.due,
    [],
  );
});
test("guest quizzes score ten answers without writing attempts; malformed keys cannot be submitted", async () => {
  await role("anon");
  const answers = bank.questions.map((q) => ({
    questionId: q.id,
    optionId: q.optionIds[q.correctIndex],
  }));
  const result = (
    await rows("select public.practice_quiz($1,$2::jsonb) data", [
      bank.id,
      JSON.stringify(answers),
    ])
  )[0].data;
  assert.equal(result.score, 10);
  assert.equal(result.saved, false);
  assert.equal(result.answers.length, 10);
  await assert.rejects(
    () =>
      rows("select public.practice_quiz($1,$2::jsonb)", [
        bank.id,
        JSON.stringify(answers.slice(1)),
      ]),
    /Answer every question/,
  );
  await role("postgres");
  assert.equal(
    (await rows("select count(*)::int n from public.quiz_attempts"))[0].n,
    0,
  );
});
test("authenticated scoring persists once and feeds weighted subject accuracy", async () => {
  await role("authenticated", alice);
  const event = crypto.randomUUID();
  const answers = bank.questions.map((q, i) => ({
    questionId: q.id,
    optionId: q.optionIds[i < 8 ? q.correctIndex : (q.correctIndex + 1) % 4],
  }));
  for (let i = 0; i < 2; i++) {
    const result = (
      await rows("select public.submit_quiz($1,$2,$3::jsonb) data", [
        event,
        bank.id,
        JSON.stringify(answers),
      ])
    )[0].data;
    assert.equal(result.score, 8);
    assert.equal(result.saved, true);
  }
  await role("authenticated", bob);
  assert.equal((await rows("select * from public.quiz_attempts")).length, 0);
  await role("authenticated", alice);
  assert.equal((await rows("select * from public.quiz_attempts")).length, 1);
  assert.equal(
    (await rows("select public.learning_dashboard() data"))[0].data.accuracy[0]
      .percent,
    80,
  );
});
test("learners and guests cannot author, review or preview protected keys", async () => {
  for (const user of [alice, bob]) {
    await role("authenticated", user);
    await assert.rejects(
      () => rows("select public.admin_learning_save('bank',null,'{}',null)"),
      /Administrator access/,
    );
    await assert.rejects(
      () => rows("select public.admin_learning_preview('bank',$1)", [bank.id]),
      /Administrator access/,
    );
    await assert.rejects(
      () =>
        rows("select public.admin_learning_review('bank',$1,'publish',now())", [
          bank.id,
        ]),
      /Administrator access/,
    );
  }
  await role("anon");
  await assert.rejects(
    () => rows("select public.admin_learning_preview('bank',$1)", [bank.id]),
    /permission denied/,
  );
});
let draft;
test("authorized editors save, preview, review and publish a complete private-key bank", async () => {
  await role("authenticated", admin);
  const q = bank.questions[0];
  const doc = {
    title: "Reviewed practice draft",
    course_id: course,
    subject: "grammar",
    questions: [q],
  };
  draft = (
    await rows(
      "select public.admin_learning_save('bank',null,$1::jsonb,null) id",
      [JSON.stringify(doc)],
    )
  )[0].id;
  const preview = (
    await rows("select public.admin_learning_preview('bank',$1) data", [draft])
  )[0].data;
  assert.equal(preview.questions[0].correctIndex, q.correctIndex);
  await assert.rejects(
    () =>
      rows("select public.admin_learning_review('bank',$1,'publish',$2)", [
        draft,
        preview.updated_at,
      ]),
    /Approved content/,
  );
  for (const action of ["request_review", "approve", "publish"]) {
    const version = (
      await rows("select updated_at from public.question_banks where id=$1", [
        draft,
      ])
    )[0].updated_at;
    await rows("select public.admin_learning_review('bank',$1,$2,$3)", [
      draft,
      action,
      version,
    ]);
  }
  await role("anon");
  assert.equal(
    (await rows("select * from public.question_banks where id=$1", [draft]))
      .length,
    1,
  );
});
test("used banks require a new revision; direct published-child edits and stale saves fail", async () => {
  await role("authenticated", admin);
  const doc = (
    await rows("select public.admin_learning_preview('bank',$1) data", [
      bank.id,
    ])
  )[0].data;
  await assert.rejects(
    () =>
      rows("select public.admin_learning_save('bank',$1,$2::jsonb,$3)", [
        bank.id,
        JSON.stringify(doc),
        doc.updated_at,
      ]),
    /new revision/,
  );
  await assert.rejects(
    () =>
      rows("update public.questions set prompt='changed' where bank_id=$1", [
        bank.id,
      ]),
    /Unpublish/,
  );
  const preview = (
    await rows("select public.admin_learning_preview('bank',$1) data", [draft])
  )[0].data;
  await assert.rejects(
    () =>
      rows("select public.admin_learning_save('bank',$1,$2::jsonb,$3)", [
        draft,
        JSON.stringify(preview),
        "2000-01-01",
      ]),
    /Stale/,
  );
});
test("publication rejects malformed Japanese and missing explanations", async () => {
  await role("authenticated", admin);
  const id = (
    await rows(
      "select public.admin_learning_save('vocabulary',null,$1::jsonb,null) id",
      [
        JSON.stringify({
          course_id: course,
          term: "English only",
          reading: "abc",
          meaning_en: "water",
          meaning_ja: "水",
          example: "English only",
          example_translation: "test",
        }),
      ],
    )
  )[0].id;
  for (const action of ["request_review", "approve"]) {
    const version = (
      await rows("select updated_at from public.vocabulary where id=$1", [id])
    )[0].updated_at;
    await rows("select public.admin_learning_review('vocabulary',$1,$2,$3)", [
      id,
      action,
      version,
    ]);
  }
  const version = (
    await rows("select updated_at from public.vocabulary where id=$1", [id])
  )[0].updated_at;
  await assert.rejects(
    () =>
      rows(
        "select public.admin_learning_review('vocabulary',$1,'publish',$2)",
        [id, version],
      ),
    /must be validated/,
  );
});
test("vocabulary and deck drafts publish through review; used decks require a revision", async () => {
  await role("authenticated", admin);
  const word = {
    course_id: course,
    term: "水",
    reading: "みず",
    meaning_en: "water",
    meaning_ja: "飲むための液体。",
    example: "{水|みず}を{飲|の}みます。",
    example_translation: "I drink water.",
    category: "Daily life",
  };
  for (const kind of ["vocabulary", "deck"]) {
    const payload =
      kind === "vocabulary"
        ? word
        : {
            course_id: course,
            title: "New vocabulary revision",
            cards: [word],
          };
    const id = (
      await rows(
        "select public.admin_learning_save($1,null,$2::jsonb,null) id",
        [kind, JSON.stringify(payload)],
      )
    )[0].id;
    for (const action of ["request_review", "approve", "publish"]) {
      const doc = (
        await rows("select public.admin_learning_preview($1,$2) data", [
          kind,
          id,
        ])
      )[0].data;
      await rows("select public.admin_learning_review($1,$2,$3,$4)", [
        kind,
        id,
        action,
        doc.updated_at,
      ]);
    }
    if (kind === "deck") {
      const cardId = (
        await rows("select id from public.flashcards where deck_id=$1", [id])
      )[0].id;
      await role("authenticated", bob);
      await rows("select public.record_review($1,$2,'known')", [
        crypto.randomUUID(),
        cardId,
      ]);
      await role("authenticated", admin);
      const doc = (
        await rows("select public.admin_learning_preview('deck',$1) data", [id])
      )[0].data;
      await assert.rejects(
        () =>
          rows("select public.admin_learning_save('deck',$1,$2::jsonb,$3)", [
            id,
            JSON.stringify(payload),
            doc.updated_at,
          ]),
        /new revision/,
      );
    }
  }
});
test("JLPT grammar publication requires multiple bilingual Japanese examples", async () => {
  await role("authenticated", admin);
  const payload = {
    course_id: course,
    module_id: null,
    slug: "bad-grammar-draft",
    title: "Incomplete grammar",
    subject: "grammar",
    position: 900,
    body: {},
  };
  const id = (
    await rows(
      "select public.admin_save_content('lesson',null,$1::jsonb,null) id",
      [JSON.stringify(payload)],
    )
  )[0].id;
  for (const action of ["request_review", "approve"]) {
    const version = (
      await rows("select updated_at from public.lessons where id=$1", [id])
    )[0].updated_at;
    await rows("select public.admin_review_content('lesson',$1,$2,$3)", [
      id,
      action,
      version,
    ]);
  }
  const version = (
    await rows("select updated_at from public.lessons where id=$1", [id])
  )[0].updated_at;
  await assert.rejects(
    () =>
      rows("select public.admin_review_content('lesson',$1,'publish',$2)", [
        id,
        version,
      ]),
    /examples required/,
  );
});
test("reapplying demo seed preserves edited drafts and learner records", async () => {
  await role("postgres");
  const target = data.banks.find((b) => b.subject === "vocabulary").id;
  await rows(
    "update public.question_banks set title='My edited draft' where id=$1",
    [target],
  );
  const before = (
    await rows("select count(*)::int n from public.flashcard_reviews")
  )[0].n;
  await db.exec(
    fs.readFileSync("supabase/seeds/20261024_task4_demo.sql", "utf8"),
  );
  const record = (
    await rows("select * from public.question_banks where id=$1", [target])
  )[0];
  assert.equal(record.title, "My edited draft");
  assert.equal(record.published, false);
  assert.equal(record.review_status, "draft");
  assert.equal(
    (await rows("select count(*)::int n from public.flashcard_reviews"))[0].n,
    before,
  );
  assert.equal(
    (await rows("select count(*)::int n from public.quiz_attempts"))[0].n,
    1,
  );
});
test("subject accuracy remains historical when a used bank is unpublished", async () => {
  await role("authenticated", admin);
  const version = (
    await rows("select updated_at from public.question_banks where id=$1", [
      bank.id,
    ])
  )[0].updated_at;
  await rows("select public.admin_learning_review('bank',$1,'unpublish',$2)", [
    bank.id,
    version,
  ]);
  await role("authenticated", alice);
  const stats = (await rows("select public.learning_dashboard() data"))[0].data;
  assert.equal(stats.accuracy[0].percent, 80);
  assert.equal(
    (await rows("select subject from public.quiz_attempts"))[0].subject,
    "grammar",
  );
});
