"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import Link from "next/link";

export default function ProgrammesPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [programmes, setProgrammes] = useState<any[]>([]);
  const [myEnrolments, setMyEnrolments] = useState<any[]>([]);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [all, mine] = await Promise.all([
        api.get<any[]>("/api/v1/programmes"),
        api.get<any[]>("/api/v1/programmes/my-enrolments"),
      ]);
      setProgrammes(all);
      setMyEnrolments(mine);
    } catch (e: any) {
      setError(e?.message || "Failed to load programmes");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const enrol = async (id: string) => {
    try {
      await api.post(`/api/v1/programmes/${id}/enrol`, {});
      await load();
    } catch (e: any) {
      alert(e?.message || "Failed to enrol");
    }
  };

  if (loading) return <div className="p-6">Loading programmes...</div>;
  if (error) return <div className="p-6 text-red-600">{error}</div>;

  const getEnrolment = (programmeId: string) => myEnrolments.find(e => e.programmeId === programmeId);

  return (
    <div className="p-6 space-y-8">
      <h1 className="text-3xl font-bold">Development Programmes</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {programmes.map((p) => {
          const enrolment = getEnrolment(p.id);
          return (
            <div key={p.id} className="border rounded-lg p-6 shadow-sm flex flex-col justify-between">
              <div>
                <h3 className="text-xl font-bold mb-2">{p.name}</h3>
                <p className="text-gray-600 mb-4 line-clamp-2">{p.description}</p>
                <div className="flex gap-2 mb-4">
                  <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">
                    {p.targetDomain || "General"}
                  </span>
                  <span className="bg-gray-100 text-gray-800 text-xs px-2 py-1 rounded">
                    {p.durationWeeks} Weeks
                  </span>
                </div>
              </div>
              
              {enrolment ? (
                <Link 
                  href={`/programmes/${enrolment.id}`}
                  className="bg-green-600 text-white text-center py-2 rounded hover:bg-green-700"
                >
                  Continue ({enrolment.status.replace("_", " ")})
                </Link>
              ) : (
                <button 
                  onClick={() => enrol(p.id)}
                  className="bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
                >
                  Enrol Now
                </button>
              )}
            </div>
          );
        })}
      </div>
      
      {programmes.length === 0 && (
        <p className="text-gray-500">No active programmes available at the moment.</p>
      )}
    </div>
  );
}
