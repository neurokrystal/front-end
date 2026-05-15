import { betterAuth } from "better-auth";
import { organization, admin } from "better-auth/plugins";
import { env } from "@/infrastructure/config";
import { pool } from "@/infrastructure/database/connection";

// H2: Provide a pluggable reset email sender (configured from container/index)
let _sendResetEmail: ((to: string, url: string) => Promise<void>) | null = null;
export function setResetEmailSender(fn: (to: string, url: string) => Promise<void>) {
  _sendResetEmail = fn;
}

export const auth = betterAuth({
  database: pool,
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    // H1: Reduce password reset token lifetime to 1 hour (in seconds)
    resetPasswordTokenExpiresIn: 60 * 60,
    async sendResetPassword({ user, url }) {
      // H2: Delegate to configured email sender (no console logging of reset tokens)
      if (_sendResetEmail) {
        await _sendResetEmail(user.email, url);
      }
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
        // Proactively refresh the cookie cache shortly before the session expires
        // to minimize chances of users seeing an expired token during navigation.
        refreshCache: {
          // When ~10 minutes remain before expiry, refresh the cached cookie
          updateAge: 10 * 60,
        },
      },
      // Session lifetime: 1 hour
      expiresIn: 60 * 60,
      // Refresh session on use when it's getting close to expiry (~50 minutes since last refresh)
      updateAge: 50 * 60,
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
