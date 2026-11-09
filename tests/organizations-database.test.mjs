import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { createHash } from "node:crypto";
import { PGlite } from "@electric-sql/pglite";
const db = new PGlite();
const users = Array.from(
  { length: 6 },
  (_, i) => `90000000-0000-4000-8000-00000000000${i + 1}`,
);
const [owner, teacher, learner, other, manager, outsider] = users;
let org, orgB, classA, classB, session, assignment, course;
const rows = async (sql, args = []) => (await db.query(sql, args)).rows;
async function as(user) {
  await db.exec("reset role");
  await rows("select set_config('request.jwt.claim.sub',$1,false)", [user]);
  await db.exec("set role authenticated");
}
async function rpc(name, args = []) {
  return (
    await rows(
      `select public.${name}(${args.map((_, i) => "$" + (i + 1)).join(",")}) r`,
      args,
    )
  )[0].r;
}
const command = (action, data) =>
  rpc("org_command", [org, action, JSON.stringify(data)]);
async function invite(user, role, token) {
  await as(owner);
  await rpc("org_invite", [
    org,
    `u${users.indexOf(user)}@example.test`,
    role,
    createHash("sha256").update(token).digest("hex"),
  ]);
  await as(user);
  return rpc("org_accept_invite", [token, false]);
}
before(async () => {
  await db.exec(
    `create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key,raw_user_meta_data jsonb not null default '{}',email text,email_confirmed_at timestamptz);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema auth to anon,authenticated;grant execute on function auth.uid() to anon,authenticated;`,
  );
  for (const f of fs.readdirSync("supabase/migrations").sort())
    await db.exec(fs.readFileSync("supabase/migrations/" + f, "utf8"));
  for (let i = 0; i < users.length; i++)
    await rows(
      "insert into auth.users(id,email,email_confirmed_at) values($1,$2,now())",
      [users[i], `u${i}@example.test`],
    );
  course = (
    await rows(
      "select c.id from public.courses c where c.published and exists(select 1 from public.question_banks b where b.course_id=c.id) limit 1",
    )
  )[0].id;
});
after(() => db.close());
test("memberships in two organizations keep consent and reports independent", async () => {
  // This case runs before organization setup below; create independent fixture tenants.
  await as(learner);
  const a = await rpc("org_register", [
    JSON.stringify({ name: "Consent A", kind: "training_provider" }),
  ]);
  const b = await rpc("org_register", [
    JSON.stringify({ name: "Consent B", kind: "ssw_center" }),
  ]);
  await rpc("org_command", [
    a,
    "sharing",
    JSON.stringify({ share_progress: true }),
  ]);
  assert.equal(
    (await rpc("org_workspace", [a])).members[0].share_progress,
    true,
  );
  assert.equal(
    (await rpc("org_workspace", [b])).members[0].share_progress,
    false,
  );
  assert.equal((await rpc("org_workspace", [b])).reports.length, 0);
  assert.equal((await rpc("org_list")).length, 2);
});
test("real assigned progress is derived from original records and excludes unrelated study", async () => {
  // Fixtures are local PostgreSQL records, never product demonstration statistics.
  await db.exec("reset role");
  const lesson = crypto.randomUUID();
  await rows(
    `insert into public.lessons(id,course_id,slug,title,position,subject,body,review_status,published) values($1,$2,'tenant-progress-fixture','Fixture lesson',999,'vocabulary',$3::jsonb,'approved',true)`,
    [
      lesson,
      course,
      JSON.stringify({
        explanationEn: "Original local test explanation.",
        explanationJa: "日本語の説明です。",
        examples: [
          { japanese: "日本語を勉強します。", english: "I study Japanese." },
        ],
      }),
    ],
  );
  await rows(
    "insert into public.lesson_progress(user_id,lesson_id,completed_at) values($1,$2,now())",
    [learner, lesson],
  );
  const banks = await rows(
    "select id,course_id from public.question_banks order by course_id",
  );
  for (const bank of [
    banks.find((b) => b.course_id === course),
    banks.find((b) => b.course_id !== course),
  ].filter(Boolean))
    await rows(
      "insert into public.quiz_attempts(id,user_id,bank_id,score,total) values($1,$2,$3,1,2)",
      [crypto.randomUUID(), learner, bank.id],
    );
  await as(learner); // not yet enrolled: no organization can inspect these records.
  assert.equal((await rows("select * from public.lesson_progress")).length, 1);
});
test("verified owner registers without receiving platform administration", async () => {
  await as(owner);
  org = await rpc("org_register", [
    JSON.stringify({ name: "Institute A", kind: "institute" }),
  ]);
  assert.equal((await rpc("org_list"))[0].role, "owner");
  assert.equal(await rpc("is_admin"), false);
  await as(other);
  orgB = await rpc("org_register", [
    JSON.stringify({ name: "Employer B", kind: "employer" }),
  ]);
  await as(outsider);
  await db.exec("reset role");
  await rows("update auth.users set email_confirmed_at=null where id=$1", [
    outsider,
  ]);
  await as(outsider);
  await assert.rejects(
    () =>
      rpc("org_register", [JSON.stringify({ name: "No", kind: "employer" })]),
    /Verified/,
  );
});
test("tenant outsiders and anonymous callers cannot read or mutate another organization", async () => {
  await as(other);
  assert.equal((await rpc("org_list"))[0].id, orgB);
  assert.equal(
    (await rows("select * from public.organizations where id=$1", [org]))
      .length,
    0,
  );
  await assert.rejects(() => rpc("org_workspace", [org]), /Forbidden/);
  await assert.rejects(
    () =>
      rpc("org_command", [org, "settings", JSON.stringify({ name: "Attack" })]),
    /Forbidden/,
  );
  await db.exec("reset role;set role anon");
  await assert.rejects(() => rpc("org_list"), /permission denied/);
});
test("email-bound invitations reject wrong users, replay, expiry and expose no token hashes", async () => {
  const token = "a".repeat(64);
  await as(owner);
  await rpc("org_invite", [
    org,
    "u1@example.test",
    "instructor",
    createHash("sha256").update(token).digest("hex"),
  ]);
  await as(other);
  await assert.rejects(
    () => rpc("org_accept_invite", [token, false]),
    /unavailable/,
  );
  await as(teacher);
  assert.equal(await rpc("org_accept_invite", [token, false]), org);
  await assert.rejects(
    () => rpc("org_accept_invite", [token, false]),
    /unavailable/,
  );
  assert.equal(
    (await rows("select * from public.organization_invitations")).length,
    0,
  );
  await invite(learner, "learner", "b".repeat(64));
  await invite(manager, "manager", "c".repeat(64));
  await as(owner);
  const expired = await rpc("org_invite", [
    org,
    "u5@example.test",
    "learner",
    createHash("sha256").update("d".repeat(64)).digest("hex"),
  ]);
  await db.exec("reset role");
  await rows("update auth.users set email_confirmed_at=now() where id=$1", [
    outsider,
  ]);
  await rows(
    "update public.organization_invitations set expires_at=now()-interval '1 day' where id=$1",
    [expired],
  );
  await as(outsider);
  await assert.rejects(
    () => rpc("org_accept_invite", ["d".repeat(64), false]),
    /unavailable/,
  );
});
test("learners cannot grant roles, write tables directly or invite staff", async () => {
  await as(learner);
  await assert.rejects(
    () => command("member", { user_id: learner, role: "administrator" }),
    /Forbidden/,
  );
  await assert.rejects(
    () =>
      rows(
        "update public.organization_members set role='owner' where user_id=$1",
        [learner],
      ),
    /permission denied/,
  );
  await assert.rejects(
    () =>
      rpc("org_invite", [org, "x@example.test", "instructor", "e".repeat(64)]),
    /Forbidden/,
  );
});
test("teachers create assigned classes but cannot read unrelated classes or manage staff", async () => {
  await as(teacher);
  classA = await command("class", {
    title: "N5 beginner",
    schedule: "Monday 10:00 Asia/Tokyo",
  });
  await assert.rejects(
    () =>
      command("teacher", { class_id: classA, user_id: manager, remove: false }),
    /Forbidden/,
  );
  await as(owner);
  classB = await command("class", { title: "Private class" });
  await command("teacher", {
    class_id: classA,
    user_id: manager,
    remove: false,
  });
  await as(teacher);
  const w = await rpc("org_workspace", [org]);
  assert.deepEqual(
    w.classes.map((c) => c.id),
    [classA],
  );
  assert(!w.members.some((m) => m.user_id === learner));
});
test("class enrollment validates organization and active learner role", async () => {
  await as(teacher);
  await assert.rejects(
    () =>
      command("enroll", { class_id: classA, user_id: other, remove: false }),
    /Invalid member/,
  );
  await command("enroll", {
    class_id: classA,
    user_id: learner,
    remove: false,
  });
  assert(
    (await rpc("org_workspace", [org])).members.some(
      (m) => m.user_id === learner,
    ),
  );
  await assert.rejects(
    () =>
      command("enroll", { class_id: classB, user_id: learner, remove: false }),
    /Forbidden/,
  );
});
test("forged cross-tenant class and attendance identifiers fail at every write boundary", async () => {
  await as(other);
  const foreignClass = await rpc("org_command", [
    orgB,
    "class",
    JSON.stringify({ title: "Organization B only" }),
  ]);
  await as(owner);
  await assert.rejects(
    () =>
      command("session", {
        class_id: foreignClass,
        title: "Attack",
        starts_at: "2026-10-26T01:00:00Z",
      }),
    /foreign key/,
  );
  await assert.rejects(
    () =>
      command("assignment", {
        class_id: foreignClass,
        user_id: null,
        course_id: course,
      }),
    /Invalid target/,
  );
  await assert.rejects(
    () =>
      command("attendance", {
        id: foreignClass,
        records: [{ user_id: learner, status: "present", expected: null }],
      }),
    /Forbidden/,
  );
  assert.equal(
    (await rows("select * from public.classes where id=$1", [foreignClass]))
      .length,
    0,
  );
  await as(other);
  assert.equal(
    (
      await rows(
        "select * from public.organization_members where organization_id=$1",
        [org],
      )
    ).length,
    0,
  );
});
test("session and attendance writes are scoped, unique, optimistic and audited", async () => {
  await as(teacher);
  session = await command("session", {
    class_id: classA,
    title: "Lesson one",
    starts_at: "2026-10-26T01:00:00Z",
  });
  await command("attendance", {
    id: session,
    records: [{ user_id: learner, status: "present", expected: null }],
  });
  const w = await rpc("org_workspace", [org]);
  assert.equal(w.attendance.length, 1);
  await assert.rejects(
    () =>
      command("attendance", {
        id: session,
        records: [{ user_id: learner, status: "late", expected: null }],
      }),
    /Stale/,
  );
  await command("attendance", {
    id: session,
    records: [
      {
        user_id: learner,
        status: "late",
        expected: w.attendance[0].updated_at,
      },
    ],
  });
  await as(owner);
  assert(
    (await rpc("org_workspace", [org])).audit.some(
      (a) => a.action === "attendance.save",
    ),
  );
});
test("employer managers can view assigned training but cannot mark attendance", async () => {
  await as(manager);
  assert.equal((await rpc("org_workspace", [org])).classes.length, 1);
  await assert.rejects(
    () =>
      command("attendance", {
        id: session,
        records: [{ user_id: learner, status: "absent", expected: null }],
      }),
    /Forbidden/,
  );
  await assert.rejects(
    () => command("class", { title: "Unauthorized" }),
    /Forbidden/,
  );
});
test("course assignment rejects cross-tenant targets and produces no fabricated completion", async () => {
  await as(teacher);
  assignment = await command("assignment", {
    class_id: classA,
    user_id: null,
    course_id: course,
    deadline: "2026-11-01",
  });
  await assert.rejects(
    () =>
      command("assignment", {
        class_id: null,
        user_id: other,
        course_id: course,
      }),
    /Forbidden|Invalid target/,
  );
  const w = await rpc("org_workspace", [org]);
  assert.equal(w.reports[0].completed_lessons, null);
  assert.equal(w.reports[0].practice, null);
});
test("only learners control sharing; consent shares only assigned course summaries and can be revoked", async () => {
  await as(owner);
  await command("sharing", { share_progress: true, user_id: learner });
  assert.equal((await rpc("org_workspace", [org])).reports[0].practice, null);
  await as(learner);
  await command("sharing", { share_progress: true });
  await as(teacher);
  const r = (await rpc("org_workspace", [org])).reports[0];
  assert(Array.isArray(r.practice));
  assert.equal(r.completed_lessons, 1);
  assert.equal(r.total_lessons, 1);
  assert.equal(r.practice.length, 1);
  assert.equal(r.practice[0].score, 1);
  assert.equal(r.practice[0].total, 2);
  assert(!("quiz_answers" in r));
  await as(learner);
  await command("sharing", { share_progress: false });
  await as(teacher);
  assert.equal((await rpc("org_workspace", [org])).reports[0].practice, null);
});
test("in-app assignment reminders are real owner-scoped records", async () => {
  await as(teacher);
  await command("remind", { id: assignment });
  await command("remind", { id: assignment });
  await as(learner);
  assert.equal((await rpc("org_workspace", [org])).reminders.length, 1);
  await as(other);
  assert.equal(
    (await rows("select * from public.organization_reminders")).length,
    0,
  );
});
test("class edits reject stale versions and member deactivation revokes access", async () => {
  await as(teacher);
  await assert.rejects(
    () =>
      command("class", {
        id: classA,
        title: "Changed",
        expected: "2020-01-01T00:00:00Z",
      }),
    /Stale/,
  );
  await as(owner);
  await command("member", {
    user_id: teacher,
    role: "instructor",
    status: "inactive",
    jlpt_level: "n5",
    jft_preparing: false,
    sector_id: "",
  });
  await as(teacher);
  await assert.rejects(() => rpc("org_workspace", [org]), /Forbidden/);
  assert.equal((await rows("select * from public.classes")).length, 0);
});
test("privately granted platform administrators retain management even with a lower tenant role", async () => {
  await db.exec("reset role");
  await rows("insert into private.admin_users(user_id) values($1)", [outsider]);
  await rows(
    "insert into public.organization_members(organization_id,user_id,role) values($1,$2,'learner')",
    [org, outsider],
  );
  await as(outsider);
  assert((await rpc("org_list")).some((o) => o.id === orgB));
  assert.equal(
    (await rpc("org_list")).find((o) => o.id === org).role,
    "platform_admin",
  );
  assert.equal((await rpc("org_workspace", [org])).role, "platform_admin");
  assert(
    await command("class", {
      title: "Authorized platform administration fixture",
    }),
  );
});
