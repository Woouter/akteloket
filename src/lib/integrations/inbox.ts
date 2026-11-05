import "server-only";
import { uid } from "@/lib/util/ids";

/**
 * Upload-inbox via Supabase Storage.
 *
 * Vercel accepteert maximaal ~4,5 MB per request. Grotere bestanden (bijv. een gescande
 * koopovereenkomst) uploadt de browser daarom rechtstreeks naar een privé-bucket met een
 * eenmalige, ondertekende upload-URL. De server haalt het bestand daarna op, verwerkt en
 * versleutelt het (zoals bij een gewone upload) en verwijdert het uit de inbox.
 *
 * Zonder SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY (lokaal, Docker) gaat alles direct.
 */
const BUCKET = process.env.SUPABASE_INBOX_BUCKET || "inbox";

export function inboxConfigured(): boolean {
  return !!(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

function headers(extra: Record<string, string> = {}): Record<string, string> {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  // Nieuwe Supabase-sleutels (sb_secret_…) gaan alleen in `apikey`; de oude service_role-JWT ook als Bearer.
  return key.startsWith("sb_") ? { apikey: key, ...extra } : { apikey: key, Authorization: `Bearer ${key}`, ...extra };
}

const base = () => `${process.env.SUPABASE_URL!.replace(/\/$/, "")}/storage/v1`;

export async function signInboxUpload(filename: string): Promise<{ uploadUrl: string; path: string }> {
  const safe = filename.replace(/[^\w.\-]+/g, "_").slice(-80) || "bestand";
  const path = `${new Date().toISOString().slice(0, 10)}/${uid()}-${safe}`;
  const res = await fetch(`${base()}/object/upload/sign/${BUCKET}/${path}`, { method: "POST", headers: headers({ "content-type": "application/json" }), body: JSON.stringify({}) });
  if (!res.ok) throw new Error(`Upload-URL aanmaken mislukt (${res.status})`);
  const j = (await res.json()) as { url: string };
  return { uploadUrl: `${base()}${j.url}`, path };
}

export async function readInbox(path: string): Promise<Buffer> {
  if (!/^[\w\-/.]+$/.test(path) || path.includes("..")) throw new Error("Ongeldig pad");
  const res = await fetch(`${base()}/object/${BUCKET}/${path}`, { headers: headers() });
  if (!res.ok) throw new Error(`Bestand niet gevonden in inbox (${res.status})`);
  return Buffer.from(await res.arrayBuffer());
}

export async function deleteInbox(path: string): Promise<void> {
  await fetch(`${base()}/object/${BUCKET}`, { method: "DELETE", headers: headers({ "content-type": "application/json" }), body: JSON.stringify({ prefixes: [path] }) }).catch(() => undefined);
}

/**
 * Ruim achtergebleven uploads op (afgebroken aanvragen). Paden beginnen met de datum
 * (JJJJ-MM-DD/…); alles van vóór gisteren wordt verwijderd. Aangeroepen door de cron.
 */
export async function purgeInbox(): Promise<number> {
  if (!inboxConfigured()) return 0;
  const list = async (prefix: string) => {
    const res = await fetch(`${base()}/object/list/${BUCKET}`, { method: "POST", headers: headers({ "content-type": "application/json" }), body: JSON.stringify({ prefix, limit: 1000, offset: 0 }) });
    return res.ok ? ((await res.json()) as { name: string }[]) : [];
  };
  const cutoff = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);
  let removed = 0;
  for (const dir of await list("")) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dir.name) || dir.name >= cutoff) continue;
    const files = (await list(`${dir.name}/`)).map((f) => `${dir.name}/${f.name}`);
    if (!files.length) continue;
    await fetch(`${base()}/object/${BUCKET}`, { method: "DELETE", headers: headers({ "content-type": "application/json" }), body: JSON.stringify({ prefixes: files }) }).catch(() => undefined);
    removed += files.length;
  }
  return removed;
}

/** Haal een bestand op uit een multipart-formulier óf uit de inbox (veld `inboxPath`). */
export async function fileFromForm(fd: FormData): Promise<{ buf: Buffer; filename: string; mime: string; size: number } | null> {
  const file = fd.get("file");
  if (file instanceof File && file.size > 0) return { buf: Buffer.from(await file.arrayBuffer()), filename: file.name, mime: file.type || "application/pdf", size: file.size };
  const inboxPath = fd.get("inboxPath");
  if (typeof inboxPath === "string" && inboxPath && inboxConfigured()) {
    const buf = await readInbox(inboxPath);
    await deleteInbox(inboxPath);
    return { buf, filename: String(fd.get("filename") ?? "document.pdf"), mime: String(fd.get("mime") ?? "application/pdf"), size: buf.length };
  }
  return null;
}
