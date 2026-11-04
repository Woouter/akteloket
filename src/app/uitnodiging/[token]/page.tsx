import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { Home, ShieldCheck } from "lucide-react";
import { getDb, schema } from "@/lib/db";
import { sha256 } from "@/lib/util/ids";
import { Logo } from "@/components/ui/logo";
import { propertyLine } from "@/lib/util/format";
import { NOTARY_OFFICE } from "@/lib/config";
import { activateInvite } from "./actions";

export default async function Page({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const db = await getDb();
  const [p] = await db.select().from(schema.parties).where(eq(schema.parties.inviteToken, sha256(token))).limit(1);
  if (!p) notFound();
  const [d] = await db.select().from(schema.dossiers).where(eq(schema.dossiers.id, p.dossierId)).limit(1);
  return (
    <div className="flex min-h-[calc(100vh-2.5rem)] flex-col items-center justify-center bg-paper px-4 py-12">
      <Logo className="mb-8" />
      <div className="card w-full max-w-lg p-7">
        <p className={`chip ${p.side === "verkoper" ? "bg-verkoper-100 text-verkoper-700" : "bg-koper-100 text-koper-600"}`}>{p.side === "verkoper" ? "Verkopersportaal" : "Persoonlijke uitnodiging"}</p>
        <h1 className="mt-4 text-2xl font-extrabold text-ink-900">Welkom, {p.data.person.roepnaam ?? p.data.person.voornamen?.split(" ")[0] ?? p.displayName}</h1>
        <p className="mt-2 flex items-center gap-2 text-ink-700"><Home className="h-4 w-4 text-ink-400" />{propertyLine(d.data.property)}</p>
        <p className="mt-4 text-sm leading-relaxed text-ink-600">{p.side === "verkoper" ? `De notariële afhandeling van de verkoop loopt via ${NOTARY_OFFICE.officeName}. Jouw stappen: gegevens controleren, identificeren, rekeningnummer opgeven, een eenvoudige volmacht tekenen en je bestaande hypotheek bevestigen.` : "Rond je persoonlijke stappen af: identificeren en je volmacht tekenen."}</p>
        <form action={activateInvite.bind(null, token)} className="mt-6"><button className="btn btn-primary w-full"><ShieldCheck className="h-4 w-4" />Activeer mijn portaal</button></form>
        <p className="mt-3 text-center text-xs text-ink-500">Ben jij niet {p.displayName}? Sluit deze pagina en laat het ons weten.</p>
      </div>
    </div>
  );
}
