-- AlterEnum
ALTER TYPE "public"."TransactionType" ADD VALUE 'referral';

-- DropIndex
DROP INDEX "public"."ProfileView_profile_id_viewer_id_ip_address_key";

-- CreateTable
CREATE TABLE "public"."Referrals" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "referral_id" INTEGER NOT NULL,
    "code" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Referrals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ReferralEarnings" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "points" DOUBLE PRECISION NOT NULL,
    "description" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReferralEarnings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Referrals_user_id_idx" ON "public"."Referrals"("user_id");

-- CreateIndex
CREATE INDEX "ReferralEarnings_user_id_idx" ON "public"."ReferralEarnings"("user_id");

-- AddForeignKey
ALTER TABLE "public"."Referrals" ADD CONSTRAINT "Referrals_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Referrals" ADD CONSTRAINT "Referrals_referral_id_fkey" FOREIGN KEY ("referral_id") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ReferralEarnings" ADD CONSTRAINT "ReferralEarnings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
