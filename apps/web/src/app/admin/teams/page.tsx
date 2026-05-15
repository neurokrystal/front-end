"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

type TeamRow = {
  id: string;
  name: string;
  organizationId: string;
  organizationName: string | null;
  leaderName: string | null;
  memberCount: number;
  sharingCount: number;
  createdAt: string;
};

export default function TeamsAdminListPage() {
  const [teams, setTeams] = useState<TeamRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [orgFilter, setOrgFilter] = useState<string | "all">("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [newTeamName, setNewTeamName] = useState("");
  const [orgs, setOrgs] = useState<{ id: string; name: string }[]>([]);
  const [selectedOrgId, setSelectedOrgId] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const run = async () => {
      try {
        const [ts, os] = await Promise.all([
          apiFetch<TeamRow[]>("/api/v1/admin/teams"),
          apiFetch<{ id: string; name: string }[]>("/api/v1/admin/organisations"),
        ]);
        setTeams(ts);
        setOrgs(os.map(o => ({ id: (o as any).id, name: (o as any).name })));
      } finally {
        setLoading(false);
      }
    };
    run();
  }, []);

  const orgOptions = useMemo(() => {
    const names = Array.from(new Set(teams.map(t => t.organizationName).filter(Boolean))) as string[];
    names.sort((a, b) => a.localeCompare(b));
    return names;
  }, [teams]);

  const filtered = useMemo(() => {
    const s = search.toLowerCase();
    return teams.filter(t => {
      const matchesSearch = t.name.toLowerCase().includes(s) || (t.organizationName || '').toLowerCase().includes(s);
      const matchesOrg = orgFilter === 'all' || t.organizationName === orgFilter;
      return matchesSearch && matchesOrg;
    });
  }, [teams, search, orgFilter]);

  return (
    <div className="space-y-6">
      <Card className="border border-slate-200 rounded-xl bg-white">
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <CardTitle className="font-semibold">Teams</CardTitle>
            <div className="flex items-center gap-3 w-full md:w-auto">
              <div className="w-full md:w-64">
                <Input placeholder="Search team or organisation" value={search} onChange={(e) => setSearch(e.target.value)} />
              </div>
              <Select value={orgFilter} onValueChange={(v) => setOrgFilter(v as any)}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Filter by organisation" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All organisations</SelectItem>
                  {orgOptions.map(name => (
                    <SelectItem key={name} value={name}>{name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="secondary" onClick={() => setCreateOpen(true)}>Create Team</Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-sm text-slate-500">Loading…</div>
          ) : filtered.length === 0 ? (
            <div className="text-sm text-slate-500">No teams found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                    <th className="text-left py-2 px-3">Team</th>
                    <th className="text-left py-2 px-3">Organisation</th>
                    <th className="text-left py-2 px-3">Leader</th>
                    <th className="text-left py-2 px-3">Members</th>
                    <th className="text-left py-2 px-3">Sharing</th>
                    <th className="text-left py-2 px-3">Created</th>
                    <th className="text-left py-2 px-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((t) => (
                    <tr key={t.id} className="border-t border-slate-200 hover:bg-slate-50">
                      <td className="py-2 px-3 font-medium">{t.name}</td>
                      <td className="py-2 px-3">{t.organizationName || '—'}</td>
                      <td className="py-2 px-3">{t.leaderName || '—'}</td>
                      <td className="py-2 px-3">{t.memberCount}</td>
                      <td className="py-2 px-3">{t.sharingCount}/{t.memberCount} sharing</td>
                      <td className="py-2 px-3 text-slate-600">{new Date(t.createdAt).toLocaleDateString()}</td>
                      <td className="py-2 px-3">
                        <Link href={`/admin/teams/${t.id}`} className="text-blue-600 hover:underline">View</Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Team modal */}
      <Dialog open={createOpen} onOpenChange={(o) => { if (!o) { setCreateOpen(false); setNewTeamName(""); setSelectedOrgId(""); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Team</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Team Name</Label>
              <Input placeholder="Team Alpha" value={newTeamName} onChange={(e) => setNewTeamName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Organisation</Label>
              <select className="border rounded-md px-3 py-2 w-full" value={selectedOrgId} onChange={(e) => setSelectedOrgId(e.target.value)}>
                <option value="">Select organisation…</option>
                {orgs.map(o => (
                  <option key={o.id} value={o.id}>{o.name}</option>
                ))}
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button
              onClick={async () => {
                if (!newTeamName.trim() || !selectedOrgId) return;
                setSubmitting(true);
                try {
                  await apiFetch(`/api/v1/admin/teams`, { method: 'POST', body: JSON.stringify({ name: newTeamName.trim(), organizationId: selectedOrgId }) });
                  // Refresh list
                  const ts = await apiFetch<TeamRow[]>("/api/v1/admin/teams");
                  setTeams(ts);
                  setCreateOpen(false);
                  setNewTeamName("");
                  setSelectedOrgId("");
                } finally {
                  setSubmitting(false);
                }
              }}
              disabled={!newTeamName.trim() || !selectedOrgId || submitting}
            >Create Team</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
