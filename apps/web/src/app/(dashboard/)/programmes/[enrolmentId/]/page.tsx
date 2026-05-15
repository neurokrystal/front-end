"use client";

import { useEffect, useState, use } from "react";
import { api } from "@/lib/api";

export default function EnrolmentDetailPage({ params }: { params: Promise<{ enrolmentId: string }> }) {
  const { enrolmentId } = use(params);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [enrolment, setEnrolment] = useState<any>(null);
  const [programme, setProgramme] = useState<any>(null);
  const [selectedModuleId, setSelectedModuleId] = useState<string | null>(null);
  const [reflectionResponses, setReflectionResponses] = useState<Record<string, string>>({});

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      // We need a route to get a single enrolment or just filter from my-enrolments
      const mine = await api.get("/api/v1/programmes/my-enrolments");
      const foundEnrolment = mine.find((e: any) => e.id === enrolmentId);
      if (!foundEnrolment) throw new Error("Enrolment not found");
      
      const prog = await api.get(`/api/v1/programmes/${foundEnrolment.programmeId}`);
      
      setEnrolment(foundEnrolment);
      setProgramme(prog);
      if (prog.modules?.length > 0) {
        setSelectedModuleId(prog.modules[0].id);
      }
      setReflectionResponses(foundEnrolment.progress?.reflections || {});
    } catch (e: any) {
      setError(e?.message || "Failed to load programme");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [enrolmentId]);

  const updateModuleStatus = async (moduleId: string, status: string) => {
    try {
      await api.put(`/api/v1/programmes/enrolments/${enrolmentId}/progress`, { moduleId, status });
      await load();
    } catch (e: any) {
      alert(e?.message || "Failed to update progress");
    }
  };

  const submitReflection = async (promptId: string) => {
    try {
      await api.post(`/api/v1/programmes/enrolments/${enrolmentId}/reflect`, { 
        promptId, 
        response: reflectionResponses[promptId] 
      });
      alert("Reflection saved!");
      await load();
    } catch (e: any) {
      alert(e?.message || "Failed to save reflection");
    }
  };

  if (loading) return <div className="p-6">Loading...</div>;
  if (error) return <div className="p-6 text-red-600">{error}</div>;

  const selectedModule = programme.modules?.find((m: any) => m.id === selectedModuleId);
  const progress = enrolment.progress || { modules: {}, reflections: {} };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="w-80 bg-white border-r flex flex-col">
        <div className="p-6 border-b">
          <h2 className="font-bold text-xl">{programme.name}</h2>
          <div className="mt-2 text-sm text-gray-500">
            Status: <span className="capitalize">{enrolment.status.replace("_", " ")}</span>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {programme.modules?.sort((a: any, b: any) => a.sequence - b.sequence).map((m: any) => (
            <button
              key={m.id}
              onClick={() => setSelectedModuleId(m.id)}
              className={`w-full text-left p-4 border-b flex items-center justify-between hover:bg-gray-50 ${
                selectedModuleId === m.id ? "bg-blue-50 border-r-4 border-r-blue-600" : ""
              }`}
            >
              <div className="flex flex-col">
                <span className="text-xs text-gray-400 font-mono">Module {m.sequence}</span>
                <span className="font-medium">{m.title}</span>
              </div>
              {progress.modules?.[m.id] === "completed" && (
                <span className="text-green-500 text-xl">✓</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto p-12">
        {selectedModule ? (
          <div className="max-w-3xl mx-auto space-y-12">
            <div>
              <h1 className="text-4xl font-bold mb-4">{selectedModule.title}</h1>
              <p className="text-xl text-gray-600">{selectedModule.description}</p>
            </div>

            <div className="space-y-12">
              {selectedModule.content.map((item: any, idx: number) => (
                <div key={idx} className="bg-white p-8 rounded-xl shadow-sm border">
                  {item.type === "reading" && (
                    <div className="prose max-w-none">
                      <h2 className="text-2xl font-bold mb-4">{item.title}</h2>
                      <div className="whitespace-pre-wrap">{item.body}</div>
                    </div>
                  )}

                  {item.type === "video" && (
                    <div>
                      <h2 className="text-2xl font-bold mb-4">Watch Video</h2>
                      <div className="aspect-video bg-gray-900 rounded-lg flex items-center justify-center text-white">
                        [Video Player Placeholder: {item.url}]
                      </div>
                      <p className="mt-4 text-sm text-gray-500">{item.duration} minutes</p>
                    </div>
                  )}

                  {item.type === "exercise" && (
                    <div className="bg-blue-50 -m-8 p-8 rounded-xl">
                      <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                        <span>📝</span> Practical Exercise
                      </h2>
                      <div className="whitespace-pre-wrap">{item.instructions}</div>
                    </div>
                  )}

                  {item.type === "reflection_prompt" && (
                    <div className="space-y-4">
                      <h2 className="text-2xl font-bold">Self Reflection</h2>
                      <p className="font-medium text-gray-700">{item.prompt}</p>
                      <textarea
                        className="w-full border p-4 rounded-lg min-h-[150px]"
                        placeholder="Type your reflection here..."
                        value={reflectionResponses[item.id] || ""}
                        onChange={(e) => setReflectionResponses({
                          ...reflectionResponses,
                          [item.id]: e.target.value
                        })}
                      />
                      <button 
                        onClick={() => submitReflection(item.id)}
                        className="bg-slate-800 text-white px-6 py-2 rounded-lg hover:bg-slate-900"
                      >
                        Save Reflection
                      </button>
                    </div>
                  )}
                  
                  {item.type === "micro_assessment" && (
                    <div className="text-center py-8">
                       <h2 className="text-2xl font-bold mb-4">Micro-Assessment</h2>
                       <p className="mb-6">Take a quick check-in on your {item.targetDimension}.</p>
                       <button className="bg-blue-600 text-white px-8 py-3 rounded-xl font-bold">
                         Start Micro-Assessment
                       </button>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="flex justify-between items-center pt-12 border-t">
               <button 
                onClick={() => updateModuleStatus(selectedModule.id, "in_progress")}
                className="text-gray-600 font-medium"
               >
                 Mark In Progress
               </button>
               <button 
                onClick={() => updateModuleStatus(selectedModule.id, "completed")}
                className="bg-green-600 text-white px-10 py-4 rounded-xl font-bold text-lg hover:bg-green-700 shadow-lg shadow-green-100"
               >
                 {progress.modules?.[selectedModule.id] === "completed" ? "Completed ✓" : "Mark as Completed"}
               </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-gray-400">
            Select a module to begin
          </div>
        )}
      </div>
    </div>
  );
}
