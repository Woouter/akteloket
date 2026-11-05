"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Check, CheckCircle2, ChevronDown, FileText, FileUp, Info, Landmark, Layers, Loader2, Lock, Plus, ScanLine, FileSignature, Trash2, Sparkles, Download, Eye, AlertTriangle, PenLine } from "lucide-react";
import { cn } from "@/lib/util/format";
import { AddressSearch } from "./address";
import { RField, type FState } from "./fields";
import type { ReviewPayload } from "@/lib/domain/aanvraag";
import type { DvoSection } from "@/lib/docgen/dvo";
import { appendFile } from "@/lib/client/upload";

type Service = "beide" | "levering" | "hypotheek";
type Step = "dienst" | "upload" | "scan" | "controle" | "handmatig" | "afronden";
type Model = ReviewPayload["model"];
type Party = Model["parties"][number];

const SERVICE_CARDS: { key: Service; title: string; text: string; price: number; icon: typeof Layers; badge?: string }[] = [
  { key: "beide", title: "Leveringsakte + hypotheekakte", text: "Je koopt een woning met een hypotheek.", price: 895, icon: Layers, badge: "Meest gekozen" },
  { key: "levering", title: "Alleen leveringsakte", text: "Je koopt zonder hypotheek (of de hypotheek loopt elders).", price: 649, icon: FileSignature },
  { key: "hypotheek", title: "Alleen hypotheekakte", text: "Bijvoorbeeld bij oversluiten of verhogen.", price: 449, icon: Landmark },
];

const SCAN_STAGES = ["Bestand controleren (type, leesbaarheid, pagina's)", "Tekst herkennen", "Partijen herkennen: kopers en verkopers", "Woning en kadastrale aanduiding", "Koopprijs, data en waarborgsom", "Ontbindende voorwaarden en bijzondere bepalingen"];

