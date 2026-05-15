"use client";

import { useEffect, useState, use } from "react";
import { api } from "@/lib/api";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronLeft, Plus, Settings2, FileEdit, BadgeCheck, Clock } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function InstrumentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [instrument, setInstrument] = useState<any>(null);
  const [versions, setVersions] = useState<any[]>([]);
  const [itemsOpen, setItemsOpen] = useState(false);
  const [itemsLoading, setItemsLoading] = useState(false);
  const [currentVid, setCurrentVid] = useState<string | null>(null);
  const [items, setItems] = useState<any[]>([]);
  const [savingItems, setSavingItems] = useState(false);

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

  const openItemsEditor = async (vid: string) => {
    setCurrentVid(vid);
    setItemsOpen(true);
    setItemsLoading(true);
    try {
      const data = await api.get<any[]>(`/api/v1/admin/instruments/${id}/versions/${vid}/items`);
      // Ensure ordinals are numbers and sort
      const sorted = [...data].sort((a, b) => (a.ordinal ?? 0) - (b.ordinal ?? 0));
      setItems(sorted);
    } catch (e) {
      setItems([]);
    } finally {
      setItemsLoading(false);
    }
  };

  const saveItems = async () => {
    if (!currentVid) return;
    setSavingItems(true);
    try {
      const payload = {
        items: items.map((it, idx) => ({
          id: it.id,
          ordinal: Number(it.ordinal) || idx + 1,
          itemText: String(it.itemText || '').trim() || `Item ${idx + 1}`,
          locale: it.locale || 'en',
          responseFormat: it.responseFormat || 'likert_5',
          domainTag: it.domainTag || undefined,
          dimensionTag: it.dimensionTag || undefined,
          stateTag: it.stateTag || undefined,
          categoryTag: it.categoryTag || undefined,
          scoreGroupTag: it.scoreGroupTag || undefined,
          configJson: it.configJson || undefined,
        }))
      };
      await api.post(`/api/v1/admin/instruments/${id}/versions/${currentVid}/items`, payload);
      // Reload versions to update itemCount
      const vers = await api.get<any[]>(`/api/v1/instruments/${id}/versions`);
      setVersions(vers);
      setItemsOpen(false);
    } finally {
      setSavingItems(false);
    }
  };

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
        <Button className="shadow-sm" onClick={async () => {
          await api.post(`/api/v1/admin/instruments/${id}/versions`, {});
          const vers = await api.get<any[]>(`/api/v1/instruments/${id}/versions`);
          setVersions(vers);
        }}>
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
                      <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-700 hover:bg-blue-50" onClick={() => openItemsEditor(v.id)}>
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

      {/* Items Editor modal */}
      <Dialog open={itemsOpen} onOpenChange={(o) => { if (!o) { setItemsOpen(false); setCurrentVid(null); setItems([]); } }}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Edit Items</DialogTitle>
          </DialogHeader>
          {itemsLoading ? (
            <div className="text-sm text-slate-500">Loading…</div>
          ) : (
            <div className="space-y-4">
              <div className="overflow-x-auto border rounded-md">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="text-xs text-slate-500 uppercase tracking-wider">
                      <th className="text-left py-2 px-3 w-20">#</th>
                      <th className="text-left py-2 px-3">Item Text</th>
                      <th className="text-left py-2 px-3 w-24">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((it, idx) => (
                      <tr key={it.id || idx} className="border-t">
                        <td className="py-2 px-3">
                          <Input type="number" className="w-20" value={it.ordinal ?? (idx + 1)} onChange={(e) => {
                            const v = Number(e.target.value);
                            setItems(prev => prev.map((p, i) => i === idx ? { ...p, ordinal: v } : p));
                          }} />
                        </td>
                        <td className="py-2 px-3">
                          <Input value={it.itemText || ''} onChange={(e) => setItems(prev => prev.map((p, i) => i === idx ? { ...p, itemText: e.target.value } : p))} />
                        </td>
                        <td className="py-2 px-3">
                          <Button variant="ghost" className="text-red-600" onClick={() => setItems(prev => prev.filter((_, i) => i !== idx))}>Remove</Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div>
                <Button variant="secondary" onClick={() => setItems(prev => [...prev, { ordinal: prev.length + 1, itemText: '' }])}>Add Item</Button>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setItemsOpen(false)}>Cancel</Button>
            <Button onClick={saveItems} disabled={savingItems}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
