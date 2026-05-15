"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import {
  Users,
  ClipboardCheck,
  Building2,
  DollarSign,
  PlusCircle,
  Download,
  Search,
  TrendingUp,
  TrendingDown,
  Minus,
  BarChart3,
  RefreshCw,
} from "lucide-react";
import Link from "next/link";
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
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-16 h-16 rounded-2xl bg-white/[0.05] border border-white/[0.1] flex items-center justify-center mb-4">
          <BarChart3 className="w-8 h-8 text-white/15" />
        </div>
        <p className="text-sm text-white/40">No data yet</p>
        <p className="text-xs text-white/20 mt-1">Assessments will appear here once completed</p>
      </div>
    );
  }

  const width = 600;
  const height = 300;
  const padding = 40;

  const maxCount = Math.max(...data.map((d) => d.count), 5);
  const points = data
    .map((d, i) => {
      const x = padding + (i / (data.length - 1 || 1)) * (width - padding * 2);
      const y = height - padding - (d.count / maxCount) * (height - padding * 2);
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <div className="w-full h-[300px]">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full" preserveAspectRatio="none">
        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((p) => (
          <line
            key={p}
            x1={padding}
            y1={padding + p * (height - padding * 2)}
            x2={width - padding}
            y2={padding + p * (height - padding * 2)}
            stroke="rgba(255,255,255,0.06)"
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
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-16 h-16 rounded-2xl bg-white/[0.05] border border-white/[0.1] flex items-center justify-center mb-4">
          <BarChart3 className="w-8 h-8 text-white/15" />
        </div>
        <p className="text-sm text-white/40">No data yet</p>
        <p className="text-xs text-white/20 mt-1">Assessments will appear here once scored</p>
      </div>
    );
  }

  const domains = ["safety", "challenge", "play"];
  const domainColors: Record<string, string> = {
    safety: "#4A90D9",
    challenge: "#F5A623",
    play: "#7ED321",
  };

  const bands = Array.from(new Set(data.map((d) => d.band)));
  const width = 400;
  const height = 300;
  const padding = 40;

  const maxCount = Math.max(...data.map((d) => d.count), 1);
  const barWidth = (width - padding * 2) / (bands.length || 1);

  return (
    <div className="w-full h-[300px]">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full" preserveAspectRatio="none">
        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((p) => (
          <line
            key={p}
            x1={padding}
            y1={padding + p * (height - padding * 2)}
            x2={width - padding}
            y2={padding + p * (height - padding * 2)}
            stroke="rgba(255,255,255,0.06)"
            strokeWidth="1"
            strokeDasharray="4 4"
          />
        ))}

        {bands.map((band, bandIdx) => {
          return domains.map((domain, domIdx) => {
            const item = data.find((d) => d.band === band && d.domain === domain);
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
                rx="2"
                opacity="0.85"
              />
            );
          });
        })}
      </svg>
    </div>
  );
};

