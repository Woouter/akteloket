/**
 * Akteloket — inrichting van Supabase, Resend en Vercel met één commando.
 *
 *   1. cp .env.example .env.local      (en vul de regels onder "1. VUL IN" in)
 *   2. npm install
 *   3. npm run setup
 *
 * Wat het doet (herhaalbaar: bestaande onderdelen worden hergebruikt, niets wordt verwijderd):
 *   Supabase  twee projecten in Frankfurt (productie + demo), databasewachtwoorden,
 *             verbinding via de pooler, privé-bucket "inbox", migraties, demodossier
 *   Resend    domein (EU-regio), DNS-records, een aparte verzendsleutel voor de app
 *   Vercel    projecten "akteloket" en "akteloket-demo" gekoppeld aan GitHub,
 *             alle omgevingsvariabelen, domeinen (apex + www, demo.) en een productie-deploy
 *
 * Gegenereerde geheimen (databasewachtwoorden, ENCRYPTION_KEY, CRON_SECRET, verzendsleutel)
 * komen in `.akteloket-setup.json` (staat in .gitignore). Bewaar dat bestand ook in je
 * wachtwoordmanager: zonder de ENCRYPTION_KEY zijn opgeslagen documenten niet meer te lezen.
 * Het overzicht met DNS-records komt in `setup-resultaat.md`.
 *
 * Opties:  --geen-demo     alleen productie inrichten
 *          --geen-deploy   wel inrichten, niet deployen
 *          --geen-db       migraties overslaan (de app draait ze zelf bij de eerste aanvraag)
 */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { parseEnv } from "node:util";
import { spawnSync } from "node:child_process";

// ---------------------------------------------------------------------------
// Basis
// ---------------------------------------------------------------------------

const ROOT = process.cwd();
const STATE_FILE = path.join(ROOT, ".akteloket-setup.json");
const REPORT_FILE = path.join(ROOT, "setup-resultaat.md");
const ARGS = new Set(process.argv.slice(2));
const WITH_DEMO = !ARGS.has("--geen-demo");
const DEPLOY = !ARGS.has("--geen-deploy");
const DB_INIT = !ARGS.has("--geen-db");

// .env.local gaat voor .env; variabelen uit de shell gaan voor beide.
const fileEnv: Record<string, string> = {};
for (const f of [".env", ".env.local"]) {
  const p = path.join(ROOT, f);
  if (fs.existsSync(p)) Object.assign(fileEnv, parseEnv(fs.readFileSync(p, "utf8")));
}
for (const [k, v] of Object.entries(fileEnv)) if (process.env[k] === undefined) process.env[k] = v;
const env = (k: string): string | undefined => {
  const v = process.env[k]?.trim();
  return v ? v : undefined;
};

const tty = process.stdout.isTTY;
const c = (code: string) => (s: string) => (tty ? `\x1b[${code}m${s}\x1b[0m` : s);
const bold = c("1"), dim = c("2"), green = c("32"), yellow = c("33"), red = c("31"), cyan = c("36");
const step = (s: string) => console.log(`\n${bold(cyan("▸ " + s))}`);
const ok = (s: string) => console.log(`  ${green("✓")} ${s}`);
const info = (s: string) => console.log(`  ${dim("·")} ${s}`);
const warnings: string[] = [];
const warn = (s: string) => {
  warnings.push(s);
  console.log(`  ${yellow("!")} ${s}`);
};
class SetupError extends Error {}
const fail = (s: string): never => {
  throw new SetupError(s);
};
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const DOMAIN = (env("DOMAIN") ?? "akte-loket.nl").replace(/^https?:\/\//, "").replace(/\/.*$/, "");
const DEMO_DOMAIN = `demo.${DOMAIN}`;
const NAME = env("PROJECT_NAME") ?? "akteloket";
const REGION = env("SUPABASE_REGION") ?? "eu-central-1";
const GITHUB_REPO = env("GITHUB_REPO") ?? "Woouter/akteloket";
const BUCKET = "inbox";

type Target = "prod" | "demo";
const TARGETS: Target[] = WITH_DEMO ? ["prod", "demo"] : ["prod"];
const projectName = (t: Target) => (t === "prod" ? NAME : `${NAME}-demo`);
const siteUrl = (t: Target) => `https://${t === "prod" ? DOMAIN : DEMO_DOMAIN}`;

// ---------------------------------------------------------------------------
// Toestand (bevat geheimen — staat in .gitignore)
// ---------------------------------------------------------------------------

interface EnvState {
  supabaseRef?: string;
  dbPass?: string;
  encryptionKey?: string;
  cronSecret?: string;
  vercelProjectId?: string;
}
interface DnsRecord {
  type: string;
  name: string;
  value: string;
  priority?: number;
  purpose: string;
}
interface State {
  version: 1;
  prod: EnvState;
  demo: EnvState;
  resend?: { domainId?: string; status?: string; sendingKeyId?: string; sendingKey?: string };
}

const state: State = fs.existsSync(STATE_FILE) ? JSON.parse(fs.readFileSync(STATE_FILE, "utf8")) : { version: 1, prod: {}, demo: {} };
function saveState() {
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2) + "\n", { mode: 0o600 });
}

