import fs from "node:fs";
const origin = process.env.NIHONPATH_TEST_ORIGIN ?? "http://localhost:3000";
const content = JSON.parse(
  fs.readFileSync("src/data/study-curriculum.json", "utf8"),
);
const routes = [
  ...["n5", "n4", "n3", "n2", "n1"].flatMap((l) => [
    `/en/courses/${l}`,
    `/en/courses/${l}/flashcards`,
  ]),
  ...content.lessons.map((l) => `/en/lessons/${l.id}`),
  ...content.banks.map((b) => `/en/courses/${b.level}/practice/${b.id}`),
  "/en/courses/n5/grammar-practice",
  "/en/courses/n4/grammar-practice",
  "/ja/courses/n4",
  "/en",
  "/en/login",
  "/en/register",
];
let count = 0;
for (let i = 0; i < routes.length; i += 3) {
  await Promise.all(
    routes.slice(i, i + 3).map(async (path) => {
      const response = await fetch(origin + path);
      const html = await response.text();
      if (response.status !== 200)
        throw Error(`${path}: HTTP ${response.status}`);
      if (path.includes("/practice/") && html.includes("correctIndex"))
        throw Error(`Answer keys leaked: ${path}`);
      if (
        path.includes("/practice/") &&
        html.includes("Verb past plain form + ことがある describes")
      )
        throw Error(`Explanation leaked before submission: ${path}`);
      count++;
    }),
  );
}
for (const path of [
  "/en/dashboard",
  "/en/admin/learning/bank",
  "/en/admin/lesson-preview/" + content.lessons[0].id,
]) {
  const response = await fetch(origin + path);
  const html = await response.text();
  const streamedRedirect = html.includes(
    "NEXT_REDIRECT;replace;/en/login?notice=session;307;",
  );
  if (!response.url.includes("/en/login") && !streamedRedirect)
    throw Error(`Guest access was not redirected: ${path}`);
  count++;
}
console.log(
  `${count} route/guest-access checks passed. Initial quiz responses contain no answer keys or explanations.`,
);
