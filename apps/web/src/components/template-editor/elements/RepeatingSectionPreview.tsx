"use client";

import React from "react";

export default function RepeatingSectionPreview({ section }: { section: any }) {
  return (
    <div className="border rounded p-2 bg-slate-50">
      <div className="text-xs text-slate-600 mb-2">🔄 Repeats over {section.repeatOver || 'domains'}</div>
      <div className="text-[11px] text-slate-500">Contains {section.elements?.length || 0} elements</div>
    </div>
  );
}
