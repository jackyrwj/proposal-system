'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Save,
  Loader2,
  Newspaper,
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Quote,
  Code,
  Link as LinkIcon,
  Image,
  Undo,
  Redo,
  Type,
} from 'lucide-react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import LinkExtension from '@tiptap/extension-link';
import ImageExtension from '@tiptap/extension-image';

export default function NewXwdtPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    name: '',
    context: '',
  });

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
      LinkExtension.configure({
        openOnClick: false,
      }),
      ImageExtension,
    ],
    content: '',
    onUpdate: ({ editor }) => {
      setFormData({ ...formData, context: editor.getHTML() });
    },
  });

  const handleSave = async () => {
    if (!formData.title.trim()) {
      alert('请输入标题');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/admin/xwdt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const json = await res.json();

      if (json.success) {
        alert('创建成功');
        router.push('/admin/xwdt');
      } else {
        alert(json.error || '创建失败');
      }
    } catch (error) {
      alert('创建失败');
    } finally {
      setSaving(false);
    }
  };

  const ToolbarButton = ({
    onClick,
    active,
    children,
    title,
  }: {
    onClick: () => void;
    active?: boolean;
    children: React.ReactNode;
    title?: string;
  }) => (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`p-2 rounded-lg transition-colors ${
        active
          ? 'bg-[#1779DC] text-white'
          : 'text-gray-600 hover:bg-gray-100'
      }`}
    >
      {children}
    </button>
  );

  const addImage = () => {
    const url = prompt('请输入图片 URL');
    if (url) {
      editor?.chain().focus().setImage({ src: url }).run();
    }
  };

  const addLink = () => {
    const url = prompt('请输入链接 URL');
    if (url) {
      editor?.chain().focus().setLink({ href: url }).run();
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/admin/xwdt"
            className="p-2 rounded-xl hover:bg-gray-100 transition-colors"
          >
            <ArrowLeft size={20} className="text-gray-600" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-800">新建工作动态</h1>
            <p className="text-gray-500 mt-1">发布新的工作动态</p>
          </div>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#1779DC] to-[#2861AE] hover:shadow-lg text-white rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? (
            <Loader2 size={18} className="animate-spin" />
          ) : (
            <Save size={18} />
          )}
          保存
        </button>
      </div>

      {/* Form */}
      <div className="bg-white rounded-2xl shadow-sm p-6 space-y-6">
        {/* Icon */}
        <div className="flex items-center gap-4 pb-6 border-b border-gray-100">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center">
            <Newspaper size={32} className="text-white" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-800">工作动态信息</h2>
            <p className="text-gray-500 text-sm">填写工作动态的标题和内容</p>
          </div>
        </div>

        {/* Title */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">标题</label>
          <input
            type="text"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#1779DC] focus:border-transparent transition-all"
            placeholder="请输入标题"
          />
        </div>

        {/* Author */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">发布人</label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#1779DC] focus:border-transparent transition-all"
            placeholder="请输入发布人"
          />
        </div>

        {/* Content */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">内容</label>
          <div className="tiptap-editor border border-gray-200 rounded-xl overflow-hidden">
            {/* Toolbar */}
            {editor && (
              <div className="flex flex-wrap items-center gap-1 p-2 bg-gray-50 border-b border-gray-200">
                <ToolbarButton
                  onClick={() => editor.chain().focus().undo().run()}
                  title="撤销"
                >
                  <Undo size={16} />
                </ToolbarButton>
                <ToolbarButton
                  onClick={() => editor.chain().focus().redo().run()}
                  title="重做"
                >
                  <Redo size={16} />
                </ToolbarButton>
                <div className="w-px h-6 bg-gray-300 mx-1" />
                <ToolbarButton
                  onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
                  active={editor.isActive('heading', { level: 1 })}
                  title="标题1"
                >
                  <Heading1 size={16} />
                </ToolbarButton>
                <ToolbarButton
                  onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                  active={editor.isActive('heading', { level: 2 })}
                  title="标题2"
                >
                  <Heading2 size={16} />
                </ToolbarButton>
                <ToolbarButton
                  onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
                  active={editor.isActive('heading', { level: 3 })}
                  title="标题3"
                >
                  <Heading3 size={16} />
                </ToolbarButton>
                <div className="w-px h-6 bg-gray-300 mx-1" />
                <ToolbarButton
                  onClick={() => editor.chain().focus().toggleBold().run()}
                  active={editor.isActive('bold')}
                  title="粗体"
                >
                  <Bold size={16} />
                </ToolbarButton>
                <ToolbarButton
                  onClick={() => editor.chain().focus().toggleItalic().run()}
                  active={editor.isActive('italic')}
                  title="斜体"
                >
                  <Italic size={16} />
                </ToolbarButton>
                <ToolbarButton
                  onClick={() => editor.chain().focus().toggleStrike().run()}
                  active={editor.isActive('strike')}
                  title="删除线"
                >
                  <Strikethrough size={16} />
                </ToolbarButton>
                <ToolbarButton
                  onClick={() => editor.chain().focus().toggleUnderline().run()}
                  active={editor.isActive('underline')}
                  title="下划线"
                >
                  <Underline size={16} />
                </ToolbarButton>
                <div className="w-px h-6 bg-gray-300 mx-1" />
                <ToolbarButton
                  onClick={() => editor.chain().focus().toggleBulletList().run()}
                  active={editor.isActive('bulletList')}
                  title="无序列表"
                >
                  <List size={16} />
                </ToolbarButton>
                <ToolbarButton
                  onClick={() => editor.chain().focus().toggleOrderedList().run()}
                  active={editor.isActive('orderedList')}
                  title="有序列表"
                >
                  <ListOrdered size={16} />
                </ToolbarButton>
                <div className="w-px h-6 bg-gray-300 mx-1" />
                {/* 对齐按钮暂时移除 - API 问题 */}
                <div className="w-px h-6 bg-gray-300 mx-1" />
                <div className="w-px h-6 bg-gray-300 mx-1" />
                <div className="w-px h-6 bg-gray-300 mx-1" />
                <div className="w-px h-6 bg-gray-300 mx-1" />
                <ToolbarButton
                  onClick={() => editor.chain().focus().toggleBlockquote().run()}
                  active={editor.isActive('blockquote')}
                  title="引用"
                >
                  <Quote size={16} />
                </ToolbarButton>
                <ToolbarButton
                  onClick={() => editor.chain().focus().toggleCodeBlock().run()}
                  active={editor.isActive('codeBlock')}
                  title="代码块"
                >
                  <Code size={16} />
                </ToolbarButton>
                <ToolbarButton onClick={addLink} title="添加链接">
                  <LinkIcon size={16} />
                </ToolbarButton>
                <ToolbarButton onClick={addImage} title="添加图片">
                  <Image size={16} />
                </ToolbarButton>
              </div>
            )}
            <EditorContent
              editor={editor}
              className="prose-editor-content min-h-[250px] p-4 focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* Preview */}
      <div className="bg-white rounded-2xl shadow-sm p-6">
        <h3 className="text-lg font-bold text-gray-800 mb-4">预览</h3>
        <div className="border border-gray-200 rounded-xl p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">{formData.title || '标题预览'}</h2>
          <div className="text-sm text-gray-500 mb-4">
            发布人: {formData.name || '-'}
          </div>
          <div
            className="prose max-w-none text-gray-700"
            dangerouslySetInnerHTML={{ __html: formData.context || '<p style="color:#999;">内容预览...</p>' }}
          />
        </div>
      </div>
    </div>
  );
}
