# Deploy

## Demo: `demo.akte-loket.nl`

De demo is een persistent proces. Hij heeft een vaste server nodig, geen serverless omgeving, omdat PGlite op schijf schrijft.

1. Bouw de container: `docker build -t akteloket-demo --build-arg APP_MODE=demo .`
2. Start hem met een volume voor de database:
   ```bash
   docker run -d --name akteloket-demo -p 3000:3000 -v akteloket-demo-data:/app/.data \
     -e APP_MODE=demo -e NEXT_PUBLIC_SITE_URL=https://demo.akte-loket.nl akteloket-demo
   ```
3. Zet DNS `demo.akte-loket.nl` op de server en plaats er een reverse proxy met TLS voor (Caddy of Traefik).
4. De demo staat automatisch op noindex (`robots.txt` disallow en meta-robots).
5. Resetten kan via de knop op `/demo`, of door het volume te verwijderen.

Geschikte EU-hosting: Hetzner (Duitsland/Finland), Scaleway (Parijs/Amsterdam) of Fly.io (regio `ams`) met een volume.

## Productie: `akte-loket.nl`

- `APP_MODE=production` als **build-argument** en als runtime-variabele. De marketingpagina's worden dan statisch gerenderd en de demoroutes zijn uit.
- `DATABASE_URL`: een managed PostgreSQL in de EU (bijvoorbeeld Neon EU, Supabase EU of Scaleway). Migraties draaien automatisch bij de eerste verbinding.
- `ENCRYPTION_KEY` (verplicht), `SMTP_URL`, `MAIL_FROM`, `CRON_SECRET`, `STAFF_NOTARY_EMAILS`, `STAFF_OPS_EMAILS`, `NOTARY_*`, en indien gekoppeld `KADASTER_*` en `ANTHROPIC_API_KEY`.
- Cron: elk uur `GET https://akte-loket.nl/api/cron` met `Authorization: Bearer $CRON_SECRET`.
- Back-ups: dagelijkse database-dump, versleuteld en in de EU opgeslagen.
- Monitoring: `/api/health`.

## Lokaal

```bash
npm install
npm run dev          # demo-modus
APP_MODE=production npm run build && APP_MODE=production npm start
```
