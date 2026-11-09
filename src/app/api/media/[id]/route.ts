import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { operationsClient } from "@/lib/launch/server";
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success)
    return new NextResponse(null, { status: 404 });
  const client = await createClient();
  if (!client) return new NextResponse(null, { status: 503 });
  const r = await client.rpc("cms_media_resolve", { p_id: id });
  const m = z
    .object({
      object_path: z.string(),
      mime_type: z.string(),
      filename: z.string(),
    })
    .safeParse(r.data);
  if (r.error || !m.success) return new NextResponse(null, { status: 404 });
  try {
    const asset = await operationsClient(60000)
      .storage.from("cms-education")
      .download(m.data.object_path);
    if (asset.error || !asset.data)
      return new NextResponse(null, { status: 404 });
    return new NextResponse(asset.data, {
      headers: {
        "Content-Type": m.data.mime_type,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
        "Content-Security-Policy": "default-src 'none'; sandbox",
        ...(m.data.mime_type === "application/pdf"
          ? { "Content-Disposition": "attachment; filename=education.pdf" }
          : {}),
      },
    });
  } catch {
    return new NextResponse(null, { status: 503 });
  }
}
