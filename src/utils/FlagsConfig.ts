import { JsonValue } from "@prisma/client/runtime/library";

// Permission definitions
const Permissions = {
  // User Management
  DELETE_ACCOUNTS: "delete_accounts",
  VIEW_SENSITIVE_CONTENT: "view_sensitive_content",
  MANAGE_USERS: "manage_users",
  VIEW_USER_DATA: "view_user_data",
  BULK_USER_OPERATIONS: "bulk_user_operations",
  IMPERSONATE_USERS: "impersonate_users",
  EXPORT_USER_DATA: "export_user_data",

  // Content Management
  MANAGE_CONTENT: "manage_content",
  VIEW_REPORTS: "view_reports",
  MANAGE_REPORTS: "manage_reports",
  MANAGE_CONTENT_MODERATION: "manage_content_moderation",
  OVERRIDE_CONTENT_RESTRICTIONS: "override_content_restrictions",

  // Billing & Payments
  MANAGE_BILLING: "manage_billing",
  OVERRIDE_PAYMENT_VERIFICATION: "override_payment_verification",
  CONFIGURE_PAYMENT_METHODS: "configure_payment_methods",
  MANAGE_SUBSCRIPTION_TIERS: "manage_subscription_tiers",
  ACCESS_FINANCIAL_REPORTS: "access_financial_reports",
  MANAGE_TAX_SETTINGS: "manage_tax_settings",

  // Analytics & Monitoring
  VIEW_ANALYTICS: "view_analytics",
  ACCESS_AUDIT_LOGS: "access_audit_logs",
  ACCESS_SYSTEM_MONITORING: "access_system_monitoring",

  // Platform Settings
  MANAGE_SETTINGS: "manage_settings",
  MANAGE_FEATURES: "manage_features",
  MANAGE_PLATFORM_NOTIFICATIONS: "manage_platform_notifications",
  CONFIGURE_SECURITY_POLICIES: "configure_security_policies",
  MANAGE_API_ACCESS: "manage_api_access",
  OVERRIDE_RATE_LIMITS: "override_rate_limits",

  // System Operations
  MANAGE_BACKUP_RESTORE: "manage_backup_restore",
  CONFIGURE_CDN_SETTINGS: "configure_cdn_settings",
  MANAGE_THIRD_PARTY_INTEGRATIONS: "manage_third_party_integrations",
  MANAGE_MAINTENANCE_MODE: "manage_maintenance_mode",

  // Creator Features
  MANAGE_CREATOR_VERIFICATION: "manage_creator_verification",
  SEND_FREE_MESSAGES: "send_free_messages",
  VIEW_PAID_POSTS: "view_paid_posts",
  VIEW_PAID_MEDIA: "view_paid_media",

  // Basic User Actions
  VIEW_PROFILE: "view_profile",
  EDIT_PROFILE: "edit_profile",
  CHANGE_PASSWORD: "change_password",
  ENABLE_TWO_FACTOR_AUTH: "enable_two_factor_auth",
  DISABLE_TWO_FACTOR_AUTH: "disable_two_factor_auth",
  VIEW_NOTIFICATIONS: "view_notifications",
  MANAGE_NOTIFICATIONS: "manage_notifications",
  VIEW_MESSAGES: "view_messages",
  SEND_MESSAGES: "send_messages",
  VIEW_POSTS: "view_posts",
  CREATE_POSTS: "create_posts",
  EDIT_POSTS: "edit_posts",
  DELETE_POSTS: "delete_posts",
  LIKE_POSTS: "like_posts",
  COMMENT_ON_POSTS: "comment_on_posts",
  SHARE_POSTS: "share_posts",
  VIEW_FOLLOWERS: "view_followers",
  FOLLOW_USERS: "follow_users",
  UNFOLLOW_USERS: "unfollow_users",
  BLOCK_USERS: "block_users",
  REPORT_CONTENT: "report_content",

  // Support System
  VIEW_TICKETS: "view_tickets",
  CREATE_TICKETS: "create_tickets",
  EDIT_TICKETS: "edit_tickets",
  DELETE_TICKETS: "delete_tickets",
  ASSIGN_TICKETS: "assign_tickets",
  RESOLVE_TICKETS: "resolve_tickets",
  ESCALATE_TICKETS: "escalate_tickets",
  VIEW_TICKET_HISTORY: "view_ticket_history",
  MANAGE_TICKET_CATEGORIES: "manage_ticket_categories",
  ACCESS_SUPPORT_REPORTS: "access_support_reports",
  MANAGE_SUPPORT_SETTINGS: "manage_support_settings",
} as const;

