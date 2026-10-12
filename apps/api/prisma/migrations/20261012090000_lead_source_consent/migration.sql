-- CreateEnum
CREATE TYPE "LeadSource" AS ENUM ('WEB', 'PHONE', 'MARKETPLACE', 'OTHER');

-- AlterTable
ALTER TABLE "Lead" ADD COLUMN     "source" "LeadSource" NOT NULL DEFAULT 'WEB',
ADD COLUMN     "utmSource" TEXT,
ADD COLUMN     "utmMedium" TEXT,
ADD COLUMN     "utmCampaign" TEXT,
ADD COLUMN     "consentAt" TIMESTAMP(3),
ADD COLUMN     "firstRespondedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "Lead_firstRespondedAt_idx" ON "Lead"("firstRespondedAt");
