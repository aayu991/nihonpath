import { NextRequest } from "next/server";
import OpenAI from "openai";
import { getCurrentUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { aiService, loadScenarios, snapshot } from "@/lib/ai/server";
import { aiConfig, estimatedCost } from "@/lib/ai/config";
import { requestSchema, settingsSchema } from "@/lib/ai/schema";
import { generateReply } from "@/lib/ai/provider";
import { z } from "zod";
export const runtime = "nodejs";
export const maxDuration = 40;
const headers = {
  "Cache-Control": "private, no-store",
  "X-Content-Type-Options": "nosniff",
};
function json(data: unknown, status = 200) {
  return Response.json(data, { status, headers });
}
function failure(error: unknown) {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === "object" && error && "message" in error
        ? String(error.message)
        : "";
  if (/Quota|Session limit/.test(message))
    return Response.json(
      { error: "quota" },
      { status: 429, headers: { ...headers, "Retry-After": "60" } },
    );
  if (/pending|already attempted|Invalid retry/.test(message))
    return json({ error: "pending" }, 409);
  if (/Session ended/.test(message)) return json({ error: "ended" }, 409);
  if (error instanceof OpenAI.RateLimitError)
    return json({ error: "provider_busy" }, 429);
  if (error instanceof OpenAI.APIConnectionTimeoutError)
    return json({ error: "timeout" }, 504);
  if (/unavailable/.test(message)) return json({ error: "unavailable" }, 503);
  return json({ error: "provider_failed" }, 502);
}
export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return json({ error: "sign_in" }, 401);
  try {
    const id = request.nextUrl.searchParams.get("session");
    if (id) {
      if (!z.uuid().safeParse(id).success)
        return json({ error: "invalid" }, 400);
      const data = await snapshot(id);
      return data ? json(data) : json({ error: "not_found" }, 404);
    }
    const client = await createClient();
    if (!client) return json({ error: "unavailable" }, 503);
    const [sessions, settings, usage] = await Promise.all([
      client
        .from("ai_sessions")
        .select("id,scenario_id,settings,status,completed_turns,created_at")
        .order("created_at", { ascending: false })
        .limit(30),
      client
        .from("ai_user_settings")
        .select("settings")
        .eq("user_id", user.id)
        .maybeSingle(),
      client
        .from("ai_usage")
        .select("input_tokens,output_tokens,estimated_cost_usd,status")
        .gte(
          "created_at",
          new Date().toISOString().slice(0, 10) + "T00:00:00Z",
        ),
    ]);
    if (sessions.error || settings.error || usage.error)
      return json({ error: "unavailable" }, 503);
    return json({
      sessions: sessions.data,
      settings: settingsSchema.safeParse(settings.data?.settings).data ?? null,
      usage: {
        requests: usage.data.length,
        inputTokens: usage.data.reduce((n, r) => n + r.input_tokens, 0),
        outputTokens: usage.data.reduce((n, r) => n + r.output_tokens, 0),
        unknownRequests: usage.data.filter((r) => r.status !== "succeeded")
          .length,
        estimatedCost: usage.data.every((r) => r.estimated_cost_usd !== null)
          ? usage.data.reduce((n, r) => n + Number(r.estimated_cost_usd), 0)
          : null,
      },
    });
  } catch (error) {
    return failure(error);
  }
}
async function boundedBody(request: Request) {
  if (!request.headers.get("content-type")?.startsWith("application/json"))
    throw new Error("INVALID_BODY");
  const reader = request.body?.getReader();
  if (!reader) throw new Error("INVALID_BODY");
  let length = 0;
  const chunks: Uint8Array[] = [];
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      length += value.length;
      if (length > 8000) {
        await reader.cancel();
        throw new Error("INVALID_BODY");
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.length;
  }
  return JSON.parse(new TextDecoder().decode(bytes));
}
export async function POST(request: NextRequest) {
  // Cookie-authenticated mutations require an exact same-origin browser request.
  if (request.headers.get("origin") !== request.nextUrl.origin)
    return json({ error: "origin" }, 403);
  const user = await getCurrentUser();
  if (!user) return json({ error: "sign_in" }, 401);
  let body: z.infer<typeof requestSchema>;
  try {
    body = requestSchema.parse(await boundedBody(request));
  } catch {
    return json({ error: "invalid" }, 400);
  }
  const client = await createClient();
  if (!client) return json({ error: "unavailable" }, 503);
  try {
    if (body.action === "delete") {
      const { error } = await client
        .from("ai_sessions")
        .delete()
        .eq("id", body.sessionId)
        .eq("user_id", user.id);
      if (error) throw error;
      return json({ ok: true });
    }
    if (body.action === "settings") {
      const { error } = await client.rpc("ai_save_settings", {
        p_settings: body.settings,
      });
      if (error) throw error;
      return json({ ok: true });
    }
    if (body.action === "end") {
      // Ending a session remains available after the provider is disabled.
      const { error } = await aiService().rpc("ai_end", {
        p_user: user.id,
        p_session: body.sessionId,
      });
      if (error) throw error;
      return json(await snapshot(body.sessionId));
    }
    const config = aiConfig();
    if (!config.live || !config.model) return json({ error: "disabled" }, 503);
    const catalog = await loadScenarios();
    if (!catalog.database) return json({ error: "unavailable" }, 503);
    const service = aiService();
    if (body.action === "start") {
      const { error } = await service.rpc("ai_start", {
        p_user: user.id,
        p_id: body.requestId,
        p_settings: body.settings,
      });
      if (error) throw error;
      return json(await snapshot(body.requestId));
    }
    const before = await snapshot(body.sessionId);
    if (!before) return json({ error: "not_found" }, 404);
    const scenario = catalog.scenarios.find(
      (s) => s.id === before.session.scenario_id,
    );
    if (!scenario) return json({ error: "unavailable" }, 503);
    const { data: reservation, error } = await service.rpc("ai_reserve", {
      p_user: user.id,
      p_session: body.sessionId,
      p_request: body.requestId,
      p_text: body.text,
      p_model: config.model,
    });
    if (error) throw error;
    if (
      reservation &&
      typeof reservation === "object" &&
      !Array.isArray(reservation) &&
      reservation.replay
    )
      return json(await snapshot(body.sessionId));
    try {
      const context = [
        ...before.messages.filter(
          (m) => m.turn <= before.session.completed_turns,
        ),
        { role: "user" as const, content: body.text },
      ];
      const result = await generateReply(
        before.session.settings,
        scenario,
        context,
      );
      const { error: saveError } = await service.rpc("ai_finish", {
        p_user: user.id,
        p_session: body.sessionId,
        p_request: body.requestId,
        p_output: result.output,
        p_input_tokens: result.inputTokens,
        p_output_tokens: result.outputTokens,
        p_cost: estimatedCost(result.inputTokens, result.outputTokens),
      });
      if (saveError) throw saveError;
    } catch (providerError) {
      // Failure still consumes a reservation; no automatic paid retry. No transcript text in usage logs.
      await service.rpc("ai_finish", {
        p_user: user.id,
        p_session: body.sessionId,
        p_request: body.requestId,
        p_output: null,
        p_input_tokens: 0,
        p_output_tokens: 0,
        p_cost: null,
      });
      throw providerError;
    }
    return json(await snapshot(body.sessionId));
  } catch (error) {
    return failure(error);
  }
}
