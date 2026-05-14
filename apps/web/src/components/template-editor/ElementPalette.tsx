"use client";

import React from "react";

const elements = [
  { type: 'text', icon: '📝', label: 'Text', hint: 'Headings, paragraphs, dynamic values' },
  { type: 'cms_block', icon: '📦', label: 'CMS Block', hint: 'Score-based personalised content' },
  { type: 'image', icon: '🖼️', label: 'Image', hint: 'Logos, graphics, backgrounds' },
  { type: 'shape', icon: '◻️', label: 'Shape', hint: 'Rectangles, circles, dividers' },
  { type: 'chart', icon: '📊', label: 'Chart', hint: 'Radar, bar, gauge visualisations' },
  { type: 'spacer', icon: '⎯', label: 'Spacer', hint: 'Vertical spacing between elements' },
  { type: 'page_break', icon: '📄', label: 'Page Break', hint: 'Force a new PDF page' },
  { type: 'repeating_section', icon: '🔄', label: 'Repeating', hint: 'Repeat per domain or dimension' },
];

function ElementPaletteImpl({ onAdd }: { onAdd: (type: any) => void }) {
  return (
    <div className="p-3 space-y-1">
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-1 mb-2">Elements</p>
      {elements.map((el) => (
        <button
          key={el.type}
          onClick={() => onAdd(el.type)}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-slate-700 hover:bg-blue-50 hover:text-blue-700 transition-colors text-left group"
          title={el.hint}
        >
          <span className="text-base" aria-hidden>{el.icon}</span>
          <div>
            <span className="font-medium">{el.label}</span>
            <span className="block text-[11px] text-slate-400 group-hover:text-blue-500">{el.hint}</span>
          </div>
        </button>
      ))}
    </div>
  );
}

const ElementPalette = React.memo(ElementPaletteImpl);

export default ElementPalette;
