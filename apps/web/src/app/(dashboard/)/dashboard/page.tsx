"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import Link from "next/link";

export default function ConsumerDashboard() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<any>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [reports, shares, enrolments, profile] = await Promise.all([
        api.get("/api/v1/reports"),
        api.get("/api/v1/sharing/my-shares"),
        api.get("/api/v1/programmes/my-enrolments"),
        api.get("/api/v1/users/me/profile"),
      ]);
      setData({ reports, shares, enrolments, profile });
    } catch (e: any) {
      setError(e?.message || "Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  if (loading) return <div className="p-6">Loading dashboard...</div>;
  if (error) return <div className="p-6 text-red-600">{error}</div>;

  return (
    <div className="p-8 space-y-10 max-w-7xl mx-auto">
      <header className="flex justify-between items-end">
        <div>
          <h1 className="text-4xl font-bold">Welcome back, {data.profile?.displayName || 'User'}</h1>
          <p className="text-gray-500 mt-2">Here's an overview of your dimensional journey.</p>
        </div>
        <Link 
          href="/assessment" 
          className="bg-blue-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-blue-700 transition-colors"
        >
          Retake Assessment
        </Link>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Reports Section */}
        <section className="lg:col-span-2 space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold">Your Reports</h2>
            <Link href="/reports" className="text-blue-600 font-medium">View all</Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {data.reports.slice(0, 4).map((r: any) => (
              <div key={r.id} className="border p-5 rounded-xl bg-white shadow-sm hover:shadow-md transition-shadow">
                <div className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">
                  {r.reportType.replace("_", " ")}
                </div>
                <h3 className="font-bold text-lg mb-3">Dimensional Architecture</h3>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500">{new Date(r.createdAt).toLocaleDateString()}</span>
                  <Link 
                    href={`/reports/${r.id}`}
                    className="text-blue-600 text-sm font-bold"
                  >
                    View Report →
                  </Link>
                </div>
              </div>
            ))}
            {data.reports.length === 0 && (
              <div className="col-span-2 border-2 border-dashed rounded-xl p-10 text-center text-gray-400">
                You haven't generated any reports yet.
              </div>
            )}
          </div>
        </section>

        {/* Sidebar Sections */}
        <aside className="space-y-8">
          {/* Active Programmes */}
          <section className="space-y-4">
            <h2 className="text-xl font-bold">Active Programmes</h2>
            <div className="space-y-3">
              {data.enrolments.filter((e: any) => e.status !== 'completed').map((e: any) => (
                <Link 
                  href={`/programmes/${e.id}`} 
                  key={e.id}
                  className="block p-4 border rounded-xl bg-white hover:bg-gray-50 transition-colors"
                >
                  <div className="font-bold">{e.programmeName || 'Development Programme'}</div>
                  <div className="text-sm text-gray-500 mt-1 capitalize">{e.status.replace("_", " ")}</div>
                  <div className="w-full bg-gray-100 h-1.5 rounded-full mt-3 overflow-hidden">
                    <div className="bg-blue-600 h-full w-1/3"></div> {/* Mock progress */}
                  </div>
                </Link>
              ))}
              {data.enrolments.length === 0 && (
                <p className="text-sm text-gray-400 italic">No active enrolments.</p>
              )}
              <Link href="/programmes" className="block text-center text-sm text-blue-600 font-bold pt-2">
                Browse Catalog
              </Link>
            </div>
          </section>

          {/* Sharing Status */}
          <section className="space-y-4">
            <h2 className="text-xl font-bold">Sharing</h2>
            <div className="p-4 border rounded-xl bg-slate-50">
              <div className="flex justify-between text-sm mb-2">
                <span>Active Shares</span>
                <span className="font-bold">{data.shares.length}</span>
              </div>
              <p className="text-xs text-gray-500 leading-relaxed">
                You are currently sharing your data with {data.shares.length} people/entities.
              </p>
              <Link href="/sharing" className="block text-blue-600 text-sm font-bold mt-4">
                Manage Access →
              </Link>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
