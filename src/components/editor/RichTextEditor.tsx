// src/components/editor/RichTextEditor.tsx
'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import {
  Bold,
  Italic,
  List,
  ListOrdered,
  Heading2,
  Code,
  Quote,
  Undo,
  Redo,
} from 'lucide-react';
import { useEffect, useState } from 'react';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  height?: string;
}

export default function RichTextEditor({ 
  value, 
  onChange, 
  placeholder = '开始输入内容...',
  height = '300px'
}: RichTextEditorProps) {
  const [mounted, setMounted] = useState(false); // 添加状态

  useEffect(() => {
    setMounted(true);
  }, []);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder,
      }),
    ],
    content: mounted ? value : '', // 只在客户端设置内容
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none focus:outline-none min-h-[200px] p-4',
      },
    },
    immediatelyRender: false, // 关键修复
  }, [mounted]); // 添加依赖

  if (!mounted) {
    return (
      <div className="border border-gray-300 rounded-xl overflow-hidden bg-white" style={{ height }}>
        <div className="border-b border-gray-300 bg-gray-50 px-4 py-3">
          <div className="flex items-center gap-2">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="w-8 h-8 bg-gray-200 rounded animate-pulse"></div>
            ))}
          </div>
        </div>
        <div className="p-4 bg-gray-50 animate-pulse" style={{ height: 'calc(100% - 57px)' }}></div>
      </div>
    );
  }

  if (!editor) {
    return null;
  }

  return (
    <div className="border border-gray-300 rounded-xl overflow-hidden bg-white">
      {/* 工具栏 */}
      <div className="border-b border-gray-300 bg-gray-50 px-4 py-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={`p-2 rounded hover:bg-gray-200 transition-colors ${
            editor.isActive('bold') ? 'bg-gray-200 text-gray-900' : 'text-gray-600'
          }`}
          title="加粗"
        >
          <Bold className="w-4 h-4" />
        </button>
        
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={`p-2 rounded hover:bg-gray-200 transition-colors ${
            editor.isActive('italic') ? 'bg-gray-200 text-gray-900' : 'text-gray-600'
          }`}
          title="斜体"
        >
          <Italic className="w-4 h-4" />
        </button>
        
        <div className="w-px h-6 bg-gray-300 mx-1"></div>
        
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          className={`p-2 rounded hover:bg-gray-200 transition-colors ${
            editor.isActive('heading', { level: 2 }) ? 'bg-gray-200 text-gray-900' : 'text-gray-600'
          }`}
          title="标题"
        >
          <Heading2 className="w-4 h-4" />
        </button>
        
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={`p-2 rounded hover:bg-gray-200 transition-colors ${
            editor.isActive('bulletList') ? 'bg-gray-200 text-gray-900' : 'text-gray-600'
          }`}
          title="无序列表"
        >
          <List className="w-4 h-4" />
        </button>
        
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={`p-2 rounded hover:bg-gray-200 transition-colors ${
            editor.isActive('orderedList') ? 'bg-gray-200 text-gray-900' : 'text-gray-600'
          }`}
          title="有序列表"
        >
          <ListOrdered className="w-4 h-4" />
        </button>
        
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          className={`p-2 rounded hover:bg-gray-200 transition-colors ${
            editor.isActive('blockquote') ? 'bg-gray-200 text-gray-900' : 'text-gray-600'
          }`}
          title="引用"
        >
          <Quote className="w-4 h-4" />
        </button>
        
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleCode().run()}
          className={`p-2 rounded hover:bg-gray-200 transition-colors ${
            editor.isActive('code') ? 'bg-gray-200 text-gray-900' : 'text-gray-600'
          }`}
          title="代码"
        >
          <Code className="w-4 h-4" />
        </button>
        
        <div className="w-px h-6 bg-gray-300 mx-1"></div>
        
        <button
          type="button"
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
          className="p-2 rounded hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-gray-600"
          title="撤销"
        >
          <Undo className="w-4 h-4" />
        </button>
        
        <button
          type="button"
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
          className="p-2 rounded hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-gray-600"
          title="重做"
        >
          <Redo className="w-4 h-4" />
        </button>
      </div>
      
      {/* 编辑器内容 */}
      <div style={{ height }}>
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}