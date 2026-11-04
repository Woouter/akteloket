import { NextResponse } from "next/server";
import { currentDraft, toReviewPayload } from "@/lib/domain/aanvraag";

export async function GET() {
  const draft = await currentDraft();
  if (!draft) return NextResponse.json({ draft: null });
  return NextResponse.json({ draft: toReviewPayload(draft) });
}
