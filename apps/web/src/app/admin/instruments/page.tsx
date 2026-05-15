"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { FlaskConical, Plus, Archive, ExternalLink } from "lucide-react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRouter } from "next/navigation";

export default function AdminInstrumentsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [instruments, setInstruments] = useState<any[]>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();

  const slugify = (s: string) => s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const results = await api.get<any[]>("/api/v1/instruments");
      setInstruments(results);
    } catch (e: any) {
      setError(e?.message || "Failed to load instruments");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    // auto-generate slug from name if user hasn't modified slug manually
    if (!name) { setSlug(""); return; }
    setSlug((prev) => {
      // if prev is empty or matches old pattern, keep auto-updating
      const auto = slugify(name);
      // If user has manually changed slug (not equal to slugified previous name), only update when prev equals slugified of previous
      // Here, for simplicity, we always auto-update unless user typed something not equal to slugified(name) while name didn't change
      return auto;
    });
  }, [name]);

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>;
  if (error) return <div className="p-8 bg-red-50 text-red-600 rounded-xl border border-red-100">{error}</div>;

  return (
    <div className="space-y-6 font-sans">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">Instruments Manager</h1>
        <Button className="shadow-sm" onClick={() => setCreateOpen(true)}>
          <Plus className="w-4 h-4 mr-2" /> Create New Instrument
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {instruments.length === 0 ? (
          <Card className="bg-slate-50 border-dashed border-slate-300 shadow-none">
            <CardContent className="flex flex-col items-center justify-center py-12 text-slate-400">
              <FlaskConical className="w-12 h-12 mb-4 text-slate-300" />
              <p className="font-medium">No instruments found</p>
              <p className="text-sm mt-1">Get started by creating your first assessment instrument</p>
            </CardContent>
          </Card>
        ) : (
          instruments.map((i) => (
            <Card key={i.id} className="group hover:shadow-md transition-all">
              <CardContent className="p-6 flex justify-between items-center">
                <div className="space-y-1">
                  <div className="flex items-center gap-3">
                    <h3 className="text-lg font-semibold text-slate-900">{i.name}</h3>
                    <span className="px-2 py-0.5 bg-blue-50 text-blue-700 text-[10px] font-bold uppercase tracking-wider rounded border border-blue-100">{i.slug}</span>
                  </div>
                  <p className="text-sm text-slate-500 max-w-2xl leading-relaxed">{i.description}</p>
                </div>
                <div className="flex items-center gap-3">
                  <Link href={`/admin/instruments/${i.id}`}>
                    <Button variant="outline" className="shadow-sm border-slate-200">
                      <ExternalLink className="w-4 h-4 mr-2" /> Manage Versions
                    </Button>
                  </Link>
                  <Button variant="ghost" className="text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors">
                    <Archive className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Create Instrument modal */}
      <Dialog open={createOpen} onOpenChange={(o) => { if (!o) { setCreateOpen(false); setName(""); setSlug(""); setDescription(""); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Instrument</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input placeholder="360-Degree Feedback" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Slug (URL-friendly identifier)</Label>
              <Input placeholder="360-feedback" value={slug} onChange={(e) => setSlug(slugify(e.target.value))} />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Input placeholder="" value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button
              onClick={async () => {
                if (!name.trim() || !slug.trim()) return;
                setSubmitting(true);
                try {
                  const created = await api.post<any>(`/api/v1/admin/instruments`, { name: name.trim(), slug: slug.trim(), description: description.trim() || undefined });
                  // redirect to detail page
                  router.push(`/admin/instruments/${created.id}`);
                } catch (e: any) {
                  // surface simple error
                  alert(e?.message || 'Failed to create instrument');
                } finally {
                  setSubmitting(false);
                }
              }}
              disabled={!name.trim() || !slug.trim() || submitting}
            >Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