export function AanvraagFlow({ initialService, demo, dvo, checks }: { initialService?: Service; demo: boolean; dvo: Record<Service, DvoSection[]>; checks: readonly { key: string; label: string }[] }) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("dienst");
  const [service, setService] = useState<Service>(initialService ?? "beide");
  const [hasKo, setHasKo] = useState<"ja" | "nee">("ja");
  const [payload, setPayload] = useState<ReviewPayload | null>(null);
  const [model, setModel] = useState<Model | null>(null);
  const [scan, setScan] = useState<{ method: string; pages: number; missing: string[]; uncertain: string[]; warnings: string[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [stage, setStage] = useState(0);
  const top = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/aanvraag/state").then((r) => r.json()).then((j) => {
      if (j.draft) {
        setPayload(j.draft);
        setModel(j.draft.model);
        setService(j.draft.service);
        if (j.draft.hasDocument) setStep("controle");
      }
    }).catch(() => undefined);
  }, []);

  useEffect(() => { top.current?.scrollIntoView({ behavior: "smooth", block: "start" }); }, [step]);

  async function start() {
    setError(null);
    setBusy(true);
    const r = await fetch("/api/aanvraag/start", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ service }) });
    setBusy(false);
    if (!r.ok) { setError((await r.json()).error); return; }
    setStep(service === "hypotheek" || hasKo === "nee" ? "handmatig" : "upload");
  }

  async function upload(file: File | "demo") {
    setError(null);
    setStep("scan");
    setStage(0);
    const iv = window.setInterval(() => setStage((s) => Math.min(s + 1, SCAN_STAGES.length - 1)), 650);
    const minWait = new Promise((r) => setTimeout(r, SCAN_STAGES.length * 650 + 200));
    let res: Response;
    if (file === "demo") res = await fetch("/api/aanvraag/upload", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ demo: true }) });
    else {
      const fd = new FormData();
      try { await appendFile(fd, file); } catch (e) { window.clearInterval(iv); setError(String((e as Error).message)); setStep("upload"); return; }
      res = await fetch("/api/aanvraag/upload", { method: "POST", body: fd });
    }
    await minWait;
    window.clearInterval(iv);
    const j = await res.json();
    if (!res.ok) { setError(j.error); setStep("upload"); return; }
    setScan(j.scan);
    setPayload(j.payload);
    setModel(j.payload.model);
    setStage(SCAN_STAGES.length);
    setTimeout(() => setStep("controle"), 450);
  }

  async function saveReview() {
    if (!model) return;
    setError(null);
    setBusy(true);
    const r = await fetch("/api/aanvraag/review", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(model) });
    setBusy(false);
    const j = await r.json();
    if (!r.ok) { setError(j.error); return; }
    setPayload(j.payload);
    setStep("afronden");
  }

  const steps: [Step[], string][] = [[["dienst"], "Dienst"], [["upload", "scan", "handmatig"], service === "hypotheek" ? "Woning" : "Koopovereenkomst"], [["controle"], "Controleren"], [["afronden"], "Afronden"]];
  const activeIdx = steps.findIndex(([s]) => s.includes(step));

  return (
    <div ref={top} className="scroll-mt-24">
      <ol className="mb-8 flex items-center gap-2 text-sm" aria-label="Voortgang">
        {steps.filter(([, l]) => !(l === "Controleren" && (service === "hypotheek" || hasKo === "nee"))).map(([s, l], i) => {
          const idx = steps.findIndex(([x]) => x === s);
          const done = idx < activeIdx;
          const act = idx === activeIdx;
          return (
            <li key={l} className="flex flex-1 items-center gap-2">
              <span className={cn("flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold", done ? "bg-ok-600 text-white" : act ? "bg-brand-600 text-white" : "bg-ink-100 text-ink-500")}>{done ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : i + 1}</span>
              <span className={cn("hidden font-medium sm:inline", act ? "text-ink-900" : "text-ink-500")}>{l}</span>
              {i < 3 && <span className="h-px flex-1 bg-ink-200" />}
            </li>
          );
        })}
      </ol>

      {error && <div className="mb-6 flex items-start gap-2 rounded-xl border border-bad-100 bg-bad-50 p-4 text-sm text-bad-700"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />{error}</div>}

      {step === "dienst" && (
        <section data-tour="aanvraag-dienst">
          <h1 className="text-3xl font-extrabold tracking-tight text-ink-900 sm:text-4xl">Welke notariële dienstverlening wil je regelen?</h1>
          <p className="mt-3 text-lg text-ink-600">Het formulier past zich aan op je keuze. Je kunt dit later nog wijzigen.</p>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {SERVICE_CARDS.map((c) => (
              <button key={c.key} type="button" onClick={() => setService(c.key)} className={cn("relative flex flex-col rounded-2xl border-2 bg-white p-5 text-left transition", service === c.key ? "border-brand-500 shadow-[0_0_0_4px_rgb(31_63_110/0.12)]" : "border-ink-100 hover:border-ink-200")} aria-pressed={service === c.key}>
                {c.badge && <span className="absolute -top-2.5 right-4 chip bg-brand-600 text-white">{c.badge}</span>}
                <span className="flex items-center justify-between"><span className={cn("flex h-10 w-10 items-center justify-center rounded-xl", service === c.key ? "bg-brand-600 text-white" : "bg-ink-50 text-ink-600")}><c.icon className="h-5 w-5" /></span><span className={cn("flex h-5 w-5 items-center justify-center rounded-full border-2", service === c.key ? "border-brand-600 bg-brand-600" : "border-ink-300")}>{service === c.key && <Check className="h-3 w-3 text-white" strokeWidth={3} />}</span></span>
                <span className="mt-4 font-bold text-ink-900">{c.title}</span>
                <span className="mt-1 flex-1 text-sm text-ink-600">{c.text}</span>
                <span className="mt-4 font-serif text-xl font-semibold text-ink-900 tabular">€ {c.price} <span className="text-xs font-medium text-ink-500">all-in</span></span>
              </button>
            ))}
          </div>
          {service !== "hypotheek" && (
            <div className="mt-8 rounded-2xl border border-ink-100 bg-white p-5">
              <p className="font-semibold text-ink-900">Heb je een door alle betrokken partijen getekende koopovereenkomst?</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {(["ja", "nee"] as const).map((v) => <button key={v} type="button" onClick={() => setHasKo(v)} className={cn("btn btn-sm", hasKo === v ? "btn-dark" : "btn-secondary")}>{v === "ja" ? "Ja, ik heb hem" : "Nee, nog niet"}</button>)}
              </div>
              <p className="mt-3 text-sm text-ink-500">{hasKo === "ja" ? "Zodra je hem uploadt, starten we met je dossier en halen we de gegevens automatisch uit de overeenkomst." : "Geen probleem. Je kunt de dienstverleningsovereenkomst al accepteren; je dossier wacht dan op de getekende koopovereenkomst."}</p>
            </div>
          )}
          <div className="mt-8 flex justify-end"><button className="btn btn-primary btn-lg" onClick={start} disabled={busy}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}Verder <ArrowRight className="h-4 w-4" /></button></div>
        </section>
      )}

      {step === "upload" && <UploadStep demo={demo} onFile={upload} onBack={() => setStep("dienst")} onNoKo={() => { setHasKo("nee"); setStep("handmatig"); }} />}

      {step === "scan" && (
        <section className="mx-auto max-w-xl py-6 text-center">
          <div className="relative mx-auto h-40 w-32 overflow-hidden rounded-lg bg-white p-3 shadow-lift ring-1 ring-ink-100">
            {Array.from({ length: 14 }).map((_, i) => <div key={i} className="mt-1.5 h-[4px] rounded bg-ink-100" style={{ width: `${55 + ((i * 41) % 45)}%` }} />)}
            <div className="absolute inset-x-0 top-0 h-1/3 animate-scan bg-gradient-to-b from-transparent via-brand-400/25 to-brand-500/50" />
          </div>
          <h2 className="mt-8 text-2xl font-bold text-ink-900">We lezen je koopovereenkomst…</h2>
          <ul className="mx-auto mt-6 max-w-sm space-y-2.5 text-left text-sm">
            {SCAN_STAGES.map((s, i) => (
              <li key={s} className={cn("flex items-center gap-3 transition", i <= stage ? "text-ink-800" : "text-ink-300")}>
                {i < stage ? <CheckCircle2 className="h-4.5 w-4.5 text-ok-600" /> : i === stage ? <Loader2 className="h-4.5 w-4.5 animate-spin text-brand-600" /> : <span className="h-4.5 w-4.5 rounded-full border-2 border-ink-200" />}{s}
              </li>
            ))}
          </ul>
        </section>
      )}

      {step === "controle" && model && payload && (
        <ReviewStep payload={payload} model={model} setModel={setModel} scan={scan} busy={busy} onBack={() => setStep("upload")} onNext={saveReview} />
      )}

      {step === "handmatig" && <ManualStep service={service} onBack={() => setStep(service === "hypotheek" ? "dienst" : "upload")} onDone={(p) => { setPayload(p); setModel(p.model); setStep("afronden"); }} setError={setError} />}

      {step === "afronden" && payload && <FinishStep payload={payload} service={service} dvo={dvo[service]} checks={checks} onBack={() => setStep(payload.hasDocument ? "controle" : "handmatig")} onDone={(url) => window.location.assign(url)} setError={setError} />}
    </div>
  );
}

