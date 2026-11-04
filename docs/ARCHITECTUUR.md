# Architectuur

## Overzicht

```
Browser ──► Next.js 16 (App Router, server components + server actions + route handlers)
              │
              ├── Website (statisch in productie)       src/app/(site)
              ├── Aanvraag (client flow + API)           src/app/aanvraag, src/app/api/aanvraag
              ├── Portaal koper/verkoper                 src/app/portaal
              ├── Notariswerkplek                        src/app/notaris
              ├── Platformbeheer                         src/app/beheer
              └── Demo (alleen APP_MODE=demo)            src/app/demo
              │
              ├── Domein          src/lib/domain    (dossiers, intake, berekeningen, instellingen)
              ├── Workflow        src/lib/workflow  (stappen en statussen, afgeleid uit data)
              ├── Automatisering  src/lib/automation (idempotente regels + cron)
              ├── Extractie       src/lib/extraction (KO + bankinstructie: AI of regels)
              ├── Documenten      src/lib/docgen     (modellen → tussenformaat → HTML/DOCX)
              └── Integraties     src/lib/integrations (Kadaster, PDOK, e-mail, opslag)
              │
              ▼
         PostgreSQL (Drizzle) ── PGlite (demo/dev) of DATABASE_URL (productie)
```

## Datamodel

| Tabel | Inhoud |
|---|---|
| `users`, `sessions`, `login_tokens` | Accounts (rol `klant`, `notaris` of `beheer`), sessies en magic links. Tokens worden alleen gehasht opgeslagen. |
| `dossiers` | Referentie, status, dienst en `data` (JSONB, type `DossierData`): object, transactie, financiering, Wwft, kadaster, IBAN koper, DVO-akkoord, extractie, akten, nota's, datumcheck, aandachtspunten. |
| `parties` | Koper(s) en verkoper(s) per dossier met `data` (JSONB, type `PartyData`): persoon, eigendom, starters, PEP, ID-check, volmacht, IBAN, herkomst per veld (`meta`). |
| `documents` | Alle documenten, AES-256-GCM versleuteld, met soort, bron, zichtbaarheid, versie en `meta` (o.a. het tussenformaat van gegenereerde akten). |
| `checks` | De controlepunten N1–N7 van de notaris (open, akkoord, aanvulling gevraagd). |
| `requests` | Gerichte aanvullingsverzoeken van de notaris aan een partij. |
| `appointments` | Volmachtafspraken (video of kantoor). |
| `payoffs` | Aflosnota's per bestaande hypotheek van de verkoper. |
| `handovers` | Dossieroverdrachten (versie 1 plus aanvullingen) met manifest. |
| `events` | Audit- en automatiseringslog, met zichtbaarheid per partij. |
| `emails` | Outbox: elk bericht, met status. |
| `settings` | Instellingen van de notaris (Wwft-documentmatrix, kantoor). |
| `feedback`, `leads` | Pilotfeedback en contact- of partneraanvragen. |

Typen: `src/lib/domain/types.ts`. Schema: `src/lib/db/schema.ts`. Migraties: `drizzle/`.

## Workflow

`src/lib/workflow/steps.ts` leidt elke status af uit de gegevens:

- `koperSteps(view)`: stappen 1–12, met per persoon de deelstatus waar dat nodig is (gegevens, starters, ID, volmacht)
- `verkoperSteps(view)`: stappen A–G
- `notaryChecks(view)`: N1–N7, met *ready* (alles aangeleverd), *status* (oordeel van de notaris) en *flags* (signaleringen)
- `koopovereenkomstSteps(view)`: het product "koopovereenkomst opstellen"

Omdat statussen niet apart worden opgeslagen, kunnen ze nooit uit de pas lopen met de gegevens.

## Automatisering

`src/lib/automation/engine.ts` → `runAutomations(dossierId)` draait na elke wijziging een vaste reeks idempotente regels, met een mutex per dossier:

1. status bijwerken na ontvangst van de KO
2. verkopers uitnodigen
3. Kadaster raadplegen (documenten, registraties, aflosnota's, vergelijking eigenaren)
4. startersvrijstelling toetsen
5. hypotheekinstructie als "verwacht" markeren
6. concept-leveringsakte genereren (opnieuw bij een andere gegevens-hash)
7. concept-hypotheekakte genereren (na ontvangst van de bankinstructie)
8. volmachten klaarzetten
9. verklaringen startersvrijstelling klaarzetten
10. nota's van afrekening bijwerken
11. aflosnota-verzoeken voorbereiden
12. dossieroverdracht (1 en aanvullend)
13. datumcheck, herinnering en signaal aan de notaris
14. dossier op "gereed voor passeren" zetten

`runCron()` (via `/api/cron`) loopt alle dossiers langs, verstuurt herinneringen en ruimt verlaten aanvragen op.

## Documentgeneratie

Een model (`src/lib/docgen/templates.ts`) bouwt een **tussenformaat** (`ir.ts`): blokken met *runs*. Een run is gewone tekst, een `filled`-gegeven met bron, een `missing`-markering of een `check` (controlepunt). Dit formaat wordt opgeslagen in `document.meta.ir` en:

- als HTML getoond met markeringen (`components/docs/doc-view.tsx`)
- als bewerkbaar Word-bestand weggeschreven (`docx.ts`), met een bijlage met controlepunten en bronnen

## Toegang

- `requireParty(dossierId)`: een klant ziet alleen het dossier waar hij partij in is, en alleen zijn eigen kant (koper of verkoper).
- `canSeeDocument`: zichtbaarheid per document (`koper`, `verkoper`, `partijen` of `intern`). Wwft-bewijsstukken zijn alleen zichtbaar voor de notaris.
- `requireStaff`: notaris en beheer. Elke opening van een document door een medewerker wordt gelogd.

## Demo-modus

`APP_MODE=demo` (standaard):

- `ensureDemoSeed()` bouwt bij een lege database het voorbeelddossier en vier pijplijndossiers op, via dezelfde domeinfuncties als in productie.
- De demobalk biedt een rollenwisselaar (`/demo/als/<rol>`), tours (`/demo/start/<tour>`), een mailbox en de hub.
- Demo-acties simuleren externe gebeurtenissen: klanten ronden hun stappen af, bankinstructie ontvangen, aflosnota ontvangen, volmachtafspraak afgerond, 14 dagen vooruitspoelen, cron.
- Tours (`src/lib/demo/tours.ts`) verwijzen naar elementen met `data-tour="…"`.
