"use client";
import { CheckCircle2, AlertTriangle, PencilLine, CircleDashed } from "lucide-react";
import { cn } from "@/lib/util/format";

export type FState = { state: "extracted" | "uncertain" | "missing" | "manual"; page?: number; snippet?: string } | undefined;

export function SourceTag({ s }: { s: FState }) {
  if (!s) return null;
  if (s.state === "extracted") return <span title={s.snippet} className="inline-flex items-center gap-1 text-[11px] font-semibold text-ok-700"><CheckCircle2 className="h-3 w-3" />Uit koopovereenkomst{s.page ? ` · p.${s.page}` : ""}</span>;
  if (s.state === "uncertain") return <span title={s.snippet} className="inline-flex items-center gap-1 text-[11px] font-semibold text-warn-700"><AlertTriangle className="h-3 w-3" />Controleer{s.page ? ` · p.${s.page}` : ""}</span>;
  if (s.state === "missing") return <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-bad-700"><CircleDashed className="h-3 w-3" />Vul aan</span>;
  return <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-ink-500"><PencilLine className="h-3 w-3" />Zelf ingevuld</span>;
}

export function RField({ label, value, onChange, s, type = "text", className, placeholder, options, inputMode }: { label: string; value: string | number | undefined; onChange: (v: string) => void; s?: FState; type?: string; className?: string; placeholder?: string; options?: [string, string][]; inputMode?: "numeric" | "decimal" | "text" }) {
  const touchedState = s?.state === "missing" && value ? "manual" : s?.state;
  const dataState = touchedState === "extracted" ? "extracted" : touchedState === "uncertain" ? "uncertain" : touchedState === "missing" ? "missing" : undefined;
  return (
    <label className={cn("block min-w-0", className)}>
      <span className="mb-1.5 flex items-center justify-between gap-2"><span className="label mb-0">{label}</span><SourceTag s={touchedState ? { ...s!, state: touchedState } : s} /></span>
      {options ? (
        <select className="select" data-state={dataState} value={value ?? ""} onChange={(e) => onChange(e.target.value)}>
          <option value="">Kies…</option>
          {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
      ) : (
        <input className="input" data-state={dataState} type={type} value={value ?? ""} placeholder={placeholder} inputMode={inputMode} onChange={(e) => onChange(e.target.value)} />
      )}
    </label>
  );
}
