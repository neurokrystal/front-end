"use client";

import React, { useMemo, useRef, useState, useEffect } from "react";
import type { EditorAction, EditorState } from "../shared/useTemplateState";
import PageCanvas from "./PageCanvas";

export default function EditorCanvas({ state, dispatch }: { state: EditorState; dispatch: React.Dispatch<EditorAction> }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [containerWidth, setContainerWidth] = useState(0);

  useEffect(() => {
    const onResize = () => setContainerWidth(containerRef.current?.clientWidth || 0);
    onResize();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const pagePixelWidth = useMemo(() => {
    // Fit page within container with some padding, then apply zoom
    const target = Math.min(900, Math.max(400, containerWidth - 80));
    return Math.round(target * state.zoom);
  }, [containerWidth, state.zoom]);

  return (
    <div ref={containerRef} className="h-full overflow-auto">
      <div className="py-6 flex flex-col items-center gap-8">
        {state.template.pages.map((p) => (
          <PageCanvas key={p.id} page={p} state={state} dispatch={dispatch} pagePixelWidth={pagePixelWidth} />
        ))}
      </div>
    </div>
  );
}
