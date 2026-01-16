'use client';

import { useState, useEffect } from 'react';
import { X, Search, Building2, ChevronLeft, ChevronRight } from 'lucide-react';

interface Department {
  departId: number;
  departName: string;
  description: string | null;
}

interface DepartSelectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (selected: string[]) => void;
  initialSelected?: string[];
}

export default function DepartSelectModal({
  isOpen,
  onClose,
  onConfirm,
  initialSelected = []
}: DepartSelectModalProps) {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [selectedNames, setSelectedNames] = useState<Set<string>>(new Set(initialSelected));
  const [keyword, setKeyword] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);

  // 同步 initialSelected 变化到 selectedNames
  useEffect(() => {
    setSelectedNames(new Set(initialSelected));
  }, [initialSelected]);

  // 获取部门列表
  useEffect(() => {
    if (!isOpen) return;

    const fetchDepartments = async () => {
      setLoading(true);
      try {
        const url = `/api/departments?page=${page}&pageSize=30${keyword ? `&keyword=${encodeURIComponent(keyword)}` : ''}`;
        const response = await fetch(url);
        const result = await response.json();

        if (result.success) {
          setDepartments(result.data.list);
          setTotalPages(result.data.pagination.totalPages);
        }
      } catch (error) {
        console.error('获取部门列表失败:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDepartments();
  }, [isOpen, page, keyword]);

  const handleToggleSelect = (depart: Department) => {
    const newSelected = new Set(selectedNames);
    if (newSelected.has(depart.departName)) {
      newSelected.delete(depart.departName);
    } else {
      newSelected.add(depart.departName);
    }
    setSelectedNames(newSelected);
  };

  const handleConfirm = () => {
    onConfirm(Array.from(selectedNames));
    onClose();
  };

  const handleSearch = (value: string) => {
    setKeyword(value);
    setPage(1);
  };

  if (!isOpen) return null;

  const selectedDepartments = departments.filter(d => selectedNames.has(d.departName));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#1779DC] to-[#2861AE] px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Building2 className="text-white" size={24} />
            <h3 className="text-xl font-bold text-white">选择部门</h3>
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
                placeholder="请输入部门名"
                className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-[#1779DC] focus:border-[#1779DC] focus:border-transparent transition-all"
              />
            </div>
          </div>

          {/* 已选择的部门 */}
          <div className="mb-4 p-3 bg-blue-50 rounded-xl border border-blue-100">
            <div className="text-sm font-medium text-blue-800 mb-2">
              已选择 {selectedNames.size} 个部门
            </div>
            <div className="flex flex-wrap gap-2">
              {selectedDepartments.map((depart) => (
                <span
                  key={depart.departId}
                  className="inline-flex items-center gap-1 px-3 py-1 bg-[#1779DC] text-white rounded-full text-sm"
                >
                  {depart.departName}
                  <button
                    onClick={() => handleToggleSelect(depart)}
                    className="ml-1 hover:bg-white/20 rounded-full p-0.5 transition-colors"
                  >
                    <X size={14} />
                  </button>
                </span>
              ))}
              {selectedNames.size === 0 && (
                <span className="text-gray-400 text-sm">暂未选择任何部门</span>
              )}
            </div>
          </div>

          {/* 部门网格列表 */}
          <div className="border-2 border-gray-200 rounded-xl p-4 bg-gray-50">
            {loading ? (
              <div className="text-center py-8 text-gray-500">加载中...</div>
            ) : departments.length === 0 ? (
              <div className="text-center py-8 text-gray-500">没有找到部门</div>
            ) : (
              <div className="grid grid-cols-3 gap-3">
                {departments.map((depart) => (
                  <div
                    key={depart.departId}
                    onClick={() => handleToggleSelect(depart)}
                    className={`px-4 py-3 rounded-xl cursor-pointer transition-all text-center ${
                      selectedNames.has(depart.departName)
                        ? 'bg-[#1779DC] text-white shadow-md'
                        : 'bg-white text-gray-700 hover:bg-blue-50 border-2 border-gray-200 hover:border-[#1779DC]'
                    }`}
                  >
                    <div className="text-sm font-medium">{depart.departName}</div>
                  </div>
                ))}
              </div>
            )}
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