/** Runtime-resultaten van deze run (geen geheimen in het rapport). */
const run: Record<Target, { supabaseUrl?: string; serviceKey?: string; dbUrl?: string; dbUrlSession?: string; gitLinked?: boolean; deployUrl?: string }> = { prod: {}, demo: {} };
const dns: DnsRecord[] = [];

const randomPassword = () => crypto.randomBytes(24).toString("base64url");
const randomKey = () => crypto.randomBytes(32).toString("base64");
const randomHex = () => crypto.randomBytes(32).toString("hex");

// ---------------------------------------------------------------------------
// HTTP
// ---------------------------------------------------------------------------

class ApiError extends Error {
  constructor(
    public status: number,
    public data: unknown,
    where: string,
  ) {
    super(`${where} → ${status}: ${(typeof data === "string" ? data : JSON.stringify(data)).slice(0, 500)}`);
  }
}

async function http<T>(url: string, init: { method?: string; token?: string; headers?: Record<string, string>; body?: unknown } = {}): Promise<T> {
  const headers: Record<string, string> = { ...(init.headers ?? {}) };
  if (init.token) headers.Authorization = `Bearer ${init.token}`;
  if (init.body !== undefined) headers["content-type"] = "application/json";
  const method = init.method ?? "GET";
  const res = await fetch(url, { method, headers, body: init.body !== undefined ? JSON.stringify(init.body) : undefined });
  const text = await res.text();
  let data: unknown = text;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    /* tekst */
  }
  if (!res.ok) throw new ApiError(res.status, data, `${method} ${url.replace(/\?.*$/, "")}`);
  return data as T;
}

// ---------------------------------------------------------------------------
// 1. Supabase
// ---------------------------------------------------------------------------

const SUPABASE = "https://api.supabase.com";
const sb = <T>(method: string, p: string, body?: unknown) => http<T>(SUPABASE + p, { method, token: env("SUPABASE_ACCESS_TOKEN"), body });

interface SbProject {
  id: string;
  ref?: string;
  name: string;
  status: string;
  region?: string;
}

async function supabaseOrg(): Promise<string> {
  const orgs = await sb<{ id: string; slug?: string; name: string }[]>("GET", "/v1/organizations");
  const want = env("SUPABASE_ORG_SLUG");
  const slug = (o: { id: string; slug?: string }) => o.slug ?? o.id;
  if (want) {
    const o = orgs.find((x) => slug(x) === want || x.id === want || x.name === want);
    return o ? slug(o) : fail(`Supabase-organisatie "${want}" niet gevonden. Beschikbaar: ${orgs.map((x) => `${slug(x)} (${x.name})`).join(", ")}`);
  }
  if (orgs.length === 1) return slug(orgs[0]);
  if (!orgs.length) fail("Geen Supabase-organisatie gevonden. Maak er eerst een aan op https://supabase.com/dashboard.");
  return fail(`Je hebt meerdere Supabase-organisaties. Zet SUPABASE_ORG_SLUG in .env.local op een van: ${orgs.map((x) => `${slug(x)} (${x.name})`).join(", ")}`);
}

