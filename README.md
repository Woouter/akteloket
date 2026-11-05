# Akteloket

Online notarisportaal voor consumenten: **akte van levering** en **hypotheekakte** (en het losse product *koopovereenkomst opstellen*), volledig online. De klant uploadt de getekende koopovereenkomst, het platform leest die uit, haalt de kadastrale stukken op en zet concept-akten klaar. De aangesloten notaris **controleert** en passeert.

Eén codebase bevat:

| Onderdeel | Route | Voor wie |
|---|---|---|
| Website met landingspagina's, kennisbank, tarieven en FAQ | `/`, `/akte-van-levering`, `/hypotheekakte`, `/levering-en-hypotheekakte`, `/koopovereenkomst-opstellen`, `/kennisbank/*` | Consument (SEO) |
| Aanvraagflow (geïsoleerd, met koopovereenkomst-scanner) | `/aanvraag`, `/aanvraag/koopovereenkomst` | Koper |
| Klantportaal: 12 stappen koper, A–G verkoper | `/portaal/[id]` | Koper, mede-koper, verkoper |
| Notariswerkplek: werkvoorraad, controlepaneel N1–N7, akten, overdracht, agenda, instellingen | `/notaris` | Notaris |
| Platformbeheer: automatisering, termijnen, e-mail, leads, pilotfeedback | `/beheer` | Akteloket-team |
| Demo-omgeving: alleen via tours, met simulaties, mailbox, uitleg en beoordelingskader | `/demo` | De pilotnotaris (op `demo.akte-loket.nl`) |

## Snel starten

```bash
npm install
npm run dev
```

Open http://localhost:3000. Zonder configuratie draait alles in **demo-modus** met een ingebedde database (PGlite in `.data/`). Bij de eerste start wordt het voorbeelddossier *Bloesemlaan 14, Amersfoort* opgebouwd via dezelfde pijplijn die een echte klant doorloopt (scan, Kadaster, akten, overdracht).

- **Tourkeuze:** http://localhost:3000 opent in demo-modus op `/demo`. Kies een tour; daarna kun je het uitgelegde deel zelf bekijken. Vrij door alles klikken tijdens het ontwikkelen: `DEMO_GATE=uit npm run dev`.
- **Probeer de scanner:** `/aanvraag` → "Gebruik voorbeeld".
- **Demo resetten:** knop op `/demo`, of stop de server en verwijder `.data/`.

Productie-build:

```bash
npm run build && npm start
```

## Live zetten (Vercel + Supabase + Resend)

Vul drie API-sleutels in en laat het script de rest doen:

```bash
cp .env.example .env.local
```

```bash
npm install
```

```bash
npm run setup
```

Het script maakt de databases (Supabase, Frankfurt), de upload-opslag, het e-maildomein (Resend, EU), de Vercel-projecten voor `akte-loket.nl` en `demo.akte-loket.nl`, alle omgevingsvariabelen en de domeinkoppelingen aan, en start de eerste deploy. Daarna krijg je de DNS-records in `setup-resultaat.md`. Stap voor stap: [docs/DEPLOY.md](docs/DEPLOY.md).

## Configuratie

Zie [`.env.example`](.env.example). Blok 1 (drie sleutels en het domein) is alles wat je zelf invult. De app-variabelen hieronder zet het setup-script in Vercel:

| Variabele | Betekenis |
|---|---|
| `APP_MODE` | `demo` (standaard) of `production` |
| `DATABASE_URL` | PostgreSQL. Zonder deze variabele wordt PGlite gebruikt. |
| `ENCRYPTION_KEY` | 32 bytes base64 voor documentversleuteling (verplicht in productie) |
| `NEXT_PUBLIC_SITE_URL` | Basis-URL voor links in e-mails |
| `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | Upload-inbox voor bestanden groter dan 4 MB (Vercel-limiet) |
| `RESEND_API_KEY`, `MAIL_FROM`, `MAIL_REPLY_TO` | E-mailverzending via Resend (alternatief: `SMTP_URL`) |
| `ANTHROPIC_API_KEY` | Zet AI-extractie aan (koopovereenkomst en bankinstructie). Zonder sleutel draait de regelgebaseerde scanner. |
| `KADASTER_API_URL`, `KADASTER_API_KEY` | Jouw Kadaster-API. Zonder deze variabelen wordt de demo-koppeling gebruikt. |
| `CRON_SECRET` | Beveiliging van `/api/cron` (termijnbewaking, herinneringen) |
| `STAFF_NOTARY_EMAILS`, `STAFF_OPS_EMAILS` | Medewerkeraccounts in productie (komma-gescheiden) |
| `NOTARY_*` | Naam, kantoor en adres van de aangesloten notaris |

## Documentatie

- [Beslissingen](docs/BESLISSINGEN.md): alle keuzes, met onderbouwing en open punten
- [Architectuur](docs/ARCHITECTUUR.md): opbouw, datamodel, workflow en automatisering
- [Integraties](docs/INTEGRATIES.md): Kadaster-API-contract, PDOK, AI, ID, e-mail, cron
- [Deploy](docs/DEPLOY.md): Vercel, Supabase en Resend met `npm run setup`, DNS, abonnementen
- In de app: `/demo/uitleg` (hoe alles werkt) en `/demo/validatie` (beoordelingskader voor de notaris)

## Scripts

| Script | Doel |
|---|---|
| `npm run dev` | Ontwikkelserver |
| `npm run build` / `npm start` | Productie-build en server |
| `npm run setup` | Richt Supabase, Resend en Vercel in (zie docs/DEPLOY.md) |
| `npm run db:init` | Migraties draaien op `DATABASE_URL` (en in demo-modus het voorbeelddossier) |
| `npm run typecheck` | TypeScript-controle |
| `npm run check:seed` | Bouwt de demo-seed in-memory op en print de status van alle stappen (rooktest van de hele pijplijn) |
| `npm run db:reset` | Verwijdert de lokale demo-database |
| `npm run db:generate` | Nieuwe migratie genereren na een schemawijziging |

## Mappenstructuur

```
src/
  app/            routes (site, aanvraag, portaal, notaris, beheer, demo, api)
  components/     UI (site, aanvraag, portaal, staff, demo, docs)
  lib/
    config.ts     merk, prijzen, fiscale tabellen, termijnen
    db/           Drizzle-schema en verbinding (PGlite/Postgres)
    domain/       dossiers, intake, berekeningen, instellingen
    workflow/     stappen koper/verkoper/notaris (statussen afgeleid)
    automation/   idempotente automatiseringsregels en cron
    extraction/   scanner koopovereenkomst en bankinstructie
    docgen/       aktemodellen, DOCX-renderer, DVO
    integrations/ Kadaster, PDOK, e-mail, opslag
    demo/         scenario, PDF-generator, seed, tours, personas
content/kennisbank/  20 artikelen (markdown met frontmatter)
drizzle/          SQL-migraties
docs/             documentatie
```
