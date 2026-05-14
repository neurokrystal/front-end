"use client";

import React, { useMemo } from "react";
import type { EditorAction, EditorState } from "../shared/useTemplateState";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";

const FONTS = ['Inter', 'Roboto', 'Lora', 'Playfair Display', 'Montserrat', 'Open Sans'];

export default function PropertyPanel({ state, dispatch }: { state: EditorState; dispatch: React.Dispatch<EditorAction> }) {
  const selected = useMemo(() => {
    if (!state.selectedElementId) return null;
    for (const p of state.template.pages) {
      for (const child of p.children as any[]) {
        if (child.id === state.selectedElementId) return child;
      }
    }
    return null;
  }, [state]);

  const selectedPage = state.template.pages.find(p => p.id === state.selectedPageId)!;

  if (!selected) {
    // Page properties
    return (
      <div className="p-3 space-y-3">
        <div className="text-xs font-medium text-slate-500">Page Properties</div>
        <div className="space-y-1">
          <Label>Page label</Label>
          <Input value={selectedPage.label} onChange={(e) => dispatch({ type: 'UPDATE_PAGE', pageId: selectedPage.id, updates: { label: e.target.value } })} />
        </div>
        <div className="space-y-1">
          <Label>Grid columns</Label>
          <Input value={selectedPage.gridColumns || '1fr'} onChange={(e) => dispatch({ type: 'UPDATE_PAGE', pageId: selectedPage.id, updates: { gridColumns: e.target.value } })} />
        </div>
        <div className="space-y-1">
          <Label>Gap (mm)</Label>
          <Input type="number" value={selectedPage.gap ?? 4} onChange={(e) => dispatch({ type: 'UPDATE_PAGE', pageId: selectedPage.id, updates: { gap: Number(e.target.value) } })} />
        </div>
      </div>
    );
  }

  if (selected.type === 'text') {
    const font = selected.font || { family: 'Inter', size: 14, weight: '400', style: 'normal', color: '#0f172a', lineHeight: 1.4, letterSpacing: 0 };
    const update = (updates: any) => dispatch({ type: 'UPDATE_ELEMENT', elementId: selected.id, updates });
    return (
      <div className="p-3 space-y-3">
        <div className="text-xs font-medium text-slate-500">Text Properties</div>
        <div className="space-y-1">
          <Label>Content</Label>
          <Textarea rows={6} value={selected.content || ''} onChange={(e) => update({ content: e.target.value })} />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label>Font Family</Label>
            <Select value={font.family} onValueChange={(v) => update({ font: { ...font, family: v } })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {FONTS.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Font Size</Label>
            <Input type="number" value={font.size} onChange={(e) => update({ font: { ...font, size: Number(e.target.value) } })} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label>Weight</Label>
            <Select value={font.weight} onValueChange={(v) => update({ font: { ...font, weight: v } })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {['300','400','500','600','700','800'].map(w => <SelectItem key={w} value={w}>{w}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Style</Label>
            <Select value={font.style} onValueChange={(v) => update({ font: { ...font, style: v } })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="normal">Normal</SelectItem>
                <SelectItem value="italic">Italic</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="space-y-1">
          <Label>Text Color</Label>
          <Input type="color" value={font.color} onChange={(e) => update({ font: { ...font, color: e.target.value } })} />
        </div>
        <div className="space-y-1">
          <Label>Align</Label>
          <div className="flex gap-2">
            {(['left','center','right','justify'] as const).map(a => (
              <Button key={a} size="sm" variant={selected.textAlign === a ? 'default' : 'outline'} onClick={() => update({ textAlign: a })}>{a}</Button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Fallback for other element types not yet fully implemented
  return (
    <div className="p-3 space-y-3">
      <div className="text-xs font-medium text-slate-500">Properties</div>
      <div className="text-sm text-slate-600">Basic properties for this element type will be available in the next stage.</div>
    </div>
  );
}
