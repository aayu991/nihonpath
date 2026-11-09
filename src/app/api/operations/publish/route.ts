import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { operationsAuthorized } from "@/lib/launch/authorization";
import { operationsClient } from "@/lib/launch/server";
export async function POST(request: Request) {
  if (
    !operationsAuthorized(
      request.headers.get("authorization"),
      process.env.OPERATIONS_SECRET,
    )
  )
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (process.env.CMS_SCHEDULE_ENABLED !== "true")
    return NextResponse.json(
      { error: "Scheduled publishing is disabled." },
      { status: 503 },
    );
  try {
    const r = await operationsClient().rpc("cms_run_scheduled");
    if (r.error)
      return NextResponse.json(
        { error: "Publishing job failed." },
        { status: 503 },
      );
    revalidatePath("/", "layout");
    return NextResponse.json(r.data, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch {
    return NextResponse.json(
      { error: "Publishing unavailable." },
      { status: 503 },
    );
  }
}
