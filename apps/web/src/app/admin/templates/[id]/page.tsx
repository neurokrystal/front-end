"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import TemplateEditor from "@/components/template-editor/TemplateEditor";
import { Card } from "@/components/ui/card";

type ReportTemplateRow = {
  id: string;
  reportType: string;
  name: string;
  version: number;
  templateJson: any;
  isActive: boolean;
  isDefault: boolean;
  updatedAt: string;
};

export default function TemplateEditorPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;
  const [tpl, setTpl] = useState<ReportTemplateRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    apiFetch<ReportTemplateRow>(`/api/v1/admin/templates/${id}`)
      .then(setTpl)
      .catch(() => setError("Failed to load template"))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="p-6">Loading editor…</div>;
  if (error || !tpl) return <div className="p-6 text-red-600">{error || 'Template not found'}</div>;

  return (
    <div className="h-[calc(100vh-64px)] p-4 md:p-0">
      <div className="block md:hidden bg-amber-500/10 border border-amber-500/20 rounded-lg p-4 mb-4">
        <p className="text-amber-400 text-sm">
          The template editor works best on a desktop screen. Some drag-and-drop features may be limited on mobile.
        </p>
      </div>
      <div className="overflow-x-auto">
        <TemplateEditor
          templateRow={tpl}
          onBack={() => router.push('/admin/templates')}
          onSaved={(updated) => setTpl(updated)}
        />
      </div>
    </div>
  );
}
