-- Add password field to users table for email/password authentication
-- Password is nullable to support OAuth users who don't have passwords

ALTER TABLE "users" 
ADD COLUMN IF NOT EXISTS "password" TEXT;

