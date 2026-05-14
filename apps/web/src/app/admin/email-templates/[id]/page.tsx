"use client";

import { useEffect, useState, use } from "react";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useRouter } from "next/navigation";

interface EmailTemplate {
  id: string;
  subject: string;
  body_text: string;
  body_html: string;
}

export default function EditTemplatePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [template, setTemplate] = useState<EmailTemplate | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testEmail, setTestEmail] = useState("");
  const [testStatus, setTestStatus] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<EmailTemplate>(`/api/v1/admin/email-templates/${id}`)
      .then(setTemplate)
      .finally(() => setLoading(false));
  }, [id]);

  const handleSave = async () => {
    if (!template) return;
    setSaving(true);
    try {
      await apiFetch(`/api/v1/admin/email-templates/${id}`, {
        method: "PATCH",
        body: JSON.stringify(template),
      });
      router.push("/admin/email-templates");
    } catch (error) {
      alert("Failed to save template");
    } finally {
      setSaving(false);
    }
  };

  const handleSendTest = async () => {
    if (!template || !testEmail) return;
    setTestStatus("Sending...");
    try {
      await apiFetch("/api/v1/admin/email-templates/test", {
        method: "POST",
        body: JSON.stringify({
          to: testEmail,
          subject: template.subject,
          body_text: template.body_text,
          body_html: template.body_html,
          data: { url: "https://example.com/reset", user: { name: "Test User" } }
        }),
      });
      setTestStatus("Sent successfully!");
    } catch (error) {
      setTestStatus("Failed to send test email");
    }
  };

  if (loading) return <div>Loading...</div>;
  if (!template) return <div>Template not found</div>;

  return (
    <div className="space-y-6 max-w-5xl font-sans">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">Edit Template: <span className="text-blue-600 font-mono text-xl">{id}</span></h1>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => router.back()} className="shadow-sm border-slate-200">Cancel</Button>
          <Button onClick={handleSave} disabled={saving} className="shadow-sm">{saving ? "Saving..." : "Save Template"}</Button>
        </div>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold text-slate-900">Template Content</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Subject Line</label>
              <Input 
                value={template.subject} 
                onChange={(e) => setTemplate({ ...template, subject: e.target.value })}
                className="bg-slate-50 border-slate-200"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Plain Text Body</label>
              <p className="text-[10px] text-slate-400 -mt-1 mb-1 italic">Handlebars syntax supported (e.g. {"{{user.name}}"}).</p>
              <textarea 
                className="w-full h-32 p-3 border border-slate-200 rounded-xl font-mono text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                value={template.body_text} 
                onChange={(e) => setTemplate({ ...template, body_text: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">HTML Body</label>
              <textarea 
                className="w-full h-64 p-3 border border-slate-200 rounded-xl font-mono text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                value={template.body_html} 
                onChange={(e) => setTemplate({ ...template, body_html: e.target.value })}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-blue-50/30 border-blue-100 shadow-none">
          <CardHeader>
            <CardTitle className="text-base font-semibold text-blue-900">Test Configuration</CardTitle>
          </CardHeader>
          <CardContent className="flex items-end gap-4">
            <div className="flex-1 space-y-2">
              <label className="text-xs font-semibold text-blue-700 uppercase tracking-wider">Recipient Email</label>
              <Input 
                placeholder="test@example.com"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                className="bg-white border-blue-200"
              />
            </div>
            <Button variant="outline" onClick={handleSendTest} className="bg-white border-blue-200 text-blue-700 hover:bg-blue-50 font-medium shadow-sm">
              Send Test Email
            </Button>
            {testStatus && <p className="text-sm font-medium text-blue-700 self-center pb-2 pl-2 animate-pulse">{testStatus}</p>}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
