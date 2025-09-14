import express from "express";
import Auth from "@middleware/Auth";
import StoryController from "@controllers/StoryController";
import multer from "multer";
import multerS3 from "multer-s3";
import { s3 } from "@utils/aws";
import { config } from "@configs/config";
import { v4 as uuid } from "uuid";

const story = express();

const storyUpload = multer({
  storage: multerS3({
    s3: s3,
    bucket: (_req, _, cb) => {
      cb(null, config.mainPaymefansBucket!);
    },
    key: function (_req, file, cb) {
      const uniqueSuffix = uuid();
      const ext = file.originalname.split(".").pop();
      if (file.mimetype.startsWith("video/")) {
        cb(null, `process/${uniqueSuffix}.${ext}`);
      } else if (file.mimetype.startsWith("image/")) {
        cb(null, `stories/${uniqueSuffix}.${ext}`);
      } else {
        return cb(
          new Error("Invalid file type. Only images and videos are allowed."),
        );
      }
    },
    contentType: multerS3.AUTO_CONTENT_TYPE,
  }),
  limits: { fileSize: 7 * 1024 * 1024 * 1024 },
  fileFilter: (_, file, cb) => {
    if (
      file.mimetype.startsWith("image/") ||
      file.mimetype.startsWith("video/")
    ) {
      cb(null, true);
    } else {
      cb(new Error("Invalid file type. Only images and videos are allowed."));
    }
  },
});

story.get("/all", Auth, StoryController.GetStories);
story.get("/media", Auth, StoryController.GetMyMedia);
story.post("/save", Auth, StoryController.SaveStory);
story.post(
  "/upload",
  Auth,
  storyUpload.array("files[]"),
  StoryController.UploadStory,
);
story.post("/view", Auth, StoryController.ViewStory);
story.get("/views/:storyMediaId", Auth, StoryController.GetStoryViews);
export default story;
