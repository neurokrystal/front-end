"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api";

type PartnerOrg = { id: string; name: string; commissionRateBps: number; contactEmail?: string | null };
type ReferralCode = { id: string; code: string; partnerOrgId?: string | null; isActive: boolean; createdAt: string; revenueCents?: number };
type Attribution = { id: string; createdAt: string; referralCode?: string; buyerName?: string; productName?: string; amountCents?: number };

export default function PartnerDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const partnerId = params?.id as string;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [partner, setPartner] = useState<PartnerOrg | null>(null);
  const [codes, setCodes] = useState<ReferralCode[]>([]);
  const [attributions, setAttributions] = useState<Attribution[]>([]);

  function pctFromBps(bps: number) {
    return (bps / 100).toFixed(1) + "%";
  }
  function money(cents?: number) {
    if (typeof cents !== "number") return "—";
    return (cents / 100).toLocaleString(undefined, { style: "currency", currency: "USD" });
  }

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const p = await fetchAdminFirst<PartnerOrg>(`/api/v1/admin/partner-orgs/${partnerId}`, async () => {
          // Fallback: try list then find
          const list = await fetchAdminFirst<PartnerOrg[]>(`/api/v1/admin/partner-orgs`, async () => []);
          return list.find((x) => x.id === partnerId) || null as any;
        });
        const rcs = await fetchAdminFirst<ReferralCode[]>("/api/v1/admin/referral-codes", async () => []);
        const atts = await fetchAdminFirst<Attribution[]>("/api/v1/admin/attributions", async () => []);
        setPartner(p);
        setCodes(rcs || []);
        setAttributions(atts || []);
      } catch (e: any) {
        setError(e?.message || "Failed to load partner");
      } finally {
        setLoading(false);
      }
    }
    if (partnerId) load();
  }, [partnerId]);

  const partnerCodes = useMemo(() => (codes || []).filter((c) => (c.partnerOrgId || "") === partnerId), [codes, partnerId]);
  const codeSet = useMemo(() => new Set(partnerCodes.map((c) => c.code)), [partnerCodes]);
  const partnerAtts = useMemo(() => (attributions || []).filter((a) => a.referralCode && codeSet.has(a.referralCode)), [attributions, codeSet]);

  const revenueByCode: Record<string, number> = useMemo(() => {
    const map: Record<string, number> = {};
    for (const c of partnerCodes) if (typeof c.revenueCents === "number") map[c.code] = c.revenueCents;
    for (const a of partnerAtts) if (a.referralCode && typeof a.amountCents === "number") map[a.referralCode] = (map[a.referralCode] || 0) + a.amountCents;
    return map;
  }, [partnerCodes, partnerAtts]);

  const totalRevenue = useMemo(() => partnerCodes.reduce((s, c) => s + (revenueByCode[c.code] || 0), 0), [partnerCodes, revenueByCode]);
  const commissionCents = useMemo(() => Math.round(totalRevenue * (partner?.commissionRateBps || 0) / 10000), [totalRevenue, partner?.commissionRateBps]);

  if (loading) return <div className="p-6">Loading partner...</div>;
  if (error) return <div className="p-6 text-red-600">{error}</div>;
  if (!partner) return <div className="p-6">Partner not found</div>;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/admin/partner-orgs" className="text-sm text-blue-600 hover:underline">← Back to Partners</Link>
      </div>

      <div>
        <h1 className="text-2xl font-semibold text-slate-900">{partner.name} Referrals</h1>
        <p className="text-sm text-slate-600">{partner.contactEmail || "—"} · Commission: {pctFromBps(partner.commissionRateBps)}</p>
      </div>

      {/* Summary */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="grid grid-cols-2 md:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-slate-100">
          <SummaryItem label="Total Revenue" value={money(totalRevenue)} />
          <SummaryItem label="Commission" value={money(commissionCents)} />
          <SummaryItem label="Active Codes" value={partnerCodes.filter(c => c.isActive).length.toString()} />
          <SummaryItem label="Attributions" value={partnerAtts.length.toString()} />
        </div>
      </div>

      {/* Codes table */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Referral Codes</h2>
        <Button onClick={() => router.push('/admin/referral-codes')}>+ Add Code</Button>
      </div>
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr className="text-left">
              <th className="px-4 py-3 font-medium">CODE</th>
              <th className="px-4 py-3 font-medium">STATUS</th>
              <th className="px-4 py-3 font-medium">USES</th>
              <th className="px-4 py-3 font-medium">REVENUE</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {partnerCodes.length === 0 && (
              <tr><td className="px-4 py-6 text-slate-500" colSpan={4}>No codes</td></tr>
            )}
            {partnerCodes.map((c) => {
              const uses = 0; // Unknown without richer attribution data per code
              const revenue = revenueByCode[c.code];
              return (
                <tr key={c.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-mono">{c.code}</td>
                  <td className="px-4 py-3">{c.isActive ? "Active" : "Inactive"}</td>
                  <td className="px-4 py-3 tabular-nums">{uses}</td>
                  <td className="px-4 py-3 tabular-nums">{money(revenue)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Attribution history */}
      <h2 className="text-lg font-semibold">Attribution History</h2>
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr className="text-left">
              <th className="px-4 py-3 font-medium">DATE</th>
              <th className="px-4 py-3 font-medium">BUYER</th>
              <th className="px-4 py-3 font-medium">PRODUCT</th>
              <th className="px-4 py-3 font-medium">AMOUNT</th>
              <th className="px-4 py-3 font-medium">COMMISSION</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {partnerAtts.length === 0 && (
              <tr><td className="px-4 py-6 text-slate-500" colSpan={5}>No attributions</td></tr>
            )}
            {partnerAtts.map((a) => {
              const amount = a.amountCents;
              const commission = typeof amount === 'number' ? Math.round(amount * (partner!.commissionRateBps) / 10000) : undefined;
              const date = new Date(a.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
              return (
                <tr key={a.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">{date}</td>
                  <td className="px-4 py-3">{a.buyerName || "—"}</td>
                  <td className="px-4 py-3">{a.productName || "—"}</td>
                  <td className="px-4 py-3 tabular-nums">{money(amount)}</td>
                  <td className="px-4 py-3 tabular-nums">{money(commission)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-4">
      <div className="text-xs text-slate-500 uppercase tracking-wide">{label}</div>
      <div className="text-lg font-semibold tabular-nums">{value}</div>
    </div>
  );
}

async function fetchAdminFirst<T>(adminPath: string, fallback: () => Promise<T>): Promise<T> {
  try {
    return await apiFetch<T>(adminPath);
  } catch {
    return await fallback();
  }
}
