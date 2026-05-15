### Template Editor Performance Fixes and Findings

#### 1) Drag-drop snap-back — root cause and fix
- Cause
  - Dragging previously relied on visual movement without committing the new order to state until the interaction completed, and sometimes dispatched mid-drag updates that clashed with React re-renders. When React re-rendered, the element re-mounted at its original index, appearing to “snap back.”
- Fix
  - Implemented a dedicated drag hook that performs DOM-only visual feedback during drag and commits a single `MOVE_ELEMENT` on mouseup:
    - File: `apps/web/src/components/template-editor/elements/useElementDrag.ts`
    - Behavior: creates a lightweight clone that follows the cursor; the original stays dimmed. No reducer dispatch occurs during mousemove. On mouseup, we compute the target index and dispatch one `MOVE_ELEMENT` to persist the new order.
  - Result: The list order is stable after drop; no snap-back.

#### 2) UI lag during resize and interactions — diagnostics and fixes

Check A: Continuous UPDATE_ELEMENT dispatches (mousemove/onInput)
- Finding
  - Inline text editing dispatched `UPDATE_ELEMENT` on every keystroke via `onInput`, causing frequent reducer runs and expensive renders.
    - File: `elements/TextPreview.tsx`
- Fix
  - Debounced typing with a 300ms timer and commit-on-blur to flush the final value.
  - Only a single dispatch occurs after a short pause or on blur.

Check B: Full-editor re-renders
- Finding
  - Expensive containers (canvas, palette, property panel, page navigator) re-rendered on unrelated state changes.
- Fix
  - Wrapped heavy components with `React.memo`:
    - `canvas/EditorCanvas.tsx`
    - `canvas/PageCanvas.tsx` (custom comparator keeps renders focused on the active page/selection)
    - `ElementPalette.tsx`
    - `properties/PropertyPanel.tsx`
    - `PageNavigator.tsx`

Check C: Per-element re-renders when not needed
- Finding
  - Element previews re-rendered when unrelated elements changed.
- Fix
  - Added `React.memo` + prop comparators on element previews:
    - `elements/TextPreview.tsx`
    - `elements/CmsBlockPreview.tsx`
  - Elements now re-render only when their own data or selection state changes.

Check D: Zoom-induced churn
- Finding
  - Zoom previously affected computed widths, encouraging more layout/paint and child re-renders.
- Fix
  - Applied CSS transform on a canvas wrapper instead of recalculating child widths:
    - File: `canvas/EditorCanvas.tsx`
    - Layout now uses a base page width; `style={{ transform: \
      `scale(${zoom})`, transformOrigin: 'top center' }}` on the wrapper.
  - Toolbar uses click buttons (no slider), so there is no continuous `SET_ZOOM` dispatch.

Check E: Dev tools verification (how to measure)
- Quick instrumentation (optional):
  - Add temporarily:
    - In `TemplateEditor.tsx`: `console.log('TemplateEditor RENDER')`
    - In `canvas/EditorCanvas.tsx`: `console.log('EditorCanvas RENDER')`
    - In each ElementPreview: `console.log('ElementPreview RENDER', element.id)`
  - Resize an element or drag-drop one. Expect no logs during the drag, one batch on release.

#### 3) Before/after re-render counts during a resize drag
- Before
  - Text typing: re-render storms on every keystroke (continuous `UPDATE_ELEMENT`).
  - Resize/drag: parent components could re-render more often than necessary depending on state changes.
- After
  - Resize: 0 reducer dispatches during mousemove; 1 `UPDATE_ELEMENT` on mouseup (final size). Expected logs: 0 during drag, 1 batch on release.
  - Drag-drop: 0 reducer dispatches during mousemove; 1 `MOVE_ELEMENT` on mouseup. Expected logs: 0 during drag, 1 batch on drop.
  - Text typing: debounced to at most ~3–4 dispatches per second while typing quickly; 1 final dispatch on blur.

