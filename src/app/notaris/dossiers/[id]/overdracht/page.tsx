import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Check, Download, FileText, PackageCheck } from "lucide-react";
import { requireStaff } from "@/lib/auth/guards";
import { acknowledgeHandover } from "@/app/notaris/actions";
import { buildManifest } from "@/lib/automation/engine";
import type { DossierView } from "@/lib/domain/dossier";
import { Badge, Card } from "@/components/ui";
import { CardTitle } from "@/components/staff/card-title";
import { BANK_STATUS, EXTRACTIE_METHODE, FIN_STATUS, ID_STATUS, KADASTER_STATUS, KO_STATUS, PAYOFF_STATUS, VOLMACHT_STATUS, cap, humanize, label } from "@/components/staff/labels";
import { dateNl, dateTimeNl } from "@/lib/util/format";

/** Leesbare status per onderdeel; valt terug op de manifesttekst zonder ruwe enum-waarden. */
function displayStatus(view: DossierView, itemLabel: string, raw: string): string {
  const d = view.data;
  const l = itemLabel.toLowerCase();
  if (l.startsWith("koopovereenkomst")) return cap(label(KO_STATUS, d.koStatus));
  if (l.startsWith("geëxtraheerde") && d.extractie) return `${cap(label(EXTRACTIE_METHODE, d.extractie.methode))} · ${d.extractie.onzeker.length} onzeker · ${d.extractie.ontbrekend.length} ontbrekend`;
  if (l.startsWith("identificatie")) return view.parties.map((p) => `${p.displayName}: ${label(ID_STATUS, p.data.idcheck?.status, "te starten")}`).join(" · ");
  if (l.startsWith("financiering")) return d.financing.hypotheek === "nee" ? "Zonder hypotheek" : `${cap(label(FIN_STATUS, d.financing.status, "status onbekend"))} · bankinstructie ${label(BANK_STATUS, d.financing.bankinstructieStatus, "nog niet verwacht")}`;
  if (l.startsWith("status gecombineerde volmacht")) return view.parties.map((p) => `${p.displayName}: ${label(VOLMACHT_STATUS, p.data.volmacht?.status, "te plannen")}`).join(" · ");
  if (l.startsWith("kadastrale gegevens")) return `${cap(label(KADASTER_STATUS, d.kadaster.status))}${d.kadaster.opgehaaldOp ? ` · ${dateNl(d.kadaster.opgehaaldOp)}` : ""}`;
  if (l.startsWith("verkopersdossier") && view.verkopers.length) return `${view.verkopers.length} verkoper(s) · aflosnota's: ${view.payoffs.map((p) => label(PAYOFF_STATUS, p.status)).join(", ") || "geen"}`;
  return cap(humanize(raw));
}

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { user, view } = await requireStaff(id);
  if (!view) notFound();
  const live = buildManifest(view);
  const docTitle = (did: string) => view.documents.find((d) => d.id === did)?.title ?? "document";
  return (
    <>
      <Link href={`/notaris/dossiers/${id}`} className="btn btn-ghost btn-sm -ml-2 mb-2"><ArrowLeft className="h-4 w-4" />Terug naar het dossier</Link>
      <div data-tour="n-overdracht">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0"><h1 className="font-serif text-2xl font-semibold text-ink-900">Dossieroverdracht</h1><p className="mt-1 text-sm text-ink-600">Gestructureerd dossier conform het procesdocument (hoofdstuk 11). Juridische compleetheid, Wwft-toereikendheid en gereedheid voor passeren stelt u vast.</p></div>
          <a href={`/api/notaris/${id}/overdracht`} className="btn btn-dark shrink-0"><Download className="h-4 w-4" />Download complete overdracht (ZIP)</a>
        </div>
        <div className="mb-6 grid gap-3 md:grid-cols-2">
          {view.handovers.map((h) => (
            <Card key={h.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
              <PackageCheck className="hidden h-6 w-6 shrink-0 text-brand-600 sm:block" />
              <div className="min-w-0 flex-1"><p className="font-semibold text-ink-900">Overdracht {h.version}</p><p className="text-xs text-ink-500">{h.reason} · {dateTimeNl(h.createdAt)}</p></div>
              <div className="shrink-0">{h.acknowledgedAt ? <Badge tone="ok"><Check className="h-3 w-3" />In behandeling</Badge> : user.role === "notaris" ? <form action={acknowledgeHandover.bind(null, id, h.id)}><button className="btn btn-secondary btn-sm">In behandeling nemen</button></form> : <Badge>Nieuw</Badge>}</div>
            </Card>
          ))}
          {view.handovers.length === 0 && <p className="text-sm text-ink-500 md:col-span-2">Nog geen formele overdracht: deze volgt automatisch zodra de koper zijn stappen heeft afgerond en de concept-akte gereed is. Hieronder ziet u de actuele stand.</p>}
        </div>
        {/* Op kleine schermen gestapeld (onderdeel, status, documenten onder elkaar); vanaf md een tabel. */}
        <Card className="p-0">
          <table className="block w-full text-sm md:table">
            <thead className="hidden border-b border-ink-100 bg-ink-50/60 text-left text-xs font-semibold uppercase tracking-wider text-ink-500 md:table-header-group"><tr><th className="p-4">Onderdeel</th><th className="p-4">Actuele status</th><th className="p-4">Documenten</th></tr></thead>
            <tbody className="block divide-y divide-ink-100 md:table-row-group">
              {live.items.map((i) => (
                <tr key={i.label} className="block px-4 py-3 align-top md:table-row md:p-0"><td className="block font-medium text-ink-900 md:table-cell md:w-[32%] md:p-4">{i.label}</td><td className="mt-1 block text-ink-600 md:mt-0 md:table-cell md:p-4">{displayStatus(view, i.label, i.status)}</td><td className="block md:table-cell md:w-[30%] md:p-4"><div className="mt-1.5 flex flex-col gap-1 md:mt-0">{(i.documentIds ?? []).map((d) => <a key={d} href={`/api/documenten/${d}?inline=1`} target="_blank" className="inline-flex items-start gap-1 text-brand-700 hover:underline"><FileText className="mt-0.5 h-3.5 w-3.5 shrink-0" />{docTitle(d)}</a>)}{(i.documentIds ?? []).length === 0 && <span className="hidden text-ink-300 md:inline">—</span>}</div></td></tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>
      <Card className="mt-6 p-5">
        <CardTitle>Openstaande punten, herinneringen en opmerkingen ({live.openPunten.length})</CardTitle>
        <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm text-ink-700">{live.openPunten.map((p, i) => <li key={i}>{p}</li>)}{live.openPunten.length === 0 && <li>Geen</li>}</ul>
      </Card>
    </>
  );
}
