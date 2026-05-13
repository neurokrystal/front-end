"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Users, FileSearch, TrendingUp, Award, UserPlus } from "lucide-react";
import Link from "next/link";

interface CoachClient {
  id: string;
  clientUserId: string;
  clientEmail: string;
  status: string;
  acceptedAt: string | null;
}

interface Certification {
  id: string;
  status: 'active' | 'lapsed' | 'suspended' | 'revoked';
  expiresAt: string;
}

export default function CoachDashboard() {
  const [clients, setClients] = useState<CoachClient[]>([]);
  const [cert, setCert] = useState<Certification | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      apiFetch<CoachClient[]>('/coaching/my-clients').catch(() => []),
      apiFetch<Certification>('/coaching/certification').catch(() => null)
    ]).then(([cl, c]) => {
      setClients(cl);
      setCert(c);
    }).finally(() => setLoading(false));
  }, []);

  if (loading) return <div>Loading coach portal...</div>;

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold">Coach Portal</h1>
          <p className="text-muted-foreground">Manage your clients and clinical formulations.</p>
        </div>
        <div className="flex space-x-2">
          {cert && (
            <Badge variant={cert.status === 'active' ? 'default' : 'destructive'} className="h-fit px-3 py-1">
              <Award className="mr-1 h-3 w-3" /> 
              Cert: {cert.status.toUpperCase()}
            </Badge>
          )}
          <Button>
            <UserPlus className="mr-2 h-4 w-4" /> Invite New Client
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Active Clients</CardTitle>
            <CardDescription>View your active coaching relationships and their progress.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {clients.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground border-t">
                No active clients. Invite your first client to get started.
              </div>
            ) : (
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 border-y uppercase text-[10px] font-bold text-muted-foreground">
                  <tr>
                    <th className="px-6 py-3">Client</th>
                    <th className="px-6 py-3">Since</th>
                    <th className="px-6 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {clients.map((client) => (
                    <tr key={client.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-medium text-slate-900">{client.clientEmail}</div>
                        <div className="text-[10px] text-muted-foreground font-mono">{client.clientUserId}</div>
                      </td>
                      <td className="px-6 py-4 text-muted-foreground">
                        {client.acceptedAt ? new Date(client.acceptedAt).toLocaleDateString() : 'Pending'}
                      </td>
                      <td className="px-6 py-4 text-right space-x-2">
                        <Button variant="outline" size="sm" asChild>
                          <Link href={`/reports/generate?type=client_formulation&subjectId=${client.clientUserId}`}>
                            <FileSearch className="mr-1 h-3.5 w-3.5" /> Formulation
                          </Link>
                        </Button>
                        <Button variant="outline" size="sm" asChild>
                          <Link href={`/reports/generate?type=progress&subjectId=${client.clientUserId}`}>
                            <TrendingUp className="mr-1 h-3.5 w-3.5" /> Progress
                          </Link>
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Certification Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              {cert ? (
                <>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Expires:</span>
                    <span className="font-medium">{new Date(cert.expiresAt).toLocaleDateString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Status:</span>
                    <span className={`font-bold ${cert.status === 'active' ? 'text-green-600' : 'text-red-600'}`}>
                      {cert.status.toUpperCase()}
                    </span>
                  </div>
                  <Button variant="outline" className="w-full" disabled>Renew Certification</Button>
                </>
              ) : (
                <p className="text-muted-foreground italic">No certification record found.</p>
              )}
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Coaching Tools</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button variant="ghost" className="w-full justify-start h-auto py-2 px-3 border border-transparent hover:border-slate-200" disabled>
                <div className="text-left">
                  <div className="font-semibold text-sm">Group Workshop Tool</div>
                  <div className="text-[10px] text-muted-foreground">Generate aggregate views for teams.</div>
                </div>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
