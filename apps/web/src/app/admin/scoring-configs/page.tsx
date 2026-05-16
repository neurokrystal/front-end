"use client";

import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Check, Edit3, Eye, EyeOff, TriangleAlert } from "lucide-react";

type Instrument = {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  status: string;
  createdAt?: string;
};

type InstrumentVersion = {
  id: string;
  instrumentId: string;
  versionNumber: number;
  itemCount: number;
  scoringStrategyKey: string;
  configJson: any | null;
  isActive?: boolean | null;
  publishedAt?: string | null;
  createdAt?: string;
};

export default function ScoringConfigsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [instruments, setInstruments] = useState<Instrument[]>([]);
  const [versions, setVersions] = useState<InstrumentVersion[]>([]);
  const [selectedInstrumentId, setSelectedInstrumentId] = useState<string | null>(null);
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null);
  const [showRaw, setShowRaw] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editText, setEditText] = useState<string>("{}");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const list = await api.get<Instrument[]>("/api/v1/instruments");
        setInstruments(list);
        if (list.length > 0) {
          setSelectedInstrumentId(list[0].id);
        }
      } catch (e: any) {
        setError(e?.message || "Failed to load instruments");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  useEffect(() => {
    const loadVersions = async () => {
      if (!selectedInstrumentId) return;
      try {
        const vers = await api.get<InstrumentVersion[]>(`/api/v1/instruments/${selectedInstrumentId}/versions`);
        setVersions(vers);
        if (vers.length > 0) setSelectedVersionId(vers[0].id);
      } catch (e: any) {
        setError(e?.message || "Failed to load versions");
      }
    };
    setVersions([]);
    setSelectedVersionId(null);
    loadVersions();
  }, [selectedInstrumentId]);

  const selectedInstrument = useMemo(() => instruments.find(i => i.id === selectedInstrumentId) || null, [instruments, selectedInstrumentId]);
  const selectedVersion = useMemo(() => versions.find(v => v.id === selectedVersionId) || null, [versions, selectedVersionId]);
  const config: any = selectedVersion?.configJson || {};

  const scoreGroups: any[] = Array.isArray((config as any)?.score_groups) ? (config as any).score_groups : [];
  const computedFields: any[] = Array.isArray((config as any)?.computed_fields) ? (config as any).computed_fields : [];
  const bandThresholds: Record<string, any[]> = (config as any)?.band_thresholds || {};

  const openEdit = () => {
    setEditText(JSON.stringify(config ?? {}, null, 2));
    setIsEditOpen(true);
  };

  const saveEdit = async () => {
    if (!selectedInstrumentId || !selectedVersionId) return;
    let parsed: any;
    try {
      parsed = JSON.parse(editText);
    } catch (e: any) {
      setError("Invalid JSON: " + (e?.message || "Parse failed"));
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await api.put(`/api/v1/instruments/${selectedInstrumentId}/versions/${selectedVersionId}/config`, { config: parsed });
      // Refresh versions to reflect updated config
      const vers = await api.get<InstrumentVersion[]>(`/api/v1/instruments/${selectedInstrumentId}/versions`);
      setVersions(vers);
      setIsEditOpen(false);
    } catch (e: any) {
      setError(e?.message || "Failed to save config");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>;
  if (error) return <div className="p-8 bg-red-50 text-red-600 rounded-xl border border-red-100">{error}</div>;

  return (
    <div className="space-y-6 font-sans">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">Scoring Configurations</h1>
        <p className="text-slate-500">View and manage scoring rules for each instrument</p>
      </div>

      <div className="flex gap-4 items-center">
        <div className="w-72">
          <Select value={selectedInstrumentId ?? undefined} onValueChange={setSelectedInstrumentId}>
            <SelectTrigger>
              <SelectValue placeholder="Select Instrument" />
            </SelectTrigger>
            <SelectContent>
              {instruments.map((i) => (
                <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="w-40">
          <Select value={selectedVersionId ?? undefined} onValueChange={setSelectedVersionId}>
            <SelectTrigger>
              <SelectValue placeholder="Version" />
            </SelectTrigger>
            <SelectContent>
              {versions.map((v) => (
                <SelectItem key={v.id} value={v.id}>v{v.versionNumber}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <Button variant="outline" onClick={() => setShowRaw(!showRaw)}>
            {showRaw ? <EyeOff className="w-4 h-4 mr-2" /> : <Eye className="w-4 h-4 mr-2" />} View Raw JSON
          </Button>
          <Button onClick={openEdit}>
            <Edit3 className="w-4 h-4 mr-2" /> Edit Config
          </Button>
        </div>
      </div>

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Config Viewer</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
            <div><span className="text-slate-500">Instrument</span><div className="font-medium">{selectedInstrument?.name}</div></div>
            <div><span className="text-slate-500">Version</span><div className="font-medium">{versions.find(v => v.id === selectedVersionId)?.versionNumber ?? '-'}</div></div>
            <div><span className="text-slate-500">Strategy</span><div className="font-mono text-slate-600">{selectedVersion?.scoringStrategyKey}</div></div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-slate-900 mb-2">Score Groups ({scoreGroups.length})</h3>
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="overflow-x-auto -mx-4 md:mx-0">
                <div className="inline-block min-w-full align-middle">
                  <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 text-slate-600 uppercase text-[11px] tracking-wider">
                    <th className="px-4 py-2 text-left">Key</th>
                    <th className="px-4 py-2 text-left">Label</th>
                    <th className="px-4 py-2 text-left">Domain</th>
                    <th className="px-4 py-2 text-left">Category</th>
                    <th className="px-4 py-2 text-left">Aggregation</th>
                    <th className="px-4 py-2 text-left">Raw Range</th>
                    <th className="px-4 py-2 text-left">Normalise</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {scoreGroups.map((g: any) => (
                    <tr key={g.key} className="hover:bg-slate-50">
                      <td className="px-4 py-2 font-mono text-xs text-slate-600">{g.key}</td>
                      <td className="px-4 py-2">{g.label}</td>
                      <td className="px-4 py-2 capitalize">{g.domain}</td>
                      <td className="px-4 py-2 capitalize">{g.category}</td>
                      <td className="px-4 py-2">{g.aggregation?.type || g.aggregation}</td>
                      <td className="px-4 py-2">{Array.isArray(g.raw_range) ? `${g.raw_range[0]}–${g.raw_range[1]}` : '-'}</td>
                      <td className="px-4 py-2">{g.normalise ? <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 border-emerald-100"><Check className="w-3 h-3 mr-1" /> Yes</Badge> : <span className="text-slate-400">No</span>}</td>
                    </tr>
                  ))}
                  {scoreGroups.length === 0 && (
                    <tr>
                      <td className="px-4 py-6 text-center text-slate-400" colSpan={7}>No score groups defined</td>
                    </tr>
                  )}
                </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-slate-900 mb-2">Computed Fields ({computedFields.length})</h3>
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="overflow-x-auto -mx-4 md:mx-0">
                <div className="inline-block min-w-full align-middle">
                  <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 text-slate-600 uppercase text-[11px] tracking-wider">
                    <th className="px-4 py-2 text-left">Key</th>
                    <th className="px-4 py-2 text-left">Label</th>
                    <th className="px-4 py-2 text-left">Formula</th>
                    <th className="px-4 py-2 text-left">Inputs</th>
                    <th className="px-4 py-2 text-left">Output</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {computedFields.map((f: any) => (
                    <tr key={f.key} className="hover:bg-slate-50">
                      <td className="px-4 py-2 font-mono text-xs text-slate-600">{f.key}</td>
                      <td className="px-4 py-2">{f.label}</td>
                      <td className="px-4 py-2">{f.formula?.type || f.type}</td>
                      <td className="px-4 py-2 text-slate-600">{Array.isArray(f.inputs) ? f.inputs.join(", ") : '-'}</td>
                      <td className="px-4 py-2">{f.output?.type || f.output}</td>
                    </tr>
                  ))}
                  {computedFields.length === 0 && (
                    <tr>
                      <td className="px-4 py-6 text-center text-slate-400" colSpan={5}>No computed fields defined</td>
                    </tr>
                  )}
                </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-slate-900 mb-3">Band Thresholds</h3>
            <div className="space-y-3">
              {Object.entries(bandThresholds).map(([domain, bands]) => (
                <div key={domain}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="font-medium capitalize">{domain}</div>
                  </div>
                  <div className="h-6 w-full rounded-full overflow-hidden flex border border-slate-200">
                    {Array.isArray(bands) && bands.length > 0 ? (
                      (bands as any[]).map((b: any, idx: number) => {
                        const start = Math.max(0, Math.min(100, Math.round((b.min ?? 0) * 100)));
                        const end = Math.max(0, Math.min(100, Math.round((b.max ?? 1) * 100)));
                        const width = Math.max(0, end - start);
                        const color = bandColor(b.label || String(idx));
                        return (
                          <div key={idx} className={`h-full text-[10px] text-white flex items-center justify-center`} style={{ width: `${width}%`, backgroundColor: color }} title={`${b.label || ''}: ${start}%–${end}%`}></div>
                        );
                      })
                    ) : (
                      <div className="w-full text-center text-slate-400 text-xs flex items-center justify-center">No thresholds</div>
                    )}
                  </div>
                </div>
              ))}
              {Object.keys(bandThresholds).length === 0 && (
                <div className="text-slate-400 text-sm">No band thresholds defined</div>
              )}
            </div>
          </div>

          {showRaw && (
            <pre className="bg-slate-50 border border-slate-200 rounded-lg p-4 text-xs font-mono text-slate-700 overflow-auto max-h-[500px]">
              {JSON.stringify(config, null, 2)}
            </pre>
          )}
        </CardContent>
      </Card>

      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Edit Scoring Config</DialogTitle>
            <DialogDescription>
              <div className="flex items-start gap-2 text-amber-700 bg-amber-50 border border-amber-200 rounded-md p-2">
                <TriangleAlert className="w-4 h-4 mt-0.5" />
                <span>Changing the scoring configuration affects how future assessments are scored. Existing scores are not affected.</span>
              </div>
            </DialogDescription>
          </DialogHeader>
          <div>
            <textarea
              className="w-full h-96 font-mono text-xs p-3 border border-slate-200 rounded-md"
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>Cancel</Button>
            <Button onClick={saveEdit} disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function bandColor(label: string): string {
  const key = label.toLowerCase();
  if (key.includes('very_low')) return '#ef4444';
  if (key.includes('low')) return '#f59e0b';
  if (key.includes('medium') || key.includes('moderate')) return '#10b981';
  if (key.includes('high')) return '#3b82f6';
  if (key.includes('very_high')) return '#7c3aed';
  return '#94a3b8';
}
