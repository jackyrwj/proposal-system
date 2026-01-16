'use client';

import { useState, useEffect } from 'react';
import { X, Search, User, Users, ChevronLeft, ChevronRight } from 'lucide-react';

interface JdhMember {
  id: string;
  name: string;
  depart: string;
}

interface FyrSelectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (selected: Array<{ id: string; name: string; depart: string }>) => void;
  initialSelected?: Array<{ id: string; name: string; depart: string }>;
  excludeId?: string; // 排除的用户ID（用于排除提案人自己）
}

export default function FyrSelectModal({
  isOpen,
  onClose,
  onConfirm,
  initialSelected = [],
  excludeId
}: FyrSelectModalProps) {
  const [members, setMembers] = useState<JdhMember[]>([]);
  const [selectedMembers, setSelectedMembers] = useState<Array<{ id: string; name: string; depart: string }>>([]);
  const [keyword, setKeyword] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);

  // 初始化已选中的附议人
  useEffect(() => {
    if (isOpen) {
      setSelectedMembers(initialSelected);
    }
  }, [initialSelected, isOpen]);

  // 获取教代会成员列表
  useEffect(() => {
    if (!isOpen) return;

    const fetchMembers = async () => {
      setLoading(true);
      try {
        const url = `/api/jdhmd?page=${page}&pageSize=20${keyword ? `&keyword=${encodeURIComponent(keyword)}` : ''}`;
        const response = await fetch(url);
        const result = await response.json();

        if (result.success) {
          setMembers(result.data.list);
          setTotalPages(result.data.pagination.totalPages);
        }
      } catch (error) {
        console.error('获取教代会成员失败:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchMembers();
  }, [isOpen, page, keyword]);

  const selectedIds = new Set(selectedMembers.map(m => m.id));

  const handleToggleSelect = (member: JdhMember) => {
    if (selectedIds.has(member.id)) {
      setSelectedMembers(prev => prev.filter(m => m.id !== member.id));
    } else {
      setSelectedMembers(prev => [...prev, { id: member.id, name: member.name, depart: member.depart }]);
    }
  };

  const handleConfirm = () => {
    onConfirm(selectedMembers);
    onClose();
  };

  const handleSearch = (value: string) => {
    setKeyword(value);
    setPage(1);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#1779DC] to-[#2861AE] px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Users className="text-white" size={24} />
            <h3 className="text-xl font-bold text-white">选择附议人</h3>
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white transition-colors p-1 hover:bg-white/20 rounded-lg"
          >
            <X size={24} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-auto p-6">
          {/* 搜索框 */}
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                value={keyword}
                onChange={(e) => handleSearch(e.target.value)}
                placeholder="请输入附议人姓名或所属部门"
                className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-[#1779DC] focus:border-[#1779DC] focus:border-transparent transition-all"
              />
            </div>
          </div>

          {/* 已选择的附议人 */}
          <div className="mb-4 p-3 bg-blue-50 rounded-xl border border-blue-100">
            <div className="text-sm font-medium text-blue-800 mb-2">
              已选择 {selectedMembers.length} 位附议人
            </div>
            <div className="flex flex-wrap gap-2">
              {selectedMembers.map((member) => (
                <span
                  key={member.id}
                  className="inline-flex items-center gap-1 px-3 py-1 bg-[#1779DC] text-white rounded-full text-sm"
                >
                  {member.name}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedMembers(prev => prev.filter(m => m.id !== member.id));
                    }}
                    className="ml-1 hover:bg-white/20 rounded-full p-0.5 transition-colors"
                  >
                    <X size={14} />
                  </button>
                </span>
              ))}
              {selectedMembers.length === 0 && (
                <span className="text-gray-400 text-sm">暂未选择任何附议人</span>
              )}
            </div>
          </div>

          {/* 成员列表 */}
          <div className="border-2 border-gray-200 rounded-xl overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">所属学院/部门</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">姓名</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">校园卡号</th>
                  <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">选择</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-gray-500">
                      加载中...
                    </td>
                  </tr>
                ) : members.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-gray-500">
                      没有找到教代会成员
                    </td>
                  </tr>
                ) : (
                  members
                    .filter((member) => member.id !== excludeId) // 排除提案人自己
                    .map((member) => (
                    <tr
                      key={member.id}
                      className={`hover:bg-blue-50 cursor-pointer transition-colors ${
                        selectedIds.has(member.id) ? 'bg-blue-50' : ''
                      }`}
                      onClick={() => handleToggleSelect(member)}
                    >
                      <td className="px-4 py-3 text-sm text-gray-700">{member.depart || '-'}</td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">{member.name}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{member.id}</td>
                      <td className="px-4 py-3 text-center">
                        <div
                          className={`inline-flex items-center justify-center w-6 h-6 rounded-full border-2 transition-all ${
                            selectedIds.has(member.id)
                              ? 'bg-[#1779DC] border-[#1779DC]'
                              : 'border-gray-300 hover:border-[#1779DC]'
                          }`}
                        >
                          {selectedIds.has(member.id) && (
                            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* 分页 */}
          {totalPages > 1 && (
            <div className="mt-4 flex items-center justify-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="flex items-center gap-1 px-4 py-2 border-2 border-gray-200 rounded-lg hover:border-[#1779DC] hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                <ChevronLeft size={16} />
                上一页
              </button>
              <span className="px-4 py-2 text-gray-600">
                {page} / {totalPages} 页
              </span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="flex items-center gap-1 px-4 py-2 border-2 border-gray-200 rounded-lg hover:border-[#1779DC] hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                下一页
                <ChevronRight size={16} />
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 px-6 py-4 flex items-center justify-end gap-3 bg-gray-50">
          <button
            onClick={onClose}
            className="px-6 py-2.5 border-2 border-gray-300 rounded-xl hover:bg-gray-100 transition-all font-medium"
          >
            取消
          </button>
          <button
            onClick={handleConfirm}
            className="px-6 py-2.5 bg-gradient-to-r from-[#1779DC] to-[#2861AE] text-white rounded-xl hover:shadow-lg transition-all font-medium"
          >
            确定
          </button>
        </div>
      </div>
    </div>
  );
}
