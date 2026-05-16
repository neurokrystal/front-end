"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { REPORT_TYPES } from "@dimensional/shared";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RichTextEditor } from "@/components/admin/RichTextEditor";
import { apiFetch } from "@/lib/api";

type CmsBlock = {
  id: string;
  reportType: string;
  sectionKey: string;
  domain: string | null;
  dimension: string | null;
  scoreBand: string | null;
  contentText: string;
  displayOrder: number;
  isActive: boolean;
};

export default function EditCmsBlockPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [reportType, setReportType] = useState<string>(REPORT_TYPES[0] || "base");
  const [sectionKey, setSectionKey] = useState("");
  const [domain, setDomain] = useState("");
  const [dimension, setDimension] = useState("");
  const [scoreBand, setScoreBand] = useState("");
  const [displayOrder, setDisplayOrder] = useState<number>(0);
  const [isActive, setIsActive] = useState<boolean>(true);
  const [contentHtml, setContentHtml] = useState<string>("");

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      try {
        const b = await apiFetch<CmsBlock>(`/api/v1/admin/cms/blocks/${id}`);
        setReportType(b.reportType);
        setSectionKey(b.sectionKey);
        setDomain(b.domain || "");
        setDimension(b.dimension || "");
        setScoreBand(b.scoreBand || "");
        setDisplayOrder(b.displayOrder || 0);
        setIsActive(!!b.isActive);
        setContentHtml(b.contentText || "");
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [id]);

  const onSave = async () => {
    if (!sectionKey.trim()) { alert("Section key is required"); return; }
    if (!contentHtml || contentHtml === "<p></p>") { alert("Please enter content"); return; }
    setSaving(true);
    try {
      const body: any = {
        reportType,
        sectionKey: sectionKey.trim(),
        domain: domain.trim() || null,
        dimension: dimension.trim() || null,
        scoreBand: scoreBand.trim() || null,
        contentText: contentHtml,
        displayOrder,
        isActive,
      };
      await apiFetch(`/api/v1/admin/cms/blocks/${id}`, { method: "PUT", body: JSON.stringify(body) });
      router.push("/admin/cms");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-6">Loading…</div>;

  return (
    <div className="p-6 space-y-6 font-sans">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-2">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">Edit CMS Block</h1>
          <p className="text-sm text-slate-500 mt-1">Update the content block and save changes</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => router.push('/admin/cms')} className="px-3 py-2 text-sm text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50">Cancel</button>
          <button onClick={onSave} disabled={saving} className="px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50">{saving ? 'Saving…' : 'Save Changes'}</button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">Block Details</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1.5 block">Report Type</label>
            <select
              value={reportType}
              onChange={(e) => setReportType(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900"
            >
              <option value="base">Base Report</option>
              <option value="professional_self">Professional Self</option>
              <option value="under_pressure">Under Pressure</option>
              <option value="relationship_patterns">Relationship Patterns</option>
              <option value="career_alignment">Career Alignment</option>
              <option value="parenting_patterns">Parenting Patterns</option>
              <option value="wellbeing">Wellbeing</option>
              <option value="leader_adapted">Leader-Adapted</option>
              <option value="relational_compass">Relational Compass</option>
              <option value="collaboration_compass">Collaboration Compass</option>
              <option value="family_compass">Family Compass</option>
              <option value="team_architecture">Team Architecture</option>
              <option value="burnout_risk">Burnout Risk</option>
              <option value="change_readiness">Change Readiness</option>
              <option value="post_restructuring">Post-Restructuring</option>
              <option value="client_formulation">Client Formulation</option>
              <option value="progress">Progress</option>
            </select>
          </div>
          <div>
            <label className="block mb-1">Section Key</label>
            <Input value={sectionKey} onChange={(e) => setSectionKey(e.target.value)} placeholder="e.g. domain_overview" />
          </div>
          <div>
            <label className="block mb-1">Domain (optional)</label>
            <Input value={domain} onChange={(e) => setDomain(e.target.value)} placeholder="e.g. safety" />
          </div>
          <div>
            <label className="block mb-1">Dimension (optional)</label>
            <Input value={dimension} onChange={(e) => setDimension(e.target.value)} placeholder="e.g. openness" />
          </div>
          <div>
            <label className="block mb-1">Score Band (optional)</label>
            <Input value={scoreBand} onChange={(e) => setScoreBand(e.target.value)} placeholder="e.g. balanced" />
          </div>
          <div>
            <label className="block mb-1">Display Order</label>
            <Input type="number" value={displayOrder} onChange={(e) => setDisplayOrder(parseInt(e.target.value || '0'))} />
          </div>
          <div className="flex items-center gap-2 pt-6">
            <input id="isActive" type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
            <label htmlFor="isActive" className="!normal-case !tracking-normal">Active</label>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">Content</CardTitle>
        </CardHeader>
        <CardContent>
          <RichTextEditor content={contentHtml} onChange={setContentHtml} placeholder="Write the HTML content for this block…" />
        </CardContent>
      </Card>
    </div>
  );
}
