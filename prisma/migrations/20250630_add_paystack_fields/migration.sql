-- AlterEnum
ALTER TYPE "WithdrawalRequestStatus" ADD VALUE 'approved';

-- AlterTable
ALTER TABLE "WithdrawalRequest" ADD COLUMN "transfer_code" TEXT;
ALTER TABLE "WithdrawalRequest" ADD COLUMN "paystack_response" JSONB;
