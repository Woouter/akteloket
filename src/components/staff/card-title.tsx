import { cn } from "@/lib/util/format";

/** Kaarttitel in de werkplek: serif, rustig gewicht, optioneel met icoon. */
export function CardTitle({ icon, children, className, as: Tag = "h2" }: { icon?: React.ReactNode; children: React.ReactNode; className?: string; as?: "h2" | "h3" | "p" }) {
  return <Tag className={cn("flex items-center gap-2 font-serif text-[1.0625rem] font-semibold leading-snug text-ink-900", className)}>{icon}{children}</Tag>;
}
