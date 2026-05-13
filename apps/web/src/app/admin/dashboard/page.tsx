"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Users, ClipboardCheck, Building2, DollarSign } from "lucide-react";
import Link from "next/link";

interface AdminStats {
  totalUsers: number;
  usersTrend: number;
  totalAssessments: number;
  assessmentsTrend: number;
  totalOrgs: number;
  totalRevenue: number;
  monthlyRevenue: number;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch<AdminStats>("/admin/stats")
      .then(setStats)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div>Loading dashboard...</div>;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Platform Admin Dashboard</h1>
        <p className="text-muted-foreground">Comprehensive system overview and management.</p>
      </div>
      
      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalUsers}</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-green-600 font-medium">+{stats?.usersTrend}</span> this week
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed Assessments</CardTitle>
            <ClipboardCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalAssessments}</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-green-600 font-medium">+{stats?.assessmentsTrend}</span> this week
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Organisations</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalOrgs}</div>
            <p className="text-xs text-muted-foreground">Across all regions</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${stats?.totalRevenue.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-blue-600 font-medium">${stats?.monthlyRevenue.toLocaleString()}</span> this month
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Content Management</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Link href="/admin/cms" className="block p-2 hover:bg-slate-50 rounded border text-sm font-medium">
              CMS Content Blocks
            </Link>
            <Link href="/admin/templates" className="block p-2 hover:bg-slate-50 rounded border text-sm font-medium">
              Report Templates
            </Link>
            <Link href="/admin/email-templates" className="block p-2 hover:bg-slate-50 rounded border text-sm font-medium">
              Email Templates
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>User & System</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Link href="/admin/users" className="block p-2 hover:bg-slate-50 rounded border text-sm font-medium">
              User Management
            </Link>
            <Link href="/admin/bulk" className="block p-2 hover:bg-slate-50 rounded border text-sm font-medium">
              Bulk Operations
            </Link>
            <Link href="/admin/audit" className="block p-2 hover:bg-slate-50 rounded border text-sm font-medium">
              Audit Logs
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Infrastructure</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Link href="/admin/assets" className="block p-2 hover:bg-slate-50 rounded border text-sm font-medium">
              Asset Storage (DO Spaces)
            </Link>
            <div className="p-2 border rounded bg-slate-50 text-xs font-mono">
              API Version: v1.2.0<br/>
              Environment: {process.env.NEXT_PUBLIC_API_URL?.includes('localhost') ? 'Development' : 'Production'}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
