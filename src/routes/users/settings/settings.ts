import SettingsController from "@controllers/SettingsController";
import Auth from "@middleware/Auth";
import express from "express";
const settings = express.Router();

settings.post("/update", Auth, SettingsController.SettingsProfileChange);
settings.post(
  "/update/hookup-status",
  Auth,
  SettingsController.HookupStatusChange,
);
settings.patch("/update/password", Auth, SettingsController.ChangePassword);
settings.post(
  "/billings/message-price",
  Auth,
  SettingsController.SetMessagePrice,
);
settings.post("/check-username", Auth, SettingsController.CheckUserName);
settings.post(
  "/update/show-active",
  Auth,
  SettingsController.UpdateShowActiveStatus,
);
export default settings;
