"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, Clock, Trash2 } from "lucide-react";

interface DeletionRequest {
  id: string;
  userId: string;
  status: 'pending' | 'executed' | 'cancelled';
  requestedAt: string;
  scheduledFor: string;
}

export default function AdminDeletionQueuePage() {
  const [requests, setRequests] = useState<DeletionRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<DeletionRequest[]>("/api/v1/admin/deletion-requests")
      .then(setRequests)
      .finally(() => setLoading(false));
  }, []);

  const handleExecuteNow = async (requestId: string) => {
    if (!confirm("Are you sure you want to execute this deletion immediately? This cannot be undone.")) return;
    setActionLoading(requestId);
    try {
      await apiFetch(`/api/v1/admin/deletion-requests/${requestId}/execute`, { method: "POST" });
      setRequests(requests.filter(r => r.id !== requestId));
      alert("User data deleted successfully.");
    } catch (error) {
      alert("Failed to execute deletion");
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) return <div>Loading deletion queue...</div>;

  return (
    <div className="space-y-6 font-sans">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">GDPR Deletion Queue</h1>
      </div>

      <div className="grid gap-4">
        {requests.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-12 text-center">
            <Trash2 className="w-10 h-10 text-slate-200 mx-auto mb-3" />
            <p className="text-slate-500 font-medium">No pending deletion requests</p>
            <p className="text-xs text-slate-400 mt-1">All GDPR requests have been processed</p>
          </div>
        ) : (
          requests.map((request) => (
            <div key={request.id} className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
              <div className="flex items-start justify-between">
                <div className="space-y-3">
                  <div className="flex items-center space-x-3">
                    <span className="px-2.5 py-1 bg-slate-100 rounded text-xs font-mono font-medium text-slate-600 border border-slate-200">
                      {request.userId}
                    </span>
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold tracking-wide uppercase bg-amber-50 text-amber-700 border border-amber-100">
                      Pending
                    </span>
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex items-center text-sm text-slate-500">
                      <Clock className="mr-2 h-4 w-4 text-slate-400" />
                      Requested: {new Date(request.requestedAt).toLocaleString()}
                    </div>
                    <div className="flex items-center text-sm font-medium text-blue-600">
                      <AlertCircle className="mr-2 h-4 w-4" />
                      Scheduled for: {new Date(request.scheduledFor).toLocaleDateString()}
                    </div>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <Button 
                    variant="destructive" 
                    size="sm" 
                    className="font-medium shadow-sm"
                    onClick={() => handleExecuteNow(request.id)}
                    disabled={!!actionLoading}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    {actionLoading === request.id ? "Executing..." : "Execute Immediately"}
                  </Button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}