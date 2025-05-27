/*
  Warnings:

  - A unique constraint covering the columns `[user_id]` on the table `UserWallet` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "UserWallet_user_id_key" ON "UserWallet"("user_id");
