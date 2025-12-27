-- PROMPT 61: National Ingestion Models
-- Create enum and tables for national ingestion tracking

-- Create enum
CREATE TYPE "NationalIngestJobStatus" AS ENUM ('STARTED', 'COMPLETED', 'FAILED', 'PARTIAL');

-- Create NationalIngestJob table
CREATE TABLE "national_ingest_jobs" (
    "id" TEXT NOT NULL,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finished_at" TIMESTAMP(3),
    "status" "NationalIngestJobStatus" NOT NULL DEFAULT 'STARTED',
    "mode" TEXT NOT NULL,
    "limit" INTEGER NOT NULL,
    "cursor_in" TEXT,
    "cursor_out" TEXT,
    "discovered" INTEGER NOT NULL DEFAULT 0,
    "upserted" INTEGER NOT NULL DEFAULT 0,
    "errors" INTEGER NOT NULL DEFAULT 0,
    "stats" JSONB,
    "notes" TEXT,

    CONSTRAINT "national_ingest_jobs_pkey" PRIMARY KEY ("id")
);

-- Create indexes for NationalIngestJob
CREATE INDEX "national_ingest_jobs_started_at_idx" ON "national_ingest_jobs"("started_at");
CREATE INDEX "national_ingest_jobs_status_idx" ON "national_ingest_jobs"("status");

-- Create NationalIngestError table
CREATE TABLE "national_ingest_errors" (
    "id" TEXT NOT NULL,
    "job_id" TEXT NOT NULL,
    "cui" TEXT,
    "source_type" TEXT NOT NULL,
    "source_ref" TEXT,
    "reason" TEXT NOT NULL,
    "raw_payload" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "national_ingest_errors_pkey" PRIMARY KEY ("id")
);

-- Create indexes for NationalIngestError
CREATE INDEX "national_ingest_errors_job_id_idx" ON "national_ingest_errors"("job_id");
CREATE INDEX "national_ingest_errors_source_type_idx" ON "national_ingest_errors"("source_type");
CREATE INDEX "national_ingest_errors_created_at_idx" ON "national_ingest_errors"("created_at");

-- Add foreign key constraint
ALTER TABLE "national_ingest_errors" ADD CONSTRAINT "national_ingest_errors_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "national_ingest_jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

