-- LCE v4.0 Database Migration
-- Add new fields for Lead Cadence Engine v4.0

-- Add cadencePhase field (unified phase tracking)
ALTER TABLE "Record" ADD COLUMN IF NOT EXISTS "cadencePhase" TEXT DEFAULT 'NEW';

-- Add cadenceProgress field (progress string like "3/7")
ALTER TABLE "Record" ADD COLUMN IF NOT EXISTS "cadenceProgress" TEXT;

-- Add blitzStartedAt field (when blitz phase started)
ALTER TABLE "Record" ADD COLUMN IF NOT EXISTS "blitzStartedAt" TIMESTAMP(3);

-- Add temperatureStartedAt field (when temperature cadence started)
ALTER TABLE "Record" ADD COLUMN IF NOT EXISTS "temperatureStartedAt" TIMESTAMP(3);

-- Add queueTier field (queue priority tier 1-9)
ALTER TABLE "Record" ADD COLUMN IF NOT EXISTS "queueTier" INTEGER DEFAULT 9;

-- Add lastPhoneCalledId field (ID of last phone number called)
ALTER TABLE "Record" ADD COLUMN IF NOT EXISTS "lastPhoneCalledId" TEXT;

-- Add phoneExhaustedAt field (when all phones were exhausted)
ALTER TABLE "Record" ADD COLUMN IF NOT EXISTS "phoneExhaustedAt" TIMESTAMP(3);

-- Create indexes for new LCE v4.0 fields
CREATE INDEX IF NOT EXISTS "Record_createdById_cadencePhase_idx" ON "Record"("createdById", "cadencePhase");
CREATE INDEX IF NOT EXISTS "Record_createdById_queueTier_idx" ON "Record"("createdById", "queueTier");
CREATE INDEX IF NOT EXISTS "Record_phoneExhaustedAt_idx" ON "Record"("phoneExhaustedAt");

-- Sync cadencePhase with currentPhase for existing records
UPDATE "Record" SET "cadencePhase" = "currentPhase" WHERE "cadencePhase" = 'NEW' AND "currentPhase" != 'NEW';
