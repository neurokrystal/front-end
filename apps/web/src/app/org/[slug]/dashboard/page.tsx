import { authClient } from "@/lib/auth-client";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

export default async function OrgDashboard({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { data: session } = await authClient.getSession({
    fetchOptions: { headers: await headers() },
  });

  if (!session) redirect("/login");

  const { data: org } = await authClient.organization.getFullOrganization({
    query: { organizationSlug: slug },
    fetchOptions: { headers: await headers() },
  });

  if (!org) redirect("/");

  return (
    <div className="flex flex-col items-center justify-center h-screen space-y-4">
      <h1 className="text-3xl font-bold">Organization Dashboard</h1>
      <p className="text-xl">Organization: <span className="font-semibold">{org.name}</span></p>
      <p className="text-muted-foreground">Welcome back to your organization's workspace.</p>
    </div>
  );
}
