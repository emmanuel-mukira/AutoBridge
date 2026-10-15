-- Rename auth schema columns from camelCase to snake_case
-- to match Prisma @map() directives in schema.prisma

-- auth.companies
ALTER TABLE auth.companies RENAME COLUMN "createdAt" TO "created_at";
ALTER TABLE auth.companies RENAME COLUMN "updatedAt" TO "updated_at";

-- auth.roles
ALTER TABLE auth.roles RENAME COLUMN "createdAt" TO "created_at";
ALTER TABLE auth.roles RENAME COLUMN "updatedAt" TO "updated_at";

-- auth.users — rename ALL camelCase columns to snake_case
ALTER TABLE auth.users RENAME COLUMN "createdAt" TO "created_at";
ALTER TABLE auth.users RENAME COLUMN "updatedAt" TO "updated_at";
ALTER TABLE auth.users RENAME COLUMN "passwordHash" TO "password_hash";
ALTER TABLE auth.users RENAME COLUMN "roleId" TO "role_id";
ALTER TABLE auth.users RENAME COLUMN "requirePasswordReset" TO "require_password_reset";
ALTER TABLE auth.users RENAME COLUMN "lastLogin" TO "last_login";
ALTER TABLE auth.users RENAME COLUMN "inviteToken" TO "invite_token";
ALTER TABLE auth.users RENAME COLUMN "inviteExpires" TO "invite_expires";
ALTER TABLE auth.users RENAME COLUMN "firstName" TO "first_name";
ALTER TABLE auth.users RENAME COLUMN "lastName" TO "last_name";

-- auth.audit_logs — rename ALL camelCase columns to snake_case
ALTER TABLE auth.audit_logs RENAME COLUMN "createdAt" TO "created_at";
ALTER TABLE auth.audit_logs RENAME COLUMN "ipAddress" TO "ip_address";
ALTER TABLE auth.audit_logs RENAME COLUMN "userAgent" TO "user_agent";
ALTER TABLE auth.audit_logs RENAME COLUMN "userId" TO "user_id";

-- Fix foreign key index references if needed (Prisma will handle on next migrate)
-- Rename the unique constraint index on invite_token if it exists
ALTER INDEX IF EXISTS auth."users_inviteToken_key" RENAME TO "users_invite_token_key";

-- Add username column (matches Authelia username / Remote-User header)
ALTER TABLE auth.users ADD COLUMN IF NOT EXISTS "username" TEXT;
-- Backfill existing rows with email local-part as username
UPDATE auth.users SET "username" = LOWER(SPLIT_PART(email, '@', 1)) WHERE "username" IS NULL;
-- Now make it NOT NULL and UNIQUE
ALTER TABLE auth.users ALTER COLUMN "username" SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "users_username_key" ON auth.users ("username");

-- Drop role_id FK constraint and column (roles managed by Authelia groups now)
ALTER TABLE auth.users DROP CONSTRAINT IF EXISTS "users_roleId_fkey";
ALTER TABLE auth.users DROP CONSTRAINT IF EXISTS "users_role_id_fkey";
ALTER TABLE auth.users DROP COLUMN IF EXISTS "role_id";

-- Drop tables no longer in the schema
DROP TABLE IF EXISTS auth.user_sessions CASCADE;
DROP TABLE IF EXISTS auth.roles CASCADE;
