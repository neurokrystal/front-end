"use client";

import React, { useMemo, useRef, useState, useEffect } from "react";
import type { EditorAction, EditorState } from "../shared/useTemplateState";
import PageCanvas from "./PageCanvas";

function EditorCanvasImpl({ state, dispatch }: { state: EditorState; dispatch: React.Dispatch<EditorAction> }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [containerWidth, setContainerWidth] = useState(0);

  useEffect(() => {
    const onResize = () => setContainerWidth(containerRef.current?.clientWidth || 0);
    onResize();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // Base page width independent of zoom. Zoom is applied via CSS transform to avoid re-renders.
  const pagePixelWidth = useMemo(() => {
    const target = Math.min(900, Math.max(400, containerWidth - 80));
    return Math.round(target);
  }, [containerWidth]);

  return (
    <div ref={containerRef} className="h-full overflow-auto">
      <div className="py-6 flex flex-col items-center gap-8" style={{ transform: `scale(${state.zoom})`, transformOrigin: 'top center' }}>
        {state.template.pages.map((p) => (
          <PageCanvas key={p.id} page={p} state={state} dispatch={dispatch} pagePixelWidth={pagePixelWidth} />
        ))}
      </div>
    </div>
  );
}

const EditorCanvas = React.memo(EditorCanvasImpl);

export default EditorCanvas;
