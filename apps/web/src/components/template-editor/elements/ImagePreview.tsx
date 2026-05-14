"use client";

import React from "react";

export default function ImagePreview({ element }: { element: any }) {
  const { src, alt, objectFit } = element;
  return (
    <div className="relative w-full min-h-[60px] bg-slate-100 grid place-items-center overflow-hidden" style={{ aspectRatio: '16/9' }}>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={alt || ''} style={{ objectFit: objectFit || 'contain', width: '100%', height: '100%' }} />
      ) : (
        <div className="text-slate-500 text-xs">No image · click to set</div>
      )}
    </div>
  );
}
