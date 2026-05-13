"use client";

import { useEffect, useState, use } from "react";
import { apiFetch } from "@/lib/api";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Info, FileText } from "lucide-react";

interface TeamAggregate {
  teamId: string;
  teamName: string;
  memberCount: number;
  sharingMemberCount: number;
  meetsThreshold: boolean;
  aggregate?: {
    domainDistributions: {
      domain: string;
      bandCounts: Record<string, number>;
      meanScore: number;
    }[];
  };
}

export default function TeamDashboardPage({ params }: { params: Promise<{ slug: string, teamId: string }> }) {
  const { slug, teamId } = use(params);
  const [data, setData] = useState<TeamAggregate | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch<TeamAggregate>(`/organizations/teams/${teamId}/aggregate`)
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [teamId]);

  if (loading) return <div>Loading team data...</div>;
  if (!data) return <div>Team not found or access denied.</div>;

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold">{data.teamName} Dashboard</h1>
          <p className="text-muted-foreground">{data.memberCount} members · {data.sharingMemberCount} shared results</p>
        </div>
        <Button disabled={!data.meetsThreshold}>
          <FileText className="mr-2 h-4 w-4" /> Generate Team Report
        </Button>
      </div>

      {!data.meetsThreshold && (
        <div className="p-4 border border-amber-200 bg-amber-50 rounded-lg flex items-start space-x-3">
          <Info className="h-5 w-5 text-amber-600 mt-0.5" />
          <div className="text-sm text-amber-800">
            <strong>Anonymization threshold not met.</strong> We need at least 3 team members to share their results before aggregate data can be displayed. Currently {data.sharingMemberCount} of {data.memberCount} have shared.
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {data.meetsThreshold && data.aggregate?.domainDistributions.map((dist) => (
          <Card key={dist.domain}>
            <CardHeader>
              <CardTitle className="text-lg capitalize">{dist.domain} Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between text-sm">
                  <span>Mean Raw Score</span>
                  <span className="font-bold text-lg">{dist.meanScore.toFixed(1)}</span>
                </div>
                <div className="space-y-1">
                  {Object.entries(dist.bandCounts).map(([band, count]) => (
                    <div key={band} className="space-y-1">
                      <div className="flex justify-between text-xs capitalize">
                        <span>{band.replace('_', ' ')}</span>
                        <span>{count}</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-1.5">
                        <div 
                          className="bg-blue-600 h-1.5 rounded-full" 
                          style={{ width: `${(count / data.sharingMemberCount) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Team Members</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 border-b uppercase text-[10px] font-bold text-muted-foreground">
              <tr>
                <th className="px-6 py-3">Member</th>
                <th className="px-6 py-3">Sharing Status</th>
                <th className="px-6 py-3 text-right">Individual Report</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              <tr className="hover:bg-slate-50 transition-colors">
                <td className="px-6 py-4 font-medium">Sample Member</td>
                <td className="px-6 py-4">
                  <Badge variant="secondary">Shared</Badge>
                </td>
                <td className="px-6 py-4 text-right">
                  <Button variant="ghost" size="sm">View Report</Button>
                </td>
              </tr>
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
