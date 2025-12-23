-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "NewsletterSubscriberStatus" AS ENUM ('ACTIVE', 'UNSUB');

-- CreateEnum
CREATE TYPE "ApiKeyPlan" AS ENUM ('FREE', 'PARTNER', 'PREMIUM');

-- CreateEnum
CREATE TYPE "CompanyVisibilityStatus" AS ENUM ('PUBLIC', 'HIDDEN', 'RESTRICTED');

-- CreateEnum
CREATE TYPE "CompanyMetricSource" AS ENUM ('ANAF', 'ESTIMATE', 'USER_SUBMITTED', 'SOURCE0');

-- CreateEnum
CREATE TYPE "CompanyIngestSignalType" AS ENUM ('SEAP_CONTRACT', 'EU_FUNDS', 'JOBS', 'WEB_TRAFFIC', 'SOCIAL_MENTIONS', 'TECH_STACK');

-- CreateEnum
CREATE TYPE "ImportRunStatus" AS ENUM ('RUNNING', 'SUCCESS', 'FAILED');

-- CreateEnum
CREATE TYPE "ImportItemStatus" AS ENUM ('CREATED', 'UPDATED', 'SKIPPED', 'FAILED');

-- CreateEnum
CREATE TYPE "ModerationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "PartnerLeadStatus" AS ENUM ('NEW', 'CONTACTED', 'CLOSED');

-- CreateEnum
CREATE TYPE "ReferralEventKind" AS ENUM ('LANDING', 'PREMIUM_CONVERSION');

-- CreateEnum
CREATE TYPE "ReferralRewardStatus" AS ENUM ('PENDING', 'APPLIED', 'INVALID');

-- CreateEnum
CREATE TYPE "CorrectionRequestStatus" AS ENUM ('NEW', 'REVIEWED', 'CLOSED');

-- CreateEnum
CREATE TYPE "CompanyFinancialDataSource" AS ENUM ('ANAF', 'ESTIMATE', 'USER_SUBMITTED');

-- CreateEnum
CREATE TYPE "CompanySignalDirection" AS ENUM ('UP', 'DOWN', 'NEUTRAL');

-- CreateEnum
CREATE TYPE "CompanySignalType" AS ENUM ('HIRING_VELOCITY', 'WEB_TRAFFIC_CHANGE', 'PRESS_MENTIONS', 'FUNDING_SIGNAL', 'GOVERNMENT_CONTRACTS', 'OTHER');

