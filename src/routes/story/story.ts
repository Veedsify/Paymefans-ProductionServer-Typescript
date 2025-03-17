import express from "express"
import Auth from "@middleware/auth";
import { CreateUpload } from "@middleware/FileUploadConfig";
import StoryController from "@controllers/StoryController";

const story = express()

const storyUpload = CreateUpload("story");

story.get("/all", Auth, StoryController.GetStories);

export default story
