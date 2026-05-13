"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";

export default function PartnerDashboard() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [codes, setCodes] = useState<any[]>([]);
  const [attributions, setAttributions] = useState<any[]>([]);
  const [newCode, setNewCode] = useState<string>("");
  const [creating, setCreating] = useState(false);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [rc, att] = await Promise.all([
        api.commercial.getReferralCodes(),
        api.commercial.getAttributions(),
      ]);
      setCodes(rc);
      setAttributions(att);
    } catch (e: any) {
      setError(e?.message || "Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const createCode = async () => {
    setCreating(true);
    try {
      const created = await api.commercial.createReferralCode(newCode || undefined);
      setCodes((prev) => [created, ...prev]);
      setNewCode("");
    } catch (e: any) {
      setError(e?.message || "Failed to create referral code");
    } finally {
      setCreating(false);
    }
  };

  if (loading) return <div className="p-6">Loading partner dashboard...</div>;
  if (error) return <div className="p-6 text-red-600">{error}</div>;

  return (
    <div className="p-6 space-y-8">
      <h1 className="text-3xl font-bold">Partner Dashboard</h1>

      <section>
        <h2 className="text-xl font-semibold mb-2">Referral Codes</h2>
        <div className="flex gap-2 mb-4">
          <input
            className="border px-3 py-2 rounded w-64"
            placeholder="Custom code (optional)"
            value={newCode}
            onChange={(e) => setNewCode(e.target.value)}
          />
          <button
            className="bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50"
            onClick={createCode}
            disabled={creating}
          >
            {creating ? "Creating..." : "Create Code"}
          </button>
        </div>
        <table className="w-full text-left border">
          <thead>
            <tr className="bg-gray-50">
              <th className="p-2 border">Code</th>
              <th className="p-2 border">Active</th>
              <th className="p-2 border">Usage</th>
              <th className="p-2 border">Created</th>
            </tr>
          </thead>
          <tbody>
            {codes.map((c) => (
              <tr key={c.id}>
                <td className="p-2 border font-mono">{c.code}</td>
                <td className="p-2 border">{c.isActive ? "Yes" : "No"}</td>
                <td className="p-2 border">{c.usageCount ?? 0}</td>
                <td className="p-2 border">{new Date(c.createdAt).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section>
        <h2 className="text-xl font-semibold mb-2">Attributions</h2>
        <table className="w-full text-left border">
          <thead>
            <tr className="bg-gray-50">
              <th className="p-2 border">Attribution ID</th>
              <th className="p-2 border">Purchase</th>
              <th className="p-2 border">Type</th>
              <th className="p-2 border">Attributed</th>
            </tr>
          </thead>
          <tbody>
            {attributions.map((a) => (
              <tr key={a.id}>
                <td className="p-2 border font-mono">{a.id}</td>
                <td className="p-2 border font-mono">{a.purchaseId}</td>
                <td className="p-2 border">{a.attributionType}</td>
                <td className="p-2 border">{new Date(a.createdAt).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
