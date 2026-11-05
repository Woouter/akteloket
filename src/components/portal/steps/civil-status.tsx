"use client";
import { useState, type ReactNode } from "react";

const STAAT: [string, string][] = [["ongehuwd", "Ongehuwd"], ["gehuwd", "Gehuwd"], ["geregistreerd_partner", "Geregistreerd partnerschap"], ["gescheiden", "Gescheiden"], ["weduwe", "Weduwe of weduwnaar"]];

/**
 * Burgerlijke staat met de partnervelden die alleen bij gehuwd of geregistreerd
 * partnerschap gelden. Zo vragen we bij "ongehuwd" niet om een echtgenoot.
 */
export function CivilStatusFields({ staat, voorwaarden, partnerNaam, partnerDatum, tags, missing }: {
  staat?: string; voorwaarden?: string; partnerNaam?: string; partnerDatum?: string;
  tags: { staat?: ReactNode; voorwaarden?: ReactNode; partnerNaam?: ReactNode; partnerDatum?: ReactNode };
  missing: { partnerNaam: boolean; partnerDatum: boolean };
}) {
  const [s, setS] = useState(staat ?? "");
  const partner = s === "gehuwd" || s === "geregistreerd_partner";
  return (
    <>
      <label className="block min-w-0 sm:col-span-3">
        <span className="label">Burgerlijke staat</span>
        <select className="select" name="burgerlijkeStaat" value={s} onChange={(e) => setS(e.target.value)} required><option value="">Kies…</option>{STAAT.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
        {tags.staat}
      </label>
      {partner && (
        <>
          <label className="block min-w-0 sm:col-span-3">
            <span className="label">{s === "gehuwd" ? "Huwelijkse voorwaarden?" : "Partnerschapsvoorwaarden?"}</span>
            <select className="select" name="huwelijkseVoorwaarden" defaultValue={voorwaarden ?? ""}><option value="">Kies…</option><option value="nee">Nee</option><option value="ja">Ja</option><option value="weet_niet">Weet ik niet</option></select>
            {tags.voorwaarden}
          </label>
          <label className="block min-w-0 sm:col-span-3">
            <span className="label">{s === "gehuwd" ? "Naam echtgeno(o)t(e)" : "Naam geregistreerd partner"}</span>
            <input className="input" name="partnerNaam" defaultValue={partnerNaam ?? ""} data-state={missing.partnerNaam ? "missing" : undefined} required />
            {tags.partnerNaam}
          </label>
          <label className="block min-w-0 sm:col-span-3">
            <span className="label">{s === "gehuwd" ? "Datum huwelijk" : "Datum partnerschap"}</span>
            <input className="input" name="partnerDatum" type="date" defaultValue={partnerDatum ?? ""} data-state={missing.partnerDatum ? "missing" : undefined} />
            {tags.partnerDatum}
          </label>
        </>
      )}
    </>
  );
}
