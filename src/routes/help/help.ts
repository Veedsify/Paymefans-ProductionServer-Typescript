import exporess from "express";
const help = exporess.Router();
import HelpController from "@controllers/HelpController"

help.get("/categories", HelpController.GetHelpCategories)

export default help
