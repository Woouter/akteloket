import "server-only";
import { cookies } from "next/headers";
import type { DossierView } from "./dossier";
import { loadDossierView } from "./dossier";
import { findConceptByDraft } from "./intake";
import type { ReviewModel } from "./intake";

export const DRAFT_COOKIE = "al_draft";

export async function currentDraft(): Promise<DossierView | null> {
  const c = await cookies();
  const t = c.get(DRAFT_COOKIE)?.value;
  if (!t) return null;
  const d = await findConceptByDraft(t);
  return d ? loadDossierView(d.id) : null;
}

export type FieldState = { state: "extracted" | "uncertain" | "missing" | "manual"; page?: number; snippet?: string };

/** Zet een conceptdossier om naar het controlemodel voor de klant (met per veld de herkomst). */
export function toReviewPayload(view: DossierView) {
  const d = view.data;
  const meta: Record<string, FieldState> = {};
  const fromKo = d.koStatus !== "ontbreekt";
  const mark = (key: string, value: unknown, metaKey?: string, m?: Record<string, { page?: number; snippet?: string; confidence?: number }>) => {
    const src = (m ?? d.meta)[metaKey ?? key];
    if (value === undefined || value === null || value === "") meta[key] = { state: "missing" };
    else if (!fromKo) meta[key] = { state: "manual" };
    else meta[key] = { state: src?.confidence != null && src.confidence < 0.75 ? "uncertain" : "extracted", page: src?.page, snippet: src?.snippet };
  };
  const p = d.property;
  const t = d.transaction;
  mark("property.straat", p.straat, "object.adres");
  mark("property.huisnummer", p.huisnummer, "object.adres");
  mark("property.postcode", p.postcode, "object.adres");
  mark("property.plaats", p.plaats, "object.adres");
  mark("property.kadastraal.gemeente", p.kadastraal?.gemeente, "object.perceel");
  mark("property.kadastraal.sectie", p.kadastraal?.sectie, "object.perceel");
  mark("property.kadastraal.perceel", p.kadastraal?.perceel, "object.perceel");
  mark("transaction.koopprijs", t.koopprijs, "koopprijs");
  mark("transaction.roerendeZaken", t.roerendeZaken, "roerendeZaken");
  mark("transaction.datumOndertekening", t.datumOndertekening, "datumOndertekening");
  mark("transaction.leveringsdatum", t.leveringsdatum, "leveringsdatum");
  mark("transaction.waarborgsomBedrag", t.waarborgsom?.bedrag, "waarborgsom.bedrag");
  const parties = view.parties.map((party) => {
    const pm = party.data.meta ?? {};
    const pre = `party.${party.id}.`;
    for (const k of ["voornamen", "achternaam", "geboortedatum", "geboorteplaats", "adres", "postcode", "woonplaats", "burgerlijkeStaat"] as const) {
      const v = party.data.person[k];
      const src = pm[k === "voornamen" || k === "achternaam" ? "naam" : k] ?? pm["naam"];
      if (!v) meta[pre + k] = { state: "missing" };
      else meta[pre + k] = fromKo ? { state: src?.confidence != null && src.confidence < 0.75 ? "uncertain" : "extracted", page: src?.page, snippet: src?.snippet } : { state: "manual" };
    }
    return { id: party.id, side: party.side, person: party.data.person, email: party.email ?? undefined };
  });
  const model: ReviewModel = {
    property: { straat: p.straat, huisnummer: p.huisnummer, toevoeging: p.toevoeging, postcode: p.postcode, plaats: p.plaats, soort: p.soort, kadastraal: { gemeente: p.kadastraal?.gemeente, sectie: p.kadastraal?.sectie, perceel: p.kadastraal?.perceel, appartementsindex: p.kadastraal?.appartementsindex, grootte: p.kadastraal?.grootte } },
    transaction: { koopprijs: t.koopprijs, roerendeZaken: t.roerendeZaken, datumOndertekening: t.datumOndertekening, leveringsdatum: t.leveringsdatum, waarborgsomBedrag: t.waarborgsom?.bedrag },
    parties,
  };
  return {
    dossierId: view.dossier.id,
    reference: view.dossier.reference,
    service: d.service,
    koStatus: d.koStatus,
    hasDocument: !!d.koDocumentId,
    extractie: d.extractie,
    bijzondereBepalingen: t.bijzondereBepalingen ?? [],
    voorbehouden: [...(t.financieringsvoorbehoud?.datum ? [{ omschrijving: `Financieringsvoorbehoud${t.financieringsvoorbehoud.bedrag ? ` (€ ${t.financieringsvoorbehoud.bedrag.toLocaleString("nl-NL")})` : ""}`, datum: t.financieringsvoorbehoud.datum }] : []), ...(t.overigeVoorbehouden ?? [])],
    notaris: t.notarisInKo,
    aandachtspunten: d.aandachtspunten.filter((a) => a.ernst !== "info").map((a) => a.tekst),
    model,
    meta,
  };
}
export type ReviewPayload = ReturnType<typeof toReviewPayload>;
