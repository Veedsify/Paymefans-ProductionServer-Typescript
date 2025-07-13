import SearchController from "@controllers/SearchController"
import Auth from "@middleware/Auth"
import express from "express"
const search = express.Router()

search.get("/platform", Auth, SearchController.SearchPlatform)

export default search