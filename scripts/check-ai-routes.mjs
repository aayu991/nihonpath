import assert from "node:assert/strict";
const origin = process.env.NIHONPATH_TEST_ORIGIN ?? "http://localhost:3000";
let count = 0;
for (const [locale, title] of [
  ["en", "A little conversation"],
  ["ja", "一言ずつ"],
]) {
  const response = await fetch(`${origin}/${locale}/ai-practice`),
    html = await response.text();
  assert.equal(response.status, 200);
  assert(html.includes(title));
  assert(html.includes("d7010000-0000-4000-8000-000000000006"));
  assert(!html.includes("OPENAI_API_KEY"));
  count++;
}
const read = await fetch(`${origin}/api/ai`);
assert.equal(read.status, 401);
assert.match(read.headers.get("cache-control"), /no-store/);
count++;
for (const foreign of [false, true]) {
  const response = await fetch(`${origin}/api/ai`, {
    method: "POST",
    headers: {
      origin: foreign ? "https://attacker.test" : origin,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      action: "reply",
      sessionId: crypto.randomUUID(),
      requestId: crypto.randomUUID(),
      text: "こんにちは。",
    }),
  });
  assert.equal(response.status, foreign ? 403 : 401);
  count++;
}
console.log(
  `${count} AI route and unauthenticated security checks passed; no live provider calls.`,
);
