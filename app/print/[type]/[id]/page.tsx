'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Loader2, Printer, Download } from 'lucide-react';
import { Proposal, FormalProposal } from '@/types';

export default function PrintPage() {
  const params = useParams();
  const router = useRouter();
  const [data, setData] = useState<Proposal | FormalProposal | null>(null);
  const [loading, setLoading] = useState(true);
  const [canGoBack, setCanGoBack] = useState(false);

  // 检查是否有历史记录
  useEffect(() => {
    setCanGoBack(window.history.length > 1);
  }, []);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const type = params.type as string;
        const id = params.id as string;
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}/api/${type === 'zsta' ? 'formal-proposals' : 'proposals'}/${id}`, {
          cache: 'no-store',
        });
        const json = await res.json();
        if (json.success && json.data) {
          setData(json.data);
          // 数据加载完成后自动打印
          setTimeout(() => {
            window.print();
          }, 500);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [params.type, params.id]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <Loader2 size={48} className="text-gray-400 animate-spin mx-auto mb-4" />
          <p className="text-gray-500">加载打印内容...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <p className="text-gray-500 mb-4">打印内容不存在</p>
          <button
            onClick={() => {
              if (canGoBack) {
                router.back();
              } else {
                router.push('/');
              }
            }}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition-colors cursor-pointer"
          >
            返回
          </button>
        </div>
      </div>
    );
  }

  const type = params.type as string;

  // 渲染提案建议打印表格 - 使用图片模板
  if (type === 'tajy') {
    const proposal = data as Proposal;

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

    const endorserRows = formatEndorsers(proposal.fyr || '');

    // 立案状态映射
    const getProcessStatus = (process: number) => {
      switch (process) {
        case 1: return { single: true, merged: false, rejected: false };
        case 2: return { single: false, merged: false, rejected: true };
        case 3: return { single: true, merged: false, rejected: false };
        default: return { single: false, merged: false, rejected: false };
      }
    };

    const processStatus = getProcessStatus(proposal.process || 0);

    // 落实情况状态
    const getImplementationStatus = () => {
      // 根据 process 或其他字段判断落实情况
      if (proposal.process === 2) return 'unimplemented'; // 不立项/未落实
      if (proposal.process === 3 && proposal.description) return 'implementing'; // 处理中
      if (proposal.process === 1) return 'implemented'; // 已立案
      return 'unknown';
    };

    const implStatus = getImplementationStatus();

    return (
      <div className="min-h-screen bg-gray-200 py-8">
        {/* 非打印时的工具栏 */}
        <div className="no-print flex justify-center gap-4 mb-6">
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 px-6 py-3 bg-[#1779DC] hover:bg-[#2861AE] text-white rounded-xl transition-colors"
          >
            <Printer size={18} />
            打印
          </button>
          <button
            onClick={() => {
              if (canGoBack) {
                router.back();
              } else {
                const type = params.type as string;
                const id = params.id as string;
                router.push(type === 'zsta' ? `/formal-proposals/${id}` : `/proposals/${id}`);
              }
            }}
            className="flex items-center gap-2 px-6 py-3 bg-gray-500 hover:bg-gray-600 text-white rounded-xl transition-colors"
          >
            返回
          </button>
        </div>

        {/* 打印区域 */}
        <div className="print-page-wrapper">
          {/* 模板背景图 */}
          <div className="print-template-bg" />

          {/* 内容覆盖层 */}
          <div className="print-content-overlay">
            {/* 标题 */}
            <div className="print-header-title">
              深圳大学教代会提案建议表
            </div>

            {/* 表格内容 */}
            <table className="print-form-table">
              <tbody>
                {/* 提案标题 */}
                <tr>
                  <td className="form-label-cell">提案标题</td>
                  <td className="form-title-cell" colSpan={3}>
                    {proposal.title}
                  </td>
                </tr>

                {/* 立案情况 */}
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

                {/* 提案人 + 附议人 */}
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

                {/* 提案概述 */}
                <tr>
                  <td className="form-label-cell">提案概述</td>
                  <td className="form-content-cell-large" colSpan={3}>
                    <div className="form-text-content">
                      {proposal.brief || proposal.context || '无'}
                    </div>
                  </td>
                </tr>

                {/* 具体建议 */}
                <tr>
                  <td className="form-label-cell">具体建议</td>
                  <td className="form-content-cell-large" colSpan={3}>
                    <div className="form-text-content">
                      {proposal.suggest || '无'}
                    </div>
                  </td>
                </tr>

                {/* 提案落实部门 */}
                <tr>
                  <td className="form-label-cell">提案落实部门</td>
                  <td className="form-content-cell" colSpan={3}>
                    {proposal.management || '待定'}
                  </td>
                </tr>

                {/* 落实情况 */}
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

        {/* 打印样式 */}
        <style jsx global>{`
          /* 隐藏非打印元素 */
          @media print {
            .no-print {
              display: none !important;
            }
            body {
              background: white !important;
              margin: 0 !important;
              padding: 0 !important;
            }
            .print-page-wrapper {
              box-shadow: none !important;
              margin: 0 !important;
            }
          }

          /* 打印页面容器 */
          .print-page-wrapper {
            position: relative;
            width: 210mm;
            min-height: 297mm;
            margin: 20px auto;
            background: white;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
            overflow: hidden;
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
          .form-signer-cell {
            width: 180px;
            text-align: center;
            height: 80px;
          }

          .form-signer-name {
            font-size: 15px;
            font-weight: 500;
            margin-bottom: 5px;
          }

          .form-signer-department {
            font-size: 13px;
            color: #666;
          }

          /* 附议人单元格 */
          .form-endorser-cell {
            width: 280px;
            text-align: left;
            vertical-align: top;
            padding: 12px 15px;
          }

          .form-endorser-list {
            display: flex;
            flex-direction: column;
            gap: 8px;
          }

          .form-endorser-row {
            display: flex;
            flex-wrap: wrap;
            gap: 15px 30px;
          }

          .form-endorser-item {
            font-size: 14px;
            white-space: nowrap;
          }

          .form-no-endorser {
            font-size: 14px;
            color: #999;
            font-style: italic;
          }

          /* 底部信息 */
          .print-footer-info {
            margin-top: 30px;
            padding-top: 15px;
            border-top: 1px solid #ccc;
          }

          .print-date-row {
            display: flex;
            justify-content: flex-end;
            align-items: center;
            font-size: 14px;
          }

          .print-date-label {
            color: #666;
          }

          .print-date-value {
            font-weight: 500;
            margin-left: 5px;
          }

          /* 新增样式 */
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

          .form-signer-name {
            font-size: 14px;
            font-weight: 500;
          }

          .form-signer-dept {
            font-size: 13px;
            color: #666;
          }

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

          /* 打印时调整 */
          @media print {
            .print-page-wrapper {
              width: 100%;
              min-height: auto;
              box-shadow: none;
            }

            .print-template-bg {
              /* 打印时确保背景可见 */
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }

            .print-form-table td {
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

  // 渲染正式提案打印表格 - 使用图片模板
  if (type === 'zsta') {
    const proposal = data as FormalProposal;

    // 格式化附议人列表
    const formatEndorsers = (endorsers: string) => {
      if (!endorsers) return [];
      const list = endorsers.split('，').filter(e => e.trim());
      const rows = [];
      for (let i = 0; i < list.length; i += 5) {
        rows.push(list.slice(i, i + 5));
      }
      return rows;
    };

    const endorserRows = formatEndorsers(proposal.allEndorsers || '');

    // 格式化提案编号
    const formatProposalCode = () => {
      const year = proposal.createAt ? new Date(new Date(proposal.createAt).getTime() + (8 * 60 * 60 * 1000)).getFullYear() : new Date().getFullYear();
      return `${year}ZSTA${String(proposal.zstaId).padStart(3, '0')}`;
    };

    return (
      <div className="min-h-screen bg-gray-200 py-8">
        {/* 非打印时的工具栏 */}
        <div className="no-print flex justify-center gap-4 mb-6">
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 px-6 py-3 bg-[#1779DC] hover:bg-[#2861AE] text-white rounded-xl transition-colors"
          >
            <Printer size={18} />
            打印
          </button>
          <button
            onClick={() => {
              if (canGoBack) {
                router.back();
              } else {
                const type = params.type as string;
                const id = params.id as string;
                router.push(type === 'zsta' ? `/formal-proposals/${id}` : `/proposals/${id}`);
              }
            }}
            className="flex items-center gap-2 px-6 py-3 bg-gray-500 hover:bg-gray-600 text-white rounded-xl transition-colors"
          >
            返回
          </button>
        </div>

        {/* 打印区域 - 使用模板背景 */}
        <div className="print-page-wrapper-zsta">
          {/* 模板背景图 */}
          <div className="print-template-bg-zsta" />

          {/* 内容覆盖层 */}
          <div className="print-content-overlay-zsta">
            {/* 表格内容 */}
            <table className="print-form-table-zsta">
              <tbody>
                {/* 提案编号 */}
                <tr>
                  <td className="form-label-cell-zsta">提案编号</td>
                  <td className="form-code-cell" colSpan={3}>
                    {formatProposalCode()}
                  </td>
                </tr>

                {/* 提案标题 */}
                <tr>
                  <td className="form-label-cell-zsta">提案标题</td>
                  <td className="form-title-cell-zsta" colSpan={3}>
                    {proposal.title}
                  </td>
                </tr>

                {/* 提案事由 */}
                <tr>
                  <td className="form-label-cell-zsta">提案事由</td>
                  <td className="form-content-cell-zsta" colSpan={3}>
                    <div className="form-text-content-zsta">
                      {proposal.reason || '无'}
                    </div>
                  </td>
                </tr>

                {/* 具体建议 */}
                <tr>
                  <td className="form-label-cell-zsta">具体建议</td>
                  <td className="form-content-cell-zsta" colSpan={3}>
                    <div className="form-text-content-zsta">
                      {proposal.suggest || '无'}
                    </div>
                  </td>
                </tr>

                {/* 主办单位 */}
                <tr>
                  <td className="form-label-cell-zsta">主办单位</td>
                  <td className="form-input-cell-zsta" colSpan={3}>
                    {proposal.management || '待定'}
                  </td>
                </tr>

                {/* 附议人 */}
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

                {/* 办理回复 */}
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

            {/* 底部日期信息 */}
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

        {/* 打印样式 */}
        <style jsx global>{`
          /* 隐藏非打印元素 */
          @media print {
            .no-print {
              display: none !important;
            }
            body {
              background: white !important;
              margin: 0 !important;
              padding: 0 !important;
            }
            .print-page-wrapper-zsta {
              box-shadow: none !important;
              margin: 0 !important;
            }
          }

          /* 打印页面容器 - 正式提案 */
          .print-page-wrapper-zsta {
            position: relative;
            width: 210mm;
            min-height: 297mm;
            margin: 20px auto;
            background: white;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
            overflow: hidden;
          }

          /* 模板背景图 - 正式提案 */
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

          /* 内容覆盖层 - 正式提案 */
          .print-content-overlay-zsta {
            position: relative;
            z-index: 2;
            padding: 100px 40px 40px;
          }

          /* 打印表格 - 正式提案 */
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

          /* 标签单元格 - 正式提案 */
          .form-label-cell-zsta {
            width: 100px;
            text-align: center;
            font-weight: bold;
            font-size: 16px;
            background-color: #f8f8f8;
          }

          /* 内容单元格 - 正式提案 */
          .form-content-cell-zsta {
            text-align: left;
            vertical-align: top;
            min-height: 80px;
            padding: 15px;
          }

          /* 文本内容 - 正式提案 */
          .form-text-content-zsta {
            font-size: 14px;
            line-height: 2;
            white-space: pre-wrap;
            text-align: justify;
          }

          /* 标题单元格 - 正式提案 */
          .form-title-cell-zsta {
            text-align: center;
            font-size: 18px;
            font-weight: bold;
            padding: 15px;
          }

          /* 编号单元格 - 正式提案 */
          .form-code-cell {
            text-align: center;
            font-size: 16px;
            font-weight: bold;
            font-family: 'Courier New', monospace;
          }

          /* 输入单元格 - 正式提案 */
          .form-input-cell-zsta {
            text-align: left;
            font-size: 15px;
            padding: 12px 15px;
          }

          /* 附议人单元格 - 正式提案 */
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

          /* 底部信息 - 正式提案 */
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

          /* 打印时调整 - 正式提案 */
          @media print {
            .print-page-wrapper-zsta {
              width: 100%;
              min-height: auto;
              box-shadow: none;
            }

            .print-template-bg-zsta {
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }

            .print-form-table-zsta td {
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

  return null;
}
