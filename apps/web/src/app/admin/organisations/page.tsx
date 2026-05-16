"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

type OrgRow = {
  id: string;
  name: string;
  slug: string;
  createdAt: string;
  member_count: number;
  team_count: number;
};

export default function OrganisationsAdminListPage() {
  const [orgs, setOrgs] = useState<OrgRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    apiFetch<OrgRow[]>("/api/v1/admin/organisations")
      .then(setOrgs)
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const s = search.toLowerCase();
    return orgs.filter(o => o.name.toLowerCase().includes(s) || o.slug.toLowerCase().includes(s));
  }, [orgs, search]);

  return (
    <div className="space-y-6">
      <Card className="border border-slate-200 rounded-xl bg-white">
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <CardTitle className="font-semibold">Organisations</CardTitle>
            <div className="w-64">
              <Input placeholder="Search by name" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-sm text-slate-500">Loading…</div>
          ) : filtered.length === 0 ? (
            <div className="text-sm text-slate-500">No organisations found.</div>
          ) : (
            <div className="overflow-x-auto -mx-4 md:mx-0">
              <div className="inline-block min-w-full align-middle">
                <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                    <th className="text-left py-2 px-3">Organisation</th>
                    <th className="text-left py-2 px-3">Slug</th>
                    <th className="text-left py-2 px-3">Members</th>
                    <th className="text-left py-2 px-3">Teams</th>
                    <th className="text-left py-2 px-3">Created</th>
                    <th className="text-left py-2 px-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((o) => (
                    <tr key={o.id} className="border-t border-slate-200 hover:bg-slate-50">
                      <td className="py-2 px-3 font-medium">{o.name}</td>
                      <td className="py-2 px-3 text-slate-600">{o.slug}</td>
                      <td className="py-2 px-3">{o.member_count}</td>
                      <td className="py-2 px-3">{o.team_count}</td>
                      <td className="py-2 px-3 text-slate-600">{new Date(o.createdAt).toLocaleDateString()}</td>
                      <td className="py-2 px-3">
                        <Link href={`/admin/organisations/${o.id}`} className="text-blue-600 hover:underline">View</Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
                </table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
