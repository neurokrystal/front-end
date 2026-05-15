"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { 
  Users, ClipboardCheck, Building2, DollarSign, 
  PlusCircle, FileText, Download, Search, ArrowUpRight, ArrowDownRight,
  TrendingUp, TrendingDown, Minus, BarChart3
} from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface AdminStats {
  totalUsers: number;
  totalUsersThisWeek: number;
  completedAssessments: number;
  completedAssessmentsThisWeek: number;
  activeOrganisations: number;
  totalRevenueCents: number;
  revenueThisMonthCents: number;
}

interface TimelineData {
  date: string;
  count: number;
}

interface DomainDistribution {
  band: string;
  domain: string;
  count: number;
}

interface AuditLog {
  id: string;
  actorUserId: string;
  action: string;
  resourceType: string;
  resourceId: string;
  subjectUserId: string;
  createdAt: string;
  actorName?: string;
  subjectName?: string;
}

const formatCurrency = (cents: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(cents / 100);
};

const getRelativeTime = (date: string | Date) => {
    const now = new Date();
    const then = new Date(date);
    const diffInSeconds = Math.floor((now.getTime() - then.getTime()) / 1000);

    if (diffInSeconds < 60) return "just now";
    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) return `${diffInMinutes} min ago`;
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;
    return then.toLocaleDateString();
};

const LineChart = ({ data }: { data: TimelineData[] }) => {
  if (!data || data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-slate-400">
        <BarChart3 className="w-10 h-10 mb-3 text-slate-300" />
        <p className="text-sm">No data available yet</p>
        <p className="text-xs text-slate-300 mt-1">Data will appear once assessments are completed</p>
      </div>
    );
  }
  
  const width = 600;
  const height = 300;
  const padding = 40;
  
  const maxCount = Math.max(...data.map(d => d.count), 5);
  const points = data.map((d, i) => {
    const x = padding + (i / (data.length - 1 || 1)) * (width - padding * 2);
    const y = height - padding - (d.count / maxCount) * (height - padding * 2);
    return `${x},${y}`;
  }).join(' ');

  return (
    <div className="w-full h-[300px]">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full" preserveAspectRatio="none">
        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map(p => (
          <line 
            key={p}
            x1={padding} 
            y1={padding + p * (height - padding * 2)} 
            x2={width - padding} 
            y2={padding + p * (height - padding * 2)} 
            stroke="#E2E8F0" 
            strokeWidth="1"
            strokeDasharray="4 4"
          />
        ))}
        {/* Line */}
        <polyline
          fill="none"
          stroke="#4A90D9"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          points={points}
        />
        {/* Points */}
        {data.map((d, i) => {
          const x = padding + (i / (data.length - 1 || 1)) * (width - padding * 2);
          const y = height - padding - (d.count / maxCount) * (height - padding * 2);
          return <circle key={i} cx={x} cy={y} r="4" fill="#4A90D9" />;
        })}
      </svg>
    </div>
  );
};

const BarChart = ({ data }: { data: DomainDistribution[] }) => {
  if (!data || data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-slate-400">
        <BarChart3 className="w-10 h-10 mb-3 text-slate-300" />
        <p className="text-sm">No data available yet</p>
        <p className="text-xs text-slate-300 mt-1">Data will appear once assessments are scored</p>
      </div>
    );
  }

  const domains = ['safety', 'challenge', 'play'];
  const domainColors: Record<string, string> = {
    'safety': '#4A90D9',
    'challenge': '#F59E0B',
    'play': '#10B981'
  };

  const bands = Array.from(new Set(data.map(d => d.band)));
  const width = 400;
  const height = 300;
  const padding = 40;
  
  const maxCount = Math.max(...data.map(d => d.count), 1);
  const barWidth = (width - padding * 2) / (bands.length || 1);

  return (
    <div className="w-full h-[300px]">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full" preserveAspectRatio="none">
         {/* Grid lines */}
         {[0, 0.25, 0.5, 0.75, 1].map(p => (
          <line 
            key={p}
            x1={padding} 
            y1={padding + p * (height - padding * 2)} 
            x2={width - padding} 
            y2={padding + p * (height - padding * 2)} 
            stroke="#E2E8F0" 
            strokeWidth="1"
            strokeDasharray="4 4"
          />
        ))}
        
        {bands.map((band, bandIdx) => {
           return domains.map((domain, domIdx) => {
              const item = data.find(d => d.band === band && d.domain === domain);
              const count = item?.count || 0;
              const bH = (count / maxCount) * (height - padding * 2);
              const bW = (barWidth - 10) / domains.length;
              const x = padding + bandIdx * barWidth + domIdx * bW + 5;
              const y = height - padding - bH;
              return (
                <rect 
                  key={`${band}-${domain}`}
                  x={x}
                  y={y}
                  width={bW - 2}
                  height={bH}
                  fill={domainColors[domain]}
                  rx="1"
                />
              );
           });
        })}
      </svg>
    </div>
  );
};

