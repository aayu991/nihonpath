import assert from "node:assert/strict";
import { spawn } from "node:child_process";
const origin = process.env.NIHONPATH_TEST_ORIGIN ?? "http://localhost:3000";
let server;
try {
  if (process.argv.includes("--start")) {
    server = spawn(
      process.execPath,
      ["node_modules/next/dist/bin/next", "start", "--port", "3000"],
      { stdio: "ignore", windowsHide: true },
    );
    for (let i = 0; i < 60; i++) {
      try {
        if ((await fetch(`${origin}/api/health`)).ok) break;
      } catch {}
      await new Promise((r) => setTimeout(r, 1000));
    }
  }
  let n = 0;
  for (const locale of ["en", "ja", "ne", "hi"]) {
    for (const path of [
      "",
      "/courses",
      "/courses/n5",
      "/jft-basic",
      "/ssw",
      "/tutors",
      "/japan-guide",
      "/pricing",
      "/help",
      "/help/faq",
      "/contact",
      "/legal/privacy",
    ]) {
      const r = await fetch(`${origin}/${locale}${path}`),
        html = await r.text();
      assert.equal(r.status, 200, path);
      assert(html.includes(`lang="${locale}"`), path);
      assert(html.includes("<h1"), path);
      assert(r.headers.get("x-content-type-options") === "nosniff");
      assert(r.headers.get("x-robots-tag")?.includes("noindex"));
      n++;
    }
    for (const path of [
      "dashboard",
      "admin/operations",
      "billing",
      "tutor/dashboard",
      "organization",
    ]) {
      const r = await fetch(`${origin}/${locale}/${path}`, {
          redirect: "manual",
        }),
        html = await r.text();
      assert(
        (r.status >= 300 &&
          r.status < 400 &&
          r.headers.get("location")?.includes("/login")) ||
          (html.includes("NEXT_REDIRECT") && html.includes("/login")),
        path,
      );
      n++;
    }
  }
  const robots = await (await fetch(`${origin}/robots.txt`)).text();
  assert(robots.includes("Disallow: /"));
  const sitemap = await (await fetch(`${origin}/sitemap.xml`)).text();
  assert(
    !sitemap.includes("<loc>"),
    "Unapproved deployments must have an empty sitemap",
  );
  const health = await fetch(`${origin}/api/health`);
  assert.equal(health.status, 200);
  const ready = await fetch(`${origin}/api/health/ready`);
  assert.equal(ready.status, 403);
  const unknown = await fetch(`${origin}/en/not-a-real-page`),
    body = await unknown.text();
  assert(
    unknown.status === 404 ||
      (body.includes("NEXT_HTTP_ERROR_FALLBACK;404") &&
        body.includes("noindex")),
  );
  const card = await fetch(`${origin}/social-card.png`);
  assert(card.headers.get("content-type")?.startsWith("image/png"));
  assert((await card.arrayBuffer()).byteLength > 1000);
  console.log(
    `${n + 6} launch HTTP/security/SEO checks passed. Hosted sign-in, payment and email acceptance are separate external gates.`,
  );
} finally {
  if (server) server.kill();
}
