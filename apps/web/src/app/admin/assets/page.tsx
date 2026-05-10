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
      const data = await apiFetch<Asset[]>("/api/admin/assets");
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
      await fetch(`${env.NEXT_PUBLIC_API_URL}/api/admin/assets/upload`, {
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
      await apiFetch(`/api/admin/assets/${id}`, { method: "DELETE" });
      fetchAssets();
    } catch (error) {
      alert("Failed to delete asset");
    }
  };

  if (loading && assets.length === 0) return <div>Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Assets</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Upload New Asset</CardTitle>
        </CardHeader>
        <CardContent className="flex items-end space-x-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Folder</label>
            <Input value={folder} onChange={(e) => setFolder(e.target.value)} placeholder="e.g. emails, ui" />
          </div>
          <div className="flex-1 space-y-2">
            <label className="text-sm font-medium">File</label>
            <Input type="file" onChange={handleUpload} disabled={uploading} />
          </div>
          {uploading && <p className="text-sm self-center pb-2 pl-2">Uploading...</p>}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {assets.map((asset) => (
          <Card key={asset.id}>
            <CardContent className="pt-6 space-y-2">
              <div className="aspect-square bg-slate-200 rounded-md overflow-hidden flex items-center justify-center">
                {asset.content_type.startsWith("image/") ? (
                  <img src={asset.url} alt={asset.name} className="object-contain w-full h-full" />
                ) : (
                  <span className="text-slate-500 uppercase font-bold">{asset.content_type.split("/")[1]}</span>
                )}
              </div>
              <div>
                <p className="font-semibold truncate">{asset.name}</p>
                <p className="text-xs text-muted-foreground">{asset.folder} • {(asset.size / 1024).toFixed(1)} KB</p>
              </div>
              <div className="flex space-x-2 pt-2">
                <Button size="sm" variant="outline" className="flex-1" onClick={() => {
                  navigator.clipboard.writeText(asset.url);
                  alert("URL copied to clipboard");
                }}>Copy URL</Button>
                <Button size="sm" variant="destructive" onClick={() => handleDelete(asset.id)}>Delete</Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
