"use client";

import React, { useEffect, useRef, useState } from "react";

function debounce<F extends (...args: any[]) => void>(fn: F, wait: number) {
  let t: any;
  return (...args: Parameters<F>) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), wait);
  };
}

function renderWithTokens(text: string) {
  const parts = text.split(/(\{\{[^}]+\}\})/g);
  return parts.map((part, i) => {
    if (part.startsWith("{{") && part.endsWith("}}")) {
      return (
        <span key={i} className="inline-flex items-center px-1 py-0.5 text-[10px] rounded bg-amber-50 text-amber-800 border border-amber-200 mr-1">
          {part}
        </span>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

function TextPreviewImpl({ element, isSelected, dispatch }: { element: any; isSelected: boolean; dispatch: React.Dispatch<any> }) {
  const font = element.font || { family: 'Inter', size: 12, weight: '400', style: 'normal', lineHeight: 1.5, letterSpacing: 0, color: '#0f172a' };
  const [editing, setEditing] = useState(false);
  const editRef = useRef<HTMLDivElement>(null);

  const debouncedSync = useRef(
    debounce((text: string) => {
      dispatch({ type: 'UPDATE_ELEMENT', elementId: element.id, updates: { content: text } });
    }, 200)
  ).current;

  // Enter edit mode on double-click
  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditing(true);
  };

  // Focus the contentEditable after entering edit mode and place cursor at end
  useEffect(() => {
    if (editing && editRef.current) {
      editRef.current.focus();
      const range = document.createRange();
      const sel = window.getSelection();
      range.selectNodeContents(editRef.current);
      range.collapse(false);
      sel?.removeAllRanges();
      sel?.addRange(range);
    }
  }, [editing]);

  // Exit edit mode
  const handleBlur = () => {
    setEditing(false);
    if (editRef.current) {
      dispatch({ 
        type: 'UPDATE_ELEMENT', 
        elementId: element.id, 
        updates: { content: editRef.current.innerText } 
      });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      editRef.current?.blur();
    }
    // Prevent Delete/Backspace or other keys from bubbling to wrappers
    e.stopPropagation();
  };

  // Sync to side panel while typing (debounced)
  const handleInput = () => {
    if (editRef.current) {
      debouncedSync(editRef.current.innerText);
    }
  };

  if (editing) {
    return (
      <div
        ref={editRef}
        contentEditable
        suppressContentEditableWarning
        onBlur={handleBlur}
        onInput={handleInput}
        onKeyDown={handleKeyDown}
        onClick={(e) => e.stopPropagation()}
        className="outline-none min-h-[1.5em] cursor-text whitespace-pre-wrap break-words"
        style={{
          fontFamily: font.family,
          fontSize: `${font.size}px`,
          fontWeight: font.weight as any,
          fontStyle: font.style,
          lineHeight: font.lineHeight,
          letterSpacing: `${font.letterSpacing}em`,
          color: font.color,
          textAlign: element.textAlign || 'left',
          padding: element.padding ? `${element.padding.top}px ${element.padding.right}px ${element.padding.bottom}px ${element.padding.left}px` : undefined,
          boxShadow: 'inset 0 0 0 1px rgba(74, 144, 217, 0.3)',
          borderRadius: '2px',
        }}
        dangerouslySetInnerHTML={{ __html: element.content || '' }}
      />
    );
  }

  return (
    <div
      onDoubleClick={handleDoubleClick}
      className="cursor-text relative whitespace-pre-wrap break-words min-h-[1.5em]"
      style={{
        fontFamily: font.family,
        fontSize: `${font.size}px`,
        fontWeight: font.weight as any,
        fontStyle: font.style,
        lineHeight: font.lineHeight,
        letterSpacing: `${font.letterSpacing}em`,
        color: font.color,
        textAlign: element.textAlign || 'left',
        padding: element.padding ? `${element.padding.top}px ${element.padding.right}px ${element.padding.bottom}px ${element.padding.left}px` : undefined,
      }}
      title="Double-click to edit"
    >
      {element.content ? renderWithTokens(element.content) : (
        <span className="text-slate-300 italic text-sm">Double-click to edit...</span>
      )}
    </div>
  );
}

const TextPreview = React.memo(TextPreviewImpl, (prev, next) => {
  return prev.element === next.element && prev.isSelected === next.isSelected && prev.dispatch === next.dispatch;
});

export default TextPreview;