export default function AdminDashboard() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [timeline, setTimeline] = useState<TimelineData[]>([]);
  const [distribution, setDistribution] = useState<DomainDistribution[]>([]);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [statsData, timelineData, distributionData, logsData] = await Promise.all([
          apiFetch<AdminStats>("/api/v1/admin/stats"),
          apiFetch<TimelineData[]>("/api/v1/admin/stats/assessments-timeline"),
          apiFetch<DomainDistribution[]>("/api/v1/admin/stats/domain-distribution"),
          apiFetch<AuditLog[]>("/api/v1/admin/audit/logs?limit=20")
        ]);
        setStats(statsData);
        setTimeline(timelineData);
        setDistribution(distributionData);
        setLogs(logsData);
      } catch (error) {
        console.error("Failed to fetch dashboard data:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#4A90D9]"></div>
      </div>
    );
  }

  const statCards = [
    { 
      label: "Total Users", 
      value: stats?.totalUsers || 0, 
      trend: stats?.totalUsersThisWeek || 0, 
      icon: Users, 
      bgColor: "bg-blue-50",
      iconColor: "text-blue-600"
    },
    { 
      label: "Completed Assessments", 
      value: stats?.completedAssessments || 0, 
      trend: stats?.completedAssessmentsThisWeek || 0, 
      icon: ClipboardCheck, 
      bgColor: "bg-emerald-50",
      iconColor: "text-emerald-600"
    },
    { 
      label: "Active Organisations", 
      value: stats?.activeOrganisations || 0, 
      trend: 0, 
      icon: Building2, 
      bgColor: "bg-violet-50",
      iconColor: "text-violet-600"
    },
    { 
      label: "Total Revenue", 
      value: formatCurrency(stats?.totalRevenueCents || 0), 
      trend: formatCurrency(stats?.revenueThisMonthCents || 0), 
      icon: DollarSign, 
      bgColor: "bg-amber-50",
      iconColor: "text-amber-600",
      isCurrency: true
    },
  ];

  return (
    <div className="space-y-8 pb-12 font-sans">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((card, idx) => (
          <div key={idx} className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">{card.label}</p>
              <p className="mt-2 text-3xl font-semibold text-slate-900 tabular-nums">{card.value}</p>
              <div className="mt-1 flex items-center gap-1">
                {typeof card.trend === 'number' ? (
                  card.trend > 0 ? (
                    <p className="text-sm text-emerald-600 font-medium flex items-center gap-1">
                      <TrendingUp className="w-3.5 h-3.5" />
                      +{card.trend} this week
                    </p>
                  ) : (
                    <p className="text-sm text-slate-400 font-medium">0 this week</p>
                  )
                ) : (
                  <p className="text-sm text-emerald-600 font-medium">{card.trend} this month</p>
                )}
              </div>
            </div>
            <div className={cn("p-2.5 rounded-lg", card.bgColor)}>
              <card.icon className={cn("w-5 h-5", card.iconColor)} />
            </div>
          </div>
        ))}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3 bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-base font-semibold text-slate-900">Assessments Over Time</h3>
            <select className="w-full text-sm text-slate-700 bg-white border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/20">
              <option>Last 30 days</option>
              <option>Last 90 days</option>
            </select>
          </div>
          <LineChart data={timeline} />
        </div>
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-base font-semibold text-slate-900">Domain Score Distribution</h3>
          </div>
          <BarChart data={distribution} />
          <div className="flex justify-center gap-4 mt-6">
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 bg-[#4A90D9] rounded-full" />
              <span className="text-xs font-medium text-slate-500">Safety</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 bg-[#F59E0B] rounded-full" />
              <span className="text-xs font-medium text-slate-500">Challenge</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 bg-[#10B981] rounded-full" />
              <span className="text-xs font-medium text-slate-500">Play</span>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Grant Comp Account", icon: PlusCircle, href: "/admin/users", color: "text-blue-600", bg: "bg-blue-50" },
          { label: "Regenerate Reports", icon: FileText, href: "/admin/report-templates", color: "text-emerald-600", bg: "bg-emerald-50" },
          { label: "Export Users", icon: Download, href: "/admin/users", color: "text-violet-600", bg: "bg-violet-50" },
          { label: "View Audit Log", icon: Search, href: "/admin/audit-logs", color: "text-amber-600", bg: "bg-amber-50" },
        ].map((action, idx) => (
          <Link key={idx} href={action.href} className="block">
            <button className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex items-center gap-3 hover:shadow-md hover:border-slate-300 transition-all duration-200 group w-full text-left">
              <div className="p-2 bg-slate-100 rounded-lg group-hover:bg-opacity-100 group-hover:bg-slate-200 transition-colors">
                <action.icon className="w-4 h-4 text-slate-600 group-hover:text-slate-900 transition-colors" />
              </div>
              <span className="text-sm font-medium text-slate-700 group-hover:text-slate-900">{action.label}</span>
            </button>
          </Link>
        ))}
      </div>

      {/* Recent Activity Feed */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 flex items-center justify-between border-b border-slate-100">
          <h3 className="text-base font-semibold text-slate-900">Recent Activity</h3>
          <Link href="/admin/audit-logs" className="text-sm text-blue-600 hover:text-blue-700 font-medium">
            View all →
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Time</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Actor</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Action</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Resource</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Subject</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 text-sm text-slate-500 whitespace-nowrap">
                    {getRelativeTime(log.createdAt)}
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-slate-900">
                    <Link href={`/admin/users/${log.actorUserId}`} className="hover:text-blue-600 transition-colors">
                      {log.actorName || log.actorUserId.slice(0, 8)}
                    </Link>
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-600">
                      {log.action}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-500">
                    {log.resourceType} #{log.resourceId.slice(0, 5)}
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-900">
                     <Link href={`/admin/users/${log.subjectUserId}`} className="hover:text-blue-600 transition-colors">
                      {log.subjectName || (log.subjectUserId === log.actorUserId ? "(self)" : log.subjectUserId.slice(0, 8))}
                    </Link>
                  </td>
                </tr>
              ))}
              {logs.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                    No recent activity found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