async function supabaseProject(t: Target, org: () => Promise<string>, existing: SbProject[]) {
  const st = state[t];
  const name = projectName(t);
  let p = existing.find((x) => x.name === name) ?? (st.supabaseRef ? existing.find((x) => (x.ref ?? x.id) === st.supabaseRef) : undefined);
  const envPass = env(t === "prod" ? "SUPABASE_DB_PASSWORD_PROD" : "SUPABASE_DB_PASSWORD_DEMO");
  if (envPass && envPass !== st.dbPass) {
    st.dbPass = envPass;
    saveState();
  }
  if (p) {
    st.supabaseRef = p.ref ?? p.id;
    saveState();
    ok(`Supabase-project ${bold(name)} bestaat al (${st.supabaseRef})`);
    if (!st.dbPass) {
      fail(
        `Het databasewachtwoord van Supabase-project "${name}" is onbekend (geen .akteloket-setup.json gevonden).\n` +
          `  Zet het in Supabase → Project Settings → Database → "Reset database password" opnieuw en\n` +
          `  zet het in .env.local als ${t === "prod" ? "SUPABASE_DB_PASSWORD_PROD" : "SUPABASE_DB_PASSWORD_DEMO"}=…  Draai daarna npm run setup opnieuw.`,
      );
    }
    if (/INACTIVE|PAUSED/.test(p.status)) {
      info(`project is gepauzeerd — herstellen…`);
      await sb("POST", `/v1/projects/${st.supabaseRef}/restore`).catch((e) => warn(`Herstellen mislukt (${e.message}). Herstel het project in het Supabase-dashboard.`));
    }
  } else {
    st.dbPass ??= randomPassword();
    saveState(); // eerst bewaren, dan pas aanmaken: het wachtwoord mag nooit verloren gaan
    try {
      p = await sb<SbProject>("POST", "/v1/projects", { name, organization_slug: await org(), db_pass: st.dbPass, region_selection: { type: "specific", code: REGION } });
    } catch (e) {
      const hint = e instanceof ApiError && /limit|maximum|free/i.test(JSON.stringify(e.data)) ? "\n  Tip: op het gratis plan mag een organisatie 2 actieve projecten hebben. Pauzeer of verwijder een ander project, of upgrade." : "";
      throw new SetupError(`Supabase-project "${name}" aanmaken mislukt: ${(e as Error).message}${hint}`);
    }
    st.supabaseRef = p.ref ?? p.id;
    saveState();
    ok(`Supabase-project ${bold(name)} aangemaakt in ${REGION} (${st.supabaseRef})`);
  }
}

async function waitHealthy(t: Target) {
  const ref = state[t].supabaseRef!;
  const t0 = Date.now();
  let shown = "";
  for (;;) {
    const p = await sb<SbProject>("GET", `/v1/projects/${ref}`);
    if (p.status === "ACTIVE_HEALTHY") return;
    if (Date.now() - t0 > 12 * 60_000) fail(`Supabase-project ${ref} is na 12 minuten nog niet klaar (status ${p.status}). Draai npm run setup later opnieuw.`);
    if (p.status !== shown) info(`wachten tot ${projectName(t)} klaar is (${p.status})…`);
    shown = p.status;
    await sleep(10_000);
  }
}

interface Pooler {
  db_user: string;
  db_host: string;
  db_port: number;
  db_name: string;
  pool_mode?: string;
  database_type?: string;
}

async function supabaseConnection(t: Target) {
  const st = state[t];
  const ref = st.supabaseRef!;
  const r = run[t];
  r.supabaseUrl = `https://${ref}.supabase.co`;

  // Verbinding via de Supavisor-pooler (IPv4, geschikt voor serverless). App: transactiemodus (6543),
  // migraties vanaf hier: sessiemodus (5432).
  const raw = await sb<Pooler[] | Pooler>("GET", `/v1/projects/${ref}/config/database/pooler`);
  const list = Array.isArray(raw) ? raw : [raw];
  const pick = list.find((x) => (x.database_type ?? "PRIMARY") === "PRIMARY" && /pooler\.supabase\.com$/.test(x.db_host)) ?? list.find((x) => (x.database_type ?? "PRIMARY") === "PRIMARY") ?? list[0];
  if (!pick) fail(`Geen pooler-configuratie gevonden voor ${ref}.`);
  const user = pick.db_user.includes(".") ? pick.db_user : `${pick.db_user}.${ref}`;
  const auth = `${encodeURIComponent(user)}:${encodeURIComponent(st.dbPass!)}`;
  r.dbUrl = `postgresql://${auth}@${pick.db_host}:6543/${pick.db_name}`;
  r.dbUrlSession = `postgresql://${auth}@${pick.db_host}:5432/${pick.db_name}`;
  ok(`databaseverbinding via ${pick.db_host}`);

  // Server-sleutel voor Storage (alleen server-side gebruikt).
  const keys = await sb<{ api_key: string; name: string; type?: string | null }[]>("GET", `/v1/projects/${ref}/api-keys?reveal=true`);
  const key = keys.find((k) => k.name === "service_role" && k.api_key) ?? keys.find((k) => k.type === "secret" && k.api_key);
  if (!key) fail(`Geen service_role- of secret-sleutel gevonden voor ${ref}. Maak er een aan in Supabase → Project Settings → API Keys.`);
  r.serviceKey = key!.api_key;

  // Privé-bucket voor grote uploads (Vercel accepteert max. ~4,5 MB per request).
  const headers: Record<string, string> = r.serviceKey.startsWith("sb_") ? { apikey: r.serviceKey } : { apikey: r.serviceKey, Authorization: `Bearer ${r.serviceKey}` };
  for (let attempt = 1; ; attempt++) {
    try {
      await http(`${r.supabaseUrl}/storage/v1/bucket`, { method: "POST", headers, body: { id: BUCKET, name: BUCKET, public: false, file_size_limit: 26_214_400 } });
      ok(`privé-bucket "${BUCKET}" aangemaakt`);
      break;
    } catch (e) {
      if (e instanceof ApiError && (e.status === 409 || /already exists|duplicate/i.test(JSON.stringify(e.data)))) {
        ok(`privé-bucket "${BUCKET}" bestaat al`);
        break;
      }
      if (attempt >= 4) {
        warn(`Bucket "${BUCKET}" aanmaken mislukt (${(e as Error).message}). Maak in Supabase → Storage een privé-bucket "${BUCKET}" aan; tot die tijd werken uploads tot 4 MB.`);
        break;
      }
      await sleep(8_000);
    }
  }
}

