"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { requireStaff } from "@/lib/auth/guards";
import { getDb, schema } from "@/lib/db";
import { loadDossierView, logEvent, updateDossier, updateParty } from "@/lib/domain/dossier";
import { runAutomations } from "@/lib/automation/engine";
import { sendMail } from "@/lib/integrations/email";
import { saveDocument } from "@/lib/integrations/storage";
import { buildNota } from "@/lib/docgen/templates";
import { irToDocx } from "@/lib/docgen/docx";
import { notaKoper, notaVerkoper } from "@/lib/domain/calc";
import { setSetting, type WwftRule, type OfficeSettings, getWwftMatrix } from "@/lib/domain/settings";
import { uid } from "@/lib/util/ids";
import { siteUrl } from "@/lib/util/site";
import { dateNl, propertyLine } from "@/lib/util/format";
import { CHECK_KEYS, type CheckKey } from "@/lib/workflow/steps";
import type { Side } from "@/lib/domain/types";

const CHECK_TITLES: Record<CheckKey, string> = { wwft_id: "N1 Wwft en identificatie", volmachten: "N2 Volmachten", leveringsakte: "N3 Concept-leveringsakte", hypotheekakte: "N4 Concept-hypotheekakte", aflosnotas: "N5 Aflosnota's", nota: "N6 Nota's van afrekening", passeren: "N7 Passeren" };
const back = (id: string, anchor = "") => { revalidatePath(`/notaris/dossiers/${id}`, "layout"); redirect(`/notaris/dossiers/${id}${anchor}`); };

export async function decideCheck(dossierId: string, key: CheckKey, status: "akkoord" | "open", fd: FormData) {
  const { user } = await requireStaff(dossierId);
  if (!CHECK_KEYS.includes(key)) throw new Error("Onbekend controlepunt");
  const db = await getDb();
  const comment = String(fd.get("comment") ?? "") || null;
  await db.update(schema.checks).set({ status, comment, decidedBy: user.name, decidedAt: new Date() }).where(and(eq(schema.checks.dossierId, dossierId), eq(schema.checks.key, key)));
  const view = (await loadDossierView(dossierId))!;
  if (key === "volmachten" && status === "akkoord") for (const p of view.parties) if (p.data.volmacht?.status === "ondertekend") await updateParty(p.id, (d) => { d.volmacht = { ...d.volmacht!, status: "verwerkt" }; });
  if (key === "leveringsakte" && view.data.akteLevering) await updateDossier(dossierId, (d) => { if (d.akteLevering) d.akteLevering.status = status === "akkoord" ? "goedgekeurd" : "ter_controle_notaris"; });
  if (key === "hypotheekakte" && view.data.akteHypotheek) await updateDossier(dossierId, (d) => { if (d.akteHypotheek) d.akteHypotheek.status = status === "akkoord" ? "goedgekeurd" : "ter_controle_notaris"; });
  await logEvent({ dossierId, actorType: "notaris", actor: user, type: `check.${status}`, message: `${CHECK_TITLES[key]}: ${status === "akkoord" ? "akkoord" : "heropend"}${comment ? ` (${comment})` : ""}.`, visibleTo: status === "akkoord" && (key === "volmachten") ? "partijen" : "intern" });
  await runAutomations(dossierId, "notaris");
  back(dossierId, `#${key}`);
}

