"use client";

import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

type CoachRow = {
  user_id: string;
  name: string | null;
  email: string;
  firm_name: string | null;
  status: 'active' | 'lapsed' | 'suspended' | 'revoked';
  certifiedAt: string | null;
  expiresAt: string | null;
  clients: number;
};

type FirmRow = {
  id: string;
  name: string;
  coaches: number;
  active_clients: number;
  createdAt: string;
};

export default function CoachesAndCertsPage() {
  const [coaches, setCoaches] = useState<CoachRow[]>([]);
  const [firms, setFirms] = useState<FirmRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [suspendTarget, setSuspendTarget] = useState<CoachRow | null>(null);
  const [reactivateTarget, setReactivateTarget] = useState<CoachRow | null>(null);
  const [suspendReason, setSuspendReason] = useState("");
  const [reactivateExpiry, setReactivateExpiry] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [registerOpen, setRegisterOpen] = useState(false);
  const [createFirmOpen, setCreateFirmOpen] = useState(false);

  type AdminUser = { id: string; name: string | null; email: string };
  const [userQuery, setUserQuery] = useState("");
  const [userResults, setUserResults] = useState<AdminUser[]>([]);
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [selectedFirmId, setSelectedFirmId] = useState<string>("");
  const [expiryDate, setExpiryDate] = useState("");
  const [newFirmName, setNewFirmName] = useState("");

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [cs, fs] = await Promise.all([
        apiFetch<CoachRow[]>("/api/v1/admin/coaches"),
        apiFetch<FirmRow[]>("/api/v1/admin/coaches/coaching-firms"),
      ]);
      setCoaches(cs);
      setFirms(fs);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  // Simple email search: fetch first 200 admin users then filter client-side
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
      const results = users.filter(u => u.email?.toLowerCase().includes(q));
      setUserResults(results.slice(0, 10));
    };
    run();
    return () => { cancelled = true; };
  }, [userQuery]);

  const filteredCoaches = useMemo(() => {
    const s = search.toLowerCase();
    return coaches.filter(c =>
      (c.name || '').toLowerCase().includes(s) ||
      (c.email || '').toLowerCase().includes(s) ||
      (c.firm_name || '').toLowerCase().includes(s)
    );
  }, [coaches, search]);

  const StatusBadge = ({ status }: { status: CoachRow['status'] }) => {
    const map: Record<string, string> = {
      active: "bg-emerald-50 text-emerald-700 border-emerald-200",
      lapsed: "bg-amber-50 text-amber-700 border-amber-200",
      suspended: "bg-red-50 text-red-700 border-red-200",
      revoked: "bg-rose-100 text-rose-800 border-rose-200",
    };
    const label = status.charAt(0).toUpperCase() + status.slice(1);
    return <Badge variant="outline" className={`font-semibold ${map[status]}`}>{label}</Badge>;
  };

  const onConfirmSuspend = async () => {
    if (!suspendTarget || !suspendReason.trim()) return;
    setSubmitting(true);
    try {
      await apiFetch(`/api/v1/admin/coaches/${suspendTarget.user_id}/certification`, {
        method: 'PUT',
        body: JSON.stringify({ status: 'suspended' })
      });
      await fetchAll();
      setSuspendTarget(null);
      setSuspendReason("");
    } finally {
      setSubmitting(false);
    }
  };

  const onConfirmReactivate = async () => {
    if (!reactivateTarget || !reactivateExpiry) return;
    setSubmitting(true);
    try {
      await apiFetch(`/api/v1/admin/coaches/${reactivateTarget.user_id}/certification`, {
        method: 'PUT',
        body: JSON.stringify({ status: 'active', expiresAt: new Date(reactivateExpiry).toISOString() })
      });
      await fetchAll();
      setReactivateTarget(null);
      setReactivateExpiry("");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-8">
      <Card className="border border-slate-200 rounded-xl bg-white">
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <CardTitle className="font-semibold">Coaches</CardTitle>
            <div className="flex items-center gap-3">
              <div className="w-64"><Input placeholder="Search coaches or firms" value={search} onChange={(e) => setSearch(e.target.value)} /></div>
              <Button variant="secondary" onClick={() => setRegisterOpen(true)}>Register Coach</Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-sm text-slate-500">Loading…</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                    <th className="text-left py-2 px-3">Coach</th>
                    <th className="text-left py-2 px-3">Email</th>
                    <th className="text-left py-2 px-3">Firm</th>
                    <th className="text-left py-2 px-3">Certification</th>
                    <th className="text-left py-2 px-3">Clients</th>
                    <th className="text-left py-2 px-3">Expires</th>
                    <th className="text-left py-2 px-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCoaches.map(c => (
                    <tr key={c.user_id} className="border-t border-slate-200 hover:bg-slate-50">
                      <td className="py-2 px-3 font-medium">{c.name || '—'}</td>
                      <td className="py-2 px-3 text-slate-700">{c.email}</td>
                      <td className="py-2 px-3">{c.firm_name || '—'}</td>
                      <td className="py-2 px-3"><StatusBadge status={c.status} /></td>
                      <td className="py-2 px-3">{c.clients}</td>
                      <td className="py-2 px-3 text-slate-600">{c.expiresAt ? new Date(c.expiresAt).toLocaleDateString() : '—'}</td>
                      <td className="py-2 px-3 space-x-3">
                        <Button variant="link" className="text-blue-600 p-0 h-auto" onClick={() => window.location.href = `/admin/users/${c.user_id}`}>View</Button>
                        {c.status !== 'suspended' && c.status !== 'revoked' ? (
                          <Button variant="link" className="text-red-600 p-0 h-auto" onClick={() => setSuspendTarget(c)}>Suspend</Button>
                        ) : (
                          <Button variant="link" className="text-green-600 p-0 h-auto" onClick={() => setReactivateTarget(c)}>Reactivate</Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border border-slate-200 rounded-xl bg-white">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="font-semibold">Coaching Firms</CardTitle>
            <Button variant="secondary" onClick={() => setCreateFirmOpen(true)}>Create Firm</Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-sm text-slate-500">Loading…</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                    <th className="text-left py-2 px-3">Firm</th>
                    <th className="text-left py-2 px-3">Coaches</th>
                    <th className="text-left py-2 px-3">Active Clients</th>
                    <th className="text-left py-2 px-3">Created</th>
                    <th className="text-left py-2 px-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {firms.map(f => (
                    <tr key={f.id} className="border-t border-slate-200 hover:bg-slate-50">
                      <td className="py-2 px-3 font-medium">{f.name}</td>
                      <td className="py-2 px-3">{f.coaches}</td>
                      <td className="py-2 px-3">{f.active_clients}</td>
                      <td className="py-2 px-3 text-slate-600">{new Date(f.createdAt).toLocaleDateString()}</td>
                      <td className="py-2 px-3">
                        <Button variant="link" className="text-blue-600 p-0 h-auto" onClick={() => { /* TODO: navigate to firm detail when available */ }}>View</Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Suspend modal */}
      <Dialog open={!!suspendTarget} onOpenChange={(o) => !o && setSuspendTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Suspend Coach</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <p className="text-sm text-slate-600">Provide a reason for suspension. This will be logged.</p>
            <Input placeholder="Reason (required)" value={suspendReason} onChange={(e) => setSuspendReason(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSuspendTarget(null)}>Cancel</Button>
            <Button disabled={!suspendReason.trim() || submitting} onClick={onConfirmSuspend}>Confirm</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Register Coach modal */}
      <Dialog open={registerOpen} onOpenChange={(o) => { if (!o) { setRegisterOpen(false); setSelectedUser(null); setUserQuery(""); setSelectedFirmId(""); setExpiryDate(""); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Register New Coach</DialogTitle>
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
              <Label>Coaching Firm (optional)</Label>
              <select className="border rounded-md px-3 py-2 w-full" value={selectedFirmId} onChange={(e) => setSelectedFirmId(e.target.value)}>
                <option value="">Select firm…</option>
                {firms.map(f => (
                  <option key={f.id} value={f.id}>{f.name}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label>Certification Expiry Date</Label>
              <Input type="date" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRegisterOpen(false)}>Cancel</Button>
            <Button
              onClick={async () => {
                if (!selectedUser) return;
                setSubmitting(true);
                try {
                  const expiresAtIso = expiryDate ? new Date(expiryDate + 'T00:00:00Z').toISOString() : undefined;
                  await apiFetch(`/api/v1/admin/coaches`, {
                    method: 'POST',
                    body: JSON.stringify({ userId: selectedUser.id, firmId: selectedFirmId || undefined, expiresAt: expiresAtIso })
                  });
                  await fetchAll();
                  setRegisterOpen(false);
                } finally {
                  setSubmitting(false);
                }
              }}
              disabled={!selectedUser || submitting}
            >Register Coach</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Firm modal */}
      <Dialog open={createFirmOpen} onOpenChange={(o) => { if (!o) { setCreateFirmOpen(false); setNewFirmName(""); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Coaching Firm</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Firm Name</Label>
            <Input placeholder="Apex Coaching Partners" value={newFirmName} onChange={(e) => setNewFirmName(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateFirmOpen(false)}>Cancel</Button>
            <Button
              onClick={async () => {
                if (!newFirmName.trim()) return;
                setSubmitting(true);
                try {
                  await apiFetch(`/api/v1/admin/coaches/coaching-firms`, { method: 'POST', body: JSON.stringify({ name: newFirmName.trim() }) });
                  await fetchAll();
                  setCreateFirmOpen(false);
                } finally {
                  setSubmitting(false);
                }
              }}
              disabled={!newFirmName.trim() || submitting}
            >Create Firm</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reactivate modal */}
      <Dialog open={!!reactivateTarget} onOpenChange={(o) => !o && setReactivateTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reactivate Coach</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <p className="text-sm text-slate-600">Set a new expiry date for the certification.</p>
            <Input type="date" value={reactivateExpiry} onChange={(e) => setReactivateExpiry(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReactivateTarget(null)}>Cancel</Button>
            <Button disabled={!reactivateExpiry || submitting} onClick={onConfirmReactivate}>Confirm</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
