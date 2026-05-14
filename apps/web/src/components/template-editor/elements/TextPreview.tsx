"use client";

import React from "react";

function renderWithTokens(text: string) {
  const parts = text.split(/(\{\{[^}]+\}\})/g);
  return parts.map((part, i) => {
    if (part.startsWith("{{") && part.endsWith("}}")) {
      return (
        <span key={i} className="inline-flex items-center px-1 py-0.5 text-[10px] rounded bg-amber-50 text-amber-800 border border-amber-200 mr-1">
          {part}
        </span>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

export default function TextPreview({ element, pxPerMm }: { element: any; pxPerMm: number }) {
  const font = element.font || { family: 'Inter', size: 12, weight: '400', style: 'normal', lineHeight: 1.5, letterSpacing: 0, color: '#0f172a' };
  return (
    <div
      className="whitespace-pre-wrap"
      style={{
        fontFamily: font.family,
        fontSize: `${font.size}px`,
        fontWeight: font.weight as any,
        fontStyle: font.style,
        lineHeight: font.lineHeight,
        letterSpacing: `${font.letterSpacing}em`,
        color: font.color,
        textAlign: element.textAlign || 'left',
        padding: element.padding ? `${element.padding.top}px ${element.padding.right}px ${element.padding.bottom}px ${element.padding.left}px` : undefined,
      }}
    >
      {renderWithTokens(element.content || '')}
    </div>
  );
}
