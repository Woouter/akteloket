import Link from "next/link";
import { cn } from "@/lib/util/format";

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={cn("h-8 w-8", className)} aria-hidden>
      <rect x="1" y="1" width="30" height="30" rx="9" fill="var(--color-ink-900)" />
      <path d="M9 22.5 15.2 8.8a.9.9 0 0 1 1.6 0L23 22.5" fill="none" stroke="white" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M11.6 17.6h8.8" stroke="var(--color-brand-400)" strokeWidth="2.6" strokeLinecap="round" />
      <circle cx="23.6" cy="9.4" r="2.4" fill="var(--color-brand-400)" />
    </svg>
  );
}

export function Logo({ href = "/", className, tone = "dark" }: { href?: string; className?: string; tone?: "dark" | "light" }) {
  return (
    <Link href={href} className={cn("group inline-flex items-center gap-2.5", className)} aria-label="Akteloket — naar de homepage">
      <LogoMark />
      <span className={cn("text-[1.2rem] font-extrabold tracking-tight", tone === "light" ? "text-white" : "text-ink-900")}>
        akteloket<span className="text-brand-500">.</span>
      </span>
    </Link>
  );
}