function dbInit(t: Target) {
  const st = state[t];
  const childEnv: NodeJS.ProcessEnv = { ...process.env, DATABASE_URL: run[t].dbUrlSession, APP_MODE: t === "prod" ? "production" : "demo", ENCRYPTION_KEY: st.encryptionKey, NEXT_PUBLIC_SITE_URL: siteUrl(t) };
  delete childEnv.PGLITE_MEMORY;
  if (t === "demo") childEnv.ANTHROPIC_API_KEY = childEnv.ANTHROPIC_AUTH_TOKEN = ""; // demodossier zonder AI-kosten opbouwen
  for (let attempt = 1; attempt <= 5; attempt++) {
    info(`${t === "prod" ? "productie" : "demo"}: migraties${t === "demo" ? " en demodossier" : ""}${attempt > 1 ? ` (poging ${attempt})` : ""}…`);
    const r = spawnSync(process.execPath, ["--conditions=react-server", "--import", "tsx", path.join("scripts", "db-init.ts")], { cwd: ROOT, env: childEnv, stdio: "inherit" });
    if (r.status === 0) return;
    if (attempt < 5) Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 15_000); // nieuwe projecten: de pooler heeft soms even nodig
  }
  fail(`Database van ${projectName(t)} initialiseren mislukt. Zie de foutmelding hierboven en draai npm run setup opnieuw.`);
}

async function setupSupabase() {
  step("Supabase — database en opslag");
  if (!env("SUPABASE_ACCESS_TOKEN")) fail("SUPABASE_ACCESS_TOKEN ontbreekt in .env.local (maak er een aan op https://supabase.com/dashboard/account/tokens).");
  let orgSlug: string | undefined;
  const org = async () => (orgSlug ??= await supabaseOrg());
  const existing = await sb<SbProject[]>("GET", "/v1/projects");
  for (const t of TARGETS) await supabaseProject(t, org, existing);
  for (const t of TARGETS) {
    await waitHealthy(t);
    await supabaseConnection(t);
  }
}

// ---------------------------------------------------------------------------
// 2. Geheimen en database
// ---------------------------------------------------------------------------

const freshKeys = new Set<Target>();
function setupSecrets() {
  for (const t of TARGETS) {
    if (!state[t].encryptionKey) freshKeys.add(t);
    state[t].encryptionKey ??= randomKey();
    state[t].cronSecret ??= randomHex();
  }
  saveState();
}

function setupDatabases() {
  step("Database — migraties en demodossier");
  for (const t of TARGETS) dbInit(t);
}

// ---------------------------------------------------------------------------
// 3. Resend
// ---------------------------------------------------------------------------

const RESEND = "https://api.resend.com";
const rs = async <T>(method: string, p: string, body?: unknown) => {
  await sleep(600); // Resend: max. 2 verzoeken per seconde
  return http<T>(RESEND + p, { method, token: env("RESEND_API_KEY"), body });
};

interface RsRecord {
  record?: string;
  name: string;
  type: string;
  value: string;
  priority?: number;
  status?: string;
}
interface RsDomain {
  id: string;
  name: string;
  status: string;
  region?: string;
  records?: RsRecord[];
}

