import Link from "next/link";
import { asc, gte } from "drizzle-orm";
import { Building2, Gavel, Video } from "lucide-react";
import { getDb, schema } from "@/lib/db";
import { summaries } from "@/lib/domain/overview";
import { PageTitle } from "@/components/staff/shell";
import { Badge, Card } from "@/components/ui";
import { dateNl, propertyLine } from "@/lib/util/format";

export default async function Page() {
  const db = await getDb();
  const from = new Date(); from.setHours(0, 0, 0, 0);
  const appts = await db.select().from(schema.appointments).where(gte(schema.appointments.startsAt, from)).orderBy(asc(schema.appointments.startsAt));
  const all = await summaries();
  const byId = new Map(all.map((s) => [s.view.dossier.id, s]));
  type Item = { at: Date; kind: "volmacht" | "passeren"; title: string; sub: string; href: string; mode?: string };
  const items: Item[] = [
    ...appts.filter((a) => a.status === "gepland").map((a) => { const s = byId.get(a.dossierId); const p = s?.view.parties.find((x) => x.id === a.partyId); return { at: a.startsAt, kind: "volmacht" as const, title: `Volmacht ${p?.displayName ?? ""}`, sub: s ? propertyLine(s.view.data.property) : "", href: `/notaris/dossiers/${a.dossierId}#volmachten`, mode: a.mode }; }),
    ...all.filter((s) => s.view.data.transaction.leveringsdatum && !s.view.data.gepasseerdOp && (s.daysToPassing ?? -1) >= 0).map((s) => ({ at: new Date(s.view.data.transaction.leveringsdatum + "T09:30:00"), kind: "passeren" as const, title: `Passeren ${s.view.dossier.reference}`, sub: propertyLine(s.view.data.property), href: `/notaris/dossiers/${s.view.dossier.id}#passeren` })),
  ].sort((a, b) => a.at.getTime() - b.at.getTime());
  const days = items.reduce<Record<string, Item[]>>((acc, i) => { const k = i.at.toISOString().slice(0, 10); (acc[k] ??= []).push(i); return acc; }, {});
  return (
    <>
      <PageTitle title="Agenda" sub="Volmachtafspraken en geplande passeringen" />
      <div className="space-y-5">
        {Object.entries(days).map(([day, list]) => (
          <Card key={day} className="p-0">
            <p className="border-b border-ink-100 px-5 py-3 text-sm font-semibold text-ink-900">{dateNl(day, { weekday: true })}</p>
            <ul className="divide-y divide-ink-100">
              {list.map((i, k) => (
                <li key={k}><Link href={i.href} className="flex items-center gap-4 px-5 py-3 hover:bg-ink-50/60">
                  <span className="w-12 text-sm font-semibold text-ink-900 tabular">{i.at.toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" })}</span>
                  <span className={`flex h-9 w-9 items-center justify-center rounded-lg ${i.kind === "passeren" ? "bg-notaris-100 text-notaris-700" : "bg-brand-50 text-brand-700"}`}>{i.kind === "passeren" ? <Gavel className="h-4 w-4" /> : i.mode === "video" ? <Video className="h-4 w-4" /> : <Building2 className="h-4 w-4" />}</span>
                  <span className="min-w-0 flex-1"><span className="block font-medium text-ink-900">{i.title}</span><span className="block truncate text-xs text-ink-500">{i.sub}</span></span>
                  <Badge>{i.kind === "passeren" ? "Passeren" : i.mode === "video" ? "Video" : "Kantoor"}</Badge>
                </Link></li>
              ))}
            </ul>
          </Card>
        ))}
      </div>
    </>
  );
}
