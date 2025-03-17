import express from "express"
import Auth from "@middleware/auth";
import StoryController from "@controllers/StoryController";

const story = express()

story.get("/all", Auth, StoryController.GetStories);

export default story
