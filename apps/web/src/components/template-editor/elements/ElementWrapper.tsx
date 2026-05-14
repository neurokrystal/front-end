"use client";

import React from "react";

export default function ElementWrapper({ children, selected, onSelect }: { children: React.ReactNode; selected: boolean; onSelect: () => void }) {
  return (
    <div
      data-clickable="1"
      onClick={(e) => { e.stopPropagation(); onSelect(); }}
      className={`relative min-h-[8px] ${selected ? 'ring-2 ring-blue-500' : 'ring-1 ring-transparent hover:ring-blue-300'} rounded-sm`}
      style={{ cursor: 'pointer' }}
    >
      {children}
    </div>
  );
}
