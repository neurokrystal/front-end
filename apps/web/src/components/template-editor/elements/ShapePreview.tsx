"use client";

import React from "react";

export default function ShapePreview({ element }: { element: any }) {
  const { shapeType, fill, stroke } = element;
  if (shapeType === 'divider' || shapeType === 'line') {
    return <div className="w-full my-1" style={{ borderTop: `${stroke?.width || 1}px solid ${stroke?.color || '#94a3b8'}` }} />;
  }
  const baseStyle: React.CSSProperties = {
    width: '100%',
    height: 60,
    background: fill || '#e2e8f0',
    border: stroke ? `${stroke.width}px solid ${stroke.color}` : undefined,
  };
  if (shapeType === 'circle' || shapeType === 'ellipse') {
    baseStyle.borderRadius = 9999;
  }
  return <div style={baseStyle} />;
}
