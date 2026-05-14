"use client";

import React from "react";

export default function CmsBlockPreview({ element }: { element: any }) {
  const text = `CMS: ${element.sectionKey || 'section'} · ${element.domain || 'domain'}${element.dimension ? ' · ' + element.dimension : ''}`;
  return (
    <div className="border border-dashed border-slate-300 rounded p-2 text-xs text-slate-500 bg-slate-50">
      {text}
    </div>
  );
}
