import "server-only";
import { and, asc, desc, eq, inArray, isNull } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import type { Appointment, Check, Dossier, DocumentRow, EventRow, Handover, Party, Payoff, RequestRow, User } from "@/lib/db/schema";
import type { DossierData, PartyData, Side } from "./types";
import { uid } from "@/lib/util/ids";

export type DocMeta = Omit<DocumentRow, "content">;

export interface DossierView {
  dossier: Dossier;
  data: DossierData;
  parties: Party[];
  kopers: Party[];
  verkopers: Party[];
  documents: DocMeta[];
  checks: Check[];
  requests: RequestRow[];
  appointments: Appointment[];
  payoffs: Payoff[];
  handovers: Handover[];
}

const docColumns = {
  id: schema.documents.id,
  dossierId: schema.documents.dossierId,
  partyId: schema.documents.partyId,
  kind: schema.documents.kind,
  title: schema.documents.title,
  filename: schema.documents.filename,
  mime: schema.documents.mime,
  size: schema.documents.size,
  sha256: schema.documents.sha256,
  source: schema.documents.source,
  visibility: schema.documents.visibility,
  meta: schema.documents.meta,
  version: schema.documents.version,
  supersededBy: schema.documents.supersededBy,
  createdBy: schema.documents.createdBy,
  createdAt: schema.documents.createdAt,
};

export async function loadDossierView(id: string): Promise<DossierView | null> {
  const db = await getDb();
  const [dossier] = await db.select().from(schema.dossiers).where(eq(schema.dossiers.id, id)).limit(1);
  if (!dossier) return null;
  const [parties, documents, checks, requests, appointments, payoffs, handovers] = await Promise.all([
    db.select().from(schema.parties).where(eq(schema.parties.dossierId, id)).orderBy(asc(schema.parties.side), asc(schema.parties.position)),
    db.select(docColumns).from(schema.documents).where(and(eq(schema.documents.dossierId, id), isNull(schema.documents.supersededBy))).orderBy(desc(schema.documents.createdAt)),
    db.select().from(schema.checks).where(eq(schema.checks.dossierId, id)),
    db.select().from(schema.requests).where(eq(schema.requests.dossierId, id)).orderBy(desc(schema.requests.createdAt)),
    db.select().from(schema.appointments).where(eq(schema.appointments.dossierId, id)).orderBy(asc(schema.appointments.startsAt)),
    db.select().from(schema.payoffs).where(eq(schema.payoffs.dossierId, id)).orderBy(asc(schema.payoffs.createdAt)),
    db.select().from(schema.handovers).where(eq(schema.handovers.dossierId, id)).orderBy(asc(schema.handovers.version)),
  ]);
  return {
    dossier,
    data: dossier.data,
    parties,
    kopers: parties.filter((p) => p.side === "koper"),
    verkopers: parties.filter((p) => p.side === "verkoper"),
    documents,
    checks,
    requests,
    appointments,
    payoffs,
    handovers,
  };
}

export async function listDossiers(filter?: { demo?: boolean }): Promise<Dossier[]> {
  const db = await getDb();
  const q = db.select().from(schema.dossiers).orderBy(desc(schema.dossiers.updatedAt));
  const rows = await q;
  return rows.filter((r) => r.status !== "concept" && (filter?.demo === undefined || r.isDemo === filter.demo));
}

export async function listPartiesFor(dossierIds: string[]): Promise<Party[]> {
  if (!dossierIds.length) return [];
  const db = await getDb();
  return db.select().from(schema.parties).where(inArray(schema.parties.dossierId, dossierIds));
}

/** Werk het dossier-JSON bij met een mutator (lezen-wijzigen-schrijven). */
export async function updateDossier(id: string, mutate: (d: DossierData, row: Dossier) => void | Partial<Pick<Dossier, "status" | "draftToken">>): Promise<Dossier> {
  const db = await getDb();
  const [row] = await db.select().from(schema.dossiers).where(eq(schema.dossiers.id, id)).limit(1);
  if (!row) throw new Error("Dossier niet gevonden");
  const data = structuredClone(row.data);
  const extra = mutate(data, row) || {};
  const [updated] = await db
    .update(schema.dossiers)
    .set({ data, updatedAt: new Date(), ...(extra as object) })
    .where(eq(schema.dossiers.id, id))
    .returning();
  return updated;
}

