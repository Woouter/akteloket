import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Check, Download, FileText, PackageCheck } from "lucide-react";
import { requireStaff } from "@/lib/auth/guards";
import { acknowledgeHandover } from "@/app/notaris/actions";
import { buildManifest } from "@/lib/automation/engine";
import { Badge, Card } from "@/components/ui";
import { dateTimeNl } from "@/lib/util/format";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { user, view } = await requireStaff(id);
  if (!view) notFound();
  const live = buildManifest(view);
  const docTitle = (did: string) => view.documents.find((d) => d.id === did)?.title ?? "document";
  return (
    <>
      <Link href={`/notaris/dossiers/${id}`} className="btn btn-ghost btn-sm -ml-2 mb-2"><ArrowLeft className="h-4 w-4" />Controlepaneel</Link>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div><h1 className="text-2xl font-extrabold text-ink-900">Dossieroverdracht</h1><p className="text-sm text-ink-600">Gestructureerd dossier conform het procesdocument (hoofdstuk 11). Juridische compleetheid, Wwft-toereikendheid en gereedheid voor passeren stelt u vast.</p></div>
        <a href={`/api/notaris/${id}/overdracht`} className="btn btn-dark"><Download className="h-4 w-4" />Download complete overdracht (ZIP)</a>
      </div>
      <div className="mb-6 flex flex-wrap gap-3">
        {view.handovers.map((h) => (
          <Card key={h.id} className="flex items-center gap-4 p-4">
            <PackageCheck className="h-6 w-6 text-brand-600" />
            <div><p className="font-semibold text-ink-900">Overdracht {h.version}</p><p className="text-xs text-ink-500">{h.reason} · {dateTimeNl(h.createdAt)}</p></div>
            {h.acknowledgedAt ? <Badge tone="ok"><Check className="h-3 w-3" />In behandeling</Badge> : user.role === "notaris" ? <form action={acknowledgeHandover.bind(null, id, h.id)}><button className="btn btn-secondary btn-sm">In behandeling nemen</button></form> : <Badge>Nieuw</Badge>}
          </Card>
        ))}
        {view.handovers.length === 0 && <p className="text-sm text-ink-500">Nog geen formele overdracht: deze volgt automatisch zodra de koper zijn stappen heeft afgerond en de concept-akte gereed is. Hieronder ziet u de actuele stand.</p>}
      </div>
      <Card className="overflow-hidden p-0" data-tour="n-overdracht">
        <table className="w-full text-sm">
          <thead className="border-b border-ink-100 bg-ink-50/60 text-left text-xs font-semibold uppercase tracking-wider text-ink-500"><tr><th className="p-4">Onderdeel</th><th className="p-4">Actuele status</th><th className="p-4">Documenten</th></tr></thead>
          <tbody className="divide-y divide-ink-100">
            {live.items.map((i) => (
              <tr key={i.label}><td className="p-4 font-medium text-ink-900">{i.label}</td><td className="p-4 text-ink-600">{i.status}</td><td className="p-4"><div className="flex flex-col gap-1">{(i.documentIds ?? []).map((d) => <a key={d} href={`/api/documenten/${d}?inline=1`} target="_blank" className="inline-flex items-center gap-1 text-brand-700 hover:underline"><FileText className="h-3.5 w-3.5" />{docTitle(d)}</a>)}</div></td></tr>
            ))}
          </tbody>
        </table>
      </Card>
      <Card className="mt-6 p-5">
        <p className="font-semibold text-ink-900">Openstaande punten, herinneringen en opmerkingen ({live.openPunten.length})</p>
        <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm text-ink-700">{live.openPunten.map((p, i) => <li key={i}>{p}</li>)}{live.openPunten.length === 0 && <li>Geen</li>}</ul>
      </Card>
    </>
  );
}
