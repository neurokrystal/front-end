"use client";

import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { MoveLeft } from "lucide-react";

export default function ComingSoonPage() {
  const searchParams = useSearchParams();
  const section = searchParams.get("section") || "this page";

  return (
    <div className="flex flex-col items-center justify-center h-[60vh] space-y-8 text-center font-sans">
      <div className="space-y-3">
        <h1 className="text-4xl font-semibold text-slate-900 tracking-tight">Coming Soon</h1>
        <p className="text-slate-500 text-lg max-w-lg mx-auto">
          We're still working on the <span className="text-[#4A90D9] font-semibold">{section}</span> section.
        </p>
      </div>
      
      <div className="max-w-md bg-white p-8 rounded-xl border border-slate-200 shadow-sm">
        <p className="text-sm text-slate-600 leading-relaxed mb-8">
          The Dimensional System admin panel is undergoing a major overhaul. This section is part of our upcoming roadmap for a comprehensive management experience.
        </p>
        <Link href="/admin/dashboard">
          <Button className="w-full">
            <MoveLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
        </Link>
      </div>
    </div>
  );
}
