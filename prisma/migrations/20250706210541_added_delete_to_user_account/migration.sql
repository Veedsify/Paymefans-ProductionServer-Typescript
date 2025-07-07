-- AlterTable
ALTER TABLE "User" ADD COLUMN     "delete_date" TIMESTAMP(3),
ADD COLUMN     "should_delete" BOOLEAN NOT NULL DEFAULT false;
