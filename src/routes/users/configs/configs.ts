import ConfigController from "@controllers/ConfigController";
import { Router } from "express";
const configs = Router();

configs.get("/", ConfigController.Config);

export default configs;