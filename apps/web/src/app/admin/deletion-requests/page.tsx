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
    apiFetch<DeletionRequest[]>("/admin/deletion-requests")
      .then(setRequests)
      .finally(() => setLoading(false));
  }, []);

  const handleExecuteNow = async (requestId: string) => {
    if (!confirm("Are you sure you want to execute this deletion immediately? This cannot be undone.")) return;
    setActionLoading(requestId);
    try {
      await apiFetch(`/admin/deletion-requests/${requestId}/execute`, { method: "POST" });
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
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">GDPR Deletion Queue</h1>
      </div>

      <div className="grid gap-4">
        {requests.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">
              No pending deletion requests.
            </CardContent>
          </Card>
        ) : (
          requests.map((request) => (
            <Card key={request.id}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <span className="font-mono text-sm">{request.userId}</span>
                      <Badge variant="outline">Pending</Badge>
                    </div>
                    <div className="flex items-center text-sm text-muted-foreground">
                      <Clock className="mr-1 h-4 w-4" />
                      Requested: {new Date(request.requestedAt).toLocaleString()}
                    </div>
                    <div className="flex items-center text-sm font-medium text-amber-600">
                      <AlertCircle className="mr-1 h-4 w-4" />
                      Scheduled for: {new Date(request.scheduledFor).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <Button 
                      variant="destructive" 
                      size="sm" 
                      onClick={() => handleExecuteNow(request.id)}
                      disabled={!!actionLoading}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      {actionLoading === request.id ? "Executing..." : "Execute Immediately"}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}