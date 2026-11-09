import assert from "node:assert/strict";
import en from "../messages/en.json" with { type: "json" };
import ja from "../messages/ja.json" with { type: "json" };
import ne from "../messages/ne.json" with { type: "json" };
import hi from "../messages/hi.json" with { type: "json" };
const origin = process.env.NIHONPATH_TEST_ORIGIN ?? "http://localhost:3000";
let count = 0;
for (const [locale, m] of Object.entries({ en, ja, ne, hi })) {
  for (const path of ["tutors", "become-a-tutor"]) {
    const r = await fetch(`${origin}/${locale}/${path}`, {
        signal: AbortSignal.timeout(90000),
      }),
      html = await r.text();
    assert.equal(r.status, 200, path);
    assert(html.includes(`lang="${locale}"`));
    assert(html.includes(m.Tutor[path === "tutors" ? "title" : "become"]));
    assert(html.includes(m.Tutor.paidUnavailable));
    assert(!html.includes("Local fixture tutor"));
    count++;
  }
  for (const path of [
    "tutor/application",
    "tutor/dashboard",
    "tutor/availability",
    "dashboard/lessons",
    "admin/tutors",
  ]) {
    const r = await fetch(`${origin}/${locale}/${path}`, {
        redirect: "manual",
        signal: AbortSignal.timeout(90000),
      }),
      html = await r.text();
    if ([303, 307, 308].includes(r.status))
      assert(r.headers.get("location").includes(`/${locale}/login`), path);
    else {
      assert.equal(r.status, 200, path);
      assert(
        html.includes("NEXT_REDIRECT") && html.includes(`/${locale}/login`),
        path,
      );
    }
    count++;
  }
  for (const path of [
    "tutors/not-a-real-profile",
    "tutors/not-a-real-profile/book",
  ]) {
    const r = await fetch(`${origin}/${locale}/${path}`, {
        signal: AbortSignal.timeout(90000),
      }),
      html = await r.text();
    assert(
      r.status === 404 ||
        (html.includes("NEXT_HTTP_ERROR_FALLBACK;404") &&
          html.includes("noindex")),
      path,
    );
    count++;
  }
}
console.log(
  `${count} tutor public/localization, missing-profile and signed-out authorization checks passed.`,
);
