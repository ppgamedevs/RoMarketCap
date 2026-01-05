-- Add company_context JSON column to companies table
-- Stores structured contextual information: financial highlights, key insights, growth plans, market context

-- Add column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'companies' AND column_name = 'company_context'
  ) THEN
    ALTER TABLE companies ADD COLUMN company_context JSONB;
    
    -- Add comment
    COMMENT ON COLUMN companies.company_context IS 'Structured context data: financial highlights, key insights, growth plans, market context';
  END IF;
END $$;
