import { describe, it, expect, vi, afterEach } from "vitest";
vi.mock("server-only", () => ({}));
import { defaultSettings, demoScenarios } from "@/lib/ai/scenarios";
import { demoReply } from "@/lib/ai/demo";
import { requestSchema, validateOutput } from "@/lib/ai/schema";
import { tutorInstructions } from "@/lib/ai/provider";
import { aiConfig, estimatedCost } from "@/lib/ai/config";
import en from "../messages/en.json";
import ja from "../messages/ja.json";
afterEach(() => vi.unstubAllEnvs());
describe("text tutor contract", () => {
  const settings = defaultSettings("en"),
    daily = demoScenarios[0],
    business = demoScenarios[2];
  it("has six distinct expandable scenario definitions and settings", () => {
    expect(demoScenarios).toHaveLength(6);
    expect(new Set(demoScenarios.map((s) => s.id)).size).toBe(6);
    expect(settings.target).toBe(5);
    expect(daily.opening).toContain("{今日|きょう}");
  });
  it("bounds input and rejects forged provider fields", () => {
    const request = {
      action: "reply",
      sessionId: crypto.randomUUID(),
      requestId: crypto.randomUUID(),
      text: "こんにちは",
    };
    expect(requestSchema.safeParse(request).success).toBe(true);
    expect(
      requestSchema.safeParse({ ...request, text: "x".repeat(1201) }).success,
    ).toBe(false);
    expect(
      requestSchema.safeParse({ ...request, userId: crypto.randomUUID() })
        .success,
    ).toBe(false);
  });
  it("separates a grammatical error from correct informal Japanese", () => {
    const error = demoReply("昨日、映画を見ますでした。", settings, daily, 1);
    expect(error.category).toBe("grammar");
    expect(error.correction).toBe("昨日、映画を見ました。");
    const casual = demoReply("明日、行くよ。", settings, business, 1);
    expect(casual.category).toBe("register");
    expect(casual.correction).toBeNull();
    expect(casual.polite).toBeTruthy();
    expect(demoReply("明日、行くよ。", settings, daily, 1).category).toBe(
      "correct",
    );
  });
  it("does not pretend to evaluate arbitrary demo input", () => {
    expect(
      demoReply("すごく長い自由な文です。", settings, daily, 1).category,
    ).toBe("unassessed");
    expect(demoReply("hello", settings, daily, 1).category).toBe(
      "non_japanese",
    );
  });
  it("changes scripted sample complexity and live instructions by level", () => {
    expect(demoReply("はい", settings, daily, 1).dialogue).toContain("好き");
    expect(
      demoReply("はい", { ...settings, level: "n2" }, business, 1).dialogue,
    ).toContain("承知");
    expect(tutorInstructions(settings, daily)).toContain("Very simple");
    expect(
      tutorInstructions({ ...settings, level: "n2", locale: "ja" }, business),
    ).toContain("keigo");
  });
  it("validates output and refuses fabricated grammar labels or markup", () => {
    const output = demoReply("明日、行くよ。", settings, business, 1);
    expect(validateOutput(output)).toEqual(output);
    expect(() =>
      validateOutput({ ...output, correction: "明日、伺います。" }),
    ).toThrow();
    expect(() =>
      validateOutput({ ...output, dialogue: "<script>日本語</script>" }),
    ).toThrow();
    expect(() =>
      validateOutput({ ...output, dialogue: "何ですか？どこですか？" }),
    ).toThrow();
    expect(() =>
      validateOutput({
        ...output,
        vocabulary: Array(5).fill({ term: "語", meaning: "word" }),
      }),
    ).toThrow();
  });
  it("defaults off and requires explicit model and both server secrets", () => {
    vi.stubEnv("AI_TUTOR_ENABLED", "false");
    expect(aiConfig().live).toBe(false);
    vi.stubEnv("AI_TUTOR_ENABLED", "true");
    vi.stubEnv("OPENAI_MODEL", "");
    expect(aiConfig().live).toBe(false);
  });
  it("never invents a dollar estimate when rates are absent", () => {
    vi.stubEnv("OPENAI_INPUT_USD_PER_MILLION", "");
    vi.stubEnv("OPENAI_OUTPUT_USD_PER_MILLION", "");
    expect(estimatedCost(1000, 1000)).toBeNull();
    vi.stubEnv("OPENAI_INPUT_USD_PER_MILLION", "2");
    vi.stubEnv("OPENAI_OUTPUT_USD_PER_MILLION", "10");
    expect(estimatedCost(1000, 1000)).toBeCloseTo(0.012);
  });
  it("has matching English and Japanese UI keys", () => {
    const keys = (value: object): string[] =>
      Object.entries(value).flatMap(([k, v]) =>
        typeof v === "object" ? keys(v).map((child) => `${k}.${child}`) : [k],
      );
    expect(keys(en.Ai).sort()).toEqual(keys(ja.Ai).sort());
  });
});
