"use server";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { createLoginLink } from "@/lib/auth/session";
import { sendMail } from "@/lib/integrations/email";
import { isDemo } from "@/lib/config";

const attempts = new Map<string, number[]>();

export async function requestLogin(fd: FormData) {
  const email = String(fd.get("email") ?? "").trim().toLowerCase();
  const next = String(fd.get("next") ?? "") || undefined;
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) redirect("/inloggen?fout=email");
  const now = Date.now();
  const list = (attempts.get(email) ?? []).filter((t) => now - t < 15 * 60_000);
  if (list.length >= 5) redirect("/inloggen?fout=teveel");
  attempts.set(email, [...list, now]);
  const db = await getDb();
  const [user] = await db.select().from(schema.users).where(eq(schema.users.email, email)).limit(1);
  let link: string | undefined;
  if (user) {
    link = await createLoginLink(email, next);
    await sendMail({ to: email, template: "login", subject: "Je inloglink voor Akteloket", heading: "Inloggen bij Akteloket", intro: "Klik op de knop om in te loggen. De link is 15 minuten geldig en werkt één keer.", cta: { label: "Inloggen", href: link }, footnote: "Heb je niet geprobeerd in te loggen? Dan kun je deze e-mail negeren." });
  }
  const q = new URLSearchParams({ verstuurd: "1", email });
  if (isDemo() && link) q.set("demolink", link.replace(/^https?:\/\/[^/]+/, ""));
  redirect(`/inloggen?${q}`);
}
