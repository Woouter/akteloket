"use client";

/** Bestanden boven deze grootte gaan rechtstreeks naar de opslag-inbox (limiet Vercel ≈ 4,5 MB). */
const DIRECT_LIMIT = 4 * 1024 * 1024;

/**
 * Voegt een bestand toe aan een FormData: klein → direct als `file`; groot → eerst
 * rechtstreeks naar de inbox, daarna alleen het pad (`inboxPath`) meesturen.
 */
export async function appendFile(fd: FormData, file: File): Promise<void> {
  if (file.size <= DIRECT_LIMIT) { fd.append("file", file); return; }
  const r = await fetch("/api/upload/sign", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ filename: file.name, size: file.size }) });
  const j = await r.json();
  if (!r.ok) throw new Error(j.error ?? "Upload voorbereiden mislukt");
  if (j.mode !== "signed") { fd.append("file", file); return; }
  const body = new FormData();
  body.append("cacheControl", "3600");
  body.append("", file);
  const up = await fetch(j.uploadUrl, { method: "PUT", body, headers: { "x-upsert": "false" } });
  if (!up.ok) throw new Error("Uploaden naar beveiligde opslag mislukt");
  fd.append("inboxPath", j.path);
  fd.append("filename", file.name);
  fd.append("mime", file.type || "application/pdf");
}
