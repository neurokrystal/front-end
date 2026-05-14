"use client";

import { EditorAction, EditorState } from "./shared/useTemplateState";
import { Plus } from "lucide-react";
import React from "react";

function PageNavigatorImpl({ state, dispatch }: { state: EditorState; dispatch: React.Dispatch<EditorAction> }) {
  const selectPage = (id: string) => dispatch({ type: 'SELECT_PAGE', pageId: id });
  const addPage = () => {
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

  const selectedPageId = state.selectedPageId;

  return (
    <div className="p-3 mt-1">
      <div className="mt-4 border-t border-slate-200 pt-4">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Pages</p>
          <button onClick={addPage} className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1">
            <Plus className="w-3 h-3" /> Add
          </button>
        </div>
        <div className="space-y-1">
          {state.template.pages.map((page, i) => (
            <button
              key={page.id}
              onClick={() => selectPage(page.id)}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm flex items-center justify-between transition-colors ${
                selectedPageId === page.id
                  ? 'bg-blue-50 text-blue-700 font-medium'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <span className="flex items-center gap-2">
                <span className="text-xs text-slate-400 tabular-nums w-4">{i + 1}</span>
                {page.label || `Page ${i + 1}`}
              </span>
              <span className="text-xs text-slate-400">{page.children.length} items</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

const PageNavigator = React.memo(PageNavigatorImpl);

export default PageNavigator;
