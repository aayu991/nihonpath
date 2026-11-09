import assert from "node:assert/strict";
import fs from "node:fs";
const origin = process.env.NIHONPATH_TEST_ORIGIN ?? "http://localhost:3000";
let n = 0;
for (const locale of ["en", "ja", "ne", "hi"]) {
  const m = JSON.parse(fs.readFileSync(`messages/${locale}.json`, "utf8"));
  for (const path of ["pricing", "checkout", "billing-policy"]) {
    const r = await fetch(`${origin}/${locale}/${path}`);
    const html = await r.text();
    assert.equal(r.status, 200);
    assert(html.includes(`lang="${locale}"`));
    assert(html.includes(m.Billing.test));
    assert(!html.includes("sk_test_"));
    assert(!html.includes("fixture-secret"));
    n++;
  }
  for (const path of ["billing", "admin/billing"]) {
    const r = await fetch(`${origin}/${locale}/${path}`, {
      redirect: "manual",
    });
    const body = await r.text();
    assert(
      (r.status >= 300 &&
        r.status < 400 &&
        r.headers.get("location")?.includes(`/${locale}/login`)) ||
        (body.includes("NEXT_REDIRECT") && body.includes(`/${locale}/login`)),
    );
    n++;
  }
}
for (const path of ["checkout", "manage"]) {
  const r = await fetch(`${origin}/api/billing/${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: origin },
    body: "{}",
  });
  assert.equal(r.status, 401);
  n++;
}
const webhook = await fetch(`${origin}/api/billing/webhook/stripe`, {
  method: "POST",
  body: "{}",
});
assert([400, 503].includes(webhook.status));
n++;
console.log(
  `${n} billing localization, public/private routing and unauthenticated API checks passed.`,
);
