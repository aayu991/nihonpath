import assert from "node:assert/strict";
import en from "../messages/en.json" with { type: "json" };
import ja from "../messages/ja.json" with { type: "json" };
import ne from "../messages/ne.json" with { type: "json" };
import hi from "../messages/hi.json" with { type: "json" };
const origin = process.env.NIHONPATH_TEST_ORIGIN ?? "http://localhost:3000";
let count = 0;
for (const [locale, messages] of Object.entries({ en, ja, ne, hi })) {
  for (const path of ["organizations", "organizations/onboarding"]) {
    const response = await fetch(`${origin}/${locale}/${path}`, {
      signal: AbortSignal.timeout(90000),
    });
    const html = await response.text();
    assert.equal(response.status, 200, `${locale}/${path}`);
    assert(html.includes(`lang="${locale}"`));
    assert(
      html.includes(
        path.endsWith("onboarding")
          ? messages.Organization.onboarding
          : messages.Organization.intro,
      ),
    );
    count++;
  }
  for (const path of [
    "organizations/register",
    ...[
      "dashboard",
      "learners",
      "classes",
      "attendance",
      "assignments",
      "teacher",
      "employer",
      "reports",
      "settings",
    ].map((v) => "organization/" + v),
  ]) {
    const response = await fetch(`${origin}/${locale}/${path}`, {
      redirect: "manual",
      signal: AbortSignal.timeout(90000),
    });
    const html = await response.text();
    if ([303, 307, 308].includes(response.status))
      assert(
        response.headers.get("location").includes(`/${locale}/login`),
        path,
      );
    else {
      assert.equal(response.status, 200, path);
      assert(
        html.includes("NEXT_REDIRECT") && html.includes(`/${locale}/login`),
        path,
      );
    }
    assert(!html.includes('"token_hash"'));
    count++;
  }
}
console.log(
  `${count} organization public/localization and signed-out access checks passed.`,
);
