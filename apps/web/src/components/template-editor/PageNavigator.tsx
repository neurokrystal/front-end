"use client";

import { EditorAction, EditorState } from "./shared/useTemplateState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2, ArrowUp, ArrowDown } from "lucide-react";
import React, { useState } from "react";

export default function PageNavigator({ state, dispatch }: { state: EditorState; dispatch: React.Dispatch<EditorAction> }) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [labelDraft, setLabelDraft] = useState("");

  const select = (id: string) => dispatch({ type: 'SELECT_PAGE', pageId: id });
  const add = () => {
    const page = {
      id: crypto.randomUUID(),
      label: `Page ${state.template.pages.length + 1}`,
      gridColumns: '1fr',
      gridRows: 'auto',
      gap: 4,
      children: [],
    } as any;
    dispatch({ type: 'ADD_PAGE', page });
  };
  const remove = (id: string) => {
    const page = state.template.pages.find(p => p.id === id)!;
    const hasContent = page.children.length > 0;
    if (hasContent && !confirm('Delete this page and its content?')) return;
    dispatch({ type: 'REMOVE_PAGE', pageId: id });
  };
  const move = (id: string, dir: -1 | 1) => {
    const idx = state.template.pages.findIndex(p => p.id === id);
    const to = idx + dir;
    if (to < 0 || to >= state.template.pages.length) return;
    dispatch({ type: 'REORDER_PAGES', fromIndex: idx, toIndex: to });
  };
  const startRename = (id: string, current: string) => {
    setEditingId(id);
    setLabelDraft(current);
  };
  const commitRename = (id: string) => {
    dispatch({ type: 'UPDATE_PAGE', pageId: id, updates: { label: labelDraft || 'Untitled Page' } });
    setEditingId(null);
  };

  return (
    <div className="p-3 space-y-2 overflow-auto">
      <div className="flex items-center justify-between">
        <div className="text-xs font-medium text-slate-500">Pages</div>
        <Button size="sm" onClick={add}><Plus className="mr-1 h-4 w-4"/>Add</Button>
      </div>
      <div className="space-y-2">
        {state.template.pages.map((p) => {
          const isActive = p.id === state.selectedPageId;
          const isEditing = editingId === p.id;
          return (
            <div key={p.id} className={`rounded border ${isActive ? 'border-blue-500 bg-blue-50' : 'border-slate-200 bg-white'} p-2`}> 
              {isEditing ? (
                <Input autoFocus value={labelDraft} onChange={(e) => setLabelDraft(e.target.value)} onBlur={() => commitRename(p.id)} onKeyDown={(e) => { if (e.key === 'Enter') commitRename(p.id); if (e.key === 'Escape') setEditingId(null); }} />
              ) : (
                <div className="text-sm font-medium cursor-pointer" onClick={() => select(p.id)} onDoubleClick={() => startRename(p.id, p.label)}>
                  {p.label}
                </div>
              )}
              <div className="mt-2 flex items-center gap-1">
                <Button size="icon" variant="ghost" onClick={() => move(p.id, -1)} disabled={state.template.pages[0].id === p.id}><ArrowUp className="h-4 w-4"/></Button>
                <Button size="icon" variant="ghost" onClick={() => move(p.id, 1)} disabled={state.template.pages[state.template.pages.length - 1].id === p.id}><ArrowDown className="h-4 w-4"/></Button>
                <div className="ml-auto" />
                <Button size="icon" variant="ghost" onClick={() => startRename(p.id, p.label)} title="Rename">Aa</Button>
                <Button size="icon" variant="ghost" onClick={() => remove(p.id)} title="Delete"><Trash2 className="h-4 w-4 text-red-600"/></Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
