import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb, schema } from "@/lib/db";
import { uid } from "@/lib/util/ids";
import { sendMail } from "@/lib/integrations/email";
import { BRAND } from "@/lib/config";

const Body = z.object({ kind: z.enum(["contact", "partner", "terugbellen"]), name: z.string().min(1).max(200), email: z.string().email().max(200), phone: z.string().max(50).optional(), message: z.string().max(4000).optional(), company: z.string().max(200).optional(), website: z.string().optional() });

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Ongeldige invoer" }, { status: 400 });
  const b = parsed.data;
  if (b.website) return NextResponse.json({ ok: true }); // honeypot
  const db = await getDb();
  await db.insert(schema.leads).values({ id: uid(), kind: b.kind, name: b.name, email: b.email, phone: b.phone ?? null, message: b.message ?? "", meta: { company: b.company } });
  await sendMail({ to: BRAND.email, template: `lead.${b.kind}`, subject: `Nieuwe ${b.kind}-aanvraag: ${b.name}`, heading: `Nieuwe ${b.kind}-aanvraag`, intro: `${b.name} (${b.email}${b.phone ? `, ${b.phone}` : ""})${b.company ? ` van ${b.company}` : ""}`, paragraphs: b.message ? [b.message] : [] });
  return NextResponse.json({ ok: true });
}
