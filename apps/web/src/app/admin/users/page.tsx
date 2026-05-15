"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Download, Search, Gift, Eye, ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";

interface UserSummary {
  id: string;
  name: string;
  displayName: string;
  email: string;
  role: string;
  createdAt: string;
  profileType: string;
  runCount: number;
  reportCount: number;
}

export default function UserManagementPage() {
  const [users, setUsers] = useState<UserSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [page, setPage] = useState(0);
  const [compTarget, setCompTarget] = useState<UserSummary | null>(null);
  const [compReason, setCompReason] = useState("");
  const [compSubmitting, setCompSubmitting] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const limit = 50;

  useEffect(() => {
    // Fetch a larger batch for client-side filtering/pagination as suggested by requirements
    apiFetch<UserSummary[]>(`/api/v1/admin/users?limit=200&offset=0`)
      .then(setUsers)
      .finally(() => setLoading(false));
  }, []);

  const filteredUsers = users.filter(u => {
    const matchesSearch = u.email.toLowerCase().includes(search.toLowerCase()) || 
                         (u.displayName && u.displayName.toLowerCase().includes(search.toLowerCase()));
    const matchesRole = roleFilter === "all" || u.role === roleFilter;
    const matchesType = typeFilter === "all" || u.profileType === typeFilter;
    return matchesSearch && matchesRole && matchesType;
  });

  const paginatedUsers = filteredUsers.slice(page * limit, (page + 1) * limit);
  const totalPages = Math.ceil(filteredUsers.length / limit);

  const handleExport = async () => {
    try {
      const data = await apiFetch<any[]>("/api/v1/admin/users/export");
      const csv = [
        ["ID", "Email", "Name", "Role", "Profile Type", "Joined"],
        ...data.map(u => [u.id, u.email, u.displayName, u.role, u.profileType, u.createdAt])
      ].map(e => e.join(",")).join("\n");
      
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.setAttribute('hidden', '');
      a.setAttribute('href', url);
      a.setAttribute('download', 'users_export.csv');
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (error) {
      alert("Export failed");
    }
  };

  const closeCompModal = () => {
    setCompTarget(null);
    setCompReason("");
    setCompSubmitting(false);
  };

  const submitGrantComp = async () => {
    if (!compTarget) return;
    setCompSubmitting(true);
    try {
      await apiFetch("/api/v1/admin/comp-grant", {
        method: "POST",
        body: JSON.stringify({ targetUserId: compTarget.id, reason: compReason.trim() })
      });
      setToast({ type: 'success', message: `Complimentary access granted to ${compTarget.displayName || compTarget.email}` });
      closeCompModal();
    } catch (error) {
      setToast({ type: 'error', message: "Failed to grant complimentary access" });
      setCompSubmitting(false);
    }
  };

  const RoleBadge = ({ role }: { role: string }) => {
    const styles: Record<string, string> = {
      super_admin: "bg-violet-50 text-violet-700 border-violet-100",
      platform_admin: "bg-blue-50 text-blue-700 border-blue-100",
      user: "bg-slate-50 text-slate-600 border-slate-200",
    };
    return (
      <Badge variant="outline" className={`capitalize font-semibold ${styles[role] || styles.user}`}>
        {role.replace('_', ' ')}
      </Badge>
    );
  };

  const TypeBadge = ({ type }: { type: string }) => {
    const styles: Record<string, { label: string, classes: string }> = {
      full: { label: "Full", classes: "bg-emerald-50 text-emerald-700 border-emerald-100" },
      viewer: { label: "Viewer", classes: "bg-amber-50 text-amber-700 border-amber-100" },
      none: { label: "No Profile", classes: "bg-slate-50 text-slate-400 border-slate-200" },
    };
    const config = styles[type] || styles.none;
    return (
      <Badge variant="outline" className={`font-semibold ${config.classes}`}>
        {config.label}
      </Badge>
    );
  };

  if (loading) return <div className="p-8 text-center text-slate-500 font-sans">Loading users...</div>;

  return (
    <div className="space-y-6 font-sans">
      <div className="flex justify-between items-center">
        <div>
           <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">User Management</h1>
           <p className="text-sm text-slate-500 mt-1">Showing {paginatedUsers.length} of {filteredUsers.length} users</p>
        </div>
        <Button onClick={handleExport} variant="outline" className="shadow-sm">
          <Download className="mr-2 h-4 w-4" /> Export CSV
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search users..."
            className="pl-9 bg-white border-slate-200"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
          />
        </div>
        <select 
          className="w-full h-10 px-3 py-2 bg-white border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          value={roleFilter}
          onChange={(e) => { setRoleFilter(e.target.value); setPage(0); }}
        >
          <option value="all">All Roles</option>
          <option value="super_admin">Super Admin</option>
          <option value="platform_admin">Platform Admin</option>
          <option value="user">User</option>
        </select>
        <select 
          className="w-full h-10 px-3 py-2 bg-white border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          value={typeFilter}
          onChange={(e) => { setTypeFilter(e.target.value); setPage(0); }}
        >
          <option value="all">All Types</option>
          <option value="full">Full Profile</option>
          <option value="viewer">Viewer</option>
          <option value="none">No Profile</option>
        </select>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/50">
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">User</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Role</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Profile Type</th>
                <th className="px-6 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">Assessments</th>
                <th className="px-6 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">Reports</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Joined</th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {paginatedUsers.map((user) => (
                <tr key={user.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="text-sm font-semibold text-slate-900">{user.displayName}</div>
                    <div className="text-xs text-slate-500">{user.email}</div>
                  </td>
                  <td className="px-6 py-4">
                    <RoleBadge role={user.role} />
                  </td>
                  <td className="px-6 py-4">
                    <TypeBadge type={user.profileType} />
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className="text-sm font-medium text-slate-700">{user.runCount}</span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className="text-sm font-medium text-slate-700">{user.reportCount}</span>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-500">
                    {new Date(user.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <Button asChild variant="ghost" size="sm" className="text-slate-600 hover:text-blue-600 hover:bg-blue-50 font-medium">
                        <Link href={`/admin/users/${user.id}`}>
                          <Eye className="h-4 w-4 mr-1" /> View Details
                        </Link>
                      </Button>
                      <button
                        onClick={() => setCompTarget(user)}
                        className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                        title="Grant complimentary access"
                        aria-label={`Grant complimentary access to ${user.displayName || user.email}`}
                      >
                        <Gift className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {paginatedUsers.length === 0 && (
                <tr>
                   <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                      No users found matching your filters.
                   </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
           <p className="text-sm text-slate-500">Page {page + 1} of {totalPages}</p>
           <div className="flex gap-2">
             <Button 
               variant="outline" 
               size="sm" 
               onClick={() => setPage(p => Math.max(0, p - 1))}
               disabled={page === 0}
             >
               <ChevronLeft className="h-4 w-4 mr-1" /> Previous
             </Button>
             <Button 
               variant="outline" 
               size="sm" 
               onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
               disabled={page === totalPages - 1}
             >
               Next <ChevronRight className="h-4 w-4 ml-1" />
             </Button>
           </div>
        </div>
      )}
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

      {/* Grant Comp Modal */}
      {compTarget && (
        <div className="fixed inset-0 z-40 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/30" onClick={closeCompModal} />
          <div className="relative z-50 w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100">
              <h3 className="text-lg font-semibold text-slate-900">Grant Complimentary Access</h3>
            </div>
            <div className="px-6 py-4 space-y-4">
              <p className="text-sm text-slate-600">This will give the following user free access to take the assessment:</p>
              <div className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 bg-slate-50">
                <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-semibold">
                  {(compTarget.displayName || compTarget.email).slice(0,1).toUpperCase()}
                </div>
                <div>
                  <div className="text-sm font-semibold text-slate-900">{compTarget.displayName || compTarget.name}</div>
                  <div className="text-xs text-slate-500">{compTarget.email}</div>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500">Reason (required)</label>
                <textarea
                  className="w-full min-h-[88px] p-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  value={compReason}
                  onChange={(e) => setCompReason(e.target.value)}
                  placeholder="Explain why you are granting complimentary access..."
                />
                <div className={`text-xs ${compReason.trim().length >= 10 ? 'text-slate-400' : 'text-red-600'}`}>
                  {compReason.trim().length}/10 characters
                </div>
              </div>

              <p className="text-xs text-slate-500">This action is audit-logged.</p>
            </div>
            <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-2 bg-slate-50/50">
              <Button variant="outline" onClick={closeCompModal} className="border-slate-200">Cancel</Button>
              <Button
                onClick={submitGrantComp}
                disabled={compSubmitting || compReason.trim().length < 10}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {compSubmitting ? 'Granting...' : 'Grant Access'}
              </Button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
