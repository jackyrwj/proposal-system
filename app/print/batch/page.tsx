'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Loader2, Printer, X } from 'lucide-react';

interface Proposal {
  tajyId: number;
  title: string;
  name: string;
  depart: string;
  brief: string;
  analysis: string;
  suggest: string;
  fyr: string;
  management: string;
  process: number;
  description: string;
  createAt: string;
}

interface FormalProposal {
  zstaId: number;
  title: string;
  name: string;
  reason: string;
  suggest: string;
  management: string;
  allEndorsers: string;
  reply: string;
  createAt: string;
}

// 格式化附议人列表，每行最多4个
const formatEndorsers = (endorsers: string) => {
  if (!endorsers) return [];
  const list = endorsers.split('，').filter(e => e.trim());
  const rows = [];
  for (let i = 0; i < list.length; i += 4) {
    rows.push(list.slice(i, i + 4));
  }
  return rows;
};

// 格式化附议人列表（正式提案，每行5个）
const formatEndorsersFormal = (endorsers: string) => {
  if (!endorsers) return [];
  const list = endorsers.split('，').filter(e => e.trim());
  const rows = [];
  for (let i = 0; i < list.length; i += 5) {
    rows.push(list.slice(i, i + 5));
  }
  return rows;
};

// 立案状态映射
const getProcessStatus = (process: number) => {
  switch (process) {
    case 1: return { single: true, merged: false, rejected: false };
    case 2: return { single: false, merged: false, rejected: true };
    case 3: return { single: true, merged: false, rejected: false };
    default: return { single: false, merged: false, rejected: false };
  }
};

// 落实情况状态
const getImplementationStatus = (proposal: Proposal) => {
  if (proposal.process === 2) return 'unimplemented';
  if (proposal.process === 3 && proposal.description) return 'implementing';
  if (proposal.process === 1) return 'implemented';
  return 'unknown';
};

// 格式化正式提案编号
const formatProposalCode = (proposal: FormalProposal) => {
  const year = proposal.createAt
    ? new Date(new Date(proposal.createAt).getTime() + (8 * 60 * 60 * 1000)).getFullYear()
    : new Date().getFullYear();
  return `${year}ZSTA${String(proposal.zstaId).padStart(3, '0')}`;
};

function BatchPrintContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [tajyIds, setTajyIds] = useState<number[]>([]);
  const [zstaIds, setZstaIds] = useState<number[]>([]);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [formalProposals, setFormalProposals] = useState<FormalProposal[]>([]);
  const [error, setError] = useState<string | null>(null);

  // 解析 URL 参数
  useEffect(() => {
    const tajyParam = searchParams.get('tajy');
    const zstaParam = searchParams.get('zsta');

    if (tajyParam) {
      const ids = tajyParam.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id));
      setTajyIds(ids);
    }
    if (zstaParam) {
      const ids = zstaParam.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id));
      setZstaIds(ids);
    }
  }, [searchParams]);

  // 加载提案数据
  useEffect(() => {
    const loadProposals = async () => {
      if (tajyIds.length === 0 && zstaIds.length === 0) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        // 并行加载提案建议和正式提案
        const promises: Promise<void>[] = [];

        if (tajyIds.length > 0) {
          promises.push(
            (async () => {
              const res = await fetch(`/api/admin/tajy/proposals-by-ids?ids=${tajyIds.join(',')}`);
              const json = await res.json();
              if (json.success && json.data) {
                setProposals(json.data);
              }
            })()
          );
        }

        if (zstaIds.length > 0) {
          promises.push(
            (async () => {
              const res = await fetch(`/api/admin/zsta/proposals-by-ids?ids=${zstaIds.join(',')}`);
              const json = await res.json();
              if (json.success && json.data) {
                setFormalProposals(json.data);
              }
            })()
          );
        }

        await Promise.all(promises);
      } catch (err) {
        console.error('Error loading proposals:', err);
        setError('加载提案数据失败');
      } finally {
        setLoading(false);
      }
    };

    loadProposals();
  }, [tajyIds, zstaIds]);

  // 自动打印
  useEffect(() => {
    if (!loading && (proposals.length > 0 || formalProposals.length > 0)) {
      const timer = setTimeout(() => {
        window.print();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [loading, proposals, formalProposals]);

  // 合并两种提案到一个列表
  const allProposals = [
    ...proposals.map(p => ({ type: 'tajy' as const, data: p })),
    ...formalProposals.map(p => ({ type: 'zsta' as const, data: p }))
  ];

  const totalCount = allProposals.length;

  const handleClose = () => {
    router.back();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <Loader2 size={48} className="text-gray-400 animate-spin mx-auto mb-4" />
          <p className="text-gray-500">正在加载打印内容...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <p className="text-red-500 mb-4">{error}</p>
          <button
            onClick={handleClose}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition-colors"
          >
            返回
          </button>
        </div>
      </div>
    );
  }

  if (allProposals.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <p className="text-gray-500 mb-4">没有可打印的提案</p>
          <button
            onClick={handleClose}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition-colors"
          >
            返回
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-200 py-8">
      {/* 非打印时的工具栏 */}
      <div className="no-print flex justify-center gap-4 mb-6">
        <button
          onClick={() => window.print()}
          className="flex items-center gap-2 px-6 py-3 bg-[#1779DC] hover:bg-[#2861AE] text-white rounded-xl transition-colors"
        >
          <Printer size={18} />
          打印全部 ({totalCount})
        </button>
        <button
          onClick={handleClose}
          className="flex items-center gap-2 px-6 py-3 bg-gray-500 hover:bg-gray-600 text-white rounded-xl transition-colors"
        >
          <X size={18} />
          关闭
        </button>
      </div>

      {/* 打印区域 - 渲染所有提案 */}
      <div className="print-container">
        {allProposals.map((item) => (
          <div key={`${item.type}-${item.type === 'tajy' ? (item.data as Proposal).tajyId : (item.data as FormalProposal).zstaId}`}>
            {item.type === 'tajy' && (
              <PrintTajyProposal proposal={item.data as Proposal} />
            )}
            {item.type === 'zsta' && (
              <PrintFormalProposal proposal={item.data as FormalProposal} />
            )}
          </div>
        ))}
      </div>

      {/* 打印样式 */}
      <style jsx global>{`
        @media print {
          .no-print {
            display: none !important;
          }
          body {
            background: white !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          .print-container {
            box-shadow: none !important;
            margin: 0 !important;
          }
        }

        .print-container {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        /* 打印页面容器 */
        .print-page-wrapper {
          position: relative;
          width: 210mm;
          min-height: 297mm;
          margin: 0 auto 20px;
          background: white;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
          overflow: hidden;
          page-break-after: always;
        }

        /* 模板背景图 */
        .print-template-bg {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background-image: url('/images/print-tajy-template.png');
          background-size: contain;
          background-repeat: no-repeat;
          background-position: center top;
          opacity: 1;
          z-index: 1;
        }

        /* 内容覆盖层 */
        .print-content-overlay {
          position: relative;
          z-index: 2;
          padding: 30px 40px 40px;
        }

        /* 标题 */
        .print-header-title {
          text-align: center;
          font-size: 22px;
          font-weight: bold;
          margin-bottom: 20px;
          font-family: 'SimSun', serif;
        }

        /* 打印表格 */
        .print-form-table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 20px;
        }

        .print-form-table td {
          border: 1px solid #333;
          padding: 12px 15px;
          vertical-align: middle;
        }

        /* 标签单元格 */
        .form-label-cell {
          width: 100px;
          text-align: center;
          font-weight: bold;
          font-size: 16px;
          background-color: #f8f8f8;
        }

        /* 内容单元格 */
        .form-content-cell {
          text-align: left;
          font-size: 15px;
          font-weight: 500;
          line-height: 1.6;
        }

        /* 大内容单元格 */
        .form-content-cell-large {
          text-align: left;
          vertical-align: top;
          min-height: 100px;
          padding: 15px;
        }

        /* 文本内容 */
        .form-text-content {
          font-size: 14px;
          line-height: 2;
          white-space: pre-wrap;
          text-align: justify;
        }

        /* 签名单元格 */
        .form-signer-name {
          font-size: 15px;
          font-weight: 500;
          margin-bottom: 5px;
        }

        .form-signer-dept {
          font-size: 13px;
          color: #666;
        }

        /* 附议人单元格 */
        .form-endorser-cell-inline {
          text-align: left;
          font-size: 14px;
          padding: 12px;
        }

        .form-endorser-inline {
          display: inline-block;
        }

        .form-endorser-inline span:not(:last-child)::after {
          content: '，';
          margin-right: 4px;
        }

        .form-checkbox-cell {
          text-align: left;
          padding: 12px 15px;
        }

        .form-checkbox-label {
          display: inline-flex;
          align-items: center;
          margin-right: 20px;
          font-size: 14px;
        }

        .form-checkbox {
          width: 16px;
          height: 16px;
          margin-right: 6px;
          accent-color: #1779DC;
        }

        .form-checkbox-label span {
          user-select: none;
        }

        .form-implementation-section {
          display: flex;
          flex-direction: row;
          align-items: center;
          gap: 20px;
          flex-wrap: wrap;
        }

        .form-implementation-reason {
          margin-top: 10px;
          padding: 10px;
          background-color: #f9f9f9;
          border: 1px solid #ddd;
          border-radius: 4px;
          font-size: 14px;
          line-height: 1.8;
          white-space: pre-wrap;
          width: 100%;
        }

        .form-title-cell {
          text-align: left;
          font-size: 16px;
          font-weight: bold;
          padding: 15px;
        }

        .form-label-cell-half {
          width: 80px;
          text-align: center;
          font-weight: bold;
          font-size: 14px;
          background-color: #f8f8f8;
        }

        .form-content-cell-half {
          text-align: left;
          font-size: 14px;
          padding: 12px;
          width: 200px;
        }

        /* 正式提案样式 */
        .print-page-wrapper-zsta {
          position: relative;
          width: 210mm;
          min-height: 297mm;
          margin: 0 auto 20px;
          background: white;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
          overflow: hidden;
          page-break-after: always;
        }

        .print-template-bg-zsta {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background-image: url('/images/print-zsta-template.png');
          background-size: contain;
          background-repeat: no-repeat;
          background-position: center top;
          opacity: 1;
          z-index: 1;
        }

        .print-content-overlay-zsta {
          position: relative;
          z-index: 2;
          padding: 100px 40px 40px;
        }

        .print-form-table-zsta {
          width: 100%;
          border-collapse: collapse;
          margin-top: 20px;
        }

        .print-form-table-zsta td {
          border: 1px solid #333;
          padding: 12px 15px;
          vertical-align: middle;
        }

        .form-label-cell-zsta {
          width: 100px;
          text-align: center;
          font-weight: bold;
          font-size: 16px;
          background-color: #f8f8f8;
        }

        .form-content-cell-zsta {
          text-align: left;
          vertical-align: top;
          min-height: 80px;
          padding: 15px;
        }

        .form-text-content-zsta {
          font-size: 14px;
          line-height: 2;
          white-space: pre-wrap;
          text-align: justify;
        }

        .form-title-cell-zsta {
          text-align: center;
          font-size: 18px;
          font-weight: bold;
          padding: 15px;
        }

        .form-code-cell {
          text-align: center;
          font-size: 16px;
          font-weight: bold;
          font-family: 'Courier New', monospace;
        }

        .form-input-cell-zsta {
          text-align: left;
          font-size: 15px;
          padding: 12px 15px;
        }

        .form-endorser-cell-zsta {
          text-align: left;
          vertical-align: top;
          padding: 12px 15px;
          min-height: 60px;
        }

        .form-endorser-list-zsta {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .form-endorser-row-zsta {
          display: flex;
          flex-wrap: wrap;
          gap: 15px 30px;
        }

        .form-endorser-item-zsta {
          font-size: 14px;
          white-space: nowrap;
        }

        .form-no-endorser-zsta {
          font-size: 14px;
          color: #999;
          font-style: italic;
        }

        .print-footer-info-zsta {
          margin-top: 30px;
          padding-top: 15px;
          border-top: 1px solid #ccc;
        }

        .print-date-row-zsta {
          display: flex;
          justify-content: flex-end;
          align-items: center;
          font-size: 14px;
        }

        .print-date-label-zsta {
          color: #666;
        }

        .print-date-value-zsta {
          font-weight: 500;
          margin-left: 5px;
        }

        @media print {
          .print-page-wrapper, .print-page-wrapper-zsta {
            width: 100%;
            min-height: auto;
            box-shadow: none;
          }

          .print-template-bg, .print-template-bg-zsta {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }

          .print-form-table td, .print-form-table-zsta td {
            border-color: #000;
          }

          @page {
            margin: 10mm;
            size: A4;
          }
        }
      `}</style>
    </div>
  );
}

// 提案建议打印组件
function PrintTajyProposal({ proposal }: { proposal: Proposal }) {
  const endorserRows = formatEndorsers(proposal.fyr || '');
  const processStatus = getProcessStatus(proposal.process || 0);
  const implStatus = getImplementationStatus(proposal);

  return (
    <div className="print-page-wrapper">
      <div className="print-template-bg" />
      <div className="print-content-overlay">
        <div className="print-header-title">
          深圳大学教代会提案建议表
        </div>
        <table className="print-form-table">
          <tbody>
            <tr>
              <td className="form-label-cell">提案标题</td>
              <td className="form-title-cell" colSpan={3}>
                {proposal.title}
              </td>
            </tr>
            <tr>
              <td className="form-label-cell">立案情况</td>
              <td className="form-checkbox-cell" colSpan={3}>
                <label className="form-checkbox-label">
                  <input type="checkbox" checked={processStatus.single} readOnly className="form-checkbox" />
                  <span>单独立案</span>
                </label>
                <label className="form-checkbox-label">
                  <input type="checkbox" checked={processStatus.merged} readOnly className="form-checkbox" />
                  <span>合并立案</span>
                </label>
                <label className="form-checkbox-label">
                  <input type="checkbox" checked={processStatus.rejected} readOnly className="form-checkbox" />
                  <span>不立项（已回复）</span>
                </label>
              </td>
            </tr>
            <tr>
              <td className="form-label-cell-half">提案人</td>
              <td className="form-content-cell-half">
                <span className="form-signer-name">{proposal.name || ''}</span>
                <span className="form-signer-dept">（签字）</span>
              </td>
              <td className="form-label-cell-half">附议人</td>
              <td className="form-endorser-cell-inline">
                {endorserRows.length > 0 ? (
                  endorserRows.map((row, idx) => (
                    <span key={idx} className="form-endorser-inline">
                      {row.map((endorser, i) => (
                        <span key={i}>{endorser.replace(/\([^)]+\)/, '').trim()}</span>
                      ))}
                    </span>
                  ))
                ) : (
                  <span>&nbsp;</span>
                )}
              </td>
            </tr>
            <tr>
              <td className="form-label-cell">提案概述</td>
              <td className="form-content-cell-large" colSpan={3}>
                <div className="form-text-content">
                  {proposal.brief || '无'}
                </div>
              </td>
            </tr>
            <tr>
              <td className="form-label-cell">具体建议</td>
              <td className="form-content-cell-large" colSpan={3}>
                <div className="form-text-content">
                  {proposal.suggest || '无'}
                </div>
              </td>
            </tr>
            <tr>
              <td className="form-label-cell">提案落实部门</td>
              <td className="form-content-cell" colSpan={3}>
                {proposal.management || '待定'}
              </td>
            </tr>
            <tr>
              <td className="form-label-cell">落实情况</td>
              <td className="form-content-cell-large" colSpan={3}>
                <div className="form-implementation-section">
                  <label className="form-checkbox-label">
                    <input type="checkbox" checked={implStatus === 'implemented'} readOnly className="form-checkbox" />
                    <span>已落实</span>
                  </label>
                  <label className="form-checkbox-label">
                    <input type="checkbox" checked={implStatus === 'implementing'} readOnly className="form-checkbox" />
                    <span>正在落实</span>
                  </label>
                  <label className="form-checkbox-label">
                    <input type="checkbox" checked={implStatus === 'unimplemented'} readOnly className="form-checkbox" />
                    <span>未能落实及原因</span>
                  </label>
                  {proposal.description && (
                    <div className="form-implementation-reason">
                      {proposal.description}
                    </div>
                  )}
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

// 正式提案打印组件
function PrintFormalProposal({ proposal }: { proposal: FormalProposal }) {
  const endorserRows = formatEndorsersFormal(proposal.allEndorsers || '');

  return (
    <div className="print-page-wrapper-zsta">
      <div className="print-template-bg-zsta" />
      <div className="print-content-overlay-zsta">
        <table className="print-form-table-zsta">
          <tbody>
            <tr>
              <td className="form-label-cell-zsta">提案编号</td>
              <td className="form-code-cell" colSpan={3}>
                {formatProposalCode(proposal)}
              </td>
            </tr>
            <tr>
              <td className="form-label-cell-zsta">提案标题</td>
              <td className="form-title-cell-zsta" colSpan={3}>
                {proposal.title}
              </td>
            </tr>
            <tr>
              <td className="form-label-cell-zsta">提案事由</td>
              <td className="form-content-cell-zsta" colSpan={3}>
                <div className="form-text-content-zsta">
                  {proposal.reason || '无'}
                </div>
              </td>
            </tr>
            <tr>
              <td className="form-label-cell-zsta">具体建议</td>
              <td className="form-content-cell-zsta" colSpan={3}>
                <div className="form-text-content-zsta">
                  {proposal.suggest || '无'}
                </div>
              </td>
            </tr>
            <tr>
              <td className="form-label-cell-zsta">主办单位</td>
              <td className="form-input-cell-zsta" colSpan={3}>
                {proposal.management || '待定'}
              </td>
            </tr>
            <tr>
              <td className="form-label-cell-zsta">附议人</td>
              <td className="form-endorser-cell-zsta" colSpan={3}>
                {endorserRows.length > 0 ? (
                  <div className="form-endorser-list-zsta">
                    {endorserRows.map((row, idx) => (
                      <div key={idx} className="form-endorser-row-zsta">
                        {row.map((endorser, i) => (
                          <span key={i} className="form-endorser-item-zsta">
                            {endorser.replace(/\([^)]+\)/, '').trim()}
                          </span>
                        ))}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="form-no-endorser-zsta">暂无附议人</div>
                )}
              </td>
            </tr>
            <tr>
              <td className="form-label-cell-zsta">办理回复</td>
              <td className="form-content-cell-zsta" colSpan={3}>
                <div className="form-text-content-zsta">
                  {proposal.reply || '暂无回复'}
                </div>
              </td>
            </tr>
          </tbody>
        </table>

        <div className="print-footer-info-zsta">
          <div className="print-date-row-zsta">
            <span className="print-date-label-zsta">提交日期：</span>
            <span className="print-date-value-zsta">
              {proposal.createAt ? proposal.createAt.split(' ')[0] : ''}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// 导出带有 Suspense 的页面组件
export default function BatchPrintPage() {
  return (
    <Suspense fallback={
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <Loader2 size={48} className="animate-spin" />
      </div>
    }>
      <BatchPrintContent />
    </Suspense>
  );
}
