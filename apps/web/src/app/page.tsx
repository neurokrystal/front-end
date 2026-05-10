import { authClient } from "@/lib/auth-client";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

export default async function Home() {
  const { data: session } = await authClient.getSession({
    fetchOptions: {
      headers: await headers(),
    },
  });

  if (!session) {
    redirect("/login");
  }

  // RBAC Redirection Logic
  if (session.user.role === "platform_admin") {
     redirect("/admin/dashboard");
  }

  const { data: orgs } = await authClient.organization.list({
    fetchOptions: {
      headers: await headers(),
    },
  });

  if (!orgs || orgs.length === 0) {
      // Every user aside from Platform_admin must be assigned to an organisation
      redirect("/no-organization");
  }

  // Redirect to the first organization's dashboard for now
  // In a more complex app, you might have a 'last active' organization
  redirect(`/org/${orgs[0].slug}/dashboard`);
}
