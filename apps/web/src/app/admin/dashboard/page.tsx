"use client";
import "./glass.css";

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

// (Charts removed per glass design spec; panel empty states will be rendered in JSX)

export default function AdminDashboard() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [timeline, setTimeline] = useState<TimelineData[]>([]);
  const [distribution, setDistribution] = useState<DomainDistribution[]>([]);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState("30");

  useEffect(() => {
    const main = document.querySelector('main');
    const layoutWrapper = main?.parentElement;
    if (main) {
      main.style.backgroundColor = 'transparent';
      main.style.padding = '0';
      main.style.position = 'relative';
    }
    if (layoutWrapper) {
      layoutWrapper.style.backgroundColor = 'transparent';
    }
    document.querySelectorAll('[class*="bg-"]').forEach(el => {
      if (el.contains(main) || el === main?.parentElement) {
        (el as HTMLElement).style.backgroundColor = 'transparent';
      }
    });
    return () => {
      if (main) {
        main.style.backgroundColor = '';
        main.style.padding = '';
        main.style.position = '';
      }
      if (layoutWrapper) {
        layoutWrapper.style.backgroundColor = '';
      }
    };
  }, []);

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
      <div className="relative min-h-screen">
        {/* Background layer */}
        <div className="glass-bg" />
        <div className="relative z-10 p-6">Loading…</div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen">
      {/* Background layer */}
      <div className="glass-bg" />

      {/* Content */}
      <div className="relative z-10 p-6 space-y-4">

        {/* Header row */}
        <div className="flex justify-between items-start">
          <div>
            <p className="glass-page-header">Platform overview</p>
            <h1 className="glass-page-title">Dashboard</h1>
          </div>
          <div className="glass-system-badge">
            <span className="glass-system-dot" />
            System healthy
          </div>
        </div>

        {/* Stats row — 4 columns */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

          {/* TOTAL USERS */}
          <div className="glass-card glass-card-stat">
            <p className="stat-label">Total users</p>
            <p className="stat-value">{stats?.totalUsers?.toLocaleString() ?? '0'}</p>
            <p className={`stat-change ${(stats?.totalUsersThisWeek ?? 0) > 0 ? 'stat-change-positive' : 'stat-change-neutral'}`}>
              {(stats?.totalUsersThisWeek ?? 0) > 0 ? `↗ +${stats?.totalUsersThisWeek} this week` : `— ${stats?.totalUsersThisWeek ?? 0} this week`}
            </p>
            <div className="stat-icon" style={{ background: 'rgba(59, 130, 246, 0.15)', color: '#60a5fa' }}>
              <Users size={16} />
            </div>
          </div>

          {/* COMPLETED ASSESSMENTS */}
          <div className="glass-card glass-card-stat">
            <p className="stat-label">Completed assessments</p>
            <p className="stat-value">{stats?.completedAssessments?.toLocaleString() ?? '0'}</p>
            <p className="stat-change stat-change-neutral">— {stats?.completedAssessmentsThisWeek ?? 0} this week</p>
            <div className="stat-icon" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#6ee7b7' }}>
              <ClipboardCheck size={16} />
            </div>
          </div>

          {/* ACTIVE ORGANISATIONS */}
          <div className="glass-card glass-card-stat">
            <p className="stat-label">Active organisations</p>
            <p className="stat-value">{stats?.activeOrganisations?.toLocaleString() ?? '0'}</p>
            <p className="stat-change stat-change-neutral">— {0} this week</p>
            <div className="stat-icon" style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24' }}>
              <Building2 size={16} />
            </div>
          </div>

          {/* TOTAL REVENUE */}
          <div className="glass-card glass-card-stat">
            <p className="stat-label">Total revenue</p>
            <p className="stat-value">${((stats?.totalRevenueCents ?? 0) / 100).toFixed(2)}</p>
            <p className="stat-change stat-change-positive">${((stats?.revenueThisMonthCents ?? 0) / 100).toFixed(2)} this month</p>
            <div className="stat-icon" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#6ee7b7' }}>
              <DollarSign size={16} />
            </div>
          </div>
        </div>

        {/* Charts row — 2 columns */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Assessments over time */}
          <div className="glass-card glass-card-panel">
            <div className="flex justify-between items-center mb-3">
              <p className="panel-title" style={{ margin: 0 }}>Assessments over time</p>
              <select className="glass-select" value={timeRange} onChange={(e) => setTimeRange(e.target.value)}>
                <option value="30">Last 30 days</option>
                <option value="90">Last 90 days</option>
                <option value="365">Last year</option>
              </select>
            </div>
            {/* Render chart here or empty state: */}
            <div className="panel-empty">
              <div className="panel-empty-icon">📊</div>
              No data yet<br/>
              <span style={{ fontSize: '0.6875rem' }}>Assessments will appear here once completed</span>
            </div>
          </div>

          {/* Domain distribution */}
          <div className="glass-card glass-card-panel">
            <p className="panel-title">Domain distribution</p>
            <div className="panel-empty">
              <div className="panel-empty-icon">📊</div>
              No data yet<br/>
              <span style={{ fontSize: '0.6875rem' }}>Assessments will appear here once scored</span>
            </div>
            <div className="glass-legend">
              <span className="glass-legend-item"><span className="glass-legend-dot glass-legend-dot-safety" /> Safety</span>
              <span className="glass-legend-item"><span className="glass-legend-dot glass-legend-dot-challenge" /> Challenge</span>
              <span className="glass-legend-item"><span className="glass-legend-dot glass-legend-dot-play" /> Play</span>
            </div>
          </div>
        </div>

        {/* Quick actions row — 4 columns */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Link href="/admin/users">
            <div className="glass-card glass-card-action">
              <div className="flex items-center gap-2">
                <span className="action-icon"><PlusCircle size={18} /></span>
                <p className="action-text">Grant comp account</p>
              </div>
            </div>
          </Link>
          <Link href="/admin/report-templates">
            <div className="glass-card glass-card-action">
              <div className="flex items-center gap-2">
                <span className="action-icon"><RefreshCw size={18} /></span>
                <p className="action-text">Regenerate reports</p>
              </div>
            </div>
          </Link>
          <Link href="/admin/users">
            <div className="glass-card glass-card-action">
              <div className="flex items-center gap-2">
                <span className="action-icon"><Download size={18} /></span>
                <p className="action-text">Export users</p>
              </div>
            </div>
          </Link>
          <Link href="/admin/audit-logs">
            <div className="glass-card glass-card-action">
              <div className="flex items-center gap-2">
                <span className="action-icon"><Search size={18} /></span>
                <p className="action-text">View audit log</p>
              </div>
            </div>
          </Link>
        </div>

        {/* Recent activity */}
        <div className="glass-card glass-card-panel">
          <div className="flex justify-between items-center mb-3">
            <p className="panel-title" style={{ margin: 0 }}>Recent activity</p>
            <a href="/admin/audit-logs" className="glass-link">View all →</a>
          </div>

          {/* Table header */}
          <div className="glass-table-header" style={{ gridTemplateColumns: '1fr 1fr 1fr 1.5fr 1fr' }}>
            <span>Time</span>
            <span>Actor</span>
            <span>Action</span>
            <span>Resource</span>
            <span>Subject</span>
          </div>

          {/* Table rows — map over activity data */}
          {logs.map((log) => (
            <div key={log.id} className="glass-table-row" style={{ gridTemplateColumns: '1fr 1fr 1fr 1.5fr 1fr' }}>
              <span className="glass-table-muted">{getRelativeTime(log.createdAt)}</span>
              <span>{log.actorName || 'System'}</span>
              <span>
                <span className="glass-badge glass-badge-amber">{log.action}</span>
              </span>
              <span className="glass-table-muted">{log.resourceType}#{log.resourceId?.slice(0, 8)}</span>
              <span className="glass-table-muted">
                {log.subjectName || (log.subjectUserId ? log.subjectUserId.slice(0, 8) : '—')}
              </span>
            </div>
          ))}

          {logs.length === 0 && (
            <div className="panel-empty">
              No activity yet<br/>
              <span style={{ fontSize: '0.6875rem' }}>Actions will appear as users interact with the platform</span>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
