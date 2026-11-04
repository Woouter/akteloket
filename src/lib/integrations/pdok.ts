/**
 * PDOK Locatieserver (publiek, gratis, geen sleutel): adres → BAG-gegevens en
 * gekoppeld kadastraal perceel. Wordt client-side gebruikt voor adres-autocomplete
 * en server-side om een kadastrale aanduiding te verrijken.
 */
export const PDOK_BASE = "https://api.pdok.nl/bzk/locatieserver/search/v3_1";

export interface PdokAddress {
  id: string;
  weergavenaam: string;
  straatnaam?: string;
  huisnummer?: number;
  huisletter?: string;
  huisnummertoevoeging?: string;
  postcode?: string;
  woonplaatsnaam?: string;
  gemeentenaam?: string;
  gekoppeld_perceel?: string[];
  adresseerbaarobject_id?: string;
  centroide_ll?: string;
}

export async function pdokLookupAddress(postcode: string, huisnummer: string, timeoutMs = 4000): Promise<PdokAddress | null> {
  const q = `postcode:${postcode.replace(/\s+/g, "").toUpperCase()} and huisnummer:${parseInt(huisnummer, 10)}`;
  const url = `${PDOK_BASE}/free?q=${encodeURIComponent(q)}&fq=type:adres&rows=1&fl=*`;
  try {
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), timeoutMs);
    const res = await fetch(url, { signal: ctl.signal, headers: { accept: "application/json" } });
    clearTimeout(t);
    if (!res.ok) return null;
    const json = (await res.json()) as { response?: { docs?: PdokAddress[] } };
    return json.response?.docs?.[0] ?? null;
  } catch {
    return null;
  }
}

/** "AMF04-K-4821" → { gemeente: "AMF04", sectie: "K", perceel: "4821" } */
export function parsePerceel(code: string): { gemeenteCode: string; sectie: string; perceel: string } | null {
  const m = code.match(/^([A-Z0-9]+)-([A-Z]{1,2})-(\d+)/);
  return m ? { gemeenteCode: m[1], sectie: m[2], perceel: m[3] } : null;
}
