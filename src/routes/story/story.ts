import express from "express"
import Auth from "@middleware/auth";
import StoryController from "@controllers/StoryController";
import { CreateUpload } from "@middleware/FileUploadConfig";

const story = express()

const storyUpload = CreateUpload("stories")

story.get("/all", Auth, StoryController.GetStories);
story.get("/media", Auth, StoryController.GetMyMedia)
story.post("/save", Auth, StoryController.SaveStory)
story.post("/upload", Auth, storyUpload.array("files[]"), StoryController.UploadStory)
export default story
