"use client";
import { useState } from "react";
import { CheckCircle2, Loader2, Send } from "lucide-react";

export function LeadForm({ kind, fields = ["name", "email", "phone", "message"], submitLabel = "Versturen", extra }: { kind: "contact" | "partner" | "terugbellen"; fields?: ("name" | "email" | "phone" | "message" | "company")[]; submitLabel?: string; extra?: React.ReactNode }) {
  const [state, setState] = useState<"idle" | "busy" | "done" | "error">("idle");
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setState("busy");
    const fd = new FormData(e.currentTarget);
    const res = await fetch("/api/leads", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ kind, ...Object.fromEntries(fd) }) });
    setState(res.ok ? "done" : "error");
  }
  if (state === "done") return <div className="flex items-start gap-3 rounded-2xl bg-ok-50 p-6 text-ink-800 ring-1 ring-ok-600/15"><CheckCircle2 className="h-6 w-6 shrink-0 text-ok-600" /><div><p className="font-semibold">Bedankt, we hebben je bericht ontvangen.</p><p className="mt-1 text-sm text-ink-600">We reageren binnen één werkdag.</p></div></div>;
  return (
    <form onSubmit={submit} className="grid gap-4">
      {fields.includes("name") && <label className="block"><span className="label">Naam</span><input name="name" required className="input" autoComplete="name" /></label>}
      {fields.includes("company") && <label className="block"><span className="label">Kantoor / bedrijf</span><input name="company" className="input" autoComplete="organization" /></label>}
      <div className="grid gap-4 sm:grid-cols-2">
        {fields.includes("email") && <label className="block"><span className="label">E-mailadres</span><input name="email" type="email" required className="input" autoComplete="email" /></label>}
        {fields.includes("phone") && <label className="block"><span className="label">Telefoon</span><input name="phone" className="input" autoComplete="tel" /></label>}
      </div>
      {extra}
      {fields.includes("message") && <label className="block"><span className="label">Bericht</span><textarea name="message" rows={4} className="textarea" /></label>}
      <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />
      <button className="btn btn-primary justify-self-start" disabled={state === "busy"}>{state === "busy" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}{submitLabel}</button>
      {state === "error" && <p className="text-sm text-bad-700">Er ging iets mis. Probeer het opnieuw of mail ons.</p>}
    </form>
  );
}
