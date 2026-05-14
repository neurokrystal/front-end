"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Copy, Star, Trash2, Pencil, Filter } from "lucide-react";
import { REPORT_TYPES, type ReportType } from "@dimensional/shared";

type ReportTemplateRow = {
  id: string;
  reportType: ReportType | string;
  name: string;
  version: number;
  templateJson: any;
  isActive: boolean;
  isDefault: boolean;
  updatedAt: string;
};

function generateDefaultTemplate(reportType: string, name: string) {
  const pageId = crypto.randomUUID();
  return {
    id: crypto.randomUUID(),
    reportType,
    name,
    version: 1,
    pageSize: { width: 210, height: 297 },
    margins: { top: 15, right: 15, bottom: 15, left: 15 },
    pages: [
      {
        id: pageId,
        label: "Page 1",
        gridColumns: "1fr",
        gap: 4,
        children: [] as any[],
      },
    ],
  };
}

export default function TemplateListPage() {
  const router = useRouter();
  const [templates, setTemplates] = useState<ReportTemplateRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<string | "all">("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState<ReportType | string>("base");
  const [submitting, setSubmitting] = useState(false);

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const path = filterType === "all" ? "/api/v1/admin/templates" : `/api/v1/admin/templates?reportType=${encodeURIComponent(filterType)}`;
      const data = await apiFetch<ReportTemplateRow[]>(path);
      setTemplates(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterType]);

  const grouped = useMemo(() => {
    const byType: Record<string, ReportTemplateRow[]> = {};
    for (const t of templates) {
      if (!byType[t.reportType]) byType[t.reportType] = [];
      byType[t.reportType].push(t);
    }
    return byType;
  }, [templates]);

  const onCreate = async () => {
    if (!newName.trim()) return;
    setSubmitting(true);
    try {
      const templateJson = generateDefaultTemplate(newType, newName.trim());
      const created = await apiFetch<ReportTemplateRow>(`/api/v1/admin/templates`, {
        method: "POST",
        body: JSON.stringify({ reportType: newType, name: newName.trim(), templateJson }),
      });
      setCreateOpen(false);
      setNewName("");
      router.push(`/admin/templates/${created.id}`);
    } finally {
      setSubmitting(false);
    }
  };

  const onDuplicate = async (tpl: ReportTemplateRow) => {
    const copy = {
      reportType: tpl.reportType,
      name: `${tpl.name} (Copy)`,
      templateJson: { ...tpl.templateJson, id: crypto.randomUUID(), name: `${tpl.templateJson?.name || tpl.name} (Copy)` },
    };
    const created = await apiFetch<ReportTemplateRow>(`/api/v1/admin/templates`, { method: "POST", body: JSON.stringify(copy) });
    router.push(`/admin/templates/${created.id}`);
  };

  const onSetDefault = async (tpl: ReportTemplateRow) => {
    await apiFetch(`/api/v1/admin/templates/${tpl.id}`, { method: "PUT", body: JSON.stringify({ isDefault: true }) });
    fetchTemplates();
  };

  const onDelete = async (tpl: ReportTemplateRow) => {
    if (!confirm(`Delete template "${tpl.name}"? This cannot be undone.`)) return;
    await apiFetch(`/api/v1/admin/templates/${tpl.id}`, { method: "DELETE" });
    fetchTemplates();
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Report Templates</h1>
        <div className="flex items-center gap-3">
          <Select value={filterType} onValueChange={(v) => setFilterType(v)}>
            <SelectTrigger className="w-[220px]">
              <SelectValue placeholder="Filter by type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all"><div className="flex items-center"><Filter className="mr-2 h-4 w-4"/>All types</div></SelectItem>
              {REPORT_TYPES.map((t) => (
                <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="mr-2 h-4 w-4"/>Create Template</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Template</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Template Name</label>
                  <Input
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="Base Report Template"
                    className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Report Type</label>
                  <Select value={newType} onValueChange={(v) => setNewType(v)} className="w-full">
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select report type" />
                    </SelectTrigger>
                    <SelectContent>
                      {REPORT_TYPES.map((t) => (
                        <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <button
                  type="button"
                  onClick={() => setCreateOpen(false)}
                  className="bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-lg px-4 py-2 text-sm font-medium"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={!newName.trim() || submitting}
                  onClick={onCreate}
                  className="bg-blue-600 text-white hover:bg-blue-700 rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-50"
                >
                  {submitting ? 'Creating…' : 'Create'}
                </button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {loading ? (
        <div>Loading templates…</div>
      ) : (
        Object.keys(grouped).length === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>No templates yet</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-slate-600">Click "Create Template" to add your first template.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-8">
            {Object.entries(grouped).map(([type, rows]) => (
              <div key={type} className="space-y-3">
                <h2 className="text-lg font-semibold capitalize">{type}</h2>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {rows.map((tpl) => (
                    <Card key={tpl.id} className="flex flex-col">
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-base font-semibold truncate" title={tpl.name}>{tpl.name}</CardTitle>
                          <div className="flex items-center gap-2">
                            {tpl.isDefault && <Badge variant="secondary" className="flex items-center gap-1"><Star className="h-3 w-3 text-blue-600"/>Default</Badge>}
                            {tpl.isActive ? (
                              <Badge variant="outline" className="border-green-200 text-green-700 bg-green-50">Active</Badge>
                            ) : (
                              <Badge variant="outline" className="border-slate-200 text-slate-600 bg-slate-50">Draft</Badge>
                            )}
                          </div>
                        </div>
                        <div className="text-xs text-slate-500">v{tpl.version} · Updated {new Date(tpl.updatedAt).toLocaleString()}</div>
                      </CardHeader>
                      <CardContent className="pt-0 mt-auto">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex gap-2">
                            <Link href={`/admin/templates/${tpl.id}`} className="inline-flex"><Button size="sm" variant="secondary"><Pencil className="mr-1 h-4 w-4"/>Edit</Button></Link>
                            <Button size="sm" variant="outline" onClick={() => onDuplicate(tpl)}><Copy className="mr-1 h-4 w-4"/>Duplicate</Button>
                          </div>
                          <div className="flex gap-2">
                            {!tpl.isDefault && <Button size="sm" variant="outline" onClick={() => onSetDefault(tpl)}><Star className="mr-1 h-4 w-4"/>Set Default</Button>}
                            <Button size="sm" variant="destructive" onClick={() => onDelete(tpl)}><Trash2 className="mr-1 h-4 w-4"/>Delete</Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )
      )}
    </div>
  );
}
