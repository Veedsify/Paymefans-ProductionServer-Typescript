import { PrismaClient } from "@prisma/client";
import { CreateHashedPassword } from "../libs/HashPassword";
import { currencyRates } from "./currency-rates";
import { pointSeeding } from "./seeders/createPoints";
import { GenerateUniqueId } from "./GenerateUniqueId";
const { SERVER_ORIGINAL_URL } = process.env;

const prisma = new PrismaClient();
const uniqueUserId = Math.random().toString(36).substring(2, 15);

async function main() {
  const password = await CreateHashedPassword("password");
  await prisma.user.upsert({
    where: { email: "admin@paymefans.com" },
    update: {},
    create: {
      email: "admin@paymefans.com",
      fullname: "Paymefans",
      name: "Paymefans",
      password,
      admin: true,
      phone: "1234567890",
      location: "Nigeria",
      role: "admin",
      profile_image: SERVER_ORIGINAL_URL + "/site/avatar.png",
      user_id: "paymefans",
      username: "@paymefans",
      flags: JSON.stringify([
        "view_profile",
        "edit_profile",
        "change_password",
        "enable_two_factor_auth",
        "view_notifications",
        "manage_notifications",
        "view_messages",
        "send_messages",
        "view_posts",
        "create_posts",
        "edit_posts",
        "delete_posts",
        "like_posts",
        "comment_on_posts",
        "share_posts",
        "follow_users",
        "block_users",
        "report_content",
        "delete_accounts",
        "view_sensitive_content",
        "manage_users",
        "view_user_data",
        "bulk_user_operations",
        "impersonate_users",
        "export_user_data",
        "manage_content",
        "view_reports",
        "manage_reports",
        "manage_content_moderation",
        "override_content_restrictions",
        "manage_creator_verification",
        "manage_billing",
        "override_payment_verification",
        "configure_payment_methods",
        "manage_subscription_tiers",
        "access_financial_reports",
        "manage_tax_settings",
        "view_analytics",
        "access_audit_logs",
        "access_system_monitoring",
        "manage_settings",
        "manage_features",
        "manage_platform_notifications",
        "configure_security_policies",
        "manage_api_access",
        "override_rate_limits",
        "manage_backup_restore",
        "configure_cdn_settings",
        "manage_third_party_integrations",
        "manage_maintenance_mode",
        "view_tickets",
        "create_tickets",
        "edit_tickets",
        "delete_tickets",
        "assign_tickets",
        "resolve_tickets",
        "escalate_tickets",
        "view_ticket_history",
        "manage_ticket_categories",
        "access_support_reports",
        "manage_support_settings",
        "send_free_messages",
        "view_paid_posts",
        "view_paid_media",
      ]),
      UserWallet: {
        create: {
          wallet_id: uniqueUserId,
          balance: 0,
        },
      },
      UserPoints: {
        create: {
          conversion_rate: 0,
          points: 0,
        },
      },
      Settings: {
        create: {
          price_per_message: 0,
          enable_free_message: true,
          subscription_price: 0,
          subscription_duration: "1 Month",
          subscription_type: "free",
        },
      },
    },
  });

  await prisma.platformExchangeRate.createMany({
    data: currencyRates.map((rate) => ({
      buyValue: rate.buy,
      sellValue: rate.sell,
      rate: rate.rate,
      name: rate.currency,
      symbol: rate.symbol,
    })),
    skipDuplicates: true,
  });

  for (let point of pointSeeding) {
    await prisma.globalPointsBuy.create({
      data: {
        points_buy_id: point.id,
        points: point.points,
        amount: point.amount,
        currency: point.currency,
        conversion_rate: point.conversion_rate,
      },
    });
  }

  await prisma.outerPages.createMany({
    data: [
      {
        title: "Privacy Policy",
        page_id: GenerateUniqueId(),
        slug: "privacy-policy",
        content: "privacy_policy",
      },
      {
        title: "Terms and Conditions",
        page_id: GenerateUniqueId(),
        slug: "terms-and-conditions",
        content: "terms_and_conditions",
      },
    ],
    skipDuplicates: true,
  });

  await prisma.configurations.upsert({
    where: { id: 1 },
    update: {
      app_name: "Paymefans",
      app_version: "1.0.0",
      app_description:
        "Paymefans is a social media platform that connects models and fans.",
      app_logo: "https://api.paymefans.com/site/logo.png",
      app_url: "https://yourapp.com",
      // Currency Settings
      default_currency: "NGN",
      default_rate: 1632.0,
      default_symbol: "₦",
      // Point Conversion Settings
      point_conversion_rate: 1,
      point_conversion_rate_ngn: 100,
      // Withdrawal Settings
      min_withdrawal_amount: 500,
      min_withdrawal_amount_ngn: 50000,
      // Deposit Settings
      min_deposit_amount: 25,
      min_deposit_amount_ngn: 2500,
      // Theme Settings
      default_mode: "light",
      primary_color: "#1976d2",
      secondary_color: "#424242",
      accent_color: "#82B1FF",
      // Pagination Settings
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
      // Model Search Settings
      model_search_limit: 10,
      // Messaging Settings
      conversation_limit: 10,
      message_limit: 10,
      // Group Settings
      group_message_limit: 10,
      group_participant_limit: 10,
      group_limit: 10,
      // Hookup Settings
      hookup_enabled: true,
      hookup_page_limit: 10,
      // Status Settings
      status_limit: 10,
      // Subscription Settings
      subscription_limit: 10,
      subscribers_limit: 10,
      active_subscribers_limit: 10,
      // Follower Settings
      followers_limit: 10,
      // User Media Settings
      upload_media_limit: 10,
      // Model Media Settings
      model_upload_media_limit: 10,
      // Success/Error Messages
      profile_updated_success_message: "Profile updated successfully.",
      profile_updated_error_message: "Failed to update profile.",
      profile_updating_message: "Updating profile...",
      profile_image_updated_success_message:
        "Profile image updated successfully.",
      profile_image_updated_error_message: "Failed to update profile image.",
      profile_image_updating_message: "Updating profile image...",
      point_purchase_success_message: "Points purchased successfully.",
      point_purchase_error_message: "Failed to purchase points.",
      point_purchasing_message: "Purchasing points...",
      point_purchase_minimum_message: "Minimum point purchase not met.",
    },
    create: {
      id: 1, // use 1 or whatever your default id is
      app_name: "Paymefans",
      app_version: "1.0.0",
      app_description:
        "Paymefans is a social media platform that connects models and fans.",
      app_logo: "https://api.paymefans.com/site/logo.png",
      app_url: "https://yourapp.com",
      // Currency Settings
      default_currency: "NGN",
      default_rate: 1632.0,
      default_symbol: "₦",
      // Point Conversion Settings
      point_conversion_rate: 1,
      point_conversion_rate_ngn: 100,
      // Withdrawal Settings
      min_withdrawal_amount: 500,
      min_withdrawal_amount_ngn: 50000,
      // Deposit Settings
      min_deposit_amount: 25,
      min_deposit_amount_ngn: 2500,
      // Theme Settings
      default_mode: "light",
      primary_color: "#1976d2",
      secondary_color: "#424242",
      accent_color: "#82B1FF",
      // Pagination Settings
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
      // Model Search Settings
      model_search_limit: 10,
      // Messaging Settings
      conversation_limit: 10,
      message_limit: 10,
      // Group Settings
      group_message_limit: 10,
      group_participant_limit: 10,
      group_limit: 10,
      // Hookup Settings
      hookup_enabled: true,
      hookup_page_limit: 10,
      // Status Settings
      status_limit: 10,
      // Subscription Settings
      subscription_limit: 10,
      subscribers_limit: 10,
      active_subscribers_limit: 10,
      // Follower Settings
      followers_limit: 10,
      // User Media Settings
      upload_media_limit: 10,
      // Model Media Settings
      model_upload_media_limit: 10,
      // Success/Error Messages
      profile_updated_success_message: "Profile updated successfully.",
      profile_updated_error_message: "Failed to update profile.",
      profile_updating_message: "Updating profile...",
      profile_image_updated_success_message:
        "Profile image updated successfully.",
      profile_image_updated_error_message: "Failed to update profile image.",
      profile_image_updating_message: "Updating profile image...",
      point_purchase_success_message: "Points purchased successfully.",
      point_purchase_error_message: "Failed to purchase points.",
      point_purchasing_message: "Purchasing points...",
      point_purchase_minimum_message: "Minimum point purchase not met.",
    },
  });
}

main()
  .catch((e) => {
    throw e;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
