"use client";
import { useRef, useState } from "react";
import { Loader2, Paperclip, Upload } from "lucide-react";
import { cn } from "@/lib/util/format";
import { appendFile } from "@/lib/client/upload";

/** Compacte uploadknop die direct na kiezen uploadt (naar /api/portaal/[id]/upload). */
export function UploadButton({ dossierId, kind, extra = {}, back, label = "Upload document", className, variant = "secondary" }: { dossierId: string; kind: string; extra?: Record<string, string>; back?: string; label?: string; className?: string; variant?: "secondary" | "primary" | "dark" | "brass" }) {
  const ref = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  async function go(f: File) {
    setBusy(true);
    setErr(null);
    const fd = new FormData();
    try { await appendFile(fd, f); } catch (e) { setErr((e as Error).message); setBusy(false); return; }
    fd.append("kind", kind);
    for (const [k, v] of Object.entries(extra)) fd.append(k, v);
    const r = await fetch(`/api/portaal/${dossierId}/upload`, { method: "POST", body: fd, headers: { accept: "application/json" } });
    if (!r.ok) { setErr((await r.json().catch(() => ({}))).error ?? "Upload mislukt"); setBusy(false); return; }
    window.location.href = back ?? window.location.pathname + "?opgeslagen=1";
  }
  return (
    <span className={cn("inline-flex flex-col", className)}>
      <button type="button" className={cn("btn btn-sm", `btn-${variant}`)} onClick={() => ref.current?.click()} disabled={busy}>
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : kind === "koopovereenkomst" ? <Upload className="h-4 w-4" /> : <Paperclip className="h-4 w-4" />}{busy ? "Bezig met uploaden…" : label}
      </button>
      <input ref={ref} type="file" className="hidden" accept="application/pdf,image/jpeg,image/png,image/webp" onChange={(e) => { const f = e.target.files?.[0]; if (f) go(f); }} />
      {err && <span className="mt-1 text-xs text-bad-700">{err}</span>}
    </span>
  );
}
