"use client";
import { useId, useState } from "react";
import { Paperclip } from "lucide-react";
import { cn } from "@/lib/util/format";

/** Bestandskeuze in huisstijl, met Nederlandse tekst (de browserknop toont anders bijv. "Choose File"). */
export function FileField({ name, accept, required, className, placeholder = "Geen bestand gekozen" }: { name: string; accept?: string; required?: boolean; className?: string; placeholder?: string }) {
  const id = useId();
  const [file, setFile] = useState<string | null>(null);
  return (
    <span className={cn("flex min-w-0 items-center gap-2", className)}>
      <label htmlFor={id} className="btn btn-secondary btn-sm shrink-0 cursor-pointer focus-within:shadow-[var(--shadow-focus)]">
        <Paperclip className="h-4 w-4" />Bestand kiezen
        <input id={id} type="file" name={name} accept={accept} required={required} className="sr-only" onChange={(e) => setFile(e.currentTarget.files?.[0]?.name ?? null)} />
      </label>
      <span className={cn("min-w-0 truncate text-xs", file ? "text-ink-800" : "text-ink-500")}>{file ?? placeholder}</span>
    </span>
  );
}
