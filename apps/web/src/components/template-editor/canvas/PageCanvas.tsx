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

export default function PageCanvas({ page, state, dispatch, pagePixelWidth }: {
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

  const renderElement = (el: any) => {
    const common = { pxPerMm };
    switch (el.type as TemplateElement['type']) {
      case 'text': return <TextPreview element={el} {...common} />;
      case 'cms_block': return <CmsBlockPreview element={el} {...common} />;
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
        className="h-full w-full"
        style={{
          padding,
          display: 'grid',
          gridTemplateColumns: page.gridColumns || '1fr',
          gap: gapPx,
          background: page.background?.type === 'solid' ? page.background.color : undefined,
        }}
      >
        {page.children.map((child: any) => (
          <ElementWrapper key={child.id} element={child} selected={state.selectedElementId === child.id} onSelect={() => dispatch({ type: 'SELECT_ELEMENT', elementId: child.id })}>
            {renderElement(child)}
          </ElementWrapper>
        ))}
      </div>
    </div>
  );
}
