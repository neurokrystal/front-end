"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Mail } from "lucide-react";
import { getTemplateLabel } from "@/lib/email-templates";

interface EmailTemplate {
  id: string;
  subject: string;
  updated_at: string;
}

export default function EmailTemplatesPage() {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<EmailTemplate[]>("/api/v1/admin/email-templates")
      .then(setTemplates)
      .catch((err) => {
        const message = typeof err?.message === 'string' ? err.message : 'Failed to load templates';
        setError(message);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div>Loading...</div>;

  if (error) {
    return (
      <div className="space-y-6 font-sans">
        <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">Email Templates</h1>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700">
          Error loading templates: {error}
        </div>
      </div>
    );
  }

  if (!loading && templates.length === 0) {
    return (
      <div className="space-y-6 font-sans">
        <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">Email Templates</h1>
        <div className="bg-white border border-slate-200 rounded-xl p-12 text-center">
          <Mail className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-sm text-slate-500">No email templates found.</p>
          <p className="text-xs text-slate-400 mt-1">Run the seed script to create default templates.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 font-sans">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">Email Templates</h1>
      </div>

      <div className="grid gap-4">
        {templates.map((template) => (
          <Card key={template.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <div>
                <CardTitle className="text-base font-semibold text-slate-900">{getTemplateLabel(template.id)}</CardTitle>
                <p className="text-xs text-slate-400 font-mono mt-0.5">{template.id}</p>
              </div>
              <Button asChild variant="outline" size="sm" className="font-medium shadow-sm border-slate-200">
                <Link href={`/admin/email-templates/${template.id}`}>Edit Template</Link>
              </Button>
            </CardHeader>
            <CardContent>
              <p className="text-sm font-medium text-slate-700">Subject: <span className="font-normal text-slate-500">{template.subject}</span></p>
              <p className="text-xs text-slate-400 mt-3 flex items-center gap-1.5 uppercase tracking-wider font-semibold">
                Last updated: <span className="font-normal">{new Date(template.updated_at).toLocaleString()}</span>
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
