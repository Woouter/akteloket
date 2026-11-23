import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { SiteHeader } from "@/components/site/header";
import { SiteFooter } from "@/components/site/footer";
import { afmelden, checkAfmeldToken, isAfgemeld } from "@/lib/integrations/afmeldingen";
import { BRAND } from "@/lib/config";

export const metadata: Metadata = { title: "Afmelden voor e-mail", robots: { index: false } };
export const dynamic = "force-dynamic";

async function bevestig(fd: FormData) {
  "use server";
  const email = String(fd.get("e") ?? "");
  const token = String(fd.get("t") ?? "");
  if (!checkAfmeldToken(email, token)) redirect("/afmelden?fout=1");
  await afmelden(email, "zelf");
  redirect(`/afmelden?e=${encodeURIComponent(email)}&t=${encodeURIComponent(token)}&klaar=1`);
}

/**
 * Afmeldpagina uit de voettekst van elke e-mail. Afmelden gaat via een knop (POST),
 * zodat virusscanners die links "voorproeven" niemand per ongeluk afmelden.
 */
export default async function Page({ searchParams }: { searchParams: Promise<{ e?: string; t?: string; klaar?: string; fout?: string }> }) {
  const sp = await searchParams;
  const email = sp.e ?? "";
  const geldig = !!email && checkAfmeldToken(email, sp.t ?? "");
  const al = geldig && (await isAfgemeld(email));
  return (
    <>
      <SiteHeader />
      <main id="main" className="container-page max-w-2xl py-20 lg:py-28">
        <p className="eyebrow">E-mailvoorkeuren</p>
        {!geldig || sp.fout ? (
          <>
            <h1 className="mt-3 text-4xl text-ink-900">Deze afmeldlink werkt niet</h1>
            <p className="mt-4 text-lg leading-relaxed text-ink-600">Misschien is de link niet volledig overgenomen. Gebruik de link onderaan een van onze e-mails, of mail ons via {BRAND.email}, dan regelen we het voor je.</p>
          </>
        ) : al || sp.klaar ? (
          <>
            <h1 className="mt-3 text-4xl text-ink-900">Je bent afgemeld</h1>
            <p className="mt-4 text-lg leading-relaxed text-ink-600">We sturen geen e-mail meer naar <strong className="text-ink-900">{email}</strong>. Alleen als je zelf een inloglink aanvraagt, krijg je die nog wel.</p>
            <p className="mt-4 text-ink-600">Toch per ongeluk? Mail ons via {BRAND.email}.</p>
          </>
        ) : (
          <>
            <h1 className="mt-3 text-4xl text-ink-900">Geen e-mail meer ontvangen?</h1>
            <p className="mt-4 text-lg leading-relaxed text-ink-600">Na afmelden sturen we geen herinneringen, uitnodigingen of andere berichten meer naar <strong className="text-ink-900">{email}</strong>.</p>
            <form action={bevestig} className="mt-8">
              <input type="hidden" name="e" value={email} />
              <input type="hidden" name="t" value={sp.t} />
              <button className="btn btn-primary btn-lg">Afmelden</button>
            </form>
          </>
        )}
        <p className="mt-10 text-sm"><Link href="/" className="text-ink-900 underline decoration-brass-400 underline-offset-4">Naar de homepage</Link></p>
      </main>
      <SiteFooter />
    </>
  );
}