-- CreateEnum
CREATE TYPE "CompanyScoreType" AS ENUM ('ROMC_SCORE', 'GROWTH_SCORE', 'RISK_SCORE', 'LIQUIDITY_SCORE', 'OTHER');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "name" TEXT,
    "email" TEXT,
    "email_verified" TIMESTAMP(3),
    "image" TEXT,
    "role" TEXT NOT NULL DEFAULT 'user',
    "stripe_customer_id" TEXT,
    "stripe_subscription_id" TEXT,
    "subscription_status" TEXT,
    "current_period_end" TIMESTAMP(3),
    "is_premium" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "accounts" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "provider_account_id" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" UUID NOT NULL,
    "session_token" TEXT NOT NULL,
    "user_id" UUID NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verification_tokens" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "companies" (
    "id" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "legal_name" TEXT NOT NULL,
    "trade_name" TEXT,
    "cui" TEXT,
    "reg_com" TEXT,
    "registration_number" TEXT,
    "country" TEXT NOT NULL DEFAULT 'RO',
    "county" TEXT,
    "county_slug" TEXT,
    "city" TEXT,
    "address" TEXT,
    "founded_year" INTEGER,
    "employee_count_estimate" INTEGER,
    "caen_code" TEXT,
    "caen_description" TEXT,
    "caen" TEXT,
    "industry" TEXT,
    "industry_slug" TEXT,
    "website" TEXT,
    "domain" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "socials" JSONB,
    "description_ro" TEXT,
    "description_en" TEXT,
    "description_short" TEXT,
    "tags" JSONB,
    "last_enriched_at" TIMESTAMP(3),
    "enrich_version" INTEGER NOT NULL DEFAULT 1,
    "employees" INTEGER,
    "revenue_latest" DECIMAL(18,2),
    "profit_latest" DECIMAL(18,2),
    "currency" TEXT NOT NULL DEFAULT 'RON',
    "romc_score" INTEGER,
    "romc_confidence" INTEGER,
    "romc_components" JSONB,
    "valuation_range_low" DECIMAL(18,2),
    "valuation_range_high" DECIMAL(18,2),
    "valuation_currency" TEXT NOT NULL DEFAULT 'EUR',
    "last_scored_at" TIMESTAMP(3),
    "romc_ai_score" INTEGER,
    "romc_ai_components" JSONB,
    "romc_ai_updated_at" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_claimed" BOOLEAN NOT NULL DEFAULT false,
    "visibility_status" "CompanyVisibilityStatus" NOT NULL DEFAULT 'PUBLIC',
    "source_confidence" INTEGER NOT NULL DEFAULT 50,
    "is_public" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "companies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "company_score_history" (
    "id" TEXT NOT NULL,
    "company_id" UUID NOT NULL,
    "recorded_at" TIMESTAMP(3) NOT NULL,
    "romc_score" DOUBLE PRECISION NOT NULL,
    "romc_confidence" INTEGER NOT NULL,
    "valuation_range_low" DOUBLE PRECISION,
    "valuation_range_high" DOUBLE PRECISION,
    "employees" INTEGER,
    "revenue_latest" DOUBLE PRECISION,
    "profit_latest" DOUBLE PRECISION,
    "source" TEXT NOT NULL DEFAULT 'cron',

    CONSTRAINT "company_score_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "company_forecasts" (
    "id" TEXT NOT NULL,
    "company_id" UUID NOT NULL,
    "computed_at" TIMESTAMP(3) NOT NULL,
    "horizon_days" INTEGER NOT NULL,
    "forecast_score" DOUBLE PRECISION NOT NULL,
    "forecast_confidence" INTEGER NOT NULL,
    "forecast_band_low" DOUBLE PRECISION NOT NULL,
    "forecast_band_high" DOUBLE PRECISION NOT NULL,
    "reasoning" JSONB NOT NULL,
    "model_version" TEXT NOT NULL DEFAULT 'pred-v1',

    CONSTRAINT "company_forecasts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "newsletter_subscribers" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "lang" TEXT NOT NULL DEFAULT 'ro',
    "source" TEXT NOT NULL DEFAULT 'website',
    "status" "NewsletterSubscriberStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "confirmed_at" TIMESTAMP(3),

    CONSTRAINT "newsletter_subscribers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "weekly_digest_issues" (
    "id" TEXT NOT NULL,
    "week_start" TIMESTAMP(3) NOT NULL,
    "week_end" TIMESTAMP(3) NOT NULL,
    "subject_ro" TEXT NOT NULL,
    "subject_en" TEXT NOT NULL,
    "html_ro" TEXT NOT NULL,
    "html_en" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "weekly_digest_issues_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "watchlist_items" (
    "id" TEXT NOT NULL,
    "user_id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "watchlist_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "watchlist_settings" (
    "id" TEXT NOT NULL,
    "user_id" UUID NOT NULL,
    "weekly_digest_only" BOOLEAN NOT NULL DEFAULT true,
    "score_change_alerts" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "watchlist_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "api_keys" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "key_hash" TEXT NOT NULL,
    "last4" TEXT NOT NULL,
    "plan" "ApiKeyPlan" NOT NULL DEFAULT 'FREE',
    "rate_limit_kind" TEXT NOT NULL DEFAULT 'anon',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_used_at" TIMESTAMP(3),

    CONSTRAINT "api_keys_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "partner_leads" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "company" TEXT NOT NULL,
    "use_case" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "status" "PartnerLeadStatus" NOT NULL DEFAULT 'NEW',
    "notes" TEXT,

    CONSTRAINT "partner_leads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "referral_codes" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "user_id" UUID NOT NULL,
    "code" TEXT NOT NULL,

    CONSTRAINT "referral_codes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "referral_events" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "kind" "ReferralEventKind" NOT NULL,
    "reward_status" "ReferralRewardStatus" NOT NULL DEFAULT 'PENDING',
    "external_id" TEXT,
    "referral_code" TEXT NOT NULL,
    "referrer_user_id" UUID NOT NULL,
    "referred_user_id" UUID,
    "referred_email_hash" TEXT,
    "metadata" JSONB,

    CONSTRAINT "referral_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "referral_credits" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "user_id" UUID NOT NULL,
    "days" INTEGER NOT NULL,
    "status" "ReferralRewardStatus" NOT NULL DEFAULT 'PENDING',
    "applied_at" TIMESTAMP(3),

    CONSTRAINT "referral_credits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "correction_requests" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "company_id" UUID,
    "company_cui" TEXT,
    "name" TEXT,
    "email" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "status" "CorrectionRequestStatus" NOT NULL DEFAULT 'NEW',
    "notes" TEXT,

    CONSTRAINT "correction_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_audit_logs" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actor_user_id" UUID NOT NULL,
    "action" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "metadata" JSONB,

    CONSTRAINT "admin_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "company_claims" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "role" TEXT NOT NULL,
    "status" "ModerationStatus" NOT NULL DEFAULT 'PENDING',
    "evidence_url" TEXT,
    "note" TEXT,
    "reviewed_by_user_id" UUID,
    "reviewed_at" TIMESTAMP(3),
    "review_note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "company_claims_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "company_submissions" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "type" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "status" "ModerationStatus" NOT NULL DEFAULT 'PENDING',
    "reviewed_by_user_id" UUID,
    "reviewed_at" TIMESTAMP(3),
    "review_note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "company_submissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "company_metrics" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "employees_count" INTEGER,
    "revenue_last_year" DECIMAL(18,2),
    "profit_last_year" DECIMAL(18,2),
    "seap_contracts_count" INTEGER,
    "seap_contracts_value" DECIMAL(18,2),
    "linkedin_followers" INTEGER,
    "linkedin_growth_90d" DOUBLE PRECISION,
    "website_traffic_monthly" INTEGER,
    "mentions_30d" INTEGER,
    "funding_signals" INTEGER,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "company_metrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "company_metric" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "year" INTEGER NOT NULL,
    "revenue" DECIMAL(18,2),
    "profit" DECIMAL(18,2),
    "employees" INTEGER,
    "assets" DECIMAL(18,2),
    "liabilities" DECIMAL(18,2),
    "currency" TEXT NOT NULL DEFAULT 'RON',
    "source" "CompanyMetricSource" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "company_metric_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "company_signal" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "type" "CompanyIngestSignalType" NOT NULL,
    "value_numeric" DOUBLE PRECISION,
    "value_text" TEXT,
    "source_url" TEXT,
    "observed_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "company_signal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "score_snapshot" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "romc_score" INTEGER NOT NULL,
    "growth_score" INTEGER NOT NULL,
    "risk_score" INTEGER NOT NULL,
    "liquidity_score" INTEGER NOT NULL,
    "confidence" INTEGER NOT NULL,
    "explanation_ro" TEXT NOT NULL,
    "explanation_en" TEXT NOT NULL,
    "computed_at" TIMESTAMP(3) NOT NULL,
    "version" TEXT NOT NULL,
    "components_json" JSONB NOT NULL,

    CONSTRAINT "score_snapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "import_run" (
    "id" UUID NOT NULL,
    "source" TEXT NOT NULL,
    "status" "ImportRunStatus" NOT NULL,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finished_at" TIMESTAMP(3),
    "stats_json" JSONB,

    CONSTRAINT "import_run_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "import_item" (
    "id" UUID NOT NULL,
    "import_run_id" UUID NOT NULL,
    "external_id" TEXT NOT NULL,
    "company_cui" TEXT,
    "status" "ImportItemStatus" NOT NULL,
    "error" TEXT,
    "raw_json" JSONB NOT NULL,

    CONSTRAINT "import_item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "company_score" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "as_of_date" DATE NOT NULL,
    "romc_score" INTEGER NOT NULL,
    "romc_ai_score" INTEGER NOT NULL,
    "confidence" INTEGER NOT NULL,
    "components_json" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "company_score_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "company_financial_snapshots" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "fiscal_year" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'RON',
    "revenue" DECIMAL(18,2),
    "profit" DECIMAL(18,2),
    "expenses" DECIMAL(18,2),
    "assets" DECIMAL(18,2),
    "liabilities" DECIMAL(18,2),
    "equity" DECIMAL(18,2),
    "data_source" "CompanyFinancialDataSource" NOT NULL,
    "confidence_score" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "company_financial_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "company_signals" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "signal_type" "CompanySignalType" NOT NULL,
    "signal_value" DOUBLE PRECISION NOT NULL,
    "signal_direction" "CompanySignalDirection" NOT NULL,
    "source" TEXT NOT NULL,
    "detected_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "company_signals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "company_scores" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "score_type" "CompanyScoreType" NOT NULL,
    "score_value" INTEGER NOT NULL,
    "score_version" TEXT NOT NULL,
    "explanation" TEXT,
    "calculated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "company_scores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "company_valuation_estimates" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "valuation_min" DECIMAL(18,2) NOT NULL,
    "valuation_max" DECIMAL(18,2) NOT NULL,
    "valuation_currency" TEXT NOT NULL DEFAULT 'EUR',
    "model_version" TEXT NOT NULL,
    "confidence" INTEGER NOT NULL,
    "methodology_summary" TEXT NOT NULL,
    "calculated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "company_valuation_estimates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_stripe_customer_id_key" ON "users"("stripe_customer_id");

-- CreateIndex
CREATE UNIQUE INDEX "users_stripe_subscription_id_key" ON "users"("stripe_subscription_id");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_stripe_customer_id_idx" ON "users"("stripe_customer_id");

-- CreateIndex
CREATE INDEX "accounts_user_id_idx" ON "accounts"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "accounts_provider_provider_account_id_key" ON "accounts"("provider", "provider_account_id");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_session_token_key" ON "sessions"("session_token");

-- CreateIndex
CREATE INDEX "sessions_user_id_idx" ON "sessions"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "verification_tokens_token_key" ON "verification_tokens"("token");

-- CreateIndex
CREATE UNIQUE INDEX "verification_tokens_identifier_token_key" ON "verification_tokens"("identifier", "token");

-- CreateIndex
CREATE UNIQUE INDEX "companies_slug_key" ON "companies"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "companies_cui_key" ON "companies"("cui");

-- CreateIndex
CREATE INDEX "companies_slug_idx" ON "companies"("slug");

-- CreateIndex
CREATE INDEX "companies_cui_idx" ON "companies"("cui");

-- CreateIndex
CREATE INDEX "companies_caen_code_idx" ON "companies"("caen_code");

-- CreateIndex
CREATE INDEX "companies_county_idx" ON "companies"("county");

-- CreateIndex
CREATE INDEX "companies_county_slug_idx" ON "companies"("county_slug");

-- CreateIndex
CREATE INDEX "companies_city_idx" ON "companies"("city");

-- CreateIndex
CREATE INDEX "companies_name_idx" ON "companies"("name");

-- CreateIndex
CREATE INDEX "companies_legal_name_idx" ON "companies"("legal_name");

-- CreateIndex
CREATE INDEX "companies_industry_slug_idx" ON "companies"("industry_slug");

-- CreateIndex
CREATE INDEX "companies_domain_idx" ON "companies"("domain");

-- CreateIndex
CREATE INDEX "companies_last_enriched_at_idx" ON "companies"("last_enriched_at");

-- CreateIndex
CREATE INDEX "company_score_history_recorded_at_idx" ON "company_score_history"("recorded_at");

-- CreateIndex
CREATE INDEX "company_score_history_company_id_recorded_at_idx" ON "company_score_history"("company_id", "recorded_at");

-- CreateIndex
CREATE INDEX "company_forecasts_computed_at_idx" ON "company_forecasts"("computed_at");

-- CreateIndex
CREATE INDEX "company_forecasts_company_id_idx" ON "company_forecasts"("company_id");

-- CreateIndex
CREATE UNIQUE INDEX "company_forecasts_company_id_horizon_days_model_version_key" ON "company_forecasts"("company_id", "horizon_days", "model_version");

-- CreateIndex
CREATE UNIQUE INDEX "newsletter_subscribers_email_key" ON "newsletter_subscribers"("email");

-- CreateIndex
CREATE INDEX "newsletter_subscribers_created_at_idx" ON "newsletter_subscribers"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "weekly_digest_issues_week_start_key" ON "weekly_digest_issues"("week_start");

-- CreateIndex
CREATE INDEX "weekly_digest_issues_week_start_idx" ON "weekly_digest_issues"("week_start");

-- CreateIndex
CREATE INDEX "watchlist_items_user_id_idx" ON "watchlist_items"("user_id");

-- CreateIndex
CREATE INDEX "watchlist_items_company_id_idx" ON "watchlist_items"("company_id");

-- CreateIndex
CREATE UNIQUE INDEX "watchlist_items_user_id_company_id_key" ON "watchlist_items"("user_id", "company_id");

-- CreateIndex
CREATE UNIQUE INDEX "watchlist_settings_user_id_key" ON "watchlist_settings"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "api_keys_key_hash_key" ON "api_keys"("key_hash");

-- CreateIndex
CREATE INDEX "api_keys_plan_idx" ON "api_keys"("plan");

-- CreateIndex
CREATE INDEX "api_keys_active_idx" ON "api_keys"("active");

-- CreateIndex
CREATE INDEX "partner_leads_created_at_idx" ON "partner_leads"("created_at");

-- CreateIndex
CREATE INDEX "partner_leads_status_idx" ON "partner_leads"("status");

-- CreateIndex
CREATE INDEX "partner_leads_email_idx" ON "partner_leads"("email");

-- CreateIndex
CREATE UNIQUE INDEX "referral_codes_user_id_key" ON "referral_codes"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "referral_codes_code_key" ON "referral_codes"("code");

-- CreateIndex
CREATE INDEX "referral_codes_created_at_idx" ON "referral_codes"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "referral_events_external_id_key" ON "referral_events"("external_id");

-- CreateIndex
CREATE INDEX "referral_events_created_at_idx" ON "referral_events"("created_at");

-- CreateIndex
CREATE INDEX "referral_events_kind_idx" ON "referral_events"("kind");

-- CreateIndex
CREATE INDEX "referral_events_referrer_user_id_idx" ON "referral_events"("referrer_user_id");

-- CreateIndex
CREATE INDEX "referral_events_referred_user_id_idx" ON "referral_events"("referred_user_id");

-- CreateIndex
CREATE INDEX "referral_credits_created_at_idx" ON "referral_credits"("created_at");

-- CreateIndex
CREATE INDEX "referral_credits_user_id_idx" ON "referral_credits"("user_id");

-- CreateIndex
CREATE INDEX "referral_credits_status_idx" ON "referral_credits"("status");

-- CreateIndex
CREATE INDEX "correction_requests_created_at_idx" ON "correction_requests"("created_at");

-- CreateIndex
CREATE INDEX "correction_requests_status_idx" ON "correction_requests"("status");

-- CreateIndex
CREATE INDEX "correction_requests_email_idx" ON "correction_requests"("email");

-- CreateIndex
CREATE INDEX "admin_audit_logs_created_at_idx" ON "admin_audit_logs"("created_at");

-- CreateIndex
CREATE INDEX "admin_audit_logs_action_idx" ON "admin_audit_logs"("action");

-- CreateIndex
CREATE INDEX "admin_audit_logs_entity_type_idx" ON "admin_audit_logs"("entity_type");

-- CreateIndex
CREATE INDEX "company_claims_company_id_status_idx" ON "company_claims"("company_id", "status");

-- CreateIndex
CREATE INDEX "company_claims_user_id_status_idx" ON "company_claims"("user_id", "status");

-- CreateIndex
CREATE INDEX "company_submissions_company_id_status_idx" ON "company_submissions"("company_id", "status");

-- CreateIndex
CREATE INDEX "company_submissions_status_created_at_idx" ON "company_submissions"("status", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "company_metrics_company_id_key" ON "company_metrics"("company_id");

-- CreateIndex
CREATE INDEX "company_metrics_company_id_idx" ON "company_metrics"("company_id");

-- CreateIndex
CREATE INDEX "company_metric_company_id_year_idx" ON "company_metric"("company_id", "year");

-- CreateIndex
CREATE INDEX "company_signal_company_id_type_observed_at_idx" ON "company_signal"("company_id", "type", "observed_at");

-- CreateIndex
CREATE INDEX "score_snapshot_company_id_computed_at_idx" ON "score_snapshot"("company_id", "computed_at");

-- CreateIndex
CREATE UNIQUE INDEX "score_snapshot_company_id_computed_at_version_key" ON "score_snapshot"("company_id", "computed_at", "version");

-- CreateIndex
CREATE INDEX "import_run_source_started_at_idx" ON "import_run"("source", "started_at");

-- CreateIndex
CREATE INDEX "import_item_import_run_id_idx" ON "import_item"("import_run_id");

-- CreateIndex
CREATE INDEX "import_item_external_id_idx" ON "import_item"("external_id");

-- CreateIndex
CREATE INDEX "company_score_company_id_as_of_date_idx" ON "company_score"("company_id", "as_of_date");

-- CreateIndex
CREATE UNIQUE INDEX "company_score_company_id_as_of_date_key" ON "company_score"("company_id", "as_of_date");

-- CreateIndex
CREATE INDEX "company_financial_snapshots_company_id_fiscal_year_idx" ON "company_financial_snapshots"("company_id", "fiscal_year");

-- CreateIndex
CREATE INDEX "company_financial_snapshots_fiscal_year_idx" ON "company_financial_snapshots"("fiscal_year");

-- CreateIndex
CREATE UNIQUE INDEX "company_financial_snapshots_company_id_fiscal_year_data_sou_key" ON "company_financial_snapshots"("company_id", "fiscal_year", "data_source");

-- CreateIndex
CREATE INDEX "company_signals_company_id_detected_at_idx" ON "company_signals"("company_id", "detected_at");

-- CreateIndex
CREATE INDEX "company_signals_company_id_signal_type_detected_at_idx" ON "company_signals"("company_id", "signal_type", "detected_at");

-- CreateIndex
CREATE INDEX "company_scores_company_id_score_type_calculated_at_idx" ON "company_scores"("company_id", "score_type", "calculated_at");

-- CreateIndex
CREATE UNIQUE INDEX "company_scores_company_id_score_type_calculated_at_score_ve_key" ON "company_scores"("company_id", "score_type", "calculated_at", "score_version");

-- CreateIndex
CREATE INDEX "company_valuation_estimates_company_id_calculated_at_idx" ON "company_valuation_estimates"("company_id", "calculated_at");

-- CreateIndex
CREATE UNIQUE INDEX "company_valuation_estimates_company_id_calculated_at_model__key" ON "company_valuation_estimates"("company_id", "calculated_at", "model_version");

-- AddForeignKey
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "company_score_history" ADD CONSTRAINT "company_score_history_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "company_forecasts" ADD CONSTRAINT "company_forecasts_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "watchlist_items" ADD CONSTRAINT "watchlist_items_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "watchlist_items" ADD CONSTRAINT "watchlist_items_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "watchlist_settings" ADD CONSTRAINT "watchlist_settings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "referral_codes" ADD CONSTRAINT "referral_codes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "referral_events" ADD CONSTRAINT "referral_events_referrer_user_id_fkey" FOREIGN KEY ("referrer_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "referral_events" ADD CONSTRAINT "referral_events_referred_user_id_fkey" FOREIGN KEY ("referred_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "referral_credits" ADD CONSTRAINT "referral_credits_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "correction_requests" ADD CONSTRAINT "correction_requests_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin_audit_logs" ADD CONSTRAINT "admin_audit_logs_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "company_claims" ADD CONSTRAINT "company_claims_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "company_claims" ADD CONSTRAINT "company_claims_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "company_claims" ADD CONSTRAINT "company_claims_reviewed_by_user_id_fkey" FOREIGN KEY ("reviewed_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "company_submissions" ADD CONSTRAINT "company_submissions_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "company_submissions" ADD CONSTRAINT "company_submissions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "company_submissions" ADD CONSTRAINT "company_submissions_reviewed_by_user_id_fkey" FOREIGN KEY ("reviewed_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "company_metrics" ADD CONSTRAINT "company_metrics_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "company_metric" ADD CONSTRAINT "company_metric_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "company_signal" ADD CONSTRAINT "company_signal_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "score_snapshot" ADD CONSTRAINT "score_snapshot_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "import_item" ADD CONSTRAINT "import_item_import_run_id_fkey" FOREIGN KEY ("import_run_id") REFERENCES "import_run"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "company_score" ADD CONSTRAINT "company_score_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "company_financial_snapshots" ADD CONSTRAINT "company_financial_snapshots_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "company_signals" ADD CONSTRAINT "company_signals_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "company_scores" ADD CONSTRAINT "company_scores_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "company_valuation_estimates" ADD CONSTRAINT "company_valuation_estimates_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

