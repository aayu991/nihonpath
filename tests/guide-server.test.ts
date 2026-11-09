import { beforeEach, afterEach, describe, it, expect, vi } from "vitest";
const mocks = vi.hoisted(() => ({ client: vi.fn(), rpc: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("react", () => ({ cache: (fn: unknown) => fn }));
vi.mock("@/lib/supabase/server", () => ({ createClient: mocks.client }));
vi.mock("@/lib/auth/session", () => ({ getCurrentUser: vi.fn() }));
import { loadGuides } from "@/lib/guides/server";
beforeEach(() => {
  vi.resetAllMocks();
  mocks.client.mockResolvedValue({ rpc: mocks.rpc });
});
afterEach(() => vi.unstubAllEnvs());
describe("guide publication fallback", () => {
  it("provides clearly identified local development drafts when the schema is unavailable", async () => {
    vi.stubEnv("NODE_ENV", "development");
    mocks.rpc.mockResolvedValue({ error: { message: "missing schema" } });
    const result = await loadGuides();
    expect(result.demo).toBe(true);
    expect(result.catalog.articles).toHaveLength(18);
  });
  it("never publishes bundled unreviewed guidance as a production fallback", async () => {
    vi.stubEnv("NODE_ENV", "production");
    mocks.rpc.mockResolvedValue({ error: { message: "missing schema" } });
    const result = await loadGuides();
    expect(result.catalog.articles).toHaveLength(0);
    expect(result.catalog.items).toHaveLength(0);
  });
  it("preserves a valid empty deployed catalog without replacing unpublished content", async () => {
    vi.stubEnv("NODE_ENV", "development");
    mocks.rpc.mockResolvedValue({
      error: null,
      data: {
        categories: [],
        articles: [],
        translations: [],
        sources: [],
        templates: [],
        items: [],
      },
    });
    const result = await loadGuides();
    expect(result.demo).toBe(false);
    expect(result.catalog.articles).toHaveLength(0);
  });
});
