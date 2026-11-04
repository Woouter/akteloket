"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, ArrowRight, X, Sparkles } from "lucide-react";
import { TOURS, type Tour } from "@/lib/demo/tours";

const KEY = "akteloket.tour";
type State = { key: string; index: number } | null;

function read(): State {
  try { return JSON.parse(localStorage.getItem(KEY) ?? "null"); } catch { return null; }
}
function write(s: State) {
  try { if (s) localStorage.setItem(KEY, JSON.stringify(s)); else localStorage.removeItem(KEY); } catch { /* geen opslag beschikbaar */ }
}

export function TourProvider({ mainId }: { mainId?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [state, setState] = useState<State>(null);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [ready, setReady] = useState(false);
  const popRef = useRef<HTMLDivElement>(null);
  const [pop, setPop] = useState<{ top: number; left: number; mobile: boolean }>({ top: 0, left: 0, mobile: false });

  const resolve = useCallback((p: string) => p.replace("{main}", mainId ?? ""), [mainId]);

  // Start via ?tour=key&step=n
  useEffect(() => {
    const t = params.get("tour");
    if (t && TOURS.some((x) => x.key === t)) {
      const s = { key: t, index: Number(params.get("step") ?? 0) };
      write(s);
      setState(s);
      const url = new URL(window.location.href);
      url.searchParams.delete("tour");
      url.searchParams.delete("step");
      window.history.replaceState(null, "", url.pathname + (url.search ? url.search : "") + url.hash);
    } else {
      setState(read());
    }
    setReady(true);
  }, [params]);

  const tour: Tour | undefined = state ? TOURS.find((t) => t.key === state.key) : undefined;
  const step = tour && state ? tour.steps[state.index] : undefined;
  const onPage = !!step && resolve(step.path) === pathname;

  // Zoek het doelelement en volg het bij scroll/resize
  useLayoutEffect(() => {
    if (!onPage || !step) { setRect(null); return; }
    let el: Element | null = null;
    let tries = 0;
    let raf = 0;
    const find = () => {
      el = step.target ? document.querySelector(`[data-tour="${step.target}"]`) : null;
      if (!el && step.target && tries++ < 40) { raf = window.setTimeout(find, 75) as unknown as number; return; }
      if (el) {
        const r = el.getBoundingClientRect();
        const offscreen = r.top < 80 || r.bottom > window.innerHeight - 40;
        if (offscreen) el.scrollIntoView({ behavior: "smooth", block: r.height > window.innerHeight * 0.6 ? "start" : "center" });
        window.setTimeout(() => setRect(el!.getBoundingClientRect()), offscreen ? 420 : 0);
      } else setRect(null);
    };
    find();
    const upd = () => { if (el) setRect(el.getBoundingClientRect()); };
    window.addEventListener("scroll", upd, { passive: true });
    window.addEventListener("resize", upd);
    return () => { clearTimeout(raf); window.removeEventListener("scroll", upd); window.removeEventListener("resize", upd); };
  }, [onPage, step, state?.index]);

  // Positioneer de popover
  useLayoutEffect(() => {
    if (!onPage) return;
    const w = window.innerWidth, h = window.innerHeight;
    const pw = Math.min(380, w - 32);
    const ph = popRef.current?.offsetHeight ?? 220;
    const mobile = w < 640;
    if (mobile || !rect || step?.placement === "center") {
      setPop({ top: mobile ? h - ph - 16 : h / 2 - ph / 2, left: mobile ? 16 : w / 2 - pw / 2, mobile });
      return;
    }
    let top = rect.bottom + 14, left = rect.left;
    const pl = step?.placement ?? "bottom";
    if (pl === "top") top = rect.top - ph - 14;
    if (pl === "left") { top = rect.top; left = rect.left - pw - 14; }
    if (pl === "right") { top = rect.top; left = rect.right + 14; }
    if (top + ph > h - 12) top = Math.max(12, rect.top - ph - 14);
    if (top < 12) top = Math.min(h - ph - 12, rect.bottom + 14);
    if (left + pw > w - 16) left = w - pw - 16;
    if (left < 16) left = 16;
    setPop({ top, left, mobile });
  }, [rect, onPage, step?.placement, state?.index]);

  const go = (index: number) => {
    if (!tour) return;
    if (index >= tour.steps.length) { stop(); return; }
    if (index < 0) return;
    const s = { key: tour.key, index };
    write(s);
    setState(s);
    const target = resolve(tour.steps[index].path);
    if (target !== pathname) router.push(target);
  };
  const stop = () => { write(null); setState(null); setRect(null); };

  // Toetsenbord
  useEffect(() => {
    if (!onPage) return;
    const k = (e: KeyboardEvent) => {
      if (e.key === "Escape") stop();
      if (e.key === "ArrowRight") go((state?.index ?? 0) + 1);
      if (e.key === "ArrowLeft") go((state?.index ?? 0) - 1);
    };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  });

  if (!ready || !tour || !step) return null;

  if (!onPage) {
    return (
      <div className="no-print fixed bottom-4 right-4 z-[9999] flex items-center gap-3 rounded-2xl bg-ink-900 px-4 py-3 text-sm text-white shadow-lift">
        <Sparkles className="h-4 w-4 text-brand-300" />
        <span>Tour “{tour.title}” · stap {state!.index + 1}/{tour.steps.length}</span>
        <button className="btn btn-sm bg-white text-ink-900" onClick={() => router.push(resolve(step.path))}>Ga verder</button>
        <button className="text-ink-300 hover:text-white" onClick={stop} aria-label="Tour stoppen"><X className="h-4 w-4" /></button>
      </div>
    );
  }

  const pad = 8;
  return (
    <>
      {rect ? (
        <div className="tour-spotlight" style={{ top: rect.top - pad, left: rect.left - pad, width: rect.width + pad * 2, height: rect.height + pad * 2 }} />
      ) : (
        <div className="fixed inset-0 z-[9998] bg-ink-950/60" />
      )}
      <div ref={popRef} className="tour-popover no-print" style={{ top: pop.top, left: pop.left, width: pop.mobile ? "calc(100vw - 32px)" : Math.min(380, typeof window !== "undefined" ? window.innerWidth - 32 : 380) }} role="dialog" aria-label={step.title}>
        <div className="overflow-hidden rounded-2xl bg-white shadow-lift ring-1 ring-ink-900/10">
          <div className="flex items-center justify-between bg-ink-900 px-4 py-2.5 text-xs text-ink-200">
            <span className="flex items-center gap-1.5 font-semibold text-white"><Sparkles className="h-3.5 w-3.5 text-brand-300" />{tour.title}</span>
            <span className="tabular">{state!.index + 1} / {tour.steps.length}</span>
          </div>
          <div className="p-4">
            <p className="text-base font-bold text-ink-900">{step.title}</p>
            <p className="mt-1.5 text-sm leading-relaxed text-ink-600">{step.body}</p>
            <div className="mt-4 flex items-center justify-between gap-2">
              <button onClick={stop} className="text-sm font-medium text-ink-500 hover:text-ink-900">Stoppen</button>
              <div className="flex gap-2">
                <button onClick={() => go(state!.index - 1)} disabled={state!.index === 0} className="btn btn-secondary btn-sm" aria-label="Vorige"><ArrowLeft className="h-4 w-4" /></button>
                <button onClick={() => go(state!.index + 1)} className="btn btn-primary btn-sm">
                  {state!.index + 1 === tour.steps.length ? "Afronden" : "Volgende"} <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
          <div className="h-1 bg-ink-100"><div className="h-full bg-brand-500 transition-all" style={{ width: `${((state!.index + 1) / tour.steps.length) * 100}%` }} /></div>
        </div>
      </div>
    </>
  );
}
