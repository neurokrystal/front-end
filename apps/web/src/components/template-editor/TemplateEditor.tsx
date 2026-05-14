"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import type { ReportTemplate, TemplateElement, PageDefinition } from "@dimensional/shared";
import { useTemplateState } from "./shared/useTemplateState";
import { useTemplateHistory } from "./shared/useTemplateHistory";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api";
import EditorToolbar from "./EditorToolbar";
import ElementPalette from "./ElementPalette";
import PageNavigator from "./PageNavigator";
import EditorCanvas from "./canvas/EditorCanvas";
import PropertyPanel from "./properties/PropertyPanel";
import VariableReference from "./VariableReference";

type TemplateRow = {
  id: string;
  reportType: string;
  name: string;
  version: number;
  templateJson: ReportTemplate;
  isActive: boolean;
  isDefault: boolean;
  updatedAt: string;
};

export default function TemplateEditor({
  templateRow,
  onBack,
  onSaved,
}: {
  templateRow: TemplateRow;
  onBack?: () => void;
  onSaved?: (updatedRow: TemplateRow) => void;
}) {
  const { state, dispatch } = useTemplateState(templateRow.templateJson);
  const history = useTemplateHistory(templateRow.templateJson);
  const [saving, setSaving] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [previewOpen, setPreviewOpen] = useState(false);

  // Push initial state
  useEffect(() => {
    history.push(state.template);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keyboard shortcuts for undo/redo
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          const next = history.redo();
          dispatch({ type: 'LOAD_TEMPLATE', template: next });
        } else {
          const prev = history.undo();
          dispatch({ type: 'LOAD_TEMPLATE', template: prev });
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [dispatch, history]);

  // Push to history when state changes (debounced minimal)
  useEffect(() => {
    history.push(state.template);
  }, [state.template, history]);

  const selectedPage = useMemo(() => state.template.pages.find(p => p.id === state.selectedPageId)!, [state]);

  const addElement = useCallback((type: TemplateElement['type']) => {
    const base = {
      id: crypto.randomUUID(),
      type,
      position: 'absolute' as const,
      absoluteX: 20,
      absoluteY: 20,
      gridColumn: '1 / -1',
      gridRow: 'auto',
      padding: { top: 0, right: 0, bottom: 0, left: 0 },
      border: { width: 0, style: 'none', color: '#000000', radius: 0 },
      background: { type: 'none', opacity: 1 },
      opacity: 1,
    } as any;
    let element: TemplateElement;
    switch (type) {
      case 'text':
        element = { ...base, content: 'Double-click to edit text', font: { family: 'Inter', size: 14, weight: '400', style: 'normal', lineHeight: 1.4, letterSpacing: 0, color: '#0f172a' }, textAlign: 'left' };
        break;
      case 'cms_block':
        element = { ...base, sectionKey: 'domain_overview', domain: 'safety', textAlign: 'left', font: { family: 'Inter', size: 12, weight: '400', style: 'normal', lineHeight: 1.5, letterSpacing: 0, color: '#334155' } } as any;
        break;
      case 'image':
        element = { ...base, src: '', alt: '', objectFit: 'contain' } as any;
        break;
      case 'shape':
        element = { ...base, shapeType: 'rectangle', fill: '#e2e8f0', stroke: { color: '#94a3b8', width: 1 } } as any;
        break;
      case 'chart':
        element = { ...base, chartType: 'radar', dataBinding: { source: 'domains', compareProfiles: false }, colors: {}, showLabels: true, showValues: false } as any;
        break;
      case 'spacer':
        element = { ...base, heightMm: 10 } as any;
        break;
      case 'page_break':
        element = { ...base } as any;
        break;
      case 'repeating_section':
        // Not a normal element but we treat add similarly: add a container to page children
        const rs: any = { id: crypto.randomUUID(), type: 'repeating_section', repeatOver: 'domains', elements: [], gridColumns: '1fr', gap: 4 };
        dispatch({ type: 'ADD_ELEMENT', pageId: state.selectedPageId, element: rs });
        return;
      default:
        return;
    }
    dispatch({ type: 'ADD_ELEMENT', pageId: state.selectedPageId, element });
  }, [dispatch, state.selectedPageId]);

  const save = useCallback(async () => {
    setSaving('saving');
    try {
      const updated = await apiFetch<TemplateRow>(`/api/v1/admin/templates/${templateRow.id}`, {
        method: 'PUT',
        body: JSON.stringify({ templateJson: state.template, name: templateRow.name }),
      });
      dispatch({ type: 'MARK_SAVED' });
      onSaved?.(updated);
      setSaving('saved');
      setTimeout(() => setSaving('idle'), 1200);
    } catch (e) {
      setSaving('idle');
      alert('Save failed');
    }
  }, [dispatch, onSaved, state.template, templateRow.id, templateRow.name]);

  const publish = useCallback(async () => {
    if (!confirm('Publish this template? It will be set active.')) return;
    try {
      const updated = await apiFetch<TemplateRow>(`/api/v1/admin/templates/${templateRow.id}`, {
        method: 'PUT',
        body: JSON.stringify({ isActive: true })
      });
      onSaved?.(updated);
    } catch (e) {
      alert('Publish failed');
    }
  }, [onSaved, templateRow.id]);

  return (
    <div className="flex flex-col h-full">
      <EditorToolbar
        savingState={saving}
        onSave={save}
        onPreview={() => setPreviewOpen(true)}
        onPublish={publish}
        onUndo={() => { const prev = history.undo(); dispatch({ type: 'LOAD_TEMPLATE', template: prev }); }}
        onRedo={() => { const next = history.redo(); dispatch({ type: 'LOAD_TEMPLATE', template: next }); }}
        canUndo={history.canUndo}
        canRedo={history.canRedo}
        zoom={state.zoom}
        setZoom={(z) => dispatch({ type: 'SET_ZOOM', zoom: z })}
        onBack={onBack}
        title={`${templateRow.name} · ${templateRow.reportType}`}
      />

      {/* Main panels */}
      <div className="flex flex-1 overflow-hidden border-t bg-slate-50">
        {/* Left: 240px palette + pages */}
        <div className="w-60 shrink-0 border-r bg-white flex flex-col">
          <ElementPalette onAdd={addElement} />
          <div className="border-t" />
          <PageNavigator state={state} dispatch={dispatch} />
        </div>

        {/* Center: canvas */}
        <div className="flex-1 overflow-auto">
          <EditorCanvas state={state} dispatch={dispatch} />
        </div>

        {/* Right: properties 320px */}
        <div className="w-80 shrink-0 border-l bg-white">
          <PropertyPanel state={state} dispatch={dispatch} />
        </div>
      </div>

      {/* Variables reference */}
      <VariableReference />

      {/* Preview modal */}
      {previewOpen && (
        <PreviewPortal onClose={() => setPreviewOpen(false)} template={state.template} />
      )}
    </div>
  );
}

function PreviewPortal({ onClose, template }: { onClose: () => void; template: ReportTemplate }) {
  const [html, setHtml] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch<{ html: string }>(`/api/v1/admin/templates/preview`, {
      method: 'POST',
      body: JSON.stringify({ templateJson: template })
    })
      .then((r) => setHtml(r.html))
      .finally(() => setLoading(false));
  }, [template]);

  return (
    <div className="fixed inset-0 z-[100] bg-black/60 flex items-center justify-center p-8" onClick={onClose}>
      <div className="bg-white rounded shadow-xl w-full max-w-5xl h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="p-3 border-b flex items-center justify-between">
          <div className="font-medium">Preview</div>
          <Button variant="ghost" onClick={onClose}>Close</Button>
        </div>
        <div className="flex-1 overflow-auto bg-slate-100">
          {loading ? (
            <div className="p-6">Rendering preview…</div>
          ) : (
            <div className="flex items-start justify-center py-6">
              <iframe title="preview" className="bg-white shadow-md" style={{ width: `${template.pageSize.width * 3}px`, height: `${template.pageSize.height * 3}px` }} srcDoc={html || ''} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
