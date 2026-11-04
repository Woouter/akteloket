import "server-only";
import path from "node:path";
import fs from "node:fs";
import { AsyncLocalStorage } from "node:async_hooks";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import * as schema from "./schema";

/**
 * Databaseverbinding.
 *
 * - Met `DATABASE_URL`: echte PostgreSQL (productie, bijv. Neon/Supabase in EU-regio).
 * - Zonder: ingebedde PostgreSQL (PGlite, WASM) in `.data/pglite` — nul installatie,
 *   ideaal voor lokaal ontwikkelen en de demo-omgeving. Zelfde SQL-dialect, zelfde schema.
 *
 * Migraties staan in /drizzle en worden bij de eerste verbinding automatisch toegepast.
 * In demo-modus wordt een lege database direct gevuld met het voorbeelddossier.
 */

export type DB = NodePgDatabase<typeof schema>;

type GlobalDb = { __akteloketConn?: Promise<DB>; __akteloketReady?: Promise<DB>; __akteloketSeeding?: AsyncLocalStorage<boolean> };
const g = globalThis as unknown as GlobalDb;
const seeding = (g.__akteloketSeeding ??= new AsyncLocalStorage<boolean>());

async function connect(): Promise<DB> {
  const migrationsFolder = path.join(process.cwd(), "drizzle");
  if (process.env.DATABASE_URL) {
    const { drizzle } = await import("drizzle-orm/node-postgres");
    const { migrate } = await import("drizzle-orm/node-postgres/migrator");
    const pg = await import("pg");
    const pool = new pg.default.Pool({ connectionString: process.env.DATABASE_URL, max: 10 });
    const db = drizzle(pool, { schema });
    await migrate(db, { migrationsFolder });
    return db;
  }
  const { PGlite } = await import("@electric-sql/pglite");
  const { drizzle } = await import("drizzle-orm/pglite");
  const { migrate } = await import("drizzle-orm/pglite/migrator");
  const inMemory = process.env.PGLITE_MEMORY === "1";
  let client: InstanceType<typeof PGlite>;
  if (inMemory) {
    client = new PGlite();
  } else {
    const dataDir = path.join(process.cwd(), ".data", "pglite");
    fs.mkdirSync(dataDir, { recursive: true });
    client = new PGlite(dataDir);
  }
  const db = drizzle(client, { schema });
  await migrate(db, { migrationsFolder });
  return db as unknown as DB;
}

async function init(conn: Promise<DB>): Promise<DB> {
  const db = await conn;
  await seeding.run(true, async () => {
    const { isDemo } = await import("@/lib/config");
    const seed = await import("@/lib/demo/seed");
    if (isDemo()) await seed.ensureDemoSeed();
    else await seed.ensureBaseSettings();
  });
  return db;
}

/** Ruwe verbinding (zonder te wachten op seeding). Alleen voor seed/reset. */
export function getConnection(): Promise<DB> {
  if (!g.__akteloketConn) {
    g.__akteloketConn = connect().catch((err) => {
      g.__akteloketConn = undefined;
      throw err;
    });
  }
  return g.__akteloketConn;
}

export function getDb(): Promise<DB> {
  if (seeding.getStore()) return getConnection();
  if (!g.__akteloketReady) {
    g.__akteloketReady = init(getConnection()).catch((err) => {
      g.__akteloketReady = undefined;
      throw err;
    });
  }
  return g.__akteloketReady;
}

/** Voer werk uit met de ruwe verbinding (gebruikt door demo-reset). */
export function withSeeding<T>(fn: () => Promise<T>): Promise<T> {
  return seeding.run(true, fn);
}

export { schema };
