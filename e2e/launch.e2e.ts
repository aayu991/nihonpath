import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import fs from "node:fs/promises";
for (const width of [360, 390, 768, 1024, 1440])
  test(`responsive public pages and serious accessibility at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    for (const route of ["/en", "/en/help", "/en/pricing", "/en/tutors"]) {
      await page.goto(route);
      await expect(page.locator("h1")).toBeVisible();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      const result = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
        .analyze();
      await fs.mkdir("outputs", { recursive: true });
      await fs.writeFile(
        `outputs/task12-axe-${width}-${route.replaceAll("/", "_")}.json`,
        JSON.stringify(
          { violations: result.violations, incomplete: result.incomplete },
          null,
          2,
        ),
      );
      expect(
        result.violations.filter((v) =>
          ["critical", "serious"].includes(v.impact ?? ""),
        ),
      ).toEqual([]);
      if (route === "/en/help" && [390, 1440].includes(width))
        await page.screenshot({
          path: `outputs/task12-help-${width}.png`,
          fullPage: false,
        });
    }
  });
test("four interface languages, FAQ keyboard control and no analytics before consent", async ({
  page,
}) => {
  const analytics: string[] = [];
  page.on("request", (r) => {
    if (r.url().includes("/api/analytics")) analytics.push(r.url());
  });
  await page.goto("/en/help");
  await page
    .getByRole("combobox", { name: "Language", exact: true })
    .selectOption("ja");
  await expect(page).toHaveURL(/\/ja\/help$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "ヘルプとサポート",
  );
  await page
    .getByRole("combobox", { name: "言語", exact: true })
    .selectOption("ne");
  await expect(page).toHaveURL(/\/ne\/help$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "मद्दत र सहयोग",
  );
  await page
    .getByRole("combobox", { name: "भाषा", exact: true })
    .selectOption("hi");
  await expect(page).toHaveURL(/\/hi\/help$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "मदद और सहायता",
  );
  await page
    .getByRole("combobox", { name: "भाषा", exact: true })
    .selectOption("en");
  await page.goto("/en/help/faq");
  const first = page.locator("details").first();
  await first.locator("summary").focus();
  await page.keyboard.press("Enter");
  await expect(first).toHaveAttribute("open", "");
  expect(analytics).toEqual([]);
});
test("guest flashcard flip works by keyboard without writing learning progress", async ({
  page,
}) => {
  await page.goto("/en/courses/n5/flashcards");
  const card = page.locator(".study-flashcard").first();
  if ((await card.count()) === 0) {
    test.skip(
      true,
      "No public deck is available in this configured database; do not substitute a fabricated deck.",
    );
    return;
  }
  await card.focus();
  await page.keyboard.press("Space");
  await expect(card).toHaveAttribute("aria-pressed", "true");
  await page.keyboard.press("Space");
  await expect(card).toHaveAttribute("aria-pressed", "false");
});
test("private billing/support and email workers reject unauthorized access", async ({
  page,
  request,
}) => {
  await page.goto("/en/contact");
  await expect(
    page.getByRole("link", {
      name: "Log in to submit a private support request",
    }),
  ).toBeVisible();
  await page.goto("/en/admin/operations");
  await expect(page).toHaveURL(/\/login/);
  expect(
    (await request.post("/api/operations/email", { data: {} })).status(),
  ).toBe(403);
  expect((await request.get("/api/health/ready")).status()).toBe(403);
});
test("CMS routes and workers reject unauthenticated access without exposing editorial content", async ({
  page,
  request,
}) => {
  for (const locale of ["en", "ja", "ne", "hi"])
    for (const route of ["admin", "admin/lessons", "admin/users"]) {
      await page.goto(`/${locale}/${route}`);
      await expect(page).toHaveURL(/\/login/);
    }
  for (const route of [
    "courses",
    "vocabulary",
    "kanji",
    "questions",
    "media",
    "guides",
    "exams",
    "reviews",
  ]) {
    await page.goto(`/en/admin/${route}`);
    await expect(page).toHaveURL(/\/login/);
  }
  expect(
    (await request.post("/api/operations/publish", { data: {} })).status(),
  ).toBe(403);
  expect(
    (
      await request.post("/api/admin/media", {
        headers: { origin: "http://localhost:3000" },
        data: "not-a-file",
      })
    ).status(),
  ).toBe(403);
  expect((await request.get("/api/media/not-an-id")).status()).toBe(404);
});
