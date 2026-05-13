"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertTriangle, Trash2, XCircle } from "lucide-react";

interface DeletionRequest {
  id: string;
  status: 'pending' | 'executed' | 'cancelled';
  scheduledFor: string;
}

export default function SettingsPage() {
  const [profile, setProfile] = useState<any>(null);
  const [deletionRequest, setDeletionRequest] = useState<DeletionRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    Promise.all([
      apiFetch("/users/me"),
      apiFetch<DeletionRequest[]>("/users/me/deletion-request").catch(() => [])
    ]).then(([p, dr]) => {
      setProfile(p);
      if (Array.isArray(dr) && dr.length > 0) {
        setDeletionRequest(dr[0]);
      } else if (dr && !Array.isArray(dr)) {
        setDeletionRequest(dr as any);
      }
    }).finally(() => setLoading(false));
  }, []);

  const handleRequestDeletion = async () => {
    if (!confirm("Are you absolutely sure you want to delete your account? All your data will be permanently removed after 30 days.")) return;
    setActionLoading(true);
    try {
      const res = await apiFetch<DeletionRequest>("/users/me/deletion-request", { method: "POST" });
      setDeletionRequest(res);
      alert("Deletion scheduled. You will receive a confirmation email.");
    } catch (error) {
      alert("Failed to request deletion");
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelDeletion = async () => {
    setActionLoading(true);
    try {
      await apiFetch("/users/me/deletion-request", { method: "DELETE" });
      setDeletionRequest(null);
      alert("Deletion request cancelled.");
    } catch (error) {
      alert("Failed to cancel deletion");
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) return <div>Loading settings...</div>;

  return (
    <div className="max-w-4xl mx-auto space-y-8 py-8">
      <div>
        <h1 className="text-3xl font-bold">Account Settings</h1>
        <p className="text-muted-foreground">Manage your profile and account data.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Profile Information</CardTitle>
          <CardDescription>Update your personal details.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="email">Email Address</Label>
            <Input id="email" value={profile?.email || ""} disabled />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="name">Display Name</Label>
            <Input id="name" defaultValue={profile?.displayName || ""} />
          </div>
        </CardContent>
        <CardFooter>
          <Button disabled>Save Changes</Button>
        </CardFooter>
      </Card>

      <Card className="border-red-200 bg-red-50/30">
        <CardHeader>
          <CardTitle className="text-red-600 flex items-center">
            <AlertTriangle className="mr-2 h-5 w-5" /> Danger Zone
          </CardTitle>
          <CardDescription className="text-red-700">
            Permanent account deletion and data removal.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {deletionRequest ? (
            <div className="p-4 border border-red-200 rounded-lg bg-white space-y-4">
              <div className="flex items-start space-x-3">
                <Trash2 className="h-5 w-5 text-red-500 mt-0.5" />
                <div>
                  <div className="font-semibold text-red-900">Deletion Scheduled</div>
                  <p className="text-sm text-red-700">
                    Your account is scheduled for permanent deletion on <strong>{new Date(deletionRequest.scheduledFor).toLocaleDateString()}</strong>.
                  </p>
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={handleCancelDeletion} disabled={actionLoading}>
                <XCircle className="mr-2 h-4 w-4" /> Cancel Deletion Request
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-red-800">
                Once you delete your account, there is no going back. All your assessments, reports, and shares will be permanently wiped from our systems after a 30-day retention period.
              </p>
              <Button variant="destructive" onClick={handleRequestDeletion} disabled={actionLoading}>
                Delete My Account
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}