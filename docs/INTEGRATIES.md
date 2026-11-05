# Integraties

## Kadaster (eigen API)

Implementatie: `src/lib/integrations/kadaster.ts`.

- `KADASTER_PROVIDER=mock` (standaard zonder URL): fictieve maar realistische gegevens en PDF's.
- `KADASTER_PROVIDER=http` plus `KADASTER_API_URL` en `KADASTER_API_KEY`: aanroep van jouw API.

**Request** (GET, header `Authorization: Bearer <KADASTER_API_KEY>`):

```
GET {KADASTER_API_URL}/objecten?postcode=3816XK&huisnummer=14&toevoeging=&documenten=eigendomsinformatie,kadastrale_kaart,akte
GET {KADASTER_API_URL}/objecten?gemeente=Amersfoort&sectie=K&perceel=4821&index=&documenten=...
```

**Verwachte response** (`200`, of `404` als het object niet bestaat):

```json
{
  "kenmerk": "KAD-2026-…",
  "perceel": { "gemeente": "Amersfoort", "sectie": "K", "perceelnummer": "4821", "appartementsindex": null, "grootteM2": 168 },
  "gerechtigden": [{ "naam": "Hendrikus Johannes Jansen", "geboortedatum": "1961-05-12", "recht": "Eigendom", "aandeel": "1/2" }],
  "inschrijvingen": [
    { "soort": "hypotheek", "omschrijving": "Recht van hypotheek …", "partij": "Bank N.V.", "bedrag": 260000, "deel": "61234", "nummer": "87", "datum": "2011-06-30" },
    { "soort": "erfdienstbaarheid", "omschrijving": "Erfdienstbaarheid van overpad …", "deel": "61234", "nummer": "86" }
  ],
  "verkrijgingsakte": { "datum": "2011-06-30", "deel": "61234", "nummer": "86", "notaris": "mr. …" },
  "documenten": [{ "soort": "eigendomsinformatie", "bestandsnaam": "eigendom.pdf", "mime": "application/pdf", "base64": "…" }]
}
```

`soort` voor inschrijvingen: `hypotheek`, `beslag`, `erfdienstbaarheid`, `kwalitatieve_verplichting`, `voorkeursrecht` of `aantekening`. Geeft jouw API een andere structuur terug, pas dan alleen `mapHttp()` aan. De rest van het systeem werkt op `KadasterResult`.

## PDOK Locatieserver (BAG)

Publiek, gratis en zonder sleutel. De browser roept `api.pdok.nl/bzk/locatieserver/search/v3_1/suggest` en `/lookup` aan voor adres-autocomplete en het gekoppelde perceel (`gekoppeld_perceel`, bijvoorbeeld `AMF04-K-4821`). Is PDOK niet bereikbaar, dan vult de klant het adres handmatig in.

## AI-extractie (Claude)

`src/lib/extraction/koopovereenkomst.ts` en `bankinstructie.ts`.

- Staat aan met `ANTHROPIC_API_KEY`. Het model is `claude-opus-5-5` (te wijzigen met `ANTHROPIC_MODEL`).
- De PDF (of foto) wordt als document meegestuurd. Gestructureerde uitvoer via een Zod-schema (`betaZodOutputFormat`). Server-side fallback (`fallbacks: "default"`) voor het geval het model een verzoek weigert.
- Uitvoer per veld: pagina, letterlijk citaat en zekerheid (0–1). Velden onder 0,75 zijn "te controleren".
- Faalt de aanroep, of is er geen sleutel, dan valt het systeem terug op de regelgebaseerde parser.
- **Voor livegang:** verwerkersovereenkomst en data-afspraken vastleggen (zie BESLISSINGEN E-5).

## Identificatie

`src/app/portaal/[id]/idcheck/page.tsx` simuleert de provider. Voor productie: doorsturen naar de gekozen provider (iDIN-acquirer of NFC-ID-app) en het resultaat opslaan met dezelfde velden als `IdCheckData` (status, methode, provider, resultaat, match).

## Ondertekening

- DVO: digitaal akkoord (getypte naam, verklaringen, tijdstip, IP-adres, hash).
- Volmacht: tijdens een afspraak (video of kantoor). Voor productie kan een e-signing-provider (gekwalificeerde handtekening) worden gekoppeld waar de notaris dat toestaat.

## E-mail

`src/lib/integrations/email.ts`: elk bericht gaat via de tabel `emails` (outbox, auditbaar). Verzending:

- **Resend** (`RESEND_API_KEY`): `POST https://api.resend.com/emails` met `MAIL_FROM` en `MAIL_REPLY_TO`. Het setup-script voegt het domein toe in de EU-regio (`eu-west-1`) en geeft de app een sleutel die alleen voor dat domein mag verzenden.
- **SMTP** (`SMTP_URL`): via nodemailer, bijvoorbeeld een EU-SMTP-provider.
- **Demo** of geen provider: niets wordt verzonden. De berichten zijn te zien in `/demo/mailbox` (status "gesimuleerd").

Mislukte verzending krijgt de status "mislukt", met de foutmelding erbij in `/beheer`.

## Opslag: upload-inbox (Supabase Storage)

`src/lib/integrations/inbox.ts`, `src/app/api/upload/sign/route.ts`, `src/lib/client/upload.ts`.

Vercel accepteert maximaal ~4,5 MB per request. Daarom:

1. Bestanden tot 4 MB gaan als gewone multipart-upload naar de app.
2. Grotere bestanden (tot 25 MB): de browser vraagt `/api/upload/sign` om een eenmalige upload-URL voor de privé-bucket `inbox`. Dat mag alleen met een sessie of een lopende aanvraag. De browser uploadt daar rechtstreeks heen en stuurt daarna alleen het pad naar de app.
3. De server haalt het bestand op met de service-sleutel, verwerkt het (scanner), versleutelt het in de database en verwijdert het uit de inbox.
4. De dagelijkse cron verwijdert achtergebleven bestanden die ouder zijn dan een dag.

Zonder `SUPABASE_URL` en `SUPABASE_SERVICE_ROLE_KEY` (lokaal, Docker) gaat alles direct naar de app.

## Database (Supabase)

De app verbindt via de Supavisor-pooler (`…pooler.supabase.com:6543`, transactiemodus, IPv4) met een pool van maximaal 3 verbindingen per serverless-instance. TLS is altijd aan. Met `DATABASE_CA_CERT` (de CA uit Supabase → Database → SSL) wordt het certificaat ook volledig geverifieerd. De Data API (PostgREST) van Supabase wordt niet gebruikt. Migratie `0001_afscherming` zet RLS aan en trekt de rechten van `anon` en `authenticated` in.

## Cron

`GET /api/cron` met header `Authorization: Bearer $CRON_SECRET`. Vercel Cron roept het dagelijks aan (`vercel.json`) en stuurt de header automatisch mee. Op Vercel Pro of eigen hosting: elk uur. Het endpoint verzorgt de datumcheck (14 dagen vooraf), herinneringen, signalen aan de notaris, het opruimen van verlaten aanvragen en het opruimen van de upload-inbox.