export async function setDossierStatus(id: string, status: Dossier["status"]): Promise<void> {
  const db = await getDb();
  await db.update(schema.dossiers).set({ status, updatedAt: new Date() }).where(eq(schema.dossiers.id, id));
}

export async function updateParty(id: string, mutate: (d: PartyData, row: Party) => void | Partial<Pick<Party, "email" | "phone" | "displayName" | "activatedAt" | "userId" | "invitedAt" | "inviteToken">>): Promise<Party> {
  const db = await getDb();
  const [row] = await db.select().from(schema.parties).where(eq(schema.parties.id, id)).limit(1);
  if (!row) throw new Error("Partij niet gevonden");
  const data = structuredClone(row.data);
  const extra = mutate(data, row) || {};
  const [updated] = await db.update(schema.parties).set({ data, ...(extra as object) }).where(eq(schema.parties.id, id)).returning();
  await db.update(schema.dossiers).set({ updatedAt: new Date() }).where(eq(schema.dossiers.id, row.dossierId));
  return updated;
}

export async function logEvent(e: {
  dossierId?: string | null;
  actorType: EventRow["actorType"];
  actor?: Pick<User, "id" | "name"> | null;
  actorName?: string;
  type: string;
  message: string;
  visibleTo?: EventRow["visibleTo"];
  data?: Record<string, unknown>;
}): Promise<void> {
  const db = await getDb();
  await db.insert(schema.events).values({
    id: uid(),
    dossierId: e.dossierId ?? null,
    actorType: e.actorType,
    actorId: e.actor?.id ?? null,
    actorName: e.actorName ?? e.actor?.name ?? (e.actorType === "systeem" ? "Akteloket (automatisch)" : null),
    type: e.type,
    message: e.message,
    visibleTo: e.visibleTo ?? "intern",
    data: e.data ?? {},
  });
}

export async function eventsFor(dossierId: string, limit = 200): Promise<EventRow[]> {
  const db = await getDb();
  return db.select().from(schema.events).where(eq(schema.events.dossierId, dossierId)).orderBy(desc(schema.events.createdAt)).limit(limit);
}

/** Welke kant van het dossier mag deze gebruiker zien? Koper en verkoper zien elkaars gegevens niet. */
export function sideOf(view: DossierView, user: User): { side: Side; party: Party } | null {
  const party = view.parties.find((p) => p.userId === user.id);
  if (!party) return null;
  return { side: party.side, party };
}

export function canStaffAccess(user: User): boolean {
  return user.role === "notaris" || user.role === "beheer";
}

export async function ensureChecks(dossierId: string, keys: string[]): Promise<void> {
  const db = await getDb();
  const existing = await db.select({ key: schema.checks.key }).from(schema.checks).where(eq(schema.checks.dossierId, dossierId));
  const have = new Set(existing.map((e) => e.key));
  const missing = keys.filter((k) => !have.has(k));
  if (missing.length) {
    await db.insert(schema.checks).values(missing.map((key) => ({ id: uid(), dossierId, key, status: "open" as const })));
  }
}

export function emptyDossierData(service: DossierData["service"]): DossierData {
  return {
    service,
    property: {},
    transaction: {},
    financing: { bankinstructieStatus: "nog_niet_verwacht" },
    wwft: { bronnen: [] },
    kadaster: { status: "op_te_halen" },
    koperIban: {},
    koStatus: "ontbreekt",
    meta: {},
    datumCheck: {},
    aandachtspunten: [],
  };
}

export function emptyPartyData(): PartyData {
  return {
    person: {},
    idcheck: { status: "te_starten" },
    volmacht: { status: "te_plannen" },
    meta: {},
  };
}
