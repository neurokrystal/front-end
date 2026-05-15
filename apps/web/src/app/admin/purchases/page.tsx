"use client";

import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ChevronLeft, ChevronRight, Download, CreditCard } from "lucide-react";

type Purchase = {
  id: string;
  buyerUserId: string;
  purchaseType: string;
  status: 'pending' | 'completed' | 'refunded' | 'failed';
  amountCents: number;
  currency: string;
  externalTransactionId?: string | null;
  quantity?: number | null;
  referralCode?: string | null;
  metadata?: any;
  createdAt: string;
  completedAt?: string | null;
};

type UserSummary = { id: string; email: string; displayName?: string };

const statusBadge = (s: Purchase['status']) => {
  const map: Record<Purchase['status'], string> = {
    completed: 'bg-green-50 text-green-700 border-green-200',
    pending: 'bg-amber-50 text-amber-700 border-amber-200',
    failed: 'bg-red-50 text-red-700 border-red-200',
    refunded: 'bg-slate-100 text-slate-600 border-slate-200',
  };
  return map[s] || 'bg-slate-50 text-slate-700 border-slate-200';
};

const currency = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

function typeLabel(p: Purchase): string {
  const qty = p.quantity ?? p.metadata?.seats;
  const map: Record<string, string> = {
    individual_assessment: 'Individual Assessment',
    org_seat_bundle: `Org Seat Bundle${qty ? ` (${qty})` : ''}`,
    leader_adapted_report: 'Leader Adapted Report',
    professional_self: 'Secondary (Prof Self)',
    under_pressure: 'Under Pressure',
    relationship_patterns: 'Relationship Patterns',
    career_alignment: 'Career Alignment',
    wellbeing: 'Wellbeing',
    relational_compass: 'Relational Compass',
    collaboration_compass: 'Collaboration Compass',
    family_compass: 'Family Compass',
  };
  return map[p.purchaseType] || p.purchaseType;
}

