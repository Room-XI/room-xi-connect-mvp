-- Fix referred_by FK: should reference youth_workers, not users
ALTER TABLE "referrals" DROP CONSTRAINT IF EXISTS "referrals_referred_by_users_id_fk";
ALTER TABLE "referrals" DROP CONSTRAINT IF EXISTS "referrals_referred_by_fkey";
