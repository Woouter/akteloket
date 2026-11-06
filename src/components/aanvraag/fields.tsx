"use client";
import { useRef } from "react";
import { CheckCircle2, AlertTriangle, PencilLine, CircleDashed } from "lucide-react";
import { cn } from "@/lib/util/format";

export type FState = { state: "extracted" | "uncertain" | "missing" | "manual" | "edited"; page?: number; snippet?: string } | undefined;

export function SourceTag({ s, className }: { s: FState; className?: string }) {
  if (!s) return null;
  const base = cn("inline-flex items-center gap-1 text-[11px] font-semibold", className);
  if (s.state === "extracted") return <span title={s.snippet} className={cn(base, "text-ok-700")}><CheckCircle2 className="h-3 w-3 shrink-0" />Uit koopovereenkomst{s.page ? ` (p. ${s.page})` : ""}</span>;
  if (s.state === "uncertain") return <span title={s.snippet} className={cn(base, "text-warn-700")}><AlertTriangle className="h-3 w-3 shrink-0" />Controleer{s.page ? ` (p. ${s.page})` : ""}</span>;
  if (s.state === "missing") return <span className={cn(base, "text-bad-700")}><CircleDashed className="h-3 w-3 shrink-0" />Vul aan</span>;
  if (s.state === "edited") return <span title={s.snippet ? `Oorspronkelijk: ${s.snippet}` : undefined} className={cn(base, "text-ink-600")}><PencilLine className="h-3 w-3 shrink-0" />Zelf aangepast</span>;
  return <span className={cn(base, "text-ink-500")}><PencilLine className="h-3 w-3 shrink-0" />Zelf ingevuld</span>;
}

/**
 * Invoerveld met bronlabel. Het label staat onder het veld, zodat lange labels de velden
 * in een rij niet uit lijn duwen. Wijkt de waarde af van wat we hebben uitgelezen, dan
 * tonen we "Zelf aangepast" in plaats van "Uit koopovereenkomst".
 */
export function RField({ label, value, onChange, s, type = "text", className, placeholder, options, inputMode, required }: { label: string; value: string | number | undefined; onChange: (v: string) => void; s?: FState; type?: string; className?: string; placeholder?: string; options?: [string, string][]; inputMode?: "numeric" | "decimal" | "text"; required?: boolean }) {
  const initial = useRef(value);
  const changed = String(value ?? "") !== String(initial.current ?? "");
  let state = s?.state;
  if (state === "missing" && value) state = "manual";
  else if ((state === "extracted" || state === "uncertain") && changed) state = "edited";
  const shown: FState = state ? { ...s, state, snippet: state === "edited" ? String(initial.current ?? "") : s?.snippet } : undefined;
  const dataState = state === "extracted" ? "extracted" : state === "uncertain" ? "uncertain" : state === "missing" ? "missing" : undefined;
  return (
    <label className={cn("block min-w-0", className)}>
      <span className="label">{label}{required && <span className="text-bad-600"> *</span>}</span>
      {options ? (
        <select className="select" data-state={dataState} value={value ?? ""} onChange={(e) => onChange(e.target.value)}>
          <option value="">Kies…</option>
          {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
      ) : (
        <input className="input" data-state={dataState} type={type} value={value ?? ""} placeholder={placeholder} inputMode={inputMode} onChange={(e) => onChange(e.target.value)} />
      )}
      {shown && <SourceTag s={shown} className="mt-1" />}
    </label>
  );
}
