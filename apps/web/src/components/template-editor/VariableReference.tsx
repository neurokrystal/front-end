"use client";

import React, { useState } from "react";

const TOKENS: { title: string; items: string[] }[] = [
  {
    title: 'Domain Scores',
    items: [
      '{{domain.safety.band}}', '{{domain.safety.rawScore}}',
      '{{domain.challenge.band}}', '{{domain.challenge.rawScore}}',
      '{{domain.play.band}}', '{{domain.play.rawScore}}',
    ],
  },
  {
    title: 'Dimensions',
    items: [
      '{{dimension.self.band}}', '{{dimension.self.rawScore}}',
      '{{dimension.others.band}}', '{{dimension.others.rawScore}}',
      '{{dimension.past.band}}', '{{dimension.future.band}}',
      '{{dimension.senses.band}}', '{{dimension.perception.band}}',
    ],
  },
  {
    title: 'Alignments',
    items: [
      '{{alignment.safety.severity}}', '{{alignment.safety.direction}}',
      '{{alignment.challenge.severity}}', '{{alignment.challenge.direction}}',
      '{{alignment.play.severity}}', '{{alignment.play.direction}}',
    ],
  },
  {
    title: 'Meta',
    items: [
      '{{subject_name}}', '{{report_date}}', '{{page_number}}', '{{total_pages}}'
    ],
  },
];

export default function VariableReference() {
  const [open, setOpen] = useState(true);

  const copy = async (t: string) => {
    await navigator.clipboard.writeText(t);
    // A simple toast replacement
    const prev = document.title;
    document.title = `Copied ${t}`;
    setTimeout(() => { document.title = prev; }, 500);
  };

  return (
    <div className="border-t bg-white">
      <button className="w-full text-left px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50" onClick={() => setOpen(!open)}>
        {open ? '▼' : '►'} Variables Reference
      </button>
      {open && (
        <div className="px-4 py-3 grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {TOKENS.map((g) => (
            <div key={g.title}>
              <div className="text-xs font-semibold text-slate-500 mb-1">{g.title}</div>
              <div className="flex flex-wrap gap-2">
                {g.items.map((t) => (
                  <button key={t} className="text-[11px] px-2 py-1 rounded border bg-slate-50 hover:bg-slate-100" onClick={() => copy(t)}>{t}</button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
