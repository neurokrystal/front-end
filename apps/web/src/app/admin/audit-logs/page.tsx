"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, Download, Search, ChevronDown, ChevronUp, ClipboardList } from "lucide-react";

type AuditLog = {
  id: string;
  actorUserId: string | null;
  actionType: string;
  resourceType: string | null;
  resourceId: string | null;
  subjectUserId: string | null;
  reason?: string | null;
  metadata?: any;
  ipAddress?: string | null;
  createdAt: string; // ISO from API
};

type UserSummary = {
  id: string;
  email: string;
  displayName?: string;
};

const AUDIT_ACTIONS: string[] = [
  'profile.viewed', 'profile.scored', 'profile.corrected',
  'report.generated', 'report.viewed', 'report.downloaded',
  'share.granted', 'share.revoked', 'share.expired', 'access.denied', 'access.granted',
  'admin.impersonate', 'admin.profile_edit', 'admin.report_regenerate', 'admin.bulk_operation', 'admin.comp_grant', 'admin.user_export',
  'billing.purchase_started', 'billing.purchase_completed', 'billing.purchase_failed', 'billing.refunded', 'billing.seat_assigned', 'billing.seat_reclaimed',
  'run.started', 'run.completed'
];

function relativeTime(dateStr: string): string {
  const seconds = (Date.now() - new Date(dateStr).getTime()) / 1000;
  if (seconds < 60) return 'Just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)} min ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hour${Math.floor(seconds / 3600) > 1 ? 's' : ''} ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)} day${Math.floor(seconds / 86400) > 1 ? 's' : ''} ago`;
  return new Date(dateStr).toLocaleDateString();
}

