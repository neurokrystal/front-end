"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type Asset = {
  id: string;
  name: string;
  description?: string | null;
  filename: string;
  mimeType: string;
  fileExtension: string;
  fileSizeBytes: number;
  environment: 'production' | 'test' | string;
  storagePath: string;
  publicUrl: string;
  category?: string | null;
  uploadedBy?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

type ListResponse = { assets: Asset[]; total: number };

function isImage(mime: string) {
  return mime?.startsWith('image/');
}

function humanSize(bytes: number) {
  if (!bytes && bytes !== 0) return '';
  const units = ['B','KB','MB','GB'];
  let b = bytes;
  let i = 0;
  while (b >= 1024 && i < units.length - 1) { b /= 1024; i++; }
  return `${b.toFixed(b < 10 ? 1 : 0)}${units[i]}`;
}

export default function AssetStoragePage() {
  const [env, setEnv] = useState<'production'|'test'>('production');
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all'|'images'|'documents'|'fonts'|'other'>('all');
  const [categoryFilter, setCategoryFilter] = useState<'all'|'Image'|'Document'|'Font'|'Template'|'Icon'|'Other'>('all');
  const [view, setView] = useState<'grid'|'list'>('grid');
  const [page, setPage] = useState(0);
  const [perPage] = useState(24);

  const [data, setData] = useState<ListResponse>({ assets: [], total: 0 });
  const [loading, setLoading] = useState(true);

  const [uploadOpen, setUploadOpen] = useState(false);
  const [detail, setDetail] = useState<Asset | null>(null);

  // Upload form state
  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<string>('Image');

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    const params = new URLSearchParams();
    params.set('environment', env);
    if (search) params.set('search', search);
    if (typeFilter === 'images') params.set('mimeType', 'image/*');
    if (typeFilter === 'documents') params.set('mimeType', 'application/pdf');
    if (typeFilter === 'fonts') params.set('mimeType', 'font/*');
    if (categoryFilter !== 'all') params.set('category', categoryFilter);
    params.set('limit', String(perPage));
    params.set('offset', String(page * perPage));
    apiFetch<ListResponse>(`/api/v1/admin/assets?${params.toString()}`)
      .then((res) => { if (mounted) setData(res || { assets: [], total: 0 }); })
      .catch(() => { if (mounted) setData({ assets: [], total: 0 }); })
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, [env, search, typeFilter, categoryFilter, page, perPage]);

  const pages = Math.max(1, Math.ceil((data.total || 0) / perPage));

  const resetUpload = () => {
    setFile(null); setName(''); setDescription(''); setCategory('Image');
  };

  async function doUpload() {
    if (!file || !name.trim()) return;
    const form = new FormData();
    form.append('file', file);
    form.append('name', name.trim());
    if (description) form.append('description', description);
    form.append('environment', env);
    if (category) form.append('category', category);
    const res = await fetch('/api/v1/admin/assets/upload', { method: 'POST', body: form });
    if (res.ok) {
      setUploadOpen(false);
      resetUpload();
      // refresh
      const params = new URLSearchParams();
      params.set('environment', env);
      params.set('limit', String(perPage));
      params.set('offset', String(page * perPage));
      const fresh = await apiFetch<ListResponse>(`/api/v1/admin/assets?${params.toString()}`);
      setData(fresh || { assets: [], total: 0 });
    }
  }

  async function saveDetails(updates: Partial<Pick<Asset,'name'|'description'|'category'>>) {
    if (!detail) return;
    const res = await apiFetch<Asset>(`/api/v1/admin/assets/${detail.id}`, { method: 'PUT', body: JSON.stringify(updates) });
    if (res) {
      setDetail(res);
      // update list item inline
      setData(d => ({ ...d, assets: d.assets.map(a => a.id === res.id ? res : a) }));
    }
  }

  async function deleteAsset(a: Asset) {
    const ok = confirm(`Delete asset "${a.name}"? This cannot be undone.`);
    if (!ok) return;
    await apiFetch(`/api/v1/admin/assets/${a.id}`, { method: 'DELETE' }).catch(() => {});
    setDetail(null);
    // refresh page
    const params = new URLSearchParams();
    params.set('environment', env);
    params.set('limit', String(perPage));
    params.set('offset', String(page * perPage));
    const fresh = await apiFetch<ListResponse>(`/api/v1/admin/assets?${params.toString()}`);
    setData(fresh || { assets: [], total: 0 });
  }

  return (
    <div className="p-6 space-y-4">
      <div>
        <div className="text-2xl font-semibold">Asset Storage</div>
        <div className="text-slate-600">Manage uploaded files and media</div>
      </div>

      <div className="flex items-center justify-between">
        <Tabs value={env} onValueChange={(v) => setEnv(v as any)}>
          <TabsList>
            <TabsTrigger value="production">🟢 Production</TabsTrigger>
            <TabsTrigger value="test">🟡 Test</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2">
            <Button size="sm" variant={view === 'grid' ? 'default' : 'outline'} onClick={() => setView('grid')}>Grid</Button>
            <Button size="sm" variant={view === 'list' ? 'default' : 'outline'} onClick={() => setView('list')}>List</Button>
          </div>
          <Button size="sm" onClick={() => setUploadOpen(true)}>↑ Upload Asset</Button>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Input placeholder="Search assets..." value={search} onChange={(e) => setSearch(e.target.value)} />
        <select className="border rounded px-2 py-1 text-sm" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value as any)}>
          <option value="all">All Types</option>
          <option value="images">Images</option>
          <option value="documents">Documents</option>
          <option value="fonts">Fonts</option>
          <option value="other">Other</option>
        </select>
        <select className="border rounded px-2 py-1 text-sm" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value as any)}>
          <option value="all">All Categories</option>
          <option value="Image">Image</option>
          <option value="Document">Document</option>
          <option value="Font">Font</option>
          <option value="Template">Template</option>
          <option value="Icon">Icon</option>
          <option value="Other">Other</option>
        </select>
      </div>

      {view === 'grid' ? (
        <div>
          <div className="text-sm text-slate-600 mb-2">Showing {data.assets.length} assets in {env === 'production' ? 'Production' : 'Test'}</div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {data.assets.map(a => (
              <Card key={a.id} className="cursor-pointer" onClick={() => setDetail(a)}>
                <CardContent className="p-2">
                  <div className="aspect-square bg-slate-50 border rounded flex items-center justify-center overflow-hidden">
                    {isImage(a.mimeType) ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={a.publicUrl} alt={a.name} className="object-contain w-full h-full" />
                    ) : (
                      <div className="text-3xl">📄</div>
                    )}
                  </div>
                  <div className="mt-1 text-xs font-medium truncate" title={a.name}>{a.name}</div>
                  <div className="text-[10px] text-slate-500">{a.fileExtension} · {humanSize(a.fileSizeBytes)}</div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ) : (
        <div className="overflow-x-auto border rounded">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="p-2 text-left">Preview</th>
                <th className="p-2 text-left">Name</th>
                <th className="p-2 text-left">Filename</th>
                <th className="p-2 text-left">Type</th>
                <th className="p-2 text-left">Size</th>
                <th className="p-2 text-left">Category</th>
                <th className="p-2 text-left">Uploaded</th>
                <th className="p-2 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.assets.map(a => (
                <tr key={a.id} className="border-t">
                  <td className="p-2">
                    <div className="w-14 h-10 bg-slate-50 border rounded overflow-hidden flex items-center justify-center">
                      {isImage(a.mimeType) ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={a.publicUrl} alt={a.name} className="object-contain w-full h-full" />
                      ) : (
                        <div className="text-xl">📄</div>
                      )}
                    </div>
                  </td>
                  <td className="p-2">{a.name}</td>
                  <td className="p-2 text-slate-500">{a.filename}</td>
                  <td className="p-2 text-slate-500">{a.mimeType}</td>
                  <td className="p-2 text-slate-500">{humanSize(a.fileSizeBytes)}</td>
                  <td className="p-2 text-slate-500">{a.category || '-'}</td>
                  <td className="p-2 text-slate-500">{a.createdAt ? new Date(a.createdAt).toLocaleString() : ''}</td>
                  <td className="p-2"><Button size="sm" variant="outline" onClick={() => setDetail(a)}>Edit</Button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex items-center justify-end gap-2">
        <Button size="sm" variant="outline" disabled={page === 0} onClick={() => setPage(p => Math.max(0, p-1))}>Prev</Button>
        <div className="text-sm text-slate-600">Page {page + 1} / {pages}</div>
        <Button size="sm" variant="outline" disabled={page + 1 >= pages} onClick={() => setPage(p => p+1)}>Next</Button>
      </div>

      {/* Upload Modal */}
      <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Upload Asset</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <input type="file" onChange={(e) => setFile(e.target.files?.[0] || null)} />
              {file && <div className="text-xs text-slate-600 mt-1">File selected: {file.name} ({humanSize(file.size)})</div>}
            </div>
            <div>
              <Label className="text-xs text-slate-600">Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Company Logo - Dark" />
            </div>
            <div>
              <Label className="text-xs text-slate-600">Description</Label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional description..." />
            </div>
            <div>
              <Label className="text-xs text-slate-600">Category</Label>
              <select className="border rounded px-2 py-1 text-sm w-full" value={category} onChange={(e) => setCategory(e.target.value)}>
                <option>Image</option>
                <option>Document</option>
                <option>Font</option>
                <option>Template</option>
                <option>Icon</option>
                <option>Other</option>
              </select>
            </div>
            <div>
              <Label className="text-xs text-slate-600">Environment</Label>
              <select className="border rounded px-2 py-1 text-sm w-full" value={env} onChange={(e) => setEnv(e.target.value as any)}>
                <option value="production">Production</option>
                <option value="test">Test</option>
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUploadOpen(false)}>Cancel</Button>
            <Button onClick={doUpload} disabled={!file || !name.trim()}>Upload</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail Panel */}
      <Dialog open={!!detail} onOpenChange={(o) => !o ? setDetail(null) : null}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Asset Details</DialogTitle>
          </DialogHeader>
          {detail && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="bg-slate-50 border rounded aspect-video overflow-hidden flex items-center justify-center">
                  {isImage(detail.mimeType) ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={detail.publicUrl} alt={detail.name} className="object-contain w-full h-full" />
                  ) : (
                    <div className="text-4xl">📄</div>
                  )}
                </div>
                <div className="text-xs">Public URL</div>
                <div className="flex items-center gap-2">
                  <Input readOnly value={detail.publicUrl} />
                  <Button type="button" variant="outline" onClick={() => navigator.clipboard.writeText(detail.publicUrl)}>Copy</Button>
                </div>
              </div>
              <div className="space-y-3">
                <div>
                  <Label className="text-xs text-slate-600">Name</Label>
                  <Input value={detail.name} onChange={(e) => setDetail({ ...detail, name: e.target.value })} onBlur={() => saveDetails({ name: detail.name })} />
                </div>
                <div>
                  <Label className="text-xs text-slate-600">Description</Label>
                  <Textarea value={detail.description || ''} onChange={(e) => setDetail({ ...detail, description: e.target.value })} onBlur={() => saveDetails({ description: detail.description || '' })} />
                </div>
                <div>
                  <Label className="text-xs text-slate-600">Category</Label>
                  <select className="border rounded px-2 py-1 text-sm w-full" value={detail.category || ''} onChange={(e) => { const v = e.target.value || null; setDetail({ ...detail, category: v }); saveDetails({ category: v || undefined }); }}>
                    <option value="">(none)</option>
                    <option>Image</option>
                    <option>Document</option>
                    <option>Font</option>
                    <option>Template</option>
                    <option>Icon</option>
                    <option>Other</option>
                  </select>
                </div>
                <div className="pt-2">
                  <Button variant="destructive" onClick={() => deleteAsset(detail)}>Delete</Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
