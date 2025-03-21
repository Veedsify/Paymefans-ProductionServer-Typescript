import ModelController from "@controllers/ModelController";
import Auth from "@middleware/auth";
import express from "express";
const model = express.Router();


model.post("/all", Auth, ModelController.GetModels);
model.get("/search-models", Auth, ModelController.ModelsSearch);
model.post("/hookups", Auth, ModelController.GetModelAvailableForHookup);
model.post("/signup", Auth, ModelController.SignupModel);
// model.get("/callback/signup", ModelController.ValidateModelPayment);

export default model
