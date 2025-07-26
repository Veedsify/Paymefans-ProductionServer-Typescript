-- CreateEnum
CREATE TYPE "AutomatedMessageType" AS ENUM ('followers', 'subscribers');

-- CreateTable
CREATE TABLE "AutomatedMessage" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "message_type" "AutomatedMessageType" NOT NULL,
    "message_text" TEXT,
    "attachments" JSONB DEFAULT '[]',
    "is_active" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AutomatedMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AutomatedMessage_user_id_idx" ON "AutomatedMessage"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "AutomatedMessage_user_id_message_type_key" ON "AutomatedMessage"("user_id", "message_type");

-- AddForeignKey
ALTER TABLE "AutomatedMessage" ADD CONSTRAINT "AutomatedMessage_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;