function actionBadgeClasses(action: string) {
  if (/^(run\.|profile\.)/.test(action)) return 'bg-green-50 text-green-700 border-green-200';
  if (/^(report\.|share\.)/.test(action)) return 'bg-blue-50 text-blue-700 border-blue-200';
  if (/^(admin\.|billing\.)/.test(action)) return 'bg-amber-50 text-amber-700 border-amber-200';
  if (/access.*denied|deletion\./.test(action)) return 'bg-red-50 text-red-700 border-red-200';
  return 'bg-slate-50 text-slate-700 border-slate-200';
}

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [users, setUsers] = useState<UserSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [actorSearch, setActorSearch] = useState<string>('');

  // Pagination
  const [page, setPage] = useState<number>(0);
  const [perPage, setPerPage] = useState<number>(50);

  // Row expand
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    Promise.all([
      apiFetch<AuditLog[]>(`/api/v1/admin/audit/logs?limit=500`),
      apiFetch<UserSummary[]>(`/api/v1/admin/users?limit=200&offset=0`).catch(() => [] as any),
    ])
      .then(([logsData, usersData]) => {
        if (!isMounted) return;
        // Coerce createdAt to ISO string if Date
        const normalized = (logsData || []).map(l => ({ ...l, createdAt: typeof l.createdAt === 'string' ? l.createdAt : new Date(l.createdAt as any).toISOString() }));
        setLogs(normalized);
        setUsers(usersData || []);
        setError(null);
      })
      .catch((e) => {
        console.error(e);
        setError('Failed to load audit logs');
      })
      .finally(() => isMounted && setLoading(false));
    return () => {
      isMounted = false;
    };
  }, []);

  const userMap = useMemo(() => {
    const m = new Map<string, UserSummary>();
    users.forEach(u => m.set(u.id, u));
    return m;
  }, [users]);

  const filtered = useMemo(() => {
    const fromTs = dateFrom ? new Date(dateFrom).getTime() : null;
    const toTs = dateTo ? new Date(dateTo).getTime() : null;
    return logs.filter(l => {
      if (actionFilter !== 'all' && l.actionType !== actionFilter) return false;
      const ts = new Date(l.createdAt).getTime();
      if (fromTs && ts < fromTs) return false;
      if (toTs && ts > toTs) return false;
      if (actorSearch) {
        const actor = l.actorUserId ? userMap.get(l.actorUserId) : null;
        const name = actor?.displayName || actor?.email || (l.actorUserId ? 'User' : 'System');
        if (!name.toLowerCase().includes(actorSearch.toLowerCase())) return false;
      }
      return true;
    });
  }, [logs, actionFilter, dateFrom, dateTo, actorSearch, userMap]);

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / perPage));
  const currentPage = Math.min(page, totalPages - 1);
  const pageItems = filtered.slice(currentPage * perPage, (currentPage + 1) * perPage);

  const actorLabel = (userId: string | null) => {
    if (!userId) return 'System';
    const u = userMap.get(userId);
    return u?.displayName || u?.email || userId.slice(0, 8);
  };

  const exportCsv = () => {
    const rows = [
      ['Time', 'Actor', 'Action', 'Resource', 'Subject', 'Details'],
      ...filtered.map(l => [
        l.createdAt,
        actorLabel(l.actorUserId),
        l.actionType,
        `${l.resourceType || ''}:${l.resourceId || ''}`,
        l.subjectUserId ? (userMap.get(l.subjectUserId)?.displayName || userMap.get(l.subjectUserId)?.email || l.subjectUserId) : '',
        l.reason || JSON.stringify(l.metadata || {})
      ])
    ];
    const csv = rows.map(r => r.map(v => typeof v === 'string' && v.includes(',') ? `"${v.replaceAll('"', '""')}"` : String(v ?? '')).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'audit_logs.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const reload = () => {
    setLoading(true);
    setError(null);
    apiFetch<AuditLog[]>(`/api/v1/admin/audit/logs?limit=500`).then(data => {
      const normalized = (data || []).map(l => ({ ...l, createdAt: typeof l.createdAt === 'string' ? l.createdAt : new Date(l.createdAt as any).toISOString() }));
      setLogs(normalized);
    }).catch(() => setError('Failed to load audit logs')).finally(() => setLoading(false));
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-800">Audit Log</h1>
        <p className="text-slate-500 mt-1">Searchable history of all platform activity</p>
      </div>

      <Card className="bg-white border border-slate-200">
        <CardContent className="p-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-end">
              <div>
                <label className="text-xs text-slate-500">Action Type</label>
                <select value={actionFilter} onChange={e => { setActionFilter(e.target.value); setPage(0); }} className="mt-1 w-48 border-slate-300 rounded-md text-sm">
                  <option value="all">All</option>
                  {AUDIT_ACTIONS.map(a => <option key={a} value={a}>{a}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-500">Date From</label>
                <Input type="date" value={dateFrom} onChange={e => { setDateFrom(e.target.value); setPage(0); }} className="mt-1 w-44" />
              </div>
              <div>
                <label className="text-xs text-slate-500">Date To</label>
                <Input type="date" value={dateTo} onChange={e => { setDateTo(e.target.value); setPage(0); }} className="mt-1 w-44" />
              </div>
              <div>
                <label className="text-xs text-slate-500">Actor search</label>
                <div className="mt-1 flex items-center gap-2">
                  <Input placeholder="Name or email" value={actorSearch} onChange={e => { setActorSearch(e.target.value); setPage(0); }} className="w-60" />
                  <Button variant="secondary" onClick={() => setPage(0)} className="hidden md:inline-flex"><Search className="w-4 h-4 mr-1"/>Search</Button>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-sm text-slate-500">Total: <span className="font-medium text-slate-700">{total}</span> entries</div>
              <div className="flex items-center gap-2 text-sm">
                <span className="text-slate-500">Per page:</span>
                <select value={perPage} onChange={e => { setPerPage(parseInt(e.target.value)); setPage(0); }} className="border-slate-300 rounded-md">
                  {[25,50,100].map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
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
          <button onClick={reload} className="mt-3 text-sm text-red-700 underline">Try again</button>
        </div>
      )}

      {!loading && !error && pageItems.length === 0 && (
        <div className="bg-white border border-slate-200 rounded-xl p-12 text-center">
          <ClipboardList className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-sm font-medium text-slate-500">No audit entries found</p>
          <p className="text-xs text-slate-400 mt-1">Matching your current filters</p>
        </div>
      )}

      {!loading && !error && pageItems.length > 0 && (
        <div className="overflow-x-auto -mx-4 md:mx-0">
          <div className="inline-block min-w-full align-middle">
            <table className="min-w-full bg-white border border-slate-200 rounded-xl overflow-hidden">
            <thead className="bg-slate-50 text-slate-600 text-xs uppercase">
              <tr>
                <th className="px-4 py-3 text-left">Time</th>
                <th className="px-4 py-3 text-left">Actor</th>
                <th className="px-4 py-3 text-left">Action</th>
                <th className="px-4 py-3 text-left">Resource</th>
                <th className="px-4 py-3 text-left">Subject</th>
                <th className="px-4 py-3 text-left">Details</th>
              </tr>
            </thead>
            <tbody className="text-sm text-slate-700">
              {pageItems.map((l) => {
                const actor = l.actorUserId ? (userMap.get(l.actorUserId)) : null;
                const subject = l.subjectUserId ? (userMap.get(l.subjectUserId)) : null;
                const isExpanded = expandedRowId === l.id;
                const resourceLabel = `${l.resourceType ?? ''} ${l.resourceId ? '#' + (l.resourceId.length > 10 ? l.resourceId.slice(0, 10) + '…' : l.resourceId) : ''}`.trim();
                return (
                  <>
                    <tr key={l.id} className="border-t border-slate-100 hover:bg-slate-50/50">
                      <td className="px-4 py-3 align-top">
                        <span title={new Date(l.createdAt).toISOString()}>{relativeTime(l.createdAt)}</span>
                      </td>
                      <td className="px-4 py-3 align-top">
                        {l.actorUserId ? (
                          <Link className="text-blue-600 hover:underline" href={`/admin/users/${l.actorUserId}`}>{actor?.displayName || actor?.email || l.actorUserId.slice(0,8)}</Link>
                        ) : (
                          <span className="text-slate-500">System</span>
                        )}
                      </td>
                      <td className="px-4 py-3 align-top">
                        <Badge variant="outline" className={`font-medium ${actionBadgeClasses(l.actionType)}`}>{l.actionType}</Badge>
                      </td>
                      <td className="px-4 py-3 align-top">
                        <span className="text-slate-700" title={`${l.resourceType || ''}:${l.resourceId || ''}`}>{resourceLabel || '—'}</span>
                      </td>
                      <td className="px-4 py-3 align-top">
                        {l.subjectUserId ? (
                          <Link className="text-blue-600 hover:underline" href={`/admin/users/${l.subjectUserId}`}>{subject?.displayName || subject?.email || l.subjectUserId.slice(0,8)}</Link>
                        ) : <span className="text-slate-400">—</span>}
                      </td>
                      <td className="px-4 py-3 align-top">
                        <button className="text-blue-600 hover:underline inline-flex items-center" onClick={() => setExpandedRowId(isExpanded ? null : l.id)}>
                          <span className="mr-1">View</span> {isExpanded ? <ChevronUp className="w-4 h-4"/> : <ChevronDown className="w-4 h-4"/>}
                        </button>
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr className="bg-slate-50/60">
                        <td colSpan={6} className="px-4 py-3">
                          <pre className="text-xs text-slate-700 whitespace-pre-wrap break-words bg-white border border-slate-200 rounded-md p-3 overflow-auto max-h-64">{JSON.stringify(l.metadata || { reason: l.reason, ip: l.ipAddress }, null, 2)}</pre>
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
            </tbody>
            </table>
          </div>
        </div>
      )}

      {!loading && !error && total > 0 && (
        <div className="flex items-center justify-between text-sm text-slate-600">
          <div>Page {currentPage + 1} of {totalPages}</div>
          <div className="flex items-center gap-2">
            <Button variant="outline" disabled={currentPage === 0} onClick={() => setPage(p => Math.max(0, p - 1))}>
              <ChevronLeft className="w-4 h-4 mr-1"/> Prev
            </Button>
            <Button variant="outline" disabled={currentPage >= totalPages - 1} onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}>
              Next <ChevronRight className="w-4 h-4 ml-1"/>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
