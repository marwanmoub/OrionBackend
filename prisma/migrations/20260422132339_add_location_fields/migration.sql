/*
  Warnings:

  - The `departure_from_home_time` column on the `Guide` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "Guide" ADD COLUMN     "origin_address" TEXT,
ADD COLUMN     "origin_lat" DOUBLE PRECISION,
ADD COLUMN     "origin_lng" DOUBLE PRECISION,
ADD COLUMN     "origin_place_id" TEXT,
DROP COLUMN "departure_from_home_time",
ADD COLUMN     "departure_from_home_time" INTEGER;
