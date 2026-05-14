"use client";

import React from "react";

export default function ChartPreview({ element }: { element: any }) {
  const { chartType, dataBinding } = element;
  return (
    <div className="border rounded p-3 text-sm text-slate-600 bg-white grid grid-cols-[24px_1fr] gap-2 items-center">
      <div className="text-lg">📊</div>
      <div>
        <div className="font-medium capitalize">{chartType || 'chart'}</div>
        <div className="text-xs text-slate-500">{dataBinding?.source || 'data'}{dataBinding?.compareProfiles ? ' · compare' : ''}</div>
      </div>
    </div>
  );
}
