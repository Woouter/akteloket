import type { ReactNode } from "react";
import { cn } from "@/lib/util/format";

/**
 * Een pagina-band met eigen achtergrond. Pagina's wisselen banden af (wit, papier,
 * zand, marine), zodat een lange pagina ritme krijgt in plaats van één doorlopend vlak.
 */
export type BandTone = "white" | "paper" | "sand" | "navy";

const TONE: Record<BandTone, string> = {
  white: "bg-white",
  paper: "bg-paper",
  sand: "bg-sand-100",
  navy: "bg-ink-900 text-white band-navy",
};

export function Band({ tone = "paper", pad = "default", border = tone !== "navy", children, className, inner, id, ...rest }: { tone?: BandTone; pad?: "default" | "compact"; border?: boolean; children: ReactNode; className?: string; inner?: string; id?: string } & Record<`data-${string}`, string>) {
  return (
    <section id={id} className={cn(pad === "compact" ? "py-14 lg:py-16" : "py-20 lg:py-24", TONE[tone], border && "border-t border-ink-200/70", className)} {...rest}>
      <div className={cn("container-page", inner)}>{children}</div>
    </section>
  );
}

/** Eigen vinkje voor opsommingen (in plaats van een standaard check-icoon). */
export function Tick({ className, tone = "light" }: { className?: string; tone?: "light" | "dark" }) {
  return (
    <svg viewBox="0 0 20 20" aria-hidden className={cn("mt-[0.2em] h-[1.05em] w-[1.05em] shrink-0", className)}>
      <rect x="3.2" y="4.2" width="13" height="13" rx="1.5" fill={tone === "dark" ? "var(--color-brass-500)" : "var(--color-brass-200)"} opacity={tone === "dark" ? 0.35 : 1} />
      <path d="M4.5 10.2 L8.6 14 L16.8 4.6" fill="none" stroke={tone === "dark" ? "var(--color-brass-300)" : "var(--color-ink-900)"} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
