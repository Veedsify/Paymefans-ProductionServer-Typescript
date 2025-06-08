/*
  Warnings:

  - A unique constraint covering the columns `[reference]` on the table `WithdrawalRequest` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `reference` to the `WithdrawalRequest` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Configurations" ADD COLUMN     "platform_deposit_fee" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
ADD COLUMN     "platform_withdrawal_fee" DOUBLE PRECISION NOT NULL DEFAULT 0.0;

-- AlterTable
ALTER TABLE "WithdrawalRequest" ADD COLUMN     "reference" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "WithdrawalRequest_reference_key" ON "WithdrawalRequest"("reference");
