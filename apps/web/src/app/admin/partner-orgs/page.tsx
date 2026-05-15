"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { api, apiFetch } from "@/lib/api";

type PartnerOrg = { id: string; name: string; commissionRateBps: number; contactEmail?: string | null; notes?: string | null };
type ReferralCode = { id: string; code: string; partnerOrgId?: string | null; isActive: boolean; createdAt: string; revenueCents?: number };
type Attribution = { id: string; createdAt: string; referralCode?: string; amountCents?: number };

export default function PartnerOrgsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [partners, setPartners] = useState<PartnerOrg[]>([]);
  const [codes, setCodes] = useState<ReferralCode[]>([]);
  const [attributions, setAttributions] = useState<Attribution[]>([]);

  // Create/Edit modals
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newRateBps, setNewRateBps] = useState<number>(1000);
  const [newNotes, setNewNotes] = useState("");
  const [creating, setCreating] = useState(false);

  const [editing, setEditing] = useState<PartnerOrg | null>(null);
  const [editEmail, setEditEmail] = useState("");
  const [editRateBps, setEditRateBps] = useState<number>(1000);
  const [savingEdit, setSavingEdit] = useState(false);

  function pctFromBps(bps: number) {
    return (bps / 100).toFixed(1) + "%";
  }
  function money(cents?: number) {
    if (typeof cents !== "number") return "—";
    return (cents / 100).toLocaleString(undefined, { style: "currency", currency: "USD" });
  }

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [pos, rcs, atts] = await Promise.all([
        fetchAdminFirst<PartnerOrg[]>("/api/v1/admin/partner-orgs", async () => []),
        fetchAdminFirst<ReferralCode[]>("/api/v1/admin/referral-codes", async () => api.commercial.getReferralCodes()),
        fetchAdminFirst<Attribution[]>("/api/v1/admin/attributions", async () => api.commercial.getAttributions()),
      ]);
      setPartners(pos || []);
      setCodes(rcs || []);
      setAttributions(atts || []);
    } catch (e: any) {
      setError(e?.message || "Failed to load partners");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const codesByPartner = useMemo(() => {
    const map: Record<string, ReferralCode[]> = {};
    for (const c of codes) {
      const pid = c.partnerOrgId || "";
      if (!pid) continue;
      (map[pid] ||= []).push(c);
    }
    return map;
  }, [codes]);

  const revenueByCode: Record<string, number> = useMemo(() => {
    const map: Record<string, number> = {};
    for (const c of codes) if (typeof c.revenueCents === "number") map[c.code] = c.revenueCents;
    for (const a of attributions) if (a.referralCode && typeof a.amountCents === "number") map[a.referralCode] = (map[a.referralCode] || 0) + a.amountCents;
    return map;
  }, [codes, attributions]);

  const partnerStats = useMemo(() => {
    return partners.map((p) => {
      const pcs = codesByPartner[p.id] || [];
      const codeSet = new Set(pcs.map((c) => c.code));
      const attrCount = attributions.filter((a) => a.referralCode && codeSet.has(a.referralCode)).length;
      const revenue = pcs.reduce((sum, c) => sum + (revenueByCode[c.code] || 0), 0);
      return {
        partner: p,
        codesCount: pcs.length,
        attributions: attrCount,
        revenueCents: revenue,
      };
    });
  }, [partners, codesByPartner, attributions, revenueByCode]);

  async function createPartner() {
    setCreating(true);
    try {
      const created = await apiFetch<PartnerOrg>("/api/v1/commercial/partner-orgs", {
        method: "POST",
        body: JSON.stringify({ name: newName, commissionRateBps: newRateBps }),
      });
      setPartners((prev) => [created, ...prev]);
      setShowCreate(false);
      setNewName("");
      setNewEmail("");
      setNewNotes("");
      setNewRateBps(1000);
    } catch (e: any) {
      setError(e?.message || "Failed to create partner");
    } finally {
      setCreating(false);
    }
  }

  async function saveEdit() {
    if (!editing) return;
    setSavingEdit(true);
    try {
      // Try admin update endpoint
      const updated = await apiFetch<PartnerOrg>(`/api/v1/admin/partner-orgs/${editing.id}`, {
        method: "PUT",
        body: JSON.stringify({ commissionRateBps: editRateBps, contactEmail: editEmail }),
      });
      setPartners((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
      setEditing(null);
    } catch (e: any) {
      setError("Server does not support editing partner org yet");
    } finally {
      setSavingEdit(false);
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Partner Organisations</h1>
          <p className="text-sm text-slate-600">Manage reseller and referral partners</p>
        </div>
        <Button onClick={() => setShowCreate(true)}>+ New Partner</Button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr className="text-left">
              <th className="px-4 py-3 font-medium">PARTNER</th>
              <th className="px-4 py-3 font-medium">CONTACT</th>
              <th className="px-4 py-3 font-medium">COMMISSION</th>
              <th className="px-4 py-3 font-medium">CODES</th>
              <th className="px-4 py-3 font-medium">ATTRIBUTIONS</th>
              <th className="px-4 py-3 font-medium">REVENUE</th>
              <th className="px-4 py-3 font-medium">ACTIONS</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {loading && (
              <tr><td className="px-4 py-6 text-slate-500" colSpan={7}>Loading...</td></tr>
            )}
            {!loading && partners.length === 0 && (
              <tr><td className="px-4 py-6 text-slate-500" colSpan={7}>No partners</td></tr>
            )}
            {partnerStats.map(({ partner, codesCount, attributions, revenueCents }) => (
              <tr key={partner.id} className="hover:bg-slate-50">
                <td className="px-4 py-3">{partner.name}</td>
                <td className="px-4 py-3">{(partner as any).contactEmail || "—"}</td>
                <td className="px-4 py-3">{pctFromBps(partner.commissionRateBps)}</td>
                <td className="px-4 py-3 tabular-nums">{codesCount}</td>
                <td className="px-4 py-3 tabular-nums">{attributions}</td>
                <td className="px-4 py-3 tabular-nums">{money(revenueCents)}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <Link href={`/admin/partner-orgs/${partner.id}`} className="px-2.5 py-1.5 text-xs rounded border border-slate-300 hover:bg-slate-100">View</Link>
                    <button
                      onClick={() => { setEditing(partner); setEditEmail((partner as any).contactEmail || ""); setEditRateBps(partner.commissionRateBps); }}
                      className="px-2.5 py-1.5 text-xs rounded border border-slate-300 hover:bg-slate-100"
                    >Edit</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {error && <div className="text-sm text-red-600">{error}</div>}

      {/* Create Partner Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowCreate(false)} />
          <div className="absolute inset-0 flex items-center justify-center p-6">
            <div className="w-full max-w-lg bg-white rounded-xl shadow-xl border border-slate-200 p-6 space-y-4">
              <h3 className="text-lg font-semibold">New Partner</h3>
              <div className="space-y-1">
                <label className="text-xs text-slate-500">Partner name</label>
                <input value={newName} onChange={(e) => setNewName(e.target.value)} className="w-full h-10 rounded-lg border border-slate-200 px-3" />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-slate-500">Contact email</label>
                <input value={newEmail} onChange={(e) => setNewEmail(e.target.value)} className="w-full h-10 rounded-lg border border-slate-200 px-3" />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-slate-500">Commission rate (bps)</label>
                <input type="number" value={newRateBps} onChange={(e) => setNewRateBps(parseInt(e.target.value || '0'))} className="w-full h-10 rounded-lg border border-slate-200 px-3" />
                <div className="text-xs text-slate-500">{pctFromBps(newRateBps)} of attributed revenue</div>
              </div>
              <div className="space-y-1">
                <label className="text-xs text-slate-500">Notes (optional)</label>
                <textarea value={newNotes} onChange={(e) => setNewNotes(e.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2 min-h-[80px]" />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button className="px-3 py-2 text-sm rounded border" onClick={() => setShowCreate(false)}>Cancel</button>
                <Button onClick={createPartner} disabled={creating}>{creating ? "Creating..." : "Create Partner"}</Button>
              </div>
              <p className="text-xs text-slate-500">Note: Email and notes fields require server support to persist.</p>
            </div>
          </div>
        </div>
      )}

      {/* Edit Partner Modal */}
      {editing && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/40" onClick={() => setEditing(null)} />
          <div className="absolute inset-0 flex items-center justify-center p-6">
            <div className="w-full max-w-lg bg-white rounded-xl shadow-xl border border-slate-200 p-6 space-y-4">
              <h3 className="text-lg font-semibold">Edit Partner</h3>
              <div className="space-y-1">
                <label className="text-xs text-slate-500">Contact email</label>
                <input value={editEmail} onChange={(e) => setEditEmail(e.target.value)} className="w-full h-10 rounded-lg border border-slate-200 px-3" />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-slate-500">Commission rate (bps)</label>
                <input type="number" value={editRateBps} onChange={(e) => setEditRateBps(parseInt(e.target.value || '0'))} className="w-full h-10 rounded-lg border border-slate-200 px-3" />
                <div className="text-xs text-slate-500">{pctFromBps(editRateBps)} of attributed revenue</div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button className="px-3 py-2 text-sm rounded border" onClick={() => setEditing(null)}>Cancel</button>
                <Button onClick={saveEdit} disabled={savingEdit}>{savingEdit ? "Saving..." : "Save Changes"}</Button>
              </div>
              <p className="text-xs text-slate-500">Note: Editing partner details requires admin API support.</p>
            </div>
          </div>
        </div>
      )}
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
