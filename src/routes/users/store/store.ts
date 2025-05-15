import StoreController from "@controllers/StoreController"
import express from "express"
const store = express.Router()

store.get("/products", StoreController.GetProducts)
store.get("/product/:product_id", StoreController.GetSingleProduct)


export default store
