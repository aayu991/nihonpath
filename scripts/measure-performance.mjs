import fs from "node:fs";
import { spawn } from "node:child_process";
const origin = process.env.NIHONPATH_TEST_ORIGIN ?? "http://localhost:3000";
const chrome =
  process.env.CHROME_PATH ??
  (process.platform === "win32"
    ? "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe"
    : undefined);
for (const mode of ["mobile", "desktop"]) {
  const target = `outputs/task12-lighthouse-${mode}`;
  const args = [
    "node_modules/lighthouse/cli/index.js",
    `${origin}/en`,
    "--output=json",
    "--output=html",
    `--output-path=${target}`,
    "--chrome-flags=--headless --no-first-run --disable-extensions",
    "--only-categories=performance,accessibility,best-practices,seo",
    "--quiet",
    ...(mode === "desktop" ? ["--preset=desktop"] : []),
  ];
  const exit = await new Promise((resolve, reject) => {
    const p = spawn(process.execPath, args, {
      stdio: "inherit",
      windowsHide: true,
      env: { ...process.env, ...(chrome ? { CHROME_PATH: chrome } : {}) },
    });
    p.on("error", reject);
    p.on("close", resolve);
  });
  if (exit !== 0) throw new Error(`Lighthouse ${mode} failed`);
  const r = JSON.parse(fs.readFileSync(`${target}.report.json`, "utf8"));
  console.log(
    JSON.stringify({
      mode,
      scores: Object.fromEntries(
        Object.entries(r.categories).map(([k, v]) => [k, v.score]),
      ),
      LCP: r.audits["largest-contentful-paint"].numericValue,
      CLS: r.audits["cumulative-layout-shift"].numericValue,
      TBT: r.audits["total-blocking-time"].numericValue,
      INP: "Requires real interactions/field data; not measured by navigation Lighthouse.",
    }),
  );
}
