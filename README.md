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
| Demo-omgeving: tours, rollenwisselaar, simulaties, mailbox, uitleg, beoordelingskader | `/demo` | De pilotnotaris (op `demo.akte-loket.nl`) |

## Snel starten

```bash
npm install
npm run dev
```

Open http://localhost:3000. Zonder configuratie draait alles in **demo-modus** met een ingebedde database (PGlite in `.data/`). Bij de eerste start wordt het voorbeelddossier *Bloesemlaan 14, Amersfoort* opgebouwd via dezelfde pijplijn die een echte klant doorloopt (scan, Kadaster, akten, overdracht).

- **Demo-hub:** http://localhost:3000/demo. Start hier een tour of log in als koper, verkoper, notaris of platformbeheer.
- **Probeer de scanner:** `/aanvraag` → "Gebruik voorbeeld".
- **Demo resetten:** knop op `/demo`, of stop de server en verwijder `.data/`.

Productie-build:

```bash
npm run build && npm start
```

## Configuratie

Zie [`.env.example`](.env.example). De belangrijkste variabelen:

| Variabele | Betekenis |
|---|---|
| `APP_MODE` | `demo` (standaard) of `production` |
| `DATABASE_URL` | PostgreSQL. Zonder deze variabele wordt PGlite gebruikt. |
| `ENCRYPTION_KEY` | 32 bytes base64 voor documentversleuteling (verplicht in productie) |
| `NEXT_PUBLIC_SITE_URL` | Basis-URL voor links in e-mails |
| `ANTHROPIC_API_KEY` | Zet AI-extractie aan (koopovereenkomst en bankinstructie). Zonder sleutel draait de regelgebaseerde scanner. |
| `KADASTER_API_URL`, `KADASTER_API_KEY` | Jouw Kadaster-API. Zonder deze variabelen wordt de demo-koppeling gebruikt. |
| `SMTP_URL`, `MAIL_FROM` | Echte e-mailverzending |
| `CRON_SECRET` | Beveiliging van `/api/cron` (termijnbewaking, herinneringen) |
| `STAFF_NOTARY_EMAILS`, `STAFF_OPS_EMAILS` | Medewerkeraccounts in productie (komma-gescheiden) |
| `NOTARY_*` | Naam, kantoor en adres van de aangesloten notaris |

## Documentatie

- [Beslissingen](docs/BESLISSINGEN.md): alle keuzes, met onderbouwing en open punten
- [Architectuur](docs/ARCHITECTUUR.md): opbouw, datamodel, workflow en automatisering
- [Integraties](docs/INTEGRATIES.md): Kadaster-API-contract, PDOK, AI, ID, e-mail, cron
- [Deploy](docs/DEPLOY.md): `demo.akte-loket.nl` en productie
- In de app: `/demo/uitleg` (hoe alles werkt) en `/demo/validatie` (beoordelingskader voor de notaris)

## Scripts

| Script | Doel |
|---|---|
| `npm run dev` | Ontwikkelserver |
| `npm run build` / `npm start` | Productie-build en server |
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