async function setupResend() {
  step("Resend — e-mail vanaf @" + DOMAIN);
  if (!env("RESEND_API_KEY")) {
    warn("RESEND_API_KEY ontbreekt: e-mails worden in productie niet verstuurd (alleen gelogd).");
    return;
  }
  state.resend ??= {};
  let domain: RsDomain | undefined;
  try {
    const list = await rs<{ data: RsDomain[] }>("GET", "/domains");
    domain = list.data.find((d) => d.name === DOMAIN);
  } catch (e) {
    if (e instanceof ApiError && (e.status === 401 || e.status === 403)) {
      warn("Je Resend-sleutel mag geen domeinen beheren (verzendsleutel). Ik gebruik hem direct in de app; voeg het domein zelf toe in Resend, of gebruik een sleutel met Full access.");
      state.resend.sendingKey = env("RESEND_API_KEY");
      saveState();
      return;
    }
    throw e;
  }
  if (!domain) {
    domain = await rs<RsDomain>("POST", "/domains", { name: DOMAIN, region: "eu-west-1" });
    ok(`domein ${bold(DOMAIN)} toegevoegd (EU-regio)`);
  } else ok(`domein ${bold(DOMAIN)} bestaat al`);
  const full = await rs<RsDomain>("GET", `/domains/${domain.id}`);
  state.resend.domainId = full.id;
  state.resend.status = full.status;
  for (const r of full.records ?? []) dns.push({ type: r.type, name: r.name, value: r.value, priority: r.priority, purpose: `E-mail (Resend ${r.record ?? ""})`.replace(" )", ")") });
  dns.push({ type: "TXT", name: "_dmarc", value: "v=DMARC1; p=none;", purpose: "E-mail (DMARC, aanbevolen)" });
  if (full.status === "verified") ok("domein is geverifieerd — e-mail kan verstuurd worden");
  else {
    await rs("POST", `/domains/${full.id}/verify`).catch(() => undefined);
    info(`status: ${full.status} — zet de DNS-records uit het overzicht en draai npm run setup daarna nog eens (of klik "Verify" in Resend)`);
  }
  if (!state.resend.sendingKey) {
    const k = await rs<{ id: string; token: string }>("POST", "/api-keys", { name: `${NAME}-vercel`, permission: "sending_access", domain_id: full.id });
    state.resend.sendingKeyId = k.id;
    state.resend.sendingKey = k.token;
    ok("aparte verzendsleutel voor de app aangemaakt (alleen verzenden, alleen dit domein)");
  }
  saveState();
}

// ---------------------------------------------------------------------------
// 4. Vercel
// ---------------------------------------------------------------------------

const VERCEL = "https://api.vercel.com";
const vc = <T>(method: string, p: string, body?: unknown) => {
  const team = env("VERCEL_TEAM_ID");
  const url = VERCEL + p + (team ? `${p.includes("?") ? "&" : "?"}teamId=${encodeURIComponent(team)}` : "");
  return http<T>(url, { method, token: env("VERCEL_TOKEN"), body });
};

interface VcProject {
  id: string;
  name: string;
  link?: { type?: string; org?: string; repo?: string; productionBranch?: string };
}
type VcTarget = "production" | "preview";
interface VcEnv {
  key: string;
  value: string;
  target: VcTarget[];
  type: "plain" | "encrypted" | "sensitive";
  /** Nooit overschrijven als hij al bestaat (sleutels die niet mogen wisselen). */
  keep?: boolean;
}

async function vercelProject(t: Target): Promise<VcProject> {
  const name = projectName(t);
  let p: VcProject | undefined;
  try {
    p = await vc<VcProject>("GET", `/v9/projects/${encodeURIComponent(state[t].vercelProjectId ?? name)}`);
    ok(`Vercel-project ${bold(p.name)} bestaat al`);
  } catch (e) {
    if (!(e instanceof ApiError && e.status === 404)) throw e;
  }
  if (!p) {
    try {
      p = await vc<VcProject>("POST", "/v11/projects", { name, framework: "nextjs", gitRepository: { type: "github", repo: GITHUB_REPO } });
      ok(`Vercel-project ${bold(name)} aangemaakt en gekoppeld aan GitHub (${GITHUB_REPO})`);
    } catch (e) {
      warn(
        `Koppelen aan GitHub-repo ${GITHUB_REPO} lukte niet (${(e as Error).message.slice(0, 160)}).\n` +
          `    Installeer de Vercel GitHub-app met toegang tot deze repo: https://github.com/apps/vercel — of koppel later via Vercel → ${name} → Settings → Git.`,
      );
      p = await vc<VcProject>("POST", "/v11/projects", { name, framework: "nextjs" });
      ok(`Vercel-project ${bold(name)} aangemaakt (nog zonder GitHub-koppeling)`);
    }
  }
  if (!p.link?.repo) {
    // Bestaand project zonder koppeling (bijv. eerste run zonder Vercel GitHub-app): opnieuw proberen.
    try {
      await vc("POST", `/v9/projects/${p.id}/link`, { type: "github", repo: GITHUB_REPO });
      p = await vc<VcProject>("GET", `/v9/projects/${p.id}`);
      if (p.link?.repo) ok(`${p.name} alsnog gekoppeld aan GitHub (${GITHUB_REPO})`);
    } catch {
      /* melding volgt bij de deploy */
    }
  }
  state[t].vercelProjectId = p.id;
  saveState();
  run[t].gitLinked = !!p.link?.repo;
  if (p.link?.productionBranch && p.link.productionBranch !== "main") {
    warn(`Vercel gebruikt "${p.link.productionBranch}" als productiebranch van ${name}. Zet dit op "main": Vercel → ${name} → Settings → Git (of maak main de standaardbranch op GitHub vóór het koppelen).`);
  }
  return p;
}

