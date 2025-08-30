/*
  Warnings:

  - You are about to drop the column `createdAt` on the `BlockedGroupParticipant` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `BlockedGroupParticipant` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `GroupAttachment` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `GroupInvitation` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `GroupInvitation` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `GroupJoinRequest` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `GroupJoinRequest` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `GroupMember` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `GroupMember` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `GroupMessage` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `GroupMessage` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `GroupSettings` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `GroupSettings` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `Groups` table. All the data in the column will be lost.
  - You are about to drop the column `maxMembers` on the `Groups` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `Groups` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `Tag` table. All the data in the column will be lost.
  - Added the required column `updated_at` to the `BlockedGroupParticipant` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `GroupInvitation` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `GroupJoinRequest` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `GroupMember` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `GroupMessage` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `GroupSettings` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `Groups` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "public"."BlockedGroupParticipant" DROP COLUMN "createdAt",
DROP COLUMN "updatedAt",
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "public"."Configurations" ADD COLUMN     "welcome_message_content" TEXT,
ADD COLUMN     "welcome_message_delay" TEXT NOT NULL DEFAULT '300',
ADD COLUMN     "welcome_message_enabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "welcome_message_title" TEXT;

-- AlterTable
ALTER TABLE "public"."GroupAttachment" DROP COLUMN "createdAt",
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "public"."GroupInvitation" DROP COLUMN "createdAt",
DROP COLUMN "updatedAt",
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "public"."GroupJoinRequest" DROP COLUMN "createdAt",
DROP COLUMN "updatedAt",
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "public"."GroupMember" DROP COLUMN "createdAt",
DROP COLUMN "updatedAt",
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "isBlocked" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "public"."GroupMessage" DROP COLUMN "createdAt",
DROP COLUMN "updatedAt",
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "deliveryStatus" TEXT NOT NULL DEFAULT 'sent',
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "public"."GroupSettings" DROP COLUMN "createdAt",
DROP COLUMN "updatedAt",
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "public"."Groups" DROP COLUMN "createdAt",
DROP COLUMN "maxMembers",
DROP COLUMN "updatedAt",
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "public"."Messages" ADD COLUMN     "isSystemMessage" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "public"."Settings" ADD COLUMN     "watermark_uid" TEXT;

-- AlterTable
ALTER TABLE "public"."Tag" DROP COLUMN "createdAt",
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateTable
CREATE TABLE "public"."OldUsername" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "old_username" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OldUsername_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ConversationFreeMessage" (
    "id" SERIAL NOT NULL,
    "conversation_id" TEXT NOT NULL,
    "user_id" INTEGER NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConversationFreeMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OldUsername_user_id_idx" ON "public"."OldUsername"("user_id");

-- CreateIndex
CREATE INDEX "OldUsername_old_username_idx" ON "public"."OldUsername"("old_username");

-- CreateIndex
CREATE INDEX "ConversationFreeMessage_conversation_id_idx" ON "public"."ConversationFreeMessage"("conversation_id");

-- CreateIndex
CREATE INDEX "ConversationFreeMessage_user_id_idx" ON "public"."ConversationFreeMessage"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "ConversationFreeMessage_conversation_id_user_id_key" ON "public"."ConversationFreeMessage"("conversation_id", "user_id");

-- AddForeignKey
ALTER TABLE "public"."OldUsername" ADD CONSTRAINT "OldUsername_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ConversationFreeMessage" ADD CONSTRAINT "ConversationFreeMessage_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
