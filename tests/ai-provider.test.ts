import { beforeEach, afterEach, describe, it, expect, vi } from "vitest";
const mocks = vi.hoisted(() => ({ parse: vi.fn(), options: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("openai", () => ({
  default: class {
    responses = { parse: mocks.parse };
    constructor(options: unknown) {
      mocks.options(options);
    }
  },
}));
import { generateReply } from "@/lib/ai/provider";
import { defaultSettings, demoScenarios } from "@/lib/ai/scenarios";
import { demoReply } from "@/lib/ai/demo";
const settings = defaultSettings("en"),
  scenario = demoScenarios[0];
beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv("AI_TUTOR_ENABLED", "true");
  vi.stubEnv("OPENAI_MODEL", "configured-test-model");
  vi.stubEnv("OPENAI_API_KEY", "test-only-not-a-key");
  vi.stubEnv("SUPABASE_SECRET_KEY", "test-only-not-a-key");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
});
afterEach(() => vi.unstubAllEnvs());
describe("Responses API adapter", () => {
  it("uses explicit model, store false, bounded tokens and timeout, and zero retries", async () => {
    mocks.parse.mockResolvedValue({
      status: "completed",
      output_parsed: demoReply("今日は本を読みました。", settings, scenario, 1),
      usage: { input_tokens: 100, output_tokens: 200 },
    });
    const result = await generateReply(settings, scenario, [
      { role: "assistant", content: scenario.opening },
      { role: "user", content: "今日は本を読みました。" },
    ]);
    expect(mocks.options).toHaveBeenCalledWith(
      expect.objectContaining({ timeout: 25000, maxRetries: 0 }),
    );
    expect(mocks.parse).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "configured-test-model",
        store: false,
        max_output_tokens: 1400,
        text: expect.objectContaining({
          format: expect.objectContaining({
            type: "json_schema",
            strict: true,
          }),
        }),
      }),
    );
    expect(mocks.parse.mock.calls[0][0].input[0].content).toBe(
      "こんにちは。今日は何をしましたか。",
    );
    expect(result.inputTokens).toBe(100);
  });
  it("rejects refusals, truncated replies and invalid parsed output", async () => {
    mocks.parse.mockResolvedValueOnce({
      status: "completed",
      output_parsed: null,
    });
    await expect(generateReply(settings, scenario, [])).rejects.toThrow(
      "AI_INVALID_OUTPUT",
    );
    mocks.parse.mockResolvedValueOnce({
      status: "incomplete",
      output_parsed: {},
    });
    await expect(generateReply(settings, scenario, [])).rejects.toThrow();
    mocks.parse.mockResolvedValueOnce({
      status: "completed",
      output_parsed: { dialogue: "bad output" },
    });
    await expect(generateReply(settings, scenario, [])).rejects.toThrow();
  });
  it("makes no call when disabled", async () => {
    vi.stubEnv("AI_TUTOR_ENABLED", "false");
    await expect(generateReply(settings, scenario, [])).rejects.toThrow(
      "AI_DISABLED",
    );
    expect(mocks.parse).not.toHaveBeenCalled();
  });
  it("rejects oversized context before making a provider request", async () => {
    await expect(
      generateReply(
        settings,
        scenario,
        Array.from({ length: 32 }, () => ({
          role: "user" as const,
          content: "はい",
        })),
      ),
    ).rejects.toThrow("AI_INVALID_CONTEXT");
    await expect(
      generateReply(
        settings,
        { ...scenario, prompt_template: "x".repeat(2001) },
        [],
      ),
    ).rejects.toThrow("AI_INVALID_CONTEXT");
    expect(mocks.parse).not.toHaveBeenCalled();
  });
});
