import ModelController from "@controllers/ModelController";
import Auth from "@middleware/Auth";
import express from "express";
const model = express.Router();


model.post("/all", Auth, ModelController.GetModels);
model.get("/search-models", Auth, ModelController.ModelsSearch);
model.post("/hookups", Auth, ModelController.GetModelAvailableForHookup);
// model.post("/initilize-model-payment", Auth, ModelController.InitilizeModelPayment);
model.post("/signup", Auth, ModelController.SignupModel);
model.post("/validate-model-payment", Auth, ModelController.ValidateModelPayment);

export default model
