"use client";
import { useState } from "react";
import { ArrowRight, Loader2, Plus, Trash2, AlertTriangle, Info } from "lucide-react";
import { AddressSearch } from "./address";
import { cn } from "@/lib/util/format";

type P = { voornamen: string; achternaam: string; geboortedatum?: string; email?: string };
const empty = (): P => ({ voornamen: "", achternaam: "" });
const num = (v: string) => { const n = Number(v.replace(/[^\d,]/g, "").replace(",", ".")); return v.trim() && Number.isFinite(n) ? n : undefined; };
const addDays = (d: number) => { const x = new Date(); x.setDate(x.getDate() + d); return x.toISOString().slice(0, 10); };

export function KoForm() {
  const [rol, setRol] = useState<"koper" | "verkoper">("koper");
  const [adres, setAdres] = useState({ straat: "", huisnummer: "", postcode: "", plaats: "", perceel: "" });
  const [kopers, setKopers] = useState<P[]>([empty()]);
  const [verkopers, setVerkopers] = useState<P[]>([empty()]);
  const [f, setF] = useState<Record<string, string>>({ leveringsdatum: addDays(60), waarborgUiterlijk: addDays(21), financieringDatum: addDays(35), keuringDatum: addDays(14), waarborgType: "waarborgsom" });
  const [fin, setFin] = useState(true);
  const [keuring, setKeuring] = useState(true);
  const [akkoord, setAkkoord] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const set = (k: string, v: string) => setF((x) => ({ ...x, [k]: v }));
  const prijs = num(f.koopprijs ?? "");
  async function submit() {
    setBusy(true); setErr(null);
    const body = { rol, ...adres, kopers, verkopers, koopprijs: prijs, roerendeZaken: num(f.roerendeZaken ?? ""), leveringsdatum: f.leveringsdatum, waarborgsom: num(f.waarborgsom ?? "") ?? (prijs ? Math.round(prijs * 0.1) : undefined), waarborgType: f.waarborgType, waarborgUiterlijk: f.waarborgUiterlijk, financiering: fin, financieringBedrag: num(f.financieringBedrag ?? ""), financieringDatum: f.financieringDatum, nhg: f.nhg === "ja", keuring, keuringDatum: f.keuringDatum, afspraken: f.afspraken, naam: f.naam, email: f.email, telefoon: f.telefoon, akkoord };
    const r = await fetch("/api/koopovereenkomst", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    const j = await r.json();
    if (!r.ok) { setErr(j.error); setBusy(false); return; }
    window.location.assign(j.redirect);
  }
  const people = (title: string, list: P[], setList: (l: P[]) => void) => (
    <div>
      <div className="flex items-center justify-between"><p className="font-semibold text-ink-900">{title}</p><button type="button" className="btn btn-ghost btn-sm" onClick={() => setList([...list, empty()])}><Plus className="h-4 w-4" />Toevoegen</button></div>
      <div className="mt-3 space-y-3">{list.map((p, i) => (
        <div key={i} className="grid gap-3 rounded-xl border border-ink-100 p-3 sm:grid-cols-[1fr_1fr_10rem_1fr_auto]">
          <input className="input" placeholder="Voornamen (voluit)" value={p.voornamen} onChange={(e) => setList(list.map((x, j) => (j === i ? { ...x, voornamen: e.target.value } : x)))} />
          <input className="input" placeholder="Achternaam" value={p.achternaam} onChange={(e) => setList(list.map((x, j) => (j === i ? { ...x, achternaam: e.target.value } : x)))} />
          <input className="input" type="date" value={p.geboortedatum ?? ""} onChange={(e) => setList(list.map((x, j) => (j === i ? { ...x, geboortedatum: e.target.value } : x)))} aria-label="Geboortedatum" />
          <input className="input" type="email" placeholder="E-mail (voor ondertekening)" value={p.email ?? ""} onChange={(e) => setList(list.map((x, j) => (j === i ? { ...x, email: e.target.value } : x)))} />
          <button type="button" className="text-ink-400 hover:text-bad-600 disabled:opacity-30" disabled={list.length === 1} onClick={() => setList(list.filter((_, j) => j !== i))} aria-label="Verwijderen"><Trash2 className="h-4 w-4" /></button>
        </div>
      ))}</div>
    </div>
  );
  return (
    <div className="space-y-6">
      <section className="card p-6">
        <h2 className="text-lg font-bold text-ink-900">1. Jij en de woning</h2>
        <div className="mt-4"><span className="label">Ik ben de</span><div className="flex gap-2">{(["koper", "verkoper"] as const).map((r) => <button key={r} type="button" onClick={() => setRol(r)} className={cn("btn btn-sm", rol === r ? "btn-dark" : "btn-secondary")}>{r === "koper" ? "Koper" : "Verkoper"}</button>)}</div></div>
        <div className="mt-5"><span className="label">Adres van de woning</span><AddressSearch onPick={(a) => setAdres({ straat: a.straat, huisnummer: a.huisnummer + (a.toevoeging ?? ""), postcode: a.postcode, plaats: a.plaats, perceel: a.perceel ?? "" })} /></div>
        <div className="mt-3 grid gap-3 sm:grid-cols-6">
          <input className="input sm:col-span-3" placeholder="Straat" value={adres.straat} onChange={(e) => setAdres({ ...adres, straat: e.target.value })} aria-label="Straat" />
          <input className="input sm:col-span-1" placeholder="Nr." value={adres.huisnummer} onChange={(e) => setAdres({ ...adres, huisnummer: e.target.value })} aria-label="Huisnummer" />
          <input className="input sm:col-span-2" placeholder="Postcode" value={adres.postcode} onChange={(e) => setAdres({ ...adres, postcode: e.target.value })} aria-label="Postcode" />
          <input className="input sm:col-span-6" placeholder="Plaats" value={adres.plaats} onChange={(e) => setAdres({ ...adres, plaats: e.target.value })} aria-label="Plaats" />
        </div>
        {adres.perceel && <p className="mt-2 text-sm text-ok-700">Kadastraal perceel gevonden: {adres.perceel}</p>}
      </section>
      <section className="card space-y-5 p-6">
        <h2 className="text-lg font-bold text-ink-900">2. Partijen</h2>
        {people("Verkoper(s)", verkopers, setVerkopers)}
        {people("Koper(s)", kopers, setKopers)}
      </section>
      <section className="card p-6">
        <h2 className="text-lg font-bold text-ink-900">3. De afspraken</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label><span className="label">Koopprijs (€)</span><input className="input" inputMode="numeric" value={f.koopprijs ?? ""} onChange={(e) => set("koopprijs", e.target.value)} /></label>
          <label><span className="label">Roerende zaken (€, optioneel)</span><input className="input" inputMode="numeric" value={f.roerendeZaken ?? ""} onChange={(e) => set("roerendeZaken", e.target.value)} /></label>
          <label><span className="label">Leveringsdatum</span><input className="input" type="date" value={f.leveringsdatum} onChange={(e) => set("leveringsdatum", e.target.value)} /></label>
          <label><span className="label">Zekerheid koper</span><select className="select" value={f.waarborgType} onChange={(e) => set("waarborgType", e.target.value)}><option value="waarborgsom">Waarborgsom bij de notaris</option><option value="bankgarantie">Bankgarantie</option></select></label>
          <label><span className="label">Bedrag (€) — standaard 10%</span><input className="input" inputMode="numeric" placeholder={prijs ? Math.round(prijs * 0.1).toLocaleString("nl-NL") : ""} value={f.waarborgsom ?? ""} onChange={(e) => set("waarborgsom", e.target.value)} /></label>
          <label><span className="label">Uiterlijk storten/stellen op</span><input className="input" type="date" value={f.waarborgUiterlijk} onChange={(e) => set("waarborgUiterlijk", e.target.value)} /></label>
        </div>
        <div className="mt-6 space-y-4 border-t border-ink-100 pt-5">
          <label className="flex items-center gap-3 font-semibold text-ink-900"><input type="checkbox" checked={fin} onChange={(e) => setFin(e.target.checked)} className="h-5 w-5 accent-[var(--color-brand-600)]" />Financieringsvoorbehoud</label>
          {fin && <div className="grid gap-4 pl-8 sm:grid-cols-3"><label><span className="label">Bedrag hypotheek (€)</span><input className="input" inputMode="numeric" value={f.financieringBedrag ?? ""} onChange={(e) => set("financieringBedrag", e.target.value)} /></label><label><span className="label">Uiterlijk op</span><input className="input" type="date" value={f.financieringDatum} onChange={(e) => set("financieringDatum", e.target.value)} /></label><label><span className="label">Met NHG?</span><select className="select" value={f.nhg ?? "nee"} onChange={(e) => set("nhg", e.target.value)}><option value="nee">Nee</option><option value="ja">Ja</option></select></label></div>}
          {!fin && <p className="flex gap-2 pl-8 text-sm text-warn-700"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />Zonder financieringsvoorbehoud koop je ook als je de hypotheek niet rond krijgt. Weet je het zeker?</p>}
          <label className="flex items-center gap-3 font-semibold text-ink-900"><input type="checkbox" checked={keuring} onChange={(e) => setKeuring(e.target.checked)} className="h-5 w-5 accent-[var(--color-brand-600)]" />Voorbehoud bouwkundige keuring</label>
          {keuring && <label className="block max-w-xs pl-8"><span className="label">Uiterlijk op</span><input className="input" type="date" value={f.keuringDatum} onChange={(e) => set("keuringDatum", e.target.value)} /></label>}
          <label className="block"><span className="label">Bijzondere afspraken (één per regel, optioneel)</span><textarea className="textarea" rows={3} value={f.afspraken ?? ""} onChange={(e) => set("afspraken", e.target.value)} placeholder="Bijv. de zonnepanelen blijven achter zonder bijbetaling" /></label>
        </div>
      </section>
      <section className="card p-6">
        <h2 className="text-lg font-bold text-ink-900">4. Je gegevens</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <label><span className="label">Naam</span><input className="input" value={f.naam ?? ""} onChange={(e) => set("naam", e.target.value)} /></label>
          <label><span className="label">E-mail</span><input className="input" type="email" value={f.email ?? ""} onChange={(e) => set("email", e.target.value)} /></label>
          <label><span className="label">Telefoon</span><input className="input" type="tel" value={f.telefoon ?? ""} onChange={(e) => set("telefoon", e.target.value)} /></label>
        </div>
        <label className="mt-5 flex cursor-pointer gap-3 text-sm text-ink-700"><input type="checkbox" checked={akkoord} onChange={(e) => setAkkoord(e.target.checked)} className="mt-0.5 h-5 w-5 shrink-0 accent-[var(--color-brand-600)]" />Ik ga akkoord met de voorwaarden en de prijs van € 395 (incl. btw), te voldoen na juridische controle. Annuleren is kosteloos tot het concept is opgesteld.</label>
        <p className="mt-3 flex gap-2 text-xs text-ink-500"><Info className="h-4 w-4 shrink-0" />Na juridische controle tekenen koper en verkoper digitaal. De koper heeft daarna drie dagen bedenktijd.</p>
      </section>
      {err && <p className="rounded-xl bg-bad-50 p-4 text-sm text-bad-700">{err}</p>}
      <div className="flex justify-end"><button className="btn btn-primary btn-lg" disabled={busy || !akkoord || !adres.straat || !prijs} onClick={submit}>{busy && <Loader2 className="h-4 w-4 animate-spin" />}Stel mijn koopovereenkomst op <ArrowRight className="h-4 w-4" /></button></div>
    </div>
  );
}
