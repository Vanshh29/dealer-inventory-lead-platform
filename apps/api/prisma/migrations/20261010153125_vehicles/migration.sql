-- CreateEnum
CREATE TYPE "FuelType" AS ENUM ('PETROL', 'DIESEL', 'ELECTRIC', 'HYBRID', 'PLUGIN_HYBRID', 'LPG');

-- CreateEnum
CREATE TYPE "Gearbox" AS ENUM ('MANUAL', 'AUTOMATIC');

-- CreateEnum
CREATE TYPE "VehicleStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'RESERVED', 'SOLD');

-- CreateTable
CREATE TABLE "Vehicle" (
    "id" TEXT NOT NULL,
    "vin" TEXT NOT NULL,
    "make" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "variant" TEXT,
    "year" INTEGER NOT NULL,
    "mileage" INTEGER NOT NULL,
    "priceCents" INTEGER NOT NULL,
    "fuel" "FuelType" NOT NULL,
    "gearbox" "Gearbox" NOT NULL,
    "color" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "status" "VehicleStatus" NOT NULL DEFAULT 'DRAFT',
    -- Generated and kept in sync by PostgreSQL itself: no triggers, no app code, cannot drift.
    -- 'simple' config: no stemming/stop-words, because make and model names are not natural language
    -- and listings mix German and English. Weights: A make/model, B variant, C colour, D description.
    -- fuel/gearbox are enums (enum->text is not immutable) and are filter-only.
    "searchVector" tsvector GENERATED ALWAYS AS (
        setweight(to_tsvector('simple', coalesce("make", '') || ' ' || coalesce("model", '')), 'A') ||
        setweight(to_tsvector('simple', coalesce("variant", '')), 'B') ||
        setweight(to_tsvector('simple', coalesce("color", '')), 'C') ||
        setweight(to_tsvector('simple', coalesce("description", '')), 'D')
    ) STORED,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Vehicle_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "Vehicle_priceCents_check" CHECK ("priceCents" >= 0),
    CONSTRAINT "Vehicle_mileage_check" CHECK ("mileage" >= 0),
    CONSTRAINT "Vehicle_year_check" CHECK ("year" BETWEEN 1886 AND 2100)
);

-- CreateTable
CREATE TABLE "VehicleImage" (
    "id" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "position" INTEGER NOT NULL,

    CONSTRAINT "VehicleImage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Vehicle_vin_key" ON "Vehicle"("vin");

-- CreateIndex
CREATE INDEX "Vehicle_searchVector_idx" ON "Vehicle" USING GIN ("searchVector");

-- CreateIndex
CREATE INDEX "Vehicle_status_priceCents_idx" ON "Vehicle"("status", "priceCents");

-- CreateIndex
CREATE INDEX "Vehicle_status_year_idx" ON "Vehicle"("status", "year");

-- CreateIndex
CREATE INDEX "Vehicle_status_make_model_idx" ON "Vehicle"("status", "make", "model");

-- CreateIndex
CREATE INDEX "Vehicle_status_mileage_idx" ON "Vehicle"("status", "mileage");

-- CreateIndex
CREATE INDEX "Vehicle_status_createdAt_idx" ON "Vehicle"("status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "VehicleImage_key_key" ON "VehicleImage"("key");

-- CreateIndex
CREATE INDEX "VehicleImage_vehicleId_position_idx" ON "VehicleImage"("vehicleId", "position");

-- AddForeignKey
ALTER TABLE "VehicleImage" ADD CONSTRAINT "VehicleImage_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE CASCADE ON UPDATE CASCADE;
