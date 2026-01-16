'use client';

import { CheckCircle, Circle, Clock } from 'lucide-react';
import { useMemo } from 'react';

// 进度节点接口
export interface ProgressNode {
  id: number;
  name: string;        // 节点名称
  expectedDate?: string; // 预期时间（可选，用于后台配置的默认时间）
  status: 'pending' | 'active' | 'completed';
  completedAt?: string; // 实际完成时间
}

interface ProgressBarProps {
  nodes: ProgressNode[];
  currentStep: number;
  proposalType: 'tajy' | 'zsta'; // 提案建议/正式提案
  orientation?: 'horizontal' | 'vertical';
  size?: 'sm' | 'md' | 'lg';
  showAllNodes?: boolean; // 是否显示所有节点（默认为false，只显示到当前步骤）
}

export function ProgressBar({
  nodes,
  currentStep,
  proposalType,
  orientation = 'horizontal',
  size = 'md',
  showAllNodes = false
}: ProgressBarProps) {
  // 根据当前步骤过滤节点
  const displayNodes = useMemo(() => {
    if (showAllNodes) return nodes;
    if (currentStep < 0) return nodes.slice(0, 1); // 不立案状态只显示第一个节点
    // 只显示到当前步骤的节点（包含当前步骤）
    return nodes.slice(0, currentStep + 1);
  }, [nodes, currentStep, showAllNodes]);

  // 重新计算当前步骤
  // showAllNodes=true 时，直接使用 currentStep；否则使用最后一个节点的索引
  const adjustedCurrentStep = currentStep < 0 ? 0 : (showAllNodes ? currentStep : displayNodes.length - 1);

  // 计算进度百分比
  const progressPercent = useMemo(() => {
    if (displayNodes.length === 0) return 0;
    return (adjustedCurrentStep / (displayNodes.length - 1)) * 100;
  }, [adjustedCurrentStep, displayNodes.length]);

  // 尺寸配置
  const sizeConfig = {
    sm: {
      nodeSize: 'w-8 h-8',
      nodeIcon: 14,
      textSize: 'text-xs',
      timeSize: 'text-[10px]',
      lineWidth: 'h-1',
      gap: 'gap-2'
    },
    md: {
      nodeSize: 'w-10 h-10',
      nodeIcon: 18,
      textSize: 'text-sm',
      timeSize: 'text-xs',
      lineWidth: 'h-1.5',
      gap: 'gap-3'
    },
    lg: {
      nodeSize: 'w-12 h-12',
      nodeIcon: 22,
      textSize: 'text-base',
      timeSize: 'text-sm',
      lineWidth: 'h-2',
      gap: 'gap-4'
    }
  }[size];

  // 垂直方向时使用不同的布局
  const isVertical = orientation === 'vertical';

  return (
    <div className={`w-full ${isVertical ? 'space-y-0' : ''}`}>
      {/* 水平进度条 */}
      {!isVertical && (
        <div className="relative w-full">
          {/* 进度线背景 */}
          <div className={`absolute top-1/2 left-0 -translate-y-1/2 w-full ${sizeConfig.lineWidth} bg-gray-200 rounded-full overflow-hidden`}>
            {/* 已完成进度 */}
            <div
              className="h-full bg-gradient-to-r from-[#1779DC] to-[#2861AE] rounded-full transition-all duration-500 ease-out"
              style={{ width: `${Math.min(progressPercent, 100)}%` }}
            />
          </div>

          {/* 节点容器 */}
          <div className={`relative flex justify-between items-center ${sizeConfig.gap}`}>
            {displayNodes.map((node, index) => {
              const isCompleted = index < adjustedCurrentStep;
              const isActive = index === adjustedCurrentStep;
              const isPending = index > adjustedCurrentStep;

              return (
                <div
                  key={node.id}
                  className="flex flex-col items-center gap-2 z-10"
                >
                  {/* 节点圆圈 */}
                  <div
                    className={`
                      ${sizeConfig.nodeSize} rounded-full flex items-center justify-center
                      transition-all duration-300 ease-out relative
                      ${isCompleted
                        ? 'bg-gradient-to-br from-[#1779DC] to-[#2861AE] text-white shadow-md'
                        : isActive
                          ? 'bg-gradient-to-br from-[#1779DC] to-[#2861AE] text-white shadow-lg ring-4 ring-blue-100 scale-110'
                          : 'bg-white border-2 border-gray-300 text-gray-400'
                      }
                    `}
                  >
                    {isCompleted ? (
                      <CheckCircle size={sizeConfig.nodeIcon} strokeWidth={2.5} />
                    ) : isActive ? (
                      <div className="relative">
                        <div className={`w-2 h-2 bg-white rounded-full animate-ping absolute inset-0`} />
                        <Circle size={sizeConfig.nodeIcon} strokeWidth={2.5} fill="white" />
                      </div>
                    ) : (
                      <Circle size={sizeConfig.nodeIcon} strokeWidth={2} />
                    )}
                  </div>

                  {/* 节点信息 */}
                  <div className={`flex flex-col items-center ${sizeConfig.timeSize}`}>
                    <span className={`font-medium ${isActive ? 'text-[#1779DC]' : isCompleted ? 'text-gray-700' : 'text-gray-500'} ${sizeConfig.textSize}`}>
                      {node.name}
                    </span>
                    <span className="text-gray-400">
                      {isCompleted && node.completedAt
                        ? node.completedAt
                        : node.expectedDate || '-'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 垂直进度条 */}
      {isVertical && (
        <div className="flex gap-6">
          {/* 左侧：节点 */}
          <div className="flex flex-col gap-0 flex-shrink-0">
            {displayNodes.map((node, index) => {
              const isCompleted = index < adjustedCurrentStep;
              const isActive = index === adjustedCurrentStep;
              const isPending = index > adjustedCurrentStep;

              return (
                <div key={node.id} className="flex items-center">
                  {/* 连接线 */}
                  {index > 0 && (
                    <div className={`absolute ${sizeConfig.lineWidth} bg-gray-200 ml-5`}
                      style={{
                        width: '2px',
                        height: size === 'lg' ? '3rem' : size === 'md' ? '2.5rem' : '2rem',
                        marginTop: `-${size === 'lg' ? '3rem' : size === 'md' ? '2.5rem' : '2rem'}`,
                      }}
                    >
                      {isCompleted && (
                        <div
                          className="w-full bg-gradient-to-b from-[#1779DC] to-[#2861AE] transition-all duration-500"
                          style={{ height: '100%' }}
                        />
                      )}
                    </div>
                  )}

                  {/* 节点圆圈 */}
                  <div
                    className={`
                      ${sizeConfig.nodeSize} rounded-full flex items-center justify-center
                      transition-all duration-300 ease-out relative z-10
                      ${isCompleted
                        ? 'bg-gradient-to-br from-[#1779DC] to-[#2861AE] text-white shadow-md'
                        : isActive
                          ? 'bg-gradient-to-br from-[#1779DC] to-[#2861AE] text-white shadow-lg ring-4 ring-blue-100 scale-110'
                          : 'bg-white border-2 border-gray-300 text-gray-400'
                      }
                    `}
                  >
                    {isCompleted ? (
                      <CheckCircle size={sizeConfig.nodeIcon} strokeWidth={2.5} />
                    ) : isActive ? (
                      <div className="relative">
                        <div className="w-2 h-2 bg-white rounded-full animate-ping absolute inset-0" />
                        <Circle size={sizeConfig.nodeIcon} strokeWidth={2.5} fill="white" />
                      </div>
                    ) : (
                      <Circle size={sizeConfig.nodeIcon} strokeWidth={2} />
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* 右侧：信息 */}
          <div className="flex flex-col justify-around py-1 flex-1">
            {displayNodes.map((node, index) => {
              const isCompleted = index < adjustedCurrentStep;
              const isActive = index === adjustedCurrentStep;

              return (
                <div
                  key={node.id}
                  className={`flex items-center justify-between py-3 min-h-[${size === 'lg' ? '4.5rem' : size === 'md' ? '4rem' : '3.5rem'}]`}
                >
                  <div>
                    <span className={`font-medium ${isActive ? 'text-[#1779DC]' : isCompleted ? 'text-gray-700' : 'text-gray-500'} ${sizeConfig.textSize}`}>
                      {node.name}
                    </span>
                  </div>
                  <div className={`text-gray-400 ${sizeConfig.timeSize}`}>
                    {isCompleted && node.completedAt
                      ? node.completedAt
                      : node.expectedDate || '-'}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 当前状态提示 */}
      <div className={`mt-4 flex items-center gap-2 ${sizeConfig.textSize}`}>
        <Clock size={14} className="text-[#1779DC]" />
        <span className="text-gray-600">
          当前状态: <span className="font-medium text-[#1779DC]">{displayNodes[adjustedCurrentStep]?.name || '未知'}</span>
        </span>
      </div>
    </div>
  );
}

// 默认流程节点配置（固定节点，对应数据库状态）
export const DEFAULT_FLOW_NODES = {
  // 提案建议流程: 0-未审核 → 3-处理中 → 1-已立案（终态） / 2-不立案（终态分支）
  // 注意：只显示主流程三个节点，不立案作为特殊终态单独处理
  tajy: [
    { id: 0, name: '未审核', status: 'pending' as const },
    { id: 3, name: '处理中', status: 'pending' as const },
    { id: 1, name: '已立案', status: 'pending' as const }, // 终态
  ],
  // 正式提案流程: 0-未处理, 1-正在处理, 2-处理完毕
  zsta: [
    { id: 0, name: '未处理', status: 'pending' as const },
    { id: 1, name: '正在处理', status: 'pending' as const },
    { id: 2, name: '处理完毕', status: 'pending' as const },
  ],
};

// 根据状态映射到当前步骤
export function getStepByProcess(
  process: number,
  proposalType: 'tajy' | 'zsta'
): number {
  // 提案建议: 0-未审核 → 3-处理中 → 1-已立案（终态） / 2-不立案（特殊终态）
  if (proposalType === 'tajy') {
    const stepMap: Record<number, number> = {
      0: 0, // 未审核 -> 第0步
      3: 1, // 处理中 -> 第1步
      1: 2, // 已立案 -> 第2步（终态）
      2: -1, // 不立案 -> 特殊终态（-1表示不立案，页面单独处理）
    };
    return stepMap[process] ?? 0;
  }

  // 正式提案: 0-未处理, 1-正在处理, 2-处理完毕
  // 直接使用 process 值作为步骤索引
  return process >= 0 && process <= 2 ? process : 0;
}

// 检查是否为"不立案"状态
export function isRejectedStatus(process: number, proposalType: 'tajy' | 'zsta'): boolean {
  return proposalType === 'tajy' && process === 2;
}

// 紧凑型进度条（用于卡片或列表）
interface CompactProgressBarProps {
  currentStep: number;
  totalSteps: number;
  showLabel?: boolean;
}

export function CompactProgressBar({
  currentStep,
  totalSteps,
  showLabel = true
}: CompactProgressBarProps) {
  const progressPercent = (currentStep / (totalSteps - 1)) * 100;

  return (
    <div className="w-full space-y-1">
      <div className="flex justify-between items-center text-xs text-gray-500">
        {showLabel && <span>进度</span>}
        <span className="font-medium text-[#1779DC]">
          {Math.round(progressPercent)}%
        </span>
      </div>
      <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-[#1779DC] to-[#2861AE] rounded-full transition-all duration-500 ease-out"
          style={{ width: `${Math.min(progressPercent, 100)}%` }}
        />
      </div>
    </div>
  );
}
