import { authClient } from "@/lib/auth-client";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { data: session } = await authClient.getSession({
    fetchOptions: { headers: await headers() },
  });

  if (session?.user.role !== "platform_admin") {
    redirect("/");
  }

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <div className="w-64 bg-slate-900 text-white flex flex-col">
        <div className="p-6">
          <h2 className="text-xl font-bold">Admin Panel</h2>
        </div>
        <nav className="flex-1 px-4 space-y-2">
          <Link href="/admin/dashboard" className="block px-4 py-2 hover:bg-slate-800 rounded">
            Dashboard
          </Link>
          <Link href="/admin/email-templates" className="block px-4 py-2 hover:bg-slate-800 rounded">
            Email Templates
          </Link>
          <Link href="/admin/assets" className="block px-4 py-2 hover:bg-slate-800 rounded">
            Assets
          </Link>
        </nav>
        <div className="p-4 border-t border-slate-800">
           <Link href="/" className="block px-4 py-2 text-sm text-slate-400 hover:text-white">
            Back to App
          </Link>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 overflow-auto bg-slate-50 p-8">
        {children}
      </main>
    </div>
  );
}
