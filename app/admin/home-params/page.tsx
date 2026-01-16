'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Home,
  Upload,
  Loader2,
  Save,
  Trash2,
} from 'lucide-react';

interface PageConfig {
  id: number;
  key: string;
  label: string;
  value: string;
}

interface SystemParams {
  enableSign: number;
  homeImage: string;
  pageConfigs: PageConfig[];
}

const PAGE_CONFIG_FIELDS = [
  { key: 'xwdt', label: '提案工作动态：' },
  { key: 'gzjz', label: '提案工作进展：' },
  { key: 'zsta', label: '正式提案查询：' },
  { key: 'tajy', label: '提案建议查询：' },
  { key: 'zjta', label: '征集提案建议：' },
  { key: 'gytagz', label: '关于提案工作：' },
];

export default function HomeParamsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [params, setParams] = useState<SystemParams>({
    enableSign: 1,
    homeImage: '',
    pageConfigs: [],
  });
  const [uploading, setUploading] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/settings/params');
      const json = await res.json();
      console.log('API response:', json);
      if (json.success) {
        // 确保 enableSign 是数字类型
        const rawEnableSign = json.data.enableSign;
        console.log('enableSign from API:', rawEnableSign, 'type:', typeof rawEnableSign);
        const enableSign = typeof rawEnableSign === 'number' ? rawEnableSign : parseInt(rawEnableSign ?? '1');
        console.log('enableSign parsed:', enableSign);

        // 如果 pageConfigs 为空，使用默认配置
        const data = {
          enableSign,
          homeImage: json.data.homeImage || '',
          pageConfigs: json.data.pageConfigs && json.data.pageConfigs.length > 0
            ? json.data.pageConfigs
            : PAGE_CONFIG_FIELDS.map(field => ({
                id: 0,
                key: field.key,
                label: field.label,
                value: '',
              }))
        };
        console.log('Final data:', data);
        setParams(data);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      const json = await res.json();
      if (json.success) {
        setParams(prev => ({ ...prev, homeImage: json.url }));
      } else {
        alert('上传失败');
      }
    } catch (error) {
      console.error('Error uploading image:', error);
      alert('上传失败');
    } finally {
      setUploading(false);
      if (imageInputRef.current) imageInputRef.current.value = '';
    }
  };

  const handlePageConfigChange = (configKey: string, newValue: string) => {
    if (newValue.length > 20) {
      alert('字数不能超过20个字符');
      return;
    }
    setParams(prev => {
      const updatedConfigs = prev.pageConfigs.map(cfg => {
        if (cfg.key === configKey) {
          return { ...cfg, value: newValue };
        }
        return cfg;
      });
      return { ...prev, pageConfigs: updatedConfigs };
    });
  };

  const handleDeletePageConfig = (configKey: string) => {
    setParams(prev => {
      const updatedConfigs = prev.pageConfigs.map(cfg => {
        if (cfg.key === configKey) {
          return { ...cfg, value: '' };
        }
        return cfg;
      });
      return { ...prev, pageConfigs: updatedConfigs };
    });
  };

  const saveParams = async () => {
    setSaving(true);
    try {
      const payload = {
        enableSign: params.enableSign,
        homeImage: params.homeImage,
        pageConfigs: params.pageConfigs,
      };
      console.log('Sending to API:', payload);
      const res = await fetch('/api/admin/settings/params', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      console.log('API response:', json);
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

  const getPageConfigValue = (configKey: string) => {
    const config = params.pageConfigs.find(c => c.key === configKey);
    return config?.value || '';
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
      <div className="flex items-center gap-3">
        <div className="p-3 bg-gradient-to-br from-[#1779DC] to-[#2861AE] rounded-xl text-white">
          <Home size={24} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-800">首页参数设置</h1>
          <p className="text-gray-500 text-sm">管理首页显示的参数配置</p>
        </div>
      </div>

      {/* 设置内容 */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="p-6 space-y-6">
          {/* 提案附议功能开关 */}
          <div className="bg-gray-50 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">提案附议功能</h3>
            <div className="flex items-center gap-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="enableSign"
                  checked={params.enableSign === 1}
                  onChange={() => setParams(prev => ({ ...prev, enableSign: 1 }))}
                  className="w-4 h-4 text-[#1779DC]"
                />
                <span className="text-gray-700">开启</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="enableSign"
                  checked={params.enableSign === 0}
                  onChange={() => setParams(prev => ({ ...prev, enableSign: 0 }))}
                  className="w-4 h-4 text-[#1779DC]"
                />
                <span className="text-gray-700">关闭</span>
              </label>
            </div>
          </div>

          {/* 首页图片 */}
          <div className="bg-gray-50 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">首页图片</h3>
            <input
              ref={imageInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
            />
            {params.homeImage ? (
              <div className="flex items-center gap-4">
                <div className="w-40 h-24 rounded-xl overflow-hidden border border-gray-200">
                  <img src={params.homeImage} alt="首页图片" className="w-full h-full object-cover" />
                </div>
                <button
                  onClick={() => imageInputRef.current?.click()}
                  className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
                >
                  更换图片
                </button>
              </div>
            ) : (
              <div
                onClick={() => imageInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
                  uploading ? 'border-gray-300 bg-gray-50' : 'border-gray-200 hover:border-[#1779DC]'
                }`}
              >
                {uploading ? (
                  <div className="flex flex-col items-center gap-2">
                    <Loader2 size={24} className="text-[#1779DC] animate-spin" />
                    <span className="text-sm text-gray-500">上传中...</span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <Upload size={24} className="text-gray-400" />
                    <span className="text-sm text-gray-500">点击上传首页图片</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 栏目说明 */}
          <div className="bg-gray-50 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-2">栏目说明</h3>
            <p className="text-sm text-gray-500 mb-4">不要换行，字数不多于20</p>
            <div className="space-y-4">
              {PAGE_CONFIG_FIELDS.map((field) => {
                const value = getPageConfigValue(field.key);
                return (
                  <div key={field.key} className="flex items-center gap-2">
                    <label className="w-40 text-gray-700 text-sm">{field.label}</label>
                    <input
                      type="text"
                      value={value}
                      onChange={(e) => handlePageConfigChange(field.key, e.target.value)}
                      className="flex-1 px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#1779DC] focus:border-transparent"
                      placeholder="请输入栏目说明"
                      maxLength={20}
                    />
                    <span className="text-sm text-gray-400 w-16 text-right">
                      {value.length}/20
                    </span>
                    <button
                      onClick={() => handleDeletePageConfig(field.key)}
                      className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      title="清空内容"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 保存按钮 */}
          <div className="flex justify-end">
            <button
              onClick={saveParams}
              disabled={saving}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#1779DC] to-[#2861AE] text-white rounded-xl hover:shadow-lg transition-all disabled:opacity-50"
            >
              {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
              保存设置
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
