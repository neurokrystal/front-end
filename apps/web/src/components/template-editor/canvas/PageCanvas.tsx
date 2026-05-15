"use client";

import React, { useMemo } from "react";
import type { PageDefinition, TemplateElement } from "@dimensional/shared";
import type { EditorAction, EditorState } from "../shared/useTemplateState";
import ElementWrapper from "../elements/ElementWrapper";
import TextPreview from "../elements/TextPreview";
import CmsBlockPreview from "../elements/CmsBlockPreview";
import ImagePreview from "../elements/ImagePreview";
import ShapePreview from "../elements/ShapePreview";
import ChartPreview from "../elements/ChartPreview";
import SpacerPreview from "../elements/SpacerPreview";
import RepeatingSectionPreview from "../elements/RepeatingSectionPreview";
import { LayoutTemplate } from "lucide-react";

function PageCanvasImpl({ page, state, dispatch, pagePixelWidth }: {
  page: PageDefinition;
  state: EditorState;
  dispatch: React.Dispatch<EditorAction>;
  pagePixelWidth: number;
}) {
  const pxPerMm = useMemo(() => pagePixelWidth / state.template.pageSize.width, [pagePixelWidth, state.template.pageSize.width]);
  const pagePixelHeight = Math.round(state.template.pageSize.height * pxPerMm);
  const m = state.template.margins || { top: 15, right: 15, bottom: 15, left: 15 } as any;
  const padding = `${m.top * pxPerMm}px ${m.right * pxPerMm}px ${m.bottom * pxPerMm}px ${m.left * pxPerMm}px`;
  const gapPx = `${(page.gap ?? 4) * pxPerMm}px`;

  const deselect = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).dataset.clickable === '1') return;
    dispatch({ type: 'SELECT_ELEMENT', elementId: null });
  };

  const renderElement = (el: any, isSelected: boolean) => {
    const common = { pxPerMm } as any;
    // Use a permissive discriminant to accommodate editor-only element types (e.g., 'repeating_section')
    switch (el.type as any) {
      case 'text': return <TextPreview element={el} isSelected={isSelected} dispatch={dispatch} {...common} />;
      case 'cms_block': return <CmsBlockPreview element={el} dispatch={dispatch} />;
      case 'image': return <ImagePreview element={el} {...common} />;
      case 'shape': return <ShapePreview element={el} {...common} />;
      case 'chart': return <ChartPreview element={el} {...common} />;
      case 'spacer': return <SpacerPreview element={el} {...common} />;
      case 'page_break': return <div className="border-t-2 border-dashed border-slate-300 my-2 text-center text-[10px] text-slate-400">PAGE BREAK</div>;
      case 'repeating_section': return <RepeatingSectionPreview section={el} {...common} />;
      default: return <div>Unknown element</div>;
    }
  };

  return (
    <div className="shadow-md bg-white" style={{ width: pagePixelWidth, height: pagePixelHeight }} onClick={deselect}>
      <div
        className="h-full w-full relative"
        data-page-id={page.id}
        style={{
          padding,
          display: 'grid',
          gridTemplateColumns: page.gridColumns || '1fr',
          gap: gapPx,
          background: page.background?.type === 'solid' ? page.background.color : undefined,
        }}
      >
        {page.children.length === 0 && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-8">
            <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mb-4">
              <LayoutTemplate className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="text-base font-semibold text-slate-700 mb-2">
              Start building your report
            </h3>
            <p className="text-sm text-slate-500 max-w-sm mb-6 leading-relaxed">
              Click an element from the palette on the left to add it to this page. 
              Each element becomes a section of the final PDF report.
            </p>
            <div className="grid grid-cols-2 gap-3 text-left max-w-md">
              <div className="bg-slate-50 rounded-lg p-3">
                <p className="text-xs font-semibold text-slate-700 mb-1">📝 Text</p>
                <p className="text-xs text-slate-500">Static text, titles, or dynamic values like {"{{subject_name}}"}</p>
              </div>
              <div className="bg-slate-50 rounded-lg p-3">
                <p className="text-xs font-semibold text-slate-700 mb-1">📦 CMS Block</p>
                <p className="text-xs text-slate-500">Pulls personalised content based on the person's scores</p>
              </div>
              <div className="bg-slate-50 rounded-lg p-3">
                <p className="text-xs font-semibold text-slate-700 mb-1">📊 Chart</p>
                <p className="text-xs text-slate-500">Visual charts of domain scores, dimensions, or alignments</p>
              </div>
              <div className="bg-slate-50 rounded-lg p-3">
                <p className="text-xs font-semibold text-slate-700 mb-1">🔄 Repeating</p>
                <p className="text-xs text-slate-500">A section that repeats for each domain or dimension</p>
              </div>
            </div>
          </div>
        )}

        {page.children.map((child: any) => {
          const isSelected = state.selectedElementId === child.id;
          return (
            <ElementWrapper
              key={child.id}
              element={child}
              selected={isSelected}
              onSelect={() => dispatch({ type: 'SELECT_ELEMENT', elementId: child.id })}
              onRemove={(id) => dispatch({ type: 'REMOVE_ELEMENT', elementId: id })}
              dispatch={dispatch}
              pageId={page.id}
              zoom={state.zoom}
            >
              {renderElement(child, isSelected)}
            </ElementWrapper>
          );
        })}
      </div>
    </div>
  );
}

const PageCanvas = React.memo(PageCanvasImpl, (prev, next) => {
  return (
    prev.page === next.page &&
    prev.state.selectedElementId === next.state.selectedElementId &&
    prev.state.selectedPageId === next.state.selectedPageId &&
    prev.pagePixelWidth === next.pagePixelWidth &&
    prev.dispatch === next.dispatch
  );
});

export default PageCanvas;
