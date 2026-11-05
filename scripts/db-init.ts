/**
 * Initialiseert één database: migraties draaien en (in demo-modus) het voorbeelddossier
 * klaarzetten. Wordt door `scripts/setup.ts` aangeroepen met DATABASE_URL, APP_MODE en
 * ENCRYPTION_KEY in de omgeving. Los te draaien met:
 *
 *   DATABASE_URL=… APP_MODE=demo node --conditions=react-server --import tsx scripts/db-init.ts
 */
export {};
const t = Date.now();
const { getDb, schema } = await import("@/lib/db");
const db = await getDb();
const dossiers = await db.select({ id: schema.dossiers.id }).from(schema.dossiers);
console.log(`    database klaar in ${((Date.now() - t) / 1000).toFixed(1)} s · modus ${process.env.APP_MODE ?? "demo"} · ${dossiers.length} dossier(s)`);
process.exit(0);
