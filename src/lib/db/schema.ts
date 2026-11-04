import { boolean, customType, index, integer, jsonb, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import type { DossierData, DossierStatus, DocumentKind, PartyData, Role, Side, Visibility } from "@/lib/domain/types";

const bytea = customType<{ data: Buffer; driverData: Buffer | Uint8Array }>({
  dataType() {
    return "bytea";
  },
  fromDriver(value) {
    return Buffer.isBuffer(value) ? value : Buffer.from(value);
  },
});

const ts = (name: string) => timestamp(name, { withTimezone: true, mode: "date" });

export const users = pgTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull(),
  name: text("name").notNull().default(""),
  role: text("role").$type<Role>().notNull().default("klant"),
  phone: text("phone"),
  emailVerifiedAt: ts("email_verified_at"),
  createdAt: ts("created_at").notNull().defaultNow(),
  lastLoginAt: ts("last_login_at"),
}, (t) => [uniqueIndex("users_email_idx").on(t.email)]);

export const sessions = pgTable("sessions", {
  id: text("id").primaryKey(), // sha256 van het cookie-token
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  expiresAt: ts("expires_at").notNull(),
  createdAt: ts("created_at").notNull().defaultNow(),
  userAgent: text("user_agent"),
});

export const loginTokens = pgTable("login_tokens", {
  id: text("id").primaryKey(), // sha256 van het token
  email: text("email").notNull(),
  redirectTo: text("redirect_to"),
  expiresAt: ts("expires_at").notNull(),
  usedAt: ts("used_at"),
  createdAt: ts("created_at").notNull().defaultNow(),
});

export const dossiers = pgTable("dossiers", {
  id: text("id").primaryKey(),
  reference: text("reference").notNull(),
  status: text("status").$type<DossierStatus>().notNull().default("concept"),
  service: text("service").notNull(),
  data: jsonb("data").$type<DossierData>().notNull(),
  draftToken: text("draft_token"),
  isDemo: boolean("is_demo").notNull().default(false),
  createdAt: ts("created_at").notNull().defaultNow(),
  updatedAt: ts("updated_at").notNull().defaultNow(),
}, (t) => [uniqueIndex("dossiers_reference_idx").on(t.reference)]);

export const parties = pgTable("parties", {
  id: text("id").primaryKey(),
  dossierId: text("dossier_id").notNull().references(() => dossiers.id, { onDelete: "cascade" }),
  side: text("side").$type<Side>().notNull(),
  isPrimary: boolean("is_primary").notNull().default(false),
  position: integer("position").notNull().default(0),
  userId: text("user_id").references(() => users.id, { onDelete: "set null" }),
  email: text("email"),
  phone: text("phone"),
  displayName: text("display_name").notNull().default(""),
  data: jsonb("data").$type<PartyData>().notNull(),
  inviteToken: text("invite_token"),
  invitedAt: ts("invited_at"),
  activatedAt: ts("activated_at"),
  createdAt: ts("created_at").notNull().defaultNow(),
}, (t) => [index("parties_dossier_idx").on(t.dossierId)]);

export const documents = pgTable("documents", {
  id: text("id").primaryKey(),
  dossierId: text("dossier_id").notNull().references(() => dossiers.id, { onDelete: "cascade" }),
  partyId: text("party_id"),
  kind: text("kind").$type<DocumentKind>().notNull(),
  title: text("title").notNull(),
  filename: text("filename").notNull(),
  mime: text("mime").notNull(),
  size: integer("size").notNull(),
  sha256: text("sha256").notNull(),
  content: bytea("content").notNull(), // AES-256-GCM versleuteld
  source: text("source").$type<"upload" | "kadaster" | "gegenereerd" | "notaris" | "geldverstrekker" | "idcheck">().notNull(),
  visibility: text("visibility").$type<Visibility>().notNull().default("intern"),
  meta: jsonb("meta").$type<Record<string, unknown>>().notNull().default({}),
  version: integer("version").notNull().default(1),
  supersededBy: text("superseded_by"),
  createdBy: text("created_by"),
  createdAt: ts("created_at").notNull().defaultNow(),
}, (t) => [index("documents_dossier_idx").on(t.dossierId)]);

/** Controlepunten van de notaris (N1–N7). */
export const checks = pgTable("checks", {
  id: text("id").primaryKey(),
  dossierId: text("dossier_id").notNull().references(() => dossiers.id, { onDelete: "cascade" }),
  key: text("key").notNull(),
  status: text("status").$type<"open" | "akkoord" | "aanvulling_gevraagd">().notNull().default("open"),
  comment: text("comment"),
  decidedBy: text("decided_by"),
  decidedAt: ts("decided_at"),
}, (t) => [uniqueIndex("checks_dossier_key_idx").on(t.dossierId, t.key)]);

/** Gerichte aanvullingsverzoeken (notaris → klant), zonder het hele formulier opnieuw te laten invullen. */
export const requests = pgTable("requests", {
  id: text("id").primaryKey(),
  dossierId: text("dossier_id").notNull().references(() => dossiers.id, { onDelete: "cascade" }),
  side: text("side").$type<Side>().notNull(),
  partyId: text("party_id"),
  checkKey: text("check_key"),
  kind: text("kind").$type<"document" | "vraag">().notNull(),
  title: text("title").notNull(),
  description: text("description").notNull().default(""),
  status: text("status").$type<"open" | "beantwoord" | "afgehandeld">().notNull().default("open"),
  response: text("response"),
  documentId: text("document_id"),
  createdBy: text("created_by"),
  createdAt: ts("created_at").notNull().defaultNow(),
  answeredAt: ts("answered_at"),
});

