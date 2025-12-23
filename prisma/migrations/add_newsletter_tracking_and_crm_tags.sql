-- Add email tracking fields to NewsletterSubscriber
ALTER TABLE newsletter_subscribers
ADD COLUMN IF NOT EXISTS last_email_sent_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS total_emails_sent INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_opens INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_clicks INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_opened_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS last_clicked_at TIMESTAMP;

-- Add CRM-lite tagging to Company
ALTER TABLE companies
ADD COLUMN IF NOT EXISTS outreach_status VARCHAR(50),
ADD COLUMN IF NOT EXISTS outreach_notes TEXT,
ADD COLUMN IF NOT EXISTS outreach_contacted_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS outreach_responded_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS outreach_converted_at TIMESTAMP;

CREATE INDEX IF NOT EXISTS idx_companies_outreach_status ON companies(outreach_status);

