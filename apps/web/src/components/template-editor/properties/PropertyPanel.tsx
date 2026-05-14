"use client";

import React, { useMemo } from "react";
import type { EditorAction, EditorState } from "../shared/useTemplateState";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import PropertySection from "./PropertySection";

const FONTS = ['Inter', 'Roboto', 'Lora', 'Playfair Display', 'Montserrat', 'Open Sans'];

function PropertyPanelImpl({ state, dispatch }: { state: EditorState; dispatch: React.Dispatch<EditorAction> }) {
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
      <div className="p-3 space-y-4">
        <PropertySection title="Layout">
          <div className="space-y-1">
            <Label className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1.5">Page Label</Label>
            <Input 
              className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              value={selectedPage.label} 
              onChange={(e) => dispatch({ type: 'UPDATE_PAGE', pageId: selectedPage.id, updates: { label: e.target.value } })} 
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1.5">Grid Columns</Label>
            <Input 
              className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              value={selectedPage.gridColumns || '1fr'} 
              onChange={(e) => dispatch({ type: 'UPDATE_PAGE', pageId: selectedPage.id, updates: { gridColumns: e.target.value } })} 
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1.5">Gap (mm)</Label>
            <Input 
              type="number" 
              className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              value={selectedPage.gap ?? 4} 
              onChange={(e) => dispatch({ type: 'UPDATE_PAGE', pageId: selectedPage.id, updates: { gap: Number(e.target.value) } })} 
            />
          </div>
        </PropertySection>
      </div>
    );
  }

  if (selected.type === 'text') {
    const font = selected.font || { family: 'Inter', size: 14, weight: '400', style: 'normal', color: '#0f172a', lineHeight: 1.4, letterSpacing: 0 };
    const update = (updates: any) => dispatch({ type: 'UPDATE_ELEMENT', elementId: selected.id, updates });
    return (
      <div className="p-3 space-y-4">
        <PropertySection title="Content" defaultOpen>
          <div className="space-y-1">
            <Label className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1.5">Content</Label>
            <Textarea 
              rows={6} 
              className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              value={selected.content || ''} 
              onChange={(e) => update({ content: e.target.value })} 
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1.5">Font Family</Label>
              <Select value={font.family} onValueChange={(v) => update({ font: { ...font, family: v } })}>
                <SelectTrigger className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {FONTS.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1.5">Font Size</Label>
              <Input 
                type="number" 
                className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={font.size} 
                onChange={(e) => update({ font: { ...font, size: Number(e.target.value) } })} 
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1.5">Weight</Label>
              <Select value={font.weight} onValueChange={(v) => update({ font: { ...font, weight: v } })}>
                <SelectTrigger className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['300','400','500','600','700','800'].map(w => <SelectItem key={w} value={w}>{w}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1.5">Style</Label>
              <Select value={font.style} onValueChange={(v) => update({ font: { ...font, style: v } })}>
                <SelectTrigger className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="italic">Italic</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1.5">Text Color</Label>
            <Input 
              type="color" 
              className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              value={font.color} 
              onChange={(e) => update({ font: { ...font, color: e.target.value } })} 
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1.5">Align</Label>
            <div className="flex gap-2">
              {(['left','center','right','justify'] as const).map(a => (
                <Button key={a} size="sm" variant={selected.textAlign === a ? 'default' : 'outline'} onClick={() => update({ textAlign: a })}>{a}</Button>
              ))}
            </div>
          </div>
        </PropertySection>

        <PropertySection title="Layout" defaultOpen>
          {/* Position mode toggle */}
          <div className="flex gap-2 mb-3">
            <button
              onClick={() => update({ position: 'grid' })}
              className={`flex-1 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                selected.position !== 'absolute' 
                  ? 'bg-blue-50 border-blue-200 text-blue-700' 
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              Grid (flow)
            </button>
            <button
              onClick={() => update({ position: 'absolute', absoluteX: selected.absoluteX ?? 20, absoluteY: selected.absoluteY ?? 20 })}
              className={`flex-1 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                selected.position === 'absolute' 
                  ? 'bg-blue-50 border-blue-200 text-blue-700' 
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              Free (absolute)
            </button>
          </div>

          {selected.position === 'absolute' ? (
            <>
              {/* X/Y coordinates */}
              <div className="grid grid-cols-2 gap-2 mb-2">
                <div className="space-y-1">
                  <Label className="text-xs font-medium text-slate-500 uppercase tracking-wider">X (mm)</Label>
                  <Input 
                    type="number" 
                    className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    value={selected.absoluteX ?? 0} 
                    onChange={(e) => update({ absoluteX: Number(e.target.value) })}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-medium text-slate-500 uppercase tracking-wider">Y (mm)</Label>
                  <Input 
                    type="number" 
                    className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    value={selected.absoluteY ?? 0} 
                    onChange={(e) => update({ absoluteY: Number(e.target.value) })}
                  />
                </div>
              </div>
              {/* Width/Height */}
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs font-medium text-slate-500 uppercase tracking-wider">Width</Label>
                  <Input
                    className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    value={selected.width || 'auto'}
                    onChange={(e) => update({ width: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-medium text-slate-500 uppercase tracking-wider">Height</Label>
                  <Input
                    className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    value={selected.height || 'auto'}
                    onChange={(e) => update({ height: e.target.value })}
                  />
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Grid controls */}
              <div className="space-y-1">
                <Label className="text-xs font-medium text-slate-500 uppercase tracking-wider">Grid Column</Label>
                <Input 
                  className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  value={selected.gridColumn || '1 / -1'} 
                  onChange={(e) => update({ gridColumn: e.target.value })} 
                />
              </div>
              <div className="grid grid-cols-2 gap-2 mt-2">
                <div className="space-y-1">
                  <Label className="text-xs font-medium text-slate-500 uppercase tracking-wider">Width</Label>
                  <Input
                    className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    value={selected.width || 'auto'}
                    onChange={(e) => update({ width: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-medium text-slate-500 uppercase tracking-wider">Height</Label>
                  <Input
                    className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    value={selected.height || 'auto'}
                    onChange={(e) => update({ height: e.target.value })}
                  />
                </div>
              </div>
            </>
          )}
        </PropertySection>

        <PropertySection title="Appearance">
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1.5">Background</Label>
              <Input
                type="color"
                className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={selected.backgroundColor || '#ffffff'}
                onChange={(e) => update({ backgroundColor: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1.5">Opacity</Label>
              <Input
                type="range"
                min={0}
                max={1}
                step={0.05}
                className="w-full"
                value={selected.opacity ?? 1}
                onChange={(e) => update({ opacity: Number(e.target.value) })}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1.5">Border Color</Label>
              <Input
                type="color"
                className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={selected.borderColor || '#e2e8f0'}
                onChange={(e) => update({ borderColor: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1.5">Border Width (px)</Label>
              <Input
                type="number"
                className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={selected.borderWidth ?? 0}
                onChange={(e) => update({ borderWidth: Number(e.target.value) })}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1.5">Border Style</Label>
              <Select value={selected.borderStyle || 'solid'} onValueChange={(v) => update({ borderStyle: v })}>
                <SelectTrigger className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['solid','dashed','dotted','double','none'].map(s => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1.5">Border Radius (px)</Label>
              <Input
                type="number"
                className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={selected.borderRadius ?? 0}
                onChange={(e) => update({ borderRadius: Number(e.target.value) })}
              />
            </div>
          </div>
        </PropertySection>

        <PropertySection title="Conditional Visibility" defaultOpen={false}>
          <div className="text-xs text-slate-500">Optional conditions can control when this element is shown.</div>
        </PropertySection>
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

const PropertyPanel = React.memo(PropertyPanelImpl);

export default PropertyPanel;
