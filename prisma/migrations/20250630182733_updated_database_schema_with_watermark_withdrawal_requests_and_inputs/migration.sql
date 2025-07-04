/*
  Warnings:

  - You are about to drop the column `captionStyle` on the `StoryMedia` table. All the data in the column will be lost.
  - You are about to drop the column `url` on the `StoryMedia` table. All the data in the column will be lost.
  - Added the required column `user_id` to the `UserMedia` table without a default value. This is not possible if the table is not empty.
  - Changed the type of `ends_at` on the `UserSubscriptionCurrent` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- AlterEnum
ALTER TYPE "UserRole" ADD VALUE 'support';

-- DropIndex
DROP INDEX "WithdrawalRequest_reference_key";

-- AlterTable
ALTER TABLE "Model" ADD COLUMN     "watermark" TEXT DEFAULT '/site/watermark.png';

-- AlterTable
ALTER TABLE "Post" ADD COLUMN     "watermark_enabled" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "StoryMedia" DROP COLUMN "captionStyle",
DROP COLUMN "url",
ADD COLUMN     "captionElements" JSONB,
ADD COLUMN     "media_url" TEXT;

-- AlterTable
ALTER TABLE "Subscribers" ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'active';

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "show_active" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "watermarkEnabled" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "UserMedia" ADD COLUMN     "user_id" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "UserSubscriptionCurrent" DROP COLUMN "ends_at",
ADD COLUMN     "ends_at" BIGINT NOT NULL;

-- AlterTable
ALTER TABLE "WithdrawalRequest" ALTER COLUMN "reference" DROP NOT NULL;

-- CreateTable
CREATE TABLE "PurchasedPosts" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "post_id" INTEGER NOT NULL,
    "purchase_id" TEXT NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PurchasedPosts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PurchasedPosts_purchase_id_key" ON "PurchasedPosts"("purchase_id");

-- CreateIndex
CREATE INDEX "PurchasedPosts_user_id_idx" ON "PurchasedPosts"("user_id");

-- AddForeignKey
ALTER TABLE "UserMedia" ADD CONSTRAINT "UserMedia_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchasedPosts" ADD CONSTRAINT "PurchasedPosts_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchasedPosts" ADD CONSTRAINT "PurchasedPosts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
