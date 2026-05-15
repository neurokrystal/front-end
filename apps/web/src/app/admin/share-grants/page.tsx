"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { ChevronLeft, ChevronRight, Download, Link as LinkIcon } from "lucide-react";

type ShareGrant = {
  id: string;
  subjectUserId: string;
  targetType: 'user' | 'team' | 'organisation' | 'coach' | 'public';
  targetUserId?: string | null;
  targetTeamId?: string | null;
  targetOrgId?: string | null;
  resourceTypes: string[];
  status: 'active' | 'revoked' | 'expired';
  grantedAt: string;
  revokedAt?: string | null;
  expiresAt?: string | null;
};

type UserSummary = { id: string; email: string; displayName?: string };

function statusBadge(status: ShareGrant['status']) {
  const map: Record<ShareGrant['status'], string> = {
    active: 'bg-green-50 text-green-700 border-green-200',
    revoked: 'bg-red-50 text-red-700 border-red-200',
    expired: 'bg-slate-100 text-slate-600 border-slate-200',
  };
  return map[status] || 'bg-slate-50 text-slate-700 border-slate-200';
}

function typeBadge(tt: ShareGrant['targetType']) {
  const map: Record<string, string> = {
    user: 'bg-blue-50 text-blue-700 border-blue-200',
    team: 'bg-violet-50 text-violet-700 border-violet-200',
    organisation: 'bg-teal-50 text-teal-700 border-teal-200',
    coach: 'bg-amber-50 text-amber-700 border-amber-200',
    public: 'bg-slate-50 text-slate-700 border-slate-200',
  };
  return map[tt] || map.public;
}

