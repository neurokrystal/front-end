"use client";

import React from "react";
import { Trash2 } from "lucide-react";
import { useElementResize } from "./useElementResize";
import { useElementDrag } from "./useElementDrag";

export default function ElementWrapper({
  element,
  children,
  selected,
  onSelect,
  onRemove,
  dispatch,
  pageId,
  zoom,
}: {
  element: any;
  children: React.ReactNode;
  selected: boolean;
  onSelect: () => void;
  onRemove: (id: string) => void;
  dispatch: React.Dispatch<any>;
  pageId: string;
  zoom: number;
}) {
  const typeLabel = element.type === "cms_block"
    ? "CMS Block"
    : String(element.type).charAt(0).toUpperCase() + String(element.type).slice(1);

  const { startResize } = useElementResize(element.id, dispatch, zoom);
  const { startDrag } = useElementDrag(element, pageId, dispatch, zoom);

  const width = element.width || "auto";
  const height = element.height || "auto";

  return (
    <div
      id={`element-${element.id}`}
      data-element-id={element.id}
      data-clickable="1"
      onMouseDown={selected ? (e) => startDrag(e as any) : undefined}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
      className={[
        "relative group transition-all",
        selected
          ? "ring-2 ring-blue-500 bg-blue-50/30 cursor-grab"
          : "hover:ring-1 hover:ring-slate-300 cursor-pointer",
        element.position === "absolute" ? "absolute" : "relative",
        "rounded-sm",
      ].join(" ")}
      style={{
        width,
        height,
        minWidth: 40,
        minHeight: 20,
        background: element.backgroundColor,
        borderColor: element.borderColor,
        borderWidth: element.borderWidth,
        borderStyle: element.borderStyle,
        borderRadius: element.borderRadius,
        opacity: element.opacity != null ? element.opacity : undefined,
        // Absolute positioning coordinates in millimetres
        left: element.position === 'absolute' ? `${element.absoluteX || 0}mm` : undefined,
        top: element.position === 'absolute' ? `${element.absoluteY || 0}mm` : undefined,
      }}
    >
      {/* Type label (show on hover) */}
      <span className="absolute -top-5 left-0 text-[10px] font-medium text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity">
        {typeLabel}
      </span>

      {/* Delete button when selected (subtle white circle, hover red) */}
      {selected && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove(element.id);
          }}
          className="absolute -top-3 -right-3 w-6 h-6 bg-white border border-slate-200 rounded-full flex items-center justify-center text-slate-400 hover:bg-red-50 hover:text-red-500 hover:border-red-200 shadow-sm transition-colors z-20"
          title="Delete element"
          aria-label="Delete element"
        >
          <Trash2 className="w-3 h-3" />
        </button>
      )}

      {/* Resize handles when selected */}
      {selected && (
        <>
          {/* Corner handles */}
          <div
            data-resize-handle
            onMouseDown={(e) => startResize(e as any, "nw")}
            className="absolute -top-1 -left-1 w-2.5 h-2.5 bg-blue-500 rounded-sm cursor-nw-resize z-20"
          />
          <div
            data-resize-handle
            onMouseDown={(e) => startResize(e as any, "ne")}
            className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-blue-500 rounded-sm cursor-ne-resize z-20"
          />
          <div
            data-resize-handle
            onMouseDown={(e) => startResize(e as any, "sw")}
            className="absolute -bottom-1 -left-1 w-2.5 h-2.5 bg-blue-500 rounded-sm cursor-sw-resize z-20"
          />
          <div
            data-resize-handle
            onMouseDown={(e) => startResize(e as any, "se")}
            className="absolute -bottom-1 -right-1 w-2.5 h-2.5 bg-blue-500 rounded-sm cursor-se-resize z-20"
          />
          {/* Edge handles */}
          <div
            data-resize-handle
            onMouseDown={(e) => startResize(e as any, "n")}
            className="absolute -top-1 left-1/2 -translate-x-1/2 w-6 h-2 bg-blue-500 rounded-sm cursor-n-resize z-20"
          />
          <div
            data-resize-handle
            onMouseDown={(e) => startResize(e as any, "s")}
            className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-6 h-2 bg-blue-500 rounded-sm cursor-s-resize z-20"
          />
          <div
            data-resize-handle
            onMouseDown={(e) => startResize(e as any, "w")}
            className="absolute top-1/2 -left-1 -translate-y-1/2 w-2 h-6 bg-blue-500 rounded-sm cursor-w-resize z-20"
          />
          <div
            data-resize-handle
            onMouseDown={(e) => startResize(e as any, "e")}
            className="absolute top-1/2 -right-1 -translate-y-1/2 w-2 h-6 bg-blue-500 rounded-sm cursor-e-resize z-20"
          />
        </>
      )}

      {children}
    </div>
  );
}
