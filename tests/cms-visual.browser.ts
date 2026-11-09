import { it, expect, vi } from "vitest";
import { createElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import fs from "node:fs";
import { pathToFileURL } from "node:url";
import path from "node:path";
import { chromium } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { cmsWorkspace, referenceSchema } from "@/lib/cms/schema";
vi.mock("@/actions/cms", () => ({
  saveCms: vi.fn(),
  transitionCms: vi.fn(),
  restoreCms: vi.fn(),
}));
vi.mock("@/actions/auth", () => ({ logout: vi.fn() }));
vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children, ...props }: { href: string; children: ReactNode }) =>
    createElement("a", { href, ...props }, children),
  usePathname: () => "/admin/lessons",
  useRouter: () => ({ replace: vi.fn(), refresh: vi.fn(), push: vi.fn() }),
}));
import { CmsShell } from "@/components/cms/shell";
import { CmsEditor } from "@/components/cms/editor";
it("checks the real CMS components at five widths using a clearly labeled disposable DB fixture", async () => {
  const fixture = JSON.parse(
    fs.readFileSync("outputs/task13-cms-visual-fixture.json", "utf8"),
  );
  const workspace = cmsWorkspace.parse(fixture.workspace),
    references = referenceSchema.parse(fixture.references);
  const rendered = renderToStaticMarkup(
    createElement(
      CmsShell,
      {
        email: "editor@example.test",
        role: "content_editor",
        locale: "en",
        reviewCount: 0,
        superAdmin: false,
      },
      createElement(
        "main",
        null,
        createElement("h1", null, "Lesson editor"),
        createElement(CmsEditor, {
          kind: "lesson",
          workspace,
          references,
          permissions: {
            read: true,
            edit: true,
            review: false,
            publish: false,
            users: false,
          },
          history: [],
        }),
      ),
    ),
  );
  const reset =
    "*{box-sizing:border-box}body{margin:0;font-family:Arial,sans-serif}button,input,textarea,select{font:inherit}a{color:inherit;text-decoration:none}.sr-only{position:absolute;width:1px;height:1px;padding:0;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}";
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Disposable CMS visual fixture</title><style>${reset}${fs.readFileSync("src/app/cms.css", "utf8")}</style></head><body><p style="margin:0;padding:12px;background:#142c46;color:#fff;font:16px Arial">DISPOSABLE TEST FIXTURE — static component render; not a signed-in production session.</p>${rendered}</body></html>`;
  const file = path.resolve("outputs/task13-cms-visual-fixture.html");
  fs.writeFileSync(file, html);
  const browser = await chromium.launch({
    headless: true,
    ...(process.platform === "win32" ? { channel: "msedge" } : {}),
  });
  try {
    for (const width of [360, 390, 768, 1024, 1440]) {
      const context = await browser.newContext({
        viewport: { width, height: 1000 },
      });
      const page = await context.newPage();
      await page.goto(pathToFileURL(file).href);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      const axe = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
        .analyze();
      fs.writeFileSync(
        `outputs/task13-admin-axe-${width}.json`,
        JSON.stringify(axe.violations, null, 2),
      );
      expect(
        axe.violations.filter((v) =>
          ["critical", "serious"].includes(v.impact ?? ""),
        ),
      ).toEqual([]);
      if (width === 390 || width === 1440)
        await page.screenshot({
          path: `outputs/task13-admin-${width}.png`,
          fullPage: false,
        });
      await context.close();
    }
  } finally {
    await browser.close();
  }
});
