import express from "express";
import Auth from "@middleware/auth";
import SubscriberController from "@controllers/SubscriberController";
import SubscriptionTierController from "@controllers/SubscriptionTierController";

const subscribers = express.Router();

subscribers.post("/check", Auth, SubscriberController.CheckSubscriber)
subscribers.post("/subscription-data/:userId", Auth, SubscriberController.GetSubscriptionData)
subscribers.post("/subscription-to-user/:profileid", Auth, SubscriberController.CreateNewSubscription);
subscribers.post("/create/subscription-tiers", Auth, SubscriptionTierController.CreateSubscriptionTier);
subscribers.get("/subscriptions/:userId", Auth, SubscriptionTierController.FetchUserSubscription);

export default subscribers;
