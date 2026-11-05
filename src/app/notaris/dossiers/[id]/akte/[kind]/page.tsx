import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CheckCircle2, Download, Flag, Link2, RefreshCw } from "lucide-react";
import { requireStaff } from "@/lib/auth/guards";
import { DocView } from "@/components/docs/doc-view";
import { decideCheck, regenerate } from "@/app/notaris/actions";
import type { DocIR } from "@/lib/docgen/ir";
import { Badge, Card } from "@/components/ui";
import { dateTimeNl } from "@/lib/util/format";
import { CardTitle } from "@/components/staff/card-title";

export default async function Page({ params }: { params: Promise<{ id: string; kind: string }> }) {
  const { id, kind } = await params;
  const { user, view } = await requireStaff(id);
  if (!view) notFound();
  let docId: string | undefined;
  let checkKey: "leveringsakte" | "hypotheekakte" | undefined;
  if (kind === "levering") { docId = view.data.akteLevering?.documentId; checkKey = "leveringsakte"; }
  else if (kind === "hypotheek") { docId = view.data.akteHypotheek?.documentId; checkKey = "hypotheekakte"; }
  else if (kind.startsWith("doc-")) docId = kind.slice(4);
  const doc = view.documents.find((d) => d.id === docId);
  const ir = (doc?.meta as { ir?: DocIR } | undefined)?.ir;
  if (!doc || !ir) return <div className="card p-8"><p>Dit document is (nog) niet beschikbaar.</p><Link href={`/notaris/dossiers/${id}`} className="btn btn-secondary btn-sm mt-4">Terug</Link></div>;
  const check = checkKey ? view.checks.find((c) => c.key === checkKey) : undefined;
  const akte = kind === "levering" ? view.data.akteLevering : kind === "hypotheek" ? view.data.akteHypotheek : undefined;
  return (
    <>
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Link href={`/notaris/dossiers/${id}${checkKey ? `#${checkKey}` : ""}`} className="btn btn-ghost btn-sm -ml-2"><ArrowLeft className="h-4 w-4" />Terug naar het dossier</Link>
          <h1 className="mt-1 font-serif text-xl font-semibold text-ink-900">{ir.title} {akte && <Badge className="ml-2">versie {akte.version}</Badge>}</h1>
          <p className="text-sm text-ink-500">{view.dossier.reference} · gegenereerd {dateTimeNl(doc.createdAt)}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a href={`/api/documenten/${doc.id}`} className="btn btn-secondary btn-sm"><Download className="h-4 w-4" />Download Word</a>
          {checkKey && user.role === "notaris" && <form action={regenerate.bind(null, id, kind as "levering" | "hypotheek")}><button className="btn btn-secondary btn-sm"><RefreshCw className="h-4 w-4" />Opnieuw genereren</button></form>}
          {checkKey && user.role === "notaris" && check?.status !== "akkoord" && <form action={decideCheck.bind(null, id, checkKey, "akkoord")}><button className="btn btn-ok btn-sm"><CheckCircle2 className="h-4 w-4" />Concept akkoord</button></form>}
          {check?.status === "akkoord" && <Badge tone="ok">Akkoord door {check.decidedBy}</Badge>}
        </div>
      </div>
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <div data-tour="akte-doc" className="min-w-0 rounded-lg bg-ink-100/60 p-2 sm:p-6"><DocView ir={ir} /></div>
        <aside className="min-w-0 space-y-5 xl:sticky xl:top-6 xl:self-start" data-tour="akte-controlepunten">
          <Card className="p-5">
            <CardTitle icon={<Flag className="h-4 w-4 shrink-0 text-warn-600" />}>Controlepunten ({ir.controlepunten.length})</CardTitle>
            {ir.controlepunten.length === 0 && <p className="mt-2 text-sm text-ink-500">Geen controlepunten: alle gegevens in dit document komen uit een bron (zie hieronder).</p>}
            <ol className="mt-3 max-h-[50vh] space-y-2 overflow-auto text-sm empty:hidden">
              {ir.controlepunten.map((c, i) => <li key={i} className={`rounded-lg p-2.5 ${c.startsWith("Ontbrekend") ? "bg-bad-50 text-bad-700" : "bg-warn-50 text-ink-800"}`}><span className="mr-1 font-mono text-xs text-ink-400">{i + 1}.</span>{c}</li>)}
            </ol>
          </Card>
          <Card className="p-5">
            <CardTitle icon={<Link2 className="h-4 w-4 shrink-0 text-ok-600" />}>Bronnen ({ir.bronnen.length})</CardTitle>
            <ul className="mt-3 max-h-[40vh] space-y-2 overflow-auto text-xs">
              {ir.bronnen.map((b) => <li key={b.label}><span className="font-semibold text-ink-800">{b.label}</span><span className="block text-ink-500">{b.bron}</span></li>)}
            </ul>
          </Card>
          <p className="text-xs leading-relaxed text-ink-500"><span className="field-filled">groen</span> = overgenomen gegeven met bron · <span className="field-mark">geel ⚑</span> = controlepunt · <span className="field-mark !bg-bad-100">rood</span> = ontbreekt (niet aangenomen). Het model en de clausulebibliotheek worden vóór livegang door u goedgekeurd.</p>
        </aside>
      </div>
    </>
  );
}
