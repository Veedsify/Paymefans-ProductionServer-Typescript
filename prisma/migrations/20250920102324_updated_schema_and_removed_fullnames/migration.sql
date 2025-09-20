/*
  Warnings:

  - You are about to drop the column `fullname` on the `User` table. All the data in the column will be lost.

*/
-- AlterEnum
ALTER TYPE "public"."MediaState" ADD VALUE 'failed';

-- AlterTable
ALTER TABLE "public"."StoryMedia" ADD COLUMN     "media_state" "public"."MediaState" NOT NULL DEFAULT 'processing';

-- AlterTable
ALTER TABLE "public"."User" DROP COLUMN "fullname";

-- CreateTable
CREATE TABLE "public"."UploadedMedia" (
    "id" SERIAL NOT NULL,
    "media_id" TEXT NOT NULL,
    "user_id" INTEGER NOT NULL,
    "key" TEXT,
    "type" TEXT NOT NULL,
    "url" TEXT,
    "name" TEXT NOT NULL,
    "size" INTEGER,
    "extension" TEXT,
    "media_state" "public"."MediaState" NOT NULL DEFAULT 'processing',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UploadedMedia_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UploadedMedia_media_id_key" ON "public"."UploadedMedia"("media_id");

-- CreateIndex
CREATE INDEX "UploadedMedia_user_id_idx" ON "public"."UploadedMedia"("user_id");

-- AddForeignKey
ALTER TABLE "public"."UploadedMedia" ADD CONSTRAINT "UploadedMedia_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
