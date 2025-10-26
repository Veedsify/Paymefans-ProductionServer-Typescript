-- AlterEnum
ALTER TYPE "public"."NotificationTypes" ADD VALUE 'reply';

-- AlterTable
ALTER TABLE "public"."ModelSubscriptionTier" ALTER COLUMN "tier_description" DROP NOT NULL;

-- AlterTable
ALTER TABLE "public"."Post" ADD COLUMN     "repost_name" TEXT DEFAULT '';

-- AlterTable
ALTER TABLE "public"."Settings" ALTER COLUMN "price_per_message" SET DEFAULT 0;
