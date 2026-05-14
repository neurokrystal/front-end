"use client";

import { useEffect, useState, use } from "react";
import { apiFetch } from "@/lib/api";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { User, Shield, Key, Gift, Eye } from "lucide-react";
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
  const [showViewAsModal, setShowViewAsModal] = useState(false);
  const [viewAsReason, setViewAsReason] = useState("");
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    // In a real app we'd have a specific endpoint for user details
    // For now we'll fetch from a stub or general list and filter
    apiFetch<any[]>(`/api/v1/admin/users`)
      .then(users => {
        const u = users.find(u => u.id === id);
        if (u) setUser(u);
      })
      .finally(() => setLoading(false));
  }, [id]);

  const handleGrantComp = async () => {
    if (!user) return;
    setActionLoading(true);
    try {
      await apiFetch("/api/v1/admin/comp-grant", {
        method: "POST",
        body: JSON.stringify({ targetUserId: id, reason: "Manual grant from user detail page" })
      });
      setToast({ type: 'success', message: `Complimentary access granted to ${user.displayName || user.email}` });
    } catch (error) {
      setToast({ type: 'error', message: "Failed to grant complimentary access" });
    } finally {
      setActionLoading(false);
    }
  };

  const startViewAs = async () => {
    setActionLoading(true);
    try {
      await apiFetch("/api/v1/admin/impersonate", {
        method: "POST",
        body: JSON.stringify({ userId: id, reason: viewAsReason.trim() })
      });
      setToast({ type: 'success', message: 'View As session recorded. Full impersonation coming soon.' });
      setShowViewAsModal(false);
      setViewAsReason("");
      // Optionally open dashboard: window.open(`/dashboard?viewAs=${id}`, '_blank');
    } catch (error) {
      setToast({ type: 'error', message: 'Failed to start View As session' });
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) return <div>Loading user details...</div>;
  if (!user) return <div>User not found</div>;

  return (
    <div className="space-y-6 font-sans">
      <div className="flex justify-between items-start">
        <div className="flex items-center space-x-4">
          <div className="bg-blue-50 p-3 rounded-xl">
            <User className="h-8 w-8 text-blue-600" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">{user.displayName || "No Name"}</h1>
            <p className="text-slate-500">{user.email}</p>
          </div>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={() => router.back()} className="shadow-sm">Back</Button>
          <Button onClick={() => setShowViewAsModal(true)} disabled={actionLoading} className="shadow-sm bg-slate-800 hover:bg-slate-900 text-white">
            <Eye className="mr-2 h-4 w-4" /> View As This User
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold text-slate-900">Account Information</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-6">
              <div>
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">User ID</label>
                <div className="font-mono text-xs mt-1.5 p-2 bg-slate-50 rounded border border-slate-100 text-slate-600">{user.id}</div>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Role</label>
                <div className="mt-1.5">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold tracking-wide uppercase ${
                    user.role === 'super_admin' ? 'bg-violet-50 text-violet-700' : 'bg-slate-100 text-slate-600'
                  }`}>
                    {user.role}
                  </span>
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Joined</label>
                <div className="mt-1.5 text-sm text-slate-700">{new Date(user.createdAt).toLocaleString()}</div>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Status</label>
                <div className="mt-1.5 text-sm text-emerald-600 font-medium flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                  Active
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-red-100">
            <CardHeader>
              <CardTitle className="text-base font-semibold text-red-600">Danger Zone</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 border rounded-xl bg-red-50 border-red-100">
                <div>
                  <div className="font-semibold text-red-900">Grant Complimentary Access</div>
                  <div className="text-sm text-red-700">Give this user a free assessment credit.</div>
                </div>
                <Button variant="destructive" onClick={handleGrantComp} disabled={actionLoading} className="shadow-sm">
                  <Gift className="mr-2 h-4 w-4" /> Grant Assessment
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold text-slate-900">Security & Access</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button variant="outline" className="w-full justify-start border-slate-200 text-slate-600 font-medium shadow-sm" disabled>
                <Shield className="mr-2 h-4 w-4 text-slate-400" /> Reset Password
              </Button>
              <Button variant="outline" className="w-full justify-start border-slate-200 text-slate-600 font-medium shadow-sm" disabled>
                <Key className="mr-2 h-4 w-4 text-slate-400" /> Revoke All Sessions
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 px-4 py-2 rounded-lg shadow-lg text-sm ${
            toast.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'
          }`}
          role="status"
        >
          {toast.message}
          <button className="ml-3 opacity-80 hover:opacity-100" onClick={() => setToast(null)}>✕</button>
        </div>
      )}

      {/* View As Modal */}
      {showViewAsModal && user && (
        <div className="fixed inset-0 z-40 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/30" onClick={() => setShowViewAsModal(false)} />
          <div className="relative z-50 w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100">
              <h3 className="text-lg font-semibold text-slate-900">View As User</h3>
            </div>
            <div className="px-6 py-4 space-y-4">
              <p className="text-sm text-slate-600">You will see the platform as this user sees it. This is read-only — no actions can be taken on their behalf.</p>
              <div className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 bg-slate-50">
                <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center font-semibold">
                  {(user.displayName || user.email).slice(0,1).toUpperCase()}
                </div>
                <div>
                  <div className="text-sm font-semibold text-slate-900">{user.displayName || 'Unnamed'}</div>
                  <div className="text-xs text-slate-500">{user.email}</div>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500">Reason (required)</label>
                <textarea
                  className="w-full min-h-[88px] p-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500/20"
                  value={viewAsReason}
                  onChange={(e) => setViewAsReason(e.target.value)}
                  placeholder="Explain why you are viewing as this user..."
                />
                <div className={`text-xs ${viewAsReason.trim().length >= 10 ? 'text-slate-400' : 'text-red-600'}`}>
                  {viewAsReason.trim().length}/10 characters
                </div>
              </div>

              <p className="text-xs text-slate-500">This action is audit-logged.</p>
            </div>
            <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-2 bg-slate-50/50">
              <Button variant="outline" onClick={() => setShowViewAsModal(false)} className="border-slate-200">Cancel</Button>
              <Button
                onClick={startViewAs}
                disabled={actionLoading || viewAsReason.trim().length < 10}
                className="bg-slate-800 hover:bg-slate-900 text-white"
              >
                Start Viewing
              </Button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
