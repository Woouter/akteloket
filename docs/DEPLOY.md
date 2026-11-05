# Deploy

Akteloket draait op **Vercel** (hosting, regio Frankfurt) met **Supabase** (PostgreSQL en opslag, regio Frankfurt) en **Resend** (e-mail, EU-regio). Alles wordt ingericht door één script, `npm run setup`. Je hebt daarvoor alleen drie API-sleutels nodig.

| Omgeving | Adres | Vercel-project | Supabase-project | Modus |
|---|---|---|---|---|
| Productie | `akte-loket.nl` (+ `www.` → doorsturen) | `akteloket` | `akteloket` | `APP_MODE=production` |
| Demo | `demo.akte-loket.nl` | `akteloket-demo` | `akteloket-demo` | `APP_MODE=demo` |
| Preview (elke andere branch) | `*.vercel.app` | beide | geen: database in het geheugen | `APP_MODE=demo` |

Productie en demo hebben elk een eigen database, eigen sleutels en een eigen opslagbucket. Een preview-deploy komt nooit aan de productiedatabase.

## Stap 1: de drie sleutels

| Dienst | Waar | Let op |
|---|---|---|
| Supabase | [supabase.com/dashboard/account/tokens](https://supabase.com/dashboard/account/tokens) → *Generate new token* | Persoonlijk toegangstoken (begint met `sbp_`), geen project-sleutel. |
| Vercel | [vercel.com/account/tokens](https://vercel.com/account/tokens) → *Create* | Kies je account of team als scope. Bij een team ook `VERCEL_TEAM_ID` invullen. |
| Resend | [resend.com/api-keys](https://resend.com/api-keys) → *Create API key* | Permissie **Full access**: het script maakt daarmee het domein en een aparte verzendsleutel voor de app aan. |

En eenmalig bij Vercel: installeer de **Vercel GitHub-app** met toegang tot de repository `Woouter/akteloket` ([github.com/apps/vercel](https://github.com/apps/vercel)). Dan kan het script het project aan GitHub koppelen.

## Stap 2: de `.env.local` invullen

Het bestand `.env.local` staat bewust **niet** in GitHub (zie `.gitignore`). Je maakt het zelf aan op de plek waar je het script draait. Kies een van de twee routes.

**A. Op je eigen computer** (Node.js 22 of nieuwer nodig, [nodejs.org](https://nodejs.org)):

```bash
git clone https://github.com/Woouter/akteloket.git
```

```bash
cd akteloket
```

```bash
cp .env.example .env.local
```

Open `.env.local` in een editor (bijvoorbeeld VS Code), vul blok 1 in (en bij voorkeur blok 2) en sla op.

**B. Zonder installatie, in de browser (GitHub Codespaces):** ga naar de repository op GitHub → *Code* → *Codespaces* → *Create codespace on main*. Je krijgt VS Code in de browser met een terminal. Draai daar `cp .env.example .env.local`, open het bestand links in de verkenner en vul het in. Download na afloop `.akteloket-setup.json` (rechtermuisklik → *Download*) en bewaar het in je wachtwoordmanager. Verwijder de codespace daarna.

## Stap 3: het script draaien

```bash
npm install
```

```bash
npm run setup
```

Het script doet, in deze volgorde:

1. **Supabase**: maakt de projecten `akteloket` en `akteloket-demo` aan in `eu-central-1` (Frankfurt) met een sterk, gegenereerd databasewachtwoord. Het wacht tot ze klaar zijn, haalt de pooler-verbinding en de server-sleutel op en maakt een privé-bucket `inbox` (voor uploads groter dan 4 MB).
2. **Database**: draait de migraties (inclusief afscherming van de tabellen, zie D-20) en zet in de demo het voorbeelddossier klaar.
3. **Resend**: voegt het domein toe in de EU-regio, haalt de DNS-records op en maakt een verzendsleutel die alleen voor dit domein mag verzenden.
4. **Vercel**: maakt beide projecten aan, gekoppeld aan GitHub. Het zet alle omgevingsvariabelen (geheimen als *sensitive*), koppelt de domeinen en start een productie-deploy vanaf `main`.
5. **Rapport**: schrijft `setup-resultaat.md` met de DNS-records en eventuele aandachtspunten.

Het script is **herhaalbaar**: bestaande projecten, buckets, domeinen en sleutels worden hergebruikt en er wordt niets verwijderd. De `ENCRYPTION_KEY` in Vercel wordt nooit overschreven. Draai het gerust opnieuw na een wijziging in `.env.local`, bijvoorbeeld als je medewerkers toevoegt.

Opties: `npm run setup -- --geen-demo` (alleen productie), `--geen-deploy` (wel inrichten, niet deployen), `--geen-db` (migraties overslaan; de app draait ze zelf bij de eerste aanvraag).

### De geheimen

Gegenereerde geheimen komen in `.akteloket-setup.json`: databasewachtwoorden, `ENCRYPTION_KEY`, `CRON_SECRET` en de Resend-verzendsleutel. Dat bestand staat in `.gitignore`. **Bewaar een kopie in je wachtwoordmanager.** Zonder de `ENCRYPTION_KEY` zijn opgeslagen documenten niet meer te openen.

Ben je het bestand kwijt? Het script herkent bestaande projecten. Voor de database vraagt het je dan het wachtwoord opnieuw in te stellen in Supabase en het in `.env.local` te zetten (`SUPABASE_DB_PASSWORD_PROD`/`_DEMO`). De sleutels die al in Vercel staan, blijven staan.

## Stap 4: DNS

Zet de records uit `setup-resultaat.md` bij je domeinregistrar. Meestal zijn dat:

| Type | Naam | Waarde | Waarvoor |
|---|---|---|---|
| A | `@` | door Vercel opgegeven IP (bijvoorbeeld `76.76.21.21`) | Website |
| CNAME | `www` | door Vercel opgegeven host (bijvoorbeeld `cname.vercel-dns.com`) | Doorsturen naar `akte-loket.nl` |
| CNAME | `demo` | idem | Demo-omgeving |
| MX + TXT | `send` | door Resend opgegeven | SPF voor e-mail |
| TXT | `resend._domainkey` | door Resend opgegeven | DKIM voor e-mail |
| TXT | `_dmarc` | `v=DMARC1; p=none;` | DMARC (aanbevolen) |
| TXT | `_vercel` | alleen als Vercel daarom vraagt | Eigendomsbewijs |

Het script haalt per domein de waarden op die Vercel aanbeveelt. Gebruik altijd die uit het rapport. De records voor e-mail staan op het subdomein `send.` en botsen dus niet met je bestaande mailbox op `hallo@akte-loket.nl`. Resend verstuurt alleen; om mail te ontvangen heb je je eigen mailprovider nodig.

Draai na het zetten van de DNS-records `npm run setup` nog een keer. Dan worden het Resend-domein en de Vercel-domeinen opnieuw gecontroleerd. Vercel regelt het SSL-certificaat zelf.

## Stap 5: de productiebranch

Vercel deployt naar productie vanaf de standaardbranch van de GitHub-repository. Zet die op `main`: GitHub → *Settings* → *General* → *Default branch*. Doe dit bij voorkeur vóór `npm run setup`. Daarna geldt: elke push naar `main` gaat live op beide omgevingen, en elke andere branch krijgt een eigen preview-URL. Staat het al gekoppeld met een andere branch, pas het dan aan via Vercel → project → *Settings* → *Git*. Het script waarschuwt hiervoor.

## Abonnementen en limieten

- **Vercel Hobby is volgens de voorwaarden niet bedoeld voor commercieel gebruik.** Neem voor productie Vercel **Pro**. Dan kan de cron ook elk uur draaien: zet in `vercel.json` de schedule op `"5 * * * *"`. Op Hobby draait de cron één keer per dag.
- **Supabase Free**: maximaal 2 actieve projecten per organisatie (precies productie + demo). Projecten pauzeren na een week zonder activiteit. Neem voor productie **Pro**: geen pauze, dagelijkse back-ups en point-in-time recovery als extra optie.
- **Resend Free**: 3.000 e-mails per maand, 100 per dag.
- **Verwerkersovereenkomsten (DPA's)** met Vercel, Supabase en Resend afsluiten vóór livegang. Alle drie bieden een standaard-DPA.
- Vercel accepteert maximaal ~4,5 MB per request. Grotere uploads gaan daarom via de privé-bucket (zie `docs/INTEGRATIES.md`).

## Monitoring

- `/api/health` geeft de modus en de tijd.
- Vercel → project → *Logs* en *Cron Jobs*. Het cron-endpoint is beveiligd met `CRON_SECRET`, dat Vercel automatisch meestuurt.
- Supabase → project → *Reports* en *Logs*.

## Alternatief: eigen server of container (zonder Vercel)

De `Dockerfile` werkt op elke container-hosting in de EU (Hetzner, Scaleway, Fly.io).

```bash
docker build -t akteloket --build-arg APP_MODE=production .
```

```bash
docker run -d -p 3000:3000 --env-file .env.production akteloket
```

Zet in `.env.production` de variabelen uit blok 4 van `.env.example`. Zonder `DATABASE_URL` gebruikt een demo-container PGlite op schijf: koppel dan een volume op `/app/.data`. Plan de cron zelf in, bijvoorbeeld elk uur `GET /api/cron` met `Authorization: Bearer $CRON_SECRET`.

## Lokaal

```bash
npm install
```

```bash
npm run dev
```

Lokaal draait de demo met een ingebouwde database (`.data/`). Er hoeft niets ingevuld te worden. Next.js leest `.env.local` wel mee: heb je `ANTHROPIC_API_KEY` ingevuld, dan werkt de AI-scanner ook lokaal. In demo-modus worden nooit echte e-mails verstuurd.
