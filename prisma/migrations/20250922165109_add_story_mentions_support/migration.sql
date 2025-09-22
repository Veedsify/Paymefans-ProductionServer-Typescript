-- CreateTable
CREATE TABLE "public"."StoryMention" (
    "id" SERIAL NOT NULL,
    "story_media_id" TEXT NOT NULL,
    "mentioned_user_id" INTEGER NOT NULL,
    "mentioner_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StoryMention_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StoryMention_story_media_id_idx" ON "public"."StoryMention"("story_media_id");

-- CreateIndex
CREATE INDEX "StoryMention_mentioned_user_id_idx" ON "public"."StoryMention"("mentioned_user_id");

-- CreateIndex
CREATE INDEX "StoryMention_mentioner_id_idx" ON "public"."StoryMention"("mentioner_id");

-- CreateIndex
CREATE UNIQUE INDEX "StoryMention_story_media_id_mentioned_user_id_key" ON "public"."StoryMention"("story_media_id", "mentioned_user_id");

-- AddForeignKey
ALTER TABLE "public"."StoryMention" ADD CONSTRAINT "StoryMention_story_media_id_fkey" FOREIGN KEY ("story_media_id") REFERENCES "public"."StoryMedia"("media_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."StoryMention" ADD CONSTRAINT "StoryMention_mentioned_user_id_fkey" FOREIGN KEY ("mentioned_user_id") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."StoryMention" ADD CONSTRAINT "StoryMention_mentioner_id_fkey" FOREIGN KEY ("mentioner_id") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
