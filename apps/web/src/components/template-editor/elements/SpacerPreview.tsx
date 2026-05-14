"use client";

import React from "react";

export default function SpacerPreview({ element, pxPerMm }: { element: any; pxPerMm: number }) {
  const h = Math.max(2, Math.round((element.heightMm || 10) * pxPerMm));
  return (
    <div className="w-full relative" style={{ height: h }}>
      <div className="absolute inset-0 border-t border-b border-dashed border-slate-300" />
      <div className="absolute left-1/2 -translate-x-1/2 -top-4 text-[10px] text-slate-500">↕ {element.heightMm || 10}mm</div>
    </div>
  );
}
