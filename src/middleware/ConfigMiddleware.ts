import {Request, Response, NextFunction} from "express";
import ConfigService from "@services/ConfigService";

const defaultConfig = {
    id: 1, // use 1 or whatever your default id is
    app_name: 'Your App Name',
    app_version: '1.0.0',
    app_description: 'Your app description',
    app_logo: '/logo.png',
    app_url: 'https://yourapp.com',
    default_currency: 'USD',
    default_rate: 1.0,
    default_symbol: '$',
    point_conversion_rate: 100,
    point_conversion_rate_ngn: 120,
    min_withdrawal_amount: 10,
    min_withdrawal_amount_ngn: 5000,
    min_deposit_amount: 5,
    min_deposit_amount_ngn: 2500,
    default_mode: 'light',
    primary_color: '#1976d2',
    secondary_color: '#424242',
    accent_color: '#82B1FF',
    home_feed_limit: 10,
    personal_profile_limit: 10,
    personal_media_limit: 10,
    personal_repost_limit: 10,
    post_page_comment_limit: 10,
    post_page_comment_reply_limit: 10,
    other_user_profile_limit: 10,
    other_user_media_limit: 10,
    other_user_repost_limit: 10,
    notification_limit: 10,
    transaction_limit: 10,
    model_search_limit: 10,
    conversation_limit: 10,
    message_limit: 10,
    group_message_limit: 10,
    group_participant_limit: 10,
    group_limit: 10,
    hookup_enabled: true,
    hookup_page_limit: 10,
    status_limit: 10,
    subscription_limit: 10,
    subscribers_limit: 10,
    active_subscribers_limit: 10,
    followers_limit: 10,
    upload_media_limit: 10,
    model_upload_media_limit: 10,
    profile_updated_success_message: 'Profile updated successfully.',
    profile_updated_error_message: 'Failed to update profile.',
    profile_updating_message: 'Updating profile...',
    profile_image_updated_success_message: 'Profile image updated successfully.',
    profile_image_updated_error_message: 'Failed to update profile image.',
    profile_image_updating_message: 'Updating profile image...',
    point_purchase_success_message: 'Points purchased successfully.',
    point_purchase_error_message: 'Failed to purchase points.',
    point_purchasing_message: 'Purchasing points...',
    point_purchase_minimum_message: 'Minimum point purchase not met.',
}

async function ConfigMiddleware(req: Request, _: Response, next: NextFunction) {
    try {
        if (!req.config) {
            const config = await ConfigService.Config()
            req.config = config.data ?? undefined

            if (process.env.NODE_ENV !== 'production') {
                console.log("Configuration Loaded")
            }
        } else {
            // Default configuration if no config exists
            req.config = defaultConfig
            if (process.env.NODE_ENV !== 'production') {
                console.log("Default Configuration Loaded")
            }
        }

        next();
    } catch (error) {
        console.error("Error loading configuration:", error)
        next(error)  // Pass the error to the next error handler
    }
}


export default ConfigMiddleware