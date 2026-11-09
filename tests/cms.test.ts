import { describe, it, expect, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import sharp from "sharp";
import { parseVocabularyCsv, vocabularyCsvColumns } from "@/lib/cms/csv";
import { parseCmsDocument, cmsRoles, seoSchema } from "@/lib/cms/schema";
import { inspectMedia, mediaLimit } from "@/lib/cms/media-validation";
import { normalizeMedia } from "@/lib/cms/media-normalize";
import { RichText } from "@/components/cms/rich-text";
vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
import { applyCmsSeo } from "@/lib/cms/seo";
const course = "e1000000-0000-4000-8000-000000000001";
const line =
  "水,みず,water,飲むための液体。,{水|みず}を飲みます。,I drink water.,Everyday";
const csv = vocabularyCsvColumns.join(",") + "\n" + line;
describe("CMS content validation", () => {
  it("editorial search visibility cannot override a closed global indexing gate", () => {
    const meta = applyCmsSeo(
      { robots: { index: false, follow: true } },
      {
        index: true,
        title: "Reviewed title",
        canonical: "https://nihonpath.org/en/courses/n5",
      },
    );
    expect(meta.robots).toMatchObject({ index: false });
    expect(meta.title).toBe("Reviewed title");
  });
  it("an explicit content noindex setting remains closed on an approved site", () => {
    expect(
      applyCmsSeo({ robots: { index: true, follow: true } }, { index: false })
        .robots,
    ).toMatchObject({ index: false });
  });
  it("supports four separate editorial roles without public role fields", () => {
    expect(cmsRoles).toEqual([
      "super_admin",
      "content_admin",
      "content_editor",
      "content_reviewer",
    ]);
    const p = parseCmsDocument("course", {
      title: "N5",
      slug: "n5",
      program_id: null,
      role: "super_admin",
    });
    expect(p.success).toBe(true);
    if (p.success) expect(p.data).not.toHaveProperty("role");
  });
  it("accepts empty canonical defaults and rejects foreign or credential-bearing canonicals", () => {
    expect(seoSchema.safeParse({ canonical: "" }).success).toBe(true);
    for (const canonical of [
      "https://evil.example/",
      "https://nihonpath.org.evil.example/",
      "https://user:password@nihonpath.org/",
    ])
      expect(seoSchema.safeParse({ canonical }).success).toBe(false);
  });
  it("renders Japanese ruby and treats executable markup as inert text", () => {
    const html = renderToStaticMarkup(
      createElement(RichText, {
        blocks: [
          {
            type: "paragraph",
            text: "{日本|にほん} <script>alert(1)</script>",
          },
        ],
      }),
    );
    expect(html).toContain("<ruby>");
    expect(html).toContain("&lt;script&gt;");
    expect(html).not.toContain("<script>");
  });
  it("keeps rich blocks and bilingual examples in the typed lesson document", () => {
    const p = parseCmsDocument("lesson", {
      title: "Grammar draft",
      slug: "grammar-draft",
      course_id: course,
      module_id: null,
      position: 3,
      subject: "grammar",
      body: { richText: [{ type: "heading", text: "文法" }], examples: [] },
      seo: { canonical: "" },
    });
    expect(p.success).toBe(true);
  });
});
describe("CSV vocabulary import", () => {
  it("validates UTF-8/BOM and Japanese fields without publishing", () => {
    const rows = parseVocabularyCsv("\uFEFF" + csv, course);
    expect(rows).toHaveLength(1);
    expect(rows[0].term).toBe("水");
    expect(rows[0]).not.toHaveProperty("published");
  });
  it("supports quoted commas and multiline explanations", () => {
    const text =
      vocabularyCsvColumns.join(",") +
      '\r\n水,みず,"water,\nfresh water",飲むための液体。,{水|みず}を飲みます。,I drink water.,Everyday';
    expect(parseVocabularyCsv(text, course)[0].meaning_en).toBe(
      "water,\nfresh water",
    );
  });
  it("rejects duplicate rows and invalid reading/header/quote structures", () => {
    for (const text of [
      csv + "\n" + line,
      csv.replace(",みず,", ",water,"),
      csv.replace("term,", "spelling,"),
      csv + '\n"unclosed',
    ])
      expect(() => parseVocabularyCsv(text, course)).toThrow();
  });
  it("enforces bounded imports", () => {
    expect(() =>
      parseVocabularyCsv(
        vocabularyCsvColumns.join(",") +
          "\n" +
          Array(201).fill(line).join("\n"),
        course,
      ),
    ).toThrow();
    expect(() => parseVocabularyCsv("x".repeat(250001), course)).toThrow();
  });
});
describe("media upload validation", () => {
  it("rejects executable, SVG, HTML and oversize content regardless of extension", () => {
    for (const text of [
      "MZexecutable",
      '<svg onload="alert(1)"></svg>',
      "<html>unsafe</html>",
    ])
      expect(() => inspectMedia(new TextEncoder().encode(text))).toThrow();
    expect(() => inspectMedia(new Uint8Array(mediaLimit + 1))).toThrow();
  });
  it("rejects active PDFs and detects passive PDF signature", () => {
    expect(() =>
      inspectMedia(
        new TextEncoder().encode("%PDF-1.7 /OpenAction /JavaScript"),
      ),
    ).toThrow();
    expect(
      inspectMedia(new TextEncoder().encode("%PDF-1.7\npassive fixture")).mime,
    ).toBe("application/pdf");
  });
  it("fully decodes and normalizes an actual image, bounding dimensions", async () => {
    const source = await sharp({
      create: { width: 2500, height: 20, channels: 3, background: "#ffffff" },
    })
      .png()
      .toBuffer();
    const output = await normalizeMedia(source);
    expect(output.mime).toBe("image/png");
    const m = await sharp(output.bytes).metadata();
    expect(m.width).toBe(2400);
    expect(m.height).toBeLessThanOrEqual(20);
  });
  it("rejects a forged PNG header with no decodable pixels", async () => {
    const forged = new Uint8Array(32);
    forged.set([137, 80, 78, 71, 13, 10, 26, 10]);
    await expect(normalizeMedia(forged)).rejects.toThrow();
  });
});
