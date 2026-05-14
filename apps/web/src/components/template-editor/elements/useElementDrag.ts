"use client";

import { useCallback, useRef } from "react";

export function useElementDrag(
  element: any,
  pageId: string,
  dispatch: React.Dispatch<any>,
  zoom: number
) {
  const dragRef = useRef<{
    startX: number;
    startY: number;
    clone: HTMLElement | null;
    dragStarted: boolean;
  } | null>(null);

  const startDrag = useCallback(
    (e: React.MouseEvent) => {
      const target = e.target as HTMLElement;
      // Don't start drag if clicking a resize handle or in edit mode
      if (target.closest('[data-resize-handle]')) return;
      if (target.closest('[contenteditable]')) return;

      e.preventDefault();

      const elementNode = document.getElementById(`element-${element.id}`);
      if (!elementNode) return;

      dragRef.current = {
        startX: (e as any).clientX,
        startY: (e as any).clientY,
        clone: null,
        dragStarted: false,
      };

      const handleMouseMove = (moveEvent: MouseEvent) => {
        if (!dragRef.current) return;

        const dx = moveEvent.clientX - dragRef.current.startX;
        const dy = moveEvent.clientY - dragRef.current.startY;

        // Start only after slight movement to avoid accidental drags
        if (!dragRef.current.dragStarted && Math.abs(dx) + Math.abs(dy) < 5) return;

        if (!dragRef.current.dragStarted) {
          dragRef.current.dragStarted = true;

          // Create a semi-transparent clone that follows the cursor
          const clone = elementNode.cloneNode(true) as HTMLElement;
          const rect = elementNode.getBoundingClientRect();
          clone.style.position = 'fixed';
          clone.style.pointerEvents = 'none';
          clone.style.opacity = '0.7';
          clone.style.zIndex = '9999';
          clone.style.width = `${rect.width}px`;
          clone.style.height = `${rect.height}px`;
          clone.style.transform = 'rotate(1deg)';
          clone.style.boxShadow = '0 8px 25px rgba(0,0,0,0.15)';
          clone.style.left = `${moveEvent.clientX - 20}px`;
          clone.style.top = `${moveEvent.clientY - 20}px`;
          document.body.appendChild(clone);
          dragRef.current.clone = clone;

          // Dim the original
          elementNode.style.opacity = '0.3';

          document.body.style.cursor = 'grabbing';
          document.body.style.userSelect = 'none';
        }

        // Move the clone with the cursor
        if (dragRef.current.clone) {
          dragRef.current.clone.style.left = `${moveEvent.clientX - 20}px`;
          dragRef.current.clone.style.top = `${moveEvent.clientY - 20}px`;
        }

        // Show drop indicator between elements in the same page
        const canvasElements = document.querySelectorAll(
          `[data-page-id="${pageId}"] [data-element-id]`
        );
        canvasElements.forEach((el) => {
          el.classList.remove('drop-indicator-above', 'drop-indicator-below');
        });

        if (element.position !== 'absolute') {
          for (const el of Array.from(canvasElements)) {
            const rect = (el as HTMLElement).getBoundingClientRect();
            const midY = rect.top + rect.height / 2;
            if (moveEvent.clientY < midY) {
              (el as HTMLElement).classList.add('drop-indicator-above');
              break;
            } else if (moveEvent.clientY >= midY && moveEvent.clientY < rect.bottom) {
              (el as HTMLElement).classList.add('drop-indicator-below');
              break;
            }
          }
        }
      };

      const handleMouseUp = (upEvent: MouseEvent) => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';

        // Clean up clone
        if (dragRef.current?.clone) {
          dragRef.current.clone.remove();
        }

        // Restore original opacity
        const original = document.getElementById(`element-${element.id}`);
        if (original) original.style.opacity = '';

        // Clean up drop indicators
        document.querySelectorAll('.drop-indicator-above, .drop-indicator-below').forEach((el) => {
          el.classList.remove('drop-indicator-above', 'drop-indicator-below');
        });

        if (!dragRef.current?.dragStarted) {
          dragRef.current = null;
          return;
        }

        if (element.position === 'absolute') {
          // Update X/Y based on drag offset, adjusted for zoom and converted px -> mm
          const dx = (upEvent.clientX - (dragRef.current?.startX || 0)) / zoom;
          const dy = (upEvent.clientY - (dragRef.current?.startY || 0)) / zoom;
          const pxToMm = 0.2646; // 1px ≈ 0.2646mm @96dpi
          const newX = Math.round((((element.absoluteX || 0) + dx * pxToMm)) * 10) / 10;
          const newY = Math.round((((element.absoluteY || 0) + dy * pxToMm)) * 10) / 10;
          dispatch({
            type: 'UPDATE_ELEMENT',
            elementId: element.id,
            updates: { absoluteX: newX, absoluteY: newY },
          } as any);
        } else {
          // Grid flow: reorder within page by drop position
          const canvasElements = document.querySelectorAll(
            `[data-page-id="${pageId}"] [data-element-id]`
          );
          let dropIndex = -1;
          for (let i = 0; i < canvasElements.length; i++) {
            const rect = (canvasElements[i] as HTMLElement).getBoundingClientRect();
            const midY = rect.top + rect.height / 2;
            if (upEvent.clientY < midY) {
              dropIndex = i;
              break;
            }
          }
          if (dropIndex === -1) dropIndex = canvasElements.length;

          dispatch({
            type: 'MOVE_ELEMENT',
            elementId: element.id,
            toPageId: pageId,
            toIndex: dropIndex,
          } as any);
        }

        dragRef.current = null;
      };

      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    },
    [element, pageId, dispatch, zoom]
  );

  return { startDrag } as const;
}
