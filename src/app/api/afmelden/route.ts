import { NextResponse } from "next/server";
import { afmelden, checkAfmeldToken } from "@/lib/integrations/afmeldingen";

/**
 * One-click afmelden (RFC 8058): mailprogramma's als Gmail en Outlook sturen een POST
 * naar de URL uit de List-Unsubscribe-header. Geen inlog nodig; de link is ondertekend.
 */
export async function POST(req: Request) {
  const url = new URL(req.url);
  const email = url.searchParams.get("e") ?? "";
  const token = url.searchParams.get("t") ?? "";
  if (!email || !checkAfmeldToken(email, token)) return NextResponse.json({ error: "Ongeldige afmeldlink" }, { status: 400 });
  await afmelden(email, "zelf");
  return NextResponse.json({ ok: true });
}
