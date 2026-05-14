"use client";

import { useEffect, useState, use } from "react";
import { api } from "@/lib/api";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronLeft, Plus, Settings2, FileEdit, BadgeCheck, Clock } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function InstrumentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [instrument, setInstrument] = useState<any>(null);
  const [versions, setVersions] = useState<any[]>([]);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
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

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>;
  if (error) return <div className="p-8 bg-red-50 text-red-600 rounded-xl border border-red-100">{error}</div>;

  return (
    <div className="space-y-8 font-sans">
      <div className="flex justify-between items-start">
        <div className="space-y-1">
          <Button variant="ghost" onClick={() => router.back()} className="p-0 h-auto hover:bg-transparent text-slate-400 hover:text-slate-600 mb-2">
            <ChevronLeft className="w-4 h-4 mr-1" /> Back to Instruments
          </Button>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">{instrument.name}</h1>
            <span className="px-2 py-0.5 bg-blue-50 text-blue-700 text-[10px] font-bold uppercase tracking-wider rounded border border-blue-100">{instrument.slug}</span>
          </div>
          <p className="text-slate-500 max-w-2xl">{instrument.description}</p>
        </div>
        <Button className="shadow-sm">
          <Plus className="w-4 h-4 mr-2" /> New Version
        </Button>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Instrument Versions</h2>
        </div>
        
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Version</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Items</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Scoring Strategy</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {versions.map((v) => (
                <tr key={v.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 text-sm font-semibold text-slate-900">
                    v{v.versionNumber}
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-500">
                    {v.itemCount} Questions
                  </td>
                  <td className="px-6 py-4 text-sm font-mono text-slate-400">
                    {v.scoringStrategyKey}
                  </td>
                  <td className="px-6 py-4">
                    {v.publishedAt ? (
                      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-600">
                        <BadgeCheck className="w-3.5 h-3.5" /> Published
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-400">
                        <Clock className="w-3.5 h-3.5" /> Draft
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-700 hover:bg-blue-50">
                        <FileEdit className="w-4 h-4 mr-1.5" /> Edit Items
                      </Button>
                      <Button variant="ghost" size="sm" className="text-slate-400 hover:text-slate-600">
                        <Settings2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {versions.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                    No versions created yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
