import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { PGlite } from "@electric-sql/pglite";
const db = new PGlite(),
  tutor = "81000000-0000-4000-8000-000000000001",
  student = "81000000-0000-4000-8000-000000000002",
  other = "81000000-0000-4000-8000-000000000003",
  admin = "81000000-0000-4000-8000-000000000004";
let lesson, paid, booking, start;
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
async function workspace() {
  return rpc("tutor_workspace");
}
async function applicationVersion() {
  return (
    await rows(
      "select updated_at from public.tutor_applications where user_id=$1",
      [tutor],
    )
  )[0].updated_at;
}
const input = {
  display_name: "Local fixture tutor",
  photo_url: "",
  languages: ["en", "ja"],
  country: "Japan",
  timezone: "Asia/Tokyo",
  specialties: ["jlpt", "conversation"],
  levels: ["n5", "n4"],
  experience_years: 3,
  biography:
    "This is original local test content for a private database fixture, not a real tutor profile.",
  video_url: "",
  credentials: "Credential description for local verification fixture only.",
  durations: [30, 60],
  proposed_price_minor: 0,
  currency: "JPY",
};
async function action(name, data = {}) {
  const b = (await workspace()).bookings.find((b) => b.id === booking);
  return rpc("tutor_booking_action", [
    booking,
    name,
    b.updated_at,
    JSON.stringify(data),
  ]);
}
before(async () => {
  await db.exec(
    `create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key,email_confirmed_at timestamptz default now(),raw_user_meta_data jsonb not null default '{}');create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema auth to anon,authenticated;grant execute on function auth.uid() to anon,authenticated;`,
  );
  for (const f of fs.readdirSync("supabase/migrations").sort())
    await db.exec(fs.readFileSync("supabase/migrations/" + f, "utf8"));
  for (const id of [tutor, student, other, admin])
    await rows("insert into auth.users(id) values($1)", [id]);
  await rows("insert into private.admin_users(user_id) values($1)", [admin]);
});
after(() => db.close());
test("UTC candidates are localized into an exact seven-day learner window", async () => {
  // Runs before approval: an unavailable profile has no bookable slots, in any timezone.
  await as(student);
  assert.deepEqual(
    await rpc("tutor_local_slots", [
      tutor,
      crypto.randomUUID(),
      "2026-10-28",
      "Asia/Kathmandu",
    ]),
    [],
  );
  await assert.rejects(
    () =>
      rpc("tutor_local_slots", [
        tutor,
        crypto.randomUUID(),
        "2026-10-28",
        "Invalid/Timezone",
      ]),
    /Invalid timezone/,
  );
});
test("no seeded profiles or ratings; application drafts and credentials are private", async () => {
  await as(tutor);
  await rpc("tutor_application_save", [
    JSON.stringify({
      ...input,
      status: "approved",
      qualifications_verified: true,
    }),
    null,
  ]);
  assert.equal((await workspace()).application.status, "draft");
  assert.equal((await rpc("tutor_catalog")).length, 0);
  await as(student);
  assert.equal(
    (await rows("select * from public.tutor_applications")).length,
    0,
  );
  await assert.rejects(
    () =>
      rows("insert into public.tutor_profiles(user_id,slug) values($1,'bad')", [
        student,
      ]),
    /permission denied/,
  );
});
test("independent administrator approval and credential review are required", async () => {
  await as(tutor);
  await rpc("tutor_application_submit", [await applicationVersion()]);
  await assert.rejects(
    async () =>
      rpc("tutor_admin_review", [
        tutor,
        "approved",
        await applicationVersion(),
        "Attempted learner promotion",
        true,
        "Reviewed credentials",
      ]),
    /Administrator/,
  );
  await as(admin);
  await assert.rejects(
    async () =>
      rpc("tutor_admin_review", [
        tutor,
        "approved",
        await applicationVersion(),
        "Reviewed local test application",
        true,
        "Reviewed credential summary",
      ]),
    /transition/,
  );
  await rpc("tutor_admin_review", [
    tutor,
    "under_review",
    await applicationVersion(),
    "Reviewing local fixture application",
    false,
    "",
  ]);
  await rpc("tutor_admin_review", [
    tutor,
    "approved",
    await applicationVersion(),
    "Reviewed local fixture application",
    true,
    "Local qualification review fixture",
  ]);
  await as(tutor);
  assert.equal((await workspace()).profile.published, false);
  await rpc("tutor_manage", [
    "settings",
    JSON.stringify({
      timezone: "Asia/Tokyo",
      notice_hours: 0,
      horizon_days: 90,
      published: true,
    }),
  ]);
  const cat = await rpc("tutor_catalog");
  assert.equal(cat.length, 1);
  assert.equal(cat[0].qualifications_verified, true);
  assert(!("credentials" in cat[0]));
  assert.equal(cat[0].reviews.length, 0);
});
test("lesson types, recurring rules and one-off availability are owner scoped", async () => {
  await as(tutor);
  lesson = await rpc("tutor_manage", [
    "lesson",
    JSON.stringify({
      title: "Free practice fixture",
      specialty: "jlpt",
      duration_minutes: 30,
      price_minor: 0,
      currency: "JPY",
      published: true,
    }),
  ]);
  paid = await rpc("tutor_manage", [
    "lesson",
    JSON.stringify({
      title: "Future paid fixture",
      specialty: "jlpt",
      duration_minutes: 60,
      price_minor: 3000,
      currency: "JPY",
      published: true,
    }),
  ]);
  for (let weekday = 0; weekday < 7; weekday++)
    await rpc("tutor_manage", [
      "rule",
      JSON.stringify({ weekday, start_time: "08:00", end_time: "18:00" }),
    ]);
  await as(student);
  await assert.rejects(
    async () =>
      rpc("tutor_manage", [
        "rule",
        JSON.stringify({ weekday: 1, start_time: "08:00", end_time: "18:00" }),
      ]),
    /Approved/,
  );
  assert.equal(
    (await rows("select * from public.tutor_availability_rules")).length,
    0,
  );
});
test("slot generation honors timezone, durations and private blocking exceptions", async () => {
  await as(student);
  const from = new Date(Date.now() + 2 * 86400000).toISOString(),
    slots = await rpc("tutor_slots", [tutor, lesson, from, 7]);
  assert(slots.length > 0);
  start = slots[0].starts_at;
  assert.equal(new Date(slots[0].ends_at) - new Date(start), 30 * 60000);
  await as(tutor);
  const block = await rpc("tutor_manage", [
    "exception",
    JSON.stringify({
      kind: "blocked",
      starts_at: start,
      ends_at: slots[0].ends_at,
    }),
  ]);
  assert(
    !(await rpc("tutor_slots", [tutor, lesson, from, 7])).some(
      (s) => s.starts_at === start,
    ),
  );
  await rpc("tutor_manage", [
    "remove_exception",
    JSON.stringify({ id: block }),
  ]);
});
test("paid booking is unavailable and cannot be bypassed with client pricing", async () => {
  await as(student);
  await assert.rejects(
    async () =>
      rpc("tutor_request_booking", [
        crypto.randomUUID(),
        tutor,
        paid,
        start,
        "No payment processing",
      ]),
    /Paid bookings unavailable/,
  );
});
test("booking requests use actual availability, snapshot zero price and are idempotent", async () => {
  await as(student);
  booking = crypto.randomUUID();
  assert.equal(
    await rpc("tutor_request_booking", [
      booking,
      tutor,
      lesson,
      start,
      "N5 conversation practice",
    ]),
    booking,
  );
  assert.equal(
    await rpc("tutor_request_booking", [
      booking,
      tutor,
      lesson,
      start,
      "N5 conversation practice",
    ]),
    booking,
  );
  await assert.rejects(
    async () =>
      rpc("tutor_request_booking", [
        booking,
        tutor,
        lesson,
        start,
        "Changed retry",
      ]),
    /Conflicting/,
  );
  const b = (await workspace()).bookings[0];
  assert.equal(b.status, "pending");
  assert.equal(b.price_minor, 0);
  assert.equal(b.meeting_url, null);
  assert.equal((await rows("select * from public.tutor_bookings")).length, 1);
});
test("competing and overlapping requests cannot reserve a second appointment", async () => {
  await as(other);
  await assert.rejects(
    async () =>
      rpc("tutor_request_booking", [
        crypto.randomUUID(),
        tutor,
        lesson,
        start,
        "Competing slot",
      ]),
    /Slot unavailable/,
  );
  const shifted = new Date(
    new Date(start).getTime() + 15 * 60000,
  ).toISOString();
  await assert.rejects(
    async () =>
      rpc("tutor_request_booking", [
        crypto.randomUUID(),
        tutor,
        lesson,
        shifted,
        "Overlapping slot",
      ]),
    /Slot unavailable/,
  );
});
test("server confirmation rechecks blocked availability and stale versions", async () => {
  await as(tutor);
  const end = new Date(new Date(start).getTime() + 30 * 60000).toISOString(),
    block = await rpc("tutor_manage", [
      "exception",
      JSON.stringify({ kind: "blocked", starts_at: start, ends_at: end }),
    ]);
  await assert.rejects(() => action("confirm"), /Slot unavailable/);
  await rpc("tutor_manage", [
    "remove_exception",
    JSON.stringify({ id: block }),
  ]);
  await action("confirm");
  await assert.rejects(
    async () =>
      rpc("tutor_booking_action", [
        booking,
        "cancel",
        "2000-01-01T00:00:00Z",
        "{}",
      ]),
    /Stale/,
  );
});
test("private meeting links and author-only notes never leak through the public catalog or to admins", async () => {
  await as(tutor);
  await action("meeting", { url: "https://meet.google.com/abc-defg-hij" });
  await action("note", { note: "Private tutor note" });
  assert.equal(
    (await workspace()).bookings[0].private_note,
    "Private tutor note",
  );
  await as(student);
  assert.equal(
    (await workspace()).bookings[0].meeting_url,
    "https://meet.google.com/abc-defg-hij",
  );
  assert.equal((await workspace()).bookings[0].private_note, "");
  await action("note", { note: "Private student note" });
  await as(other);
  assert.equal((await workspace()).bookings.length, 0);
  assert.equal((await rows("select * from public.tutor_meetings")).length, 0);
  assert.equal(
    (await rows("select * from public.tutor_lesson_notes")).length,
    0,
  );
  await as(admin);
  assert.equal((await rows("select * from public.tutor_meetings")).length, 0);
  assert.equal(
    (await rows("select * from public.tutor_lesson_notes")).length,
    0,
  );
  assert(
    !JSON.stringify(await rpc("tutor_admin_workspace")).includes(
      "meet.google.com",
    ),
  );
  assert(
    !JSON.stringify(await rpc("tutor_catalog")).includes(
      "Private student note",
    ),
  );
});
test("completion needs the scheduled end and both participants; reviews cannot be forged early", async () => {
  await as(student);
  await assert.rejects(
    async () =>
      rpc("tutor_write_review", [booking, 5, "Trying before the lesson"]),
    /Completed lesson/,
  );
  await assert.rejects(() => action("complete"), /Invalid booking/);
  await db.exec("reset role");
  await rows(
    "update public.tutor_bookings set starts_at=now()-interval '2 hours',ends_at=now()-interval '1 hour' where id=$1",
    [booking],
  );
  await as(tutor);
  await action("complete");
  assert.equal((await workspace()).bookings[0].status, "confirmed");
  await as(student);
  await action("complete");
  assert.equal((await workspace()).bookings[0].status, "completed");
});
test("one review per completed booking, moderated public projection and genuine aggregate inputs", async () => {
  await as(student);
  const review = await rpc("tutor_write_review", [
    booking,
    4,
    "A helpful lesson in this local database fixture.",
  ]);
  await assert.rejects(
    async () =>
      rpc("tutor_write_review", [
        booking,
        5,
        "Duplicate review is not allowed",
      ]),
    /unique/,
  );
  assert.equal((await rpc("tutor_catalog"))[0].reviews.length, 0);
  await as(other);
  await assert.rejects(
    async () => rpc("tutor_write_review", [booking, 5, "Unauthorized review"]),
    /Completed/,
  );
  await as(admin);
  await rpc("tutor_moderate", [
    "review",
    review,
    "published",
    "Reviewed the local lesson review fixture",
  ]);
  const published = (await rpc("tutor_catalog"))[0].reviews[0];
  assert.equal(published.rating, 4);
  assert(!("learner_id" in published));
  assert(!("booking_id" in published));
  await as(tutor);
  await rpc("tutor_review_response", [
    review,
    "Thank you for practicing Japanese.",
  ]);
  assert.equal((await rpc("tutor_catalog"))[0].reviews.length, 0);
});
test("reported profiles, reviews and disputes are private and moderation requires platform administration", async () => {
  await as(student);
  const report = await rpc("tutor_report", [
    "booking",
    booking,
    "Private local test dispute description",
  ]);
  await as(other);
  assert.equal((await rows("select * from public.tutor_reports")).length, 0);
  await assert.rejects(
    async () =>
      rpc("tutor_report", ["booking", booking, "Unauthorized booking report"]),
    /unavailable/,
  );
  await assert.rejects(
    async () =>
      rpc("tutor_moderate", [
        "report",
        report,
        "resolved",
        "Unauthorized moderation attempt",
      ]),
    /Administrator/,
  );
  await as(admin);
  await rpc("tutor_moderate", [
    "report",
    report,
    "resolved",
    "Resolved the local test dispute fairly",
  ]);
  assert((await rpc("tutor_admin_workspace")).logs.length > 0);
});
test("editing an approved application withdraws publication and credential verification", async () => {
  await as(tutor);
  await rpc("tutor_application_save", [
    JSON.stringify({ ...input, biography: input.biography + " Updated." }),
    await applicationVersion(),
  ]);
  assert.equal((await workspace()).application.status, "draft");
  assert.equal((await rpc("tutor_catalog")).length, 0);
  assert.equal((await workspace()).profile.qualifications_verified, false);
  await assert.rejects(
    async () =>
      rpc("tutor_application_save", [
        JSON.stringify(input),
        "2000-01-01T00:00:00Z",
      ]),
    /Stale/,
  );
});
test("DST gaps and offset-changing lessons are rejected while repeated-hour instants stay distinct", async () => {
  await db.exec("reset role");
  const valid = async (a, b) =>
    (
      await rows(
        "select private.tutor_interval_stable('America/New_York',$1::timestamptz,$2::timestamptz) v",
        [a, b],
      )
    )[0].v;
  assert.equal(
    await valid("2026-03-08T06:45:00Z", "2026-03-08T07:15:00Z"),
    false,
  );
  assert.equal(
    await valid("2026-11-01T05:45:00Z", "2026-11-01T06:15:00Z"),
    false,
  );
  assert.equal(
    await valid("2026-11-01T05:00:00Z", "2026-11-01T05:30:00Z"),
    true,
  );
  assert.equal(
    await valid("2026-11-01T06:00:00Z", "2026-11-01T06:30:00Z"),
    true,
  );
  assert.equal(
    (
      await rows(
        "select count(*)::int n from generate_series('2026-03-08T05:00Z'::timestamptz,'2026-03-09T04:00Z'::timestamptz,interval '15 minutes') s where (s at time zone 'America/New_York')::time='02:30'",
      )
    )[0].n,
    0,
  );
});
test("expired holds release slots, cancellation requests remain private and suspension cancels upcoming lessons", async () => {
  await as(tutor);
  await rpc("tutor_application_submit", [await applicationVersion()]);
  await as(admin);
  await rpc("tutor_admin_review", [
    tutor,
    "under_review",
    await applicationVersion(),
    "Reviewing revised local fixture",
    false,
    "",
  ]);
  await rpc("tutor_admin_review", [
    tutor,
    "approved",
    await applicationVersion(),
    "Approving revised local fixture",
    false,
    "",
  ]);
  await as(tutor);
  await rpc("tutor_manage", [
    "settings",
    JSON.stringify({
      timezone: "Asia/Tokyo",
      notice_hours: 0,
      horizon_days: 90,
      published: true,
    }),
  ]);
  await as(student);
  const slots = await rpc("tutor_slots", [
      tutor,
      lesson,
      new Date(Date.now() + 3 * 86400000).toISOString(),
      7,
    ]),
    s = slots[0].starts_at;
  booking = crypto.randomUUID();
  await rpc("tutor_request_booking", [
    booking,
    tutor,
    lesson,
    s,
    "Expiry fixture",
  ]);
  await db.exec("reset role");
  await rows(
    "update public.tutor_bookings set request_expires_at=now()-interval '1 minute' where id=$1",
    [booking],
  );
  await as(tutor);
  await assert.rejects(() => action("confirm"), /Invalid/);
  await as(other);
  const second = crypto.randomUUID();
  await rpc("tutor_request_booking", [
    second,
    tutor,
    lesson,
    s,
    "Replacement after expired request",
  ]);
  booking = second;
  await as(tutor);
  await action("confirm");
  await as(other);
  await action("request_cancel", {
    reason: "Schedule conflict in local fixture",
  });
  assert(
    (await workspace()).bookings.find((b) => b.id === booking)
      .cancellation_requested_at,
  );
  assert.equal(
    (await workspace()).bookings.find((b) => b.id === booking).status,
    "confirmed",
  );
  await as(tutor);
  await action("cancel", { reason: "Accepted cancellation request" });
  await as(student);
  booking = crypto.randomUUID();
  await rpc("tutor_request_booking", [
    booking,
    tutor,
    lesson,
    s,
    "Suspension fixture",
  ]);
  await as(admin);
  await rpc("tutor_admin_review", [
    tutor,
    "suspended",
    await applicationVersion(),
    "Suspending local fixture for moderation testing",
    false,
    "",
  ]);
  assert.equal((await rpc("tutor_catalog")).length, 0);
  await as(student);
  assert.equal(
    (await workspace()).bookings.find((b) => b.id === booking).status,
    "cancelled",
  );
});
test("request quota is persistent across cancellation and private retention removes expired links and notes", async () => {
  await db.exec("reset role");
  await rows(
    "insert into public.tutor_request_limits(user_id,day,requests) values($1,current_date,20) on conflict(user_id,day) do update set requests=20",
    [student],
  );
  await as(admin);
  await rpc("tutor_admin_review", [
    tutor,
    "under_review",
    await applicationVersion(),
    "Rechecking local suspended fixture",
    false,
    "",
  ]);
  await rpc("tutor_admin_review", [
    tutor,
    "approved",
    await applicationVersion(),
    "Reapproving local fixture for quota test",
    false,
    "",
  ]);
  await as(tutor);
  await rpc("tutor_manage", [
    "settings",
    JSON.stringify({
      timezone: "Asia/Tokyo",
      notice_hours: 0,
      horizon_days: 90,
      published: true,
    }),
  ]);
  const slots = await rpc("tutor_slots", [
    tutor,
    lesson,
    new Date(Date.now() + 4 * 86400000).toISOString(),
    7,
  ]);
  await as(student);
  await assert.rejects(
    () =>
      rpc("tutor_request_booking", [
        crypto.randomUUID(),
        tutor,
        lesson,
        slots[0].starts_at,
        "Quota test",
      ]),
    /Daily request limit/,
  );
  await db.exec("reset role");
  await rows(
    "update public.tutor_bookings set starts_at=now()-interval '2 years',ends_at=now()-interval '2 years'+interval '30 minutes' where status='completed'",
  );
  await as(admin);
  await rpc("tutor_purge_private");
  assert.equal((await rows("select * from public.tutor_meetings")).length, 0);
  await as(tutor);
  assert.equal(
    (await rows("select * from public.tutor_lesson_notes")).length,
    0,
  );
});
test("competing transactional requests serialize and only one reserves the shared tutor slot", async () => {
  await as(tutor);
  const day = new Date(Date.now() + 5 * 86400000).toISOString().slice(0, 10),
    slots = await rpc("tutor_local_slots", [
      tutor,
      lesson,
      day,
      "Asia/Kathmandu",
    ]);
  assert(slots.length > 0);
  for (const s of slots) {
    const d = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Kathmandu",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date(s.starts_at));
    assert(d >= day);
    assert(
      d <
        new Date(new Date(day).getTime() + 7 * 86400000)
          .toISOString()
          .slice(0, 10),
    );
  }
  await db.exec("reset role");
  await rows("delete from public.tutor_request_limits where user_id=$1", [
    student,
  ]);
  const request = (user) =>
    db.transaction(async (tx) => {
      await tx.query("select set_config('request.jwt.claim.sub',$1,true)", [
        user,
      ]);
      await tx.exec("set local role authenticated");
      return (
        await tx.query(
          "select public.tutor_request_booking($1,$2,$3,$4,$5) r",
          [
            crypto.randomUUID(),
            tutor,
            lesson,
            slots[0].starts_at,
            "Concurrent scheduler fixture",
          ],
        )
      ).rows[0].r;
    });
  const results = await Promise.allSettled([request(student), request(other)]);
  assert.equal(results.filter((r) => r.status === "fulfilled").length, 1);
  assert.equal(results.filter((r) => r.status === "rejected").length, 1);
});
test("credential status changes are audited independently and ordinary tutors cannot self-verify", async () => {
  await as(tutor);
  await assert.rejects(
    async () =>
      rpc("tutor_admin_review", [
        tutor,
        "verification",
        await applicationVersion(),
        "Attempted self verification",
        true,
        "Claimed credential verification",
      ]),
    /Administrator/,
  );
  await as(admin);
  await rpc("tutor_admin_review", [
    tutor,
    "verification",
    await applicationVersion(),
    "Reviewed local credential evidence again",
    true,
    "Locally reviewed fixture credential",
  ]);
  assert.equal((await rpc("tutor_catalog"))[0].qualifications_verified, true);
  await rpc("tutor_admin_review", [
    tutor,
    "verification",
    await applicationVersion(),
    "Revoking the local fixture credential badge",
    false,
    "",
  ]);
  const profile = (await rpc("tutor_catalog"))[0];
  assert.equal(profile.qualifications_verified, false);
  assert.equal(profile.qualification_summary, "");
  assert.equal(profile.published, true);
});
test("save and submit are atomic, and public reads never reveal raw review identities", async () => {
  await as(other);
  await rpc("tutor_application_save", [
    JSON.stringify({
      ...input,
      display_name: "Another local fixture applicant",
    }),
    null,
    true,
  ]);
  assert.equal((await workspace()).application.status, "submitted");
  assert.equal((await rpc("tutor_catalog")).length, 1);
  await as(admin);
  const r = (await rpc("tutor_admin_workspace")).reviews[0];
  await rpc("tutor_moderate", [
    "review",
    r.id,
    "published",
    "Publishing the original local review fixture after response moderation",
  ]);
  await db.exec("reset role");
  await rows("select set_config('request.jwt.claim.sub','',false)");
  await db.exec("set role anon");
  const cat = await rpc("tutor_catalog");
  assert.equal(cat[0].reviews.length, 1);
  assert(!("learner_id" in cat[0].reviews[0]));
  await assert.rejects(()=>rows("select * from public.tutor_reviews"),/permission denied/);
  await assert.rejects(() => rpc("tutor_workspace"), /permission denied/);
});
