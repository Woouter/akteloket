import type { ReactNode } from "react";
import { Check, Clock, Lock, Minus, AlertTriangle, Loader2, Hourglass } from "lucide-react";
import { cn } from "@/lib/util/format";
import type { StepState } from "@/lib/workflow/steps";

export function Badge({ children, tone = "neutral", className }: { children: ReactNode; tone?: "neutral" | "brand" | "ok" | "warn" | "bad" | "koper" | "verkoper" | "notaris" | "platform" | "dark"; className?: string }) {
  const tones: Record<string, string> = {
    neutral: "bg-ink-100 text-ink-700",
    brand: "bg-brand-100 text-brand-800",
    ok: "bg-ok-100 text-ok-700",
    warn: "bg-warn-100 text-warn-700",
    bad: "bg-bad-100 text-bad-700",
    koper: "bg-koper-100 text-koper-600",
    verkoper: "bg-verkoper-100 text-verkoper-700",
    notaris: "bg-notaris-100 text-notaris-700",
    platform: "bg-platform-100 text-platform-600",
    dark: "bg-ink-900 text-white",
  };
  return <span className={cn("chip", tones[tone], className)}>{children}</span>;
}

export function StateIcon({ state, size = "md" }: { state: StepState; size?: "sm" | "md" | "lg" }) {
  const s = size === "sm" ? "h-5 w-5" : size === "lg" ? "h-9 w-9" : "h-7 w-7";
  const i = size === "sm" ? "h-3 w-3" : size === "lg" ? "h-4.5 w-4.5" : "h-3.5 w-3.5";
  switch (state) {
    case "done": return <span className={cn(s, "inline-flex shrink-0 items-center justify-center rounded-full bg-ok-600 text-white")}><Check className={i} strokeWidth={3} /></span>;
    case "attention": return <span className={cn(s, "inline-flex shrink-0 items-center justify-center rounded-full bg-warn-100 text-warn-700 ring-1 ring-warn-600/30")}><AlertTriangle className={i} /></span>;
    case "in_progress": return <span className={cn(s, "inline-flex shrink-0 items-center justify-center rounded-full bg-brand-100 text-brand-700 ring-1 ring-brand-500/30")}><Loader2 className={cn(i, "animate-[spin_2.5s_linear_infinite]")} /></span>;
    case "waiting": return <span className={cn(s, "inline-flex shrink-0 items-center justify-center rounded-full bg-platform-100 text-platform-600")}><Hourglass className={i} /></span>;
    case "locked": return <span className={cn(s, "inline-flex shrink-0 items-center justify-center rounded-full bg-ink-100 text-ink-400")}><Lock className={i} /></span>;
    case "na": return <span className={cn(s, "inline-flex shrink-0 items-center justify-center rounded-full bg-ink-50 text-ink-300 ring-1 ring-ink-100")}><Minus className={i} /></span>;
    default: return <span className={cn(s, "inline-flex shrink-0 items-center justify-center rounded-full bg-white text-ink-500 ring-2 ring-ink-200")}><Clock className={i} /></span>;
  }
}

export function StateChip({ state, label }: { state: StepState; label: string }) {
  const t: Record<StepState, string> = {
    done: "bg-ok-50 text-ok-700 ring-ok-600/15",
    attention: "bg-warn-50 text-warn-700 ring-warn-600/20",
    in_progress: "bg-brand-50 text-brand-700 ring-brand-500/20",
    waiting: "bg-platform-50 text-platform-600 ring-platform-600/15",
    locked: "bg-ink-50 text-ink-500 ring-ink-200",
    na: "bg-ink-50 text-ink-400 ring-ink-100",
    todo: "bg-white text-ink-700 ring-ink-200",
  };
  // Ellips werkt niet op een inline-flex container zelf; daarom een binnenste span.
  return <span className={cn("chip ring-1 max-w-full", t[state])} title={label}><span className="min-w-0 truncate">{label}</span></span>;
}

export function Card({ children, className, ...rest }: { children: ReactNode; className?: string } & React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("card", className)} {...rest}>{children}</div>;
}

export function SectionTitle({ eyebrow, title, intro, center, className }: { eyebrow?: string; title: ReactNode; intro?: ReactNode; center?: boolean; className?: string }) {
  return (
    <div className={cn("max-w-2xl", center && "mx-auto text-center", className)}>
      {eyebrow && <p className="eyebrow mb-3">{eyebrow}</p>}
      <h2 className="text-3xl leading-tight text-ink-900 sm:text-[2.5rem]">{title}</h2>
      {intro && <p className="mt-4 text-lg leading-relaxed text-ink-600">{intro}</p>}
    </div>
  );
}

export function Field({ label, hint, children, className, required }: { label: string; hint?: ReactNode; children: ReactNode; className?: string; required?: boolean }) {
  return (
    <label className={cn("block", className)}>
      <span className="label">{label}{required && <span className="text-bad-600"> *</span>}</span>
      {children}
      {hint && <span className="hint block">{hint}</span>}
    </label>
  );
}

export function Notice({ tone = "info", title, children, icon, className }: { tone?: "info" | "ok" | "warn" | "bad" | "demo"; title?: ReactNode; children?: ReactNode; icon?: ReactNode; className?: string }) {
  const t: Record<string, string> = {
    info: "bg-brand-50 border-brand-100 text-ink-800",
    ok: "bg-ok-50 border-ok-100 text-ink-800",
    warn: "bg-warn-50 border-warn-100 text-ink-800",
    bad: "bg-bad-50 border-bad-100 text-ink-800",
    demo: "bg-notaris-50 border-notaris-100 text-ink-800",
  };
  return (
    <div className={cn("flex gap-3 rounded-xl border p-4 text-sm leading-relaxed", t[tone], className)}>
      {icon && <span className="mt-0.5 shrink-0">{icon}</span>}
      <div className="min-w-0">
        {title && <p className="font-semibold text-ink-900">{title}</p>}
        {children && <div className={cn(title ? "mt-1" : "", "text-ink-700")}>{children}</div>}
      </div>
    </div>
  );
}

export function KV({ rows, className }: { rows: [ReactNode, ReactNode][]; className?: string }) {
  return (
    <dl className={cn("divide-y divide-ink-100 text-sm", className)}>
      {rows.map(([k, v], i) => (
        <div key={i} className="grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-4 py-2.5">
          <dt className="text-ink-500">{k}</dt>
          <dd className="min-w-0 break-words font-medium text-ink-900">{v ?? "–"}</dd>
        </div>
      ))}
    </dl>
  );
}

export function ProgressBar({ pct, className, tone = "brand" }: { pct: number; className?: string; tone?: "brand" | "ok" | "koper" | "verkoper" }) {
  const c = { brand: "bg-brand-600", ok: "bg-ok-600", koper: "bg-koper-500", verkoper: "bg-verkoper-600" }[tone];
  return (
    <div className={cn("h-2 w-full overflow-hidden rounded-full bg-ink-100", className)} role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
      <div className={cn("h-full rounded-full transition-all duration-700", c)} style={{ width: `${pct}%` }} />
    </div>
  );
}

export function EmptyState({ icon, title, children }: { icon?: ReactNode; title: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-dashed border-ink-200 bg-white/60 px-6 py-10 text-center">
      {icon && <div className="mb-3 text-ink-300">{icon}</div>}
      <p className="font-semibold text-ink-800">{title}</p>
      {children && <div className="mt-1 max-w-md text-sm text-ink-500">{children}</div>}
    </div>
  );
}
