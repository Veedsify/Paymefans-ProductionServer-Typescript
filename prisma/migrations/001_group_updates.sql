-- Migration: Group Updates and Feature Enhancements
-- 1. Remove maxMembers from Groups table
-- 2. Add deliveryStatus to GroupMessage
-- 3. Add isBlocked to GroupMember
-- 4. Add welcome message fields to Configurations
-- 5. Add isSystemMessage to Messages

-- Remove maxMembers column from Groups table
ALTER TABLE "Groups" DROP COLUMN IF EXISTS "maxMembers";

-- Add deliveryStatus column to GroupMessage table
ALTER TABLE "GroupMessage" ADD COLUMN IF NOT EXISTS "deliveryStatus" TEXT DEFAULT 'sent';

-- Add index for deliveryStatus for better query performance
CREATE INDEX IF NOT EXISTS "GroupMessage_deliveryStatus_idx" ON "GroupMessage"("deliveryStatus");

-- Add isBlocked column to GroupMember table if it doesn't exist
ALTER TABLE "GroupMember" ADD COLUMN IF NOT EXISTS "isBlocked" BOOLEAN DEFAULT false;

-- Add index for isBlocked for better query performance
CREATE INDEX IF NOT EXISTS "GroupMember_isBlocked_idx" ON "GroupMember"("isBlocked");

-- Update GroupSettings to use autoApproveMembers instead of autoApproveJoinReqs
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='GroupSettings' AND column_name='autoApproveJoinReqs') THEN
        ALTER TABLE "GroupSettings" RENAME COLUMN "autoApproveJoinReqs" TO "autoApproveMembers";
    END IF;
END $$;

-- Add welcome message fields to Configurations table
ALTER TABLE "Configurations" ADD COLUMN IF NOT EXISTS "welcome_message_title" TEXT;
ALTER TABLE "Configurations" ADD COLUMN IF NOT EXISTS "welcome_message_content" TEXT;
ALTER TABLE "Configurations" ADD COLUMN IF NOT EXISTS "welcome_message_enabled" BOOLEAN DEFAULT true;
ALTER TABLE "Configurations" ADD COLUMN IF NOT EXISTS "welcome_message_delay" TEXT DEFAULT '300';

-- Add isSystemMessage field to Messages table
ALTER TABLE "Messages" ADD COLUMN IF NOT EXISTS "isSystemMessage" BOOLEAN DEFAULT false;

-- Add index for system messages for better query performance
CREATE INDEX IF NOT EXISTS "Messages_isSystemMessage_idx" ON "Messages"("isSystemMessage");

-- Add message fields aliases for compatibility (the existing 'message' field serves as content)
-- No need to add content/messageType as we use 'message' field directly

-- Update existing welcome configurations with default values
INSERT INTO "Configurations" (
    app_name, app_version, app_url, app_description, app_logo,
    default_currency, default_rate, default_symbol,
    point_conversion_rate, point_conversion_rate_ngn,
    min_withdrawal_amount, min_withdrawal_amount_ngn,
    min_deposit_amount, min_deposit_amount_ngn,
    platform_deposit_fee, platform_withdrawal_fee,
    welcome_message_title, welcome_message_content, welcome_message_enabled, welcome_message_delay
)
SELECT
    'PayMeFans', '1.0.0', 'http://localhost:3000', 'Social platform', '',
    'USD', 1.0, '$',
    1.0, 1000.0,
    10.0, 5000.0,
    5.0, 1000.0,
    0.1, 0.25,
    'Welcome to PayMeFans!',
    'Thank you for joining our platform! We''re excited to have you here. Feel free to explore and connect with others.',
    true, '300'
WHERE NOT EXISTS (SELECT 1 FROM "Configurations" LIMIT 1);

-- Create welcome user for automated messages if it doesn't exist
INSERT INTO "User" (
    user_id, username, name, email, password, phone, location,
    email_verified, phone_verified, role, created_at, updated_at
)
SELECT
    'welcome_' || EXTRACT(EPOCH FROM NOW())::TEXT,
    '@welcome',
    'Welcome Bot',
    'welcome@paymefans.com',
    '$2b$10$dummy.hash.for.system.user.only.no.login.allowed',
    '+0000000000',
    'System',
    true,
    true,
    'ADMIN',
    NOW(),
    NOW()
WHERE NOT EXISTS (SELECT 1 FROM "User" WHERE username = '@welcome');