export async function requestAanvulling(dossierId: string, fd: FormData) {
  const { user, view } = await requireStaff(dossierId);
  const side = String(fd.get("side") ?? "koper") as Side;
  const checkKey = String(fd.get("checkKey") ?? "") || null;
  const title = String(fd.get("title") ?? "").trim();
  if (!title) back(dossierId);
  const db = await getDb();
  await db.insert(schema.requests).values({ id: uid(), dossierId, side, checkKey, kind: String(fd.get("kind") ?? "document") as "document" | "vraag", title, description: String(fd.get("description") ?? ""), createdBy: user.name });
  if (checkKey) await db.update(schema.checks).set({ status: "aanvulling_gevraagd", decidedBy: user.name, decidedAt: new Date(), comment: title }).where(and(eq(schema.checks.dossierId, dossierId), eq(schema.checks.key, checkKey)));
  if (checkKey === "wwft_id" && side === "koper") await updateDossier(dossierId, (d) => { d.wwft.status = "aanvullende_stukken_nodig"; });
  const targets = view!.parties.filter((p) => p.side === side && p.email);
  for (const p of targets.filter((x) => x.isPrimary || targets.length === 1)) await sendMail({ to: p.email!, dossierId, template: "verzoek.aanvulling", subject: `De notaris vraagt nog: ${title}`, heading: "Nog één ding voor je dossier", intro: `De notaris vraagt je om het volgende aan te leveren: ${title}.`, paragraphs: [String(fd.get("description") ?? "")].filter(Boolean), cta: { label: "Aanleveren in je portaal", href: `${siteUrl()}/portaal/${dossierId}` } });
  await logEvent({ dossierId, actorType: "notaris", actor: user, type: "verzoek.aangemaakt", message: `Aanvullingsverzoek aan ${side}: ${title}.`, visibleTo: side });
  back(dossierId, checkKey ? `#${checkKey}` : "");
}

export async function closeRequest(dossierId: string, requestId: string) {
  const { user } = await requireStaff(dossierId);
  const db = await getDb();
  await db.update(schema.requests).set({ status: "afgehandeld" }).where(eq(schema.requests.id, requestId));
  await logEvent({ dossierId, actorType: "notaris", actor: user, type: "verzoek.afgehandeld", message: "Aanvullingsverzoek afgehandeld." });
  back(dossierId);
}

export async function resolvePunt(dossierId: string, puntId: string) {
  const { user } = await requireStaff(dossierId);
  await updateDossier(dossierId, (d) => { const a = d.aandachtspunten.find((x) => x.id === puntId); if (a) a.opgelost = true; });
  await logEvent({ dossierId, actorType: "notaris", actor: user, type: "aandachtspunt.opgelost", message: "Aandachtspunt als afgehandeld gemarkeerd." });
  back(dossierId);
}

export async function sendAflosnotaVerzoek(dossierId: string, payoffId: string) {
  const { user, view } = await requireStaff(dossierId);
  const p = view!.payoffs.find((x) => x.id === payoffId);
  if (!p) back(dossierId);
  const db = await getDb();
  await db.update(schema.payoffs).set({ status: "aangevraagd", requestedAt: new Date() }).where(eq(schema.payoffs.id, payoffId));
  await sendMail({ to: `aflossingen@${p!.lender.split(" ")[0].toLowerCase().replace(/[^a-z]/g, "")}.example.com`, dossierId, template: "aflosnota.verzoek", subject: `Verzoek aflosnota ${p!.loanNumbers ?? ""} voor ${propertyLine(view!.data.property)}`, heading: "Verzoek aflosnota", intro: `Namens ${user.name} verzoeken wij u om een aflosnota voor leningnummer ${p!.loanNumbers ?? "(zie bijlage)"}, geldig tot en met ${dateNl(view!.data.transaction.leveringsdatum)}.`, paragraphs: ["De schuldenaren hebben toestemming gegeven. Het verzoek is als bijlage in het dossier opgenomen."] });
  await logEvent({ dossierId, actorType: "notaris", actor: user, type: "aflosnota.aangevraagd", message: `Aflosnota opgevraagd bij ${p!.lender}.`, visibleTo: "verkoper" });
  back(dossierId, "#aflosnotas");
}

export async function markPayoffChecked(dossierId: string, payoffId: string) {
  const { user } = await requireStaff(dossierId);
  const db = await getDb();
  await db.update(schema.payoffs).set({ status: "gecontroleerd" }).where(eq(schema.payoffs.id, payoffId));
  await logEvent({ dossierId, actorType: "notaris", actor: user, type: "aflosnota.gecontroleerd", message: "Aflosnota gecontroleerd; doorhaling voorbereid.", visibleTo: "verkoper" });
  await runAutomations(dossierId, "notaris");
  back(dossierId, "#aflosnotas");
}

