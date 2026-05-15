'use client';

import React, { useEffect, useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import CharacterCount from '@tiptap/extension-character-count';

interface RichTextEditorProps {
  content: string;          // HTML string
  onChange: (html: string) => void;
  placeholder?: string;
}

export function RichTextEditor({ content, onChange, placeholder }: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder: placeholder || 'Start writing...' }),
      CharacterCount,
    ],
    content,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none focus:outline-none min-h-[200px] px-4 py-3',
      },
    },
  });

  // Sync external content changes (e.g., when loading a different block)
  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content || '');
    }
  }, [content, editor]);

  const [showVarMenu, setShowVarMenu] = useState(false);

  if (!editor) return null;

  return (
    <div className="border border-slate-200 rounded-lg overflow-hidden bg-white">
      {/* Toolbar */}
      <div className="border-b border-slate-200 px-2 py-1.5 flex gap-0.5 flex-wrap bg-slate-50">
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBold().run()}
          active={editor.isActive('bold')}
          title="Bold"
        >
          <strong>B</strong>
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleItalic().run()}
          active={editor.isActive('italic')}
          title="Italic"
        >
          <em>I</em>
        </ToolbarButton>
        <div className="w-px bg-slate-200 mx-1" />
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          active={editor.isActive('heading', { level: 3 })}
          title="Heading 3"
        >
          H3
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 4 }).run()}
          active={editor.isActive('heading', { level: 4 })}
          title="Heading 4"
        >
          H4
        </ToolbarButton>
        <div className="w-px bg-slate-200 mx-1" />
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          active={editor.isActive('bulletList')}
          title="Bullet List"
        >
          • List
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          active={editor.isActive('orderedList')}
          title="Numbered List"
        >
          1. List
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          active={editor.isActive('blockquote')}
          title="Quote"
        >
          " Quote
        </ToolbarButton>
        <div className="w-px bg-slate-200 mx-1" />
        <ToolbarButton
          onClick={() => editor.chain().focus().undo().run()}
          title="Undo"
        >
          ↩
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().redo().run()}
          title="Redo"
        >
          ↪
        </ToolbarButton>

        {/* Insert Variable */}
        <div className="relative">
          <ToolbarButton onClick={() => setShowVarMenu((s) => !s)} title="Insert Variable">
            {'{{ }}'}
          </ToolbarButton>
          {showVarMenu && (
            <div className="absolute top-full left-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg py-1 z-50 w-56">
              <p className="px-3 py-1 text-[10px] font-semibold text-slate-400 uppercase">Variables</p>
              {[
                { label: 'Subject Name', value: '{{subject_name}}' },
                { label: 'Domain Name', value: '{{domain_name}}' },
                { label: 'Band Name', value: '{{band_name}}' },
                { label: 'Dimension Name', value: '{{dimension_name}}' },
                { label: 'Report Date', value: '{{report_date}}' },
              ].map(v => (
                <button
                  key={v.value}
                  onClick={() => {
                    editor.chain().focus().insertContent(v.value).run();
                    setShowVarMenu(false);
                  }}
                  className="w-full text-left px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50 flex justify-between"
                >
                  <span>{v.label}</span>
                  <span className="text-xs text-slate-400 font-mono">{v.value}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Editor */}
      <EditorContent editor={editor} />

      {/* Footer — word count */}
      <div className="border-t border-slate-100 px-4 py-1.5 text-xs text-slate-400 flex justify-between">
        <span>{(editor.storage.characterCount as any)?.words?.() ?? 0} words</span>
        <span>{(editor.storage.characterCount as any)?.characters?.() ?? 0} characters</span>
      </div>
    </div>
  );
}

function ToolbarButton({ onClick, active, title, children }: {
  onClick: () => void; active?: boolean; title: string; children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      type="button"
      className={`px-2 py-1 text-xs font-medium rounded transition-colors ${
        active
          ? 'bg-blue-100 text-blue-700'
          : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
      }`}
    >
      {children}
    </button>
  );
}

export default RichTextEditor;
