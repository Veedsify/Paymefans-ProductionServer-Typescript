import express from "express";
import Auth from "@middleware/Auth";
import StoryController from "@controllers/StoryController";

const story = express();

// const storyUpload = multer({
//   storage: multerS3({
//     s3: s3,
//     bucket: (_req, _, cb) => {
//       cb(null, config.mainPaymefansBucket!);
//     },
//     key: function (_req, file, cb) {
//       const uniqueSuffix = uuid();
//       const ext = file.originalname.split(".").pop();
//       if (file.mimetype.startsWith("video/")) {
//         cb(null, `process/${uniqueSuffix}.${ext}`);
//       } else if (file.mimetype.startsWith("image/")) {
//         cb(null, `stories/${uniqueSuffix}.${ext}`);
//       } else {
//         return cb(
//           new Error("Invalid file type. Only images and videos are allowed."),
//         );
//       }
//     },
//     contentType: multerS3.AUTO_CONTENT_TYPE,
//   }),
//   limits: { fileSize: 7 * 1024 * 1024 * 1024 },
//   fileFilter: (_, file, cb) => {
//     if (
//       file.mimetype.startsWith("image/") ||
//       file.mimetype.startsWith("video/")
//     ) {
//       cb(null, true);
//     } else {
//       cb(new Error("Invalid file type. Only images and videos are allowed."));
//     }
//   },
// });

// story.post(
//   "/upload",
//   Auth,
//   storyUpload.array("files[]"),
//   StoryController.UploadStory,
// );
story.get("/all", Auth, StoryController.GetStories);
story.get("/user/:username", Auth, StoryController.GetUserStories);
story.get("/media", Auth, StoryController.GetMyMedia);
story.post("/media-status", Auth, StoryController.CheckMediaStatus);
story.post("/save", Auth, StoryController.SaveStory);
story.post("/presigned-urls", Auth, StoryController.GetPresignedUrls);
story.post("/complete-upload", Auth, StoryController.CompleteUpload);
story.post("/view", Auth, StoryController.ViewStory);
story.get("/views/:storyMediaId", Auth, StoryController.GetStoryViews);
story.get("/mentions/:storyMediaId", Auth, StoryController.GetStoryMentions);
story.post("/mentions", Auth, StoryController.AddStoryMentions);
story.delete("/delete/:storyMediaId", Auth, StoryController.DeleteStory);
export default story;
