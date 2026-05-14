"use client";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Save, Eye, Upload, Undo2, Redo2, ZoomIn, ZoomOut, ArrowLeft } from "lucide-react";

export default function EditorToolbar({
  title,
  onBack,
  savingState,
  onSave,
  onPreview,
  onPublish,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  zoom,
  setZoom,
}: {
  title: string;
  onBack?: () => void;
  savingState: 'idle' | 'saving' | 'saved';
  onSave: () => void;
  onPreview: () => void;
  onPublish: () => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  zoom: number;
  setZoom: (z: number) => void;
}) {
  return (
    <div className="h-14 shrink-0 border-b bg-white px-3 flex items-center justify-between">
      <div className="flex items-center gap-2">
        {onBack && (
          <Button variant="ghost" size="icon" onClick={onBack} title="Back to list"><ArrowLeft className="h-5 w-5"/></Button>
        )}
        <div className="font-medium truncate max-w-[40vw]" title={title}>{title}</div>
      </div>
      <div className="flex items-center gap-2">
        <Button onClick={onSave}><Save className="mr-2 h-4 w-4"/>{savingState === 'saving' ? 'Saving…' : savingState === 'saved' ? 'Saved ✓' : 'Save'}</Button>
        <Button variant="secondary" onClick={onPreview}><Eye className="mr-2 h-4 w-4"/>Preview</Button>
        <Separator orientation="vertical" className="h-6" />
        <Button variant="outline" onClick={onPublish}><Upload className="mr-2 h-4 w-4"/>Publish</Button>
        <Separator orientation="vertical" className="h-6" />
        <Button variant="ghost" onClick={onUndo} disabled={!canUndo}><Undo2 className="mr-2 h-4 w-4"/>Undo</Button>
        <Button variant="ghost" onClick={onRedo} disabled={!canRedo}><Redo2 className="mr-2 h-4 w-4"/>Redo</Button>
        <Separator orientation="vertical" className="h-6" />
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={() => setZoom(Math.max(0.25, Math.round((zoom - 0.1) * 100) / 100))}><ZoomOut className="h-4 w-4"/></Button>
          <div className="w-16 text-center text-sm tabular-nums">{Math.round(zoom * 100)}%</div>
          <Button variant="ghost" size="icon" onClick={() => setZoom(Math.min(2, Math.round((zoom + 0.1) * 100) / 100))}><ZoomIn className="h-4 w-4"/></Button>
        </div>
      </div>
    </div>
  );
}
