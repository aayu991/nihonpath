import { NextRequest, NextResponse } from "next/server";
import { createHash, randomUUID } from "node:crypto";
import { getCmsContext } from "@/lib/cms/server";
import { operationsClient } from "@/lib/launch/server";
import { mediaLimit } from "@/lib/cms/media-validation";
import { z } from "zod";
import { normalizeMedia } from "@/lib/cms/media-normalize";
export const runtime = "nodejs";
export async function POST(request: NextRequest) {
  if (request.headers.get("origin") !== request.nextUrl.origin)
    return NextResponse.json({ error: "Origin rejected." }, { status: 403 });
  const ctx = await getCmsContext();
  if (!ctx?.permissions.edit)
    return NextResponse.json(
      { error: "Verified editor required." },
      { status: 403 },
    );
  if (!process.env.SUPABASE_SECRET_KEY)
    return NextResponse.json(
      {
        error:
          "Media uploads are disabled until server Storage credentials and the private bucket migration are configured.",
      },
      { status: 503 },
    );
  if (Number(request.headers.get("content-length") ?? 0) > mediaLimit)
    return NextResponse.json({ error: "File exceeds 25 MB." }, { status: 413 });
  const meta = z
    .object({
      title: z.string().trim().min(1).max(180),
      filename: z.string().min(1).max(250),
      replaces: z.uuid().nullable(),
    })
    .safeParse({
      title: request.nextUrl.searchParams.get("title"),
      filename: request.nextUrl.searchParams.get("filename"),
      replaces: request.nextUrl.searchParams.get("replaces"),
    });
  if (!meta.success || !request.body)
    return NextResponse.json(
      { error: "File title and filename required." },
      { status: 400 },
    );
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > mediaLimit) {
        await reader.cancel();
        return NextResponse.json(
          { error: "File exceeds 25 MB." },
          { status: 413 },
        );
      }
      chunks.push(value);
    }
    const { bytes, ...format } = await normalizeMedia(Buffer.concat(chunks));
    const id = randomUUID(),
      path = `${id}/asset.${format.extension}`,
      service = operationsClient(60000);
    const upload = await service.storage
      .from("cms-education")
      .upload(path, bytes, { contentType: format.mime, upsert: false });
    if (upload.error)
      return NextResponse.json(
        { error: "Storage upload failed. Check private bucket configuration." },
        { status: 502 },
      );
    const register = await service.rpc("cms_media_register", {
      p_actor: ctx.user.id,
      p_id: id,
      p_data: {
        object_path: path,
        title: meta.data.title,
        filename: meta.data.filename,
        mime_type: format.mime,
        byte_size: bytes.length,
        sha256: createHash("sha256").update(bytes).digest("hex"),
        replaces_id: meta.data.replaces,
      },
    });
    if (register.error) {
      await service.storage.from("cms-education").remove([path]);
      return NextResponse.json(
        {
          error:
            "Media registration failed; uploaded object cleanup was requested.",
        },
        { status: 409 },
      );
    }
    return NextResponse.json(
      { id },
      { status: 201, headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error && error.message.startsWith("Unsupported")
            ? error.message
            : "Upload validation or storage failed.",
      },
      { status: 400 },
    );
  }
}