function envFor(t: Target): VcEnv[] {
  const st = state[t];
  const r = run[t];
  const P: VcTarget[] = ["production"];
  const vars: VcEnv[] = [
    { key: "APP_MODE", value: t === "prod" ? "production" : "demo", target: P, type: "plain" },
    { key: "NEXT_PUBLIC_SITE_URL", value: siteUrl(t), target: P, type: "plain" },
    { key: "ENCRYPTION_KEY", value: st.encryptionKey!, target: P, type: "sensitive", keep: true },
    { key: "CRON_SECRET", value: st.cronSecret!, target: P, type: "sensitive" },
    // Preview-deploys (andere branches) draaien als losse demo met een database in het geheugen —
    // ze komen nooit aan de productiedatabase.
    { key: "APP_MODE", value: "demo", target: ["preview"], type: "plain" },
    { key: "PGLITE_MEMORY", value: "1", target: ["preview"], type: "plain" },
  ];
  if (r.dbUrl) vars.push({ key: "DATABASE_URL", value: r.dbUrl, target: P, type: "sensitive" });
  if (r.supabaseUrl) vars.push({ key: "SUPABASE_URL", value: r.supabaseUrl, target: P, type: "plain" });
  if (r.serviceKey) vars.push({ key: "SUPABASE_SERVICE_ROLE_KEY", value: r.serviceKey, target: P, type: "sensitive" });
  const pass = (key: string, type: VcEnv["type"] = "plain") => {
    const v = env(key);
    if (v) vars.push({ key, value: v, target: P, type });
  };
  if (t === "prod") {
    if (state.resend?.sendingKey) vars.push({ key: "RESEND_API_KEY", value: state.resend.sendingKey, target: P, type: "sensitive" });
    vars.push({ key: "MAIL_FROM", value: env("MAIL_FROM") ?? `Akteloket <hallo@${DOMAIN}>`, target: P, type: "plain" });
    vars.push({ key: "MAIL_REPLY_TO", value: env("MAIL_REPLY_TO") ?? `hallo@${DOMAIN}`, target: P, type: "plain" });
    for (const k of ["STAFF_NOTARY_EMAILS", "STAFF_OPS_EMAILS", "NOTARY_OFFICE_NAME", "NOTARY_NAME", "NOTARY_SHORT", "NOTARY_CITY", "NOTARY_ADDRESS", "KADASTER_PROVIDER", "KADASTER_API_URL", "ANTHROPIC_MODEL"]) pass(k);
    for (const k of ["ANTHROPIC_API_KEY", "KADASTER_API_KEY", "DATABASE_CA_CERT"]) pass(k, "sensitive");
  } else if (/^(ja|yes|true|1)$/i.test(env("DEMO_AI") ?? "")) {
    pass("ANTHROPIC_API_KEY", "sensitive");
    pass("ANTHROPIC_MODEL");
  }
  return vars;
}

async function vercelEnv(t: Target, p: VcProject) {
  const existing = await vc<{ envs: { id: string; key: string; target?: string[] | string }[] }>("GET", `/v10/projects/${p.id}/env`);
  const has = (key: string, target: VcTarget) => existing.envs.some((e) => e.key === key && (Array.isArray(e.target) ? e.target.includes(target) : e.target === target));
  let n = 0;
  for (const v of envFor(t)) {
    if (v.keep && has(v.key, v.target[0])) {
      if (v.key === "ENCRYPTION_KEY" && freshKeys.has(t)) warn(`${projectName(t)}: Vercel heeft al een ENCRYPTION_KEY die niet in .akteloket-setup.json staat. Die in Vercel blijft leidend; zet hem niet zelf om, anders zijn opgeslagen documenten niet meer te lezen.`);
      else info(`${v.key} staat al in Vercel en wordt niet overschreven`);
      continue;
    }
    const body = { key: v.key, value: v.value, target: v.target, type: v.type };
    try {
      await vc("POST", `/v10/projects/${p.id}/env?upsert=true`, body);
    } catch (e) {
      if (v.type !== "sensitive") throw e;
      await vc("POST", `/v10/projects/${p.id}/env?upsert=true`, { ...body, type: "encrypted" }); // valt terug als 'sensitive' niet beschikbaar is
    }
    n++;
  }
  ok(`${n} omgevingsvariabelen ingesteld`);
  if (t === "prod" && !env("STAFF_NOTARY_EMAILS")) warn("STAFF_NOTARY_EMAILS is leeg: niemand kan inloggen als notaris. Vul het in .env.local in en draai npm run setup opnieuw.");
  if (t === "prod" && !env("STAFF_OPS_EMAILS")) warn("STAFF_OPS_EMAILS is leeg: niemand kan inloggen in de beheeromgeving.");
}

