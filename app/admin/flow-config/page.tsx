'use client';

import { useState, useEffect } from 'react';
import { Settings, Plus, Pencil, Trash2, Save, Clock, CheckCircle, X } from 'lucide-react';
import { FlowNodeConfig } from '@/types';

interface FlowNodeWithStatus extends FlowNodeConfig {
  isEditing?: boolean;
  tempName?: string;
  tempDays?: number;
}

export default function FlowConfigPage() {
  const [activeTab, setActiveTab] = useState<'tajy' | 'zsta'>('tajy');
  const [tajyNodes, setTajyNodes] = useState<FlowNodeWithStatus[]>([]);
  const [zstaNodes, setZstaNodes] = useState<FlowNodeWithStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // 默认节点配置
  const defaultTajyNodes: Omit<FlowNodeWithStatus, 'id' | 'createdAt' | 'updatedAt'>[] = [
    { proposalType: 'tajy', stepOrder: 0, nodeName: '提交', expectedDays: 0, isActive: true },
    { proposalType: 'tajy', stepOrder: 1, nodeName: '审核', expectedDays: 2, isActive: true },
    { proposalType: 'tajy', stepOrder: 2, nodeName: '立案', expectedDays: 3, isActive: true },
    { proposalType: 'tajy', stepOrder: 3, nodeName: '办理中', expectedDays: 15, isActive: true },
    { proposalType: 'tajy', stepOrder: 4, nodeName: '答复', expectedDays: 20, isActive: true },
    { proposalType: 'tajy', stepOrder: 5, nodeName: '已完成', expectedDays: 30, isActive: true },
  ];

  const defaultZstaNodes: Omit<FlowNodeWithStatus, 'id' | 'createdAt' | 'updatedAt'>[] = [
    { proposalType: 'zsta', stepOrder: 0, nodeName: '提交', expectedDays: 0, isActive: true },
    { proposalType: 'zsta', stepOrder: 1, nodeName: '初审', expectedDays: 2, isActive: true },
    { proposalType: 'zsta', stepOrder: 2, nodeName: '立案', expectedDays: 3, isActive: true },
    { proposalType: 'zsta', stepOrder: 3, nodeName: '办理中', expectedDays: 15, isActive: true },
    { proposalType: 'zsta', stepOrder: 4, nodeName: '答复', expectedDays: 20, isActive: true },
    { proposalType: 'zsta', stepOrder: 5, nodeName: '已完成', expectedDays: 30, isActive: true },
  ];

  useEffect(() => {
    fetchFlowConfigs();
  }, []);

  const fetchFlowConfigs = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}/api/flow-config`);
      const json = await res.json();

      if (json.success && json.data) {
        const tajy = json.data.filter((n: FlowNodeConfig) => n.proposalType === 'tajy')
          .sort((a: FlowNodeConfig, b: FlowNodeConfig) => a.stepOrder - b.stepOrder);
        const zsta = json.data.filter((n: FlowNodeConfig) => n.proposalType === 'zsta')
          .sort((a: FlowNodeConfig, b: FlowNodeConfig) => a.stepOrder - b.stepOrder);

        setTajyNodes(tajy);
        setZstaNodes(zsta);
      } else {
        // 使用默认配置
        setTajyNodes(defaultTajyNodes.map((n, i) => ({
          ...n,
          id: i + 1,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        })));
        setZstaNodes(defaultZstaNodes.map((n, i) => ({
          ...n,
          id: i + 100,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        })));
      }
    } catch (error) {
      console.error('Error fetching flow configs:', error);
      // 使用默认配置
      setTajyNodes(defaultTajyNodes.map((n, i) => ({
        ...n,
        id: i + 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })));
      setZstaNodes(defaultZstaNodes.map((n, i) => ({
        ...n,
        id: i + 100,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })));
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}/api/flow-config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tajy: tajyNodes.map(n => ({
            stepOrder: n.stepOrder,
            nodeName: n.nodeName,
            expectedDays: n.expectedDays,
            isActive: n.isActive,
          })),
          zsta: zstaNodes.map(n => ({
            stepOrder: n.stepOrder,
            nodeName: n.nodeName,
            expectedDays: n.expectedDays,
            isActive: n.isActive,
          })),
        }),
      });

      const json = await res.json();
      if (json.success) {
        setMessage({ type: 'success', text: '保存成功！' });
        setTimeout(() => setMessage(null), 3000);
      } else {
        setMessage({ type: 'error', text: json.error || '保存失败' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: '保存失败，请重试' });
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (index: number, type: 'tajy' | 'zsta') => {
    const nodes = type === 'tajy' ? tajyNodes : zstaNodes;
    const setNodes = type === 'tajy' ? setTajyNodes : setZstaNodes;

    const newNodes = [...nodes];
    newNodes[index] = {
      ...newNodes[index],
      isEditing: true,
      tempName: newNodes[index].nodeName,
      tempDays: newNodes[index].expectedDays,
    };
    setNodes(newNodes);
  };

  const handleCancel = (index: number, type: 'tajy' | 'zsta') => {
    const nodes = type === 'tajy' ? tajyNodes : zstaNodes;
    const setNodes = type === 'tajy' ? setTajyNodes : setZstaNodes;

    const newNodes = [...nodes];
    newNodes[index] = {
      ...newNodes[index],
      isEditing: false,
      tempName: undefined,
      tempDays: undefined,
    };
    setNodes(newNodes);
  };

  const handleSaveNode = (index: number, type: 'tajy' | 'zsta') => {
    const nodes = type === 'tajy' ? tajyNodes : zstaNodes;
    const setNodes = type === 'tajy' ? setTajyNodes : setZstaNodes;

    const newNodes = [...nodes];
    newNodes[index] = {
      ...newNodes[index],
      nodeName: newNodes[index].tempName || newNodes[index].nodeName,
      expectedDays: newNodes[index].tempDays ?? newNodes[index].expectedDays,
      isEditing: false,
      tempName: undefined,
      tempDays: undefined,
    };
    setNodes(newNodes);
  };

  const handleAddNode = (type: 'tajy' | 'zsta') => {
    const nodes = type === 'tajy' ? tajyNodes : zstaNodes;
    const setNodes = type === 'tajy' ? setTajyNodes : setZstaNodes;

    const newOrder = nodes.length;
    const newNode: FlowNodeWithStatus = {
      id: Date.now(),
      proposalType: type,
      stepOrder: newOrder,
      nodeName: '新节点',
      expectedDays: 5,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isEditing: true,
      tempName: '新节点',
      tempDays: 5,
    };

    setNodes([...nodes, newNode]);
  };

  const handleDeleteNode = (index: number, type: 'tajy' | 'zsta') => {
    if (!confirm('确定要删除这个节点吗？')) return;

    const nodes = type === 'tajy' ? tajyNodes : zstaNodes;
    const setNodes = type === 'tajy' ? setTajyNodes : setZstaNodes;

    // 重新排序
    const newNodes = nodes.filter((_, i) => i !== index)
      .map((n, i) => ({ ...n, stepOrder: i }));

    setNodes(newNodes);
  };

  const toggleActive = (index: number, type: 'tajy' | 'zsta') => {
    const nodes = type === 'tajy' ? tajyNodes : zstaNodes;
    const setNodes = type === 'tajy' ? setTajyNodes : setZstaNodes;

    const newNodes = [...nodes];
    newNodes[index] = {
      ...newNodes[index],
      isActive: !newNodes[index].isActive,
    };
    setNodes(newNodes);
  };

  const renderNodeRow = (node: FlowNodeWithStatus, index: number, type: 'tajy' | 'zsta') => {
    const isEditing = node.isEditing;

    return (
      <div
        key={node.id}
        className={`
          flex items-center gap-4 p-4 rounded-xl transition-all
          ${isEditing ? 'bg-blue-50 border-2 border-blue-200' : 'bg-gray-50 hover:bg-gray-100'}
          ${!node.isActive ? 'opacity-50' : ''}
        `}
      >
        {/* 序号 */}
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#1779DC] to-[#2861AE] text-white flex items-center justify-center font-bold text-sm flex-shrink-0">
          {index + 1}
        </div>

        {/* 节点名称 */}
        {isEditing ? (
          <input
            type="text"
            value={node.tempName ?? node.nodeName}
            onChange={(e) => {
              const nodes = type === 'tajy' ? tajyNodes : zstaNodes;
              const setNodes = type === 'tajy' ? setTajyNodes : setZstaNodes;
              const newNodes = [...nodes];
              newNodes[index] = { ...newNodes[index], tempName: e.target.value };
              setNodes(newNodes);
            }}
            className="flex-1 px-3 py-2 border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            autoFocus
          />
        ) : (
          <span className="flex-1 font-medium text-gray-700">{node.nodeName}</span>
        )}

        {/* 预期天数 */}
        {isEditing ? (
          <div className="flex items-center gap-2">
            <Clock size={16} className="text-gray-400" />
            <input
              type="number"
              value={node.tempDays ?? node.expectedDays}
              onChange={(e) => {
                const nodes = type === 'tajy' ? tajyNodes : zstaNodes;
                const setNodes = type === 'tajy' ? setTajyNodes : setZstaNodes;
                const newNodes = [...nodes];
                newNodes[index] = { ...newNodes[index], tempDays: parseInt(e.target.value) || 0 };
                setNodes(newNodes);
              }}
              className="w-20 px-3 py-2 border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <span className="text-gray-500 text-sm">天</span>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-gray-500">
            <Clock size={16} />
            <span className="text-sm">{node.expectedDays} 天</span>
          </div>
        )}

        {/* 状态开关 */}
        <button
          onClick={() => !isEditing && toggleActive(index, type)}
          className={`
            px-3 py-1 rounded-full text-sm font-medium transition-colors
            ${node.isActive
              ? 'bg-green-100 text-green-700'
              : 'bg-gray-200 text-gray-500'
            }
          `}
        >
          {node.isActive ? '启用' : '禁用'}
        </button>

        {/* 操作按钮 */}
        <div className="flex items-center gap-2">
          {isEditing ? (
            <>
              <button
                onClick={() => handleSaveNode(index, type)}
                className="p-2 text-green-600 hover:bg-green-100 rounded-lg transition-colors"
                title="保存"
              >
                <CheckCircle size={18} />
              </button>
              <button
                onClick={() => handleCancel(index, type)}
                className="p-2 text-gray-600 hover:bg-gray-200 rounded-lg transition-colors"
                title="取消"
              >
                <X size={18} />
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => handleEdit(index, type)}
                className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                title="编辑"
              >
                <Pencil size={18} />
              </button>
              <button
                onClick={() => handleDeleteNode(index, type)}
                className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
                title="删除"
              >
                <Trash2 size={18} />
              </button>
            </>
          )}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#1779DC]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-br from-[#1779DC] to-[#2861AE] rounded-xl text-white">
            <Settings size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-800">流程配置</h1>
            <p className="text-gray-500 text-sm">配置提案处理流程节点及预期时间</p>
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#1779DC] to-[#2861AE] text-white rounded-xl hover:shadow-lg transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Save size={18} />
          {saving ? '保存中...' : '保存配置'}
        </button>
      </div>

      {/* 消息提示 */}
      {message && (
        <div className={`
          p-4 rounded-xl flex items-center gap-3
          ${message.type === 'success'
            ? 'bg-green-50 text-green-700 border border-green-200'
            : 'bg-red-50 text-red-700 border border-red-200'
          }
        `}>
          {message.type === 'success' ? <CheckCircle size={20} /> : <X size={20} />}
          {message.text}
        </div>
      )}

      {/* 标签页 */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveTab('tajy')}
            className={`
              flex-1 px-6 py-4 font-medium transition-colors
              ${activeTab === 'tajy'
                ? 'text-[#1779DC] border-b-2 border-[#1779DC] bg-blue-50'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }
            `}
          >
            提案建议流程
          </button>
          <button
            onClick={() => setActiveTab('zsta')}
            className={`
              flex-1 px-6 py-4 font-medium transition-colors
              ${activeTab === 'zsta'
                ? 'text-[#1779DC] border-b-2 border-[#1779DC] bg-blue-50'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }
            `}
          >
            正式提案流程
          </button>
        </div>

        <div className="p-6">
          {/* 流程说明 */}
          <div className="mb-6 p-4 bg-blue-50 rounded-xl text-sm text-gray-600">
            <p>配置各流程节点的名称和预期处理天数。这些配置将在提案详情页的进度条中显示。</p>
            <p className="mt-1">预期天数为 0 表示该节点即时完成（如提交）。</p>
          </div>

          {/* 节点列表 */}
          <div className="space-y-3">
            {(activeTab === 'tajy' ? tajyNodes : zstaNodes).map((node, index) =>
              renderNodeRow(node, index, activeTab)
            )}
          </div>

          {/* 添加节点按钮 */}
          <button
            onClick={() => handleAddNode(activeTab)}
            className="mt-4 w-full py-3 border-2 border-dashed border-gray-300 rounded-xl text-gray-500 hover:border-[#1779DC] hover:text-[#1779DC] transition-all flex items-center justify-center gap-2"
          >
            <Plus size={18} />
            添加节点
          </button>
        </div>
      </div>

      {/* 预览 */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h3 className="text-lg font-bold text-gray-800 mb-4">预览</h3>
        <div className="p-6 bg-gray-50 rounded-xl">
          {/* 这里可以嵌入实际的 ProgressBar 组件进行预览 */}
          <div className="flex items-center justify-between text-sm">
            {(activeTab === 'tajy' ? tajyNodes : zstaNodes)
              .filter(n => n.isActive)
              .map((node, index, arr) => (
                <div key={node.id} className="flex flex-col items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center
                    ${index === 0 ? 'bg-gradient-to-br from-[#1779DC] to-[#2861AE] text-white' : 'bg-gray-300'}`}>
                    {index + 1}
                  </div>
                  <span className="text-xs mt-1 text-gray-600">{node.nodeName}</span>
                  <span className="text-xs text-gray-400">{node.expectedDays}天</span>
                </div>
              ))}
          </div>
        </div>
      </div>
    </div>
  );
}
