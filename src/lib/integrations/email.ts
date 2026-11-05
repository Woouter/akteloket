import "server-only";
import { eq } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { uid } from "@/lib/util/ids";
import { BRAND, isDemo } from "@/lib/config";

/**
 * E-mail: alles gaat via de outbox-tabel (auditbaar).
 * - RESEND_API_KEY → verzenden via de Resend API (aanbevolen, EU-regio).
 * - SMTP_URL → verzenden via SMTP (nodemailer).
 * - In demo-modus worden e-mails gesimuleerd en zijn ze zichtbaar in de demo-mailbox
 *   en in Beheer → Uitgaande e-mail (er gaat nooit een echte mail naar fictieve adressen).
 */
export interface MailInput {
  to: string;
  subject: string;
  template: string;
  dossierId?: string | null;
  heading: string;
  intro: string;
  paragraphs?: string[];
  cta?: { label: string; href: string };
  footnote?: string;
}

export function renderMail(m: MailInput): { html: string; text: string } {
  const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const paras = [m.intro, ...(m.paragraphs ?? [])];
  const html = `<!doctype html><html lang="nl"><body style="margin:0;background:#f7f5f0;font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;color:#0b1f3a">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:32px 12px"><tr><td align="center">
<table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;background:#fff;border-radius:8px;border:1px solid #ddd8cf">
<tr><td style="padding:22px 28px;border-top:3px solid #b08d57;border-bottom:1px solid #ebe7de;font-family:Georgia,'Times New Roman',serif;font-weight:600;font-size:22px;color:#0b1f3a">${BRAND.name}<span style="color:#b08d57">.</span></td></tr>
<tr><td style="padding:28px">
<h1 style="margin:0 0 12px;font-family:Georgia,'Times New Roman',serif;font-weight:600;font-size:22px;line-height:1.3;color:#0b1f3a">${esc(m.heading)}</h1>
${paras.map((p) => `<p style="margin:0 0 14px;font-size:15px;line-height:1.6;color:#2b3a52">${esc(p)}</p>`).join("")}
${m.cta ? `<p style="margin:22px 0"><a href="${m.cta.href}" style="display:inline-block;background:#0b1f3a;color:#fff;text-decoration:none;font-weight:600;padding:12px 20px;border-radius:5px">${esc(m.cta.label)}</a></p>` : ""}
${m.footnote ? `<p style="margin:18px 0 0;font-size:13px;color:#5a6572">${esc(m.footnote)}</p>` : ""}
</td></tr>
<tr><td style="padding:18px 28px;border-top:1px solid #ebe7de;font-size:12px;color:#858d97">${BRAND.name} · ${BRAND.domain} · Deze e-mail is automatisch verstuurd vanuit je beveiligde dossier.</td></tr>
</table></td></tr></table></body></html>`;
  const text = [m.heading, "", ...paras, m.cta ? `\n${m.cta.label}: ${m.cta.href}` : "", m.footnote ? `\n${m.footnote}` : ""].join("\n");
  return { html, text };
}

export async function sendMail(m: MailInput): Promise<string> {
  const db = await getDb();
  const { html, text } = renderMail(m);
  const id = uid();
  await db.insert(schema.emails).values({ id, dossierId: m.dossierId ?? null, to: m.to, subject: m.subject, text, html, template: m.template, status: "wachtrij" });
  if (isDemo() || (!process.env.SMTP_URL && !process.env.RESEND_API_KEY)) {
    await db.update(schema.emails).set({ status: "gesimuleerd", sentAt: new Date() }).where(eq(schema.emails.id, id));
    return id;
  }
  const from = process.env.MAIL_FROM || `${BRAND.name} <${BRAND.email}>`;
  if (process.env.RESEND_API_KEY) {
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "content-type": "application/json" },
        body: JSON.stringify({ from, to: [m.to], subject: m.subject, html, text, reply_to: process.env.MAIL_REPLY_TO || undefined }),
      });
      if (!res.ok) throw new Error(`Resend ${res.status}: ${(await res.text()).slice(0, 300)}`);
      await db.update(schema.emails).set({ status: "verzonden", sentAt: new Date() }).where(eq(schema.emails.id, id));
    } catch (err) {
      await db.update(schema.emails).set({ status: "mislukt", error: String(err) }).where(eq(schema.emails.id, id));
    }
    return id;
  }
  try {
    const nodemailer = await import("nodemailer");
    const transport = nodemailer.default.createTransport(process.env.SMTP_URL);
    await transport.sendMail({ from, to: m.to, subject: m.subject, text, html });
    await db.update(schema.emails).set({ status: "verzonden", sentAt: new Date() }).where(eq(schema.emails.id, id));
  } catch (err) {
    await db.update(schema.emails).set({ status: "mislukt", error: String(err) }).where(eq(schema.emails.id, id));
  }
  return id;
}
