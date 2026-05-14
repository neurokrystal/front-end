import { betterAuth } from "better-auth";
import { organization, admin } from "better-auth/plugins";
import { env } from "@/infrastructure/config";
import { pool } from "@/infrastructure/database/connection";

export const auth = betterAuth({
  database: pool,
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    // Password reset token expires after 7 days (in seconds)
    resetPasswordTokenExpiresIn: 60 * 60 * 24 * 7,
    async sendResetPassword({ user, url }) {
      // Note: This logic will eventually move to a dedicated auth service or remain here
      // For now, keeping it simple as it's better-auth specific
      // We'll need access to the email service which will be in the container
      // However, better-auth config is often static.
      // One way is to import the container or the services directly if they are singletons (which we avoid).
      // Or just re-implement the minimal logic here for now.
      console.log(`[AUTH] Sending reset password email to ${user.email}: ${url}`);
    },
  },
  plugins: [
    organization({
        // Standard organization plugin
    }),
    admin(),
  ],
  user: {
      modelName: "user",
      fields: {
          role: "role",
          emailVerified: "email_verified",
          createdAt: "created_at",
          updatedAt: "updated_at",
          banned: "banned",
          banReason: "ban_reason",
          banExpires: "ban_expires",
      }
  },
  session: {
      modelName: "session",
      fields: {
          userId: "user_id",
          expiresAt: "expires_at",
          ipAddress: "ip_address",
          userAgent: "user_agent",
          createdAt: "created_at",
          updatedAt: "updated_at",
      },
      cookieCache: {
        enabled: true,
        maxAge: 5 * 60, // 5 minutes cache
      },
      expiresIn: 60 * 60 * 24 * 7, // 7 days
      updateAge: 60 * 60 * 24, // 1 day
  },
  account: {
      modelName: "account",
      fields: {
          userId: "user_id",
          accountId: "account_id",
          providerId: "provider_id",
          password: "password",
          accessToken: "access_token",
          refreshToken: "refresh_token",
          idToken: "id_token",
          expiresAt: "expires_at",
          passwordExpiresAt: "password_expires_at",
          scope: "scope",
          createdAt: "created_at",
          updatedAt: "updated_at",
      }
  },
  verification: {
      modelName: "verification",
      fields: {
          expiresAt: "expires_at",
          createdAt: "created_at",
          updatedAt: "updated_at",
      }
  },
  secret: env.BETTER_AUTH_SECRET,
  baseURL: env.BETTER_AUTH_URL,
  trustedOrigins: env.CORS_ORIGIN.split(',').map(o => o.trim()),
  advanced: {
    cookiePrefix: "dimensional",
    cookies: {
      session_token: {
        attributes: {
          httpOnly: true,
          secure: env.NODE_ENV === "production",
          sameSite: "lax",
        },
      },
    },
  },
});
