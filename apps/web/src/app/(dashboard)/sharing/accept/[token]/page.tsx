"use client";

import { useEffect, useState, use } from "react";
import { apiFetch } from "@/lib/api";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, CheckCircle2, XCircle } from "lucide-react";
import { useRouter } from "next/navigation";

export default function AcceptPeerSharePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const handleAccept = async () => {
    setLoading(true);
    try {
      await apiFetch("/sharing/peers/accept", {
        method: "POST",
        body: JSON.stringify({ token })
      });
      setStatus('success');
      setTimeout(() => router.push("/sharing"), 2000);
    } catch (err) {
      setStatus('error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto bg-blue-50 w-16 h-16 rounded-full flex items-center justify-center mb-4">
            <Users className="h-8 w-8 text-blue-600" />
          </div>
          <CardTitle className="text-2xl">Peer Share Invitation</CardTitle>
        </CardHeader>
        
        <CardContent className="text-center space-y-4">
          {status === 'idle' && (
            <p className="text-muted-foreground">
              Someone has invited you to share your assessment results and compare architectures. 
              By accepting, you will both be able to see each other's base reports.
            </p>
          )}

          {status === 'success' && (
            <div className="flex flex-col items-center space-y-2 text-green-600">
              <CheckCircle2 className="h-12 w-12" />
              <p className="font-semibold">Invitation Accepted!</p>
              <p className="text-sm text-muted-foreground text-center">Redirecting you to your sharing dashboard...</p>
            </div>
          )}

          {status === 'error' && (
            <div className="flex flex-col items-center space-y-2 text-red-600">
              <XCircle className="h-12 w-12" />
              <p className="font-semibold">Invitation Failed</p>
              <p className="text-sm text-muted-foreground text-center">This invitation may have expired or is invalid.</p>
            </div>
          )}
        </CardContent>

        <CardFooter className="flex flex-col space-y-2">
          {status === 'idle' && (
            <>
              <Button className="w-full" onClick={handleAccept} disabled={loading}>
                {loading ? "Accepting..." : "Accept Invitation"}
              </Button>
              <Button variant="ghost" className="w-full" onClick={() => router.push("/")}>
                Decline
              </Button>
            </>
          )}
          {status === 'error' && (
            <Button className="w-full" onClick={() => router.push("/")}>
              Back to Home
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}