export default function PurchasesPage() {
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [users, setUsers] = useState<UserSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | Purchase['status']>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [buyerSearch, setBuyerSearch] = useState('');

  const [page, setPage] = useState(0);
  const [perPage, setPerPage] = useState(50);

  const [selected, setSelected] = useState<Purchase | null>(null);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    const load = async () => {
      try {
        const data = await apiFetch<Purchase[]>(`/api/v1/admin/purchases?limit=200`);
        if (mounted) setPurchases((data || []).map(p => ({ ...p, createdAt: String((p as any).createdAt) })));
        if (mounted) setError(null);
      } catch (e) {
        if (mounted) setError('Failed to load purchases');
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    apiFetch<UserSummary[]>(`/api/v1/admin/users?limit=200&offset=0`).then(setUsers).catch(() => {});
    return () => { mounted = false; };
  }, []);

  const userMap = useMemo(() => {
    const m = new Map<string, UserSummary>();
    users.forEach(u => m.set(u.id, u));
    return m;
  }, [users]);

  const filtered = useMemo(() => {
    const fromTs = dateFrom ? new Date(dateFrom).getTime() : null;
    const toTs = dateTo ? new Date(dateTo).getTime() : null;
    return purchases.filter(p => {
      if (typeFilter !== 'all' && p.purchaseType !== typeFilter) return false;
      if (statusFilter !== 'all' && p.status !== statusFilter) return false;
      const ts = new Date(p.createdAt).getTime();
      if (fromTs && ts < fromTs) return false;
      if (toTs && ts > toTs) return false;
      if (buyerSearch) {
        const u = userMap.get(p.buyerUserId);
        const name = u?.displayName || u?.email || '';
        if (!name.toLowerCase().includes(buyerSearch.toLowerCase())) return false;
      }
      return true;
    });
  }, [purchases, typeFilter, statusFilter, dateFrom, dateTo, buyerSearch, userMap]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const pageItems = filtered.slice(page * perPage, (page + 1) * perPage);

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  const monthRevenue = filtered
    .filter(p => p.status === 'completed' && new Date(p.createdAt).getTime() >= startOfMonth)
    .reduce((sum, p) => sum + (p.amountCents || 0), 0) / 100;
  const totalRevenue = filtered
    .filter(p => p.status === 'completed')
    .reduce((sum, p) => sum + (p.amountCents || 0), 0) / 100;
  const txCount = filtered.length;

  const typeOptions = useMemo(() => {
    const set = new Set<string>(purchases.map(p => p.purchaseType));
    return Array.from(set).sort();
  }, [purchases]);

  const exportCsv = () => {
    const rows = [
      ['Buyer', 'Type', 'Amount', 'Status', 'Referral', 'Date', 'ExternalRef', 'ID'],
      ...filtered.map(p => {
        const buyer = userMap.get(p.buyerUserId);
        return [
          buyer?.displayName || buyer?.email || p.buyerUserId,
          typeLabel(p),
          (p.amountCents / 100).toFixed(2),
          p.status,
          p.referralCode || '—',
          new Date(p.createdAt).toISOString(),
          p.externalTransactionId || '',
          p.id,
        ];
      })
    ];
    const csv = rows.map(r => r.map(v => typeof v === 'string' && v.includes(',') ? `"${v.replaceAll('"','""')}"` : String(v ?? '')).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'purchases.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-800">Purchases</h1>
        <p className="text-slate-500 mt-1">All transactions across the platform</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-white border border-slate-200"><CardContent className="p-4">
          <div className="text-xs text-slate-500">Revenue this month</div>
          <div className="text-xl font-semibold text-slate-800">{currency.format(monthRevenue)}</div>
        </CardContent></Card>
        <Card className="bg-white border border-slate-200"><CardContent className="p-4">
          <div className="text-xs text-slate-500">Total</div>
          <div className="text-xl font-semibold text-slate-800">{currency.format(totalRevenue)}</div>
        </CardContent></Card>
        <Card className="bg-white border border-slate-200"><CardContent className="p-4">
          <div className="text-xs text-slate-500">Transactions</div>
          <div className="text-xl font-semibold text-slate-800">{txCount}</div>
        </CardContent></Card>
      </div>

      <Card className="bg-white border border-slate-200">
        <CardContent className="p-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-end">
              <div>
                <label className="text-xs text-slate-500">Type</label>
                <select value={typeFilter} onChange={e => { setTypeFilter(e.target.value); setPage(0); }} className="mt-1 w-52 border-slate-300 rounded-md text-sm">
                  <option value="all">All</option>
                  {typeOptions.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-500">Status</label>
                <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value as any); setPage(0); }} className="mt-1 w-40 border-slate-300 rounded-md text-sm">
                  <option value="all">All</option>
                  <option value="completed">Complete</option>
                  <option value="pending">Pending</option>
                  <option value="failed">Failed</option>
                  <option value="refunded">Refunded</option>
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
                <label className="text-xs text-slate-500">Search</label>
                <Input placeholder="Buyer name or email" value={buyerSearch} onChange={e => { setBuyerSearch(e.target.value); setPage(0); }} className="mt-1 w-60" />
              </div>
            </div>
            <div className="flex items-center gap-3">
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
          <button onClick={() => location.reload()} className="mt-3 text-sm text-red-700 underline">Try again</button>
        </div>
      )}

      {!loading && !error && pageItems.length === 0 && (
        <div className="bg-white border border-slate-200 rounded-xl p-12 text-center">
          <CreditCard className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-sm font-medium text-slate-500">No purchases found</p>
          <p className="text-xs text-slate-400 mt-1">Matching your current filters</p>
        </div>
      )}

      {!loading && !error && pageItems.length > 0 && (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white border border-slate-200 rounded-xl overflow-hidden">
            <thead className="bg-slate-50 text-slate-600 text-xs uppercase">
              <tr>
                <th className="px-4 py-3 text-left">Buyer</th>
                <th className="px-4 py-3 text-left">Type</th>
                <th className="px-4 py-3 text-left">Amount</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Referral</th>
                <th className="px-4 py-3 text-left">Date</th>
                <th className="px-4 py-3 text-left">Actions</th>
              </tr>
            </thead>
            <tbody className="text-sm text-slate-700">
              {pageItems.map(p => {
                const buyer = userMap.get(p.buyerUserId);
                const buyerLabel = buyer?.displayName || buyer?.email || p.buyerUserId.slice(0,8);
                return (
                  <tr key={p.id} className="border-t border-slate-100 hover:bg-slate-50/50">
                    <td className="px-4 py-3">{buyerLabel}</td>
                    <td className="px-4 py-3">{typeLabel(p)}</td>
                    <td className="px-4 py-3">{currency.format((p.amountCents || 0)/100)}</td>
                    <td className="px-4 py-3"><Badge variant="outline" className={`font-medium ${statusBadge(p.status)}`}>{p.status === 'completed' ? 'Complete' : p.status.charAt(0).toUpperCase() + p.status.slice(1)}</Badge></td>
                    <td className="px-4 py-3">{p.referralCode || '—'}</td>
                    <td className="px-4 py-3">{new Date(p.createdAt).toLocaleDateString()}</td>
                    <td className="px-4 py-3"><Button variant="ghost" onClick={() => setSelected(p)}>View</Button></td>
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

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Purchase Details</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <div className="text-slate-500">Buyer</div>
                  <div className="font-medium">{userMap.get(selected.buyerUserId)?.displayName || userMap.get(selected.buyerUserId)?.email || selected.buyerUserId}</div>
                </div>
                <div>
                  <div className="text-slate-500">Type</div>
                  <div className="font-medium">{typeLabel(selected)}</div>
                </div>
                <div>
                  <div className="text-slate-500">Amount</div>
                  <div className="font-medium">{currency.format((selected.amountCents || 0)/100)}</div>
                </div>
                <div>
                  <div className="text-slate-500">Status</div>
                  <div className="font-medium capitalize">{selected.status}</div>
                </div>
                <div>
                  <div className="text-slate-500">Referral</div>
                  <div className="font-medium">{selected.referralCode || '—'}</div>
                </div>
                <div>
                  <div className="text-slate-500">Provider Ref</div>
                  <div className="font-medium">{selected.externalTransactionId || '—'}</div>
                </div>
              </div>
              <div>
                <div className="text-slate-500 text-sm mb-1">Raw Record</div>
                <pre className="text-xs text-slate-700 whitespace-pre-wrap break-words bg-white border border-slate-200 rounded-md p-3 overflow-auto max-h-64">{JSON.stringify(selected, null, 2)}</pre>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
