import { notFound } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import Link from "next/link";
import { ArrowLeft, ChevronRight, Play } from "lucide-react";
import { requireStaff } from "@/lib/auth/guards";
import { koperSteps, notaryChecks, verkoperSteps } from "@/lib/workflow/steps";
import { eventsFor } from "@/lib/domain/dossier";
import { getDb, schema } from "@/lib/db";
import { runForDossier } from "../../actions";
import { koApprove } from "@/app/portaal/ko-actions";
import { PageTitle } from "@/components/staff/shell";
import { Badge, Card, StateChip, StateIcon } from "@/components/ui";
import { DemoActions } from "@/components/demo/actions";
import { isDemo } from "@/lib/config";
import { dateTimeNl, propertyLine } from "@/lib/util/format";
import { STATUS_LABEL } from "@/lib/domain/overview";
import { CardTitle } from "@/components/staff/card-title";
import { humanize } from "@/components/staff/labels";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { view } = await requireStaff(id);
  if (!view) notFound();
  const db = await getDb();
  const mails = await db.select().from(schema.emails).where(eq(schema.emails.dossierId, id)).orderBy(desc(schema.emails.createdAt));
  const events = await eventsFor(id, 100);
  const cols = [{ title: "Koper (1–12)", steps: koperSteps(view) }, ...(view.verkopers.length ? [{ title: "Verkoper (A–G)", steps: verkoperSteps(view) }] : [])];
  return (
    <>
      <PageTitle back={<Link href="/beheer/dossiers" className="btn btn-ghost btn-sm -ml-2 mb-2"><ArrowLeft className="h-4 w-4" />Dossiers</Link>} title={propertyLine(view.data.property) || view.dossier.reference} sub={<span className="flex flex-wrap items-center gap-2">{view.dossier.reference}<Badge>{STATUS_LABEL[view.dossier.status]}</Badge></span>} actions={<>{view.data.service === "koopovereenkomst" && view.data.koopovereenkomst?.status === "ter_controle" && <form action={koApprove.bind(null, id)}><button className="btn btn-ok btn-sm">Juridische controle akkoord</button></form>}<form action={runForDossier.bind(null, id)}><button className="btn btn-secondary btn-sm"><Play className="h-4 w-4" />Automatisering nu draaien</button></form></>} />
      {/* Twee kolommen tot zeer brede schermen: stapnamen en statussen passen dan zonder afkappen. */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 2xl:grid-cols-3">
        {cols.map((c) => (
          <Card key={c.title} className="min-w-0 p-0"><CardTitle className="border-b border-ink-100 p-4">{c.title}</CardTitle><ul className="divide-y divide-ink-100">{c.steps.map((s) => <li key={s.key} className="flex flex-col items-start gap-1.5 p-3 text-sm sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-x-3"><span className="flex min-w-0 items-center gap-2"><StateIcon state={s.state} size="sm" /><span>{s.nr}. {s.title}</span></span><span className="ml-7 max-w-[calc(100%-1.75rem)] sm:ml-auto sm:max-w-full"><StateChip state={s.state} label={humanize(s.label)} /></span></li>)}</ul></Card>
        ))}
        <Card className="min-w-0 p-0"><CardTitle className="border-b border-ink-100 p-4">Notaris (N1–N7)</CardTitle><ul className="divide-y divide-ink-100">{notaryChecks(view).map((c) => <li key={c.key} className="flex items-center justify-between gap-3 p-3 text-sm"><span className="min-w-0">{c.nr} {c.title}</span><span className="shrink-0"><Badge tone={c.status === "akkoord" ? "ok" : c.status === "aanvulling_gevraagd" ? "warn" : c.ready ? "brand" : "neutral"}>{!c.applicable ? "n.v.t." : c.status === "akkoord" ? "Akkoord" : c.status === "aanvulling_gevraagd" ? "Aanvulling gevraagd" : c.ready ? "Klaar voor controle" : "Wacht op informatie"}</Badge></span></li>)}</ul></Card>
      </div>
      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Card className="min-w-0 p-0"><CardTitle className="border-b border-ink-100 p-4">Gebeurtenissen ({events.length})</CardTitle><ul className="max-h-[30rem] divide-y divide-ink-100 overflow-auto">{events.map((e) => <li key={e.id} className="p-3 text-sm"><p className="text-ink-800">{humanize(e.message)}</p><p className="text-xs text-ink-500">{dateTimeNl(e.createdAt)}, {e.actorName ?? e.actorType}, zichtbaar voor: {e.visibleTo}</p></li>)}</ul></Card>
        <Card className="min-w-0 p-0"><CardTitle className="border-b border-ink-100 p-4">E-mails ({mails.length})</CardTitle><ul className="max-h-[30rem] divide-y divide-ink-100 overflow-auto">{mails.map((m) => <li key={m.id} className="p-3 text-sm"><details className="group"><summary className="flex cursor-pointer list-none items-start gap-2 [&::-webkit-details-marker]:hidden"><ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-ink-400 transition-transform group-open:rotate-90" /><span className="min-w-0"><span className="block font-medium text-ink-900">{m.subject}</span><span className="block text-xs text-ink-500">{m.to}, {dateTimeNl(m.createdAt)}, {m.status}</span></span></summary><pre className="mt-2 whitespace-pre-wrap rounded-lg bg-ink-50 p-3 font-sans text-xs text-ink-700">{m.text}</pre></details></li>)}</ul></Card>
      </div>
      {isDemo() && <DemoActions dossierId={id} context="beheer" />}
    </>
  );
}
