"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, ArrowRight, Check, Compass, LayoutGrid, PlayCircle, Sparkles, X } from "lucide-react";
import { SEEN_COOKIE, TOUR_COOKIE, TOURS, parseSeen, tourByKey, type Tour } from "@/lib/demo/tours";

const KEY = "akteloket.tour";
type State = { key: string; index: number } | null;

function readLocal(): State {
  try { return JSON.parse(localStorage.getItem(KEY) ?? "null"); } catch { return null; }
}
function writeLocal(s: State) {
  try { if (s) localStorage.setItem(KEY, JSON.stringify(s)); else localStorage.removeItem(KEY); } catch { /* geen opslag beschikbaar */ }
}
function getCookie(name: string): string | undefined {
  return document.cookie.split("; ").find((c) => c.startsWith(name + "="))?.slice(name.length + 1);
}
function setCookie(name: string, value: string | null) {
  document.cookie = value ? `${name}=${value}; path=/; max-age=${30 * 86400}; samesite=lax` : `${name}=; path=/; max-age=0; samesite=lax`;
}

/**
 * Hoogte van wat bovenaan het scherm blijft zweven (sticky of fixed header).
 * De tour scrolt het doel daaronder en laat de highlight daar nooit onder vallen.
 */
function topInset(): number {
  let inset = 0;
  document.querySelectorAll<HTMLElement>("header, [data-sticky-top]").forEach((el) => {
    const cs = getComputedStyle(el);
    if (cs.position === "sticky") {
      const t = parseFloat(cs.top);
      if (!Number.isNaN(t)) inset = Math.max(inset, t + el.offsetHeight);
    } else if (cs.position === "fixed") {
      const r = el.getBoundingClientRect();
      if (r.top <= 1 && r.width > window.innerWidth / 2) inset = Math.max(inset, r.bottom);
    }
  });
  return inset;
}

/**
 * Scrol het element in beeld: onder de zwevende header en boven wat onderin ligt
 * (op mobiel staat de tourpopup onderin). Geeft de wachttijd terug.
 */
function bringIntoView(el: Element, bottomReserve: number): number {
  const r = el.getBoundingClientRect();
  const inset = topInset();
  const h = window.innerHeight - bottomReserve + 24;
  const avail = h - inset;
  if (r.top >= inset + 8 && r.bottom <= h - 24) return 0;
  const tall = r.height > avail * 0.7;
  const offset = tall ? inset + 24 : inset + Math.max(24, (avail - r.height) / 2.4);
  window.scrollTo({ top: Math.max(0, window.scrollY + r.top - offset), behavior: "smooth" });
  return 480;
}

