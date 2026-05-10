import { betterAuth } from "better-auth";
import { organization, admin } from "better-auth/plugins";
import { env } from "./config.js";
import { emailService } from "./lib/email.js";
import { pool, query } from "./lib/db.js";

export const auth = betterAuth({
  database: pool,
  emailAndPassword: {
    enabled: true,
    // Password reset token expires after 7 days (in seconds)
    resetPasswordTokenExpiresIn: 60 * 60 * 24 * 7,
    async sendResetPassword({ user, url }) {
      const templateRes = await query("SELECT * FROM email_templates WHERE id = 'password-reset'");
      const template = templateRes.rows[0];
      
      const subject = template?.subject || "Reset your password";
      const text = emailService.renderTemplate(template?.body_text || "Click the link to reset your password: {{url}}", { url, user });
      const html = emailService.renderTemplate(template?.body_html || "<p>Click the link to reset your password: <a href=\"{{url}}\">{{url}}</a></p>", { url, user });

      await emailService.sendEmail({
        to: user.email,
        subject,
        text,
        html,
      });
    },
  },
  plugins: [
    organization({
        // Standard organization plugin
    }),
    admin(),
  ],
  user: {
      fields: {
          role: "role",
      }
  } as any,
  secret: env.BETTER_AUTH_SECRET,
  baseURL: env.BETTER_AUTH_URL,
});
