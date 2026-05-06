-- Remove the old QR-based marker storage.
DROP TABLE IF EXISTS "Marker";
DROP TYPE IF EXISTS "MarkerType";

-- CreateTable
CREATE TABLE "ArModel" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL,
    "asset_url" TEXT NOT NULL,
    "asset_format" TEXT NOT NULL DEFAULT 'glb',
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "altitude_meters" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "position_x" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "position_y" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "position_z" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "rotation_x" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "rotation_y" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "rotation_z" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "scale" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ArModel_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ArModel_slug_key" ON "ArModel"("slug");

-- CreateIndex
CREATE INDEX "ArModel_is_active_idx" ON "ArModel"("is_active");

-- CreateIndex
CREATE INDEX "ArModel_latitude_longitude_idx" ON "ArModel"("latitude", "longitude");
