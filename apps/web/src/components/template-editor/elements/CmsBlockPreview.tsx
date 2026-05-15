"use client";

import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function CmsBlockPreviewImpl({ element, dispatch }: { element: any; dispatch: React.Dispatch<any> }) {
  const text = `CMS: ${element.sectionKey || 'section'} · ${element.domain || 'auto'}${element.dimension ? ' · ' + element.dimension : ''}`;
  const [open, setOpen] = useState(false);

  const update = (updates: any) => dispatch({ type: 'UPDATE_ELEMENT', elementId: element.id, updates });

  return (
    <div className="relative">
      {element.previewHtml ? (
        <div 
          className="prose prose-sm max-w-none"
          dangerouslySetInnerHTML={{ __html: element.previewHtml }}
        />
      ) : (
        <div
          onDoubleClick={(e) => { e.stopPropagation(); setOpen(true); }}
          className="border border-dashed border-slate-300 rounded p-2 text-xs text-slate-500 bg-slate-50 cursor-pointer text-center"
          title="Double-click to configure"
        >
          {text} · band varies
        </div>
      )}
      {open && (
        <div className="absolute left-0 top-full mt-2 z-30 bg-white border border-slate-200 rounded-md shadow p-3 w-64" onClick={(e) => e.stopPropagation()}>
          <div className="space-y-2">
            <div className="space-y-1">
              <Label className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1.5">Section Key</Label>
              <Input
                className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs text-slate-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={element.sectionKey || ''}
                onChange={(e) => update({ sectionKey: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1.5">Domain</Label>
              <Input
                className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs text-slate-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={element.domain || ''}
                onChange={(e) => update({ domain: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1.5">Dimension</Label>
              <Input
                className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs text-slate-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={element.dimension || ''}
                onChange={(e) => update({ dimension: e.target.value })}
              />
            </div>
            <div className="flex justify-end pt-1">
              <button className="text-xs text-blue-600 hover:text-blue-700" onClick={() => setOpen(false)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const CmsBlockPreview = React.memo(CmsBlockPreviewImpl, (prev, next) => prev.element === next.element && prev.dispatch === next.dispatch);

export default CmsBlockPreview;
