import Link from "next/link";
import { desc, gte } from "drizzle-orm";
import { Activity, AlertTriangle, CalendarClock, FolderOpen, Mail } from "lucide-react";
import { getDb, schema } from "@/lib/db";
import { summaries, STATUS_LABEL } from "@/lib/domain/overview";
import { koperSteps, verkoperSteps } from "@/lib/workflow/steps";
import { PageTitle } from "@/components/staff/shell";
import { Card } from "@/components/ui";
import { addDays, daysBetween, propertyLine, timeAgo, todayIso } from "@/lib/util/format";
import { TERMS } from "@/lib/config";

export default async function Page() {
  const db = await getDb();
  const all = await summaries();
  const open = all.filter((s) => !["afgewikkeld", "geannuleerd"].includes(s.view.dossier.status));
  const since = new Date(Date.now() - 7 * 86400_000);
  const evs = await db.select().from(schema.events).where(gte(schema.events.createdAt, since)).orderBy(desc(schema.events.createdAt)).limit(40);
  const mails = await db.select({ id: schema.emails.id }).from(schema.emails).where(gte(schema.emails.createdAt, since));
  const byStatus = Object.entries(all.reduce<Record<string, number>>((acc, s) => { acc[s.view.dossier.status] = (acc[s.view.dossier.status] ?? 0) + 1; return acc; }, {}));
  const attention: { s: (typeof all)[number]; why: string }[] = [];
  for (const s of open) {
    const d = s.view.data;
    if (d.extractie && (d.extractie.ontbrekend.length || d.extractie.onzeker.length)) attention.push({ s, why: `Koopovereenkomst: ${d.extractie.ontbrekend.length} ontbrekend, ${d.extractie.onzeker.length} onzeker` });
    if (d.kadaster.status === "nader_onderzoek") attention.push({ s, why: "Kadaster: nader onderzoek nodig" });
    if (s.view.dossier.status === "wacht_op_ko") attention.push({ s, why: "Wacht op getekende koopovereenkomst — klant opvolgen" });
    const lev = d.transaction.leveringsdatum;
    if (lev && d.financing.hypotheek !== "nee" && !["ontvangen", "in_behandeling"].includes(d.financing.bankinstructieStatus ?? "") && daysBetween(todayIso(), addDays(lev, -TERMS.bankinstructieUiterlijkDagenVooraf)) <= 0 && d.service !== "levering") attention.push({ s, why: "Bankinstructie nog niet ontvangen binnen 10 dagen vóór passeren — adviseur benaderen" });
    const steps = [...koperSteps(s.view), ...(s.view.verkopers.length ? verkoperSteps(s.view) : [])];
    const stuck = steps.filter((x) => x.owner === "klant" && (x.state === "todo" || x.state === "attention") && x.actionable).length;
    if (stuck >= 4 && s.daysToPassing !== undefined && s.daysToPassing < 21) attention.push({ s, why: `${stuck} open klantstappen terwijl passeren over ${s.daysToPassing} dagen is` });
  }
  const tiles = [
    { icon: FolderOpen, label: "Lopende dossiers", value: open.length },
    { icon: CalendarClock, label: "Passeren deze 2 weken", value: open.filter((s) => (s.daysToPassing ?? 99) >= 0 && (s.daysToPassing ?? 99) <= 14).length },
    { icon: Activity, label: "Automatische acties (7 d)", value: evs.filter((e) => e.actorType === "systeem").length },
    { icon: Mail, label: "E-mails verstuurd (7 d)", value: mails.length },
  ];
  return (
    <>
      <PageTitle title="Platformoverzicht" sub="Wat wij doen: automatiseren, voorbereiden, bewaken en klanten helpen — zodat de notaris alleen controleert." />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" data-tour="b-kpis">
        {tiles.map((t) => <Card key={t.label} className="flex items-center gap-4 p-5"><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-platform-50 text-platform-600"><t.icon className="h-5 w-5" /></span><span><span className="block text-2xl font-extrabold text-ink-900 tabular">{t.value}</span><span className="block text-sm text-ink-500">{t.label}</span></span></Card>)}
      </div>
      <Card className="mt-4 flex flex-wrap gap-2 p-4 text-sm">{byStatus.map(([k, v]) => <span key={k} className="chip bg-ink-50 text-ink-700 ring-1 ring-ink-100">{STATUS_LABEL[k]}: <strong>{v}</strong></span>)}</Card>
      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <Card className="p-0" data-tour="b-attention">
          <div className="border-b border-ink-100 p-5"><h2 className="flex items-center gap-2 font-bold text-ink-900"><AlertTriangle className="h-4 w-4 text-warn-600" />Vraagt actie van het platformteam</h2></div>
          <ul className="divide-y divide-ink-100">
            {attention.length === 0 && <li className="p-5 text-sm text-ink-500">Alles loopt.</li>}
            {attention.map((a, i) => <li key={i}><Link href={`/beheer/dossiers/${a.s.view.dossier.id}`} className="block p-4 hover:bg-ink-50/60"><p className="text-sm font-semibold text-ink-900">{propertyLine(a.s.view.data.property) || a.s.view.dossier.reference}</p><p className="text-sm text-ink-600">{a.why}</p></Link></li>)}
          </ul>
        </Card>
        <Card className="p-0" data-tour="b-stream">
          <div className="border-b border-ink-100 p-5"><h2 className="flex items-center gap-2 font-bold text-ink-900"><Activity className="h-4 w-4 text-platform-600" />Live automatiseringslog</h2></div>
          <ul className="max-h-[32rem] divide-y divide-ink-100 overflow-auto">
            {evs.map((e) => <li key={e.id} className="flex gap-3 p-4 text-sm"><span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${e.actorType === "systeem" ? "bg-platform-600" : e.actorType === "notaris" ? "bg-notaris-600" : "bg-koper-500"}`} /><span className="min-w-0"><span className="block text-ink-800">{e.message}</span><span className="block text-xs text-ink-400">{timeAgo(e.createdAt)} · {e.actorName ?? e.actorType} · <span className="font-mono">{e.type}</span></span></span></li>)}
          </ul>
        </Card>
      </div>
    </>
  );
}
