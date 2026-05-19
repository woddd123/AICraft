import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { MOCK_USER, Novel } from '../lib/mockData';
import { Edit3, Book, Heart, Users, Key, ExternalLink, Eye, EyeOff, Check, Trash2 } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';
import { useUser, SignOutButton } from '@clerk/clerk-react';
import {
  ApiSettings,
  PROVIDERS,
  loadSettings,
  saveSettings,
  clearSettings,
  loadCachedModels,
  fetchAndCacheModels,
} from '../lib/apiSettings';

export function Profile() {
  const { user: clerkUser } = useUser();
  const [publishedWorks, setPublishedWorks] = useState<Novel[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // API settings state
  const [savedSettings, setSavedSettings] = useState<ApiSettings | null>(null);
  const [showApiSection, setShowApiSection] = useState(false);
  const [providerId, setProviderId] = useState('deepseek');
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [model, setModel] = useState('');
  const [customBaseURL, setCustomBaseURL] = useState('');
  const [customModel, setCustomModel] = useState('');
  const [saveMessage, setSaveMessage] = useState('');
  const [availableModels, setAvailableModels] = useState<{ id: string; name: string }[]>([]);
  const [isFetchingModels, setIsFetchingModels] = useState(false);

  const selectedProvider = PROVIDERS.find(p => p.id === providerId);

  const updateModelsForProvider = (pid: string) => {
    if (pid === 'custom') { setAvailableModels([]); return; }
    const cached = loadCachedModels(pid);
    if (cached) { setAvailableModels(cached); return; }
    const preset = PROVIDERS.find(p => p.id === pid);
    setAvailableModels(preset?.models || []);
  };

  useEffect(() => {
    fetch('/api/novels')
      .then(res => res.json())
      .then(data => {
        if (!data.error && Array.isArray(data)) {
          // Filter works by the current logged-in user
          setPublishedWorks(data.filter(n => n.author_id === clerkUser?.id));
        } else {
          setPublishedWorks(MOCK_USER.publishedWorks);
        }
      })
      .catch(err => {
        console.error(err);
        setPublishedWorks(MOCK_USER.publishedWorks);
      })
      .finally(() => setIsLoading(false));
  }, [clerkUser]);

  useEffect(() => {
    const existing = loadSettings();
    if (existing) {
      setSavedSettings(existing);
      setProviderId(existing.providerId);
      setApiKey(existing.apiKey);
      setModel(existing.model);
      updateModelsForProvider(existing.providerId);
    } else {
      const preset = PROVIDERS.find(p => p.id === providerId);
      setAvailableModels(preset?.models || []);
    }
  }, []);

  const handleProviderChange = (id: string) => {
    setProviderId(id);
    updateModelsForProvider(id);
    const preset = PROVIDERS.find(p => p.id === id);
    if (preset && preset.models.length > 0) {
      setModel(preset.models[0].id);
    } else {
      setModel('');
    }
  };

  const handleRefreshModels = async () => {
    if (!apiKey.trim() || providerId === 'custom') return;
    const provider = PROVIDERS.find(p => p.id === providerId);
    if (!provider?.baseURL) return;
    setIsFetchingModels(true);
    try {
      const models = await fetchAndCacheModels(providerId, provider.baseURL, apiKey.trim());
      setAvailableModels(models);
      if (models.length > 0 && !models.find(m => m.id === model)) {
        setModel(models[0].id);
      }
    } catch (e: any) {
      alert('获取模型列表失败：' + (e.message || '未知错误'));
    } finally {
      setIsFetchingModels(false);
    }
  };

  const handleSaveSettings = () => {
    if (!apiKey.trim()) { setSaveMessage('请输入 API Key'); return; }
    let finalModel = model;
    if (providerId === 'custom') {
      if (!customBaseURL.trim()) { setSaveMessage('请输入 Base URL'); return; }
      if (!customModel.trim()) { setSaveMessage('请输入模型名称'); return; }
      finalModel = customModel.trim();
    }
    const settings: ApiSettings = { providerId, apiKey: apiKey.trim(), model: finalModel };
    saveSettings(settings);
    setSavedSettings(settings);
    setSaveMessage('已保存');
    setTimeout(() => setSaveMessage(''), 2000);
  };

  const handleClearSettings = () => {
    clearSettings();
    setSavedSettings(null);
    setApiKey('');
    setModel('');
    setProviderId('deepseek');
    setCustomBaseURL('');
    setCustomModel('');
    setSaveMessage('已清除');
    setTimeout(() => setSaveMessage(''), 2000);
  };

  const renderNovelGrid = (novels: Novel[], emptyMessage: string) => {
    if (novels.length === 0) return <p className="text-[#a1a196] italic py-4">{emptyMessage}</p>;

    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mt-4">
        {novels.map(novel => (
          <Link key={novel.id} to={novel.id === 'new' ? '#' : (clerkUser?.id === novel.author_id ? `/edit/${novel.id}` : `/read/${novel.id}`)} className="group block">
            <div className="aspect-[2/3] bg-[#e5e5df] rounded-lg mb-2 relative overflow-hidden border border-[#e5e5df]">
               <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 bg-black/20 transition-opacity">
                 <span className="bg-white text-[#3a3a32] text-xs px-2 py-1 rounded-full font-medium shadow">
                   {clerkUser?.id === novel.author_id ? '编辑' : '阅读'}
                 </span>
               </div>
            </div>
            <h4 className="font-medium text-sm text-[#3a3a32] line-clamp-1 group-hover:text-[#5a5a40] transition-colors">{novel.title}</h4>
            <p className="text-xs text-[#7a7a6e]">{novel.chapters?.length || 0} 章</p>
          </Link>
        ))}
      </div>
    );
  };

  if (!clerkUser) return null;

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-8 sm:px-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-2xl shadow-sm border border-[#e5e5df] overflow-hidden"
      >
        {/* Profile Header */}
        <div className="h-32 bg-[#e5e5df] relative border-b border-[#e5e5df]">
          <Link 
            to="/profile/edit" 
            className="absolute top-4 right-4 bg-white/80 hover:bg-white text-[#5a5a40] p-2 rounded-full transition-colors shadow-sm"
          >
             <Edit3 className="w-4 h-4" />
          </Link>
        </div>
        
        <div className="px-6 sm:px-10 pb-8 relative z-10">
          <div className="flex flex-col sm:flex-row items-start sm:items-end gap-4 -mt-12 sm:-mt-16 mb-6">
            <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-full border-4 border-white bg-[#fcfaf7] flex items-center justify-center text-3xl font-bold text-[#5a5a40] shadow-md overflow-hidden">
              {clerkUser.imageUrl ? (
                <img src={clerkUser.imageUrl} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                (clerkUser.username || clerkUser.firstName || 'U').charAt(0).toUpperCase()
              )}
            </div>
            <div className="flex-1 pb-2">
              <h1 className="text-2xl font-bold text-[#3a3a32]">{clerkUser.username || clerkUser.firstName || 'User'}</h1>
              <p className="text-[#a1a196] mt-1 max-w-lg text-[10px]">{publishedWorks.length} 部作品 &bull; 0 订阅</p>
              <p className="text-[#7a7a6e] mt-1 max-w-lg">该用户尚未提供个人简介。</p>
            </div>
            <div className="pb-2">
               <SignOutButton>
                 <button className="px-4 py-2 border border-red-200 text-red-600 rounded-full text-sm hover:bg-red-50 transition-colors">退出登录</button>
               </SignOutButton>
            </div>
          </div>

          <div className="flex flex-wrap gap-6 border-y border-[#f0f0eb] py-4 mb-8">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-[#a1a196]" />
              <span className="font-semibold text-[#3a3a32]">0</span>
              <span className="text-[#a1a196] text-sm tracking-widest uppercase text-[10px] font-bold">订阅者</span>
            </div>
            <div className="flex items-center gap-2">
              <Book className="w-5 h-5 text-[#a1a196]" />
              <span className="font-semibold text-[#3a3a32]">{publishedWorks.length}</span>
              <span className="text-[#a1a196] text-sm tracking-widest uppercase text-[10px] font-bold">作品</span>
            </div>
          </div>

          {/* Works Sections */}
          <div className="space-y-10">
            <section>
              <div className="flex items-center justify-between mb-2">
                 <div className="flex items-center gap-2">
                   <Book className="w-5 h-5 text-[#5a5a40]" />
                   <h3 className="text-[10px] font-bold uppercase tracking-widest text-[#a1a196]">已发布作品</h3>
                 </div>
                 <Link to="/edit/new" className="text-xs tracking-wider text-[#5a5a40] font-bold hover:underline">
                   + 新建作品
                 </Link>
              </div>
              {isLoading ? (
                <div className="py-8 text-center text-[#a1a196]">载入中...</div>
              ) : (
                renderNovelGrid(publishedWorks, "您还没有发布任何作品。")
              )}
            </section>

            <section>
              <div className="flex items-center gap-2 mb-2">
                <Heart className="w-5 h-5 text-[#5a5a40]" />
                <h3 className="text-[10px] font-bold uppercase tracking-widest text-[#a1a196]">收藏作品</h3>
              </div>
              {renderNovelGrid([], "您还没有收藏任何作品。")}
            </section>
          </div>

        </div>
      </motion.div>

      {/* API Key Settings */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-white rounded-2xl shadow-sm border border-[#e5e5df] overflow-hidden mt-8"
      >
        <button
          onClick={() => setShowApiSection(!showApiSection)}
          className="w-full px-6 sm:px-10 py-5 flex items-center justify-between hover:bg-[#fcfaf7] transition-colors"
        >
          <div className="flex items-center gap-3">
            <Key className="w-5 h-5 text-[#5a5a40]" />
            <div className="text-left">
              <h3 className="font-bold text-[#3a3a32]">AI API 配置</h3>
              <p className="text-xs text-[#a1a196] mt-0.5">
                {savedSettings
                  ? `${savedSettings.providerId === 'custom' ? '自定义' : PROVIDERS.find(p => p.id === savedSettings.providerId)?.name || savedSettings.providerId} — ${savedSettings.model}`
                  : '未配置 — 点击配置你的 API Key 以使用 AI 功能'}
              </p>
            </div>
          </div>
          <span className={cn(
            "text-xs px-2 py-1 rounded-full font-medium transition-colors",
            savedSettings
              ? "bg-emerald-100 text-emerald-700 border border-emerald-200"
              : "bg-amber-100 text-amber-700 border border-amber-200"
          )}>
            {savedSettings ? '已配置' : '待配置'}
          </span>
        </button>

        {showApiSection && (
          <div className="px-6 sm:px-10 pb-8 border-t border-[#f0f0eb] pt-6 space-y-5">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-[#a1a196] mb-2">模型供应商</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
                {PROVIDERS.map(p => (
                  <button
                    key={p.id}
                    onClick={() => handleProviderChange(p.id)}
                    className={cn(
                      "px-3 py-2.5 rounded-lg text-sm font-medium border transition-colors text-left",
                      providerId === p.id
                        ? "border-[#5a5a40] bg-[#5a5a40]/5 text-[#3a3a32]"
                        : "border-[#e5e5df] text-[#7a7a6e] hover:border-[#d0d0ca]"
                    )}
                  >
                    {p.name}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-[#a1a196] mb-2">API Key</label>
              <div className="relative">
                <input
                  type={showKey ? 'text' : 'password'}
                  value={apiKey}
                  onChange={e => setApiKey(e.target.value)}
                  placeholder="sk-..."
                  className="w-full pl-4 pr-12 py-2.5 border border-[#e5e5df] rounded-lg text-sm font-mono focus:ring-1 focus:ring-[#5a5a40] focus:border-[#5a5a40] outline-none"
                />
                <button
                  onClick={() => setShowKey(!showKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#a1a196] hover:text-[#3a3a32]"
                >
                  {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-[10px] text-[#a1a196] mt-1">
                密钥仅存储在浏览器本地，不会上传到服务器。
                {selectedProvider?.id !== 'custom' && selectedProvider?.baseURL && (
                  <a href={selectedProvider.baseURL.replace('/v1', '')} target="_blank" rel="noreferrer" className="inline-flex items-center gap-0.5 text-[#5a5a40] ml-2 hover:underline">
                    获取 Key <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </p>
            </div>

            {providerId === 'custom' ? (
              <>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-[#a1a196] mb-2">Base URL</label>
                  <input
                    type="text" value={customBaseURL} onChange={e => setCustomBaseURL(e.target.value)}
                    placeholder="https://api.openai.com/v1"
                    className="w-full px-4 py-2.5 border border-[#e5e5df] rounded-lg text-sm focus:ring-1 focus:ring-[#5a5a40] focus:border-[#5a5a40] outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-[#a1a196] mb-2">模型名称</label>
                  <input
                    type="text" value={customModel} onChange={e => setCustomModel(e.target.value)}
                    placeholder="gpt-4.1"
                    className="w-full px-4 py-2.5 border border-[#e5e5df] rounded-lg text-sm focus:ring-1 focus:ring-[#5a5a40] focus:border-[#5a5a40] outline-none"
                  />
                </div>
              </>
            ) : (
              <div>
                <div className="flex items-end justify-between mb-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-[#a1a196]">模型</label>
                  <button
                    onClick={handleRefreshModels}
                    disabled={isFetchingModels || !apiKey.trim()}
                    className="text-[10px] text-[#5a5a40] font-medium hover:underline disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {isFetchingModels ? '获取中...' : '刷新模型列表'}
                  </button>
                </div>
                {availableModels.length > 0 ? (
                  <select
                    value={model}
                    onChange={e => setModel(e.target.value)}
                    className="w-full px-4 py-2.5 border border-[#e5e5df] rounded-lg text-sm bg-white focus:ring-1 focus:ring-[#5a5a40] focus:border-[#5a5a40] outline-none"
                  >
                    {availableModels.map(m => (
                      <option key={m.id} value={m.id}>{m.name}</option>
                    ))}
                  </select>
                ) : (
                  <div className="text-xs text-[#a1a196] py-2.5 px-4 border border-dashed border-[#e5e5df] rounded-lg">
                    请先输入 API Key，然后点击「刷新模型列表」
                  </div>
                )}
              </div>
            )}

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={handleSaveSettings}
                className="flex items-center gap-2 px-5 py-2.5 bg-[#5a5a40] hover:bg-[#3a3a32] text-white text-sm font-medium rounded-full transition-colors shadow-sm"
              >
                <Check className="w-4 h-4" /> 保存配置
              </button>
              {savedSettings && (
                <button
                  onClick={handleClearSettings}
                  className="flex items-center gap-2 px-5 py-2.5 border border-red-200 text-red-600 text-sm font-medium rounded-full hover:bg-red-50 transition-colors"
                >
                  <Trash2 className="w-4 h-4" /> 清除配置
                </button>
              )}
              {saveMessage && (
                <span className={cn("text-xs font-medium", saveMessage === '已保存' ? 'text-emerald-600' : 'text-red-600')}>
                  {saveMessage}
                </span>
              )}
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
