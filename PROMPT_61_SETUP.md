# PROMPT 61 - Setup Instructions

## 1. Migrare DB

### Opțiunea 1: Folosind Prisma Migrate (Recomandat)

```bash
# În directorul proiectului, cu env-ul corect (aceeași DB ca pe Vercel)
npx prisma migrate dev --name add_national_ingestion
```

Sau dacă vrei doar să creezi migrarea fără să o aplici:

```bash
npx prisma migrate dev --name add_national_ingestion --create-only
```

### Opțiunea 2: Aplicare manuală SQL

Dacă preferi să aplici manual, folosește fișierul:
- `prisma/migrations/add_national_ingestion.sql`

Aplică-l direct pe baza de date de producție/staging.

### Verificare tabele

După migrare, verifică că tabelele există:

```sql
-- Verifică enum-ul
SELECT enum_range(NULL::"NationalIngestJobStatus");

-- Verifică tabelele
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('national_ingest_jobs', 'national_ingest_errors');

-- Verifică structura
\d national_ingest_jobs
\d national_ingest_errors
```

## 2. Pornește Flag-urile

### În `/admin/flags`:

1. **NATIONAL_INGESTION_ADMIN_ENABLED** = **ON** ✅
   - Necesar pentru a accesa UI-ul de administrare

2. **NATIONAL_INGESTION_ENABLED** = **ON** ✅
   - Activează funcționalitatea de ingerare națională

3. **NATIONAL_INGESTION_CRON_ENABLED** = **ON** (opțional)
   - Activează rularea automată prin cron orchestrator
   - Poți lăsa OFF dacă vrei să rulezi manual

### Sau prin KV direct:

```bash
# Dacă ai acces la Vercel KV CLI
vercel kv set flag:NATIONAL_INGESTION_ADMIN_ENABLED true
vercel kv set flag:NATIONAL_INGESTION_ENABLED true
vercel kv set flag:NATIONAL_INGESTION_CRON_ENABLED true  # opțional
```

## 3. Testează din Admin UI

### Accesează `/admin/national-ingestion`

1. **Dry Run (500)**
   - Click pe butonul "Dry Run"
   - Verifică că:
     - Se afișează numărul de CUIs descoperite
     - Se afișează numărul de companii care ar fi create/update-ate
     - **NU** se scriu date în DB (dry run)
     - Cursor-ul se actualizează în KV

2. **Run Now (500)**
   - Click pe butonul "Run Now"
   - Verifică că:
     - Se creează/actualizează companii în DB
     - Se creează înregistrări în `national_ingest_jobs`
     - Se creează `CompanyProvenance` pentru fiecare companie
     - Dacă există erori, se creează înregistrări în `national_ingest_errors`
     - Stats-urile se actualizează corect

### Verificări suplimentare:

```sql
-- Verifică job-urile create
SELECT id, started_at, status, discovered, upserted, errors 
FROM national_ingest_jobs 
ORDER BY started_at DESC 
LIMIT 5;

-- Verifică erorile (dacă există)
SELECT source_type, COUNT(*) as count
FROM national_ingest_errors
WHERE created_at > NOW() - INTERVAL '1 day'
GROUP BY source_type;

-- Verifică companiile create recent
SELECT COUNT(*) 
FROM companies 
WHERE created_at > NOW() - INTERVAL '1 hour';

-- Verifică provenance-urile
SELECT source_name, COUNT(*) as count
FROM company_provenance
WHERE imported_at > NOW() - INTERVAL '1 hour'
GROUP BY source_name;
```

## 4. Verifică Health Endpoint

```bash
GET /api/health
```

Verifică că răspunsul conține:

```json
{
  "nationalIngest": {
    "nationalIngestLastRun": "...",
    "nationalIngestDegraded": false,
    "discoveredLastRun": N,
    "upsertedLastRun": N,
    "errorCountLastRun": N,
    "lastJobStatus": "COMPLETED"
  }
}
```

## 5. Testează Cron Route (opțional)

```bash
POST /api/cron/national-ingest?limit=50&dry=1
Headers: x-cron-secret: <CRON_SECRET>
```

Ar trebui să returneze:
```json
{
  "ok": true,
  "dryRun": true,
  "discovered": N,
  "upserted": N,
  "errors": 0,
  "cursorIn": "...",
  "cursorOut": "..."
}
```

## Troubleshooting

### Dacă migrarea eșuează:
- Verifică că ai acces la DB
- Verifică că nu există deja tabelele
- Verifică log-urile Prisma

### Dacă flag-urile nu se activează:
- Verifică că ai acces de admin
- Verifică că KV-ul funcționează
- Reîncarcă pagina `/admin/flags`

### Dacă dry run nu funcționează:
- Verifică că `NATIONAL_INGESTION_ENABLED` este ON
- Verifică că `NATIONAL_INGESTION_ADMIN_ENABLED` este ON
- Verifică log-urile în consolă

### Dacă run now nu scrie în DB:
- Verifică că nu ești în read-only mode
- Verifică că flag-urile sunt active
- Verifică erorile în `national_ingest_errors`

