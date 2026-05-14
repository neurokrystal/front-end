"use client";

import { useCallback } from "react";

// Smooth, direct-DOM resize during drag; commit to state on mouseup only
export function useElementResize(
  elementId: string,
  dispatch: React.Dispatch<any>,
  zoom: number
) {
  const startResize = useCallback(
    (e: React.MouseEvent, direction: string) => {
      e.stopPropagation();
      e.preventDefault();

      const element = document.getElementById(`element-${elementId}`);
      if (!element) return;

      const rect = element.getBoundingClientRect();
      const startX = (e as any).clientX as number;
      const startY = (e as any).clientY as number;
      const startWidth = rect.width;
      const startHeight = rect.height;

      const handleMouseMove = (moveEvent: MouseEvent) => {
        moveEvent.preventDefault();
        const dx = (moveEvent.clientX - startX) / (zoom || 1);
        const dy = (moveEvent.clientY - startY) / (zoom || 1);

        let newWidth = startWidth / (zoom || 1);
        let newHeight = startHeight / (zoom || 1);

        if (direction.includes("e")) newWidth = startWidth / (zoom || 1) + dx;
        if (direction.includes("w")) newWidth = startWidth / (zoom || 1) - dx;
        if (direction.includes("s")) newHeight = startHeight / (zoom || 1) + dy;
        if (direction.includes("n")) newHeight = startHeight / (zoom || 1) - dy;

        newWidth = Math.max(40, newWidth);
        newHeight = Math.max(20, newHeight);

        // Direct DOM manipulation — no React re-render
        element.style.width = `${Math.round(newWidth)}px`;
        element.style.height = `${Math.round(newHeight)}px`;
      };

      const handleMouseUp = () => {
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
        document.body.style.cursor = "";
        document.body.style.userSelect = "";

        // Commit final size once
        const finalRect = element.getBoundingClientRect();
        dispatch({
          type: "UPDATE_ELEMENT",
          elementId,
          updates: {
            width: `${Math.round(finalRect.width / (zoom || 1))}px`,
            height: `${Math.round(finalRect.height / (zoom || 1))}px`,
          },
        });
      };

      document.body.style.cursor = `${direction}-resize`;
      document.body.style.userSelect = "none";
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    },
    [elementId, dispatch, zoom]
  );

  return { startResize } as const;
}
