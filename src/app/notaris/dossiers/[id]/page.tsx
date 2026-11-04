import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Check, Download, FileStack, FileText, PackageOpen } from "lucide-react";
import { requireStaff } from "@/lib/auth/guards";
import { notaryChecks } from "@/lib/workflow/steps";
import { getWwftMatrix } from "@/lib/domain/settings";
import { eventsFor } from "@/lib/domain/dossier";
import { CheckCard } from "@/components/staff/checks";
import { DossierSummary } from "@/components/staff/summary";
import { Badge, Card } from "@/components/ui";
import { DemoActions } from "@/components/demo/actions";
import { STATUS_LABEL } from "@/lib/domain/overview";
import { DOCUMENT_KINDS } from "@/lib/domain/types";
import { SERVICES, isDemo } from "@/lib/config";
import { dateNl, dateTimeNl, propertyLine, timeAgo } from "@/lib/util/format";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { user, view } = await requireStaff(id);
  if (!view) notFound();
  const checks = notaryChecks(view);
  const matrix = await getWwftMatrix();
  const events = await eventsFor(id, 40);
  const isNotary = user.role === "notaris";
  const done = checks.filter((c) => c.applicable && c.status === "akkoord").length;
  const total = checks.filter((c) => c.applicable).length;
  return (
    <>
      <Link href="/notaris" className="btn btn-ghost btn-sm -ml-2 mb-2"><ArrowLeft className="h-4 w-4" />Werkvoorraad</Link>
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2"><Badge tone="dark">{STATUS_LABEL[view.dossier.status]}</Badge><Badge>{SERVICES[view.data.service].name}</Badge><span className="font-mono text-xs text-ink-400">{view.dossier.reference}</span></div>
          <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-ink-900 sm:text-3xl">{propertyLine(view.data.property) || "(adres volgt)"}</h1>
          <p className="mt-1 text-sm text-ink-600">Passeren {dateNl(view.data.transaction.leveringsdatum, { weekday: true })} · controles {done}/{total} akkoord</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={`/notaris/dossiers/${id}/overdracht`} className="btn btn-secondary btn-sm"><PackageOpen className="h-4 w-4" />Dossieroverdracht ({view.handovers.length})</Link>
          <a href={`/api/notaris/${id}/overdracht`} className="btn btn-dark btn-sm"><Download className="h-4 w-4" />Alles als ZIP</a>
        </div>
      </div>
      <DossierSummary view={view} isNotary={isNotary} />
      <div className="mt-8 grid gap-6 xl:grid-cols-[1fr_22rem]">
        <div className="min-w-0 space-y-5" data-tour="n-checks">
          <h2 className="text-lg font-bold text-ink-900">Controlepunten</h2>
          {checks.map((c) => <CheckCard key={c.key} view={view} c={c} matrix={matrix} isNotary={isNotary} />)}
        </div>
        <aside className="min-w-0 space-y-5">
          <Card className="p-5">
            <p className="flex items-center gap-2 font-semibold text-ink-900"><FileStack className="h-4 w-4 text-brand-600" />Documenten ({view.documents.length})</p>
            <ul className="mt-3 space-y-2.5">
              {view.documents.map((d) => (
                <li key={d.id} className="text-sm"><a href={(d.meta as { ir?: unknown }).ir ? `/notaris/dossiers/${id}/akte/doc-${d.id}` : `/api/documenten/${d.id}?inline=1`} target={(d.meta as { ir?: unknown }).ir ? undefined : "_blank"} className="flex gap-2 font-medium text-ink-800 hover:text-brand-700"><FileText className="mt-0.5 h-4 w-4 shrink-0 text-ink-400" /><span className="min-w-0"><span className="block truncate">{d.title}</span><span className="block text-xs font-normal text-ink-400">{DOCUMENT_KINDS[d.kind]} · {d.source}{d.version > 1 ? ` · v${d.version}` : ""} · {dateNl(d.createdAt, { short: true })}</span></span></a></li>
              ))}
            </ul>
          </Card>
          <Card className="p-5">
            <p className="font-semibold text-ink-900">Tijdlijn</p>
            <ol className="mt-3 space-y-3 border-l-2 border-ink-100 pl-4">
              {events.map((e) => <li key={e.id} className="relative text-sm"><span className={`absolute -left-[23px] top-1.5 h-2.5 w-2.5 rounded-full ${e.actorType === "systeem" ? "bg-platform-600" : e.actorType === "notaris" ? "bg-notaris-600" : "bg-koper-500"}`} /><p className="text-ink-700">{e.message}</p><p className="text-xs text-ink-400" title={dateTimeNl(e.createdAt)}>{timeAgo(e.createdAt)} · {e.actorName ?? e.actorType}</p></li>)}
            </ol>
          </Card>
        </aside>
      </div>
      {isDemo() && <DemoActions dossierId={id} context="notaris" />}
    </>
  );
}
