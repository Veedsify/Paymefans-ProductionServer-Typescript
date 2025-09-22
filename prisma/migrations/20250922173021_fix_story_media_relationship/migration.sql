/*
  Warnings:

  - You are about to drop the column `user_id` on the `StoryMedia` table. All the data in the column will be lost.
  - Added the required column `user_story_id` to the `StoryMedia` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "public"."StoryMedia" DROP CONSTRAINT "StoryMedia_user_id_fkey";

-- Add the new column with a temporary default
ALTER TABLE "public"."StoryMedia" ADD COLUMN "user_story_id" INTEGER;

-- Update user_story_id with the correct UserStory.id values based on matching user_id
UPDATE "public"."StoryMedia" 
SET "user_story_id" = "public"."UserStory"."id" 
FROM "public"."UserStory" 
WHERE "public"."StoryMedia"."user_id" = "public"."UserStory"."user_id";

-- Make the column required after data migration
ALTER TABLE "public"."StoryMedia" ALTER COLUMN "user_story_id" SET NOT NULL;

-- Drop the old user_id column
ALTER TABLE "public"."StoryMedia" DROP COLUMN "user_id";

-- AddForeignKey
ALTER TABLE "public"."StoryMedia" ADD CONSTRAINT "StoryMedia_user_story_id_fkey" FOREIGN KEY ("user_story_id") REFERENCES "public"."UserStory"("id") ON DELETE CASCADE ON UPDATE CASCADE;
