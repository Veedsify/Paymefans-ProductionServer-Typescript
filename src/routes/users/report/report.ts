import express from "express";
import ReportController from "@controllers/ReportController";
import Auth from "@middleware/Auth";

const report = express.Router();

// Report user
report.post("/user", Auth, ReportController.reportUser);

export default report;