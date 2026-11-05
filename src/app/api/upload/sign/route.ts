import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getUser } from "@/lib/auth/session";
import { inboxConfigured, signInboxUpload } from "@/lib/integrations/inbox";
import { DRAFT_COOKIE } from "@/lib/domain/aanvraag";

/** Geeft een ondertekende upload-URL voor grote bestanden (of "direct" als er geen inbox is). */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { filename?: string; size?: number };
  if (!inboxConfigured()) return NextResponse.json({ mode: "direct" });
  const user = await getUser();
  const draft = (await cookies()).get(DRAFT_COOKIE)?.value;
  if (!user && !draft) return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
  if ((body.size ?? 0) > 25 * 1024 * 1024) return NextResponse.json({ error: "Maximaal 25 MB" }, { status: 400 });
  const { uploadUrl, path } = await signInboxUpload(body.filename ?? "document.pdf");
  return NextResponse.json({ mode: "signed", uploadUrl, path });
}