function GlassCard({
  children,
  className = "",
  glow,
}: {
  children: React.ReactNode;
  className?: string;
  glow?: "blue" | "amber" | "green" | "none";
}) {
  const glowColors: Record<NonNullable<typeof glow>, string> = {
    blue: "shadow-[0_0_40px_-10px_rgba(74,144,217,0.3)]",
    amber: "shadow-[0_0_40px_-10px_rgba(245,166,35,0.3)]",
    green: "shadow-[0_0_40px_-10px_rgba(126,211,33,0.3)]",
    none: "shadow-lg shadow-black/10",
  } as const;

  return (
    <div
      className={cn(
        "relative rounded-2xl overflow-hidden glass-panel glass-card",
        "bg-white/[0.07] backdrop-blur-xl border border-white/[0.12]",
        glow ? glowColors[glow] : glowColors["none"],
        className
      )}
      style={{
        WebkitBackdropFilter: "blur(16px) saturate(180%)",
        backdropFilter: "blur(16px) saturate(180%)",
      }}
    >
      {/* Top highlight line */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
      {children}
    </div>
  );
}

function getActionStyle(action: string) {
  if (action.toLowerCase().includes("denied") || action.toLowerCase().includes("delete"))
    return { background: "rgba(239,68,68,0.15)", color: "#FCA5A5", borderColor: "rgba(239,68,68,0.3)" } as React.CSSProperties;
  if (action.toLowerCase().includes("share") || action.toLowerCase().includes("report"))
    return { background: "rgba(74,144,217,0.15)", color: "#93C5FD", borderColor: "rgba(74,144,217,0.3)" } as React.CSSProperties;
  if (action.toLowerCase().includes("admin") || action.toLowerCase().includes("billing"))
    return { background: "rgba(245,166,35,0.15)", color: "#FCD34D", borderColor: "rgba(245,166,35,0.3)" } as React.CSSProperties;
  return { background: "rgba(126,211,33,0.15)", color: "#BEF264", borderColor: "rgba(126,211,33,0.3)" } as React.CSSProperties;
}

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
      <div className="relative min-h-screen overflow-hidden font-sans">
        <div className="absolute inset-0 bg-[#0B0F19]" />
        <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full bg-[#4A90D9] opacity-[0.15] blur-[120px]" />
        <div className="absolute top-[30%] right-[-5%] w-[500px] h-[500px] rounded-full bg-[#F5A623] opacity-[0.12] blur-[100px]" />
        <div className="absolute bottom-[-10%] left-[30%] w-[500px] h-[500px] rounded-full bg-[#7ED321] opacity-[0.10] blur-[100px]" />
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />
        <div className="relative z-10 min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-2 border-white/20 border-t-[#4A90D9]" />
        </div>
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
    <div className="relative min-h-screen overflow-hidden font-sans">
      {/* Dark base */}
      <div className="absolute inset-0 bg-[#0B0F19]" />

      {/* Ambient color orbs */}
      <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full bg-[#4A90D9] opacity-[0.15] blur-[120px]" />
      <div className="absolute top-[30%] right-[-5%] w-[500px] h-[500px] rounded-full bg-[#F5A623] opacity-[0.12] blur-[100px]" />
      <div className="absolute bottom-[-10%] left-[30%] w-[500px] h-[500px] rounded-full bg-[#7ED321] opacity-[0.10] blur-[100px]" />

      {/* Subtle grid pattern overlay */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />

      {/* Content */}
      <div className="relative z-10 p-6 space-y-8">
        {/* Dashboard Header */}
        <div className="flex items-center justify-between mb-2">
          <div>
            <p className="text-xs text-white/30 uppercase tracking-wider mb-1">Platform overview</p>
            <h1 className="text-2xl font-semibold text-white tracking-tight">Dashboard</h1>
          </div>
          <div className="flex items-center gap-3">
            <GlassCard className="px-3 py-1.5 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs text-white/60">System healthy</span>
            </GlassCard>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map((card, idx) => {
            const isBlue = card.label === "Total Users" || card.label === "Completed Assessments";
            const isAmber = card.label === "Active Organisations";
            const isGreen = card.label === "Total Revenue";
            const glow: "blue" | "amber" | "green" | "none" = isGreen ? "green" : isAmber ? "amber" : isBlue ? "blue" : "none";
            const iconTint = isGreen
              ? { bg: "#7ED321", classes: "bg-[#7ED321]/20 border-[#7ED321]/30", icon: "#7ED321" }
              : isAmber
              ? { bg: "#F5A623", classes: "bg-[#F5A623]/20 border-[#F5A623]/30", icon: "#F5A623" }
              : { bg: "#4A90D9", classes: "bg-[#4A90D9]/20 border-[#4A90D9]/30", icon: "#4A90D9" };

            return (
              <GlassCard key={idx} glow={glow} className="p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-medium text-white/50 uppercase tracking-wider">{card.label}</p>
                    <p className={cn("mt-2 text-3xl font-semibold tabular-nums", isGreen ? "text-emerald-300" : "text-white")}>{card.value}</p>
                    <div className="mt-1 flex items-center gap-1">
                      {typeof card.trend === "number" ? (
                        card.trend > 0 ? (
                          <p className="text-sm text-emerald-400 font-medium flex items-center gap-1">
                            <TrendingUp className="w-3.5 h-3.5" />+{card.trend} this week
                          </p>
                        ) : card.trend < 0 ? (
                          <p className="text-sm text-red-400 font-medium flex items-center gap-1">
                            <TrendingDown className="w-3.5 h-3.5" />{card.trend} this week
                          </p>
                        ) : (
                          <p className="text-sm text-white/40 font-medium flex items-center gap-1">
                            <Minus className="w-3.5 h-3.5" />0 this week
                          </p>
                        )
                      ) : (
                        <p className="text-sm text-emerald-400 font-medium">{card.trend} this month</p>
                      )}
                    </div>
                  </div>
                  <div className={cn("p-2.5 rounded-xl border", iconTint.classes)}>
                    <card.icon className="w-5 h-5" style={{ color: iconTint.icon }} />
                  </div>
                </div>
              </GlassCard>
            );
          })}
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          <GlassCard className="lg:col-span-3 p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-base font-semibold text-white/90">Assessments over time</h3>
              <select className="bg-white/10 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white/60 focus:ring-1 focus:ring-white/20">
                <option>Last 30 days</option>
                <option>Last 90 days</option>
              </select>
            </div>
            <LineChart data={timeline} />
          </GlassCard>

          <GlassCard className="lg:col-span-2 p-6">
            <h3 className="text-base font-semibold text-white/90 mb-6">Domain distribution</h3>
            <BarChart data={distribution} />
            <div className="flex justify-center gap-6 mt-4">
              <span className="flex items-center gap-2 text-xs text-white/50"><span className="w-2.5 h-2.5 rounded-sm bg-[#4A90D9]" />Safety</span>
              <span className="flex items-center gap-2 text-xs text-white/50"><span className="w-2.5 h-2.5 rounded-sm bg-[#F5A623]" />Challenge</span>
              <span className="flex items-center gap-2 text-xs text-white/50"><span className="w-2.5 h-2.5 rounded-sm bg-[#7ED321]" />Play</span>
            </div>
          </GlassCard>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { icon: PlusCircle, label: "Grant comp account", color: "#4A90D9", href: "/admin/users" },
            { icon: RefreshCw, label: "Regenerate reports", color: "#F5A623", href: "/admin/report-templates" },
            { icon: Download, label: "Export users", color: "#7ED321", href: "/admin/users" },
            { icon: Search, label: "View audit log", color: "#A78BFA", href: "/admin/audit-logs" },
          ].map((action, idx) => (
            <Link key={idx} href={action.href} className="group relative">
              <GlassCard className="p-4 flex items-center gap-3 transition-all duration-300 group-hover:bg-white/[0.12] group-hover:border-white/[0.2]">
                <div
                  className="p-2 rounded-xl transition-colors duration-300 border"
                  style={{ background: `${action.color}15`, borderColor: `${action.color}30` }}
                >
                  <action.icon className="w-4 h-4 transition-colors duration-300" style={{ color: action.color as string }} />
                </div>
                <span className="text-sm font-medium text-white/70 group-hover:text-white/90 transition-colors">{action.label}</span>
              </GlassCard>
            </Link>
          ))}
        </div>

        {/* Recent Activity Feed */}
        <GlassCard className="overflow-hidden">
          <div className="px-6 py-4 flex items-center justify-between border-b border-white/[0.06]">
            <h3 className="text-base font-semibold text-white/90">Recent activity</h3>
            <Link href="/admin/audit-logs" className="text-sm text-[#4A90D9] hover:text-[#6AACEF] font-medium transition-colors">
              View all →
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/[0.06]">
                  <th className="px-6 py-3 text-left text-[10px] font-medium text-white/30 uppercase tracking-wider">Time</th>
                  <th className="px-6 py-3 text-left text-[10px] font-medium text-white/30 uppercase tracking-wider">Actor</th>
                  <th className="px-6 py-3 text-left text-[10px] font-medium text-white/30 uppercase tracking-wider">Action</th>
                  <th className="px-6 py-3 text-left text-[10px] font-medium text-white/30 uppercase tracking-wider">Resource</th>
                  <th className="px-6 py-3 text-left text-[10px] font-medium text-white/30 uppercase tracking-wider">Subject</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id} className="border-b border-white/[0.04] hover:bg-white/[0.04] transition-colors">
                    <td className="px-6 py-3 text-xs text-white/40 whitespace-nowrap">{getRelativeTime(log.createdAt)}</td>
                    <td className="px-6 py-3 text-sm text-white/70">
                      <Link href={`/admin/users/${log.actorUserId}`} className="hover:text-white/90 transition-colors">
                        {log.actorName || log.actorUserId.slice(0, 8)}
                      </Link>
                    </td>
                    <td className="px-6 py-3">
                      <span
                        className="px-2 py-0.5 rounded-md text-[10px] font-medium border"
                        style={getActionStyle(log.action)}
                      >
                        {log.action}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-xs text-white/40 font-mono">
                      {log.resourceType}#{log.resourceId?.slice(0, 8)}
                    </td>
                    <td className="px-6 py-3 text-sm text-white/50">
                      <Link href={`/admin/users/${log.subjectUserId}`} className="hover:text-white/80 transition-colors">
                        {log.subjectName || (log.subjectUserId === log.actorUserId ? "—" : log.subjectUserId.slice(0, 8))}
                      </Link>
                    </td>
                  </tr>
                ))}
                {logs.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-12">
                      <div className="flex flex-col items-center justify-center py-4 text-center">
                        <div className="w-16 h-16 rounded-2xl bg-white/[0.05] border border-white/[0.1] flex items-center justify-center mb-4">
                          <BarChart3 className="w-8 h-8 text-white/15" />
                        </div>
                        <p className="text-sm text-white/40">No activity yet</p>
                        <p className="text-xs text-white/20 mt-1">Actions will appear as users interact with the platform</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </GlassCard>

        {/* Page-scoped CSS for glass fallback and perf hints */}
        <style jsx>{`
          @supports (backdrop-filter: blur(16px)) {
            .glass-panel {
              backdrop-filter: blur(16px) saturate(180%);
              -webkit-backdrop-filter: blur(16px) saturate(180%);
            }
          }
          @supports not (backdrop-filter: blur(16px)) {
            .glass-panel {
              background: rgba(15, 23, 42, 0.92);
            }
          }
          .glass-card {
            transform: translateZ(0);
            will-change: backdrop-filter;
          }
        `}</style>
      </div>
    </div>
  );
}
