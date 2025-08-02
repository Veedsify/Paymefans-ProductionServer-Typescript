/*
  Warnings:

  - You are about to drop the column `created_at` on the `BlockedGroupParticipant` table. All the data in the column will be lost.
  - You are about to drop the column `group_id` on the `BlockedGroupParticipant` table. All the data in the column will be lost.
  - You are about to drop the column `updated_at` on the `BlockedGroupParticipant` table. All the data in the column will be lost.
  - You are about to drop the column `user_id` on the `BlockedGroupParticipant` table. All the data in the column will be lost.
  - You are about to drop the column `groupChatId` on the `GroupMessage` table. All the data in the column will be lost.
  - You are about to drop the column `created_at` on the `GroupSettings` table. All the data in the column will be lost.
  - You are about to drop the column `description` on the `GroupSettings` table. All the data in the column will be lost.
  - You are about to drop the column `group_icon` on the `GroupSettings` table. All the data in the column will be lost.
  - You are about to drop the column `group_id` on the `GroupSettings` table. All the data in the column will be lost.
  - You are about to drop the column `name` on the `GroupSettings` table. All the data in the column will be lost.
  - You are about to drop the column `updated_at` on the `GroupSettings` table. All the data in the column will be lost.
  - You are about to drop the column `created_at` on the `Groups` table. All the data in the column will be lost.
  - You are about to drop the column `group_id` on the `Groups` table. All the data in the column will be lost.
  - You are about to drop the column `updated_at` on the `Groups` table. All the data in the column will be lost.
  - You are about to drop the column `paid_status` on the `Order` table. All the data in the column will be lost.
  - You are about to drop the column `transaction_id` on the `Order` table. All the data in the column will be lost.
  - You are about to drop the `OrderProduct` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `_GroupsToUser` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[userId,groupId]` on the table `BlockedGroupParticipant` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[groupId]` on the table `GroupSettings` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[media_id]` on the table `StoryMedia` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[story_id]` on the table `UserStory` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `blockedBy` to the `BlockedGroupParticipant` table without a default value. This is not possible if the table is not empty.
  - Added the required column `groupId` to the `BlockedGroupParticipant` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `BlockedGroupParticipant` table without a default value. This is not possible if the table is not empty.
  - Added the required column `userId` to the `BlockedGroupParticipant` table without a default value. This is not possible if the table is not empty.
  - Added the required column `groupId` to the `GroupMessage` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `GroupMessage` table without a default value. This is not possible if the table is not empty.
  - Added the required column `groupId` to the `GroupSettings` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `GroupSettings` table without a default value. This is not possible if the table is not empty.
  - Added the required column `adminId` to the `Groups` table without a default value. This is not possible if the table is not empty.
  - Added the required column `name` to the `Groups` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `Groups` table without a default value. This is not possible if the table is not empty.
  - Added the required column `shipping_address` to the `Order` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "public"."PaymentStatus" AS ENUM ('pending', 'paid', 'failed');

-- CreateEnum
CREATE TYPE "public"."GroupType" AS ENUM ('PUBLIC', 'PRIVATE', 'SECRET');

-- CreateEnum
CREATE TYPE "public"."GroupMemberRole" AS ENUM ('ADMIN', 'MODERATOR', 'MEMBER');

-- CreateEnum
CREATE TYPE "public"."AutomatedMessageType" AS ENUM ('followers', 'subscribers');

-- CreateEnum
CREATE TYPE "public"."JoinRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "public"."InvitationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED', 'EXPIRED');

-- DropForeignKey
ALTER TABLE "public"."BlockedGroupParticipant" DROP CONSTRAINT "BlockedGroupParticipant_group_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."BlockedGroupParticipant" DROP CONSTRAINT "BlockedGroupParticipant_user_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."GroupAttachment" DROP CONSTRAINT "GroupAttachment_messageId_fkey";

-- DropForeignKey
ALTER TABLE "public"."GroupMessage" DROP CONSTRAINT "GroupMessage_groupChatId_fkey";

-- DropForeignKey
ALTER TABLE "public"."GroupSettings" DROP CONSTRAINT "GroupSettings_group_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."Messages" DROP CONSTRAINT "Messages_groupsId_fkey";

-- DropForeignKey
ALTER TABLE "public"."OrderProduct" DROP CONSTRAINT "OrderProduct_order_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."OrderProduct" DROP CONSTRAINT "OrderProduct_product_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."_GroupsToUser" DROP CONSTRAINT "_GroupsToUser_A_fkey";

-- DropForeignKey
ALTER TABLE "public"."_GroupsToUser" DROP CONSTRAINT "_GroupsToUser_B_fkey";

-- DropIndex
DROP INDEX "public"."GroupSettings_group_id_key";

-- DropIndex
DROP INDEX "public"."Order_transaction_id_key";

-- AlterTable
ALTER TABLE "public"."BlockedGroupParticipant" DROP COLUMN "created_at",
DROP COLUMN "group_id",
DROP COLUMN "updated_at",
DROP COLUMN "user_id",
ADD COLUMN     "blockedBy" INTEGER NOT NULL,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "groupId" INTEGER NOT NULL,
ADD COLUMN     "reason" TEXT,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "userId" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "public"."Configurations" ALTER COLUMN "platform_deposit_fee" SET DEFAULT 0.10,
ALTER COLUMN "platform_withdrawal_fee" SET DEFAULT 0.25;

-- AlterTable
ALTER TABLE "public"."GroupAttachment" ADD COLUMN     "fileName" TEXT,
ADD COLUMN     "fileSize" INTEGER;

-- AlterTable
ALTER TABLE "public"."GroupMessage" DROP COLUMN "groupChatId",
ADD COLUMN     "editedAt" TIMESTAMP(3),
ADD COLUMN     "groupId" INTEGER NOT NULL,
ADD COLUMN     "isEdited" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "messageType" TEXT NOT NULL DEFAULT 'text',
ADD COLUMN     "replyToId" INTEGER,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "public"."GroupSettings" DROP COLUMN "created_at",
DROP COLUMN "description",
DROP COLUMN "group_icon",
DROP COLUMN "group_id",
DROP COLUMN "name",
DROP COLUMN "updated_at",
ADD COLUMN     "allowFileSharing" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "allowMediaSharing" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "allowMemberInvites" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "autoApproveJoinReqs" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "groupId" INTEGER NOT NULL,
ADD COLUMN     "moderateMessages" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "mutedUntil" TIMESTAMP(3),
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "public"."Groups" DROP COLUMN "created_at",
DROP COLUMN "group_id",
DROP COLUMN "updated_at",
ADD COLUMN     "adminId" INTEGER NOT NULL,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "description" TEXT,
ADD COLUMN     "groupIcon" TEXT,
ADD COLUMN     "groupType" "public"."GroupType" NOT NULL DEFAULT 'PUBLIC',
ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "maxMembers" INTEGER NOT NULL DEFAULT 100,
ADD COLUMN     "name" TEXT NOT NULL,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "public"."Messages" ADD COLUMN     "story_reply" JSONB;

-- AlterTable
ALTER TABLE "public"."Order" DROP COLUMN "paid_status",
DROP COLUMN "transaction_id",
ADD COLUMN     "payment_reference" TEXT,
ADD COLUMN     "payment_status" "public"."PaymentStatus" NOT NULL DEFAULT 'pending',
ADD COLUMN     "shipping_address" JSONB NOT NULL,
ADD COLUMN     "status" "public"."OrderStatus" NOT NULL DEFAULT 'pending';

-- DropTable
DROP TABLE "public"."OrderProduct";

-- DropTable
DROP TABLE "public"."_GroupsToUser";

-- CreateTable
CREATE TABLE "public"."StoryView" (
    "id" SERIAL NOT NULL,
    "story_media_id" TEXT NOT NULL,
    "viewer_id" INTEGER NOT NULL,
    "viewed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userStoryId" INTEGER,

    CONSTRAINT "StoryView_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ProfileView" (
    "id" SERIAL NOT NULL,
    "profile_id" INTEGER NOT NULL,
    "viewer_id" INTEGER,
    "ip_address" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProfileView_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."CommentView" (
    "id" SERIAL NOT NULL,
    "comment_id" INTEGER NOT NULL,
    "user_id" INTEGER,
    "ip_address" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommentView_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."UserLocation" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "longitude" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "city" TEXT,
    "state" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserLocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."OrderItem" (
    "id" SERIAL NOT NULL,
    "order_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "size_id" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrderItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PendingCheckout" (
    "id" SERIAL NOT NULL,
    "reference" TEXT NOT NULL,
    "user_id" INTEGER NOT NULL,
    "order_data" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PendingCheckout_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."GroupMember" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "groupId" INTEGER NOT NULL,
    "role" "public"."GroupMemberRole" NOT NULL DEFAULT 'MEMBER',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeen" TIMESTAMP(3),
    "isMuted" BOOLEAN NOT NULL DEFAULT false,
    "mutedBy" INTEGER,
    "mutedUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GroupMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."UserBlock" (
    "id" SERIAL NOT NULL,
    "block_id" TEXT NOT NULL,
    "blocker_id" INTEGER NOT NULL,
    "blocked_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserBlock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."AutomatedMessage" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "message_type" "public"."AutomatedMessageType" NOT NULL,
    "message_text" TEXT,
    "attachments" JSONB DEFAULT '[]',
    "is_active" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AutomatedMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."GroupMessageRead" (
    "id" SERIAL NOT NULL,
    "messageId" INTEGER NOT NULL,
    "userId" TEXT NOT NULL,
    "readAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GroupMessageRead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."GroupJoinRequest" (
    "id" SERIAL NOT NULL,
    "groupId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "message" TEXT,
    "status" "public"."JoinRequestStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GroupJoinRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."GroupInvitation" (
    "id" SERIAL NOT NULL,
    "groupId" INTEGER NOT NULL,
    "inviterId" INTEGER NOT NULL,
    "inviteeId" INTEGER NOT NULL,
    "message" TEXT,
    "status" "public"."InvitationStatus" NOT NULL DEFAULT 'PENDING',
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GroupInvitation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StoryView_story_media_id_idx" ON "public"."StoryView"("story_media_id");

-- CreateIndex
CREATE INDEX "StoryView_viewer_id_idx" ON "public"."StoryView"("viewer_id");

-- CreateIndex
CREATE UNIQUE INDEX "StoryView_story_media_id_viewer_id_key" ON "public"."StoryView"("story_media_id", "viewer_id");

-- CreateIndex
CREATE INDEX "ProfileView_profile_id_idx" ON "public"."ProfileView"("profile_id");

-- CreateIndex
CREATE INDEX "ProfileView_viewer_id_idx" ON "public"."ProfileView"("viewer_id");

-- CreateIndex
CREATE INDEX "ProfileView_created_at_idx" ON "public"."ProfileView"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "ProfileView_profile_id_viewer_id_ip_address_key" ON "public"."ProfileView"("profile_id", "viewer_id", "ip_address");

-- CreateIndex
CREATE INDEX "CommentView_comment_id_idx" ON "public"."CommentView"("comment_id");

-- CreateIndex
CREATE INDEX "CommentView_user_id_idx" ON "public"."CommentView"("user_id");

-- CreateIndex
CREATE INDEX "CommentView_created_at_idx" ON "public"."CommentView"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "CommentView_comment_id_user_id_ip_address_key" ON "public"."CommentView"("comment_id", "user_id", "ip_address");

-- CreateIndex
CREATE UNIQUE INDEX "UserLocation_user_id_key" ON "public"."UserLocation"("user_id");

-- CreateIndex
CREATE INDEX "UserLocation_user_id_idx" ON "public"."UserLocation"("user_id");

-- CreateIndex
CREATE INDEX "OrderItem_order_id_idx" ON "public"."OrderItem"("order_id");

-- CreateIndex
CREATE INDEX "OrderItem_product_id_idx" ON "public"."OrderItem"("product_id");

-- CreateIndex
CREATE UNIQUE INDEX "PendingCheckout_reference_key" ON "public"."PendingCheckout"("reference");

-- CreateIndex
CREATE INDEX "PendingCheckout_reference_idx" ON "public"."PendingCheckout"("reference");

-- CreateIndex
CREATE INDEX "PendingCheckout_user_id_idx" ON "public"."PendingCheckout"("user_id");

-- CreateIndex
CREATE INDEX "PendingCheckout_expires_at_idx" ON "public"."PendingCheckout"("expires_at");

-- CreateIndex
CREATE INDEX "GroupMember_groupId_idx" ON "public"."GroupMember"("groupId");

-- CreateIndex
CREATE INDEX "GroupMember_userId_idx" ON "public"."GroupMember"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "GroupMember_userId_groupId_key" ON "public"."GroupMember"("userId", "groupId");

-- CreateIndex
CREATE UNIQUE INDEX "UserBlock_block_id_key" ON "public"."UserBlock"("block_id");

-- CreateIndex
CREATE INDEX "UserBlock_blocker_id_idx" ON "public"."UserBlock"("blocker_id");

-- CreateIndex
CREATE INDEX "UserBlock_blocked_id_idx" ON "public"."UserBlock"("blocked_id");

-- CreateIndex
CREATE UNIQUE INDEX "UserBlock_blocker_id_blocked_id_key" ON "public"."UserBlock"("blocker_id", "blocked_id");

-- CreateIndex
CREATE INDEX "AutomatedMessage_user_id_idx" ON "public"."AutomatedMessage"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "AutomatedMessage_user_id_message_type_key" ON "public"."AutomatedMessage"("user_id", "message_type");

-- CreateIndex
CREATE INDEX "GroupMessageRead_messageId_idx" ON "public"."GroupMessageRead"("messageId");

-- CreateIndex
CREATE INDEX "GroupMessageRead_userId_idx" ON "public"."GroupMessageRead"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "GroupMessageRead_messageId_userId_key" ON "public"."GroupMessageRead"("messageId", "userId");

-- CreateIndex
CREATE INDEX "GroupJoinRequest_groupId_idx" ON "public"."GroupJoinRequest"("groupId");

-- CreateIndex
CREATE INDEX "GroupJoinRequest_userId_idx" ON "public"."GroupJoinRequest"("userId");

-- CreateIndex
CREATE INDEX "GroupJoinRequest_status_idx" ON "public"."GroupJoinRequest"("status");

-- CreateIndex
CREATE UNIQUE INDEX "GroupJoinRequest_groupId_userId_key" ON "public"."GroupJoinRequest"("groupId", "userId");

-- CreateIndex
CREATE INDEX "GroupInvitation_groupId_idx" ON "public"."GroupInvitation"("groupId");

-- CreateIndex
CREATE INDEX "GroupInvitation_inviterId_idx" ON "public"."GroupInvitation"("inviterId");

-- CreateIndex
CREATE INDEX "GroupInvitation_inviteeId_idx" ON "public"."GroupInvitation"("inviteeId");

-- CreateIndex
CREATE INDEX "GroupInvitation_status_idx" ON "public"."GroupInvitation"("status");

-- CreateIndex
CREATE UNIQUE INDEX "GroupInvitation_groupId_inviteeId_key" ON "public"."GroupInvitation"("groupId", "inviteeId");

-- CreateIndex
CREATE INDEX "BlockedGroupParticipant_groupId_idx" ON "public"."BlockedGroupParticipant"("groupId");

-- CreateIndex
CREATE UNIQUE INDEX "BlockedGroupParticipant_userId_groupId_key" ON "public"."BlockedGroupParticipant"("userId", "groupId");

-- CreateIndex
CREATE UNIQUE INDEX "GroupSettings_groupId_key" ON "public"."GroupSettings"("groupId");

-- CreateIndex
CREATE INDEX "Groups_adminId_idx" ON "public"."Groups"("adminId");

-- CreateIndex
CREATE INDEX "Groups_groupType_idx" ON "public"."Groups"("groupType");

-- CreateIndex
CREATE INDEX "Order_user_id_idx" ON "public"."Order"("user_id");

-- CreateIndex
CREATE INDEX "Order_status_idx" ON "public"."Order"("status");

-- CreateIndex
CREATE INDEX "Order_payment_reference_idx" ON "public"."Order"("payment_reference");

-- CreateIndex
CREATE INDEX "PostComment_created_at_idx" ON "public"."PostComment"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "StoryMedia_media_id_key" ON "public"."StoryMedia"("media_id");

-- CreateIndex
CREATE UNIQUE INDEX "UserStory_story_id_key" ON "public"."UserStory"("story_id");

-- AddForeignKey
ALTER TABLE "public"."StoryView" ADD CONSTRAINT "StoryView_story_media_id_fkey" FOREIGN KEY ("story_media_id") REFERENCES "public"."StoryMedia"("media_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."StoryView" ADD CONSTRAINT "StoryView_userStoryId_fkey" FOREIGN KEY ("userStoryId") REFERENCES "public"."UserStory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."StoryView" ADD CONSTRAINT "StoryView_viewer_id_fkey" FOREIGN KEY ("viewer_id") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ProfileView" ADD CONSTRAINT "ProfileView_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ProfileView" ADD CONSTRAINT "ProfileView_viewer_id_fkey" FOREIGN KEY ("viewer_id") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CommentView" ADD CONSTRAINT "CommentView_comment_id_fkey" FOREIGN KEY ("comment_id") REFERENCES "public"."PostComment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CommentView" ADD CONSTRAINT "CommentView_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."UserLocation" ADD CONSTRAINT "UserLocation_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."OrderItem" ADD CONSTRAINT "OrderItem_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."Order"("order_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."OrderItem" ADD CONSTRAINT "OrderItem_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."Product"("product_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."OrderItem" ADD CONSTRAINT "OrderItem_size_id_fkey" FOREIGN KEY ("size_id") REFERENCES "public"."ProductSize"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PendingCheckout" ADD CONSTRAINT "PendingCheckout_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."GroupMessage" ADD CONSTRAINT "GroupMessage_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "public"."Groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."GroupMessage" ADD CONSTRAINT "GroupMessage_replyToId_fkey" FOREIGN KEY ("replyToId") REFERENCES "public"."GroupMessage"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."GroupAttachment" ADD CONSTRAINT "GroupAttachment_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "public"."GroupMessage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Groups" ADD CONSTRAINT "Groups_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."GroupSettings" ADD CONSTRAINT "GroupSettings_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "public"."Groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."BlockedGroupParticipant" ADD CONSTRAINT "BlockedGroupParticipant_blockedBy_fkey" FOREIGN KEY ("blockedBy") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."BlockedGroupParticipant" ADD CONSTRAINT "BlockedGroupParticipant_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "public"."Groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."BlockedGroupParticipant" ADD CONSTRAINT "BlockedGroupParticipant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."GroupMember" ADD CONSTRAINT "GroupMember_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "public"."Groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."GroupMember" ADD CONSTRAINT "GroupMember_mutedBy_fkey" FOREIGN KEY ("mutedBy") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."GroupMember" ADD CONSTRAINT "GroupMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."UserBlock" ADD CONSTRAINT "UserBlock_blocked_id_fkey" FOREIGN KEY ("blocked_id") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."UserBlock" ADD CONSTRAINT "UserBlock_blocker_id_fkey" FOREIGN KEY ("blocker_id") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AutomatedMessage" ADD CONSTRAINT "AutomatedMessage_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."GroupMessageRead" ADD CONSTRAINT "GroupMessageRead_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "public"."GroupMessage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."GroupMessageRead" ADD CONSTRAINT "GroupMessageRead_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."GroupJoinRequest" ADD CONSTRAINT "GroupJoinRequest_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "public"."Groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."GroupJoinRequest" ADD CONSTRAINT "GroupJoinRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."GroupInvitation" ADD CONSTRAINT "GroupInvitation_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "public"."Groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."GroupInvitation" ADD CONSTRAINT "GroupInvitation_inviterId_fkey" FOREIGN KEY ("inviterId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."GroupInvitation" ADD CONSTRAINT "GroupInvitation_inviteeId_fkey" FOREIGN KEY ("inviteeId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
