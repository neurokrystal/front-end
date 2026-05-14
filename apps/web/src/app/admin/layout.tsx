import { authClient } from "@/lib/auth-client";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { AdminLayoutShell } from "@/components/admin/admin-layout-shell";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { data: session } = await authClient.getSession({
    fetchOptions: { headers: await headers() },
  });

  if (session?.user.role !== "platform_admin") {
    redirect("/");
  }

  const user = {
    name: session.user.name || "Admin",
    role: session.user.role,
    email: session.user.email,
  };

  return (
    <AdminLayoutShell user={user}>
      {children}
    </AdminLayoutShell>
  );
}
