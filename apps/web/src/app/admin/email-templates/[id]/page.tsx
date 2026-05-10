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
    apiFetch<EmailTemplate>(`/admin/email-templates/${id}`)
      .then(setTemplate)
      .finally(() => setLoading(false));
  }, [id]);

  const handleSave = async () => {
    if (!template) return;
    setSaving(true);
    try {
      await apiFetch(`/admin/email-templates/${id}`, {
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
      await apiFetch("/admin/email-templates/test", {
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
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Edit Template: {id}</h1>
        <div className="space-x-2">
          <Button variant="outline" onClick={() => router.back()}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>{saving ? "Saving..." : "Save Template"}</Button>
        </div>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Template Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Subject</label>
              <Input 
                value={template.subject} 
                onChange={(e) => setTemplate({ ...template, subject: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Plain Text Body (Handlebars allowed)</label>
              <textarea 
                className="w-full h-32 p-2 border rounded-md font-mono text-sm"
                value={template.body_text} 
                onChange={(e) => setTemplate({ ...template, body_text: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">HTML Body (Handlebars allowed)</label>
              <textarea 
                className="w-full h-64 p-2 border rounded-md font-mono text-sm"
                value={template.body_html} 
                onChange={(e) => setTemplate({ ...template, body_html: e.target.value })}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Test Email</CardTitle>
          </CardHeader>
          <CardContent className="flex items-end space-x-4">
            <div className="flex-1 space-y-2">
              <label className="text-sm font-medium">Recipient Email</label>
              <Input 
                placeholder="test@example.com"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
              />
            </div>
            <Button variant="secondary" onClick={handleSendTest}>Send Test</Button>
            {testStatus && <p className="text-sm self-center pb-2 pl-2">{testStatus}</p>}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
