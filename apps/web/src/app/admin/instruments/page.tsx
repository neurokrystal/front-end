"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import Link from "next/link";

export default function AdminInstrumentsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [instruments, setInstruments] = useState<any[]>([]);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const results = await api.get<any[]>("/api/v1/instruments");
      setInstruments(results);
    } catch (e: any) {
      setError(e?.message || "Failed to load instruments");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  if (loading) return <div className="p-6">Loading instruments...</div>;
  if (error) return <div className="p-6 text-red-600">{error}</div>;

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Instruments Manager</h1>
        <button className="bg-blue-600 text-white px-4 py-2 rounded">
          Create New Instrument
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {instruments.map((i) => (
          <div key={i.id} className="border p-6 rounded-lg bg-white flex justify-between items-center shadow-sm">
            <div>
              <h3 className="text-xl font-bold">{i.name}</h3>
              <p className="text-gray-500">{i.slug}</p>
              <p className="text-sm mt-2">{i.description}</p>
            </div>
            <div className="flex gap-2">
              <Link 
                href={`/admin/instruments/${i.id}`}
                className="bg-slate-100 px-4 py-2 rounded hover:bg-slate-200"
              >
                Manage Versions
              </Link>
              <button className="text-red-600 px-4 py-2">Archive</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
