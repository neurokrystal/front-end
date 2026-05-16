"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Filter, ChevronLeft, ChevronRight, RefreshCw } from "lucide-react";
import { REPORT_TYPES } from "@dimensional/shared";

type CmsBlock = {
  id: string;
  reportType: string;
  sectionKey: string;
  domain: string | null;
  dimension: string | null;
  scoreBand: string | null;
  alignmentDirection?: string | null;
  alignmentSeverity?: string | null;
  locale: string;
  contentText: string;
  displayOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export default function CmsBlocksPage() {
  const router = useRouter();
  const [rows, setRows] = useState<CmsBlock[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  // Filters
  const [reportType, setReportType] = useState<string | "all">("all");
  const [sectionKey, setSectionKey] = useState("");
  const [domain, setDomain] = useState("");
  const [dimension, setDimension] = useState("");
  const [scoreBand, setScoreBand] = useState("");
  const [isActive, setIsActive] = useState<"all" | "true" | "false">("all");

  // Paging
  const [limit, setLimit] = useState(50);
  const [page, setPage] = useState(0);

  const offset = useMemo(() => page * limit, [page, limit]);

  const fetchBlocks = async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams();
      if (reportType !== "all") qs.set("reportType", reportType);
      if (sectionKey) qs.set("sectionKey", sectionKey);
      if (domain) qs.set("domain", domain);
      if (dimension) qs.set("dimension", dimension);
      if (scoreBand) qs.set("scoreBand", scoreBand);
      if (isActive !== "all") qs.set("isActive", isActive);
      qs.set("limit", String(limit));
      qs.set("offset", String(offset));

      const data = await apiFetch<{ blocks: CmsBlock[]; total: number }>(`/api/v1/admin/cms/blocks?${qs.toString()}`);
      setRows(data.blocks);
      setTotal(data.total);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBlocks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reportType, sectionKey, domain, dimension, scoreBand, isActive, limit, offset]);

  const totalPages = Math.max(1, Math.ceil(total / limit));

  const refresh = () => fetchBlocks();

  return (
    <div className="p-6 space-y-6 font-sans">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">CMS Content Blocks</h1>
          <p className="text-sm text-slate-500 mt-1">Manage the text content used in assessment reports</p>
        </div>
        <div className="flex gap-2">
          <button onClick={refresh} className="px-3 py-2 text-sm text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50">
            ↻ Refresh
          </button>
          <button onClick={() => router.push('/admin/cms/new')} className="px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 font-medium">
            + New Block
          </button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">Filters</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">Report Type</label>
            <Select value={reportType} onValueChange={(v) => { setPage(0); setReportType(v as any); }}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="All" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all"><div className="flex items-center"><Filter className="mr-2 h-4 w-4"/>All</div></SelectItem>
                {REPORT_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">Section Key</label>
            <Input value={sectionKey} onChange={(e) => { setPage(0); setSectionKey(e.target.value); }} placeholder="e.g. domain_overview" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">Domain</label>
            <Input value={domain} onChange={(e) => { setPage(0); setDomain(e.target.value); }} placeholder="e.g. cognitive" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">Dimension</label>
            <Input value={dimension} onChange={(e) => { setPage(0); setDimension(e.target.value); }} placeholder="e.g. openness" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">Score Band</label>
            <Input value={scoreBand} onChange={(e) => { setPage(0); setScoreBand(e.target.value); }} placeholder="e.g. high" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">Active</label>
            <Select value={isActive} onValueChange={(v: any) => { setPage(0); setIsActive(v); }}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="All" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="true">Active</SelectItem>
                <SelectItem value="false">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold">Results</CardTitle>
            <div className="flex items-center gap-3 text-sm text-slate-600">
              <span>Total: {total}</span>
              <div className="flex items-center gap-2">
                <span>Per page:</span>
                <Select value={String(limit)} onValueChange={(v) => { setPage(0); setLimit(parseInt(v)); }}>
                  <SelectTrigger className="w-[100px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {[20, 50, 100, 200].map((n) => (
                      <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading && rows.length === 0 ? (
            <div>Loading…</div>
          ) : rows.length === 0 ? (
            <div className="text-slate-600">No blocks found for current filters.</div>
          ) : (
            <div className="overflow-x-auto -mx-4 md:mx-0">
              <div className="inline-block min-w-full align-middle">
                <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-slate-500 border-b">
                  <th className="py-2 px-2">Report</th>
                    <th className="py-2 px-2">Section</th>
                    <th className="py-2 px-2">Domain</th>
                    <th className="py-2 px-2">Dimension</th>
                    <th className="py-2 px-2">Band</th>
                    <th className="py-2 px-2">Locale</th>
                    <th className="py-2 px-2">Order</th>
                    <th className="py-2 px-2">Active</th>
                    <th className="py-2 px-2">Preview</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((b) => (
                    <tr key={b.id} className="border-b hover:bg-slate-50">
                      <td className="py-2 px-2 capitalize">{b.reportType}</td>
                      <td className="py-2 px-2"><a className="text-blue-600 hover:underline" href={`/admin/cms/${b.id}`}>{b.sectionKey}</a></td>
                      <td className="py-2 px-2">{b.domain || <span className="text-slate-400">—</span>}</td>
                      <td className="py-2 px-2">{b.dimension || <span className="text-slate-400">—</span>}</td>
                      <td className="py-2 px-2">{b.scoreBand || <span className="text-slate-400">—</span>}</td>
                      <td className="py-2 px-2">{b.locale}</td>
                      <td className="py-2 px-2 tabular-nums">{b.displayOrder}</td>
                      <td className="py-2 px-2">
                        {b.isActive ? (
                          <Badge variant="outline" className="border-green-200 text-green-700 bg-green-50">Active</Badge>
                        ) : (
                          <Badge variant="outline" className="border-slate-200 text-slate-600 bg-slate-50">Inactive</Badge>
                        )}
                      </td>
                      <td className="py-2 px-2 max-w-[300px]">
                        <div
                          className="prose prose-sm max-w-none text-slate-600 line-clamp-2 text-xs"
                          dangerouslySetInnerHTML={{ __html: b.contentText }}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Pagination */}
          <div className="flex items-center justify-between mt-4 text-sm text-slate-600">
            <div>
              Page {page + 1} of {totalPages}
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0}>
                <ChevronLeft className="mr-1 h-4 w-4"/>Prev
              </Button>
              <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))} disabled={page + 1 >= totalPages}>
                Next<ChevronRight className="ml-1 h-4 w-4"/>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
