import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { PGlite } from "@electric-sql/pglite";
const db = new PGlite();
const alice = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const bob = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const card = "10000000-0000-4000-8000-000000000001";
const bank = "30000000-0000-4000-8000-000000000001";
async function role(name, user = "") {
  await db.exec("reset role");
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [user]);
  await db.exec(`set role ${name}`);
}
async function rows(sql, args = []) {
  return (await db.query(sql, args)).rows;
}
before(async () => {
  await db.exec(
    `create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key,email_confirmed_at timestamptz default now(),raw_user_meta_data jsonb not null default '{}');create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema auth to anon,authenticated;grant execute on function auth.uid() to anon,authenticated;`,
  );
  for (const file of fs.readdirSync("supabase/migrations").sort())
    await db.exec(fs.readFileSync(`supabase/migrations/${file}`, "utf8"));
  await db.query(
    "insert into auth.users(id,raw_user_meta_data) values($1,$3::jsonb),($2,'{}')",
    [
      alice,
      bob,
      JSON.stringify({ display_name: "Alice", role: "admin", is_admin: true }),
    ],
  );
});
after(async () => {
  await db.close();
});
test("all 101 public tables have RLS enabled", async () => {
  await role("postgres");
  const result = await rows(
    "select count(*)::int n from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind='r' and c.relrowsecurity",
  );
  assert.equal(result[0].n, 101);
});
test("anonymous visitors see published content, but no answer keys or private profiles", async () => {
  await role("anon");
  assert.equal((await rows("select * from public.flashcards")).length, 20);
  assert.equal((await rows("select * from public.questions")).length, 20);
  assert.equal((await rows("select * from public.courses")).length, 2);
  await assert.rejects(
    () => rows("select * from public.profiles"),
    /permission denied/,
  );
  await assert.rejects(
    () => rows("select * from private.answer_keys"),
    /permission denied/,
  );
  await assert.rejects(
    () =>
      rows("select public.record_review($1,$2,$3)", [
        crypto.randomUUID(),
        card,
        "known",
      ]),
    /permission denied/,
  );
});
test("profile trigger creates defaults and ignores admin metadata", async () => {
  await role("authenticated", alice);
  const profiles = await rows("select * from public.profiles");
  assert.equal(profiles.length, 1);
  assert.equal(profiles[0].display_name, "Alice");
  assert.equal((await rows("select public.is_admin() value"))[0].value, false);
  await assert.rejects(
    () => rows("update public.profiles set id=$1 where id=$2", [bob, alice]),
    /permission denied/,
  );
  await assert.rejects(
    () => rows("insert into private.admin_users(user_id) values($1)", [alice]),
    /permission denied/,
  );
});
test("users can edit only their own preferences", async () => {
  await role("authenticated", alice);
  await rows("update public.profiles set preferred_language='ja' where id=$1", [
    alice,
  ]);
  assert.equal(
    (await rows("select preferred_language from public.profiles"))[0]
      .preferred_language,
    "ja",
  );
  assert.equal(
    (
      await rows(
        "update public.profiles set display_name='Hacked' where id=$1 returning id",
        [bob],
      )
    ).length,
    0,
  );
});
test("review retries persist exactly once and conflicting retries are rejected", async () => {
  await role("authenticated", alice);
  const id = crypto.randomUUID();
  await rows("select public.record_review($1,$2,$3)", [id, card, "known"]);
  await rows("select public.record_review($1,$2,$3)", [id, card, "known"]);
  assert.equal(
    (await rows("select * from public.flashcard_reviews")).length,
    1,
  );
  await assert.rejects(
    () => rows("select public.record_review($1,$2,$3)", [id, card, "again"]),
    /Review conflict/,
  );
});
test("cross-user reads and spoofed review writes are blocked", async () => {
  await role("authenticated", bob);
  assert.equal(
    (await rows("select * from public.flashcard_reviews")).length,
    0,
  );
  await assert.rejects(
    () =>
      rows(
        "insert into public.flashcard_reviews(id,user_id,flashcard_id,rating) values($1,$2,$3,'known')",
        [crypto.randomUUID(), alice, card],
      ),
    /row-level security|permission denied/,
  );
});
let attemptId;
test("database scores a complete quiz and deduplicates retries", async () => {
  await role("postgres");
  const answers = await rows(
    'select question_id as "questionId",option_id as "optionId" from private.answer_keys order by question_id',
  );
  attemptId = crypto.randomUUID();
  await role("authenticated", alice);
  const result = (
    await rows("select public.submit_quiz($1,$2,$3::jsonb) result", [
      attemptId,
      bank,
      JSON.stringify(answers),
    ])
  )[0].result;
  assert.equal(result.score, 20);
  assert.equal(result.answers.length, 20);
  assert.equal(result.saved, true);
  await rows("select public.submit_quiz($1,$2,$3::jsonb)", [
    attemptId,
    bank,
    JSON.stringify(answers),
  ]);
  assert.equal((await rows("select * from public.quiz_attempts")).length, 1);
  assert.equal((await rows("select * from public.quiz_answers")).length, 20);
  const conflicting = structuredClone(answers);
  await role("postgres");
  const alternative = (
    await rows(
      "select id from public.question_options where question_id=$1 and id<>$2 limit 1",
      [answers[0].questionId, answers[0].optionId],
    )
  )[0].id;
  conflicting[0].optionId = alternative;
  await role("authenticated", alice);
  await assert.rejects(
    () =>
      rows("select public.submit_quiz($1,$2,$3::jsonb)", [
        attemptId,
        bank,
        JSON.stringify(conflicting),
      ]),
    /already submitted/,
  );
});
test("users cannot forge scores or read another user’s attempts and answers", async () => {
  await role("authenticated", bob);
  assert.equal((await rows("select * from public.quiz_attempts")).length, 0);
  assert.equal((await rows("select * from public.quiz_answers")).length, 0);
  await assert.rejects(
    () =>
      rows(
        "insert into public.quiz_attempts(id,user_id,bank_id,score,total) values($1,$2,$3,20,20)",
        [crypto.randomUUID(), bob, bank],
      ),
    /permission denied/,
  );
});
test("incomplete quizzes are rejected atomically", async () => {
  await role("authenticated", alice);
  await assert.rejects(
    () =>
      rows("select public.submit_quiz($1,$2,'[]'::jsonb)", [
        crypto.randomUUID(),
        bank,
      ]),
    /Answer every question/,
  );
  assert.equal((await rows("select * from public.quiz_attempts")).length, 1);
});
test("aggregated dashboard metrics come from actual owner records", async () => {
  await role("authenticated", alice);
  const summary = (await rows("select public.dashboard_summary() value"))[0]
    .value;
  assert.equal(summary.reviews, 1);
  assert.equal(summary.attempts, 1);
  assert.equal(summary.accuracy, 100);
  assert.equal(summary.lessons, 0);
  await role("authenticated", bob);
  const empty = (await rows("select public.dashboard_summary() value"))[0]
    .value;
  assert.equal(empty.reviews, 0);
  assert.equal(empty.attempts, 0);
  assert.equal(empty.accuracy, null);
});
test("content administration requires membership outside the profile table", async () => {
  await role("authenticated", bob);
  await assert.rejects(
    () => rows("insert into public.courses(slug,title) values('n3','Forged')"),
    /row-level security|duplicate key/,
  );
  await role("postgres");
  await rows("insert into private.admin_users(user_id) values($1)", [alice]);
  await role("authenticated", alice);
  assert.equal((await rows("select public.is_admin() value"))[0].value, true);
  await rows("update public.courses set title='Reviewed N3' where slug='n3'");
  assert.equal(
    (await rows("select title from public.courses where slug='n3'"))[0].title,
    "Reviewed N3",
  );
});
test("unpublishing a parent course also hides its decks, cards and questions", async () => {
  await role("postgres");
  await rows("update public.courses set published=false where slug='n4'");
  await role("anon");
  assert.equal((await rows("select * from public.flashcards")).length, 10);
  assert.equal((await rows("select * from public.questions")).length, 0);
  assert.equal((await rows("select * from public.question_options")).length, 0);
});

