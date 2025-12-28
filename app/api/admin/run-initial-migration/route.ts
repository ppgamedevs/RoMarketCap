import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/src/lib/db";
import { readFileSync } from "fs";
import { join } from "path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Endpoint to run initial database migrations
 * This will create all tables including the users table
 */
async function runInitialMigration(req: NextRequest) {
  try {
    const secret = req.headers.get("x-migration-secret") || req.nextUrl.searchParams.get("secret");
    const expectedSecret = process.env.MIGRATION_SECRET || "temp-migration-2024";
    
    if (secret !== expectedSecret) {
      return NextResponse.json({ 
        ok: false, 
        error: "Unauthorized. Add ?secret=temp-migration-2024 to the URL or set MIGRATION_SECRET env var." 
      }, { status: 401 });
    }

    // Check if users table exists
    const tableCheck = await prisma.$queryRaw<Array<{ exists: boolean }>>`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'users'
      ) as exists;
    `;
    
    if (tableCheck[0]?.exists) {
      return NextResponse.json({ 
        ok: true, 
        message: "Users table already exists. Initial migration appears to have been run.",
        alreadyExists: true
      });
    }

    // Read the migration file
    // Note: In production/Vercel, we need to read from the deployment
    // For now, we'll execute the critical parts manually
    
    const results: string[] = [];
    
    try {
      // Skip CREATE SCHEMA (usually exists) and run the rest
      // We'll execute in chunks to avoid issues
      
      // First, create enums
      const enumQueries = [
        `DO $$ BEGIN CREATE TYPE "NewsletterSubscriberStatus" AS ENUM ('ACTIVE', 'UNSUB'); EXCEPTION WHEN duplicate_object THEN null; END $$;`,
        `DO $$ BEGIN CREATE TYPE "ApiKeyPlan" AS ENUM ('FREE', 'PARTNER', 'PREMIUM'); EXCEPTION WHEN duplicate_object THEN null; END $$;`,
        `DO $$ BEGIN CREATE TYPE "CompanyVisibilityStatus" AS ENUM ('PUBLIC', 'HIDDEN', 'RESTRICTED'); EXCEPTION WHEN duplicate_object THEN null; END $$;`,
        `DO $$ BEGIN CREATE TYPE "CompanyMetricSource" AS ENUM ('ANAF', 'ESTIMATE', 'USER_SUBMITTED', 'SOURCE0'); EXCEPTION WHEN duplicate_object THEN null; END $$;`,
        `DO $$ BEGIN CREATE TYPE "CompanyIngestSignalType" AS ENUM ('SEAP_CONTRACT', 'EU_FUNDS', 'JOBS', 'WEB_TRAFFIC', 'SOCIAL_MENTIONS', 'TECH_STACK'); EXCEPTION WHEN duplicate_object THEN null; END $$;`,
        `DO $$ BEGIN CREATE TYPE "ImportRunStatus" AS ENUM ('RUNNING', 'SUCCESS', 'FAILED'); EXCEPTION WHEN duplicate_object THEN null; END $$;`,
        `DO $$ BEGIN CREATE TYPE "ImportItemStatus" AS ENUM ('CREATED', 'UPDATED', 'SKIPPED', 'FAILED'); EXCEPTION WHEN duplicate_object THEN null; END $$;`,
        `DO $$ BEGIN CREATE TYPE "ModerationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED'); EXCEPTION WHEN duplicate_object THEN null; END $$;`,
        `DO $$ BEGIN CREATE TYPE "PartnerLeadStatus" AS ENUM ('NEW', 'CONTACTED', 'CLOSED'); EXCEPTION WHEN duplicate_object THEN null; END $$;`,
        `DO $$ BEGIN CREATE TYPE "ReferralEventKind" AS ENUM ('LANDING', 'PREMIUM_CONVERSION'); EXCEPTION WHEN duplicate_object THEN null; END $$;`,
        `DO $$ BEGIN CREATE TYPE "ReferralRewardStatus" AS ENUM ('PENDING', 'APPLIED', 'INVALID'); EXCEPTION WHEN duplicate_object THEN null; END $$;`,
        `DO $$ BEGIN CREATE TYPE "CorrectionRequestStatus" AS ENUM ('NEW', 'REVIEWED', 'CLOSED'); EXCEPTION WHEN duplicate_object THEN null; END $$;`,
        `DO $$ BEGIN CREATE TYPE "CompanyFinancialDataSource" AS ENUM ('ANAF', 'ESTIMATE', 'USER_SUBMITTED'); EXCEPTION WHEN duplicate_object THEN null; END $$;`,
        `DO $$ BEGIN CREATE TYPE "CompanySignalDirection" AS ENUM ('UP', 'DOWN', 'NEUTRAL'); EXCEPTION WHEN duplicate_object THEN null; END $$;`,
        `DO $$ BEGIN CREATE TYPE "CompanySignalType" AS ENUM ('HIRING_VELOCITY', 'WEB_TRAFFIC_CHANGE', 'PRESS_MENTIONS', 'FUNDING_SIGNAL', 'GOVERNMENT_CONTRACTS', 'OTHER'); EXCEPTION WHEN duplicate_object THEN null; END $$;`,
        `DO $$ BEGIN CREATE TYPE "CompanyScoreType" AS ENUM ('ROMC_SCORE', 'GROWTH_SCORE', 'RISK_SCORE', 'LIQUIDITY_SCORE', 'OTHER'); EXCEPTION WHEN duplicate_object THEN null; END $$;`,
      ];
      
      for (const query of enumQueries) {
        await prisma.$executeRawUnsafe(query);
        results.push(`Created enum: ${query.substring(0, 50)}...`);
      }
      
      // Create users table (with password column included)
      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "users" (
          "id" UUID NOT NULL,
          "name" TEXT,
          "email" TEXT,
          "email_verified" TIMESTAMP(3),
          "image" TEXT,
          "password" TEXT,
          "role" TEXT NOT NULL DEFAULT 'user',
          "stripe_customer_id" TEXT,
          "stripe_subscription_id" TEXT,
          "subscription_status" TEXT,
          "current_period_end" TIMESTAMP(3),
          "is_premium" BOOLEAN NOT NULL DEFAULT false,
          "premium_since" TIMESTAMP(3),
          "premium_until" TIMESTAMP(3),
          "export_credits" INTEGER NOT NULL DEFAULT 0,
          "referred_by_user_id" UUID,
          "referred_by_code" TEXT,
          "referral_ltv" DECIMAL(18,2),
          "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updated_at" TIMESTAMP(3) NOT NULL,
          CONSTRAINT "users_pkey" PRIMARY KEY ("id")
        );
      `);
      results.push("Created users table");
      
      // Create unique index on email
      await prisma.$executeRawUnsafe(`
        CREATE UNIQUE INDEX IF NOT EXISTS "users_email_key" ON "users"("email");
      `).catch(() => null);
      
      // Create accounts table
      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "accounts" (
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
      `);
      results.push("Created accounts table");
      
      // Create sessions table
      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "sessions" (
          "id" UUID NOT NULL,
          "session_token" TEXT NOT NULL,
          "user_id" UUID NOT NULL,
          "expires" TIMESTAMP(3) NOT NULL,
          CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
        );
      `);
      results.push("Created sessions table");
      
      // Create verification_tokens table
      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "verification_tokens" (
          "identifier" TEXT NOT NULL,
          "token" TEXT NOT NULL,
          "expires" TIMESTAMP(3) NOT NULL,
          CONSTRAINT "verification_tokens_token_key" UNIQUE ("token"),
          CONSTRAINT "verification_tokens_identifier_token_key" UNIQUE ("identifier", "token")
        );
      `);
      results.push("Created verification_tokens table");
      
      // Add foreign keys
      await prisma.$executeRawUnsafe(`
        DO $$ BEGIN
          ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_fkey" 
          FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
        EXCEPTION WHEN duplicate_object THEN null;
        END $$;
      `).catch(() => null);
      
      await prisma.$executeRawUnsafe(`
        DO $$ BEGIN
          ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_fkey" 
          FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
        EXCEPTION WHEN duplicate_object THEN null;
        END $$;
      `).catch(() => null);
      
      results.push("Added foreign keys");
      
      // Add indexes
      await prisma.$executeRawUnsafe(`
        CREATE UNIQUE INDEX IF NOT EXISTS "accounts_provider_provider_account_id_key" ON "accounts"("provider", "provider_account_id");
      `).catch(() => null);
      
      await prisma.$executeRawUnsafe(`
        CREATE UNIQUE INDEX IF NOT EXISTS "sessions_session_token_key" ON "sessions"("session_token");
      `).catch(() => null);
      
      await prisma.$executeRawUnsafe(`
        CREATE INDEX IF NOT EXISTS "users_email_idx" ON "users"("email");
      `).catch(() => null);
      
      results.push("Added indexes");
      
      return NextResponse.json({ 
        ok: true, 
        message: "Initial migration completed successfully. Core auth tables created.",
        results,
        note: "This only created the essential auth tables (users, accounts, sessions, verification_tokens). Other tables may need to be created separately."
      });
      
    } catch (error: any) {
      return NextResponse.json({ 
        ok: false, 
        error: error.message,
        code: error.code,
        results,
      }, { status: 500 });
    }
    
  } catch (error) {
    console.error("[run-initial-migration] Error:", error);
    return NextResponse.json({ 
      ok: false, 
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
    }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  return runInitialMigration(req);
}

export async function POST(req: NextRequest) {
  return runInitialMigration(req);
}