Suggested verification steps
1) Start profiling (React DevTools) or enable the temporary console logs noted above.
2) Drag an element up/down within the page for ~2 seconds, then release.
   - Expect 0 renders during movement; a single commit on release.
3) Resize an element by its handle for ~2 seconds, then release.
   - Expect 0 renders during movement; a single commit on release.
4) Type in a text element for ~2 seconds.
   - Expect at most a few debounced updates (not on each keystroke) and one final update on blur.

#### 4) Confirmation and current status
- Drag-drop now persists:
  - New order is committed via a single `MOVE_ELEMENT` on mouseup; no snap-back observed with the new flow.
- Resize is smooth:
  - DOM is manipulated directly during mousemove for visual feedback; only one `UPDATE_ELEMENT` is dispatched on mouseup to persist size.
- Typing is responsive:
  - Debounced updates eliminate reducer thrash while editing inline text.

---

Files updated in this change set (summary)
- `elements/TextPreview.tsx`: Debounced input; `React.memo` with comparator.
- `elements/CmsBlockPreview.tsx`: `React.memo` with comparator.
- `canvas/EditorCanvas.tsx`: Zoom via CSS transform; `React.memo`.
- `canvas/PageCanvas.tsx`: `React.memo` with comparator.
- `ElementPalette.tsx`: `React.memo`.
- `properties/PropertyPanel.tsx`: `React.memo`.

Notes
- If additional previews exist (e.g., `ImagePreview`, `ShapePreview`, etc.), consider wrapping them in `React.memo` with a comparator like the `TextPreview` pattern so each re-renders only when its own props change.

---

### May 2026 — Absolute Positioning, Delete Button Restyle, and Inline Editing

Issue 1: No X/Y Position Controls — Elements Can't Be Freely Positioned
- What changed
  - Added a Position Mode toggle (Grid vs Free) to the Layout section for text elements.
    - File: `properties/PropertyPanel.tsx`
    - In Free (absolute) mode, X/Y (mm) inputs appear and update `absoluteX`/`absoluteY`.
  - Elements render absolutely when `position === 'absolute'` with `left/top` in millimetres.
    - File: `elements/ElementWrapper.tsx` (adds `left/top` mm styles; keeps width/height)
  - Dragging absolute-positioned elements updates X/Y instead of reordering.
    - File: `elements/useElementDrag.ts`
    - Computes `dx/dy` adjusted for `zoom`; converts px→mm via `0.2646` and rounds to 0.1mm.
  - New elements default to absolute at (20mm, 20mm).
    - File: `TemplateEditor.tsx`
- How to verify
  1) Select element → Layout shows Grid/Free toggle.
  2) Switch to Free → X/Y inputs appear, element becomes absolutely positioned.
  3) Drag element → it stays where dropped; X/Y updates live.

Issue 2: Red X Delete Button — Restyle
- What changed
  - Replaced permanent red circle with subtle white circle + trash icon that turns red on hover.
    - File: `elements/ElementWrapper.tsx`
    - Uses `lucide-react` `Trash2` icon; hover classes match spec.
- How to verify
  - Select an element → white circular delete button appears; hover turns light red with red icon.

Issue 3: Inline Editing Isn't Working
- What changed
  - Implemented reliable inline editing on double-click for text elements.
    - File: `elements/TextPreview.tsx`
    - Double-click enters `contentEditable` mode, focuses, and places caret at end.
    - Debounced syncing to reducer while typing; final commit on blur.
    - Escape exits edit mode; key events stop propagation to avoid accidental element deletion.
    - While editing, drag is disabled via `[contenteditable]` guard in `useElementDrag`.
- How to verify
  1) Double-click text → caret shows on canvas, edit in place.
  2) Typing on canvas updates the side panel Content (debounced, real-time feel).
  3) Editing within side panel updates canvas immediately (both read from reducer state).
  4) Press Escape → exits edit mode.
