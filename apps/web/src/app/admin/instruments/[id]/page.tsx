"use client";

import { useEffect, useState, use } from "react";
import { api } from "@/lib/api";

export default function InstrumentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [instrument, setInstrument] = useState<any>(null);
  const [versions, setVersions] = useState<any[]>([]);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      // Assuming routes exist for these
      const [inst, vers] = await Promise.all([
        api.get<any>(`/api/v1/instruments/${id}`),
        api.get<any[]>(`/api/v1/instruments/${id}/versions`),
      ]);
      setInstrument(inst);
      setVersions(vers);
    } catch (e: any) {
      setError(e?.message || "Failed to load instrument details");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [id]);

  if (loading) return <div className="p-6">Loading...</div>;
  if (error) return <div className="p-6 text-red-600">{error}</div>;

  return (
    <div className="p-6 space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">{instrument.name}</h1>
          <p className="text-gray-500">{instrument.slug}</p>
        </div>
        <button className="bg-blue-600 text-white px-4 py-2 rounded">
          New Version
        </button>
      </div>

      <div className="space-y-4">
        <h2 className="text-xl font-bold">Versions</h2>
        <table className="w-full border">
          <thead className="bg-gray-50">
            <tr>
              <th className="p-2 border">#</th>
              <th className="p-2 border">Items</th>
              <th className="p-2 border">Scoring Strategy</th>
              <th className="p-2 border">Published</th>
              <th className="p-2 border">Actions</th>
            </tr>
          </thead>
          <tbody>
            {versions.map((v) => (
              <tr key={v.id}>
                <td className="p-2 border">{v.versionNumber}</td>
                <td className="p-2 border">{v.itemCount}</td>
                <td className="p-2 border">{v.scoringStrategyKey}</td>
                <td className="p-2 border">{v.publishedAt ? new Date(v.publishedAt).toLocaleDateString() : "Draft"}</td>
                <td className="p-2 border">
                  <button className="text-blue-600 mr-2">Edit Items</button>
                  <button className="text-slate-600">Config</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
