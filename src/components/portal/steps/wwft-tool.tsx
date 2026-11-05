"use client";

import { useState } from "react";
import { CheckCircle2, CircleDashed, Euro, FileText, Pencil, Plus, Trash2, X, AlertTriangle } from "lucide-react";
import { saveBron, deleteBron } from "@/app/portaal/actions";
import { UploadButton } from "../upload";
import type { WwftBron, WwftBronType } from "@/lib/domain/types";
import type { WwftRule } from "@/lib/domain/settings";
import { cn } from "@/lib/util/format";

type Q = { key: string; label: string; options?: string[]; type?: "text" | "date" };
const SPECIFIC: Record<WwftBronType, Q[]> = {
  spaargeld: [{ key: "opbouw", label: "Hoe heb je het spaargeld opgebouwd?", options: ["Loon of regulier inkomen", "Ondernemingsinkomen", "Verkoop bezittingen of beleggingen", "Eerdere schenking of erfenis", "Anders"] }],
  verkoop_woning: [{ key: "bezit", label: "Welk bezit is of wordt verkocht?", options: ["Woning", "Ander onroerend goed", "Anders"] }, { key: "afgerond", label: "Is de verkoop afgerond en de opbrengst ontvangen?", options: ["Ja", "Nee", "Verkoop nog niet afgerond", "Wel afgerond, nog niet ontvangen"] }],
  schenking: [{ key: "van", label: "Van wie ontvang je de schenking?", options: ["Ouders", "Andere familie", "Partner", "Andere persoon"] }, { key: "relatie", label: "Wat is je relatie tot de schenker? (namen)", type: "text" }, { key: "ontvangen", label: "Is de schenking al ontvangen?", options: ["Ja", "Nee", "Gedeeltelijk"] }, { key: "voorwaarden", label: "Zijn er voorwaarden aan de schenking verbonden?", options: ["Ja", "Nee", "Weet ik niet"] }],
  lening: [{ key: "van", label: "Van wie leen je het bedrag en wat is je relatie tot deze persoon?", type: "text" }, { key: "schriftelijk", label: "Is er een schriftelijke leningsovereenkomst?", options: ["Ja", "Nee"] }, { key: "afspraken", label: "Welke afspraken zijn er over rente, looptijd en aflossing?", type: "text" }, { key: "ontvangen", label: "Heb je het bedrag al ontvangen?", options: ["Ja", "Nee", "Gedeeltelijk"] }],
  erfenis: [{ key: "uitgekeerd", label: "Is de erfenis al uitgekeerd?", options: ["Ja", "Nee", "Gedeeltelijk", "Nee, afwikkeling loopt nog"] }, { key: "verwacht", label: "Wanneer wordt de uitkering verwacht?", type: "date" }],
  onderneming: [{ key: "onderneming", label: "Uit welke onderneming komt het geld?", type: "text" }, { key: "relatie", label: "Wat is je relatie tot de onderneming?", options: ["Eigenaar", "Aandeelhouder", "Bestuurder", "Werknemer", "Anders"] }, { key: "hoe", label: "Hoe wordt het geld privé beschikbaar?", options: ["Salaris of bonus", "Dividend", "Verkoop aandelen", "Opname of uitkering", "Anders"] }, { key: "prive", label: "Is het bedrag al privé beschikbaar?", options: ["Ja", "Nee", "Gedeeltelijk"] }],
  beleggingen: [{ key: "welke", label: "Welke beleggingen of bezittingen zijn verkocht?", type: "text" }, { key: "ontvangen", label: "Is de opbrengst al ontvangen?", options: ["Ja", "Nee", "Gedeeltelijk"] }],
  anders: [{ key: "omschrijving", label: "Wat is de bron?", type: "text" }, { key: "ontvangen", label: "Is het geld al ontvangen?", options: ["Ja", "Nee", "Gedeeltelijk"] }],
};
const GENERAL: { key: keyof WwftBron; label: string; options: [string, string][] }[] = [
  { key: "beschikbaar", label: "Is dit geld al beschikbaar?", options: [["helemaal", "Helemaal"], ["gedeeltelijk", "Gedeeltelijk"], ["nog_niet", "Nog niet"]] },
  { key: "rekening", label: "Op welke rekening staat of komt het geld?", options: [["eigen", "Eigen betaal- of spaarrekening"], ["gezamenlijk", "Gezamenlijke rekening"], ["onderneming", "Ondernemingsrekening"], ["iemand_anders", "Rekening van iemand anders"], ["anders", "Anders"]] },
  { key: "eigenaarGeld", label: "Van wie is het geld op deze rekening?", options: [["mij", "Van mij"], ["mij_en_partner", "Van mij en mijn partner"], ["onderneming", "Van mijn onderneming"], ["derde", "Van een derde"], ["anders", "Anders"]] },
  { key: "overgemaakt", label: "Is het bedrag al overgemaakt naar de rekening voor de aankoop?", options: [["ja", "Ja"], ["nee", "Nee"], ["gedeeltelijk", "Gedeeltelijk"]] },
];

