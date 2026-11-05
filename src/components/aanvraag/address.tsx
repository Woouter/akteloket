"use client";
import { useEffect, useRef, useState } from "react";
import { MapPin, Loader2, AlertTriangle } from "lucide-react";

export interface PdokPick { straat: string; huisnummer: string; toevoeging?: string; postcode: string; plaats: string; perceel?: string; weergave: string }

const BASE = "https://api.pdok.nl/bzk/locatieserver/search/v3_1";

/** Adres-autocomplete via de publieke PDOK Locatieserver (BAG) — inclusief gekoppeld kadastraal perceel. */
export function AddressSearch({ onPick, placeholder = "Begin met typen: straat en huisnummer of postcode" }: { onPick: (a: PdokPick) => void; placeholder?: string }) {
  const [q, setQ] = useState("");
  const [items, setItems] = useState<{ id: string; weergavenaam: string }[]>([]);
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);
  const [failed, setFailed] = useState(false);
  const [empty, setEmpty] = useState(false);
  const t = useRef<number>(0);
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (q.trim().length < 3) { setItems([]); setEmpty(false); return; }
    window.clearTimeout(t.current);
    t.current = window.setTimeout(async () => {
      setBusy(true);
      try {
        const r = await fetch(`${BASE}/suggest?q=${encodeURIComponent(q)}&fq=type:adres&rows=7`);
        if (!r.ok) throw new Error(String(r.status));
        const j = await r.json();
        const docs = j.response?.docs ?? [];
        setItems(docs);
        setEmpty(docs.length === 0);
        setFailed(false);
        setOpen(true);
      } catch { setItems([]); setFailed(true); setEmpty(false); } finally { setBusy(false); }
    }, 220);
  }, [q]);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => { if (box.current && !box.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);
  async function pick(id: string) {
    setOpen(false);
    try {
      const r = await fetch(`${BASE}/lookup?id=${encodeURIComponent(id)}&fl=*`);
      const d = (await r.json()).response?.docs?.[0];
      if (!d) return;
      setQ(d.weergavenaam);
      onPick({ straat: d.straatnaam, huisnummer: String(d.huisnummer), toevoeging: [d.huisletter, d.huisnummertoevoeging].filter(Boolean).join("") || undefined, postcode: (d.postcode ?? "").replace(/^(\d{4})([A-Z]{2})$/, "$1 $2"), plaats: d.woonplaatsnaam, perceel: d.gekoppeld_perceel?.[0], weergave: d.weergavenaam });
    } catch { setFailed(true); }
  }
  return (
    <div ref={box}>
      <div className="relative">
        <MapPin className="pointer-events-none absolute left-3.5 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-ink-400" />
        <input className="input pl-10 pr-10" value={q} onChange={(e) => setQ(e.target.value)} onFocus={() => items.length && setOpen(true)} onKeyDown={(e) => { if (e.key === "Escape") setOpen(false); }} placeholder={placeholder} autoComplete="off" aria-label="Zoek adres" aria-expanded={open && items.length > 0} />
        {busy && <Loader2 className="absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-ink-400" />}
        {open && items.length > 0 && (
          <ul className="absolute z-20 mt-1.5 max-h-72 w-full overflow-auto rounded-xl border border-ink-100 bg-white p-1 shadow-lift">
            {items.map((i) => <li key={i.id}><button type="button" onClick={() => pick(i.id)} className="w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-ink-50">{i.weergavenaam}</button></li>)}
          </ul>
        )}
      </div>
      {failed ? (
        <p className="hint flex items-start gap-1.5 text-warn-700"><AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />Adres zoeken lukt nu niet. Vul het adres hieronder zelf in; wij zoeken de kadastrale gegevens later op.</p>
      ) : empty && !busy ? (
        <p className="hint">Geen adres gevonden. Controleer de spelling, of vul het adres hieronder zelf in.</p>
      ) : (
        <p className="hint">Adresgegevens uit de Basisregistratie Adressen en Gebouwen (PDOK).</p>
      )}
    </div>
  );
}
