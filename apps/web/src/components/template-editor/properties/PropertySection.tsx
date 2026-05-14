"use client";

import React, { useState } from "react";
import { ChevronDown } from "lucide-react";

export default function PropertySection({ title, defaultOpen = true, children }: { title: string; defaultOpen?: boolean; children: React.ReactNode }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-slate-100 pb-3">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center justify-between w-full py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider"
      >
        {title}
        <ChevronDown className={`w-3.5 h-3.5 transition-transform ${open ? '' : '-rotate-90'}`} />
      </button>
      {open && <div className="space-y-3 pt-1">{children}</div>}
    </div>
  );
}
