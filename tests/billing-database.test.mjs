import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { PGlite } from "@electric-sql/pglite";
const db = new PGlite(),
  alice = "91000000-0000-4000-8000-000000000001",
  bob = "91000000-0000-4000-8000-000000000002",
  admin = "91000000-0000-4000-8000-000000000003";
const q = async (s, a = []) => (await db.query(s, a)).rows;
async function as(u, role = "authenticated") {
  await db.exec("reset role");
  await q("select set_config('request.jwt.claim.sub',$1,false)", [u]);
  await db.exec(`set role ${role}`);
}
async function rpc(name, args = []) {
  return (
    await q(
      `select public.${name}(${args.map((_, i) => "$" + (i + 1)).join(",")}) r`,
      args,
    )
  )[0].r;
}
let price, stripe, order, pass2;
const proof = (o, event = "paid1", state = "paid", more = {}) =>
  JSON.stringify({
    reference: o.provider_reference,
    event,
    state,
    amount: o.amount_minor,
    currency: o.currency,
    ...more,
  });
async function create(
  p = price,
  provider = "esewa",
  key = crypto.randomUUID(),
) {
  await as(alice);
  const o = await rpc("billing_order_create", [p, provider, "NP", key, "en"]);
  await as("", "postgres");
  assert.equal(await rpc("billing_claim", [o.id]), true);
  await rpc("billing_attach", [
    o.id,
    provider === "stripe" ? "cs_test_" + o.id : o.id,
  ]);
  return {
    ...o,
    provider_reference: provider === "stripe" ? "cs_test_" + o.id : o.id,
  };
}
before(async () => {
  await db.exec(
    "create role anon;create role authenticated;create role service_role bypassrls;create schema auth;create table auth.users(id uuid primary key,email_confirmed_at timestamptz default now(),raw_user_meta_data jsonb not null default '{}');create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema auth to anon,authenticated;grant execute on function auth.uid() to anon,authenticated;",
  );
  for (const f of fs.readdirSync("supabase/migrations").sort())
    await db.exec(fs.readFileSync("supabase/migrations/" + f, "utf8"));
  await db.exec(
    fs.readFileSync("supabase/seeds/20261024_task4_demo.sql", "utf8"),
  );
  for (const u of [alice, bob, admin])
    await q("insert into auth.users(id) values($1)", [u]);
  await q("insert into private.admin_users(user_id) values($1)", [admin]);
});
after(() => db.close());
test("all gateways and products start disabled without fabricated prices", async () => {
  assert.deepEqual(await rpc("billing_catalog"), []);
  assert.equal(
    (await q("select count(*)::int n from public.regional_prices"))[0].n,
    0,
  );
});
test("anonymous and ordinary users cannot create verified payments or entitlements", async () => {
  await as("", "anon");
  await assert.rejects(
    rpc("billing_order_create", [
      crypto.randomUUID(),
      "esewa",
      "NP",
      crypto.randomUUID(),
      "en",
    ]),
  );
  await as(alice);
  await assert.rejects(
    q(
      "insert into public.entitlements values(gen_random_uuid(),$1,'jlpt',now(),now()+interval '1 day',null)",
      [alice],
    ),
  );
  await assert.rejects(rpc("billing_apply", [crypto.randomUUID(), "{}"]));
  await assert.rejects(rpc("billing_admin_report"));
});
test("enabled test price creates server snapshots and rejects client gateway/country mismatch", async () => {
  await as("", "postgres");
  await db.exec(
    "update public.payment_providers set enabled=true;update public.billing_products set enabled=true",
  );
  price = (
    await q(
      "insert into public.regional_prices(product,provider,country,currency,amount_minor,tax_minor,tax_label,kind,days,enabled) values('premium','esewa','NP','NPR',12345,345,'Local fixture tax','pass',30,true) returning id",
    )
  )[0].id;
  stripe = (
    await q(
      "insert into public.regional_prices(product,provider,country,currency,amount_minor,tax_label,kind,interval,enabled) values('premium','stripe','*','USD',1500,'Local fixture tax','subscription','month',true) returning id",
    )
  )[0].id;
  await as(alice);
  await assert.rejects(
    rpc("billing_order_create", [
      price,
      "khalti",
      "NP",
      crypto.randomUUID(),
      "en",
    ]),
  );
  await assert.rejects(
    rpc("billing_order_create", [
      price,
      "esewa",
      "US",
      crypto.randomUUID(),
      "en",
    ]),
  );
  order = await create();
  assert.equal(order.amount_minor, 12345);
  assert.equal(order.tax_minor, 345);
});
test("order retries are idempotent and purchase history is owner scoped", async () => {
  await as(alice);
  const a = await rpc("billing_order_create", [
    price,
    "esewa",
    "NP",
    order.request_key,
    "en",
  ]);
  assert.equal(a.id, order.id);
  await assert.rejects(
    rpc("billing_order_create", [
      price,
      "esewa",
      "US",
      order.request_key,
      "en",
    ]),
  );
  await as(bob);
  assert.equal((await q("select * from public.purchase_orders")).length, 0);
  await assert.rejects(q("update public.purchase_orders set amount_minor=1"));
});
test("pending, failed and amount mismatch never grant access", async () => {
  await as("", "postgres");
  await rpc("billing_apply", [order.id, proof(order, "pending1", "pending")]);
  await assert.rejects(
    rpc("billing_apply", [
      order.id,
      proof(order, "forged", "paid", { amount: 1 }),
    ]),
  );
  await as(alice);
  assert.equal(await rpc("billing_has_feature", ["jlpt"]), false);
});
test("verified passes activate once and duplicate callbacks do not extend expiry", async () => {
  await as("", "postgres");
  await rpc("billing_apply", [order.id, proof(order)]);
  const a = await q("select * from public.access_passes where order_id=$1", [
    order.id,
  ]);
  await rpc("billing_apply", [order.id, proof(order)]);
  await rpc("billing_apply", [order.id, proof(order, "another-paid")]);
  const b = await q("select * from public.access_passes where order_id=$1", [
    order.id,
  ]);
  assert.deepEqual(a, b);
  assert.equal(
    (await q("select count(*)::int n from public.payment_transactions"))[0].n,
    1,
  );
  await as(alice);
  assert.equal(await rpc("billing_has_feature", ["jlpt"]), true);
  assert.equal(await rpc("billing_has_feature", ["organizations"]), false);
  await as(bob);
  assert.equal(await rpc("billing_has_feature", ["jlpt"]), false);
});
test("manual renewal stacks access without duplicating previous pass", async () => {
  pass2 = await create();
  await rpc("billing_apply", [pass2.id, proof(pass2, "paid2")]);
  const rows = await q("select * from public.access_passes order by starts_at");
  assert.equal(rows.length, 2);
  assert.equal(rows[0].ends_at.getTime(), rows[1].starts_at.getTime());
});
test("reversal revokes the affected order and stale paid proof cannot restore it", async () => {
  await as("", "postgres");
  await rpc("billing_apply", [
    order.id,
    proof(order, "refund1", "reversed", { refundAmount: 12345 }),
  ]);
  await rpc("billing_apply", [order.id, proof(order, "stale")]);
  assert.equal(
    (
      await q("select status from public.purchase_orders where id=$1", [
        order.id,
      ])
    )[0].status,
    "reversed",
  );
  await as(alice);
  assert.equal(await rpc("billing_has_feature", ["jlpt"]), false);
});
test("subscription invoices extend exact verified periods and ignore older invoices", async () => {
  const o = await create(stripe, "stripe");
  const now = Date.now() - 1000,
    a = new Date(now).toISOString(),
    b = new Date(now + 30 * 86400000).toISOString();
  await rpc("billing_apply", [
    o.id,
    proof(o, "invoice1", "paid", {
      subscription: "sub_fixture",
      customer: "cus_fixture",
      receipt: "in_fixture1",
      periodStart: a,
      periodEnd: b,
    }),
  ]);
  const c = new Date(now + 60 * 86400000).toISOString();
  await rpc("billing_apply", [
    o.id,
    proof(o, "invoice2", "paid", {
      subscription: "sub_fixture",
      customer: "cus_fixture",
      receipt: "in_fixture2",
      periodStart: b,
      periodEnd: c,
    }),
  ]);
  await rpc("billing_apply", [
    o.id,
    proof(o, "oldinvoice", "paid", {
      subscription: "sub_fixture",
      customer: "cus_fixture",
      receipt: "in_old",
      periodStart: a,
      periodEnd: b,
    }),
  ]);
  assert.equal(
    (
      await q(
        "select period_end from public.billing_subscriptions where order_id=$1",
        [o.id],
      )
    )[0].period_end.toISOString(),
    c,
  );
  await as(alice);
  assert.equal(await rpc("billing_has_feature", ["jlpt"]), true);
});
test("access expires by server time without requiring a scheduled job", async () => {
  await as("", "postgres");
  await db.exec(
    "update public.entitlements set ends_at=now()-interval '1 second';",
  );
  await as(alice);
  assert.equal(await rpc("billing_has_feature", ["jlpt"]), false);
});
test("premium lesson/deck direct reads and quiz RPCs fail closed", async () => {
  await as("", "postgres");
  const bank = (await q("select id from public.question_banks limit 1"))[0].id;
  const lesson = (
    await q("select id from public.lessons where published limit 1")
  )[0].id;
  const deck = (
    await q("select id from public.flashcard_decks where published limit 1")
  )[0].id;
  for (const [table, id, feature] of [
    ["question_banks", bank, "mock_exams"],
    ["lessons", lesson, "jlpt"],
    ["flashcard_decks", deck, "flashcards"],
  ])
    await q("insert into public.premium_requirements values($1,$2,$3)", [
      table,
      id,
      feature,
    ]);
  await as(alice);
  assert.equal(
    (await q("select * from public.lessons where id=$1", [lesson])).length,
    0,
  );
  assert.equal(
    (await q("select * from public.flashcards where deck_id=$1", [deck]))
      .length,
    0,
  );
  await assert.rejects(rpc("practice_quiz", [bank, "[]"]), /premium_required/);
  await assert.rejects(
    rpc("submit_quiz", [crypto.randomUUID(), bank, "[]"]),
    /premium_required/,
  );
  await assert.rejects(
    q("select private.billing_legacy_practice_quiz($1,$2)", [bank, "[]"]),
  );
});
test("admin report separates provider/currency totals and leaves missing settlements unknown", async () => {
  await as(admin);
  const report = await rpc("billing_admin_report");
  assert(report.totals.some((x) => x.currency === "NPR"));
  assert(report.totals.some((x) => x.currency === "USD"));
  assert.deepEqual(report.settlements, []);
  assert.equal(
    (await q("select count(*)::int n from public.payment_attempts"))[0].n,
    0,
  );
});