export default function ShareGrantsPage() {
  const [grants, setGrants] = useState<ShareGrant[]>([]);
  const [users, setUsers] = useState<UserSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Revoke modal state
  const [revokeOpen, setRevokeOpen] = useState(false);
  const [revokeGrant, setRevokeGrant] = useState<ShareGrant | null>(null);
  const [revokeReason, setRevokeReason] = useState("");

  // Provision modal state
  const [provisionOpen, setProvisionOpen] = useState(false);
  const [subjectQuery, setSubjectQuery] = useState("");
  const [subjectUserId, setSubjectUserId] = useState<string>("");
  const [targetType, setTargetType] = useState<'user'|'team'|'organisation'|'coach'>("user");
  const [targetQuery, setTargetQuery] = useState("");
  const [targetUserId, setTargetUserId] = useState<string>("");
  const [resourceBase, setResourceBase] = useState(true);
  const [resourceProfessionalSelf, setResourceProfessionalSelf] = useState(false);
  const [resourceLeaderAdapted, setResourceLeaderAdapted] = useState(false);
  const [resourceUnderPressure, setResourceUnderPressure] = useState(false);
  const [provisionReason, setProvisionReason] = useState("Provisioned per support ticket");
  const [sendNotification, setSendNotification] = useState(true);
  const [submittingProvision, setSubmittingProvision] = useState(false);

  const [statusFilter, setStatusFilter] = useState<'all' | ShareGrant['status']>('all');
  const [targetTypeFilter, setTargetTypeFilter] = useState<'all' | ShareGrant['targetType']>('all');
  const [subjectSearch, setSubjectSearch] = useState('');

  const [page, setPage] = useState(0);
  const [perPage, setPerPage] = useState(50);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    const fetchGrants = async () => {
      try {
        const data = await apiFetch<ShareGrant[]>(`/api/v1/admin/share-grants?limit=200`);
        if (mounted) setGrants((data || []).map(g => ({ ...g, grantedAt: String((g as any).grantedAt ?? (g as any).createdAt) })));
        if (mounted) setError(null);
      } catch (e) {
        if (mounted) setError('Failed to load share grants');
      } finally {
        if (mounted) setLoading(false);
      }
    };
    fetchGrants();
    apiFetch<UserSummary[]>(`/api/v1/admin/users?limit=200&offset=0`).then(setUsers).catch(() => {});
    return () => { mounted = false; };
  }, []);

  const userMap = useMemo(() => {
    const m = new Map<string, UserSummary>();
    users.forEach(u => m.set(u.id, u));
    return m;
  }, [users]);

  const filtered = useMemo(() => grants.filter(g => {
    if (statusFilter !== 'all' && g.status !== statusFilter) return false;
    if (targetTypeFilter !== 'all' && g.targetType !== targetTypeFilter) return false;
    if (subjectSearch) {
      const subj = userMap.get(g.subjectUserId);
      const name = subj?.displayName || subj?.email || '';
      if (!name.toLowerCase().includes(subjectSearch.toLowerCase())) return false;
    }
    return true;
  }), [grants, statusFilter, targetTypeFilter, subjectSearch, userMap]);

  const pageItems = filtered.slice(page * perPage, (page + 1) * perPage);
  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));

  const openRevoke = (g: ShareGrant) => {
    setRevokeGrant(g);
    setRevokeReason("");
    setRevokeOpen(true);
  };

  const confirmRevoke = async () => {
    if (!revokeGrant) return;
    try {
      await apiFetch(`/api/v1/admin/share-grants/${revokeGrant.id}`, { method: 'DELETE', body: JSON.stringify({ reason: revokeReason.trim() }) });
      setGrants(prev => prev.map(x => x.id === revokeGrant.id ? { ...x, status: 'revoked', revokedAt: new Date().toISOString() } : x));
      setRevokeOpen(false);
      setRevokeGrant(null);
      setRevokeReason("");
    } catch (e: any) {
      alert((e?.message as string) || 'Failed to revoke share grant');
    }
  };

  const subjectMatches = useMemo(() => {
    const q = subjectQuery.trim().toLowerCase();
    if (!q) return users;
    return users.filter(u => (u.displayName || '').toLowerCase().includes(q) || (u.email || '').toLowerCase().includes(q));
  }, [subjectQuery, users]);

  const targetMatches = useMemo(() => {
    if (targetType !== 'user') return [] as UserSummary[];
    const q = targetQuery.trim().toLowerCase();
    if (!q) return users;
    return users.filter(u => (u.displayName || '').toLowerCase().includes(q) || (u.email || '').toLowerCase().includes(q));
  }, [targetQuery, users, targetType]);

  const provision = async () => {
    const resources: string[] = [];
    if (resourceBase) resources.push('base');
    if (resourceProfessionalSelf) resources.push('professional_self');
    if (resourceLeaderAdapted) resources.push('leader_adapted');
    if (resourceUnderPressure) resources.push('under_pressure');
    if (!subjectUserId || resources.length === 0) return;
    if (targetType === 'user' && !targetUserId) return;
    setSubmittingProvision(true);
    try {
      const payload: any = {
        subjectUserId,
        targetType,
        resourceTypes: resources,
        reason: provisionReason || 'admin_provisioned',
        sendNotification,
      };
      if (targetType === 'user') payload.targetUserId = targetUserId;
      const created = await apiFetch<ShareGrant>(`/api/v1/admin/share-grants`, { method: 'POST', body: JSON.stringify(payload) });
      setGrants(prev => [{ ...created, grantedAt: (created as any).grantedAt || new Date().toISOString() }, ...prev]);
      setProvisionOpen(false);
      // reset fields
      setSubjectQuery(""); setSubjectUserId(""); setTargetQuery(""); setTargetUserId("");
      setResourceBase(true); setResourceProfessionalSelf(false); setResourceLeaderAdapted(false); setResourceUnderPressure(false);
      setProvisionReason('Provisioned per support ticket'); setSendNotification(true);
    } catch (e: any) {
      alert((e?.message as string) || 'Failed to provision share');
    } finally {
      setSubmittingProvision(false);
    }
  };

  const exportCsv = () => {
    const rows = [
      ['Subject', 'Target Type', 'Target', 'Resources', 'Status', 'Granted', 'Expires'],
      ...filtered.map(g => {
        const subj = userMap.get(g.subjectUserId);
        const subjectLabel = subj?.displayName || subj?.email || g.subjectUserId;
        const targetLabel = g.targetType === 'user' || g.targetType === 'coach'
          ? (g.targetUserId ? (userMap.get(g.targetUserId)?.displayName || userMap.get(g.targetUserId)?.email || g.targetUserId) : '')
          : (g.targetType === 'team' ? (g.targetTeamId || '') : (g.targetOrgId || ''));
        return [subjectLabel, g.targetType, targetLabel, (g.resourceTypes || []).join(';'), g.status, g.grantedAt, g.expiresAt || ''];
      })
    ];
    const csv = rows.map(r => r.map(v => typeof v === 'string' && v.includes(',') ? `"${v.replaceAll('"','""')}"` : String(v ?? '')).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'share_grants.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-800">Share Grants</h1>
        <p className="text-slate-500 mt-1">All sharing relationships across the platform</p>
      </div>

      <Card className="bg-white border border-slate-200">
        <CardContent className="p-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-end">
              <div>
                <label className="text-xs text-slate-500">Status</label>
                <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value as any); setPage(0); }} className="mt-1 w-40 border-slate-300 rounded-md text-sm">
                  <option value="all">All</option>
                  <option value="active">Active</option>
                  <option value="revoked">Revoked</option>
                  <option value="expired">Expired</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-500">Target Type</label>
                <select value={targetTypeFilter} onChange={e => { setTargetTypeFilter(e.target.value as any); setPage(0); }} className="mt-1 w-48 border-slate-300 rounded-md text-sm">
                  <option value="all">All</option>
                  <option value="user">User</option>
                  <option value="team">Team</option>
                  <option value="organisation">Organisation</option>
                  <option value="coach">Coach</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-500">Subject search</label>
                <Input value={subjectSearch} onChange={e => { setSubjectSearch(e.target.value); setPage(0); }} placeholder="Name or email" className="mt-1 w-64" />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-sm text-slate-500">Total: <span className="font-medium text-slate-700">{filtered.length}</span></div>
              <div className="flex items-center gap-2 text-sm">
                <span className="text-slate-500">Per page:</span>
                <select value={perPage} onChange={e => { setPerPage(parseInt(e.target.value)); setPage(0); }} className="border-slate-300 rounded-md">
                  {[25,50,100].map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
              <Button onClick={() => setProvisionOpen(true)}>Provision Share</Button>
              <Button variant="outline" onClick={exportCsv}><Download className="w-4 h-4 mr-2"/>Export CSV</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {loading && (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      )}

      {!loading && error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
          <p className="text-sm text-red-600">{error}</p>
          <button onClick={() => location.reload()} className="mt-3 text-sm text-red-700 underline">Try again</button>
        </div>
      )}

      {!loading && !error && pageItems.length === 0 && (
        <div className="bg-white border border-slate-200 rounded-xl p-12 text-center">
          <LinkIcon className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-sm font-medium text-slate-500">No share grants found</p>
          <p className="text-xs text-slate-400 mt-1">Matching your current filters</p>
        </div>
      )}

      {!loading && !error && pageItems.length > 0 && (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white border border-slate-200 rounded-xl overflow-hidden">
            <thead className="bg-slate-50 text-slate-600 text-xs uppercase">
              <tr>
                <th className="px-4 py-3 text-left">Subject</th>
                <th className="px-4 py-3 text-left">Target Type</th>
                <th className="px-4 py-3 text-left">Target</th>
                <th className="px-4 py-3 text-left">Resources</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Granted</th>
                <th className="px-4 py-3 text-left">Expires</th>
                <th className="px-4 py-3 text-left">Actions</th>
              </tr>
            </thead>
            <tbody className="text-sm text-slate-700">
              {pageItems.map(g => {
                const subj = userMap.get(g.subjectUserId);
                const subjectLabel = subj?.displayName || subj?.email || g.subjectUserId.slice(0,8);
                let targetLabel: string = '—';
                if (g.targetType === 'user' || g.targetType === 'coach') {
                  const u = g.targetUserId ? userMap.get(g.targetUserId) : undefined;
                  targetLabel = u?.displayName || u?.email || (g.targetUserId ? g.targetUserId.slice(0,8) : '—');
                } else if (g.targetType === 'team') {
                  targetLabel = g.targetTeamId ? `Team ${g.targetTeamId.slice(0,8)}…` : '—';
                } else if (g.targetType === 'organisation') {
                  targetLabel = g.targetOrgId ? `Org ${g.targetOrgId.slice(0,8)}…` : '—';
                }
                const resources = (g.resourceTypes || []);
                const displayResources = resources.slice(0, 2).join(', ');
                const more = resources.length > 2 ? ` +${resources.length - 2} more` : '';
                const canRevoke = g.status === 'active';
                return (
                  <tr key={g.id} className="border-t border-slate-100 hover:bg-slate-50/50">
                    <td className="px-4 py-3"><Link href={`/admin/users/${g.subjectUserId}`} className="text-blue-600 hover:underline">{subjectLabel}</Link></td>
                    <td className="px-4 py-3"><Badge variant="outline" className={`font-medium ${typeBadge(g.targetType)}`}>{g.targetType.charAt(0).toUpperCase() + g.targetType.slice(1)}</Badge></td>
                    <td className="px-4 py-3">{targetLabel}</td>
                    <td className="px-4 py-3"><span title={resources.join(', ')}>{displayResources}{more}</span></td>
                    <td className="px-4 py-3"><Badge variant="outline" className={`font-medium ${statusBadge(g.status)}`}>{g.status === 'active' ? 'Active' : g.status.charAt(0).toUpperCase() + g.status.slice(1)}</Badge></td>
                    <td className="px-4 py-3">{new Date(g.grantedAt).toLocaleDateString()}</td>
                    <td className="px-4 py-3">{g.expiresAt ? new Date(g.expiresAt).toLocaleDateString() : '—'}</td>
                    <td className="px-4 py-3">
                      {canRevoke ? (
                        <Button variant="ghost" className="text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => openRevoke(g)}>Revoke</Button>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {!loading && !error && filtered.length > 0 && (
        <div className="flex items-center justify-between text-sm text-slate-600">
          <div>Page {page + 1} of {totalPages}</div>
          <div className="flex items-center gap-2">
            <Button variant="outline" disabled={page === 0} onClick={() => setPage(p => Math.max(0, p - 1))}><ChevronLeft className="w-4 h-4 mr-1"/>Prev</Button>
            <Button variant="outline" disabled={page >= totalPages - 1} onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}>Next<ChevronRight className="w-4 h-4 ml-1"/></Button>
          </div>
        </div>
      )}

      {/* Revoke modal */}
      <Dialog open={revokeOpen} onOpenChange={(o) => { if (!o) { setRevokeOpen(false); setRevokeGrant(null); setRevokeReason(""); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Revoke Share Grant</DialogTitle>
          </DialogHeader>
          {revokeGrant && (
            <div className="space-y-4 text-sm">
              <p className="text-slate-600">This will revoke the share between:</p>
              <div className="bg-slate-50 border border-slate-200 rounded-md p-3">
                <div><span className="text-slate-500">Subject:</span> <span className="font-medium">{userMap.get(revokeGrant.subjectUserId)?.displayName || userMap.get(revokeGrant.subjectUserId)?.email || revokeGrant.subjectUserId}</span></div>
                <div><span className="text-slate-500">Target:</span> <span className="font-medium">{revokeGrant.targetType === 'user' || revokeGrant.targetType === 'coach' ? (revokeGrant.targetUserId ? (userMap.get(revokeGrant.targetUserId!)?.displayName || userMap.get(revokeGrant.targetUserId!)?.email || revokeGrant.targetUserId) : '—') : revokeGrant.targetType === 'team' ? `Team ${revokeGrant.targetTeamId?.slice(0,8)}…` : revokeGrant.targetType === 'organisation' ? `Organisation ${revokeGrant.targetOrgId?.slice(0,8)}…` : '—'} ({revokeGrant.targetType})</span></div>
                <div><span className="text-slate-500">Resources:</span> <span className="font-medium">{(revokeGrant.resourceTypes || []).join(', ')}</span></div>
              </div>
              <div className="text-amber-700 bg-amber-50 border border-amber-200 rounded-md p-3">
                <div className="font-medium">⚠️ This will cascade to invalidate any viewer-facing reports derived from this share.</div>
              </div>
              <div className="space-y-2">
                <Label>Reason (required, min 10 chars)</Label>
                <textarea className="w-full border rounded-md px-3 py-2 text-sm" rows={4} value={revokeReason} onChange={(e) => setRevokeReason(e.target.value)} />
              </div>
              <div className="text-xs text-slate-500">This action is audit-logged.</div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setRevokeOpen(false)}>Cancel</Button>
            <Button className="bg-red-600 hover:bg-red-700" disabled={!revokeReason || revokeReason.trim().length < 10} onClick={confirmRevoke}>Revoke Share</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Provision Share modal */}
      <Dialog open={provisionOpen} onOpenChange={(o) => { if (!o) { setProvisionOpen(false); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Provision Share Grant</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 text-sm">
            <p className="text-slate-600">This creates a share on behalf of a user. An email notification will be sent to the target.</p>
            <div className="space-y-2">
              <Label>Subject (data owner)</Label>
              <Input placeholder="Search by email..." value={subjectQuery} onChange={(e) => { setSubjectQuery(e.target.value); const found = subjectMatches.find(u => (u.email || '').toLowerCase() === e.target.value.toLowerCase()); setSubjectUserId(found?.id || ""); }} list="subject-users" />
              <datalist id="subject-users">
                {subjectMatches.slice(0, 20).map(u => (
                  <option key={u.id} value={u.email}>{u.displayName ? `${u.displayName} <${u.email}>` : u.email}</option>
                ))}
              </datalist>
            </div>
            <div className="space-y-2">
              <Label>Target Type</Label>
              <select className="border rounded-md px-3 py-2" value={targetType} onChange={(e) => setTargetType(e.target.value as any)}>
                <option value="user">User</option>
                <option value="team">Team</option>
                <option value="organisation">Organisation</option>
                <option value="coach">Coach</option>
              </select>
            </div>
            {targetType === 'user' && (
              <div className="space-y-2">
                <Label>Target (who receives access)</Label>
                <Input placeholder="Search by email..." value={targetQuery} onChange={(e) => { setTargetQuery(e.target.value); const found = targetMatches.find(u => (u.email || '').toLowerCase() === e.target.value.toLowerCase()); setTargetUserId(found?.id || ""); }} list="target-users" />
                <datalist id="target-users">
                  {targetMatches.slice(0, 20).map(u => (
                    <option key={u.id} value={u.email}>{u.displayName ? `${u.displayName} <${u.email}>` : u.email}</option>
                  ))}
                </datalist>
              </div>
            )}
            <div className="space-y-2">
              <Label>Report Types</Label>
              <div className="grid grid-cols-1 gap-2">
                <label className="inline-flex items-center gap-2"><input type="checkbox" checked={resourceBase} onChange={(e) => setResourceBase(e.target.checked)} /> <span>Base Report</span></label>
                <label className="inline-flex items-center gap-2"><input type="checkbox" checked={resourceProfessionalSelf} onChange={(e) => setResourceProfessionalSelf(e.target.checked)} /> <span>Professional Self</span></label>
                <label className="inline-flex items-center gap-2"><input type="checkbox" checked={resourceLeaderAdapted} onChange={(e) => setResourceLeaderAdapted(e.target.checked)} /> <span>Leader-Adapted</span></label>
                <label className="inline-flex items-center gap-2"><input type="checkbox" checked={resourceUnderPressure} onChange={(e) => setResourceUnderPressure(e.target.checked)} /> <span>Under Pressure</span></label>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Reason (required)</Label>
              <textarea className="w-full border rounded-md px-3 py-2 text-sm" rows={3} value={provisionReason} onChange={(e) => setProvisionReason(e.target.value)} />
            </div>
            <label className="inline-flex items-center gap-2"><input type="checkbox" checked={sendNotification} onChange={(e) => setSendNotification(e.target.checked)} /> <span>Send notification email to target</span></label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setProvisionOpen(false)}>Cancel</Button>
            <Button onClick={provision} disabled={!subjectUserId || (targetType === 'user' && !targetUserId) || !provisionReason.trim() || submittingProvision}>Provision Share</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
