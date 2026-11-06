import Link from "next/link";
import { Badge, ProgressBar } from "@/components/ui";
import type { Summary } from "@/lib/domain/overview";
import { STATUS_LABEL } from "@/lib/domain/overview";
import { SERVICES } from "@/lib/config";
import { cn, dateNl, propertyLine } from "@/lib/util/format";

export function CheckDots({ s }: { s: Summary }) {
  // Het losse product "koopovereenkomst opstellen" kent geen notariële controles N1–N7.
  if (s.view.data.service === "koopovereenkomst") return <span className="text-xs text-ink-400" title="Koopovereenkomst opstellen: geen akte, controles N1–N7 n.v.t.">n.v.t. (koopovereenkomst)</span>;
  return (
    <span className="inline-flex gap-1">
      {s.checks.map((c) => (
        <span key={c.key} title={`${c.nr} ${c.title}: ${!c.applicable ? "n.v.t." : c.status === "akkoord" ? "akkoord" : c.status === "aanvulling_gevraagd" ? "aanvulling gevraagd" : c.ready ? "klaar voor controle" : "wacht op informatie"}`}
          className={cn("flex h-6 w-7 items-center justify-center rounded-md font-mono text-[10px] font-bold", !c.applicable ? "bg-ink-50 text-ink-300" : c.status === "akkoord" ? "bg-ok-600 text-white" : c.status === "aanvulling_gevraagd" ? "bg-warn-100 text-warn-700 ring-1 ring-warn-600/30" : c.ready ? "bg-brand-600 text-white" : "bg-ink-100 text-ink-500")}>
          {c.nr}
        </span>
      ))}
    </span>
  );
}

export function PipelineTable({ rows, base }: { rows: Summary[]; base: "notaris" | "beheer" }) {
  return (
    <>
    <p className="mb-2 text-xs text-ink-500 lg:hidden">Schuif de tabel opzij voor passeerdatum, klanten, controles en signalen.</p>
    <div className="card overflow-x-auto p-0">
      <table className="w-full min-w-[56rem] text-sm">
        <thead className="border-b border-ink-100 bg-ink-50/60 text-left text-xs font-semibold uppercase tracking-wider text-ink-500">
          <tr><th className="p-4">Dossier</th><th className="p-4">Fase</th><th className="p-4">Passeren</th><th className="p-4">Klanten</th><th className="p-4">Controles N1–N7</th><th className="p-4">Signalen</th></tr>
        </thead>
        <tbody className="divide-y divide-ink-100">
          {rows.map((s) => {
            const d = s.view.data;
            return (
              <tr key={s.view.dossier.id} className="hover:bg-ink-50/50">
                <td className="min-w-[15rem] p-4"><Link href={`/${base}/dossiers/${s.view.dossier.id}`} className="block"><span className="font-semibold text-ink-900 hover:text-brand-700">{propertyLine(d.property) || "(adres volgt)"}</span><span className="mt-0.5 flex flex-wrap gap-x-3 text-xs text-ink-500"><span>{s.view.dossier.reference}</span><span>{SERVICES[d.service].short}</span><span>{s.view.kopers.map((k) => k.displayName).join(", ") || "–"}</span></span></Link></td>
                <td className="p-4"><Badge tone={s.view.dossier.status === "afgewikkeld" ? "ok" : s.view.dossier.status === "gereed_voor_passeren" ? "brand" : s.view.dossier.status === "wacht_op_ko" ? "warn" : "neutral"}>{STATUS_LABEL[s.view.dossier.status]}</Badge></td>
                <td className="p-4 whitespace-nowrap">{d.service === "koopovereenkomst" ? <span className="text-xs text-ink-400">geen passering</span> : <><span className="font-medium text-ink-900">{dateNl(d.transaction.leveringsdatum, { short: true })}</span>{s.daysToPassing !== undefined && s.daysToPassing >= 0 && <span className={cn("block text-xs", s.daysToPassing <= 7 ? "font-semibold text-warn-700" : "text-ink-500")}>over {s.daysToPassing} dagen</span>}</>}</td>
                <td className="p-4"><div className="w-32 space-y-1.5"><div className="flex items-center gap-2 text-xs text-ink-500"><span className="w-12">Koper</span><ProgressBar pct={s.koperPct} tone="koper" className="h-1.5" /></div>{s.view.verkopers.length > 0 && <div className="flex items-center gap-2 text-xs text-ink-500"><span className="w-12">Verk.</span><ProgressBar pct={s.verkoperPct} tone="verkoper" className="h-1.5" /></div>}</div></td>
                <td className="p-4"><CheckDots s={s} /></td>
                <td className="p-4">{s.signals.length ? <Badge tone={s.signals.some((x) => x.ernst === "kritiek") ? "bad" : "warn"}>{s.signals.length} open</Badge> : <span className="text-xs text-ink-400">–</span>}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
    </>
  );
}