async function publishNotaDoc(dossierId: string, side: "koper" | "verkoper", status: "beschikbaar" | "definitief", userName: string) {
  const view = (await loadDossierView(dossierId))!;
  const nota = side === "koper" ? notaKoper(view) : notaVerkoper(view);
  const state = { ...nota, status, goedgekeurdOp: new Date().toISOString() };
  const ir = buildNota(view, side, state);
  const docx = await irToDocx(ir, `${ir.title} (${view.dossier.reference})`);
  const docId = await saveDocument({ dossierId, kind: side === "koper" ? "nota_koper" : "nota_verkoper", title: `Nota van afrekening ${side}${status === "definitief" ? " (definitief)" : ""}`, filename: `nota-van-afrekening-${side}-${view.dossier.reference}.docx`, mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", content: docx, source: "notaris", visibility: side, meta: { ir }, replaceKind: true, createdBy: userName });
  await updateDossier(dossierId, (d) => { const n = { ...state, documentId: docId }; if (side === "koper") d.notaKoper = n; else d.notaVerkoper = n; });
  for (const p of view.parties.filter((x) => x.side === side && x.email && x.isPrimary)) await sendMail({ to: p.email!, dossierId, template: `nota.${side}`, subject: `Je nota van afrekening staat klaar`, heading: "Je nota van afrekening staat klaar", intro: `De notaris heeft de nota van afrekening voor ${propertyLine(view.data.property)} ${status === "definitief" ? "definitief vastgesteld" : "opgesteld"}.`, paragraphs: [side === "koper" ? (nota.saldo > 0 ? `Het te voldoen bedrag is € ${nota.saldo.toLocaleString("nl-NL", { minimumFractionDigits: 2 })}.` : "Je ontvangt na de overdracht een tegoed.") : `Na de overdracht ontvang je € ${nota.saldo.toLocaleString("nl-NL", { minimumFractionDigits: 2 })} op je opgegeven rekening.`], cta: { label: "Bekijk de nota", href: `${siteUrl()}/portaal/${dossierId}` } });
}

export async function publishNotas(dossierId: string, status: "beschikbaar" | "definitief") {
  const { user, view } = await requireStaff(dossierId);
  await publishNotaDoc(dossierId, "koper", status, user.name);
  if (view!.verkopers.length) await publishNotaDoc(dossierId, "verkoper", status, user.name);
  await logEvent({ dossierId, actorType: "notaris", actor: user, type: `nota.${status}`, message: `Nota's van afrekening ${status === "definitief" ? "definitief vastgesteld" : "opgesteld en gedeeld met partijen"}.`, visibleTo: "partijen" });
  back(dossierId, "#nota");
}

export async function passeren(dossierId: string) {
  const { user, view } = await requireStaff(dossierId);
  const now = new Date();
  await updateDossier(dossierId, (d) => {
    d.gepasseerdOp = now.toISOString();
    d.ingeschrevenOp = new Date(now.getTime() + 90 * 60000).toISOString();
    if (d.akteLevering) d.akteLevering.status = "definitief";
    if (d.akteHypotheek) d.akteHypotheek.status = "definitief";
    if (d.notaKoper) d.notaKoper.status = "definitief";
    if (d.notaVerkoper) d.notaVerkoper.status = "definitief";
    return { status: "gepasseerd" };
  });
  for (const p of view!.parties.filter((x) => x.email)) await sendMail({ to: p.email!, dossierId, template: "gepasseerd", subject: p.side === "koper" ? "Gefeliciteerd: de woning is van jou!" : "De woning is overgedragen", heading: p.side === "koper" ? "Gefeliciteerd met je nieuwe woning!" : "De overdracht is afgerond", intro: `De akte${view!.data.akteHypotheek ? "n zijn" : " is"} vandaag gepasseerd en aangeboden voor inschrijving in het Kadaster.`, paragraphs: [p.side === "koper" ? "Je kunt de sleutels ophalen bij de verkoper of makelaar. Een afschrift van de akte ontvang je in je portaal." : "Na controle van de openbare registers maakt de notaris de netto opbrengst over op je opgegeven rekening."] });
  await logEvent({ dossierId, actorType: "notaris", actor: user, type: "gepasseerd", message: "Akte(n) gepasseerd en aangeboden voor inschrijving in het Kadaster.", visibleTo: "partijen" });
  back(dossierId, "#passeren");
}

export async function afwikkelen(dossierId: string) {
  const { user } = await requireStaff(dossierId);
  const db = await getDb();
  await updateDossier(dossierId, (d) => { d.afgewikkeldOp = new Date().toISOString(); if (d.notaVerkoper) d.notaVerkoper.uitbetaaldOp = d.afgewikkeldOp; if (d.notaKoper && d.notaKoper.saldo < 0) d.notaKoper.uitbetaaldOp = d.afgewikkeldOp; return { status: "afgewikkeld" }; });
  await db.update(schema.checks).set({ status: "akkoord", decidedBy: user.name, decidedAt: new Date() }).where(and(eq(schema.checks.dossierId, dossierId), eq(schema.checks.key, "passeren")));
  await logEvent({ dossierId, actorType: "notaris", actor: user, type: "afgewikkeld", message: "Inschrijving bevestigd zonder nieuwe inschrijvingen; aflossingen voldaan, verkoopopbrengst uitbetaald. Transactie afgewikkeld.", visibleTo: "partijen" });
  back(dossierId, "#passeren");
}

export async function regenerate(dossierId: string, kind: "levering" | "hypotheek") {
  const { user } = await requireStaff(dossierId);
  await updateDossier(dossierId, (d) => { const a = kind === "levering" ? d.akteLevering : d.akteHypotheek; if (a) { a.inputHash = undefined; if (a.status === "goedgekeurd") a.status = "ter_controle_notaris"; } });
  await logEvent({ dossierId, actorType: "notaris", actor: user, type: "akte.regenereer", message: `Concept-${kind === "levering" ? "leveringsakte" : "hypotheekakte"} opnieuw laten genereren.` });
  await runAutomations(dossierId, "notaris");
  revalidatePath(`/notaris/dossiers/${dossierId}`, "layout");
  redirect(`/notaris/dossiers/${dossierId}/akte/${kind}`);
}

export async function saveMatrix(fd: FormData) {
  const { user } = await requireStaff();
  const cur = await getWwftMatrix();
  const next: WwftRule[] = cur.map((r) => ({
    ...r,
    documenten: String(fd.get(`docs_${r.type}`) ?? "").split("\n").map((x) => x.trim()).filter(Boolean),
    drempel: Number(String(fd.get(`drempel_${r.type}`) ?? "").replace(/\D/g, "")) || undefined,
    aanvullend: String(fd.get(`aanvullend_${r.type}`) ?? "").trim() || undefined,
    status: fd.get(`status_${r.type}`) === "goedgekeurd" ? "goedgekeurd" : "voorlopig",
  }));
  await setSetting("wwft_matrix", next, user.name);
  await logEvent({ actorType: "notaris", actor: user, type: "instellingen.matrix", message: "Wwft-documentmatrix bijgewerkt." });
  revalidatePath("/notaris/instellingen");
  redirect("/notaris/instellingen?opgeslagen=matrix#matrix");
}

export async function saveOffice(fd: FormData) {
  const { user } = await requireStaff();
  const next: OfficeSettings = {
    volmachtModes: (["video", "kantoor"] as const).filter((m) => fd.get(`mode_${m}`) === "on"),
    verkoperLegalisatie: (String(fd.get("verkoperLegalisatie") ?? "keuze") as OfficeSettings["verkoperLegalisatie"]),
    slotStart: String(fd.get("slotStart") ?? "09:00"), slotEnd: String(fd.get("slotEnd") ?? "17:00"), slotMinutes: Number(fd.get("slotMinutes") ?? 15) || 15,
    idMethods: (["idin", "nfc_app"] as const).filter((m) => fd.get(`id_${m}`) === "on"),
  };
  await setSetting("office", next, user.name);
  revalidatePath("/notaris/instellingen");
  redirect("/notaris/instellingen?opgeslagen=kantoor#kantoor");
}

export async function acknowledgeHandover(dossierId: string, handoverId: string) {
  const { user } = await requireStaff(dossierId);
  const db = await getDb();
  await db.update(schema.handovers).set({ acknowledgedAt: new Date() }).where(eq(schema.handovers.id, handoverId));
  await logEvent({ dossierId, actorType: "notaris", actor: user, type: "overdracht.ontvangen", message: "Dossieroverdracht in behandeling genomen door de notaris.", visibleTo: "partijen" });
  revalidatePath(`/notaris/dossiers/${dossierId}/overdracht`);
  redirect(`/notaris/dossiers/${dossierId}/overdracht`);
}