test("missing proof fields fail closed even for a trusted writer", async () => {
  await as("", "postgres");
  await assert.rejects(
    rpc("billing_apply", [
      pass2.id,
      JSON.stringify({ state: "paid", event: "missing-fields" }),
    ]),
    /invalid_proof/,
  );
});
test("verification requests are bounded per order and client roles cannot bypass the limit", async () => {
  await as("", "postgres");
  for (let i = 0; i < 5; i++)
    assert.equal(await rpc("billing_verify_claim", [pass2.id]), true);
  assert.equal(await rpc("billing_verify_claim", [pass2.id]), false);
  await as(alice);
  await assert.rejects(rpc("billing_verify_claim", [pass2.id]));
});
test("ending a Stripe subscription expires access without inventing a refund", async () => {
  await as("", "postgres");
  const s = (await q("select * from public.billing_subscriptions limit 1"))[0];
  const before = (await q("select count(*)::int n from public.refunds"))[0].n;
  await rpc("billing_subscription_end", [s.order_id, "sub-ended"]);
  await rpc("billing_subscription_end", [s.order_id, "sub-ended"]);
  assert.equal(
    (
      await q(
        "select status from public.billing_subscriptions where order_id=$1",
        [s.order_id],
      )
    )[0].status,
    "cancelled",
  );
  assert.equal(
    (await q("select count(*)::int n from public.refunds"))[0].n,
    before,
  );
});
test("premium exam and AI entry points reject unpaid users before legacy definer logic", async () => {
  await as("", "postgres");
  const exam = crypto.randomUUID(),
    scenario = crypto.randomUUID();
  await q(
    "insert into public.premium_requirements values('exam_templates',$1,'mock_exams'),('ai_scenarios',$2,'ai_tutor')",
    [exam, scenario],
  );
  await as(alice);
  await assert.rejects(
    rpc("start_exam", [crypto.randomUUID(), exam, null, "mixed"]),
    /premium_required/,
  );
  await as("", "postgres");
  await assert.rejects(
    rpc("ai_start", [
      alice,
      crypto.randomUUID(),
      JSON.stringify({ scenarioId: scenario }),
    ]),
    /premium_required/,
  );
});
