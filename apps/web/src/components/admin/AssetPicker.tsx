"use client";

import { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Image from 'next/image';
import { apiFetch } from '@/lib/api';

interface Asset {
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
}

interface AssetPickerProps {
  value: string;                    // Current asset URL (or empty)
  onChange: (url: string) => void;  // Called when an asset is selected
  environment?: 'production' | 'test';
  mimeTypeFilter?: string;         // e.g., 'image/*' to only show images
  label?: string;
}

function humanSize(bytes: number) {
  if (!bytes && bytes !== 0) return '';
  const units = ['B','KB','MB','GB'];
  let b = bytes;
  let i = 0;
  while (b >= 1024 && i < units.length - 1) { b /= 1024; i++; }
  return `${b.toFixed(b < 10 ? 1 : 0)}${units[i]}`;
}

function isImage(mime: string) {
  return mime?.startsWith('image/');
}

export function AssetPicker({ value, onChange, environment = 'production', mimeTypeFilter, label }: AssetPickerProps) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [env, setEnv] = useState<'production'|'test'>(environment);
  const [type, setType] = useState<string>(mimeTypeFilter || 'all');
  const [assets, setAssets] = useState<Asset[]>([]);
  const [selected, setSelected] = useState<Asset | null>(null);
  const [urlEntry, setUrlEntry] = useState(value || '');
  const [loading, setLoading] = useState(false);

  useEffect(() => { setUrlEntry(value || ''); }, [value]);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    if (env) params.set('environment', env);
    if (type && type !== 'all') params.set('mimeType', type);
    apiFetch<Asset[]>(`/api/v1/admin/assets/search?${params.toString()}`)
      .then((data) => setAssets(data || []))
      .catch(() => setAssets([]))
      .finally(() => setLoading(false));
  }, [open, q, env, type]);

  const preview = value ? (
    value.match(/\.(png|jpg|jpeg|gif|webp|svg)(\?|$)/i) ? (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={value} alt="Selected asset" className="h-10 w-auto rounded border" />
    ) : (
      <a href={value} target="_blank" rel="noreferrer" className="text-blue-600 underline break-all text-xs">{value}</a>
    )
  ) : (
    <span className="text-xs text-slate-500">No asset selected</span>
  );

  return (
    <div className="space-y-1">
      {label && <div className="text-xs font-medium text-slate-600">{label}</div>}
      <div className="flex items-center gap-2">
        <div className="flex-1 min-w-0">{preview}</div>
        <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)}>Browse</Button>
        <Input className="flex-[2]" value={urlEntry} onChange={(e) => { setUrlEntry(e.target.value); onChange(e.target.value); }} placeholder="https://..." />
        <Button type="button" variant="ghost" size="sm" onClick={() => { onChange(''); setUrlEntry(''); }}>Clear</Button>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Select Asset</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Input placeholder="Search..." value={q} onChange={(e) => setQ(e.target.value)} />
              <select className="border rounded px-2 py-1 text-sm" value={type} onChange={(e) => setType(e.target.value)}>
                <option value="all">All types</option>
                <option value="image/*">Images</option>
                <option value="application/pdf">PDF</option>
                <option value="text/plain">Text</option>
              </select>
              <Tabs value={env} onValueChange={(v) => setEnv(v as any)}>
                <TabsList>
                  <TabsTrigger value="production">Production</TabsTrigger>
                  <TabsTrigger value="test">Test</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 max-h-[420px] overflow-y-auto">
              {assets.map(a => (
                <Card key={a.id} onClick={() => setSelected(a)} className={`cursor-pointer ${selected?.id === a.id ? 'ring-2 ring-blue-500' : ''}`}>
                  <CardContent className="p-2">
                    <div className="aspect-video bg-slate-50 border rounded flex items-center justify-center overflow-hidden">
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
              {!loading && assets.length === 0 && (
                <div className="col-span-full text-center text-sm text-slate-500 py-8">No assets found</div>
              )}
            </div>

            <div>
              <div className="text-xs text-slate-500 mb-1">Or enter URL directly:</div>
              <Input value={urlEntry} onChange={(e) => setUrlEntry(e.target.value)} placeholder="https://..." />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="button" onClick={() => { onChange(selected?.publicUrl || urlEntry); setOpen(false); }}>Select</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default AssetPicker;
