'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Save,
  Loader2,
  Calendar,
  User,
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
} from 'lucide-react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import LinkExtension from '@tiptap/extension-link';
import ImageExtension from '@tiptap/extension-image';
import { News } from '@/types';

export default function AdminXwdtDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [item, setItem] = useState<News | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchItemDetail();
  }, [params.id]);

  const fetchItemDetail = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}/api/news/${params.id}`, {
        cache: 'no-store',
      });
      const json = await res.json();

      if (json.success && json.data) {
        setItem(json.data);
      } else {
        setError('新闻不存在');
      }
    } catch (error) {
      console.error('Error fetching news detail:', error);
      setError('加载失败');
    } finally {
      setLoading(false);
    }
  };

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
      if (item) {
        setItem({ ...item, context: editor.getHTML() });
      }
    },
  });

  // Sync editor content when item loads
  useEffect(() => {
    if (item && editor) {
      const currentContent = editor.getHTML();
      if (currentContent !== item.context) {
        editor.commands.setContent(item.context || '');
      }
    }
  }, [item, editor]);

  const handleSave = async () => {
    if (!item) return;

    setSaving(true);
    try {
      const res = await fetch(`/api/admin/xwdt/${item.newsId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item),
      });
      const json = await res.json();

      if (json.success) {
        alert('保存成功');
      } else {
        alert(json.error || '保存失败');
      }
    } catch (error) {
      alert('保存失败');
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

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 size={40} className="text-[#1779DC] animate-spin" />
          <p className="text-gray-500">加载中...</p>
        </div>
      </div>
    );
  }

  if (error || !item) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-500 mb-4">{error || '新闻不存在'}</p>
        <Link
          href="/admin/xwdt"
          className="inline-flex items-center gap-2 text-[#1779DC] hover:underline"
        >
          <ArrowLeft size={18} />
          返回列表
        </Link>
      </div>
    );
  }

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
            <h1 className="text-2xl font-bold text-gray-800">编辑工作动态</h1>
            <p className="text-gray-500 mt-1 flex items-center gap-2">
              <Calendar size={16} />
              {item.createat?.split(' ')[0]}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href={`/news/${item.newsId}`}
            target="_blank"
            className="flex items-center gap-2 px-4 py-2 border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-xl transition-colors"
          >
            查看前台
          </Link>
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
            <p className="text-gray-500 text-sm">编辑工作动态的标题和内容</p>
          </div>
        </div>

        {/* Title */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">标题</label>
          <input
            type="text"
            value={item.title}
            onChange={(e) => setItem({ ...item, title: e.target.value })}
            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#1779DC] focus:border-transparent transition-all"
            placeholder="请输入标题"
          />
        </div>

        {/* Author */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">发布人</label>
          <div className="relative">
            <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={item.name || ''}
              onChange={(e) => setItem({ ...item, name: e.target.value })}
              className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#1779DC] focus:border-transparent transition-all"
              placeholder="请输入发布人"
            />
          </div>
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
          <h2 className="text-xl font-bold text-gray-800 mb-4">{item.title}</h2>
          <div className="text-sm text-gray-500 mb-4">
            发布人: {item.name || '-'} · {item.createat?.split(' ')[0]}
          </div>
          <div
            className="prose max-w-none text-gray-700"
            dangerouslySetInnerHTML={{ __html: item.context || '' }}
          />
        </div>
      </div>
    </div>
  );
}
