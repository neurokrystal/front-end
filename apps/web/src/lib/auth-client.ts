import { createAuthClient } from "better-auth/react";
import { organizationClient, adminClient } from "better-auth/client/plugins";
import { env } from "../config";

export const authClient = createAuthClient({
  baseURL: env.NEXT_PUBLIC_API_URL,
  plugins: [
      organizationClient(),
      adminClient(),
  ]
});

export const { signIn, signUp, useSession, organization, admin, signOut } = authClient;
