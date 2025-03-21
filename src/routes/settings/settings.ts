import SettingsController from "@controllers/SettingsController";
import Auth from "@middleware/auth";
import express from "express";
const settings = express.Router();

settings.post("/update", Auth, SettingsController.SettingsProfileChange);
settings.post("/update/hookup-status", Auth, SettingsController.HookupStatusChange);
settings.patch("/update/password", Auth, SettingsController.ChangePassword);
settings.post("/billings/message-price", Auth, SettingsController.SetMessagePrice);

export default settings;
