"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type TeamDetail = {
  id: string;
  name: string;
  organizationId: string;
  organizationName?: string | null;
  createdAt: string;
  members: Array<{
    userId: string;
    role: string;
    joinedAt: string;
    name: string | null;
    email: string | null;
    hasSharingGrant: boolean;
  }>;
  aggregates: { memberCount: number; sharingCount: number; stats: Record<string, number> | null };
};

export default function TeamDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id as string;
  const [team, setTeam] = useState<TeamDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [removeUserId, setRemoveUserId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  type AdminUser = { id: string; name: string | null; email: string };
  const [userQuery, setUserQuery] = useState("");
  const [userResults, setUserResults] = useState<AdminUser[]>([]);
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [role, setRole] = useState<'leader' | 'member'>('member');

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    apiFetch<TeamDetail>(`/api/v1/admin/teams/${id}`)
      .then(setTeam)
      .finally(() => setLoading(false));
  }, [id]);

  // Simple email search from admin users
  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (userQuery.trim().length < 2) {
        setUserResults([]);
        return;
      }
      const users = await apiFetch<AdminUser[]>(`/api/v1/admin/users?limit=200&offset=0`);
      if (cancelled) return;
      const q = userQuery.toLowerCase();
      const results = users.filter(u => (u.email || '').toLowerCase().includes(q));
      setUserResults(results.slice(0, 10));
    };
    run();
    return () => { cancelled = true; };
  }, [userQuery]);

  if (loading) return <div className="text-sm text-slate-500">Loading…</div>;
  if (!team) return <div className="text-sm text-slate-500">Team not found.</div>;

  return (
    <div className="space-y-6">
      <Card className="border border-slate-200 rounded-xl bg-white">
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <CardTitle className="font-semibold">{team.name}</CardTitle>
            <Button variant="secondary" onClick={() => setAddOpen(true)}>Add Member</Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div><span className="text-slate-500">Organisation:</span> <span className="font-medium">{team.organizationName || '—'}</span></div>
            <div><span className="text-slate-500">Created:</span> <span className="font-medium">{new Date(team.createdAt).toLocaleDateString()}</span></div>
            <div><span className="text-slate-500">Members:</span> <span className="font-medium">{team.aggregates.memberCount} (sharing {team.aggregates.sharingCount})</span></div>
          </div>
        </CardContent>
      </Card>

      <Card className="border border-slate-200 rounded-xl bg-white">
        <CardHeader>
          <CardTitle className="text-base">Members</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto -mx-4 md:mx-0">
            <div className="inline-block min-w-full align-middle">
              <table className="min-w-full text-sm">
              <thead>
                <tr className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                  <th className="text-left py-2 px-3">Name</th>
                  <th className="text-left py-2 px-3">Email</th>
                  <th className="text-left py-2 px-3">Role</th>
                  <th className="text-left py-2 px-3">Sharing</th>
                  <th className="text-left py-2 px-3">Joined</th>
                  <th className="text-left py-2 px-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {team.members.map(m => (
                  <tr key={m.userId} className="border-t border-slate-200 hover:bg-slate-50">
                    <td className="py-2 px-3">{m.name || '—'}</td>
                    <td className="py-2 px-3 text-slate-700">{m.email || '—'}</td>
                    <td className="py-2 px-3 capitalize">{m.role}</td>
                    <td className="py-2 px-3">{m.hasSharingGrant ? 'Yes' : 'No'}</td>
                    <td className="py-2 px-3 text-slate-600">{new Date(m.joinedAt).toLocaleDateString()}</td>
                    <td className="py-2 px-3">
                      <Button variant="link" className="text-red-600 p-0 h-auto" onClick={() => setRemoveUserId(m.userId)}>Remove</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
              </table>
            </div>
          </div>
        </CardContent>
      </Card>

      {team.aggregates.stats && (
        <Card className="border border-slate-200 rounded-xl bg-white">
          <CardHeader>
            <CardTitle className="text-base">Team Aggregate Stats</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-slate-600">Anonymised stats available</div>
          </CardContent>
        </Card>
      )}

      {/* Add Member modal */}
      <Dialog open={addOpen} onOpenChange={(o) => { if (!o) { setAddOpen(false); setSelectedUser(null); setUserQuery(""); setRole('member'); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Member</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>User Email</Label>
              <Input placeholder="Search by email..." value={userQuery} onChange={(e) => { setUserQuery(e.target.value); setSelectedUser(null); }} />
              {userResults.length > 0 && !selectedUser && (
                <div className="border rounded-md divide-y max-h-48 overflow-auto">
                  {userResults.map(u => (
                    <button key={u.id} className="w-full text-left px-3 py-2 hover:bg-slate-50" onClick={() => setSelectedUser(u)}>
                      <div className="font-medium">{u.email}</div>
                      <div className="text-xs text-slate-600">{u.name || '—'}</div>
                    </button>
                  ))}
                </div>
              )}
              {selectedUser && (
                <div className="text-sm text-slate-700">Selected: <span className="font-medium">{selectedUser.email}</span></div>
              )}
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <select className="border rounded-md px-3 py-2 w-full" value={role} onChange={(e) => setRole(e.target.value as any)}>
                <option value="leader">leader</option>
                <option value="member">member</option>
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button
              onClick={async () => {
                if (!selectedUser) return;
                setSubmitting(true);
                try {
                  await apiFetch(`/api/v1/admin/teams/${id}/members`, { method: 'POST', body: JSON.stringify({ userId: selectedUser.id, role }) });
                  const t = await apiFetch<TeamDetail>(`/api/v1/admin/teams/${id}`);
                  setTeam(t);
                  setAddOpen(false);
                } finally {
                  setSubmitting(false);
                }
              }}
              disabled={!selectedUser || submitting}
            >Add Member</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remove member confirm */}
      <Dialog open={!!removeUserId} onOpenChange={(o) => { if (!o) setRemoveUserId(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove Member</DialogTitle>
          </DialogHeader>
          <div className="text-sm text-slate-600">Are you sure you want to remove this member from the team?</div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRemoveUserId(null)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={async () => {
                if (!removeUserId) return;
                setSubmitting(true);
                try {
                  await apiFetch(`/api/v1/admin/teams/${id}/members/${removeUserId}`, { method: 'DELETE' });
                  const t = await apiFetch<TeamDetail>(`/api/v1/admin/teams/${id}`);
                  setTeam(t);
                  setRemoveUserId(null);
                } finally {
                  setSubmitting(false);
                }
              }}
              disabled={!removeUserId || submitting}
            >Remove</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
