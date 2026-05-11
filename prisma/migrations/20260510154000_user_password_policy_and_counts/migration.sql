-- Add forced password change flag for users created/reset by admin.
ALTER TABLE "User"
ADD COLUMN "mustChangePassword" BOOLEAN NOT NULL DEFAULT false;

-- Persist transaction counts for both reconciliation sides.
ALTER TABLE "Reconciliation"
ADD COLUMN "supplierCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "systemCount" INTEGER NOT NULL DEFAULT 0;