test("multiple goals are owner-scoped and never grant administrator membership", async () => {
  await role("authenticated", bob);
  await rows("select public.set_learning_goals($1)", [
    ["teacher", "organization_admin", "tourist"],
  ]);
  assert.equal(
    (await rows("select * from public.user_learning_goals")).length,
    3,
  );
  assert.equal((await rows("select public.is_admin() value"))[0].value, false);
  assert.ok(
    (await rows("select onboarding_completed_at from public.profiles"))[0]
      .onboarding_completed_at,
  );
  await assert.rejects(
    () => rows("select public.set_learning_goals($1)", [["root"]]),
    /Invalid goals/,
  );
  await assert.rejects(
    () =>
      rows("select public.set_learning_goals($1)", [["tourist", "tourist"]]),
    /Invalid goals/,
  );
  await role("authenticated", alice);
  assert.equal(
    (await rows("select * from public.user_learning_goals")).length,
    0,
  );
});
let programId, courseId, moduleId, lessonId, blockId, translationId;
async function save(kind, data, id = null, version = null) {
  return (
    await rows("select public.admin_save_content($1,$2,$3::jsonb,$4) value", [
      kind,
      id,
      JSON.stringify(data),
      version,
    ])
  )[0].value;
}
async function current(table, id) {
  return (
    await rows(
      `select *,updated_at::text as version from public.${table} where id=$1`,
      [id],
    )
  )[0];
}
async function state(kind, table, id, action) {
  const value = await current(table, id);
  return rows("select public.admin_review_content($1,$2,$3,$4)", [
    kind,
    id,
    action,
    value.version,
  ]);
}
async function publish(kind, table, id) {
  await state(kind, table, id, "request_review");
  await state(kind, table, id, "approve");
  await state(kind, table, id, "publish");
}
test("learners cannot call content write RPCs or write content directly", async () => {
  await role("authenticated", bob);
  await assert.rejects(
    () =>
      save("program", {
        slug: "forged",
        title: "Forged",
        summary: "",
        category: "learn",
      }),
    /Administrator access required/,
  );
  await assert.rejects(
    () =>
      rows(
        "insert into public.learning_programs(slug,title,category) values('forged','Forged','learn')",
      ),
    /row-level security/,
  );
  await role("anon");
  await assert.rejects(() => save("program", {}), /permission denied/);
});
test("administrator can create drafts and must review before publishing", async () => {
  await role("authenticated", alice);
  programId = await save("program", {
    slug: "reviewed-path",
    title: "Learning path",
    summary: "Reviewed content",
    category: "learn",
  });
  await assert.rejects(
    () => state("program", "learning_programs", programId, "publish"),
    /Approval required/,
  );
  await role("anon");
  assert.equal(
    (await rows("select * from public.learning_programs")).length,
    0,
  );
  await role("authenticated", alice);
  await publish("program", "learning_programs", programId);
  await role("anon");
  assert.equal(
    (await rows("select * from public.learning_programs")).length,
    1,
  );
});
test("content hierarchy and multilingual translations publish through approved parents", async () => {
  await role("authenticated", alice);
  courseId = await save("course", {
    slug: "daily-japanese",
    title: "Daily Japanese",
    program_id: programId,
  });
  await publish("course", "courses", courseId);
  moduleId = await save("module", {
    course_id: courseId,
    title: "First conversations",
    position: 0,
  });
  await publish("module", "course_modules", moduleId);
  lessonId = await save("lesson", {
    slug: "greeting",
    title: "Greeting",
    course_id: courseId,
    module_id: moduleId,
    position: 0,
    body: { text: "Learn a greeting." },
  });
  await publish("lesson", "lessons", lessonId);
  blockId = await save("block", {
    lesson_id: lessonId,
    kind: "example",
    position: 0,
    content: {
      text: "{日本語|にほんご}を{教|おし}えてください。",
      translation: "Please teach me Japanese.",
    },
  });
  await publish("block", "lesson_blocks", blockId);
  translationId = await save("translation", {
    target_kind: "lesson",
    target_id: lessonId,
    locale: "ja",
    title: "あいさつ",
    content: { text: "日本語のあいさつ。" },
  });
  await publish("translation", "content_translations", translationId);
  await role("anon");
  assert.equal((await rows("select * from public.course_modules")).length, 1);
  assert.equal(
    (await rows("select * from public.content_translations")).length,
    1,
  );
});
test("published lesson completion is owner-scoped and feeds course progress", async () => {
  await role("authenticated", bob);
  await rows(
    "insert into public.lesson_progress(user_id,lesson_id,completed_at) values($1,$2,now())",
    [bob, lessonId],
  );
  const result = (
    await rows("select public.course_progress($1) value", [courseId])
  )[0].value;
  assert.equal(result.total, 1);
  assert.equal(result.completed, 1);
  await role("authenticated", alice);
  assert.equal(
    (await rows("select public.course_progress($1) value", [courseId]))[0].value
      .completed,
    0,
  );
});
test("optimistic editing rejects stale versions and resets publication on changes", async () => {
  await role("authenticated", alice);
  const before = await current("learning_programs", programId);
  await save(
    "program",
    {
      slug: "reviewed-path",
      title: "Changed path",
      summary: "New draft",
      category: "learn",
    },
    programId,
    before.version,
  );
  const after = await current("learning_programs", programId);
  assert.equal(after.review_status, "draft");
  assert.equal(after.published, false);
  await assert.rejects(
    () =>
      save(
        "program",
        {
          slug: "reviewed-path",
          title: "Stale overwrite",
          summary: "",
          category: "learn",
        },
        programId,
        before.version,
      ),
    /Content changed/,
  );
  await role("anon");
  assert.equal((await rows("select * from public.course_modules")).length, 0);
  assert.equal((await rows("select * from public.lesson_blocks")).length, 0);
  assert.equal(
    (await rows("select * from public.content_translations")).length,
    0,
  );
});
test("child publication is rejected until the parent is published", async () => {
  await role("authenticated", alice);
  const id = await save("module", {
    course_id: courseId,
    title: "Unready module",
    position: 1,
  });
  await state("module", "course_modules", id, "request_review");
  await state("module", "course_modules", id, "approve");
  await assert.rejects(
    () => state("module", "course_modules", id, "publish"),
    /parent/,
  );
});
test("organization goals do not create memberships; tenant reads and writes stay scoped", async () => {
  await role("postgres");
  const one = crypto.randomUUID(),
    two = crypto.randomUUID();
  await rows(
    "insert into public.organizations(id,name,kind) values($1,'School A','institute'),($2,'Employer B','employer')",
    [one, two],
  );
  await rows(
    "insert into public.organization_members(organization_id,user_id,role) values($1,$2,'instructor')",
    [one, bob],
  );
  await role("authenticated", bob);
  assert.equal((await rows("select * from public.organizations")).length, 1);
  assert.equal(
    (await rows("select public.is_organization_staff($1) value", [two]))[0]
      .value,
    false,
  );
  await assert.rejects(
    () =>
      rows(
        "insert into public.organization_members(organization_id,user_id,role) values($1,$2,'owner')",
        [two, bob],
      ),
    /permission denied/,
  );
  await assert.rejects(
    () =>
      rows(
        "insert into public.training_reports(organization_id,author_id,title) values($1,$2,'Class notes')",
        [one, bob],
      ),
    /permission denied/,
  );
  await assert.rejects(
    () =>
      rows(
        "insert into public.training_reports(organization_id,author_id,title) values($1,$2,'Cross tenant')",
        [two, bob],
      ),
    /permission denied/,
  );
});
test("unconnected future services have no client write permissions", async () => {
  await role("authenticated", bob);
  await assert.rejects(
    () =>
      rows(
        "insert into public.ai_roleplay_sessions(user_id,scenario_id) values($1,$2)",
        [bob, crypto.randomUUID()],
      ),
    /permission denied/,
  );
  await assert.rejects(
    () =>
      rows("insert into public.tutor_bookings(id) values($1)", [
        crypto.randomUUID(),
      ]),
    /permission denied/,
  );
});

