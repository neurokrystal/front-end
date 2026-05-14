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
  const [showVars, setShowVars] = useState(true);

  const copyToClipboard = async (t: string) => {
    try {
      await navigator.clipboard.writeText(t);
      // naive toast replacement
      const prev = document.title;
      document.title = `Copied ${t}`;
      setTimeout(() => { document.title = prev; }, 500);
    } catch {}
  };

  return (
    <div className="border-t border-slate-200 bg-slate-50 px-4 py-3">
      <button onClick={() => setShowVars(!showVars)} className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">
        {showVars ? '▼' : '▶'} Template Variables
      </button>
      {showVars && (
        <div className="mt-3 grid grid-cols-3 gap-6">
          {TOKENS.map((g) => (
            <div key={g.title}>
              <p className="text-[11px] font-semibold text-slate-400 uppercase mb-2">{g.title}</p>
              <div className="flex flex-wrap gap-1.5">
                {g.items.map((v) => (
                  <button 
                    key={v} 
                    onClick={() => copyToClipboard(v)}
                    className="bg-white border border-slate-200 rounded px-2 py-1 text-[11px] text-slate-600 font-mono hover:border-blue-300 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                  >
                    {v}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
