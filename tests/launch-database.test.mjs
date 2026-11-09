import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { PGlite } from "@electric-sql/pglite";
const db = new PGlite(),
  alice = "a2000000-0000-4000-8000-000000000001",
  bob = "a2000000-0000-4000-8000-000000000002",
  admin = "a2000000-0000-4000-8000-000000000003";
const q = async (s, a = []) => (await db.query(s, a)).rows;
async function as(u, role = "authenticated") {
  await db.exec("reset role");
  await q("select set_config('request.jwt.claim.sub',$1,false)", [u]);
  await db.exec(`set role ${role}`);
}
async function rpc(f, a = []) {
  return (
    await q(
      `select public.${f}(${a.map((_, i) => "$" + (i + 1)).join(",")}) result`,
      a,
    )
  )[0].result;
}
let ticket;
before(async () => {
  await db.exec(
    "create role anon;create role authenticated;create role service_role bypassrls;create schema auth;create table auth.users(id uuid primary key,email_confirmed_at timestamptz default now(),raw_user_meta_data jsonb not null default '{}');create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema auth to anon,authenticated;grant execute on function auth.uid() to anon,authenticated;",
  );
  for (const f of fs.readdirSync("supabase/migrations").sort())
    await db.exec(fs.readFileSync("supabase/migrations/" + f, "utf8"));
  for (const u of [alice, bob, admin])
    await q("insert into auth.users(id) values($1)", [u]);
  await q("insert into private.admin_users(user_id) values($1)", [admin]);
});
after(() => db.close());
test("all 101 exposed tables have RLS and the operations schema reports ready", async () => {
  assert.equal(await rpc("launch_schema_health"), true);
  assert.equal(
    (
      await q(
        "select count(*)::int n from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind='r' and c.relrowsecurity",
      )
    )[0].n,
    101,
  );
});
test("guest support and direct learner support writes are rejected", async () => {
  await as("", "anon");
  await assert.rejects(
    rpc("support_submit", [
      crypto.randomUUID(),
      "account",
      "Help needed",
      "A sufficiently long private support message.",
    ]),
  );
  await as(alice);
  await assert.rejects(
    q(
      "insert into public.support_requests values(gen_random_uuid(),$1,'account','Subject','Message','open',now(),now())",
      [bob],
    ),
  );
});
test("support is idempotent and owner scoped, with forged retry denial", async () => {
  ticket = crypto.randomUUID();
  await as(alice);
  assert.equal(
    await rpc("support_submit", [
      ticket,
      "account",
      "Local support fixture",
      "A sufficiently long local support fixture message.",
    ]),
    ticket,
  );
  assert.equal(
    await rpc("support_submit", [
      ticket,
      "account",
      "Local support fixture",
      "A sufficiently long local support fixture message.",
    ]),
    ticket,
  );
  assert.equal((await q("select * from public.support_requests")).length, 1);
  await as(bob);
  assert.equal((await q("select * from public.support_requests")).length, 0);
  await assert.rejects(
    rpc("support_submit", [
      ticket,
      "account",
      "Local support fixture",
      "A sufficiently long local support fixture message.",
    ]),
  );
  await assert.rejects(rpc("launch_admin_snapshot"));
});
test("independent administrators review status with stale version protection", async () => {
  await as(admin);
  const old = (
    await q("select * from public.support_requests where id=$1", [ticket])
  )[0];
  await rpc("support_review", [
    ticket,
    "in_review",
    old.updated_at.toISOString(),
  ]);
  await assert.rejects(
    rpc("support_review", [ticket, "resolved", old.updated_at.toISOString()]),
    /stale/,
  );
  await as(alice);
  await assert.rejects(
    rpc("support_review", [ticket, "resolved", old.updated_at.toISOString()]),
  );
  assert.equal(
    (await q("select * from public.support_requests"))[0].status,
    "in_review",
  );
});
test("support daily limits survive idempotent retries", async () => {
  await as(alice);
  for (let i = 0; i < 4; i++)
    await rpc("support_submit", [
      crypto.randomUUID(),
      "courses",
      "Course fixture",
      "A sufficiently long local course support fixture.",
    ]);
  await assert.rejects(
    rpc("support_submit", [
      crypto.randomUUID(),
      "courses",
      "Course fixture",
      "A sufficiently long local course support fixture.",
    ]),
    /limit/,
  );
});
test("preferences remain owner scoped and do not grant roles", async () => {
  await rpc("notification_preferences_save", [true, true]);
  await as(bob);
  assert.equal(
    (await q("select * from public.notification_preferences")).length,
    0,
  );
  assert.equal(await rpc("is_admin"), false);
  await assert.rejects(
    q("update public.notification_preferences set learning_updates=true"),
  );
});
test("clients cannot forge verified conversions, operation logs or email jobs", async () => {
  await assert.rejects(rpc("launch_client_count", ["purchase_verified", "en"]));
  await assert.rejects(rpc("launch_monitor", ["api_failure"]));
  await assert.rejects(rpc("launch_email_claim"));
  await assert.rejects(
    q("select private.launch_enqueue($1,'payment_confirmed','forged')", [
      alice,
    ]),
  );
});
test("server aggregate counters contain no personal identifiers and enforce event allowlists", async () => {
  await as("", "postgres");
  await rpc("launch_client_count", ["homepage_visit", "ne"]);
  await assert.rejects(
    rpc("launch_client_count", ["purchase_verified", "en"]),
    /invalid_event/,
  );
  const row = (
    await q("select * from public.analytics_daily where source='client'")
  )[0];
  assert.deepEqual(Object.keys(row).sort(), [
    "count",
    "day",
    "event",
    "locale",
    "source",
  ]);
  assert.equal(row.locale, "ne");
});
test("email claims lease rows, apply preferences, and reject stale acknowledgements", async () => {
  await q(
    "select private.launch_enqueue($1,'enrollment','fixture-enrollment')",
    [alice],
  );
  await q(
    "select private.launch_enqueue($1,'enrollment','fixture-suppressed')",
    [bob],
  );
  const jobs = await rpc("launch_email_claim");
  assert.equal(jobs.length, 1);
  assert.equal(jobs[0].user_id, alice);
  assert.deepEqual(await rpc("launch_email_claim"), []);
  await assert.rejects(
    rpc("launch_email_finish", [
      jobs[0].id,
      crypto.randomUUID(),
      "accepted",
      "provider-fixture",
    ]),
    /stale/,
  );
  await rpc("launch_email_finish", [
    jobs[0].id,
    jobs[0].lease_token,
    "accepted",
    "provider-fixture",
  ]);
  assert.equal(
    (
      await q("select status from public.email_outbox where user_id=$1", [bob])
    )[0].status,
    "suppressed",
  );
  assert.equal(
    (await q("select count(*)::int n from public.email_delivery_logs"))[0].n,
    1,
  );
});
test("retryable delivery uses backoff and reuses the stable outbox id", async () => {
  await q(
    "select private.launch_enqueue($1,'booking_request','fixture-booking')",
    [alice],
  );
  const [job] = await rpc("launch_email_claim");
  await rpc("launch_email_finish", [job.id, job.lease_token, "retry", null]);
  assert.equal(
    (
      await q("select attempts from public.email_outbox where id=$1", [job.id])
    )[0].attempts,
    1,
  );
  assert.deepEqual(await rpc("launch_email_claim"), []);
});
test("actual source events are aggregated once without queueing private message content", async () => {
  const course = (
    await q("select id from public.courses where published limit 1")
  )[0].id;
  await as(alice);
  await q(
    "insert into public.course_enrollments(user_id,course_id) values($1,$2)",
    [alice, course],
  );
  await as("", "postgres");
  const jobs = await q(
    "select * from public.email_outbox where event_reference=$1",
    [course],
  );
  assert.equal(jobs.length, 1);
  assert.equal(jobs[0].kind, "enrollment");
  assert(!Object.keys(jobs[0]).includes("body"));
});
test("the full schema can be backed up and restored to a fresh disposable database", async () => {
  await as("", "postgres");
  const blob = await db.dumpDataDir();
  const restored = new PGlite({ loadDataDir: blob });
  try {
    assert.equal(
      (
        await restored.query(
          "select count(*)::int n from public.support_requests",
        )
      ).rows[0].n,
      5,
    );
    assert.equal(
      (await restored.query("select public.launch_schema_health() ok")).rows[0]
        .ok,
      true,
    );
  } finally {
    await restored.close();
  }
});

test('nonfinancial support and notification records cascade on explicit account deletion',async()=>{await as('','postgres');await q('delete from auth.users where id=$1',[alice]);assert.equal((await q('select count(*)::int n from public.support_requests where user_id=$1',[alice]))[0].n,0);assert.equal((await q('select count(*)::int n from public.email_outbox where user_id=$1',[alice]))[0].n,0);assert.equal((await q('select count(*)::int n from public.notification_preferences where user_id=$1',[alice]))[0].n,0);});
