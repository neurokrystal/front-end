"use client";

import { useReducer } from "react";
import type { ReportTemplate, TemplateElement, PageDefinition } from "@dimensional/shared";

export interface EditorState {
  template: ReportTemplate;
  selectedElementId: string | null;
  selectedPageId: string;
  isDirty: boolean;
  zoom: number;
}

export type EditorAction =
  | { type: 'ADD_ELEMENT'; pageId: string; element: TemplateElement }
  | { type: 'UPDATE_ELEMENT'; elementId: string; updates: Partial<TemplateElement> }
  | { type: 'REMOVE_ELEMENT'; elementId: string }
  | { type: 'SELECT_ELEMENT'; elementId: string | null }
  | { type: 'ADD_PAGE'; page: PageDefinition }
  | { type: 'UPDATE_PAGE'; pageId: string; updates: Partial<PageDefinition> }
  | { type: 'REMOVE_PAGE'; pageId: string }
  | { type: 'REORDER_PAGES'; fromIndex: number; toIndex: number }
  | { type: 'SELECT_PAGE'; pageId: string }
  | { type: 'SET_ZOOM'; zoom: number }
  | { type: 'LOAD_TEMPLATE'; template: ReportTemplate }
  | { type: 'MARK_SAVED' };

function updateElementInPages(pages: PageDefinition[], elementId: string, updates: Partial<TemplateElement>): PageDefinition[] {
  return pages.map((p) => ({
    ...p,
    children: p.children.map((child: any) =>
      child && child.id === elementId ? { ...child, ...updates } : child
    ),
  }));
}

function removeElementFromPages(pages: PageDefinition[], elementId: string): PageDefinition[] {
  return pages.map((p) => ({
    ...p,
    children: p.children.filter((child: any) => child?.id !== elementId),
  }));
}

export function editorReducer(state: EditorState, action: EditorAction): EditorState {
  switch (action.type) {
    case 'LOAD_TEMPLATE': {
      const firstPageId = action.template.pages[0]?.id;
      return {
        template: action.template,
        selectedElementId: null,
        selectedPageId: firstPageId,
        isDirty: false,
        zoom: state.zoom ?? 1,
      } as EditorState;
    }
    case 'ADD_ELEMENT': {
      const pages = state.template.pages.map((p) =>
        p.id === action.pageId ? { ...p, children: [...p.children, action.element] } : p
      );
      return { ...state, template: { ...state.template, pages }, isDirty: true, selectedElementId: action.element.id };
    }
    case 'UPDATE_ELEMENT': {
      const pages = updateElementInPages(state.template.pages, action.elementId, action.updates);
      return { ...state, template: { ...state.template, pages }, isDirty: true };
    }
    case 'REMOVE_ELEMENT': {
      const pages = removeElementFromPages(state.template.pages, action.elementId);
      const selectedElementId = state.selectedElementId === action.elementId ? null : state.selectedElementId;
      return { ...state, template: { ...state.template, pages }, isDirty: true, selectedElementId };
    }
    case 'SELECT_ELEMENT': {
      return { ...state, selectedElementId: action.elementId };
    }
    case 'ADD_PAGE': {
      return {
        ...state,
        template: { ...state.template, pages: [...state.template.pages, action.page] },
        selectedPageId: action.page.id,
        isDirty: true,
      };
    }
    case 'UPDATE_PAGE': {
      const pages = state.template.pages.map((p) => (p.id === action.pageId ? { ...p, ...action.updates } : p));
      return { ...state, template: { ...state.template, pages }, isDirty: true };
    }
    case 'REMOVE_PAGE': {
      const pages = state.template.pages.filter((p) => p.id !== action.pageId);
      const selectedPageId = state.selectedPageId === action.pageId ? pages[0]?.id || '' : state.selectedPageId;
      return { ...state, template: { ...state.template, pages }, selectedPageId, isDirty: true };
    }
    case 'REORDER_PAGES': {
      const pages = [...state.template.pages];
      const [moved] = pages.splice(action.fromIndex, 1);
      pages.splice(action.toIndex, 0, moved);
      return { ...state, template: { ...state.template, pages }, isDirty: true };
    }
    case 'SELECT_PAGE': {
      return { ...state, selectedPageId: action.pageId, selectedElementId: null };
    }
    case 'SET_ZOOM': {
      return { ...state, zoom: action.zoom };
    }
    case 'MARK_SAVED': {
      return { ...state, isDirty: false };
    }
    default:
      return state;
  }
}

export function useTemplateState(initial: ReportTemplate) {
  const firstPageId = initial.pages[0]?.id;
  const [state, dispatch] = useReducer(editorReducer, {
    template: initial,
    selectedElementId: null,
    selectedPageId: firstPageId,
    isDirty: false,
    zoom: 1,
  } as EditorState);
  return { state, dispatch } as const;
}
