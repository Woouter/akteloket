import "server-only";
import { eq } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { DEMO } from "./scenario";
import { cookies } from "next/headers";

/** Id van het voorbeelddossier Bloesemlaan 14 (voor tours en demo-links). */
export async function mainDemoDossierId(): Promise<string | undefined> {
  await cookies(); // markeer als dynamisch: nooit tijdens de build de database openen
  const db = await getDb();
  const [d] = await db.select({ id: schema.dossiers.id }).from(schema.dossiers).where(eq(schema.dossiers.reference, DEMO.reference)).limit(1);
  return d?.id;
}
