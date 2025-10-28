import { PrismaClient } from "@prisma/client";
import { CreateHashedPassword } from "../libs/HashPassword";
import { currencyRates } from "./currency-rates";
import { pointSeeding } from "./seeders/createPoints";
import { GenerateUniqueId } from "./GenerateUniqueId";
import { configurations } from "./seeders/configuration";
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
      name: "Paymefans",
      password,
      admin: true,
      phone: "1234567890",
      is_model: true,
      location: "Nigeria",
      role: "admin",
      is_verified: true,
      profile_image: SERVER_ORIGINAL_URL + "/site/avatar.png",
      user_id: "paymefans",
      username: "@paymefans",
      watermarkEnabled: true,
      flags: [
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
      ],
      Model: {
        create: {
          verification_status: true,
          verification_state: "approved",
          country: "Nigeria",
          dob: new Date("01-10-1990"),
          gender: "Male",
          firstname: "Paymefans",
          lastname: "Admin",
          hookup: false,
        }
      },
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
  await prisma.user.upsert({
    where: { email: "welcome@paymefans.com" },
    update: {},
    create: {
      email: "welcome@paymefans.com",
      name: "Welcome To Paymefans",
      password,
      admin: true,
      phone: "1234567892",
      location: "Nigeria",
      is_verified: true,
      role: "admin",
      profile_image: SERVER_ORIGINAL_URL + "/site/avatar.png",
      user_id: "welcome",
      username: "@welcome",
      flags: ["profile_hidden"],
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
  await prisma.user.upsert({
    where: { email: "technical@paymefans.com" },
    update: {},
    create: {
      email: "technical@paymefans.com",
      name: "Technical Support",
      password,
      admin: true,
      phone: "1234567891",
      location: "Nigeria",
      role: "admin",
      is_verified: true,
      profile_image: SERVER_ORIGINAL_URL + "/site/avatar.png",
      user_id: "technical",
      username: "@technical",
      flags: ["profile_hidden"],
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
        content: `<div class="keep-styles">
        <p><strong>Last updated:</strong> October 2025</p>
    
        <h2>Introduction</h2>
        <p>
            Media Setroom Limited ("we", "us", "our") prioritizes your privacy and is dedicated to safeguarding the personal information you entrust to us. 
            Media Setroom Limited is the owner and operator of <strong>Paymefans</strong> (<a href="https://www.paymefans.com">www.paymefans.com</a>), 
            a social networking and content sharing platform. We empower:
        </p>
    
        <ul>
            <li>Creators to share, monetize, and discover content from other creators</li>
            <li>Fans to subscribe, view, and support their favorite creators</li>
            <li>A community where content creators connect, collaborate, and inspire each other</li>
            <li>A networking hub for content creators to meet, share ideas, and grow together</li>
            <li>A platform where content creators come together to share experiences, learn from each other, and build meaningful relationships</li>
            <li>A space for content creators to connect, support, and empower one another</li>
        </ul>
    
        <p>
            This privacy policy ("Policy") outlines our commitment to protecting the personal data of our valued creators and fans, 
            ensuring transparency and trust in our community.
        </p>
    
        <h2>Overview</h2>
        <p>
            This Privacy Policy explains how we collect, use, disclose, and protect your personal information when you use our Site and services. 
            Please read this Policy carefully to understand our practices regarding your personal information.
        </p>
    
        <h2>Acceptance</h2>
        <p>
            By accessing or using the Site, you agree to this Policy and consent to our collection, use, disclosure, retention, 
            and protection of your information as described in this Policy.
        </p>
    
        <h2>Revisions</h2>
        <p>
            We reserve the right to revise, amend, or modify this Policy at any time. Changes will be effective immediately upon posting. 
            We encourage you to periodically review this Policy for updates.
        </p>
    
        <h2>Age Restrictions</h2>
        <p>
            You must be at least eighteen (18) years old to use the Services. 
            We do not knowingly collect or solicit information from individuals under the age of eighteen (18). 
            If you are under eighteen (18), please do not submit information to us and immediately leave the Site.
        </p>
    
        <h2>Reporting Underage Users</h2>
        <p>
            If you believe we have collected information from or about a person under eighteen (18), 
            please contact us at <a href="mailto:info@paymefans.com">info@paymefans.com</a>. 
            We will delete such information as quickly as possible.
        </p>
    
        <h2>What Information Do We Collect About You?</h2>
        <p>
            We may collect various types of personal information from and about users of the Site. 
            This information can personally identify you, be linked to you, or be associated with your household. 
            Examples of personal information we may collect include:
        </p>
    
        <ul>
            <li>Name</li>
            <li>Username or unique personal identifier</li>
            <li>Password</li>
            <li>Email address</li>
            <li>Telephone number</li>
            <li>Government-issued identification numbers (e.g., driver's license, passport)</li>
        </ul>
    
        <p>
            This information may be collected through various means, such as when you register for an account, 
            use the Site's services, or interact with our customer support team.
        </p>
    
        <h2>How Do We Collect Your Personal Information?</h2>
        <p>We collect your personal information directly from you through various interactions, including:</p>
        <ul>
            <li>Account registration process</li>
            <li>Profile information and posts</li>
            <li>Purchases and financial transactions</li>
            <li>Search queries</li>
            <li>Linked social media accounts</li>
            <li>Survey responses</li>
            <li>Communications and interactions with us via:
                <ul>
                    <li>Contact forms</li>
                    <li>Phone</li>
                    <li>Email</li>
                    <li>Text</li>
                    <li>Social media platforms</li>
                </ul>
            </li>
        </ul>
    
        <p>
            By providing this information, you consent to our collection and use of your personal information as described in this Policy.
        </p>
    
        <h2>How Do We Use Your Personal Information?</h2>
        <p>We may use your personal information for the following purposes:</p>
    
        <ol>
            <li>Service Provision: To provide access to the Site and Services.</li>
            <li>Convenience: To streamline the Services, such as auto-updating account information.</li>
            <li>Personalization: To recognize you, tailor the Services to your preferences, and show individualized content.</li>
            <li>Notifications: To inform you about changes to the Services, policies, and terms.</li>
            <li>Contract Enforcement: To fulfill obligations, enforce rights, and resolve disputes related to contracts, including this Policy and our Terms of Service.</li>
            <li>Analytics: To monitor traffic, analyze usage trends, and improve the Services.</li>
            <li>Security: To verify the integrity and security of the Services.</li>
            <li>Customer Service: To provide support and resolve issues.</li>
            <li>Investigations: To investigate and prevent unauthorized or prohibited uses of the Services.</li>
            <li>Marketing: For marketing or advertising purposes.</li>
            <li>Other Purposes: For any other purpose with your explicit consent.</li>
        </ol>
    
        <p>
            By using the Services, you acknowledge and agree to our use of your personal information for these purposes.
        </p>
    
        <h2>Data Security</h2>
        <p>We prioritize data security and have implemented robust measures to protect your personal information from:</p>
        <ul>
            <li>Accidental loss</li>
            <li>Unauthorized access</li>
            <li>Use</li>
            <li>Modification</li>
            <li>Disclosure</li>
        </ul>
    
        <p>
            Your information is stored on our secure servers, protected by firewalls. However, please be aware that:
        </p>
    
        <ul>
            <li>Internet transmissions are not completely secure</li>
            <li>We cannot guarantee the security of your personal information transmitted through the Site</li>
        </ul>
    
        <p>
            By using our Site, you acknowledge and agree that:
        </p>
    
        <ul>
            <li>You transmit personal information at your own risk</li>
            <li>We are not responsible for breaches of privacy settings or security measures</li>
        </ul>
    
        <p>
            We strive to protect your personal information, but we recommend taking precautions when sharing sensitive information online.
        </p>
    
        <h2>No Third-Party Rights</h2>
        <p>This Policy does not:</p>
        <ul>
            <li>Create rights that can be enforced by third parties</li>
            <li>Require us to disclose personal information about users of the Services</li>
        </ul>
    
        <p>
            In other words, this Policy is between you and us, and does not provide any rights or benefits to third parties.
        </p>
    
        <h2>Changes to This Privacy Notice</h2>
        <p>
            We may update this Privacy Notice at any time, without prior notice. When changes are made:
        </p>
        <ul>
            <li>We will post the updated notice on the Site</li>
            <li>We will update the notice's effective date</li>
        </ul>
    
        <p>
            By continuing to use our Site after changes are posted, you acknowledge and agree to the updated terms. 
            Your continued use constitutes acceptance of the changes.
        </p>
    
        <h2>Support Information</h2>
        <p>
            We're committed to providing a seamless and enjoyable experience on our platform. 
            If you encounter any issues, have questions, or concerns, please don't hesitate to reach out to us.
        </p>
        <p>
            Our dedicated support team is here to help. You can contact us directly at:<br>
            <a href="mailto:support@paymefans.com">support@paymefans.com</a>
        </p>
    
        <h2>Payment Support Information</h2>
        <p>
            We're committed to ensuring a smooth and secure payment experience on our platform. 
            If you encounter any issues related to:
        </p>
    
        <ul>
            <li>Payments</li>
            <li>Withdrawals</li>
            <li>Adding funds</li>
            <li>Purchasing points</li>
        </ul>
    
        <p>
            Please reach out to our dedicated payment support team at:<br>
            <a href="mailto:payments@paymefans.com">payments@paymefans.com</a>
        </p>
    
        <p>
            We'll promptly assist you in resolving any payment-related issues, ensuring your experience with us remains seamless.
        </p>
    
        <h2>Zero Tolerance for Child Sexual Abuse Material</h2>
        <p>
            At Paymefans, we take the safety and well-being of all individuals, especially children, extremely seriously. 
            We have a zero-tolerance policy towards child sexual abuse material (CSAM) on our platform.
        </p>
        <p>
            If you encounter any content that promotes, depicts, or encourages child sexual abuse, 
            please report it to us immediately at <a href="mailto:info@paymefans.com">info@paymefans.com</a>.
        </p>
    
        <p>When reporting, please provide:</p>
        <ul>
            <li>Date and time of discovery</li>
            <li>Evidence of the incident (screenshot, URL, etc.)</li>
        </ul>
    
        <p>
            We'll promptly investigate and take decisive action, including:
        </p>
    
        <ul>
            <li>Removing the offending content</li>
            <li>Blocking the user account responsible</li>
            <li>Reporting the incident to relevant authorities</li>
        </ul>
    
        <p>
            Your vigilance and cooperation are crucial in helping us maintain a safe and respectful community. 
            Together, we can prevent the spread of harmful content and protect vulnerable individuals.
        </p>
    
        <p>Thank you for your support.</p>
    
        <h2>Contact Information</h2>
        <p>
            <a href="mailto:support@paymefans.com">support@paymefans.com</a><br>
            <a href="mailto:payments@paymefans.com">payments@paymefans.com</a><br>
            <a href="mailto:info@paymefans.com">info@paymefans.com</a>
        </p>
    </div>
    `,
      },
      {
        title: "Terms and Conditions",
        page_id: GenerateUniqueId(),
        slug: "terms-and-conditions",
        content: `<div class="outer-pages">
        <p>By accessing Paymefans, you agree to:</p>
        <ol>
            <li>Comply with our Terms and Conditions and all applicable laws.</li>
            <li>Provide accurate and truthful information.</li>
            <li>Respect the intellectual property rights of others.</li>
            <li>Refrain from engaging in prohibited activities.</li>
        </ol>

        <h2>Consequences of Non-Compliance</h2>
        <p>Failure to comply with our Terms and Conditions may result in:</p>
        <ol>
            <li>Termination of access.</li>
            <li>Legal action.</li>
            <li>Disclosure of information to authorities.</li>
        </ol>
        <p>By accessing Paymefans, you acknowledge that you have read, understood, and agree to these terms.</p>

        <h2>Selling Content and Earnings</h2>
        <p><strong>As a Creator:</strong></p>
        <p>You earn 100% of the revenue from:</p>
        <ul>
            <li>Subscriptions</li>
            <li>Sales</li>
            <li>Tips</li>
        </ul>
        <p>related to your content and profile.</p>

        <h2>Withdrawal Fees</h2>
        <p>A 25% withdrawal fee will be charged as a Paymefans Creator/Model.</p>

        <h2>Payout Requirements</h2>
        <ol>
            <li>You must add a valid payout method to receive payments.</li>
        </ol>

        <h2>Creating an Account on Paymefans</h2>
        <h3>Fans</h3>
        <p>To join Paymefans as a Fan:</p>
        <ol type="a">
            <li>Provide a valid email address, username, and password.</li>
            <li>To purchase content, use a valid payment method.</li>
        </ol>
        <p><strong>Note:</strong> Paymefans doesn't store payment information.</p>

        <h3>Creators/Models</h3>
        <p>To join Paymefans as a Creator/Model:</p>
        <ol type="a">
            <li>Complete the Creator registration process.</li>
            <li>Wait for approval from the Company.</li>
            <li>To sell content, add a verified bank account or approved payment method.</li>
            <li>Earnings will be paid via a payout processor or direct bank payment.</li>
        </ol>
        <p><strong>Note:</strong> Paymefans doesn't store bank account information, except for direct bank payments, which are stored by third-party payout processors.</p>

        <h2>Age Restriction</h2>
        <p>Paymefans features adult content and is strictly off-limits to minors. To access our platform, you must:</p>
        <ol type="a">
            <li>Be at least 18 years old and</li>
            <li>Have reached the age of majority in your country or region.</li>
        </ol>
        <p>If you don't meet these requirements, please leave immediately. We strictly prohibit anyone under the required age from accessing Paymefans.</p>

        <h2>Zero Tolerance for Child Sexual Abuse Material</h2>
        <p>We strictly prohibit any content that promotes or depicts child sexual abuse or exploitation. This includes any visual media, real or simulated, that shows minors engaging in sexual activity.</p>
        <h3>Reporting Incidents</h3>
        <p>If you encounter any such content on Paymefans, please report it to us immediately at <a href="mailto:info@paymefans.com">info@paymefans.com</a>. Include:</p>
        <ul>
            <li>Date and time of discovery</li>
            <li>Evidence of the incident</li>
        </ul>
        <p>We'll promptly investigate and take decisive action, including:</p>
        <ul>
            <li>Removing the content</li>
            <li>Blocking the responsible accounts</li>
        </ul>
        <p>We fully cooperate with law enforcement agencies to ensure the safety and well-being of all individuals.</p>

        <h2>Company Rights and Reservations</h2>
        <p>We reserve the right to:</p>
        <ul>
            <li>Modify, suspend, or terminate Paymefans or any part of it without notice</li>
            <li>Restrict, limit, suspend, or terminate your access to Paymefans</li>
            <li>Verify your information and compliance with these Terms and applicable laws</li>
            <li>Suspend or terminate your account for non-compliance</li>
            <li>Delete non-compliant content</li>
            <li>Monitor your use of Paymefans</li>
            <li>Investigate suspected misuse and cooperate with law enforcement</li>
            <li>Disclose information about your use of Paymefans in connection with law enforcement investigations</li>
            <li>Change payment or payout processors</li>
        </ul>

        <h2>Certifications for Users</h2>
        <p>By registering on Paymefans, you:</p>
        <ol type="a">
            <li><strong>Certify accuracy:</strong> Ensure all account registration, profile information, and content you provide is your own information and it’s accurate, truthful, and comprehensive</li>
            <li><strong>Accept responsibility:</strong> Acknowledge full responsibility for all activities on your account.</li>
            <li><strong>Agree to secure usage:</strong>
                <ul>
                    <li>Log out at the end of each session.</li>
                    <li>Exercise caution when accessing your account from public/shared computers.</li>
                    <li>Keep login details confidential and secure.</li>
                </ul>
            </li>
            <li><strong>Notify us of security breaches:</strong> Inform us immediately if you suspect unauthorized access or a security breach.</li>
        </ol>

        <h2>Cancelling Subscriptions</h2>
        <p>As a Fan, you can cancel any subscription at any time by:</p>
        <ol type="a">
            <li>Going to the relevant Creator's profile.</li>
            <li>Cancel the subscription indicator.</li>
        </ol>
        <h3>Cancellation Terms</h3>
        <ul>
            <li>No refunds will be issued for cancelled subscriptions.</li>
            <li>You'll retain access to the Creator's content until the end of the current billing period.</li>
            <li>After cancellation, you won't be re-billed.</li>
        </ul>

        <h3>Blocking Another User</h3>
        <ul>
            <li>If you block another User, you'll immediately lose access to their content.</li>
            <li>No refunds or credits will be issued for remaining days in your subscription period.</li>
        </ul>

        <h2>Inactive Account Policy</h2>
        <p>If you don't log into your Paymefans account for 12 consecutive months, that’s 1 year, it will be considered "inactive."</p>
        <h3>Inactive Account Fees</h3>
        <ul>
            <li>A monthly fee of ₦10,000 will be deducted from your account balance until it reaches zero.</li>
            <li>We won't charge your credit card for these fees, even if your balance is zero.</li>
        </ul>
        <h3>Reactivating Your Account</h3>
        <ul>
            <li>Logging in will stop the monthly deductions.</li>
            <li>No refunds will be issued for previous deductions.</li>
        </ul>
        <h3>Notifications</h3>
        <p>We'll send updates and notices to your registered email address.</p>

        <h2>Contact Us</h2>
        <p>For any:</p>
        <ul>
            <li>Feedback</li>
            <li>Complaints</li>
            <li>Comments</li>
            <li>Technical support requests</li>
            <li>Other Paymefans-related inquiries</li>
        </ul>
        <p>Please email us at: <a href="mailto:supports@paymefans.com">supports@paymefans.com</a></p>
    </div>`,
      },
      {
        title: "About Us",
        page_id: GenerateUniqueId(),
        slug: "about-us",
        content: `<div class="keep-styles">
        <h2>Welcome to Paymefans</h2>
        <p>
            We're a community-driven platform that empowers creators to monetize their content and connect with their fans. 
            Our mission is to provide a safe, secure, and innovative space for creators to share their exclusive content, 
            and for fans to support the talent they love.
        </p>
    
        <h2>Our Story</h2>
        <p>
            We believe that everyone has a unique story to tell and a talent to share. 
            Our platform is designed to help creators take control of their content, build their brand, 
            and earn money doing what they love. Whether you're a photographer, artist, writer, skit maker, or performer, 
            we're here to support you every step of the way.
        </p>
    
        <h2>What We Offer</h2>
        <ul>
            <li><strong>Monetize Your Content:</strong> Take control of your content and earn money from your most loyal fans.</li>
            <li><strong>Connect with Your Fans:</strong> Build a community around your work and share exclusive content that resonates with your audience.</li>
            <li><strong>Creative Freedom:</strong> Share your work without compromise, and decide what you want to create and share.</li>
            <li><strong>Safe and Secure:</strong> Our platform is designed with safety and security in mind, so you can focus on creating.</li>
        </ul>
    
        <h2>Join Our Community</h2>
        <p>
            Whether you're a creator looking to monetize your content, or a fan looking to support your favorite talent, 
            we invite you to join our community. Sign up today and discover a world of exclusive content, creativity, and connection.
        </p>
    </div>
    `,
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
      app_url: "https://paymefans.com",
      //Platform Fees
      platform_withdrawal_fee: configurations.find(
        (config) => config.key === "platform_withdrawal_fee",
      )?.value as number,
      platform_deposit_fee: configurations.find(
        (config) => config.key === "platform_deposit_fee",
      )?.value as number,
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
      // Welcome Message Settings
      welcome_message_title: "Welcome to PayMeFans!",
      welcome_message_content:
        "Hi {username}! Welcome to PayMeFans! 🎉\n\nWe're excited to have you join our community. Here's how to get started:\n\n1. Complete your profile to attract more followers\n2. Explore and follow interesting creators\n3. Start sharing your content and connect with fans\n\nIf you need any help, feel free to reach out to our support team.\n\nEnjoy your journey on PayMeFans!\n\nBest regards,\nThe PayMeFans Team",
      welcome_message_enabled: true,
      welcome_message_delay: "300",
    },
    create: {
      id: 1, // use 1 or whatever your default id is
      app_name: "Paymefans",
      app_version: "1.0.0",
      app_description:
        "Paymefans is a social media platform that connects models and fans.",
      app_logo: "https://api.paymefans.com/site/logo.png",
      app_url: "https://paymefans.com",
      //Platform Fees
      platform_withdrawal_fee: 0.25,
      platform_deposit_fee: 0.1,
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
      // Welcome Message Settings
      welcome_message_title: "Welcome to PayMeFans!",
      welcome_message_content:
        "Hi {username}! Welcome to PayMeFans! 🎉\n\nWe're excited to have you join our community. Here's how to get started:\n\n1. Complete your profile to attract more followers\n2. Explore and follow interesting creators\n3. Start sharing your content and connect with fans\n\nIf you need any help, feel free to reach out to our support team.\n\nEnjoy your journey on PayMeFans!\n\nBest regards,\nThe PayMeFans Team",
      welcome_message_enabled: true,
      welcome_message_delay: "300",
    },
  });
}

main().catch((e) => {
  throw e;
});
