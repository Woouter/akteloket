import { eq } from "drizzle-orm";
import { getUser } from "@/lib/auth/session";
import { getDb, schema } from "@/lib/db";
import { BRAND } from "@/lib/config";

export async function GET(_: Request, { params }: { params: Promise<{ file: string }> }) {
  const user = await getUser();
  if (!user) return new Response("Niet ingelogd", { status: 401 });
  const id = (await params).file.replace(/\.ics$/, "");
  const db = await getDb();
  const [a] = await db.select().from(schema.appointments).where(eq(schema.appointments.id, id));
  if (!a) return new Response("Niet gevonden", { status: 404 });
  const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const end = new Date(a.startsAt.getTime() + a.durationMin * 60000);
  const ics = ["BEGIN:VCALENDAR", "VERSION:2.0", `PRODID:-//${BRAND.name}//NL`, "BEGIN:VEVENT", `UID:${a.id}@${BRAND.domain}`, `DTSTAMP:${fmt(new Date())}`, `DTSTART:${fmt(a.startsAt)}`, `DTEND:${fmt(end)}`, "SUMMARY:Ondertekening volmacht (Akteloket)", `LOCATION:${a.location ?? ""}`, "DESCRIPTION:Neem je identiteitsbewijs mee. Duur ongeveer 15 minuten.", "END:VEVENT", "END:VCALENDAR"].join("\r\n");
  return new Response(ics, { headers: { "content-type": "text/calendar; charset=utf-8", "content-disposition": `attachment; filename="volmachtafspraak.ics"` } });
}