async function vercelDomain(projectId: string, name: string, redirect?: string) {
  try {
    await vc("POST", `/v10/projects/${projectId}/domains`, { name, ...(redirect ? { redirect, redirectStatusCode: 308 } : {}) });
    ok(`domein ${bold(name)} toegevoegd${redirect ? ` (stuurt door naar ${redirect})` : ""}`);
  } catch (e) {
    if (e instanceof ApiError && e.status === 409) {
      const own = await vc("GET", `/v9/projects/${projectId}/domains/${name}`).then(() => true).catch(() => false);
      if (own) ok(`domein ${bold(name)} staat al aan dit project`);
      else {
        warn(`Domein ${name} is al aan een ander Vercel-project gekoppeld. Haal het daar weg en draai npm run setup opnieuw.`);
        return;
      }
    } else throw e;
  }
  const d = await vc<{ verified: boolean; verification?: { type: string; domain: string; value: string }[] }>("GET", `/v9/projects/${projectId}/domains/${name}`);
  for (const v of d.verified ? [] : (d.verification ?? [])) dns.push({ type: v.type, name: v.domain.replace(new RegExp(`\\.?${DOMAIN.replace(/\./g, "\\.")}$`), "") || "@", value: v.value, purpose: `Eigendomsbewijs voor Vercel (${name})` });

  // Aanbevolen DNS-waarden; valt terug op de algemene Vercel-waarden.
  let ipv4 = "76.76.21.21";
  let cname = "cname.vercel-dns.com";
  try {
    const cfg = await vc<{ recommendedIPv4?: { rank: number; value: string[] }[]; recommendedCNAME?: { rank: number; value: string }[] }>("GET", `/v6/domains/${name}/config`);
    const ip = cfg.recommendedIPv4?.sort((a, b) => a.rank - b.rank)[0]?.value?.[0];
    const cn = cfg.recommendedCNAME?.sort((a, b) => a.rank - b.rank)[0]?.value;
    if (ip) ipv4 = ip;
    if (cn) cname = cn.replace(/\.$/, "");
  } catch {
    /* algemene waarden */
  }
  const label = name === DOMAIN ? "@" : name.slice(0, -(DOMAIN.length + 1));
  if (label === "@") dns.push({ type: "A", name: "@", value: ipv4, purpose: "Website" });
  else dns.push({ type: "CNAME", name: label, value: cname, purpose: name === DEMO_DOMAIN ? "Demo-omgeving" : `Website (${name})` });
}

async function vercelDeploy(t: Target, p: VcProject) {
  if (!run[t].gitLinked) {
    warn(`${p.name} is nog niet aan GitHub gekoppeld, dus geen deploy. Koppel de repo (Vercel → ${p.name} → Settings → Git) en draai npm run setup opnieuw.`);
    return;
  }
  const [org, repo] = GITHUB_REPO.split("/");
  const dep = await vc<{ id: string; url: string }>("POST", "/v13/deployments", { name: p.name, project: p.id, target: "production", gitSource: { type: "github", org, repo, ref: "main" } });
  ok(`productie-deploy gestart vanaf main: https://${dep.url}`);
  run[t].deployUrl = `https://${dep.url}`;
  const t0 = Date.now();
  for (;;) {
    await sleep(10_000);
    const s = await vc<{ readyState?: string; status?: string }>("GET", `/v13/deployments/${dep.id}`).catch(() => ({}) as { readyState?: string });
    const ready = s.readyState ?? "";
    if (ready === "READY") return ok(`deploy van ${p.name} is live`);
    if (ready === "ERROR" || ready === "CANCELED") return warn(`Deploy van ${p.name} is mislukt (${ready}). Bekijk de buildlog op https://${dep.url}`);
    if (Date.now() - t0 > 10 * 60_000) return info(`deploy van ${p.name} loopt nog — volg hem op https://${dep.url}`);
  }
}

async function setupVercel() {
  step("Vercel — hosting, omgevingsvariabelen en domeinen");
  if (!env("VERCEL_TOKEN")) fail("VERCEL_TOKEN ontbreekt in .env.local (maak er een aan op https://vercel.com/account/tokens).");
  const projects: Partial<Record<Target, VcProject>> = {};
  for (const t of TARGETS) {
    const p = await vercelProject(t);
    projects[t] = p;
    await vercelEnv(t, p);
    if (t === "prod") {
      await vercelDomain(p.id, DOMAIN);
      await vercelDomain(p.id, `www.${DOMAIN}`, DOMAIN);
    } else await vercelDomain(p.id, DEMO_DOMAIN);
  }
  if (DEPLOY) for (const t of TARGETS) await vercelDeploy(t, projects[t]!);
}

