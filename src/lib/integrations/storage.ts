import "server-only";
import { eq } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { decrypt, encrypt } from "@/lib/util/crypto";
import { sha256, uid } from "@/lib/util/ids";
import type { DocumentKind, Visibility } from "@/lib/domain/types";
import { DOCUMENT_KINDS } from "@/lib/domain/types";

export interface SaveDocInput {
  dossierId: string;
  partyId?: string | null;
  kind: DocumentKind;
  title?: string;
  filename: string;
  mime: string;
  content: Buffer;
  source: "upload" | "kadaster" | "gegenereerd" | "notaris" | "geldverstrekker" | "idcheck";
  visibility?: Visibility;
  meta?: Record<string, unknown>;
  createdBy?: string | null;
  /** Vervang de vorige versie van hetzelfde soort document (zelfde partij). */
  replaceKind?: boolean;
}

/** Slaat een document versleuteld op in de database en geeft het nieuwe id terug. */
export async function saveDocument(input: SaveDocInput): Promise<string> {
  const db = await getDb();
  const id = uid();
  let version = 1;
  if (input.replaceKind) {
    const all = await db
      .select({ id: schema.documents.id, kind: schema.documents.kind, version: schema.documents.version, partyId: schema.documents.partyId, supersededBy: schema.documents.supersededBy })
      .from(schema.documents)
      .where(eq(schema.documents.dossierId, input.dossierId));
    const same = all.filter((d) => d.kind === input.kind && !d.supersededBy && (d.partyId ?? null) === (input.partyId ?? null));
    if (same.length) version = Math.max(...same.map((s) => s.version)) + 1;
    await db.insert(schema.documents).values(row(id, input, version));
    for (const s of same) await db.update(schema.documents).set({ supersededBy: id }).where(eq(schema.documents.id, s.id));
    return id;
  }
  await db.insert(schema.documents).values(row(id, input, version));
  return id;
}

function row(id: string, input: SaveDocInput, version: number) {
  return {
    id,
    dossierId: input.dossierId,
    partyId: input.partyId ?? null,
    kind: input.kind,
    title: input.title ?? DOCUMENT_KINDS[input.kind],
    filename: input.filename,
    mime: input.mime,
    size: input.content.length,
    sha256: sha256(input.content),
    content: encrypt(input.content),
    source: input.source,
    visibility: input.visibility ?? "intern",
    meta: input.meta ?? {},
    version,
    createdBy: input.createdBy ?? null,
  };
}

export async function readDocument(id: string) {
  const db = await getDb();
  const [doc] = await db.select().from(schema.documents).where(eq(schema.documents.id, id)).limit(1);
  if (!doc) return null;
  return { ...doc, content: decrypt(doc.content) };
}

export async function updateDocumentMeta(id: string, meta: Record<string, unknown>) {
  const db = await getDb();
  const [doc] = await db.select({ meta: schema.documents.meta }).from(schema.documents).where(eq(schema.documents.id, id)).limit(1);
  await db.update(schema.documents).set({ meta: { ...(doc?.meta ?? {}), ...meta } }).where(eq(schema.documents.id, id));
}