test("composite relationships prevent cross-tenant attendance and mismatched lesson modules", async () => {
  await role("postgres");
  const orgA = crypto.randomUUID(),
    orgB = crypto.randomUUID(),
    sessionA = crypto.randomUUID(),
    sessionB = crypto.randomUUID();
  await rows(
    "insert into public.organizations(id,name,kind) values($1,'Attendance A','institute'),($2,'Attendance B','institute')",
    [orgA, orgB],
  );
  await rows(
    "insert into public.organization_members(organization_id,user_id,role) values($1,$3,'instructor'),($1,$4,'learner'),($2,$4,'learner')",
    [orgA, orgB, bob, alice],
  );
  await rows(
    "insert into public.training_sessions(id,organization_id,title,starts_at) values($1,$3,'A',now()),($2,$4,'B',now())",
    [sessionA, sessionB, orgA, orgB],
  );
  // Constraint checks use the fixture owner; clients now write through scoped RPCs.
  await role("postgres");
  await rows(
    "insert into public.attendance_records(organization_id,session_id,student_id,recorded_by,status) values($1,$2,$3,$4,'present')",
    [orgA, sessionA, alice, bob],
  );
  await assert.rejects(
    () =>
      rows(
        "insert into public.attendance_records(organization_id,session_id,student_id,recorded_by,status) values($1,$2,$3,$4,'present')",
        [orgA, sessionB, alice, bob],
      ),
    /foreign key/,
  );
  await role("authenticated", bob);
  await assert.rejects(
    () =>
      rows(
        "insert into public.attendance_records(organization_id,session_id,student_id,recorded_by,status) values($1,$2,$3,$4,'present')",
        [orgB, sessionB, alice, bob],
      ),
    /permission denied/,
  );
  await role("authenticated", bob);
  await assert.rejects(
    () => rows("select * from private.content_review_events"),
    /permission denied/,
  );
  await role("authenticated", alice);
  await assert.rejects(
    () =>
      save("lesson", {
        slug: "bad-module",
        title: "Mismatch",
        course_id: "60000000-0000-4000-8000-000000000001",
        module_id: moduleId,
        position: 99,
        body: {},
      }),
    /foreign key/,
  );
});

