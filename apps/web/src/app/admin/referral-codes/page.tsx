"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { api, apiFetch } from "@/lib/api";

type ReferralCode = {
  id: string;
  code: string;
  isActive: boolean;
  usageCount?: number;
  createdAt: string;
  partnerOrgId?: string | null;
  resellerUserName?: string | null;
  partnerName?: string | null;
  revenueCents?: number; // admin endpoint may provide this; if not, we'll show "—"
};

type Attribution = {
  id: string;
  purchaseId: string;
  attributionType: string;
  createdAt: string;
  referralCode?: string; // if present we can join; not available in current DTO
  amountCents?: number; // only if admin endpoint supports
};

type PartnerOrg = { id: string; name: string; commissionRateBps: number };

export default function AdminReferralCodesPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [codes, setCodes] = useState<ReferralCode[]>([]);
  const [attributions, setAttributions] = useState<Attribution[]>([]);
  const [partners, setPartners] = useState<PartnerOrg[]>([]);

  // Filters
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [partnerFilter, setPartnerFilter] = useState<string>("");
  const [search, setSearch] = useState("");

  // Create modal
  const [showCreate, setShowCreate] = useState(false);
  const [createCode, setCreateCode] = useState<string>(suggestCode());
  const [createActive, setCreateActive] = useState(true);
  const [createPartner, setCreatePartner] = useState<string>("");
  const [creating, setCreating] = useState(false);

  function formatMoney(cents?: number) {
    if (typeof cents !== "number") return "—";
    const dollars = cents / 100;
    return dollars.toLocaleString(undefined, { style: "currency", currency: "USD" });
  }

  function formatMonth(dateStr: string) {
    const d = new Date(dateStr);
    return d.toLocaleString(undefined, { month: "short", year: "numeric" });
  }

  async function load() {
    setLoading(true);
    setError(null);
    try {
      // Try admin endpoints first for wide visibility
      const [codesData, partnersData, atts] = await Promise.all([
        fetchAdminFirst<ReferralCode[]>("/api/v1/admin/referral-codes", async () => api.commercial.getReferralCodes()),
        fetchAdminFirst<PartnerOrg[]>("/api/v1/admin/partner-orgs", async () => []),
        // Fallback to reseller-scoped attributions if admin is unavailable
        fetchAdminFirst<Attribution[]>("/api/v1/admin/attributions", async () => api.commercial.getAttributions()),
      ]);
      setCodes((codesData || []).sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
      setPartners(partnersData || []);
      setAttributions(atts || []);
    } catch (e: any) {
      setError(e?.message || "Failed to load referral codes");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    let list = [...codes];
    if (statusFilter !== "all") {
      list = list.filter((c) => (statusFilter === "active" ? c.isActive : !c.isActive));
    }
    if (partnerFilter) {
      list = list.filter((c) => (c.partnerOrgId || "") === partnerFilter);
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((c) => c.code.toLowerCase().includes(q));
    }
    return list;
  }, [codes, statusFilter, partnerFilter, search]);

  const usesByCode: Record<string, number> = useMemo(() => {
    // Prefer usageCount from API when available; otherwise count attributions per code when data present
    const base: Record<string, number> = {};
    for (const c of codes) {
      if (typeof c.usageCount === "number") base[c.code] = c.usageCount;
    }
    for (const a of attributions) {
      if (a.referralCode) base[a.referralCode] = (base[a.referralCode] || 0) + 1;
    }
    return base;
  }, [codes, attributions]);

  const revenueByCode: Record<string, number | undefined> = useMemo(() => {
    const map: Record<string, number> = {};
    for (const c of codes) {
      if (typeof c.revenueCents === "number") map[c.code] = c.revenueCents;
    }
    for (const a of attributions) {
      if (a.referralCode && typeof a.amountCents === "number") {
        map[a.referralCode] = (map[a.referralCode] || 0) + a.amountCents;
      }
    }
    return map;
  }, [codes, attributions]);

  async function onCreate() {
    setCreating(true);
    try {
      // Current public API supports only POST /commercial/referral-codes with optional code
      const created = await api.commercial.createReferralCode(createCode || undefined);
      setCodes((prev) => [created as ReferralCode, ...prev]);
      setShowCreate(false);
      // Reset
      setCreateCode(suggestCode());
      setCreateActive(true);
      setCreatePartner("");
    } catch (e: any) {
      setError(e?.message || "Failed to create referral code");
    } finally {
      setCreating(false);
    }
  }

  async function toggleActive(code: ReferralCode) {
    // Optimistic toggle; try admin endpoint if present
    const optimistic = { ...code, isActive: !code.isActive };
    setCodes((prev) => prev.map((c) => (c.id === code.id ? optimistic : c)));
    try {
      await apiFetch(`/api/v1/admin/referral-codes/${code.id}`, {
        method: "PUT",
        body: JSON.stringify({ isActive: optimistic.isActive }),
      });
    } catch {
      // Revert if failed
      setCodes((prev) => prev.map((c) => (c.id === code.id ? code : c)));
      setError("Server does not support updating referral code status yet");
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Referral Codes</h1>
        <p className="text-sm text-slate-600">Track referral code usage and attribution</p>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap gap-3 items-center">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as any)}
          className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm"
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>

        <select
          value={partnerFilter}
          onChange={(e) => setPartnerFilter(e.target.value)}
          className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm min-w-[14rem]"
        >
          <option value="">All Partners</option>
          {partners.map((p) => (
            <option value={p.id} key={p.id}>{p.name}</option>
          ))}
        </select>

        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search code..."
          className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm flex-1 min-w-[200px]"
        />

        <div className="flex-1" />
        <Button onClick={() => setShowCreate(true)}>+ Create Code</Button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr className="text-left">
              <th className="px-4 py-3 font-medium">CODE</th>
              <th className="px-4 py-3 font-medium">PARTNER / RESELLER</th>
              <th className="px-4 py-3 font-medium">STATUS</th>
              <th className="px-4 py-3 font-medium">USES</th>
              <th className="px-4 py-3 font-medium">REVENUE</th>
              <th className="px-4 py-3 font-medium">CREATED</th>
              <th className="px-4 py-3 font-medium">ACTIONS</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {loading && (
              <tr><td className="px-4 py-6 text-slate-500" colSpan={7}>Loading...</td></tr>
            )}
            {!loading && filtered.length === 0 && (
              <tr><td className="px-4 py-6 text-slate-500" colSpan={7}>No referral codes found</td></tr>
            )}
            {filtered.map((c) => (
              <tr key={c.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 font-mono">{c.code}</td>
                <td className="px-4 py-3">
                  <div className="text-slate-900">{c.partnerName || c.resellerUserName || "(direct/internal)"}</div>
                  <div className="text-xs text-slate-500">{c.partnerName ? "Partner" : c.resellerUserName ? "Reseller" : "—"}</div>
                </td>
                <td className="px-4 py-3">
                  {c.isActive ? (
                    <span className="inline-flex items-center gap-1 text-emerald-700"><span className="w-2 h-2 rounded-full bg-emerald-500" /> Active</span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-slate-500"><span className="w-2 h-2 rounded-full bg-slate-400" /> Inactive</span>
                  )}
                </td>
                <td className="px-4 py-3 tabular-nums">{usesByCode[c.code] ?? c.usageCount ?? 0}</td>
                <td className="px-4 py-3 tabular-nums">{formatMoney(revenueByCode[c.code] ?? c.revenueCents)}</td>
                <td className="px-4 py-3">{formatMonth(c.createdAt)}</td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => toggleActive(c)}
                    className="px-2.5 py-1.5 text-xs rounded border border-slate-300 hover:bg-slate-100"
                    title="Toggles code active status (requires admin API)"
                  >
                    {c.isActive ? "Deactivate" : "Reactivate"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {error && (
        <div className="text-sm text-red-600">{error}</div>
      )}

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowCreate(false)} />
          <div className="absolute inset-0 flex items-center justify-center p-6">
            <div className="w-full max-w-lg bg-white rounded-xl shadow-xl border border-slate-200 p-6 space-y-4">
              <h3 className="text-lg font-semibold">Create Referral Code</h3>
              <div className="space-y-1">
                <label className="text-xs text-slate-500">Code</label>
                <input value={createCode} onChange={(e) => setCreateCode(e.target.value)} className="w-full h-10 rounded-lg border border-slate-200 px-3" />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-slate-500">Partner Org (optional)</label>
                <select value={createPartner} onChange={(e) => setCreatePartner(e.target.value)} className="w-full h-10 rounded-lg border border-slate-200 px-3">
                  <option value="">None</option>
                  {partners.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-2">
                <input id="rc-active" type="checkbox" checked={createActive} onChange={(e) => setCreateActive(e.target.checked)} />
                <label htmlFor="rc-active" className="text-sm">Active</label>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button className="px-3 py-2 text-sm rounded border" onClick={() => setShowCreate(false)}>Cancel</button>
                <Button onClick={onCreate} disabled={creating}>{creating ? "Creating..." : "Create Code"}</Button>
              </div>
              <p className="text-xs text-slate-500">Note: Current API supports code creation only; partner assignment and active flag may require admin API.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function suggestCode() {
  const y = new Date().getFullYear();
  const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `PROMO-${y}-${suffix}`;
}

async function fetchAdminFirst<T>(adminPath: string, fallback: () => Promise<T>): Promise<T> {
  try {
    return await apiFetch<T>(adminPath);
  } catch (e: any) {
    // If admin route not available, use fallback
    return await fallback();
  }
}
