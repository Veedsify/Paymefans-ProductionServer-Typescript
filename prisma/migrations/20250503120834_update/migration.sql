/*
  Warnings:

  - You are about to drop the column `value` on the `PlatformExchangeRate` table. All the data in the column will be lost.
  - You are about to drop the `migrations` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `sessions` table. If the table is not empty, all the data it contains will be lost.

*/
-- AlterTable
ALTER TABLE "PlatformExchangeRate" DROP COLUMN "value",
ADD COLUMN     "buyValue" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "sellValue" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "symbol" TEXT NOT NULL DEFAULT '$',
ALTER COLUMN "rate" SET DEFAULT 0,
ALTER COLUMN "rate" SET DATA TYPE DOUBLE PRECISION;

-- DropTable
DROP TABLE "migrations";

-- DropTable
DROP TABLE "sessions";
