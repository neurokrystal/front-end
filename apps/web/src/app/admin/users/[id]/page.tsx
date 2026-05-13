"use client";

import { useEffect, useState, use } from "react";
import { apiFetch } from "@/lib/api";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { User, Shield, Key, Gift, Ghost } from "lucide-react";
import { useRouter } from "next/navigation";

interface UserDetail {
  id: string;
  email: string;
  role: string;
  createdAt: string;
  displayName: string | null;
  profile?: any;
  reports?: any[];
  purchases?: any[];
}

export default function UserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [user, setUser] = useState<UserDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    // In a real app we'd have a specific endpoint for user details
    // For now we'll fetch from a stub or general list and filter
    apiFetch<any[]>(`/admin/users`)
      .then(users => {
        const u = users.find(u => u.id === id);
        if (u) setUser(u);
      })
      .finally(() => setLoading(false));
  }, [id]);

  const handleGrantComp = async () => {
    if (!confirm("Grant a complimentary assessment to this user?")) return;
    setActionLoading(true);
    try {
      await apiFetch("/admin/comp-grant", {
        method: "POST",
        body: JSON.stringify({ userId: id, purchaseType: "individual_assessment", reason: "Admin manual grant" })
      });
      alert("Comp assessment granted successfully");
    } catch (error) {
      alert("Failed to grant comp assessment");
    } finally {
      setActionLoading(false);
    }
  };

  const handleImpersonate = async () => {
    setActionLoading(true);
    try {
      await apiFetch("/admin/impersonate", {
        method: "POST",
        body: JSON.stringify({ userId: id })
      });
      // In a real implementation this would set a session cookie or token
      alert("Impersonation started (stub)");
    } catch (error) {
      alert("Failed to start impersonation");
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) return <div>Loading user details...</div>;
  if (!user) return <div>User not found</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div className="flex items-center space-x-4">
          <div className="bg-slate-100 p-3 rounded-full">
            <User className="h-8 w-8 text-slate-600" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">{user.displayName || "No Name"}</h1>
            <p className="text-muted-foreground">{user.email}</p>
          </div>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={() => router.back()}>Back</Button>
          <Button variant="destructive" onClick={handleImpersonate} disabled={actionLoading}>
            <Ghost className="mr-2 h-4 w-4" /> Impersonate
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Account Information</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase">User ID</label>
                <div className="font-mono text-xs mt-1">{user.id}</div>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase">Role</label>
                <div className="mt-1">
                  <Badge variant={user.role === 'super_admin' ? 'default' : 'secondary'}>
                    {user.role}
                  </Badge>
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase">Joined</label>
                <div className="mt-1">{new Date(user.createdAt).toLocaleString()}</div>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase">Status</label>
                <div className="mt-1 text-green-600 font-medium">Active</div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg text-red-600">Danger Zone</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 border rounded-lg bg-red-50 border-red-100">
                <div>
                  <div className="font-semibold text-red-900">Grant Complimentary Access</div>
                  <div className="text-sm text-red-700">Give this user a free assessment credit.</div>
                </div>
                <Button variant="destructive" onClick={handleGrantComp} disabled={actionLoading}>
                  <Gift className="mr-2 h-4 w-4" /> Grant Assessment
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Security & Access</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button variant="outline" className="w-full justify-start" disabled>
                <Shield className="mr-2 h-4 w-4" /> Reset Password
              </Button>
              <Button variant="outline" className="w-full justify-start" disabled>
                <Key className="mr-2 h-4 w-4" /> Revoke All Sessions
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