function UploadStep({ demo, onFile, onBack, onNoKo }: { demo: boolean; onFile: (f: File | "demo") => void; onBack: () => void; onNoKo: () => void }) {
  const [drag, setDrag] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  return (
    <section>
      <h1 className="text-3xl font-extrabold tracking-tight text-ink-900 sm:text-4xl">Upload je getekende koopovereenkomst</h1>
      <p className="mt-3 text-lg text-ink-600">Upload de volledige overeenkomst, inclusief alle bijlagen en eventuele aanvullingen. Wij halen de gegevens er automatisch uit.</p>
      <div data-tour="aanvraag-upload" onDragOver={(e) => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)} onDrop={(e) => { e.preventDefault(); setDrag(false); const f = e.dataTransfer.files[0]; if (f) onFile(f); }}
        className={cn("mt-8 flex flex-col items-center rounded-3xl border-2 border-dashed px-6 py-14 text-center transition", drag ? "border-brand-500 bg-brand-50" : "border-ink-200 bg-white")}>
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-600"><FileUp className="h-7 w-7" /></span>
        <p className="mt-5 text-lg font-semibold text-ink-900">Sleep je bestand hierheen</p>
        <p className="mt-1 text-sm text-ink-500">PDF, of foto's (JPG/PNG) · maximaal 25 MB</p>
        <button type="button" className="btn btn-primary mt-6" onClick={() => input.current?.click()}><FileUp className="h-4 w-4" />Kies bestand</button>
        <input ref={input} type="file" accept="application/pdf,image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); }} />
        <p className="mt-6 flex items-center gap-1.5 text-xs text-ink-500"><Lock className="h-3.5 w-3.5" />Versleuteld opgeslagen · alleen zichtbaar voor jou, de notaris en ons dossierteam</p>
      </div>
      {demo && (
        <div className="mt-5 flex flex-col items-start justify-between gap-4 rounded-2xl border border-notaris-100 bg-notaris-50 p-5 sm:flex-row sm:items-center" data-tour="aanvraag-demo-ko">
          <div className="flex gap-3"><Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-notaris-600" /><div><p className="font-semibold text-ink-900">Demo: probeer de scanner</p><p className="text-sm text-ink-600">Gebruik de fictieve koopovereenkomst van Bloesemlaan 14, of download hem en upload hem zelf.</p></div></div>
          <div className="flex shrink-0 gap-2"><a href="/api/demo/koopovereenkomst" className="btn btn-secondary btn-sm"><Download className="h-4 w-4" />Download</a><button type="button" className="btn btn-dark btn-sm" onClick={() => onFile("demo")}><ScanLine className="h-4 w-4" />Gebruik voorbeeld</button></div>
        </div>
      )}
      <div className="mt-8 flex flex-col-reverse items-start justify-between gap-4 sm:flex-row sm:items-center">
        <button className="btn btn-ghost" onClick={onBack}><ArrowLeft className="h-4 w-4" />Terug</button>
        <button className="text-sm font-semibold text-brand-700 underline underline-offset-4" onClick={onNoKo}>Ik heb nog geen getekende koopovereenkomst</button>
      </div>
    </section>
  );
}

