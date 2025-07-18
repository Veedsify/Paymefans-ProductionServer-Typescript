import express from "express";
import Auth from "@middleware/Auth";
import AnalyticsController from "@controllers/AnalyticsController";

const analytics = express.Router();

// Analytics routes
analytics.get("/account-growth/:timeRange", Auth, AnalyticsController.GetAccountGrowth);
analytics.get("/engagement/:timeRange", Auth, AnalyticsController.GetEngagement);
analytics.get("/audience", Auth, AnalyticsController.GetAudience);
analytics.get("/recent-posts/:timeRange", Auth, AnalyticsController.GetRecentPosts);
analytics.get("/metrics/:timeRange", Auth, AnalyticsController.GetMetrics);

export default analytics;