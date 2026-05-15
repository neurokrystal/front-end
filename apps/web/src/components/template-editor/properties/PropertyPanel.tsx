"use client";

import React, { useMemo } from "react";
import type { EditorAction, EditorState } from "../shared/useTemplateState";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import PropertySection from "./PropertySection";
import { AssetPicker } from "@/components/admin/AssetPicker";

// Shared sections extracted from Text properties so they can be reused by all element types
function LayoutSection({ element, update, options }: { element: any; update: (u: any) => void; options?: { showGridColumn?: boolean; showSize?: boolean } }) {
  const { showGridColumn = true, showSize = true } = options || {};
  return (
    <PropertySection title="Layout" defaultOpen>
      {/* Position mode toggle */}
      <div className="flex gap-2 mb-3">
        <button
          onClick={() => update({ position: 'grid' })}
          className={`flex-1 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
            element.position !== 'absolute' 
              ? 'bg-blue-50 border-blue-200 text-blue-700' 
              : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          Grid (flow)
        </button>
        <button
          onClick={() => update({ position: 'absolute', absoluteX: element.absoluteX ?? 20, absoluteY: element.absoluteY ?? 20 })}
          className={`flex-1 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
            element.position === 'absolute' 
              ? 'bg-blue-50 border-blue-200 text-blue-700' 
              : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          Free (absolute)
        </button>
      </div>

      {element.position === 'absolute' ? (
        <>
          {/* X/Y coordinates */}
          <div className="grid grid-cols-2 gap-2 mb-2">
            <div className="space-y-1">
              <Label className="text-xs font-medium text-slate-500 uppercase tracking-wider">X (mm)</Label>
              <Input 
                type="number" 
                className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={element.absoluteX ?? 0} 
                onChange={(e) => update({ absoluteX: Number(e.target.value) })}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-medium text-slate-500 uppercase tracking-wider">Y (mm)</Label>
              <Input 
                type="number" 
                className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={element.absoluteY ?? 0} 
                onChange={(e) => update({ absoluteY: Number(e.target.value) })}
              />
            </div>
          </div>
          {/* Width/Height */}
          {showSize && (
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs font-medium text-slate-500 uppercase tracking-wider">Width</Label>
                <Input
                  className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  value={element.width || 'auto'}
                  onChange={(e) => update({ width: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-medium text-slate-500 uppercase tracking-wider">Height</Label>
                <Input
                  className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  value={element.height || 'auto'}
                  onChange={(e) => update({ height: e.target.value })}
                />
              </div>
            </div>
          )}
        </>
      ) : (
        <>
          {/* Grid controls */}
          {showGridColumn && (
            <div className="space-y-1">
              <Label className="text-xs font-medium text-slate-500 uppercase tracking-wider">Grid Column</Label>
              <Input 
                className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={element.gridColumn || '1 / -1'} 
                onChange={(e) => update({ gridColumn: e.target.value })} 
              />
            </div>
          )}
          {showSize && (
            <div className="grid grid-cols-2 gap-2 mt-2">
              <div className="space-y-1">
                <Label className="text-xs font-medium text-slate-500 uppercase tracking-wider">Width</Label>
                <Input
                  className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  value={element.width || 'auto'}
                  onChange={(e) => update({ width: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-medium text-slate-500 uppercase tracking-wider">Height</Label>
                <Input
                  className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  value={element.height || 'auto'}
                  onChange={(e) => update({ height: e.target.value })}
                />
              </div>
            </div>
          )}
        </>
      )}
    </PropertySection>
  );
}

function AppearanceSection({ element, update }: { element: any; update: (u: any) => void }) {
  return (
    <PropertySection title="Appearance">
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1.5">Background</Label>
          <Input
            type="color"
            className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            value={element.backgroundColor || '#ffffff'}
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
            value={element.opacity ?? 1}
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
            value={element.borderColor || '#e2e8f0'}
            onChange={(e) => update({ borderColor: e.target.value })}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1.5">Border Width (px)</Label>
          <Input
            type="number"
            className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            value={element.borderWidth ?? 0}
            onChange={(e) => update({ borderWidth: Number(e.target.value) })}
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1.5">Border Style</Label>
          <Select value={element.borderStyle || 'solid'} onValueChange={(v) => update({ borderStyle: v })}>
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
            value={element.borderRadius ?? 0}
            onChange={(e) => update({ borderRadius: Number(e.target.value) })}
          />
        </div>
      </div>
    </PropertySection>
  );
}

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

        <LayoutSection element={selected} update={update} />

        <AppearanceSection element={selected} update={update} />

        <PropertySection title="Conditional Visibility" defaultOpen={false}>
          <div className="text-xs text-slate-500">Optional conditions can control when this element is shown.</div>
        </PropertySection>
      </div>
    );
  }

  // CMS Block Properties
  if (selected.type === 'cms_block') {
    const font = selected.font || { family: 'Inter', size: 14, weight: '400', style: 'normal', color: '#0f172a', lineHeight: 1.4, letterSpacing: 0 };
    const update = (updates: any) => dispatch({ type: 'UPDATE_ELEMENT', elementId: selected.id, updates });
    const SECTION_KEYS = ['domain_overview','feelings_state','behaviours_state','alignment','dimension','coaching_guidance','leader_foundation','leader_manifestation','leader_coaching','comparison_aligned','comparison_divergent'];
    const DOMAINS = ['(auto)','safety','challenge','play'];
    const DIMENSIONS = ['(none)','self','others','past','future','senses','perception'];
    const SCORE_BANDS = ['(auto/contextual)','very_low','low','slightly_low','balanced'];
    const ALIGN_DIR = ['(none)','masking_upward','masking_downward','aligned'];
    const ALIGN_SEV = ['(none)','aligned','mild_divergence','significant_divergence','severe_divergence'];
    return (
      <div className="p-3 space-y-4">
        <PropertySection title="Content" defaultOpen>
          <div className="space-y-1">
            <Label className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1.5">Section Key</Label>
            <Select value={selected.sectionKey || SECTION_KEYS[0]} onValueChange={(v) => update({ sectionKey: v })}>
              <SelectTrigger className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"><SelectValue /></SelectTrigger>
              <SelectContent>
                {SECTION_KEYS.map(k => <SelectItem key={k} value={k}>{k}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1.5">Domain</Label>
              <Select value={selected.domain || DOMAINS[0]} onValueChange={(v) => update({ domain: v === '(auto)' ? undefined : v })}>
                <SelectTrigger className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DOMAINS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1.5">Dimension</Label>
              <Select value={selected.dimension || DIMENSIONS[0]} onValueChange={(v) => update({ dimension: v === '(none)' ? undefined : v })}>
                <SelectTrigger className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DIMENSIONS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1.5">Score Band</Label>
              <Select value={selected.scoreBand || SCORE_BANDS[0]} onValueChange={(v) => update({ scoreBand: v })}>
                <SelectTrigger className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SCORE_BANDS.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1.5">Alignment Direction</Label>
              <Select value={selected.alignmentDirection || ALIGN_DIR[0]} onValueChange={(v) => update({ alignmentDirection: v })}>
                <SelectTrigger className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ALIGN_DIR.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1.5">Alignment Severity</Label>
            <Select value={selected.alignmentSeverity || ALIGN_SEV[0]} onValueChange={(v) => update({ alignmentSeverity: v })}>
              <SelectTrigger className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"><SelectValue /></SelectTrigger>
              <SelectContent>
                {ALIGN_SEV.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </PropertySection>

        {/* Font controls */}
        <PropertySection title="Font" defaultOpen>
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

        <LayoutSection element={selected} update={update} />
        <AppearanceSection element={selected} update={update} />

        <PropertySection title="Conditional Visibility" defaultOpen={false}>
          <div className="text-xs text-slate-500">Optional conditions can control when this element is shown.</div>
        </PropertySection>
      </div>
    );
  }

  // Image Properties
  if (selected.type === 'image') {
    const update = (updates: any) => dispatch({ type: 'UPDATE_ELEMENT', elementId: selected.id, updates });
    return (
      <div className="p-3 space-y-4">
        <PropertySection title="Content" defaultOpen>
          <div className="space-y-1">
            <Label className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1.5">Image Source</Label>
            <AssetPicker
              value={selected.src || ''}
              onChange={(url) => update({ src: url })}
              mimeTypeFilter="image/*"
              label=""
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1.5">Alt Text</Label>
            <Input 
              className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              value={selected.alt || ''} 
              onChange={(e) => update({ alt: e.target.value })}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1.5">Object Fit</Label>
            <Select value={selected.objectFit || 'contain'} onValueChange={(v) => update({ objectFit: v })}>
              <SelectTrigger className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"><SelectValue /></SelectTrigger>
              <SelectContent>
                {['cover','contain','fill','none'].map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </PropertySection>
        <LayoutSection element={selected} update={update} />
        <AppearanceSection element={selected} update={update} />
      </div>
    );
  }

  // Shape Properties
  if (selected.type === 'shape') {
    const update = (updates: any) => dispatch({ type: 'UPDATE_ELEMENT', elementId: selected.id, updates });
    const SHAPES = [
      { label: 'Rectangle', value: 'rectangle' },
      { label: 'Circle', value: 'circle' },
      { label: 'Ellipse', value: 'ellipse' },
      { label: 'Line', value: 'line' },
      { label: 'Divider', value: 'divider' },
    ];
    return (
      <div className="p-3 space-y-4">
        <PropertySection title="Content" defaultOpen>
          <div className="space-y-1">
            <Label className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1.5">Shape Type</Label>
            <div className="flex gap-2 flex-wrap">
              {SHAPES.map(s => (
                <Button key={s.value} size="sm" variant={selected.shapeType === s.value ? 'default' : 'outline'} onClick={() => update({ shapeType: s.value })}>{s.label}</Button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1.5">Fill Color</Label>
              <Input type="color" className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm" value={selected.fill || '#ffffff'} onChange={(e) => update({ fill: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1.5">Stroke Color</Label>
              <Input 
                type="color" 
                className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm" 
                value={selected.stroke?.color || '#000000'} 
                onChange={(e) => update({ stroke: { ...(selected.stroke || {}), color: e.target.value } })} 
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1.5">Stroke Width (px)</Label>
              <Input 
                type="number" 
                className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm" 
                value={selected.stroke?.width ?? 0} 
                onChange={(e) => update({ stroke: { ...(selected.stroke || {}), width: Number(e.target.value) } })} 
              />
            </div>
            {selected.shapeType === 'rectangle' && (
              <div className="space-y-1">
                <Label className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1.5">Corner Radius (px)</Label>
                <Input type="number" className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm" value={selected.cornerRadius ?? 0} onChange={(e) => update({ cornerRadius: Number(e.target.value) })} />
              </div>
            )}
          </div>
        </PropertySection>
        <LayoutSection element={selected} update={update} />
        <AppearanceSection element={selected} update={update} />
      </div>
    );
  }

  // Chart Properties
  if (selected.type === 'chart') {
    const update = (updates: any) => dispatch({ type: 'UPDATE_ELEMENT', elementId: selected.id, updates });
    const CHART_TYPES = [
      { label: 'Radar', value: 'radar' },
      { label: 'Bar', value: 'bar' },
      { label: 'Horizontal Bar', value: 'horizontal_bar' },
      { label: 'Gauge', value: 'gauge' },
    ];
    const DATA_SOURCES = [
      { label: 'Domain Scores', value: 'domains' },
      { label: 'Dimension Scores', value: 'dimensions' },
      { label: 'Alignment Metrics', value: 'alignments' },
    ];
    const colors = selected.colors || { safety: '#4A90D9', challenge: '#F5A623', play: '#7ED321' };
    return (
      <div className="p-3 space-y-4">
        <PropertySection title="Content" defaultOpen>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1.5">Chart Type</Label>
              <Select value={selected.chartType || 'radar'} onValueChange={(v) => update({ chartType: v })}>
                <SelectTrigger className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CHART_TYPES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1.5">Data Source</Label>
              <Select value={selected.dataSource || selected?.dataBinding?.source || 'domains'} onValueChange={(v) => update({ dataSource: v, dataBinding: { ...(selected.dataBinding || {}), source: v } })}>
                <SelectTrigger className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DATA_SOURCES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1.5">Compare Profiles</Label>
              <div className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={selected.compareProfiles || selected?.dataBinding?.compareProfiles || false} onChange={(e) => update({ compareProfiles: e.target.checked, dataBinding: { ...(selected.dataBinding || {}), compareProfiles: e.target.checked } })} />
                <span className="text-slate-600">Enable</span>
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1.5">Show Labels</Label>
              <div className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={selected.showLabels ?? true} onChange={(e) => update({ showLabels: e.target.checked })} />
                <span className="text-slate-600">On</span>
              </div>
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1.5">Show Values</Label>
            <div className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={selected.showValues ?? false} onChange={(e) => update({ showValues: e.target.checked })} />
              <span className="text-slate-600">On</span>
            </div>
          </div>

          {/* Color overrides */}
          <div className="mt-2 space-y-2">
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Color Overrides</div>
            <div className="grid grid-cols-3 gap-2">
              <div className="space-y-1">
                <Label className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1.5">Safety</Label>
                <Input type="color" value={colors.safety || '#4A90D9'} onChange={(e) => update({ colors: { ...colors, safety: e.target.value } })} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1.5">Challenge</Label>
                <Input type="color" value={colors.challenge || '#F5A623'} onChange={(e) => update({ colors: { ...colors, challenge: e.target.value } })} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1.5">Play</Label>
                <Input type="color" value={colors.play || '#7ED321'} onChange={(e) => update({ colors: { ...colors, play: e.target.value } })} />
              </div>
            </div>
          </div>
        </PropertySection>
        <LayoutSection element={selected} update={update} />
        <AppearanceSection element={selected} update={update} />
      </div>
    );
  }

  // Spacer Properties
  if (selected.type === 'spacer') {
    const update = (updates: any) => dispatch({ type: 'UPDATE_ELEMENT', elementId: selected.id, updates });
    const heightMm = selected.heightMm ?? 10;
    return (
      <div className="p-3 space-y-4">
        <PropertySection title="Content" defaultOpen>
          <div className="space-y-1">
            <Label className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1.5">Height (mm)</Label>
            <div className="flex items-center gap-2">
              <Input 
                type="range" min={1} max={100} step={1} className="flex-1" 
                value={heightMm} onChange={(e) => update({ heightMm: Number(e.target.value) })} 
              />
              <Input 
                type="number" className="w-20 bg-white border border-slate-200 rounded-lg px-2 py-1 text-sm" 
                value={heightMm} onChange={(e) => update({ heightMm: Number(e.target.value) })}
              />
            </div>
          </div>
        </PropertySection>
        {/* Simplified layout: no width/height, spacer is full-width + fixed height */}
        <LayoutSection element={selected} update={update} options={{ showGridColumn: true, showSize: false }} />
      </div>
    );
  }

  // Repeating Section Properties
  if (selected.type === 'repeating_section') {
    const update = (updates: any) => dispatch({ type: 'UPDATE_ELEMENT', elementId: selected.id, updates });
    const repeatOver = selected.repeatOver || 'domains';
    const DOMAIN_OPTIONS = [
      { key: 'safety', label: 'Safety' },
      { key: 'challenge', label: 'Challenge' },
      { key: 'play', label: 'Play' },
    ];
    const DIMENSION_OPTIONS = [
      { key: 'self', label: 'Self' },
      { key: 'others', label: 'Others' },
      { key: 'past', label: 'Past' },
      { key: 'future', label: 'Future' },
      { key: 'senses', label: 'Senses' },
      { key: 'perception', label: 'Perception' },
    ];
    const currentFilter: string[] = selected.filterTo || [];
    const toggleFilter = (val: string) => {
      if (currentFilter.includes(val)) {
        update({ filterTo: currentFilter.filter(v => v !== val) });
      } else {
        update({ filterTo: [...currentFilter, val] });
      }
    };
    const childrenCount = Array.isArray((selected as any).elements) ? (selected as any).elements.length : 0;
    return (
      <div className="p-3 space-y-4">
        <PropertySection title="Content" defaultOpen>
          <div className="space-y-1">
            <Label className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1.5">Repeat Over</Label>
            <Select value={repeatOver} onValueChange={(v) => update({ repeatOver: v, filterTo: [] })}>
              <SelectTrigger className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="domains">Domains (3)</SelectItem>
                <SelectItem value="dimensions">Dimensions (6)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1.5">Filter</Label>
            <div className="grid grid-cols-2 gap-2 text-sm text-slate-700">
              {(repeatOver === 'domains' ? DOMAIN_OPTIONS : DIMENSION_OPTIONS).map(opt => (
                <label key={opt.key} className="flex items-center gap-2">
                  <input type="checkbox" checked={currentFilter.includes(opt.key)} onChange={() => toggleFilter(opt.key)} />
                  <span>{opt.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="p-2 bg-slate-50 border border-slate-200 rounded-md text-xs text-slate-600">
            Contains {childrenCount} elements. Edit child elements by clicking them on the canvas.
          </div>
        </PropertySection>

        {/* Repeating sections use grid layout & appearance similar to elements */}
        <PropertySection title="Layout" defaultOpen>
          <div className="space-y-1">
            <Label className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1.5">Grid Columns</Label>
            <Input 
              className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              value={selected.gridColumns || '1fr'} 
              onChange={(e) => update({ gridColumns: e.target.value })}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1.5">Gap (mm)</Label>
            <Input 
              type="number"
              className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              value={selected.gap ?? 4}
              onChange={(e) => update({ gap: Number(e.target.value) })}
            />
          </div>
        </PropertySection>

        <AppearanceSection element={selected} update={update} />
      </div>
    );
  }

  // Page Break Properties
  if (selected.type === 'page_break') {
    return (
      <div className="p-3 space-y-3">
        <div className="p-3 text-sm text-slate-500">
          This element forces a new page in the PDF output. It has no configurable properties.
        </div>
      </div>
    );
  }

  // Fallback (should not show for known types)
  return (
    <div className="p-3 space-y-3">
      <div className="text-xs font-medium text-slate-500">Properties</div>
      <div className="text-sm text-slate-600">No additional properties available for this element.</div>
    </div>
  );
}

const PropertyPanel = React.memo(PropertyPanelImpl);

export default PropertyPanel;
