"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { env } from "@/config";

interface Asset {
  id: string;
  name: string;
  url: string;
  content_type: string;
  size: number;
  folder: string;
  created_at: string;
}

export default function AssetsPage() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [folder, setFolder] = useState("general");

  useEffect(() => {
    fetchAssets();
  }, []);

  const fetchAssets = async () => {
    setLoading(true);
    try {
      const data = await apiFetch<Asset[]>("/api/v1/admin/assets");
      setAssets(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("folder", folder);

    try {
      await fetch(`${env.NEXT_PUBLIC_API_URL}/api/v1/admin/assets/upload`, {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      fetchAssets();
    } catch (error) {
      alert("Failed to upload asset");
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this asset?")) return;
    try {
      await apiFetch(`/api/v1/admin/assets/${id}`, { method: "DELETE" });
      fetchAssets();
    } catch (error) {
      alert("Failed to delete asset");
    }
  };

  if (loading && assets.length === 0) return <div>Loading...</div>;

  return (
    <div className="space-y-6 font-sans">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">Assets</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold text-slate-900">Upload New Asset</CardTitle>
        </CardHeader>
        <CardContent className="flex items-end space-x-6">
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Folder</label>
            <Input value={folder} onChange={(e) => setFolder(e.target.value)} placeholder="e.g. emails, ui" className="bg-slate-50 border-slate-200" />
          </div>
          <div className="flex-1 space-y-2">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">File</label>
            <Input type="file" onChange={handleUpload} disabled={uploading} className="bg-slate-50 border-slate-200 cursor-pointer" />
          </div>
          {uploading && <p className="text-sm text-blue-600 animate-pulse self-center pb-2 pl-2 font-medium">Uploading...</p>}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {assets.map((asset) => (
          <Card key={asset.id} className="group hover:shadow-md transition-shadow">
            <CardContent className="pt-6 space-y-3">
              <div className="aspect-video bg-slate-50 rounded-xl overflow-hidden flex items-center justify-center border border-slate-100 group-hover:border-slate-200 transition-colors">
                {asset.content_type.startsWith("image/") ? (
                  <img src={asset.url} alt={asset.name} className="object-contain w-full h-full" />
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <div className="p-3 bg-white rounded-lg shadow-sm">
                      <span className="text-blue-600 uppercase font-bold text-xs">{asset.content_type.split("/")[1]}</span>
                    </div>
                  </div>
                )}
              </div>
              <div className="space-y-1">
                <p className="font-semibold text-slate-900 truncate">{asset.name}</p>
                <div className="flex items-center gap-2 text-xs text-slate-400 font-medium uppercase tracking-wider">
                  <span>{asset.folder}</span>
                  <span>•</span>
                  <span>{(asset.size / 1024).toFixed(1)} KB</span>
                </div>
              </div>
              <div className="flex space-x-2 pt-2">
                <Button size="sm" variant="outline" className="flex-1 font-medium shadow-sm" onClick={() => {
                  navigator.clipboard.writeText(asset.url);
                  alert("URL copied to clipboard");
                }}>Copy URL</Button>
                <Button size="sm" variant="destructive" className="font-medium shadow-sm" onClick={() => handleDelete(asset.id)}>Delete</Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