// ---------------------------------------------------------------------------
// 5. Rapport
// ---------------------------------------------------------------------------

function writeReport() {
  const seen = new Set<string>();
  const rows = dns.filter((d) => {
    const k = `${d.type}|${d.name}|${d.value}`;
    return seen.has(k) ? false : (seen.add(k), true);
  });
  const lines = [
    `# Akteloket — resultaat van npm run setup`,
    ``,
    `_Gegenereerd op ${new Date().toLocaleString("nl-NL")}. Dit bestand staat in .gitignore en bevat geen geheimen._`,
    ``,
    `## DNS-records voor ${DOMAIN}`,
    ``,
    `Zet deze records bij je domeinregistrar. "@" betekent het domein zelf; een naam als \`demo\` betekent \`demo.${DOMAIN}\`.`,
    ``,
    `| Type | Naam | Waarde | Prioriteit | Waarvoor |`,
    `| --- | --- | --- | --- | --- |`,
    ...rows.map((d) => `| ${d.type} | \`${d.name}\` | \`${d.value}\` | ${d.priority ?? ""} | ${d.purpose} |`),
    ``,
    `## Omgevingen`,
    ``,
    ...TARGETS.flatMap((t) => [
      `### ${t === "prod" ? "Productie" : "Demo"} — ${siteUrl(t)}`,
      ``,
      `- Supabase: https://supabase.com/dashboard/project/${state[t].supabaseRef ?? "?"}`,
      `- Vercel-project: \`${projectName(t)}\`${run[t].gitLinked ? ` (gekoppeld aan ${GITHUB_REPO})` : " (nog niet aan GitHub gekoppeld)"}`,
      ...(run[t].deployUrl ? [`- Laatste deploy: ${run[t].deployUrl}`] : []),
      ``,
    ]),
    `## Aandachtspunten`,
    ``,
    ...(warnings.length ? warnings.map((w) => `- ${w.replace(/\n\s*/g, " ")}`) : ["- Geen."]),
    ``,
    `## Daarna`,
    ``,
    `1. Zet de DNS-records hierboven. Vercel regelt het SSL-certificaat zelf zodra de records kloppen.`,
    `2. Draai \`npm run setup\` nog een keer: dan worden het Resend-domein en de Vercel-domeinen opnieuw gecontroleerd.`,
    `3. Elke push naar \`main\` zet automatisch een nieuwe versie live op beide omgevingen.`,
    ``,
  ];
  fs.writeFileSync(REPORT_FILE, lines.join("\n"));
  return rows;
}

// ---------------------------------------------------------------------------

async function main() {
  console.log(bold(`\nAkteloket inrichten voor ${DOMAIN}${WITH_DEMO ? ` en ${DEMO_DOMAIN}` : ""}`));
  const missing = ["SUPABASE_ACCESS_TOKEN", "VERCEL_TOKEN"].filter((k) => !env(k));
  if (missing.length) fail(`Vul eerst ${missing.join(" en ")} in .env.local in (kopieer .env.example naar .env.local).`);
  if (!fs.existsSync(path.join(ROOT, "node_modules", "tsx"))) fail("Draai eerst npm install.");

  await setupSupabase();
  setupSecrets();
  if (DB_INIT) setupDatabases();
  await setupResend();
  await setupVercel();
  const rows = writeReport();

  step("Klaar");
  console.log(`\n  ${bold("DNS-records voor " + DOMAIN)} (ook in setup-resultaat.md):\n`);
  for (const d of rows) console.log(`    ${d.type.padEnd(6)} ${d.name.padEnd(22)} ${d.value.length > 60 ? d.value.slice(0, 57) + "…" : d.value}${d.priority ? `  (prio ${d.priority})` : ""}  ${dim(d.purpose)}`);
  console.log(`\n  Geheimen staan in ${bold(".akteloket-setup.json")} — bewaar een kopie in je wachtwoordmanager.`);
  if (warnings.length) console.log(`  ${yellow(`${warnings.length} aandachtspunt(en)`)} — zie hierboven of in setup-resultaat.md.`);
  console.log("");
}

main().catch((e) => {
  if (e instanceof SetupError) console.error(`\n${red("✗")} ${e.message}\n`);
  else console.error(`\n${red("✗ Onverwachte fout:")} ${e instanceof Error ? e.message : String(e)}\n`);
  try {
    if (dns.length || warnings.length) writeReport();
  } catch {
    /* rapport is optioneel */
  }
  process.exit(1);
});
