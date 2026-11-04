import { notFound } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { Play } from "lucide-react";
import { requireStaff } from "@/lib/auth/guards";
import { koperSteps, notaryChecks, verkoperSteps } from "@/lib/workflow/steps";
import { eventsFor } from "@/lib/domain/dossier";
import { getDb, schema } from "@/lib/db";
import { runForDossier } from "../../actions";
import { PageTitle } from "@/components/staff/shell";
import { Badge, Card, StateChip, StateIcon } from "@/components/ui";
import { DemoActions } from "@/components/demo/actions";
import { isDemo } from "@/lib/config";
import { dateTimeNl, propertyLine } from "@/lib/util/format";
import { STATUS_LABEL } from "@/lib/domain/overview";

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
      <PageTitle title={propertyLine(view.data.property) || view.dossier.reference} sub={<>{view.dossier.reference} · <Badge>{STATUS_LABEL[view.dossier.status]}</Badge></>} actions={<form action={runForDossier.bind(null, id)}><button className="btn btn-secondary btn-sm"><Play className="h-4 w-4" />Automatisering nu draaien</button></form>} />
      <div className="grid gap-6 xl:grid-cols-3">
        {cols.map((c) => (
          <Card key={c.title} className="p-0"><p className="border-b border-ink-100 p-4 font-semibold text-ink-900">{c.title}</p><ul className="divide-y divide-ink-100">{c.steps.map((s) => <li key={s.key} className="flex items-center justify-between gap-3 p-3 text-sm"><span className="flex min-w-0 items-center gap-2"><StateIcon state={s.state} size="sm" /><span className="truncate">{s.nr}. {s.title}</span></span><StateChip state={s.state} label={s.label.length > 30 ? s.label.slice(0, 30) + "…" : s.label} /></li>)}</ul></Card>
        ))}
        <Card className="p-0"><p className="border-b border-ink-100 p-4 font-semibold text-ink-900">Notaris (N1–N7)</p><ul className="divide-y divide-ink-100">{notaryChecks(view).map((c) => <li key={c.key} className="flex items-center justify-between gap-3 p-3 text-sm"><span>{c.nr} {c.title}</span><Badge tone={c.status === "akkoord" ? "ok" : c.ready ? "brand" : "neutral"}>{!c.applicable ? "n.v.t." : c.status === "akkoord" ? "akkoord" : c.ready ? "klaar" : "wacht"}</Badge></li>)}</ul></Card>
      </div>
      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <Card className="p-0"><p className="border-b border-ink-100 p-4 font-semibold text-ink-900">Gebeurtenissen ({events.length})</p><ul className="max-h-[30rem] divide-y divide-ink-100 overflow-auto">{events.map((e) => <li key={e.id} className="p-3 text-sm"><p className="text-ink-800">{e.message}</p><p className="text-xs text-ink-400">{dateTimeNl(e.createdAt)} · {e.actorName ?? e.actorType} · zichtbaar: {e.visibleTo}</p></li>)}</ul></Card>
        <Card className="p-0"><p className="border-b border-ink-100 p-4 font-semibold text-ink-900">E-mails ({mails.length})</p><ul className="max-h-[30rem] divide-y divide-ink-100 overflow-auto">{mails.map((m) => <li key={m.id} className="p-3 text-sm"><details><summary className="cursor-pointer"><span className="font-medium text-ink-900">{m.subject}</span><span className="block text-xs text-ink-400">{m.to} · {dateTimeNl(m.createdAt)} · {m.status}</span></summary><pre className="mt-2 whitespace-pre-wrap rounded-lg bg-ink-50 p-3 font-sans text-xs text-ink-700">{m.text}</pre></details></li>)}</ul></Card>
      </div>
      {isDemo() && <DemoActions dossierId={id} context="beheer" />}
    </>
  );
}
