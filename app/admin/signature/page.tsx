'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Users,
  Loader2,
  Check,
  X,
  ChevronLeft,
  ChevronRight,
  Calendar,
} from 'lucide-react';

interface Signature {
  sId: number;
  tajyId: number;
  taname: string;
  fyr: string;
  isAgree: number | null;
  signTime: string;
}

interface ProposalInfo {
  title: string;
  tajybh: number;
  tajyId: number;
}

export default function AdminSignaturePage() {
  const [signatures, setSignatures] = useState<Signature[]>([]);
  const [proposalMap, setProposalMap] = useState<Record<number, ProposalInfo>>({});
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalSignatures, setTotalSignatures] = useState(0);
  const pageSize = 20;

  useEffect(() => {
    fetchSignatures();
  }, [currentPage]);

  const fetchSignatures = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}/api/signatures?limit=${pageSize}&page=${currentPage}`, {
        cache: 'no-store',
      });
      const json = await res.json();
      if (json.success) {
        setSignatures(json.data);
        setTotalSignatures(json.pagination?.total || json.data.length);
        const proposalIds = json.data.map((s: Signature) => s.tajyId);
        fetchProposalInfo(proposalIds);
      }
    } catch (error) {
      console.error('Error fetching signatures:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchProposalInfo = async (ids: number[]) => {
    if (ids.length === 0) return;
    try {
      const promises = ids.map(id =>
        fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}/api/proposals/${id}`).then(r => r.json())
      );
      const results = await Promise.all(promises);
      const map: Record<number, ProposalInfo> = {};
      results.forEach(json => {
        if (json.success && json.data) {
          map[json.data.tajyId] = {
            title: json.data.title,
            tajybh: json.data.tajybh,
            tajyId: json.data.tajyId,
          };
        }
      });
      setProposalMap(map);
    } catch (error) {
      console.error('Error fetching proposal info:', error);
    }
  };

  const totalPages = Math.ceil(totalSignatures / pageSize) || 1;

  const handleUpdateStatus = async (sId: number, isAgree: number) => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}/api/signatures/${sId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isAgree }),
      });
      const json = await res.json();
      if (json.success) {
        fetchSignatures();
      }
    } catch (error) {
      console.error('Error updating signature:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <Loader2 size={40} className="text-[#1779DC] animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-br from-[#1779DC] to-[#2861AE] rounded-xl text-white">
            <Users size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-800">代附议人署名</h1>
            <p className="text-gray-500 text-sm">管理提案附议人的签名记录</p>
          </div>
        </div>
      </div>

      {/* 统计信息 */}
      <div className="flex items-center gap-4">
        <span className="text-gray-600">
          共有 <strong className="text-[#1779DC]">{totalSignatures}</strong> 条签名记录
        </span>
      </div>

      {/* 签名列表 */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">关联提案</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">附议人</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">提案时间</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">状态</th>
              <th className="px-6 py-4 text-right text-sm font-semibold text-gray-700">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {signatures.map((sig) => (
              <tr key={sig.sId} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4">
                  <Link
                    href={`/admin/tajy/${sig.tajyId}`}
                    className="block text-sm group"
                  >
                    <span className="text-[#1779DC] font-medium group-hover:underline">
                      {proposalMap[sig.tajyId]?.title || `提案 #${sig.tajyId}`}
                    </span>
                    <span className="text-gray-500 ml-2">
                      (TY{String(proposalMap[sig.tajyId]?.tajyId || sig.tajyId).padStart(4, '0')})
                    </span>
                  </Link>
                </td>
                <td className="px-6 py-4">
                  <span className="font-medium text-gray-800">{sig.fyr}</span>
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">
                  <div className="flex items-center gap-1">
                    <Calendar size={14} />
                    {sig.signTime?.split(' ')[0] || '-'}
                  </div>
                </td>
                <td className="px-6 py-4">
                  {sig.isAgree === null ? (
                    <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-lg text-xs font-medium">待审核</span>
                  ) : sig.isAgree === 1 ? (
                    <span className="px-3 py-1 bg-green-100 text-green-700 rounded-lg text-xs font-medium">同意</span>
                  ) : (
                    <span className="px-3 py-1 bg-red-100 text-red-700 rounded-lg text-xs font-medium">不同意</span>
                  )}
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => handleUpdateStatus(sig.sId, 1)}
                      className="flex items-center gap-1 px-3 py-1.5 bg-green-500 text-white rounded-lg text-xs font-medium hover:bg-green-600 transition-colors"
                    >
                      <Check size={14} />
                      同意
                    </button>
                    <button
                      onClick={() => handleUpdateStatus(sig.sId, 0)}
                      className="flex items-center gap-1 px-3 py-1.5 bg-red-500 text-white rounded-lg text-xs font-medium hover:bg-red-600 transition-colors"
                    >
                      <X size={14} />
                      不同意
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {signatures.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                  暂无签名记录
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* 分页 */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
          disabled={currentPage === 1}
          className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-xl hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronLeft size={18} />
          上一页
        </button>
        <span className="text-sm text-gray-600">
          第 <strong>{currentPage}</strong> / {totalPages} 页
        </span>
        <button
          onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage === totalPages}
          className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-xl hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          下一页
          <ChevronRight size={18} />
        </button>
      </div>
    </div>
  );
}