// Role definitions with permissions
const Roles = {
  ADMIN: {
    name: "admin",
    permissions: [
      Permissions.DELETE_ACCOUNTS,
      Permissions.VIEW_SENSITIVE_CONTENT,
      Permissions.MANAGE_USERS,
      Permissions.VIEW_USER_DATA,
      Permissions.MANAGE_CONTENT,
      Permissions.VIEW_REPORTS,
      Permissions.MANAGE_REPORTS,
      Permissions.MANAGE_BILLING,
      Permissions.VIEW_ANALYTICS,
      Permissions.MANAGE_SETTINGS,
      Permissions.MANAGE_FEATURES,
      Permissions.SEND_FREE_MESSAGES,
      Permissions.VIEW_PAID_POSTS,
      Permissions.VIEW_PAID_MEDIA,
      Permissions.BULK_USER_OPERATIONS,
      Permissions.IMPERSONATE_USERS,
      Permissions.OVERRIDE_PAYMENT_VERIFICATION,
      Permissions.MANAGE_CREATOR_VERIFICATION,
      Permissions.ACCESS_AUDIT_LOGS,
      Permissions.EXPORT_USER_DATA,
      Permissions.MANAGE_CONTENT_MODERATION,
      Permissions.CONFIGURE_PAYMENT_METHODS,
      Permissions.MANAGE_SUBSCRIPTION_TIERS,
      Permissions.OVERRIDE_CONTENT_RESTRICTIONS,
      Permissions.MANAGE_PLATFORM_NOTIFICATIONS,
      Permissions.ACCESS_FINANCIAL_REPORTS,
      Permissions.MANAGE_TAX_SETTINGS,
      Permissions.CONFIGURE_SECURITY_POLICIES,
      Permissions.MANAGE_API_ACCESS,
      Permissions.OVERRIDE_RATE_LIMITS,
      Permissions.MANAGE_BACKUP_RESTORE,
      Permissions.CONFIGURE_CDN_SETTINGS,
      Permissions.MANAGE_THIRD_PARTY_INTEGRATIONS,
      Permissions.ACCESS_SYSTEM_MONITORING,
      Permissions.MANAGE_MAINTENANCE_MODE,
    ],
  },
  USER: {
    name: "user",
    permissions: [
      Permissions.VIEW_PROFILE,
      Permissions.EDIT_PROFILE,
      Permissions.CHANGE_PASSWORD,
      Permissions.ENABLE_TWO_FACTOR_AUTH,
      Permissions.DISABLE_TWO_FACTOR_AUTH,
      Permissions.VIEW_NOTIFICATIONS,
      Permissions.MANAGE_NOTIFICATIONS,
      Permissions.VIEW_MESSAGES,
      Permissions.SEND_MESSAGES,
      Permissions.VIEW_POSTS,
      Permissions.CREATE_POSTS,
      Permissions.EDIT_POSTS,
      Permissions.DELETE_POSTS,
      Permissions.LIKE_POSTS,
      Permissions.COMMENT_ON_POSTS,
      Permissions.SHARE_POSTS,
      Permissions.VIEW_FOLLOWERS,
      Permissions.FOLLOW_USERS,
      Permissions.UNFOLLOW_USERS,
      Permissions.BLOCK_USERS,
      Permissions.REPORT_CONTENT,
    ],
  },
  SUPPORT: {
    name: "support",
    permissions: [
      Permissions.VIEW_TICKETS,
      Permissions.CREATE_TICKETS,
      Permissions.EDIT_TICKETS,
      Permissions.DELETE_TICKETS,
      Permissions.ASSIGN_TICKETS,
      Permissions.RESOLVE_TICKETS,
      Permissions.ESCALATE_TICKETS,
      Permissions.VIEW_TICKET_HISTORY,
      Permissions.MANAGE_TICKET_CATEGORIES,
      Permissions.VIEW_USER_DATA,
      Permissions.ACCESS_SUPPORT_REPORTS,
      Permissions.MANAGE_SUPPORT_SETTINGS,
    ],
  },
} as const;

// Types for better type safety

// RBAC utility functions
export class RBAC {
  static hasPermission(userRoles: string[], permission:string): boolean {
    return userRoles.some((role) => {
      const roleConfig = Object.values(Roles).find((r) => r.name === role);
      return roleConfig?.permissions.includes(permission) || false;
    });
  }

  static hasAnyPermission(userRoles: string[], permissions: string[]): boolean {
    return permissions.some((permission:string) =>
      this.hasPermission(userRoles, permission),
    );
  }

  static hasAllPermissions(
    userRoles: string[],
    permissions: string[],
  ): boolean {
    return permissions.every((permission) =>
      this.hasPermission(userRoles, permission),
    );
  }

  static getRolePermissions(roleName: string): readonly string[] {
    const role = Object.values(Roles).find((r) => r.name === roleName);
    return role?.permissions || [];
  }
  static checkUserFlag(
    flags: JsonValue | string[] | undefined,
    flag: string,
  ): boolean {
    return !!(Array.isArray(flags) && flags?.find((fl) => fl === flag));
  }
}

export { Permissions, Roles };
