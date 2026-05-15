"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type OrgDetail = {
  id: string;
  name: string;
  slug: string;
  createdAt: string;
  members: Array<{
    id: string;
    userId: string;
    organizationId: string;
    role: string;
    joinedAt: string;
    name: string | null;
    email: string;
  }>;
  teams: Array<{
    id: string;
    name: string;
    organizationId: string;
    createdAt: string;
  }>;
  seats?: { purchased: number; allocated: number; remaining: number };
};

type TeamDetail = {
  id: string;
  organizationId: string;
  name: string;
  createdAt: string;
  organizationName?: string | null;
  members: Array<{
    userId: string;
    role: string;
    joinedAt: string;
    name: string | null;
    email: string | null;
    hasSharingGrant: boolean;
  }>;
  aggregates: { memberCount: number; sharingCount: number; stats: any };
};

export default function OrganisationDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id as string;
  const [org, setOrg] = useState<OrgDetail | null>(null);
  const [teamExtras, setTeamExtras] = useState<Record<string, { leader: string | null; count: number }>>({});
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [removeOpen, setRemoveOpen] = useState<{ open: boolean; userId?: string; name?: string | null }>({ open: false });
  const [createTeamOpen, setCreateTeamOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newSlug, setNewSlug] = useState("");

  // Invite form
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<'member'|'admin'>("member");
  const [inviteAllocateSeat, setInviteAllocateSeat] = useState(false);
  const [inviteSendEmail, setInviteSendEmail] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Seats
  const [seats, setSeats] = useState<Array<{ id: string; userId: string | null; allocatedAt: string | null; reclaimedAt: string | null; name?: string | null; email?: string | null }>>([]);
  const allocatedUserIds = useMemo(() => new Set(seats.filter(s => s.userId && !s.reclaimedAt).map(s => s.userId as string)), [seats]);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    apiFetch<OrgDetail>(`/api/v1/admin/organisations/${id}`)
      .then(async (data) => {
        setOrg(data);
        setNewName(data.name);
        setNewSlug(data.slug);
        // Fetch leader + count for each team to display in list
        if (data.teams?.length) {
          const entries = await Promise.all(
            data.teams.map(async (t) => {
              const td = await apiFetch<TeamDetail>(`/api/v1/admin/teams/${t.id}`);
              const leader = td.members.find(m => m.role === 'leader')?.name || null;
              return [t.id, { leader, count: td.aggregates.memberCount }] as const;
            })
          );
          setTeamExtras(Object.fromEntries(entries));
        }
        // Fetch seats
        try {
          const seatRows = await apiFetch<any[]>(`/api/v1/admin/organisations/${id}/seats`);
          setSeats(seatRows);
        } catch {}
      })
      .finally(() => setLoading(false));
  }, [id]);

  const reloadOrg = async () => {
    const data = await apiFetch<OrgDetail>(`/api/v1/admin/organisations/${id}`);
    setOrg(data);
    setNewName(data.name); setNewSlug(data.slug);
    try { const seatRows = await apiFetch<any[]>(`/api/v1/admin/organisations/${id}/seats`); setSeats(seatRows); } catch {}
  };

  if (loading) return <div className="text-sm text-slate-500">Loading…</div>;
  if (!org) return <div className="text-sm text-slate-500">Organisation not found.</div>;

  return (
    <div className="space-y-6">
      <Card className="border border-slate-200 rounded-xl bg-white">
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <CardTitle className="font-semibold">{org.name}</CardTitle>
            <div className="flex items-center gap-2">
              <Button variant="secondary" onClick={() => setEditOpen(true)}>Edit</Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div><span className="text-slate-500">Slug:</span> <span className="font-medium">{org.slug}</span></div>
            <div><span className="text-slate-500">Created:</span> <span className="font-medium">{new Date(org.createdAt).toLocaleDateString()}</span></div>
            {org.seats && (
              <div className="flex items-center gap-2">
                <span className="text-slate-500">Seats:</span>
                <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">Purchased {org.seats.purchased}</Badge>
                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Allocated {org.seats.allocated}</Badge>
                <Badge variant="outline" className="bg-slate-50 text-slate-700 border-slate-200">Remaining {org.seats.remaining}</Badge>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="border border-slate-200 rounded-xl bg-white">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Members</CardTitle>
            <div className="flex items-center gap-2">
              <Button onClick={() => { setInviteOpen(true); setInviteEmail(""); setInviteRole('member'); setInviteAllocateSeat(false); setInviteSendEmail(true); }}>Invite Member</Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                  <th className="text-left py-2 px-3">Name</th>
                  <th className="text-left py-2 px-3">Email</th>
                  <th className="text-left py-2 px-3">Role</th>
                  <th className="text-left py-2 px-3">Joined</th>
                  <th className="text-left py-2 px-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {org.members?.map(m => (
                  <tr key={m.id} className="border-t border-slate-200 hover:bg-slate-50">
                    <td className="py-2 px-3">{m.name || '—'}</td>
                    <td className="py-2 px-3 text-slate-700">{m.email}</td>
                    <td className="py-2 px-3 capitalize">
                      <select
                        className="border rounded-md px-2 py-1 text-sm"
                        value={m.role}
                        onChange={async (e) => {
                          const newRole = e.target.value as 'member'|'admin';
                          const prev = m.role;
                          setOrg(o => o ? ({ ...o, members: o.members.map(x => x.userId === m.userId ? { ...x, role: newRole } : x) }) : o);
                          try {
                            await apiFetch(`/api/v1/admin/organisations/${org.id}/members/${m.userId}`, { method: 'PUT', body: JSON.stringify({ role: newRole }) });
                          } catch {
                            // revert on failure
                            setOrg(o => o ? ({ ...o, members: o.members.map(x => x.userId === m.userId ? { ...x, role: prev } : x) }) : o);
                          }
                        }}
                      >
                        <option value="member">Member</option>
                        <option value="admin">Admin</option>
                      </select>
                    </td>
                    <td className="py-2 px-3 text-slate-600">{new Date(m.joinedAt).toLocaleDateString()}</td>
                    <td className="py-2 px-3">
                      <Button variant="ghost" className="text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => setRemoveOpen({ open: true, userId: m.userId, name: m.name || m.email })}>Remove</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card className="border border-slate-200 rounded-xl bg-white">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Teams</CardTitle>
            <Button variant="secondary" onClick={() => setCreateTeamOpen(true)}>Create Team</Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                  <th className="text-left py-2 px-3">Team</th>
                  <th className="text-left py-2 px-3">Leader</th>
                  <th className="text-left py-2 px-3">Members</th>
                  <th className="text-left py-2 px-3">Created</th>
                  <th className="text-left py-2 px-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {org.teams?.map(t => (
                  <tr key={t.id} className="border-t border-slate-200 hover:bg-slate-50">
                    <td className="py-2 px-3 font-medium">{t.name}</td>
                    <td className="py-2 px-3">{teamExtras[t.id]?.leader || '—'}</td>
                    <td className="py-2 px-3">{teamExtras[t.id]?.count ?? '—'}</td>
                    <td className="py-2 px-3 text-slate-600">{new Date(t.createdAt).toLocaleDateString()}</td>
                    <td className="py-2 px-3">
                      <Link href={`/admin/teams/${t.id}`} className="text-blue-600 hover:underline">View</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
      {/* Seat Management */}
      {org.seats && org.seats.purchased > 0 && (
        <Card className="border border-slate-200 rounded-xl bg-white">
          <CardHeader>
            <CardTitle className="text-base">Seat Allocation</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm mb-3">Purchased: <span className="font-medium">{org.seats.purchased}</span> | Allocated: <span className="font-medium">{seats.filter(s => s.userId && !s.reclaimedAt).length}</span> | Remaining: <span className="font-medium">{org.seats.purchased - seats.filter(s => s.userId && !s.reclaimedAt).length}</span></div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                    <th className="text-left py-2 px-3">User</th>
                    <th className="text-left py-2 px-3">Allocated On</th>
                    <th className="text-left py-2 px-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {seats.filter(s => s.userId && !s.reclaimedAt).map(s => (
                    <tr key={s.id} className="border-t border-slate-200 hover:bg-slate-50">
                      <td className="py-2 px-3">{s.name || s.email || s.userId}</td>
                      <td className="py-2 px-3">{s.allocatedAt ? new Date(s.allocatedAt).toLocaleDateString() : '—'}</td>
                      <td className="py-2 px-3"><Button variant="ghost" className="text-red-600 hover:text-red-700 hover:bg-red-50" onClick={async () => { await apiFetch(`/api/v1/admin/organisations/${org.id}/seats/${s.id}`, { method: 'DELETE' }); const rows = await apiFetch<any[]>(`/api/v1/admin/organisations/${org.id}/seats`); setSeats(rows); }}>Reclaim Seat</Button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-4">
              <label className="text-sm text-slate-600 mr-2">Allocate Seat to Member</label>
              <select
                className="border rounded-md px-3 py-2 text-sm"
                onChange={async (e) => {
                  const userId = e.target.value;
                  if (!userId) return;
                  await apiFetch(`/api/v1/admin/organisations/${org.id}/seats`, { method: 'POST', body: JSON.stringify({ userId }) });
                  const rows = await apiFetch<any[]>(`/api/v1/admin/organisations/${org.id}/seats`);
                  setSeats(rows);
                  e.currentTarget.selectedIndex = 0;
                }}
              >
                <option value="">Select member…</option>
                {org.members.filter(m => !allocatedUserIds.has(m.userId)).map(m => (
                  <option key={m.userId} value={m.userId}>{m.name || m.email} ({m.email})</option>
                ))}
              </select>
            </div>
          </CardContent>
        </Card>
      )}
      {/* Edit Organisation modal */}
      <Dialog open={editOpen} onOpenChange={(o) => { if (!o) setEditOpen(false); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Organisation</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input value={newName} onChange={(e) => setNewName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Slug</Label>
              <Input value={newSlug} onChange={(e) => setNewSlug(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button disabled={!newName.trim() || !newSlug.trim()} onClick={async () => { await apiFetch(`/api/v1/admin/organisations/${org.id}`, { method: 'PUT', body: JSON.stringify({ name: newName.trim(), slug: newSlug.trim() }) }); await reloadOrg(); setEditOpen(false); }}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Invite Member modal */}
      <Dialog open={inviteOpen} onOpenChange={(o) => { if (!o) setInviteOpen(false); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Member to {org.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>User Email</Label>
              <Input placeholder="user@example.com" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <select className="border rounded-md px-3 py-2 w-full" value={inviteRole} onChange={(e) => setInviteRole(e.target.value as any)}>
                <option value="member">Member</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <label className="inline-flex items-center gap-2"><input type="checkbox" checked={inviteAllocateSeat} onChange={(e) => setInviteAllocateSeat(e.target.checked)} /> <span>Allocate a seat to this user</span></label>
            <label className="inline-flex items-center gap-2"><input type="checkbox" checked={inviteSendEmail} onChange={(e) => setInviteSendEmail(e.target.checked)} /> <span>Send invitation email</span></label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInviteOpen(false)}>Cancel</Button>
            <Button disabled={!inviteEmail.includes('@') || submitting} onClick={async () => {
              setSubmitting(true);
              try {
                await apiFetch(`/api/v1/admin/organisations/${org.id}/members`, { method: 'POST', body: JSON.stringify({ email: inviteEmail.trim(), role: inviteRole, allocateSeat: inviteAllocateSeat, sendInvite: inviteSendEmail }) });
                await reloadOrg();
                setInviteOpen(false);
              } finally { setSubmitting(false); }
            }}>Add Member</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Remove Member confirm */}
      <Dialog open={removeOpen.open} onOpenChange={(o) => { if (!o) setRemoveOpen({ open: false }); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove Member</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 text-sm">
            <p>Remove {removeOpen.name || 'this user'} from {org.name}? Their seat will be reclaimed but their personal data and profile are not affected.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRemoveOpen({ open: false })}>Cancel</Button>
            <Button className="bg-red-600 hover:bg-red-700" onClick={async () => {
              if (!removeOpen.userId) return;
              await apiFetch(`/api/v1/admin/organisations/${org.id}/members/${removeOpen.userId}`, { method: 'DELETE' });
              await reloadOrg();
              setRemoveOpen({ open: false });
            }}>Remove</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Create Team modal */}
      <CreateTeamInline open={createTeamOpen} onOpenChange={setCreateTeamOpen} orgId={org.id} orgName={org.name} onCreated={reloadOrg} />
    </div>
  );
}
function CreateTeamInline({ open, onOpenChange, orgId, orgName, onCreated }: { open: boolean; onOpenChange: (o: boolean) => void; orgId: string; orgName: string; onCreated: () => Promise<void> | void }) {
  const [teamName, setTeamName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { onOpenChange(false); setTeamName(""); } else { onOpenChange(true); } }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Team</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Team Name</Label>
            <Input placeholder="Team Alpha" value={teamName} onChange={(e) => setTeamName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Organisation</Label>
            <Input value={orgName} readOnly />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button disabled={!teamName.trim() || submitting} onClick={async () => {
            setSubmitting(true);
            try {
              await apiFetch(`/api/v1/admin/teams`, { method: 'POST', body: JSON.stringify({ name: teamName.trim(), organizationId: orgId }) });
              await onCreated();
              onOpenChange(false);
              setTeamName("");
            } finally {
              setSubmitting(false);
            }
          }}>Create Team</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
