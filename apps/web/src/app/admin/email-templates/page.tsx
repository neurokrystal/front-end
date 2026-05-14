"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface EmailTemplate {
  id: string;
  subject: string;
  updated_at: string;
}

export default function EmailTemplatesPage() {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch<EmailTemplate[]>("/api/v1/admin/email-templates")
      .then(setTemplates)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div>Loading...</div>;

  return (
    <div className="space-y-6 font-sans">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">Email Templates</h1>
      </div>

      <div className="grid gap-4">
        {templates.map((template) => (
          <Card key={template.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-base font-semibold text-slate-900">{template.id}</CardTitle>
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
