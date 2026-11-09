import { describe, it, expect } from "vitest";
import {
  categoryKeys,
  goalKeys,
  recommendCategories,
} from "../src/lib/platform/catalog";
import { goalsSchema, contentSchemas } from "../src/lib/platform/validation";
import en from "../messages/en.json";
import ja from "../messages/ja.json";
describe("platform taxonomy and recommendations", () => {
  it("has eight unique public sections and ten non-privileged learning goals", () => {
    expect(categoryKeys).toHaveLength(8);
    expect(new Set(categoryKeys).size).toBe(8);
    expect(goalKeys).toHaveLength(10);
    expect(recommendCategories(["organization_admin"])).toEqual([
      "organizations",
    ]);
  });
  it("deduplicates goals and recommended paths with deterministic ranking", () => {
    const result = recommendCategories(["student", "jlpt", "student"]);
    expect(result).toEqual(recommendCategories(["student", "jlpt"]));
    expect(result[0]).toBe("learn");
    expect(new Set(result).size).toBe(result.length);
    expect(result.length).toBeLessThanOrEqual(4);
  });
  it("supports combinations for work and travel without inventing authorization", () => {
    expect(recommendCategories(["future_worker", "professional"])).toContain(
      "ssw",
    );
    expect(recommendCategories(["tourist"])).toContain("life-in-japan");
    expect(recommendCategories([])).toEqual([]);
  });
  it("rejects empty, duplicate and unknown goal preferences", () => {
    expect(goalsSchema.safeParse([]).success).toBe(false);
    expect(goalsSchema.safeParse(["root"]).success).toBe(false);
    expect(goalsSchema.safeParse(["student", "student"]).success).toBe(false);
    expect(
      goalsSchema.safeParse(["teacher", "organization_admin"]).success,
    ).toBe(true);
  });
});
describe("content input contracts", () => {
  it("requires a valid slug and taxonomy for programs", () => {
    expect(
      contentSchemas.program.safeParse({
        slug: "path",
        title: "A path",
        summary: "",
        category: "learn",
      }).success,
    ).toBe(true);
    expect(
      contentSchemas.program.safeParse({
        slug: "../../admin",
        title: "A path",
        summary: "",
        category: "unknown",
      }).success,
    ).toBe(false);
  });
  it("accepts structured examples but rejects invalid JSON and unconnected learning blocks", () => {
    const base = {
      lesson_id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      kind: "example",
      position: 0,
      content: '{"text":"{日本語|にほんご}"}',
      deck_id: "",
      question_bank_id: "",
      audio_asset_id: "",
    };
    expect(contentSchemas.block.safeParse(base).success).toBe(true);
    expect(
      contentSchemas.block.safeParse({ ...base, content: "not json" }).success,
    ).toBe(false);
    expect(
      contentSchemas.block.safeParse({ ...base, kind: "audio" }).success,
    ).toBe(false);
    expect(
      contentSchemas.block.safeParse({ ...base, kind: "quiz" }).success,
    ).toBe(false);
  });
  it("keeps privilege and publication fields out of form contracts", () => {
    const data = contentSchemas.program.parse({
      slug: "path",
      title: "A path",
      summary: "",
      category: "learn",
      published: true,
      review_status: "approved",
      is_admin: true,
    });
    expect(data).not.toHaveProperty("published");
    expect(data).not.toHaveProperty("review_status");
    expect(data).not.toHaveProperty("is_admin");
  });
});
function keys(value: unknown, prefix = ""): string[] {
  if (!value || typeof value !== "object" || Array.isArray(value))
    return [prefix];
  return Object.entries(value).flatMap(([key, child]) =>
    keys(child, `${prefix}.${key}`),
  );
}
it("provides English and Japanese translations for every platform key", () => {
  expect(keys(en.Platform).sort()).toEqual(keys(ja.Platform).sort());
  for (const key of categoryKeys) {
    expect(en.Platform.categories[key].label.length).toBeGreaterThan(0);
    expect(ja.Platform.categories[key].label.length).toBeGreaterThan(0);
  }
});
