import assert from "node:assert/strict";
const origin = process.env.NIHONPATH_TEST_ORIGIN ?? "http://localhost:3000";
let count = 0;
for (const locale of ["en", "ja"]) {
  const response = await fetch(`${origin}/${locale}/exams`);
  const html = await response.text();
  assert.equal(response.status, 200);
  assert.ok(
    html.includes(locale === "en" ? "Examination center" : "試験センター"),
  );
  assert.ok(!html.includes("correctOptionId"));
  count++;
  const alias = await fetch(`${origin}/${locale}/mock-tests`);
  assert.equal(alias.status, 200);
  assert.ok(
    alias.url.endsWith("/exams") ||
      (await alias.text()).includes(`/${locale}/exams`),
  );
  count++;
  for (const path of [
    "exams/mistakes",
    "exams/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    "admin/exams",
  ]) {
    const r = await fetch(`${origin}/${locale}/${path}`);
    const body = await r.text();
    assert.ok(
      r.url.includes(`/${locale}/login`) ||
        body.includes(
          `NEXT_REDIRECT;replace;/${locale}/login?notice=session;307;`,
        ),
      `${locale}/${path} must require authentication`,
    );
    count++;
  }
}
console.log(
  `${count} examination routes and guest authorization checks passed.`,
);
