import { beforeEach, describe, it, expect, vi } from "vitest";
import { NextRequest } from "next/server";
const mocks = vi.hoisted(() => ({
  user: vi.fn(),
  client: vi.fn(),
  service: vi.fn(),
  catalog: vi.fn(),
  snapshot: vi.fn(),
  config: vi.fn(),
  generate: vi.fn(),
  rpc: vi.fn(),
}));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/auth/session", () => ({ getCurrentUser: mocks.user }));
vi.mock("@/lib/supabase/server", () => ({ createClient: mocks.client }));
vi.mock("@/lib/ai/server", () => ({
  aiService: mocks.service,
  loadScenarios: mocks.catalog,
  snapshot: mocks.snapshot,
}));
vi.mock("@/lib/ai/config", () => ({
  aiConfig: mocks.config,
  estimatedCost: () => null,
}));
vi.mock("@/lib/ai/provider", () => ({ generateReply: mocks.generate }));
import { GET, POST } from "@/app/api/ai/route";
import { defaultSettings, demoScenarios } from "@/lib/ai/scenarios";
import { demoReply } from "@/lib/ai/demo";
const session = crypto.randomUUID(),
  user = crypto.randomUUID(),
  requestId = crypto.randomUUID(),
  settings = defaultSettings("en");
const body = {
  action: "reply",
  sessionId: session,
  requestId,
  text: "今日は本を読みました。",
};
const snapshot = {
  session: {
    id: session,
    scenario_id: demoScenarios[0].id,
    settings,
    status: "active",
    completed_turns: 0,
    created_at: "2026-10-24",
  },
  messages: [{ role: "assistant", content: "こんにちは。", turn: 0 }],
  feedback: [],
};
const req = (data: unknown, origin = "http://localhost:3000") =>
  new NextRequest("http://localhost:3000/api/ai", {
    method: "POST",
    headers: { origin, "content-type": "application/json" },
    body: JSON.stringify(data),
  });
beforeEach(() => {
  vi.resetAllMocks();
  mocks.user.mockResolvedValue({ id: user });
  mocks.client.mockResolvedValue({ rpc: mocks.rpc });
  mocks.service.mockReturnValue({ rpc: mocks.rpc });
  mocks.config.mockReturnValue({ live: true, model: "test-model" });
  mocks.catalog.mockResolvedValue({ database: true, scenarios: demoScenarios });
  mocks.snapshot.mockResolvedValue(snapshot);
  mocks.rpc.mockResolvedValue({ data: { replay: false }, error: null });
  mocks.generate.mockResolvedValue({
    output: demoReply(body.text, settings, demoScenarios[0], 1),
    inputTokens: 50,
    outputTokens: 100,
  });
});
describe("AI route security and failures", () => {
  it("requires sign-in on history and generation", async () => {
    mocks.user.mockResolvedValue(null);
    expect(
      (await GET(new NextRequest("http://localhost:3000/api/ai"))).status,
    ).toBe(401);
    expect((await POST(req(body))).status).toBe(401);
    expect(mocks.generate).not.toHaveBeenCalled();
  });
  it("rejects cross-origin and absent-origin mutations", async () => {
    expect((await POST(req(body, "https://attacker.test"))).status).toBe(403);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it("rejects oversized, forged and malformed input before reservation", async () => {
    expect((await POST(req({ ...body, text: "x".repeat(9000) }))).status).toBe(
      400,
    );
    expect((await POST(req({ ...body, userId: user }))).status).toBe(400);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it("honors the provider kill switch", async () => {
    mocks.config.mockReturnValue({ live: false });
    expect((await POST(req(body))).status).toBe(503);
    expect(mocks.generate).not.toHaveBeenCalled();
  });
  it("returns not found for a session hidden by ownership policies", async () => {
    mocks.snapshot.mockResolvedValue(null);
    expect((await POST(req(body))).status).toBe(404);
    expect(mocks.service).toHaveBeenCalledTimes(1);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it("uses verified owner identity and server context rather than client history", async () => {
    const response = await POST(req(body));
    expect(response.status).toBe(200);
    expect(mocks.rpc).toHaveBeenCalledWith(
      "ai_reserve",
      expect.objectContaining({
        p_user: user,
        p_text: body.text,
        p_model: "test-model",
      }),
    );
    expect(mocks.generate).toHaveBeenCalledWith(settings, demoScenarios[0], [
      { role: "assistant", content: "こんにちは。", turn: 0 },
      { role: "user", content: body.text },
    ]);
    expect(mocks.rpc).toHaveBeenCalledWith(
      "ai_finish",
      expect.objectContaining({
        p_user: user,
        p_input_tokens: 50,
        p_output_tokens: 100,
      }),
    );
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
  });
  it("never calls the provider when reservation is a replay or quota rejection", async () => {
    mocks.rpc.mockResolvedValueOnce({ data: { replay: true }, error: null });
    expect((await POST(req(body))).status).toBe(200);
    expect(mocks.generate).not.toHaveBeenCalled();
    mocks.rpc.mockResolvedValueOnce({
      data: null,
      error: { message: "Quota exceeded" },
    });
    const result = await POST(req(body));
    expect(result.status).toBe(429);
    expect(result.headers.get("Retry-After")).toBe("60");
    expect(mocks.generate).not.toHaveBeenCalled();
  });
  it("releases failed requests and never exposes provider secrets or raw errors", async () => {
    mocks.generate.mockRejectedValue(
      new Error("private key and provider detail"),
    );
    const response = await POST(req(body));
    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({ error: "provider_failed" });
    expect(mocks.rpc).toHaveBeenCalledWith(
      "ai_finish",
      expect.objectContaining({ p_output: null, p_cost: null }),
    );
  });
  it("allows owner preferences without invoking a paid provider", async () => {
    expect((await POST(req({ action: "settings", settings }))).status).toBe(
      200,
    );
    expect(mocks.rpc).toHaveBeenCalledWith("ai_save_settings", {
      p_settings: settings,
    });
    expect(mocks.generate).not.toHaveBeenCalled();
  });
});
