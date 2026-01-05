-- Migration: Add CompanyMarketCapHistory table and stockPrice field to Company
-- This enables 24h percentage changes and 7d trends for market cap

-- Add stockPrice and lastPriceAt columns to companies table if they don't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'companies' AND column_name = 'stock_price') THEN
        ALTER TABLE "companies" ADD COLUMN "stock_price" DECIMAL(10,4);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'companies' AND column_name = 'last_price_at') THEN
        ALTER TABLE "companies" ADD COLUMN "last_price_at" TIMESTAMP(3);
    END IF;
END $$;

-- Create company_market_cap_history table
CREATE TABLE IF NOT EXISTS "company_market_cap_history" (
    "id" TEXT NOT NULL,
    "company_id" UUID NOT NULL,
    "recorded_at" TIMESTAMP(3) NOT NULL,
    "stock_price" DECIMAL(10,4) NOT NULL,
    "market_cap" DECIMAL(18,2) NOT NULL,
    "volume" BIGINT,
    "change_percent" DOUBLE PRECISION,
    "currency" TEXT NOT NULL DEFAULT 'RON',
    "source" TEXT NOT NULL DEFAULT 'bvb_sync',

    CONSTRAINT "company_market_cap_history_pkey" PRIMARY KEY ("id")
);

-- Add foreign key constraint
ALTER TABLE "company_market_cap_history" ADD CONSTRAINT "company_market_cap_history_company_id_fkey" 
    FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Create indexes for fast queries
CREATE INDEX IF NOT EXISTS "company_market_cap_history_recorded_at_idx" ON "company_market_cap_history"("recorded_at");
CREATE INDEX IF NOT EXISTS "company_market_cap_history_company_id_recorded_at_idx" ON "company_market_cap_history"("company_id", "recorded_at");
