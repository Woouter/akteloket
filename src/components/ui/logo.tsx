import Link from "next/link";
import { cn } from "@/lib/util/format";

/** Beeldmerk (favicon, compacte plekken): marineblauw schild met serif A en messing punt. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={cn("h-8 w-8", className)} aria-hidden>
      <rect x="1" y="1" width="30" height="30" rx="5" fill="var(--color-ink-900)" />
      <text x="15" y="23.5" textAnchor="middle" fontFamily="var(--font-serif)" fontSize="20" fontWeight="600" fill="white">A</text>
      <circle cx="24.2" cy="22.4" r="1.8" fill="var(--color-brass-500)" />
    </svg>
  );
}

/** Woordmerk: serif "Akteloket" met messing punt — rustig en notarieel. */
export function Logo({ href = "/", className, tone = "dark" }: { href?: string; className?: string; tone?: "dark" | "light" }) {
  return (
    <Link href={href} className={cn("group inline-flex items-baseline", className)} aria-label="Akteloket, naar de homepage">
      <span className={cn("font-serif text-[1.55rem] font-semibold leading-none tracking-[-0.01em]", tone === "light" ? "text-white" : "text-ink-900")}>Akteloket</span>
      <span className="font-serif text-[1.55rem] font-semibold leading-none text-brass-500">.</span>
    </Link>
  );
}
