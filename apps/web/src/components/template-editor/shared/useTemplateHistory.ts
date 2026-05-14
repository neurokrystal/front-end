"use client";

import { useCallback, useRef, useState } from "react";
import type { ReportTemplate } from "@dimensional/shared";

export function useTemplateHistory(initial: ReportTemplate, max = 50) {
  const [index, setIndex] = useState(0);
  const stackRef = useRef<ReportTemplate[]>([structuredClone(initial)]);

  const push = useCallback((snapshot: ReportTemplate) => {
    const stack = stackRef.current.slice(0, index + 1);
    stack.push(structuredClone(snapshot));
    if (stack.length > max) stack.shift();
    stackRef.current = stack;
    setIndex(stackRef.current.length - 1);
  }, [index, max]);

  const canUndo = index > 0;
  const canRedo = index < stackRef.current.length - 1;

  const undo = useCallback(() => {
    if (index === 0) return stackRef.current[0];
    const next = index - 1;
    setIndex(next);
    return structuredClone(stackRef.current[next]);
  }, [index]);

  const redo = useCallback(() => {
    if (index >= stackRef.current.length - 1) return stackRef.current[index];
    const next = index + 1;
    setIndex(next);
    return structuredClone(stackRef.current[next]);
  }, [index]);

  const current = () => structuredClone(stackRef.current[index]);

  return { push, undo, redo, canUndo, canRedo, current, index } as const;
}