export const appointments = pgTable("appointments", {
  id: text("id").primaryKey(),
  dossierId: text("dossier_id").notNull().references(() => dossiers.id, { onDelete: "cascade" }),
  partyId: text("party_id").notNull(),
  kind: text("kind").$type<"volmacht" | "passeren">().notNull().default("volmacht"),
  mode: text("mode").$type<"video" | "kantoor">().notNull(),
  startsAt: ts("starts_at").notNull(),
  durationMin: integer("duration_min").notNull().default(15),
  status: text("status").$type<"gepland" | "afgerond" | "geannuleerd">().notNull().default("gepland"),
  location: text("location"),
  createdAt: ts("created_at").notNull().defaultNow(),
});

/** Aflosnota's per bestaande hypotheek/zekerheid van de verkoper. */
export const payoffs = pgTable("payoffs", {
  id: text("id").primaryKey(),
  dossierId: text("dossier_id").notNull().references(() => dossiers.id, { onDelete: "cascade" }),
  lender: text("lender").notNull(),
  loanNumbers: text("loan_numbers"),
  inschrijving: text("inschrijving"),
  status: text("status").$type<"op_te_vragen" | "aangevraagd" | "ontvangen" | "gecontroleerd">().notNull().default("op_te_vragen"),
  amount: integer("amount"),
  validUntil: text("valid_until"),
  doorhalingKosten: integer("doorhaling_kosten"),
  requestDocumentId: text("request_document_id"),
  documentId: text("document_id"),
  source: text("source").$type<"kadaster" | "verkoper" | "notaris">().notNull().default("kadaster"),
  toestemmingVerkoper: boolean("toestemming_verkoper").notNull().default(false),
  requestedAt: ts("requested_at"),
  receivedAt: ts("received_at"),
  createdAt: ts("created_at").notNull().defaultNow(),
});

/** Audit- en automatiseringslog. Alles wat het platform of een gebruiker doet. */
export const events = pgTable("events", {
  id: text("id").primaryKey(),
  dossierId: text("dossier_id"),
  actorType: text("actor_type").$type<"systeem" | "klant" | "notaris" | "beheer">().notNull(),
  actorId: text("actor_id"),
  actorName: text("actor_name"),
  type: text("type").notNull(),
  message: text("message").notNull(),
  visibleTo: text("visible_to").$type<"intern" | "koper" | "verkoper" | "partijen">().notNull().default("intern"),
  data: jsonb("data").$type<Record<string, unknown>>().notNull().default({}),
  createdAt: ts("created_at").notNull().defaultNow(),
}, (t) => [index("events_dossier_idx").on(t.dossierId)]);

export const emails = pgTable("emails", {
  id: text("id").primaryKey(),
  dossierId: text("dossier_id"),
  to: text("to").notNull(),
  subject: text("subject").notNull(),
  text: text("text").notNull(),
  html: text("html").notNull(),
  template: text("template").notNull(),
  status: text("status").$type<"wachtrij" | "verzonden" | "mislukt" | "gesimuleerd">().notNull().default("wachtrij"),
  error: text("error"),
  createdAt: ts("created_at").notNull().defaultNow(),
  sentAt: ts("sent_at"),
});

/** Dossieroverdrachten aan de notaris (versie 1 = leveringsdossier, versie 2+ = aanvullingen zoals hypotheekakte). */
export const handovers = pgTable("handovers", {
  id: text("id").primaryKey(),
  dossierId: text("dossier_id").notNull().references(() => dossiers.id, { onDelete: "cascade" }),
  version: integer("version").notNull(),
  reason: text("reason").notNull(),
  manifest: jsonb("manifest").$type<{ items: { label: string; status: string; documentIds?: string[] }[]; openPunten: string[] }>().notNull(),
  createdAt: ts("created_at").notNull().defaultNow(),
  acknowledgedAt: ts("acknowledged_at"),
});

export const settings = pgTable("settings", {
  key: text("key").primaryKey(),
  value: jsonb("value").$type<unknown>().notNull(),
  updatedAt: ts("updated_at").notNull().defaultNow(),
  updatedBy: text("updated_by"),
});

/** Beoordelingskader voor de notaris tijdens de pilot (akkoord / aanpassen / schrappen / toevoegen). */
export const feedback = pgTable("feedback", {
  id: text("id").primaryKey(),
  component: text("component").notNull(),
  verdict: text("verdict").$type<"akkoord" | "aanpassen" | "schrappen" | "toevoegen">().notNull(),
  comment: text("comment").notNull().default(""),
  author: text("author").notNull(),
  createdAt: ts("created_at").notNull().defaultNow(),
});

/** Contactverzoeken en partneraanmeldingen vanaf de website. */
export const leads = pgTable("leads", {
  id: text("id").primaryKey(),
  kind: text("kind").$type<"contact" | "partner" | "terugbellen">().notNull(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  message: text("message").notNull().default(""),
  meta: jsonb("meta").$type<Record<string, unknown>>().notNull().default({}),
  createdAt: ts("created_at").notNull().defaultNow(),
});

export type User = typeof users.$inferSelect;
export type Dossier = typeof dossiers.$inferSelect;
export type Party = typeof parties.$inferSelect;
export type DocumentRow = typeof documents.$inferSelect;
export type Check = typeof checks.$inferSelect;
export type RequestRow = typeof requests.$inferSelect;
export type Appointment = typeof appointments.$inferSelect;
export type Payoff = typeof payoffs.$inferSelect;
export type EventRow = typeof events.$inferSelect;
export type Email = typeof emails.$inferSelect;
export type Handover = typeof handovers.$inferSelect;