const eur = (n?: number) => (n == null ? "—" : `€ ${n.toLocaleString("nl-NL")}`);

export function WwftTool({ dossierId, bronnen, matrix, docs, indicatie }: { dossierId: string; bronnen: WwftBron[]; matrix: WwftRule[]; docs: { id: string; title: string; meta: Record<string, unknown> }[]; indicatie: number | null }) {
  const [edit, setEdit] = useState<string | "nieuw" | null>(bronnen.length ? null : "nieuw");
  const total = bronnen.reduce((s, b) => s + (b.bedrag ?? 0), 0);
  return (
    <div className="space-y-4" data-tour="wwft-bronnen">
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl bg-white p-4 ring-1 ring-ink-100"><p className="text-xs text-ink-500">Opgegeven eigen middelen</p><p className="mt-1 font-serif text-xl font-semibold text-ink-900 tabular">{eur(total)}</p></div>
        {indicatie == null ? (
          <div className="rounded-xl bg-ink-50 p-4 ring-1 ring-ink-100 sm:col-span-2"><p className="text-xs text-ink-500">Indicatie benodigd eigen geld</p><p className="mt-1 text-sm text-ink-700">Vul eerst stap 4 <a href="woning" className="font-medium text-ink-900 underline underline-offset-2">Woning &amp; financiering</a> in; dan rekenen we uit hoeveel eigen geld je ongeveer nodig hebt.</p></div>
        ) : (
          <>
            <div className="rounded-xl bg-white p-4 ring-1 ring-ink-100"><p className="text-xs text-ink-500">Indicatie benodigd eigen geld</p><p className="mt-1 font-serif text-xl font-semibold text-ink-900 tabular">{eur(Math.round(indicatie))}</p></div>
            <div className={cn("rounded-xl p-4 ring-1", total >= indicatie ? "bg-ok-50 ring-ok-600/15" : "bg-warn-50 ring-warn-600/20")}><p className="text-xs text-ink-500">Verschil</p><p className={cn("mt-1 font-serif text-xl font-semibold tabular", total >= indicatie ? "text-ok-700" : "text-warn-700")}>{total >= indicatie ? "Gedekt" : eur(Math.round(indicatie - total))}</p></div>
          </>
        )}
      </div>
      {bronnen.map((b) => {
        const rule = matrix.find((r) => r.type === b.type);
        const bdocs = docs.filter((d) => b.documentIds.includes(d.id));
        const required = rule?.documenten ?? [];
        const extra = rule?.drempel && (b.bedrag ?? 0) > rule.drempel && rule.aanvullend ? [rule.aanvullend] : [];
        const missing = [...required, ...extra].filter((r) => !bdocs.some((d) => d.meta.documentType === r));
        const overig = bdocs.filter((d) => ![...required, ...extra].includes(d.meta.documentType as string));
        if (edit === b.id) return <BronForm key={b.id} dossierId={dossierId} bron={b} onCancel={() => setEdit(null)} />;
        return (
          <div key={b.id} id={`bron-${b.id}`} className="card p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="flex items-center gap-2 font-semibold text-ink-900"><Euro className="h-4 w-4 text-brand-600" />{rule?.label ?? b.type} · {eur(b.bedrag)}</p>
                <p className="mt-1 text-sm text-ink-500">{[b.details.opbouw, b.details.van, b.details.relatie, b.details.onderneming].filter(Boolean).join(" · ")}</p>
                {(b.eigenaarGeld === "derde" || b.rekening === "iemand_anders" || b.rekening === "onderneming") && <p className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-warn-700"><AlertTriangle className="h-3.5 w-3.5" />Aandachtspunt voor de notaris: geld van een derde of via een onderneming</p>}
              </div>
              <div className="flex gap-1"><button className="btn btn-ghost btn-sm" onClick={() => setEdit(b.id)}><Pencil className="h-4 w-4" />Wijzig</button><form action={deleteBron.bind(null, dossierId, b.id)}><button className="btn btn-ghost btn-sm text-bad-700"><Trash2 className="h-4 w-4" /></button></form></div>
            </div>
            <div className="mt-4 space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-ink-400">Bewijsstukken volgens de documentregels van de notaris</p>
              {[...required, ...extra].map((r) => {
                const have = bdocs.filter((d) => d.meta.documentType === r);
                return (
                  <div key={r} className="flex flex-col gap-2 rounded-xl bg-ink-50 p-3 sm:flex-row sm:items-center sm:justify-between">
                    <span className="flex items-start gap-2 text-sm text-ink-800">{have.length ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-ok-600" /> : <CircleDashed className="mt-0.5 h-4 w-4 shrink-0 text-ink-400" />}<span>{r}{have.map((h) => <span key={h.id} className="block text-xs text-ink-500"><FileText className="mr-1 inline h-3 w-3" />{h.title}</span>)}</span></span>
                    <UploadButton dossierId={dossierId} kind="wwft_bewijs" extra={{ bronId: b.id, documentType: r, title: r }} label={have.length ? "Nog een bestand" : "Upload"} back={`/portaal/${dossierId}/stap/wwft#bron-${b.id}`} />
                  </div>
                );
              })}
              {overig.length > 0 && (
                <div className="rounded-xl bg-ink-50 p-3 text-sm text-ink-800"><p className="text-xs font-semibold text-ink-500">Overige bijlagen bij deze bron</p>{overig.map((h) => <span key={h.id} className="mt-1 flex items-center gap-1.5"><FileText className="h-3.5 w-3.5 shrink-0 text-ink-400" />{h.title}</span>)}</div>
              )}
              {missing.length === 0 && <p className="text-xs font-semibold text-ok-700">Alle gevraagde stukken voor deze bron zijn aangeleverd.</p>}
            </div>
          </div>
        );
      })}
      {edit === "nieuw" ? <BronForm dossierId={dossierId} onCancel={bronnen.length ? () => setEdit(null) : undefined} /> : <button className="btn btn-secondary w-full" onClick={() => setEdit("nieuw")}><Plus className="h-4 w-4" />Geldbron toevoegen</button>}
    </div>
  );
}

function BronForm({ dossierId, bron, onCancel }: { dossierId: string; bron?: WwftBron; onCancel?: () => void }) {
  const [type, setType] = useState<WwftBronType | "">(bron?.type ?? "");
  const TYPES: [WwftBronType, string][] = [["spaargeld", "Spaargeld"], ["verkoop_woning", "Verkoop woning"], ["schenking", "Schenking"], ["lening", "Lening van familie of derde"], ["erfenis", "Erfenis"], ["onderneming", "Geld uit onderneming"], ["beleggingen", "Beleggingen of verkoop daarvan"], ["anders", "Anders"]];
  return (
    <form action={saveBron.bind(null, dossierId)} className="card space-y-4 border-brand-200 p-5">
      {bron && <input type="hidden" name="id" value={bron.id} />}
      <div className="flex items-center justify-between"><p className="font-semibold text-ink-900">{bron ? "Geldbron wijzigen" : "Waar komt het eigen geld vandaan?"}</p>{onCancel && <button type="button" onClick={onCancel} className="text-ink-400 hover:text-ink-700"><X className="h-5 w-5" /></button>}</div>
      <div className="flex flex-wrap gap-2">
        {TYPES.map(([v, l]) => <label key={v} className="cursor-pointer"><input type="radio" name="type" value={v} checked={type === v} onChange={() => setType(v)} className="peer sr-only" required /><span className="btn btn-secondary btn-sm peer-checked:border-ink-900 peer-checked:bg-ink-900 peer-checked:text-white">{l}</span></label>)}
      </div>
      {type && (
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block"><span className="label">Welk bedrag komt uit deze bron? (€)</span><input className="input" name="bedrag" inputMode="numeric" defaultValue={bron?.bedrag?.toLocaleString("nl-NL") ?? ""} required /></label>
          {SPECIFIC[type].map((q) => (
            <label key={q.key} className={cn("block", q.type === "text" && "sm:col-span-2")}>
              <span className="label">{q.label}</span>
              {q.options ? <select className="select" name={`d_${q.key}`} defaultValue={bron?.details[q.key] ?? ""}><option value="">Kies…</option>{q.options.map((o) => <option key={o}>{o}</option>)}</select> : <input className="input" type={q.type === "date" ? "date" : "text"} name={`d_${q.key}`} defaultValue={bron?.details[q.key] ?? ""} />}
            </label>
          ))}
          {GENERAL.map((g) => (
            <label key={g.key} className="block"><span className="label">{g.label}</span><select className="select" name={g.key} defaultValue={(bron?.[g.key] as string) ?? ""} required><option value="">Kies…</option>{g.options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></label>
          ))}
        </div>
      )}
      <div className="flex justify-end"><button className="btn btn-primary" disabled={!type}>Opslaan en bewijsstukken toevoegen</button></div>
    </form>
  );
}
