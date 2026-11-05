"use client";
import { useState } from "react";

type Fin = {
  hypotheek?: string; geldverstrekker?: string; status?: string; hypotheekbedrag?: string; overbrugging?: string;
  meerdere?: string; andere?: string; eigenMiddelen?: string; adviseurNaam?: string; adviseurKantoor?: string; adviseurEmail?: string;
};

const REQ = <span className="text-bad-600"> *</span>;
const Sel = ({ name, value, opts, required, onChange }: { name: string; value?: string; opts: [string, string][]; required?: boolean; onChange?: (v: string) => void }) => (
  <select className="select" name={name} defaultValue={value ?? ""} required={required} onChange={onChange ? (e) => onChange(e.target.value) : undefined}><option value="">Kies…</option>{opts.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
);

/** Financieringsvragen; vervolgvragen verschijnen alleen als ze van toepassing zijn. */
export function WoningFinancing({ f }: { f: Fin }) {
  const [hyp, setHyp] = useState(f.hypotheek ?? "");
  const [meerdere, setMeerdere] = useState(f.meerdere ?? "");
  const metHypotheek = hyp !== "nee";
  return (
    <>
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <label className="block"><span className="label">Wordt er een hypotheek gevestigd voor deze aankoop?{REQ}</span><Sel name="hypotheek" value={f.hypotheek} opts={[["ja", "Ja"], ["nee", "Nee"], ["onbekend", "Nog niet bekend"]]} required onChange={setHyp} /></label>
        {metHypotheek && (
          <>
            <label className="block"><span className="label">Bij welke geldverstrekker loopt de aanvraag?</span><input className="input" name="geldverstrekker" defaultValue={f.geldverstrekker ?? ""} /></label>
            <label className="block"><span className="label">Wat is de status van je hypotheek?</span><Sel name="status" value={f.status} opts={[["aanvraag_loopt", "Aanvraag loopt"], ["offerte_ontvangen", "Offerte ontvangen"], ["offerte_geaccepteerd", "Offerte geaccepteerd"], ["rond", "Financiering rond"], ["weet_niet", "Weet ik niet"]]} /></label>
            <label className="block"><span className="label">Hypotheekbedrag (indicatie, €)</span><input className="input" name="hypotheekbedrag" inputMode="numeric" defaultValue={f.hypotheekbedrag ?? ""} /></label>
            <label className="block"><span className="label">Is er een overbruggingshypotheek?</span><Sel name="overbrugging" value={f.overbrugging} opts={[["nee", "Nee"], ["ja", "Ja"], ["weet_niet", "Weet ik niet"]]} /></label>
            <label className="block"><span className="label">Zijn er meerdere geldverstrekkers betrokken?</span><Sel name="meerdere" value={f.meerdere} opts={[["nee", "Nee"], ["ja", "Ja"]]} onChange={setMeerdere} /></label>
            {meerdere === "ja" && <label className="block sm:col-span-2"><span className="label">Welke andere geldverstrekkers?</span><input className="input" name="andere" defaultValue={f.andere ?? ""} /></label>}
          </>
        )}
        <label className="block sm:col-span-2"><span className="label">Breng je eigen geld of andere middelen in voor de aankoop of bijkomende kosten?{REQ}</span><Sel name="eigenMiddelen" value={f.eigenMiddelen} opts={[["ja", "Ja"], ["nee", "Nee"], ["weet_niet", "Weet ik nog niet"]]} required /></label>
      </div>
      {metHypotheek && (
        <div className="mt-6 border-t border-ink-100 pt-5">
          <h4 className="font-sans text-sm font-semibold text-ink-900">Hypotheekadviseur <span className="font-normal text-ink-500">(optioneel)</span></h4>
          <div className="mt-3 grid gap-4 sm:grid-cols-3">
            <label className="block min-w-0"><span className="label">Naam</span><input className="input" name="adviseurNaam" defaultValue={f.adviseurNaam ?? ""} autoComplete="off" /></label>
            <label className="block min-w-0"><span className="label">Kantoor</span><input className="input" name="adviseurKantoor" defaultValue={f.adviseurKantoor ?? ""} autoComplete="off" /></label>
            <label className="block min-w-0"><span className="label">E-mail</span><input className="input" name="adviseurEmail" type="email" defaultValue={f.adviseurEmail ?? ""} autoComplete="off" /></label>
          </div>
        </div>
      )}
    </>
  );
}
