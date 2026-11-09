import assert from "node:assert/strict";
import fs from "node:fs";
const d = JSON.parse(fs.readFileSync("src/data/guide-content.json", "utf8")),
  origin = process.env.NIHONPATH_TEST_ORIGIN ?? "http://localhost:3000";
const routes = [
  ...["en", "ja"].flatMap((locale) =>
    [
      "japan-guide",
      "japan-guide/my-checklist",
      "japan-guide/culture",
      "japan-guide/role-play",
      ...d.catalog.articles.map((a) => `japan-guide/${a.slug}`),
    ].map((path) => `/${locale}/${path}`),
  ),
  ...d.catalog.articles.flatMap((a) => [
    `/en/japan-guide/${a.slug}/practice`,
    ...(a.deck_id ? [`/en/japan-guide/${a.slug}/vocabulary`] : []),
  ]),
  ...d.roleplays.map((r) => `/en/japan-guide/role-play/${r.slug}`),
];
let count = 0;
for (const path of routes) {
  const r = await fetch(origin + path),
    html = await r.text();
  assert.equal(r.status, 200, path);
  assert(!html.includes("NEXT_HTTP_ERROR_FALLBACK;500"), path);
  if (path.endsWith("/practice")) {
    assert(!html.includes("correctIndex"));
    assert(!html.includes("japaneseExplanation"));
  }
  count++;
}
for (const locale of ["en", "ja"]) {
  const r = await fetch(`${origin}/${locale}/life-in-japan`, {
    redirect: "manual",
  });
  assert([307, 308].includes(r.status));
  assert(r.headers.get("location").endsWith(`/${locale}/japan-guide`));
  count++;
  const admin = await fetch(`${origin}/${locale}/admin/guides`, {
    redirect: "manual",
  });
  assert([303, 307, 308].includes(admin.status));
  assert(admin.headers.get("location").includes("/login"));
  count++;
}
const missing = await fetch(`${origin}/en/japan-guide/not-an-existing-guide`),
  html = await missing.text();
assert(
  missing.status === 404 ||
    (html.includes("NEXT_HTTP_ERROR_FALLBACK;404") && html.includes("noindex")),
);
count++;
console.log(
  `${count} guide, vocabulary, role-play, redirect and guest authorization checks passed.`,
);