export function TourProvider({ mainId }: { mainId?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [state, setState] = useState<State>(null);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [inset, setInset] = useState(0);
  const [ready, setReady] = useState(false);
  const [ended, setEnded] = useState<{ tour: Tour; finished: boolean } | null>(null);
  const popRef = useRef<HTMLDivElement>(null);
  const [pop, setPop] = useState<{ top: number; left: number; mobile: boolean }>({ top: 0, left: 0, mobile: false });

  const resolve = useCallback((p: string) => p.replace("{main}", mainId ?? ""), [mainId]);

  // Start via ?tour=key&step=n (gezet door /demo/start/<tour>); anders de lopende tour hervatten.
  useEffect(() => {
    const t = tourByKey(params.get("tour"));
    if (t) {
      const s = { key: t.key, index: Math.max(0, Math.min(t.steps.length - 1, Number(params.get("step") ?? 0) || 0)) };
      writeLocal(s);
      setCookie(TOUR_COOKIE, t.key);
      setState(s);
      setEnded(null);
      const url = new URL(window.location.href);
      url.searchParams.delete("tour");
      url.searchParams.delete("step");
      window.history.replaceState(window.history.state, "", url.pathname + url.search + url.hash);
    } else {
      // De cookie is leidend (die bepaalt ook de toegang op de server).
      const active = tourByKey(getCookie(TOUR_COOKIE));
      const local = readLocal();
      if (!active) { writeLocal(null); setState(null); }
      else setState(local?.key === active.key ? local : { key: active.key, index: 0 });
    }
    setReady(true);
  }, [params]);

  const tour: Tour | undefined = state ? tourByKey(state.key) : undefined;
  const step = tour && state ? tour.steps[state.index] : undefined;
  const onPage = !!step && resolve(step.path) === pathname;

  // Op mobiel staat de popup onderin: geef de pagina tijdelijk extra scrollruimte, zodat ook
  // een doel onderaan de pagina boven de popup kan komen.
  useLayoutEffect(() => {
    if (!onPage || window.innerWidth >= 640) return;
    const prev = document.body.style.paddingBottom;
    document.body.style.paddingBottom = "20rem";
    return () => { document.body.style.paddingBottom = prev; };
  }, [onPage]);

  // Zoek het doelelement, scrol het onder de header in beeld en volg het bij scroll/resize.
  useLayoutEffect(() => {
    if (!onPage || !step) { setRect(null); return; }
    let el: Element | null = null;
    let tries = 0;
    let timer = 0;
    const measure = () => { if (el) { setRect(el.getBoundingClientRect()); setInset(topInset()); } };
    const find = () => {
      el = step.target ? document.querySelector(`[data-tour="${step.target}"]`) : null;
      if (!el && step.target && tries++ < 40) { timer = window.setTimeout(find, 75); return; }
      if (!el) { setRect(null); return; }
      const reserve = window.innerWidth < 640 ? (popRef.current?.offsetHeight ?? 230) + 32 : 24;
      const wait = bringIntoView(el, reserve);
      timer = window.setTimeout(measure, wait);
    };
    find();
    window.addEventListener("scroll", measure, { passive: true });
    window.addEventListener("resize", measure);
    return () => { clearTimeout(timer); window.removeEventListener("scroll", measure); window.removeEventListener("resize", measure); };
  }, [onPage, step, state?.index]);

  // Positioneer de popover (nooit onder de zwevende header).
  useLayoutEffect(() => {
    if (!onPage) return;
    const w = window.innerWidth, h = window.innerHeight;
    const pw = Math.min(380, w - 32);
    const ph = popRef.current?.offsetHeight ?? 220;
    const mobile = w < 640;
    const minTop = inset + 12;
    if (mobile || !rect || step?.placement === "center") {
      setPop({ top: mobile ? h - ph - 16 : Math.max(minTop, h / 2 - ph / 2), left: mobile ? 16 : w / 2 - pw / 2, mobile });
      return;
    }
    const roomLeft = rect.left - pw - 14 >= 16;
    const roomRight = rect.right + pw + 14 <= w - 16;
    const pl0 = step?.placement ?? "bottom";
    // Hoge doelen: naast het doel als daar ruimte is (verticaal gecentreerd), anders in de
    // benedenhoek die het minst van het doel afdekt.
    if (rect.height > (h - inset) * 0.55) {
      const midTop = Math.min(h - ph - 12, Math.max(minTop, (inset + h) / 2 - ph / 2));
      const side = pl0 === "left" && roomLeft ? "left" : pl0 === "right" && roomRight ? "right" : roomRight ? "right" : roomLeft ? "left" : null;
      if (side) { setPop({ top: midTop, left: side === "left" ? rect.left - pw - 14 : rect.right + 14, mobile }); return; }
      const top = h - ph - 20;
      const cover = (l: number) => Math.max(0, Math.min(rect.right, l + pw) - Math.max(rect.left, l)) * Math.max(0, Math.min(rect.bottom, top + ph) - Math.max(rect.top, top));
      const right = w - pw - 24, leftC = 24;
      setPop({ top, left: cover(leftC) < cover(right) ? leftC : right, mobile });
      return;
    }
    let top = rect.bottom + 14, left = rect.left;
    const pl = (pl0 === "left" && !roomLeft) || (pl0 === "right" && !roomRight) ? "bottom" : pl0;
    if (pl === "top") top = rect.top - ph - 14;
    if (pl === "left") { top = rect.top; left = rect.left - pw - 14; }
    if (pl === "right") { top = rect.top; left = rect.right + 14; }
    if (top + ph > h - 12) top = Math.max(minTop, rect.top - ph - 14);
    if (top < minTop) top = Math.min(h - ph - 12, Math.max(minTop, rect.bottom + 14));
    if (left + pw > w - 16) left = w - pw - 16;
    if (left < 16) left = 16;
    setPop({ top, left, mobile });
  }, [rect, inset, onPage, step?.placement, state?.index]);

  const stop = (finished: boolean) => {
    if (tour) {
      const seen = new Set(parseSeen(getCookie(SEEN_COOKIE)));
      seen.add(tour.key);
      setCookie(SEEN_COOKIE, [...seen].join(","));
      setEnded({ tour, finished });
    }
    setCookie(TOUR_COOKIE, null);
    writeLocal(null);
    setState(null);
    setRect(null);
  };

  const go = (index: number) => {
    if (!tour) return;
    if (index >= tour.steps.length) { stop(true); return; }
    if (index < 0) return;
    const s = { key: tour.key, index };
    writeLocal(s);
    setState(s);
    const target = resolve(tour.steps[index].path);
    if (target !== pathname) router.push(target);
  };

  // Toetsenbord
  useEffect(() => {
    if (!onPage && !ended) return;
    const k = (e: KeyboardEvent) => {
      if (ended) { if (e.key === "Escape") setEnded(null); return; }
      if (e.key === "Escape") stop(false);
      if (e.key === "ArrowRight") go((state?.index ?? 0) + 1);
      if (e.key === "ArrowLeft") go((state?.index ?? 0) - 1);
    };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  });

  if (!ready) return null;
  if (ended) return <EndDialog ended={ended} onClose={() => setEnded(null)} />;
  if (!tour || !step) return null;

  if (!onPage) {
    return (
      <div className="no-print fixed bottom-4 left-1/2 z-[9999] flex w-[calc(100vw-2rem)] max-w-max -translate-x-1/2 items-center gap-3 rounded-lg bg-ink-900 px-4 py-3 text-sm text-white shadow-lift">
        <Sparkles className="h-4 w-4 shrink-0 text-brass-300" />
        <span className="min-w-0 truncate">Tour “{tour.title}”, stap {state!.index + 1} van {tour.steps.length}</span>
        <button className="btn btn-sm shrink-0 bg-white text-ink-900 hover:bg-ink-50" onClick={() => router.push(resolve(step.path))}>Ga verder</button>
        <button className="shrink-0 text-ink-300 hover:text-white" onClick={() => stop(false)} aria-label="Tour stoppen"><X className="h-4 w-4" /></button>
      </div>
    );
  }

  const pad = 8;
  const holeTop = rect ? Math.max(rect.top - pad, inset) : 0;
  const holeBottom = rect ? rect.bottom + pad : 0;
  const hole = rect && holeBottom - holeTop > 12;
  return (
    <>
      {hole ? (
        <div className="tour-spotlight" style={{ top: holeTop, left: rect!.left - pad, width: rect!.width + pad * 2, height: holeBottom - holeTop }} />
      ) : (
        <div className="fixed inset-0 z-[9998] bg-ink-950/60" />
      )}
      <div ref={popRef} className="tour-popover no-print" style={{ top: pop.top, left: pop.left, width: pop.mobile ? "calc(100vw - 32px)" : Math.min(380, typeof window !== "undefined" ? window.innerWidth - 32 : 380) }} role="dialog" aria-label={step.title}>
        <div className="overflow-hidden rounded-lg bg-white shadow-lift ring-1 ring-ink-900/10">
          <div className="flex items-center justify-between bg-ink-900 px-4 py-2.5 text-xs text-ink-200">
            <span className="flex items-center gap-1.5 font-semibold text-white"><Sparkles className="h-3.5 w-3.5 text-brass-300" />{tour.title}</span>
            <span className="tabular">{state!.index + 1} / {tour.steps.length}</span>
          </div>
          <div className="p-4">
            <p className="font-serif text-lg font-semibold leading-snug text-ink-900">{step.title}</p>
            <p className="mt-1.5 text-sm leading-relaxed text-ink-600">{step.body}</p>
            <div className="mt-4 flex items-center justify-between gap-2">
              <button onClick={() => stop(false)} className="text-sm font-medium text-ink-500 hover:text-ink-900">Stoppen</button>
              <div className="flex gap-2">
                <button onClick={() => go(state!.index - 1)} disabled={state!.index === 0} className="btn btn-secondary btn-sm" aria-label="Vorige"><ArrowLeft className="h-4 w-4" /></button>
                <button onClick={() => go(state!.index + 1)} className="btn btn-primary btn-sm">
                  {state!.index + 1 === tour.steps.length ? "Afronden" : "Volgende"} <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
          <div className="h-1 bg-ink-100"><div className="h-full bg-brass-500 transition-all" style={{ width: `${((state!.index + 1) / tour.steps.length) * 100}%` }} /></div>
        </div>
      </div>
    </>
  );
}

/** Na een tour: zelf rondkijken in het uitgelegde deel, of door naar een volgende tour. */
function EndDialog({ ended, onClose }: { ended: { tour: Tour; finished: boolean }; onClose: () => void }) {
  const seen = new Set(parseSeen(typeof document !== "undefined" ? getCookie(SEEN_COOKIE) : ""));
  const i = TOURS.findIndex((t) => t.key === ended.tour.key);
  const next = [...TOURS.slice(i + 1), ...TOURS.slice(0, i)].find((t) => !seen.has(t.key));
  return (
    <div className="no-print fixed inset-0 z-[10000] flex items-end justify-center bg-ink-950/50 p-4 sm:items-center" role="dialog" aria-modal="true" aria-labelledby="tour-einde">
      <div className="w-full max-w-md overflow-hidden rounded-lg bg-white shadow-lift ring-1 ring-ink-900/10">
        <div className="h-1 bg-brass-500" />
        <div className="p-6">
          <div className="flex items-start justify-between gap-4">
            <p className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-ok-50 text-ok-700"><Check className="h-5 w-5" /></p>
            <button onClick={onClose} className="text-ink-400 hover:text-ink-900" aria-label="Sluiten"><X className="h-5 w-5" /></button>
          </div>
          <h2 id="tour-einde" className="mt-4 text-2xl text-ink-900">{ended.finished ? "Tour afgerond" : "Tour gestopt"}</h2>
          <p className="mt-2 text-ink-600">U kunt nu zelf rondkijken in {ended.tour.area}. Klikt u naar een deel dat nog niet is uitgelegd, dan kiest u eerst een tour.</p>
          <div className="mt-6 grid gap-2">
            {next && (
              <a href={`/demo/start/${next.key}`} className="btn btn-primary justify-between">
                <span className="flex items-center gap-2"><PlayCircle className="h-4 w-4" />Volgende: {next.title}</span><ArrowRight className="h-4 w-4" />
              </a>
            )}
            <button onClick={onClose} className="btn btn-secondary justify-start"><Compass className="h-4 w-4" />Zelf rondkijken</button>
            <a href="/demo" className="btn btn-ghost justify-start"><LayoutGrid className="h-4 w-4" />Alle tours</a>
          </div>
        </div>
      </div>
    </div>
  );
}
