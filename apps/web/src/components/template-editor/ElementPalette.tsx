"use client";

import { Button } from "@/components/ui/button";

const items: { key: any; label: string; emoji: string }[] = [
  { key: 'text', label: 'Text', emoji: '📝' },
  { key: 'cms_block', label: 'CMS Block', emoji: '📦' },
  { key: 'image', label: 'Image', emoji: '🖼️' },
  { key: 'shape', label: 'Shape', emoji: '◻️' },
  { key: 'chart', label: 'Chart', emoji: '📊' },
  { key: 'spacer', label: 'Spacer', emoji: '⎯' },
  { key: 'page_break', label: 'Page Break', emoji: '📄' },
  { key: 'repeating_section', label: 'Repeating', emoji: '🔄' },
];

export default function ElementPalette({ onAdd }: { onAdd: (type: any) => void }) {
  return (
    <div className="p-3 space-y-2">
      <div className="text-xs font-medium text-slate-500">Elements</div>
      <div className="grid grid-cols-2 gap-2">
        {items.map((it) => (
          <Button key={it.key} variant="outline" className="h-9 justify-start" onClick={() => onAdd(it.key)}>
            <span className="mr-2" aria-hidden>{it.emoji}</span>
            {it.label}
          </Button>
        ))}
      </div>
    </div>
  );
}