const STAAT: [string, string][] = [["ongehuwd", "Ongehuwd"], ["gehuwd", "Gehuwd"], ["geregistreerd_partner", "Geregistreerd partnerschap"], ["gescheiden", "Gescheiden"], ["weduwe", "Weduwe of weduwnaar"]];
const num = (v: string) => { const n = Number(v.replace(/[^\d,.-]/g, "").replace(/\./g, "").replace(",", ".")); return v.trim() === "" || Number.isNaN(n) ? undefined : n; };
const fmtNum = (n?: number) => (n == null ? "" : n.toLocaleString("nl-NL"));

function ReviewStep({ payload, model, setModel, scan, busy, onBack, onNext }: { payload: ReviewPayload; model: Model; setModel: (m: Model) => void; scan: { method: string; pages: number; missing: string[]; uncertain: string[]; warnings: string[] } | null; busy: boolean; onBack: () => void; onNext: () => void }) {
  const [showDoc, setShowDoc] = useState(false);
  const m = payload.meta as Record<string, FState>;
  const setP = (k: keyof Model["property"], v: string) => setModel({ ...model, property: { ...model.property, [k]: v || undefined } });
  const setK = (k: "gemeente" | "sectie" | "perceel", v: string) => setModel({ ...model, property: { ...model.property, kadastraal: { ...model.property.kadastraal, [k]: v || undefined } } });
  const setT = (k: keyof Model["transaction"], v: string | number | undefined) => setModel({ ...model, transaction: { ...model.transaction, [k]: v === "" ? undefined : v } });
  const setParty = (i: number, patch: Partial<Party["person"]>, email?: string) => setModel({ ...model, parties: model.parties.map((p, j) => (j === i ? { ...p, person: { ...p.person, ...patch }, email: email ?? p.email } : p)) });
  const addParty = (side: "koper" | "verkoper") => setModel({ ...model, parties: [...model.parties, { side, person: {} }] });
  const removeParty = (i: number) => setModel({ ...model, parties: model.parties.filter((_, j) => j !== i) });
  const counts = Object.values(m).reduce((acc, f) => { if (f) acc[f.state] = (acc[f.state] ?? 0) + 1; return acc; }, {} as Record<string, number>);
  const pm = (p: Party, k: string): FState => (p.id ? m[`party.${p.id}.${k}`] : { state: "manual" });

  return (
    <section>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-ink-900 sm:text-4xl">Controleer wat we hebben gevonden</h1>
          <p className="mt-3 text-lg text-ink-600">Pas aan wat niet klopt en vul aan wat ontbreekt. Het originele document blijft altijd leidend.</p>
        </div>
        <button type="button" className="btn btn-secondary shrink-0" onClick={() => setShowDoc((s) => !s)}><Eye className="h-4 w-4" />{showDoc ? "Verberg origineel" : "Bekijk origineel"}</button>
      </div>
      <div className="mt-6 flex flex-wrap gap-2 text-sm">
        <span className="chip bg-ok-100 text-ok-700"><CheckCircle2 className="h-3.5 w-3.5" />{counts.extracted ?? 0} gegevens uitgelezen</span>
        {(counts.uncertain ?? 0) > 0 && <span className="chip bg-warn-100 text-warn-700"><AlertTriangle className="h-3.5 w-3.5" />{counts.uncertain} te controleren</span>}
        {(counts.missing ?? 0) > 0 && <span className="chip bg-bad-100 text-bad-700">{counts.missing} aan te vullen</span>}
        {scan && <span className="chip bg-ink-100 text-ink-600"><ScanLine className="h-3.5 w-3.5" />{scan.pages} pagina's · {scan.method === "ai" ? "AI-herkenning" : "regelgebaseerde herkenning"}</span>}
      </div>
      {scan?.warnings?.map((w) => <p key={w} className="mt-3 flex items-start gap-2 rounded-xl bg-warn-50 p-3 text-sm text-warn-700"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />{w}</p>)}

      <div className={cn("mt-8 grid gap-8", showDoc && "lg:grid-cols-[1.1fr_0.9fr]")}>
        <div className="space-y-6">
          <div className="card p-6">
            <h2 className="flex items-center gap-2 text-lg font-bold text-ink-900"><FileText className="h-5 w-5 text-brand-600" />De woning</h2>
            <div className="mt-5 grid gap-4 sm:grid-cols-6">
              <RField className="sm:col-span-4" label="Straat" value={model.property.straat} onChange={(v) => setP("straat", v)} s={m["property.straat"]} />
              <RField className="sm:col-span-2" label="Huisnummer" value={model.property.huisnummer} onChange={(v) => setP("huisnummer", v)} s={m["property.huisnummer"]} />
              <RField className="sm:col-span-2" label="Postcode" value={model.property.postcode} onChange={(v) => setP("postcode", v)} s={m["property.postcode"]} />
              <RField className="sm:col-span-4" label="Plaats" value={model.property.plaats} onChange={(v) => setP("plaats", v)} s={m["property.plaats"]} />
              <RField className="sm:col-span-2" label="Kadastrale gemeente" value={model.property.kadastraal?.gemeente} onChange={(v) => setK("gemeente", v)} s={m["property.kadastraal.gemeente"]} />
              <RField className="sm:col-span-2" label="Sectie" value={model.property.kadastraal?.sectie} onChange={(v) => setK("sectie", v)} s={m["property.kadastraal.sectie"]} />
              <RField className="sm:col-span-2" label="Perceelnummer" value={model.property.kadastraal?.perceel} onChange={(v) => setK("perceel", v)} s={m["property.kadastraal.perceel"]} />
            </div>
            <p className="hint mt-3">Weet je de kadastrale aanduiding niet? Laat het leeg — wij zoeken hem op.</p>
          </div>

          <div className="card p-6">
            <h2 className="text-lg font-bold text-ink-900">De koop</h2>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <RField label="Koopprijs (€)" inputMode="numeric" value={fmtNum(model.transaction.koopprijs)} onChange={(v) => setT("koopprijs", num(v))} s={m["transaction.koopprijs"]} />
              <RField label="Roerende zaken (€)" inputMode="numeric" value={fmtNum(model.transaction.roerendeZaken)} onChange={(v) => setT("roerendeZaken", num(v))} s={m["transaction.roerendeZaken"]} />
              <RField label="Datum ondertekening" type="date" value={model.transaction.datumOndertekening} onChange={(v) => setT("datumOndertekening", v)} s={m["transaction.datumOndertekening"]} />
              <RField label="Leveringsdatum (overdracht)" type="date" value={model.transaction.leveringsdatum} onChange={(v) => setT("leveringsdatum", v)} s={m["transaction.leveringsdatum"]} />
              <RField label="Waarborgsom of bankgarantie (€)" inputMode="numeric" value={fmtNum(model.transaction.waarborgsomBedrag)} onChange={(v) => setT("waarborgsomBedrag", num(v))} s={m["transaction.waarborgsomBedrag"]} />
            </div>
            {(payload.voorbehouden.length > 0 || payload.bijzondereBepalingen.length > 0 || payload.notaris) && (
              <div className="mt-6 space-y-3 rounded-xl bg-ink-50 p-4 text-sm">
                {payload.notaris && <p><span className="text-ink-500">Notaris in koopovereenkomst:</span> <strong className="text-ink-900">{payload.notaris}</strong></p>}
                {payload.voorbehouden.length > 0 && <div><p className="text-ink-500">Ontbindende voorwaarden — wij bewaken deze termijnen</p><ul className="mt-1 space-y-1">{payload.voorbehouden.map((v) => <li key={v.omschrijving} className="flex justify-between gap-4 font-medium text-ink-800"><span>{v.omschrijving}</span><span className="tabular text-ink-600">{v.datum ? new Date(v.datum + "T12:00").toLocaleDateString("nl-NL", { day: "numeric", month: "short", year: "numeric" }) : "—"}</span></li>)}</ul></div>}
                {payload.bijzondereBepalingen.length > 0 && <div><p className="text-ink-500">Bijzondere bepalingen — de notaris beoordeelt deze</p><ul className="mt-1 flex flex-wrap gap-1.5">{payload.bijzondereBepalingen.map((b) => <li key={b.titel} className="chip bg-white text-ink-700 ring-1 ring-ink-200">{b.titel}</li>)}</ul></div>}
              </div>
            )}
          </div>

          {(["koper", "verkoper"] as const).map((side) => (
            <div key={side} className="card p-6">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-ink-900">{side === "koper" ? "Koper(s)" : "Verkoper(s)"}</h2>
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => addParty(side)}><Plus className="h-4 w-4" />{side === "koper" ? "Koper" : "Verkoper"} toevoegen</button>
              </div>
              <p className="mt-1 text-sm text-ink-500">{side === "koper" ? "Bij meerdere kopers krijgt ieder een eigen profiel voor de persoonlijke stappen." : "De verkoper(s) krijgen een eigen uitnodiging. Ze zien jouw gegevens niet."}</p>
              <div className="mt-5 space-y-5">
                {model.parties.map((p, i) => p.side !== side ? null : (
                  <div key={p.id ?? i} className={cn("rounded-2xl border p-4", side === "koper" ? "border-koper-100 bg-koper-50/40" : "border-verkoper-100 bg-verkoper-50/40")}>
                    <div className="mb-3 flex items-center justify-between">
                      <p className="text-sm font-semibold text-ink-800">{side === "koper" ? "Koper" : "Verkoper"} {model.parties.filter((x, j) => x.side === side && j <= i).length}</p>
                      <button type="button" className="text-ink-400 hover:text-bad-600" onClick={() => removeParty(i)} aria-label="Verwijderen"><Trash2 className="h-4 w-4" /></button>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <RField label="Voornamen (voluit)" value={p.person.voornamen} onChange={(v) => setParty(i, { voornamen: v })} s={pm(p, "voornamen")} />
                      <RField label="Achternaam" value={p.person.achternaam} onChange={(v) => setParty(i, { achternaam: v })} s={pm(p, "achternaam")} />
                      <RField label="Geboortedatum" type="date" value={p.person.geboortedatum} onChange={(v) => setParty(i, { geboortedatum: v })} s={pm(p, "geboortedatum")} />
                      <RField label="Geboorteplaats" value={p.person.geboorteplaats} onChange={(v) => setParty(i, { geboorteplaats: v })} s={pm(p, "geboorteplaats")} />
                      {side === "koper" ? (
                        <>
                          <RField label="Huidig adres" value={p.person.adres} onChange={(v) => setParty(i, { adres: v })} s={pm(p, "adres")} />
                          <RField label="Burgerlijke staat" value={p.person.burgerlijkeStaat} onChange={(v) => setParty(i, { burgerlijkeStaat: (v || undefined) as Party["person"]["burgerlijkeStaat"] })} s={pm(p, "burgerlijkeStaat")} options={STAAT} />
                        </>
                      ) : (
                        <RField className="sm:col-span-2" label="E-mailadres (voor de uitnodiging)" type="email" value={p.email} onChange={(v) => setParty(i, {}, v)} s={p.email ? { state: p.id && pm(p, "voornamen")?.state === "extracted" ? "extracted" : "manual" } : { state: "missing" }} placeholder="Weet je het niet? Dan vragen we het via de makelaar" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        {showDoc && payload.hasDocument && (
          <div className="lg:sticky lg:top-24 lg:self-start">
            <div className="card overflow-hidden p-0"><iframe title="Originele koopovereenkomst" src="/api/aanvraag/document#view=FitH" className="h-[75vh] w-full" /></div>
          </div>
        )}
      </div>
      <div className="mt-8 flex flex-col-reverse justify-between gap-3 sm:flex-row">
        <button className="btn btn-ghost" onClick={onBack}><ArrowLeft className="h-4 w-4" />Ander bestand</button>
        <button className="btn btn-primary btn-lg" onClick={onNext} disabled={busy}>{busy && <Loader2 className="h-4 w-4 animate-spin" />}Gegevens kloppen, verder <ArrowRight className="h-4 w-4" /></button>
      </div>
    </section>
  );
}

function ManualStep({ service, onBack, onDone, setError }: { service: Service; onBack: () => void; onDone: (p: ReviewPayload) => void; setError: (e: string | null) => void }) {
  const [f, setF] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const set = (k: string, v: string) => setF((x) => ({ ...x, [k]: v }));
  async function submit() {
    setBusy(true);
    setError(null);
    const body = { ...f, koopprijs: f.koopprijs ? num(f.koopprijs) : undefined, leveringsdatum: f.leveringsdatum || undefined };
    const r = await fetch("/api/aanvraag/manual", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    setBusy(false);
    const j = await r.json();
    if (!r.ok) { setError(j.error); return; }
    onDone(j.payload);
  }
  return (
    <section>
      <h1 className="text-3xl font-extrabold tracking-tight text-ink-900 sm:text-4xl">{service === "hypotheek" ? "Om welke woning gaat het?" : "Een paar gegevens om te beginnen"}</h1>
      <p className="mt-3 text-lg text-ink-600">{service === "hypotheek" ? "We zoeken de kadastrale gegevens automatisch op." : "Zodra je de getekende koopovereenkomst uploadt, vullen we de rest automatisch aan. Je dossier krijgt de status ‘Wachten op getekende koopovereenkomst’."}</p>
      <div className="card mt-8 space-y-5 p-6">
        <div><span className="label">Adres van de woning</span><AddressSearch onPick={(a) => setF((x) => ({ ...x, straat: a.straat, huisnummer: a.huisnummer, toevoeging: a.toevoeging ?? "", postcode: a.postcode, plaats: a.plaats, perceel: a.perceel ?? "" }))} /></div>
        <div className="grid gap-4 sm:grid-cols-6">
          <label className="sm:col-span-3"><span className="label">Straat</span><input className="input" value={f.straat ?? ""} onChange={(e) => set("straat", e.target.value)} /></label>
          <label className="sm:col-span-1"><span className="label">Nr.</span><input className="input" value={f.huisnummer ?? ""} onChange={(e) => set("huisnummer", e.target.value)} /></label>
          <label className="sm:col-span-2"><span className="label">Toevoeging</span><input className="input" value={f.toevoeging ?? ""} onChange={(e) => set("toevoeging", e.target.value)} /></label>
          <label className="sm:col-span-2"><span className="label">Postcode</span><input className="input" value={f.postcode ?? ""} onChange={(e) => set("postcode", e.target.value)} /></label>
          <label className="sm:col-span-4"><span className="label">Plaats</span><input className="input" value={f.plaats ?? ""} onChange={(e) => set("plaats", e.target.value)} /></label>
        </div>
        {f.perceel && <p className="flex items-center gap-2 text-sm text-ok-700"><CheckCircle2 className="h-4 w-4" />Kadastraal perceel gevonden: <strong>{f.perceel}</strong></p>}
        <div className="grid gap-4 sm:grid-cols-2">
          <label><span className="label">Je voornamen</span><input className="input" value={f.koperVoornamen ?? ""} onChange={(e) => set("koperVoornamen", e.target.value)} /></label>
          <label><span className="label">Je achternaam</span><input className="input" value={f.koperAchternaam ?? ""} onChange={(e) => set("koperAchternaam", e.target.value)} /></label>
          {service !== "hypotheek" && <label><span className="label">Verwachte koopprijs (€) <span className="font-normal text-ink-400">optioneel</span></span><input className="input" inputMode="numeric" value={f.koopprijs ?? ""} onChange={(e) => set("koopprijs", e.target.value)} /></label>}
          <label><span className="label">{service === "hypotheek" ? "Gewenste passeerdatum" : "Verwachte leveringsdatum"} <span className="font-normal text-ink-400">optioneel</span></span><input className="input" type="date" value={f.leveringsdatum ?? ""} onChange={(e) => set("leveringsdatum", e.target.value)} /></label>
          {service !== "hypotheek" && <label><span className="label">Naam verkoper <span className="font-normal text-ink-400">optioneel</span></span><input className="input" value={f.verkoper ?? ""} onChange={(e) => set("verkoper", e.target.value)} /></label>}
          {service !== "levering" && <label><span className="label">Geldverstrekker <span className="font-normal text-ink-400">optioneel</span></span><input className="input" value={f.geldverstrekker ?? ""} onChange={(e) => set("geldverstrekker", e.target.value)} placeholder="Bijv. je bank" /></label>}
        </div>
      </div>
      <div className="mt-8 flex justify-between gap-3">
        <button className="btn btn-ghost" onClick={onBack}><ArrowLeft className="h-4 w-4" />Terug</button>
        <button className="btn btn-primary btn-lg" onClick={submit} disabled={busy || !f.straat || !f.postcode}>{busy && <Loader2 className="h-4 w-4 animate-spin" />}Verder <ArrowRight className="h-4 w-4" /></button>
      </div>
    </section>
  );
}

function FinishStep({ payload, service, dvo, checks, onBack, onDone, setError }: { payload: ReviewPayload; service: Service; dvo: DvoSection[]; checks: readonly { key: string; label: string }[]; onBack: () => void; onDone: (url: string) => void; setError: (e: string | null) => void }) {
  const first = payload.model.parties.find((p) => p.side === "koper");
  const [f, setF] = useState({ name: [first?.person.voornamen, first?.person.achternaam].filter(Boolean).join(" "), email: first?.email ?? "", phone: "", adres: [first?.person.adres, first?.person.postcode, first?.person.woonplaats].filter(Boolean).join(", "), rol: "koper" as "koper" | "mede_koper" | "vertegenwoordiger", signatureName: "" });
  const [checked, setChecked] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const price = SERVICE_CARDS.find((c) => c.key === service)!;
  async function submit() {
    setBusy(true);
    setError(null);
    const r = await fetch("/api/aanvraag/afronden", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...f, checks: checked }) });
    const j = await r.json();
    if (!r.ok) { setBusy(false); setError(j.error); return; }
    onDone(j.redirect);
  }
  const ready = checks.every((c) => checked.includes(c.key)) && f.signatureName.trim().length > 3 && f.email && f.phone && f.name;
  return (
    <section>
      <h1 className="text-3xl font-extrabold tracking-tight text-ink-900 sm:text-4xl">Bijna klaar: je gegevens en akkoord</h1>
      <p className="mt-3 text-lg text-ink-600">Hierna open je direct je persoonlijke portaal. We sturen je ook een e-mail met een inloglink.</p>
      <div className="mt-8 grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-6">
          <div className="card p-6">
            <h2 className="text-lg font-bold text-ink-900">Contactgegevens</h2>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <label className="sm:col-span-2"><span className="label">Volledige naam zoals op je identiteitsbewijs</span><input className="input" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} autoComplete="name" /></label>
              <label><span className="label">E-mailadres</span><input className="input" type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} autoComplete="email" /></label>
              <label><span className="label">Telefoonnummer</span><input className="input" type="tel" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} autoComplete="tel" /></label>
              <label className="sm:col-span-2"><span className="label">Huidig woonadres</span><input className="input" value={f.adres} onChange={(e) => setF({ ...f, adres: e.target.value })} autoComplete="street-address" /></label>
              <div className="sm:col-span-2"><span className="label">Wat is je rol bij deze aanvraag?</span>
                <div className="flex flex-wrap gap-2">{([["koper", "Koper"], ["mede_koper", "Mede-koper"], ["vertegenwoordiger", "Vertegenwoordiger"]] as const).map(([v, l]) => <button key={v} type="button" onClick={() => setF({ ...f, rol: v })} className={cn("btn btn-sm", f.rol === v ? "btn-dark" : "btn-secondary")}>{l}</button>)}</div>
              </div>
            </div>
          </div>
          <div className="card p-6">
            <h2 className="text-lg font-bold text-ink-900">Bevestigen</h2>
            <div className="mt-4 space-y-3">
              {checks.map((c) => (
                <label key={c.key} className="flex cursor-pointer gap-3 rounded-xl p-2 hover:bg-ink-50">
                  <input type="checkbox" className="mt-0.5 h-5 w-5 shrink-0 accent-[var(--color-brand-600)]" checked={checked.includes(c.key)} onChange={(e) => setChecked((x) => (e.target.checked ? [...x, c.key] : x.filter((y) => y !== c.key)))} />
                  <span className="text-sm text-ink-700">{c.label}</span>
                </label>
              ))}
            </div>
            <label className="mt-5 block"><span className="label flex items-center gap-1.5"><PenLine className="h-4 w-4" />Onderteken digitaal: typ je volledige naam</span><input className="input font-serif text-lg italic" value={f.signatureName} onChange={(e) => setF({ ...f, signatureName: e.target.value })} placeholder={f.name || "Voornamen Achternaam"} /></label>
            <p className="hint">We leggen de versie van de overeenkomst, datum, tijdstip en je bevestiging vast als bewijs van je akkoord.</p>
          </div>
        </div>
        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-2xl bg-ink-900 p-6 text-white">
            <p className="text-sm text-ink-300">Je dienst</p>
            <p className="mt-1 text-lg font-bold">{price.title}</p>
            <p className="mt-3 text-3xl font-extrabold">€ {price.price}<span className="ml-1 text-sm font-normal text-ink-300">all-in</span></p>
            <ul className="mt-4 space-y-2 text-sm text-ink-200">
              <li className="flex gap-2"><Check className="mt-0.5 h-4 w-4 text-brand-300" />Geen betaling vooraf — via de nota van afrekening</li>
              <li className="flex gap-2"><Check className="mt-0.5 h-4 w-4 text-brand-300" />Kosteloos annuleren tot de concept-akte er is</li>
              <li className="flex gap-2"><Info className="mt-0.5 h-4 w-4 text-brand-300" />Excl. overdrachtsbelasting</li>
            </ul>
            {payload.model.property.straat && <p className="mt-4 border-t border-white/10 pt-4 text-sm text-ink-300">{payload.model.property.straat} {payload.model.property.huisnummer}, {payload.model.property.plaats}</p>}
          </div>
          <details className="card group p-5">
            <summary className="flex cursor-pointer list-none items-center justify-between font-semibold text-ink-900">Dienstverleningsovereenkomst lezen <ChevronDown className="h-4 w-4 transition group-open:rotate-180" /></summary>
            <div className="mt-4 max-h-80 space-y-4 overflow-auto pr-2 text-sm text-ink-700">
              {dvo.map((s) => <div key={s.title}><p className="font-semibold text-ink-900">{s.title}</p><ul className="mt-1 list-disc space-y-1 pl-4">{s.items.map((i) => <li key={i}>{i}</li>)}</ul></div>)}
            </div>
          </details>
        </aside>
      </div>
      <div className="mt-8 flex flex-col-reverse justify-between gap-3 sm:flex-row">
        <button className="btn btn-ghost" onClick={onBack}><ArrowLeft className="h-4 w-4" />Terug</button>
        <button className="btn btn-primary btn-lg" onClick={submit} disabled={!ready || busy}>{busy && <Loader2 className="h-4 w-4 animate-spin" />}Aanvraag bevestigen en naar mijn portaal <ArrowRight className="h-4 w-4" /></button>
      </div>
    </section>
  );
}
