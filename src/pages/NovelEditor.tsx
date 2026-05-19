import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MOCK_NOVELS, Novel, Chapter } from '../lib/mockData';
import { Menu, Settings, Image as ImageIcon, FileText, ChevronLeft, ChevronRight, Plus, Eye, Save, Loader2, Library, Sparkles, Send, X, Bot, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { Link } from 'react-router-dom';
import { useUser } from '@clerk/clerk-react';

const AGENTS = [
  { id: 'worldbuilding', name: '世界观', icon: '🌍', desc: '设定世界规则、势力、等级体系等' },
  { id: 'outline', name: '大纲主线', icon: '🗺️', desc: '撰写剧情总纲、章节走向' },
  { id: 'character', name: '人设塑造', icon: '🎭', desc: '设计人物性格、背景与行为逻辑' },
  { id: 'writer', name: '正文执笔', icon: '✍️', desc: '输出正文文字、场景渲染、角色互动' },
  { id: 'pacing', name: '节奏爽点', icon: '📈', desc: '把控剧情节奏、设计爽点与打脸' },
  { id: 'polisher', name: '润色校对', icon: '✨', desc: '精修语病、遣词造句、逻辑纠错' },
  { id: 'progress', name: '进度编辑', icon: '📅', desc: '统筹全局、强制排稿、排错避坑' },
];

export function NovelEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useUser();
  const isNew = id === 'new';

  const [novel, setNovel] = useState<Novel>({
      id: 'new',
      title: '未命名小说',
      author: '创作者',
      description: '',
      status: 'draft',
      views: 0,
      chapters: [],
  });
  const [isLoading, setIsLoading] = useState(!isNew);
  const [isSaving, setIsSaving] = useState(false);

  const [activeTab, setActiveTab] = useState<'drafts' | 'info' | 'cover' | 'chapters'>('chapters');
  const [activeChapterId, setActiveChapterId] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isAiPanelOpen, setIsAiPanelOpen] = useState(false);
  const [userNovels, setUserNovels] = useState<Novel[]>([]);
  const [isLoadingDrafts, setIsLoadingDrafts] = useState(false);

  // AI Copilot state
  const [chatSessionId, setChatSessionId] = useState<string | null>(null);
  const [chatSessions, setChatSessions] = useState<{id: string, title: string}[]>([]);
  const [chatMessages, setChatMessages] = useState<{id: string, sender: string, text: string}[]>([]);
  const [streamingText, setStreamingText] = useState('');
  const [aiPrompt, setAiPrompt] = useState('');
  const [isAiGenerating, setIsAiGenerating] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  const [showMentionMenu, setShowMentionMenu] = useState(false);
  const [mentionFilter, setMentionFilter] = useState('');
  const [mentionIndex, setMentionIndex] = useState(0);

  const activeChapter = novel.chapters.find(c => c.id === activeChapterId);

  useEffect(() => {
    if (novel.id && novel.id !== 'new') {
      fetch(`/api/novels/${novel.id}/mchats`)
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) {
            setChatSessions(data);
            if (data.length > 0 && !chatSessionId) {
              loadSession(data[0].id);
            }
          }
        })
        .catch(console.error);
    }
  }, [novel.id]);

  const loadSession = (id: string) => {
    fetch(`/api/mchats/${id}/messages`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setChatMessages(data);
          setChatSessionId(id);
        }
      })
      .catch(console.error);
  };

  const createNewSession = async () => {
    if (novel.id === 'new') {
      alert("请先在左侧输入小说标题并触发保存后，再创建新会话！");
      return;
    }
    try {
      const res = await fetch(`/api/novels/${novel.id}/mchats`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: '新会话 ' + new Date().toLocaleString() })
      });
      const data = await res.json();
      setChatSessions(prev => [data, ...prev]);
      setChatSessionId(data.id);
      setChatMessages([]);
    } catch (e) {
      console.error(e);
    }
  };

  const deleteSession = async (id: string) => {
    if (!confirm("确定删除此会话吗？")) return;
    try {
      await fetch(`/api/mchats/${id}`, { method: 'DELETE' });
      setChatSessions(prev => prev.filter(s => s.id !== id));
      if (chatSessionId === id) {
        setChatSessionId(null);
        setChatMessages([]);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleAiPromptChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const ObjectValue = e.target.value;
    setAiPrompt(ObjectValue);
    
    const cursorP = e.target.selectionStart;
    const textBeforeCursor = ObjectValue.slice(0, cursorP);
    const match = textBeforeCursor.match(/@(\S*)$/);
    
    if (match) {
      setShowMentionMenu(true);
      setMentionFilter(match[1]);
      setMentionIndex(0);
    } else {
      setShowMentionMenu(false);
    }
  };

  const insertMention = (agentName: string) => {
    const cursorP = textareaRef.current?.selectionStart || aiPrompt.length;
    const textBeforeCursor = aiPrompt.slice(0, cursorP);
    const textAfterCursor = aiPrompt.slice(cursorP);
    
    const match = textBeforeCursor.match(/@(\S*)$/);
    if (match) {
      const newTextBefore = textBeforeCursor.slice(0, match.index) + '@' + agentName + ' ';
      setAiPrompt(newTextBefore + textAfterCursor);
      setShowMentionMenu(false);
      
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.focus();
          textareaRef.current.selectionStart = newTextBefore.length;
          textareaRef.current.selectionEnd = newTextBefore.length;
        }
      }, 0);
    }
  };

  const handleAiSubmit = async () => {
    if (!aiPrompt.trim() || isAiGenerating) return;
    
    if (novel.id === 'new') {
      alert("请先在左侧输入小说标题等待自动保存（生成小说id）后，再进行对话！");
      return;
    }

    const userMessage = { id: Date.now().toString(), sender: 'user', text: aiPrompt.trim() };
    setChatMessages(prev => [...prev, userMessage]);
    setAiPrompt('');
    setIsAiGenerating(true);
    setStreamingText('');

    let currentSessionId = chatSessionId;
    if (!currentSessionId) {
       try {
         const res = await fetch(`/api/novels/${novel.id}/mchats`, {
           method: 'POST',
           headers: { 'Content-Type': 'application/json' },
           body: JSON.stringify({ title: userMessage.text.substring(0, 15) + '...' })
         });
         const data = await res.json();
         setChatSessions(prev => [data, ...prev]);
         currentSessionId = data.id;
         setChatSessionId(data.id);
       } catch (e) {
         console.error(e);
       }
    }

    if (currentSessionId) {
      fetch(`/api/mchats/${currentSessionId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [userMessage] })
      }).catch(console.error);
    }
    
    // Provide some context
    let contextStr = `小说标题：${novel.title}\n简介：${novel.description}\n\n【已有章节创作进度】\n`;
    novel.chapters.forEach((c, idx) => {
      // Provide full text for the last 3 chapters for better continuity
      if (idx >= novel.chapters.length - 3) {
        contextStr += `第${c.order || idx + 1}章 [${c.title}]:\n正文：${c.content}\n\n`;
      } else {
        const content = c.content || '';
        contextStr += `第${c.order || idx + 1}章 [${c.title}]:\n片段：${content.substring(0, 300)}...${content.slice(-300)}\n\n`;
      }
    });

    if (activeChapter) {
      contextStr += `\n【目前用户光标正聚焦在章节】: ${activeChapter.title}\n完整正文：\n${activeChapter.content || '(空)'}\n`;
    }

    // Explicitly add mention support
    if (userMessage.text.includes('@')) {
      contextStr += `\n\n注意：用户刚刚在消息中使用了 \`@\` 提及了某位编辑，请被\@到的编辑优先响应、重点回应，其他编辑可作为辅助。`;
    }

    try {
      const response = await fetch('/api/ai/groupchat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          generateContext: contextStr,
          messages: [...chatMessages, userMessage]
        })
      });

      if (!response.body) throw new Error('No readable stream');
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let accumulatedText = '';
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value);
        const lines = chunk.split('\n\n');
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const dataStr = line.slice(6);
            if (dataStr === '[DONE]') {
              break;
            }
            try {
              const data = JSON.parse(dataStr);
              if (data.text) {
                accumulatedText += data.text;
                setStreamingText(accumulatedText);
                messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
              }
              if (data.error) {
                console.error("AI Error:", data.error);
                accumulatedText += "\n\n[系统错误: " + data.error + "]";
                setStreamingText(accumulatedText);
              }
            } catch (e) {
              // Ignore partial JSON
            }
          }
        }
      }
      
      // Parse the accumulated text into messages and commit
      if (accumulatedText) {
        const parsed = parseChatStr(accumulatedText);
        const newMessages = parsed.map((p, i) => ({ id: Date.now().toString() + i, sender: p.sender, text: p.text }));
        setChatMessages(prev => [...prev, ...newMessages]);
        
        if (currentSessionId && newMessages.length > 0) {
          fetch(`/api/mchats/${currentSessionId}/messages`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ messages: newMessages })
          }).catch(console.error);
        }

        // Auto-update editor contents based on specific XML tags
        const titleMatch = accumulatedText.match(/<update_title>([\s\S]*?)<\/update_title>/);
        if (titleMatch) setNovel(prev => ({ ...prev, title: titleMatch[1].trim() }));

        const descMatch = accumulatedText.match(/<update_desc>([\s\S]*?)<\/update_desc>/);
        if (descMatch) setNovel(prev => ({ ...prev, description: descMatch[1].trim() }));

        const chapterTitleMatch = accumulatedText.match(/<update_chapter_title>([\s\S]*?)<\/update_chapter_title>/);
        if (chapterTitleMatch && activeChapter) {
           handleChapterUpdate(activeChapter.id, undefined, chapterTitleMatch[1].trim());
        }

        const chapterContentMatch = accumulatedText.match(/<update_chapter_content>([\s\S]*?)<\/update_chapter_content>/);
        if (chapterContentMatch && activeChapter) {
           handleChapterUpdate(activeChapter.id, chapterContentMatch[1].trim(), undefined);
        }

        const createChapterTitleMatch = accumulatedText.match(/<create_chapter_title>([\s\S]*?)<\/create_chapter_title>/);
        const createChapterContentMatch = accumulatedText.match(/<create_chapter_content>([\s\S]*?)<\/create_chapter_content>/);
        
        if (createChapterTitleMatch || createChapterContentMatch) {
          const newId = Date.now().toString() + Math.random().toString(36).substring(7);
          const newTitle = createChapterTitleMatch ? createChapterTitleMatch[1].trim() : '新章节';
          const newContent = createChapterContentMatch ? createChapterContentMatch[1].trim() : '';
          
          setNovel(prev => {
            // Very basic deduplication: check if the exact same chapter already exists at the end
            const lastChapter = prev.chapters[prev.chapters.length - 1];
            if (lastChapter && lastChapter.title === newTitle && lastChapter.content === newContent) {
              return prev;
            }
            return {
              ...prev,
              chapters: [...prev.chapters, { id: newId, title: newTitle, content: newContent }]
            };
          });
          setActiveChapterId(newId);
        }
      }
    } catch (e) {
      console.error(e);
      setChatMessages(prev => [...prev, { id: Date.now().toString(), sender: '系统', text: "请求失败，请稍后重试。" }]);
    } finally {
      setIsAiGenerating(false);
      setStreamingText('');
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  };

  const parseChatStr = (raw: string) => {
    const parts = raw.split(/(?:^|\n)\[(.*?)\]:\s*/);
    const result: { sender: string, text: string }[] = [];
    if (parts[0] && parts[0].trim()) {
      result.push({ sender: '系统', text: parts[0].trim() });
    }
    for (let i = 1; i < parts.length; i += 2) {
       result.push({ sender: parts[i], text: (parts[i+1] || '').trim() });
    }
    return result;
  };

  const handleInsertAiContent = (text: string) => {
    if (!activeChapter) {
      alert("请先在左侧选择或新建一个章节！");
      return;
    }
    if (text) {
      const cleanText = text
        .replace(/<update_title>[\s\S]*?<\/update_title>/g, '')
        .replace(/<update_desc>[\s\S]*?<\/update_desc>/g, '')
        .replace(/<update_chapter_title>[\s\S]*?<\/update_chapter_title>/g, '')
        .replace(/<update_chapter_content>[\s\S]*?<\/update_chapter_content>/g, '')
        .replace(/<create_chapter_title>[\s\S]*?<\/create_chapter_title>/g, '')
        .replace(/<create_chapter_content>[\s\S]*?<\/create_chapter_content>/g, '')
        .trim();
      
      if (!cleanText) {
        alert("该内容仅包含自动更新指令且已执行完毕，没有正文需要插入。");
        return;
      }

      handleChapterUpdate(activeChapter.id, (activeChapter.content || '') + (activeChapter.content ? '\n\n' : '') + cleanText);
    }
  };

  const renderMessageText = (text: string) => {
    // Strip XML update tags for visual cleaner chat
    const cleanText = text
      .replace(/<update_title>[\s\S]*?<\/update_title>/g, '')
      .replace(/<update_desc>[\s\S]*?<\/update_desc>/g, '')
      .replace(/<update_chapter_title>[\s\S]*?<\/update_chapter_title>/g, '')
      .replace(/<update_chapter_content>[\s\S]*?<\/update_chapter_content>/g, '')
      .replace(/<create_chapter_title>[\s\S]*?<\/create_chapter_title>/g, '')
      .replace(/<create_chapter_content>[\s\S]*?<\/create_chapter_content>/g, '')
      .trim();

    // Basic text formatting for bold
    const boldRegex = /\*\*(.*?)\*\*/g;
    const parts = cleanText.split(boldRegex);
    return parts.map((part, i) => i % 2 === 1 ? <strong key={i} className="font-bold text-[#3a3a32]">{part}</strong> : part);
  };

  const getAgentColor = (name: string) => {
    const colors: Record<string, string> = {
      '世界观': 'bg-blue-100 text-blue-800 border-blue-200',
      '大纲主线': 'bg-purple-100 text-purple-800 border-purple-200',
      '人设塑造': 'bg-pink-100 text-pink-800 border-pink-200',
      '正文执笔': 'bg-amber-100 text-amber-800 border-amber-200',
      '节奏爽点': 'bg-red-100 text-red-800 border-red-200',
      '润色校对': 'bg-emerald-100 text-emerald-800 border-emerald-200',
      '进度编辑': 'bg-[#5a5a40] text-white border-[#5a5a40]'
    };
    return colors[name] || 'bg-gray-100 text-gray-800 border-gray-200';
  };

  useEffect(() => {
    if (activeTab === 'drafts') {
      setIsLoadingDrafts(true);
      fetch('/api/novels')
        .then(res => res.json())
        .then(data => {
          if (!data.error && Array.isArray(data)) {
            setUserNovels(data.filter(n => n.author_id === user?.id));
          }
        })
        .finally(() => setIsLoadingDrafts(false));
    }
  }, [activeTab, user?.id]);

  useEffect(() => {
    if (isNew) {
      setNovel({
        id: 'new',
        title: '未命名小说',
        author: user?.username || user?.firstName || '创作者',
        author_id: user?.id || '',
        description: '',
        status: 'draft',
        views: 0,
        chapters: [],
      } as any);
      setIsLoading(false);
    } else {
      fetch(`/api/novels/${id}`)
        .then(res => res.json())
        .then(data => {
          if (!data.error) {
            setNovel(data);
            if (data.chapters && data.chapters.length > 0) {
              setActiveChapterId(data.chapters[0].id);
            }
          } else {
             // Fallback to mock data
             const existingNovel = MOCK_NOVELS.find(n => n.id === id);
             if (existingNovel) {
               setNovel(existingNovel);
               if (existingNovel.chapters.length > 0) setActiveChapterId(existingNovel.chapters[0].id);
             }
          }
        })
        .catch(err => console.error(err))
        .finally(() => setIsLoading(false));
    }
  }, [id, user, isNew]);

  const handleUpdate = (field: keyof Novel, value: any) => {
    setNovel(prev => ({ ...prev, [field]: value }));
  };

  const handleChapterUpdate = (chapterId: string, content?: string, title?: string) => {
    setNovel(prev => ({
      ...prev,
      chapters: prev.chapters.map(c => 
        c.id === chapterId 
          ? { 
              ...c, 
              content: content !== undefined ? content : c.content,
              title: title !== undefined ? title : c.title
            } 
          : c
      )
    }));
  };

  const handleAddChapter = () => {
    const newChapter: Chapter = {
      id: `c${Date.now()}`,
      title: `第 ${novel.chapters.length + 1} 章`,
      content: '',
      order: novel.chapters.length + 1
    };
    setNovel(prev => ({
      ...prev,
      chapters: [...prev.chapters, newChapter]
    }));
    setActiveChapterId(newChapter.id);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const payload = { ...novel };
      if (user) {
        (payload as any).author_id = user.id;
        payload.author = user.username || user.firstName || '创作者';
      }
      
      const res = await fetch('/api/novels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ novel: payload })
      });
      const data = await res.json();
      if (data.success) {
        if (isNew && data.novelId) {
          navigate(`/edit/${data.novelId}`, { replace: true });
        }
      } else {
        alert('保存失败: ' + data.error);
      }
    } catch (e) {
      alert('保存出错！');
    } finally {
      setIsSaving(false);
      // Wait for 1s to remove UI indicator if needed, but we keep it simple here
    }
  };

  if (isLoading) {
    return <div className="flex h-[calc(100vh-4rem)] w-full items-center justify-center text-[#a1a196]">处理中...</div>;
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] w-full overflow-hidden bg-[#fcfaf7] relative">
      {/* Sidebar Drawer */}
      <AnimatePresence initial={false}>
        {isSidebarOpen && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 320, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            className="h-full bg-[#f5f5f0] border-r border-[#e5e5df] shadow-sm z-10 flex flex-col flex-shrink-0"
          >
            {/* Sidebar Tabs */}
            <div className="flex p-2 border-b border-[#e5e5df]">
              {[
                { id: 'drafts', icon: Library, label: '草稿箱' },
                { id: 'info', icon: Settings, label: '信息' },
                { id: 'cover', icon: ImageIcon, label: '封面' },
                { id: 'chapters', icon: FileText, label: '章节' },
              ].map((tab) => (
                 <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={cn(
                    "flex-1 p-2 flex flex-col items-center justify-center rounded-lg transition-colors",
                    activeTab === tab.id ? "bg-white text-[#5a5a40] shadow-sm border border-[#e5e5df]" : "text-[#7a7a6e] hover:bg-[#e5e5df]/50"
                  )}
                 >
                   <tab.icon className="w-5 h-5 mb-1" />
                   <span className="text-[10px] font-medium uppercase tracking-wider">{tab.label}</span>
                 </button>
              ))}
            </div>

            {/* Sidebar Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-6">
              {activeTab === 'drafts' && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center mb-2">
                     <h3 className="text-[10px] font-bold uppercase tracking-widest text-[#a1a196]">您的作品</h3>
                     <button
                       onClick={() => navigate('/edit/new')}
                       className="p-1 rounded bg-[#e5e5df] text-[#5a5a40] hover:bg-stone-200"
                       title="新建作品"
                     >
                       <Plus className="w-4 h-4" />
                     </button>
                  </div>
                  {isLoadingDrafts ? (
                    <div className="text-center p-4 text-xs text-[#a1a196]">载入中...</div>
                  ) : userNovels.length > 0 ? (
                    <div className="space-y-2">
                      {userNovels.map(n => (
                        <Link 
                          key={n.id} 
                          to={`/edit/${n.id}`}
                          className={cn(
                            "flex flex-col p-3 rounded-md transition-shadow text-left shadow-sm border",
                            n.id === novel.id 
                              ? "bg-[#5a5a40] text-white border-[#5a5a40]" 
                              : "bg-white border-[#e5e5df] text-[#3a3a32] hover:border-[#5a5a40] opacity-80 hover:opacity-100"
                          )}
                        >
                          <span className="font-medium text-sm line-clamp-1">{n.title || '未命名小说'}</span>
                          <span className={cn("text-xs mt-1", n.id === novel.id ? "text-white/80" : "text-[#7a7a6e]")}>
                            {n.chapters?.length || 0} 章 &bull; {n.status === 'published' ? '已发布' : '草稿'}
                          </span>
                        </Link>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center p-4 bg-[#fcfaf7] rounded-lg border border-dashed border-[#e5e5df]">
                      <p className="text-sm text-[#7a7a6e] mb-2">草稿箱为空</p>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'info' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-[#a1a196] mb-1">小说标题</label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 border border-[#e5e5df] rounded-md shadow-sm focus:ring-[#5a5a40] focus:border-[#5a5a40]"
                      value={novel.title}
                      onChange={(e) => handleUpdate('title', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-[#a1a196] mb-1">简介 / 梗概</label>
                    <textarea
                      rows={6}
                      className="w-full px-3 py-2 border border-[#e5e5df] rounded-md shadow-sm focus:ring-[#5a5a40] focus:border-[#5a5a40] resize-none"
                      value={novel.description}
                      onChange={(e) => handleUpdate('description', e.target.value)}
                    />
                  </div>
                </div>
              )}

              {activeTab === 'cover' && (
                <div className="space-y-4">
                  <div className="aspect-[2/3] bg-[#e5e5df] rounded-lg flex items-center justify-center border-4 border-white shadow-sm overflow-hidden relative group">
                     {novel.coverId ? (
                       <div className="absolute inset-0 bg-[#e5e5df] flex items-center justify-center font-serif text-[#5a5a40]">已生成封面</div>
                     ) : (
                       <div className="text-center p-4">
                         <ImageIcon className="w-8 h-8 text-[#a1a196] mx-auto mb-2" />
                         <p className="text-sm text-[#7a7a6e]">尚未生成封面</p>
                       </div>
                     )}
                  </div>
                  <button className="w-full py-2 border border-[#5a5a40] text-[#5a5a40] rounded-full text-xs hover:bg-[#5a5a40] hover:text-white transition-colors">
                    AI 生成封面
                  </button>
                </div>
              )}

              {activeTab === 'chapters' && (
                <div className="space-y-2">
                  <div className="flex justify-between items-center mb-4">
                     <h3 className="text-[10px] font-bold uppercase tracking-widest text-[#a1a196]">章节 ({novel.chapters.length})</h3>
                     <button 
                       onClick={handleAddChapter}
                       className="p-1 rounded bg-[#e5e5df] text-[#5a5a40] hover:bg-stone-200"
                     >
                       <Plus className="w-4 h-4" />
                     </button>
                  </div>
                  {novel.chapters.map((chapter) => (
                    <button
                      key={chapter.id}
                      onClick={() => setActiveChapterId(chapter.id)}
                      className={cn(
                        "w-full text-left px-3 py-2 rounded-md text-sm transition-colors line-clamp-1",
                        activeChapterId === chapter.id 
                          ? "bg-[#5a5a40] text-white shadow-sm" 
                          : "bg-white border border-[#e5e5df] text-[#3a3a32] shadow-sm opacity-60 hover:opacity-100"
                      )}
                    >
                      {chapter.title}
                    </button>
                  ))}
                  {novel.chapters.length === 0 && (
                    <div className="text-center p-4 bg-[#fcfaf7] rounded-lg border border-dashed border-[#e5e5df]">
                      <p className="text-sm text-[#7a7a6e] mb-2">暂无章节</p>
                      <button onClick={handleAddChapter} className="text-sm text-[#5a5a40] font-medium">添加第一章</button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Editing Area */}
      <div className="flex-1 flex flex-col min-w-0 bg-white">
        {/* Editor Toolbar */}
        <div className="h-16 border-b border-[#f0f0eb] flex items-center justify-between px-8 bg-[#fcfaf7]/50">
          <div className="flex items-center gap-3">
             <button
               onClick={() => setIsSidebarOpen(!isSidebarOpen)}
               className="p-1.5 rounded-md text-[#a1a196] hover:bg-[#e5e5df] transition-colors"
               title={isSidebarOpen ? "关闭侧边栏" : "打开侧边栏"}
             >
               {isSidebarOpen ? <ChevronLeft className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
             </button>
             <div className="h-4 w-[1px] bg-[#e5e5df]" />
             <span className="text-xs text-[#a1a196] truncate max-w-[200px] sm:max-w-xs font-mono">
               {activeChapter ? activeChapter.title : '未选择章节'}
             </span>
          </div>

          <div className="flex items-center gap-2">
             {!isNew && (
               <Link
                 to={`/read/${novel.id}`}
                 className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-medium text-[#3a3a32] border border-[#e5e5df] hover:bg-[#fcfaf7] rounded-full transition-colors"
               >
                 <Eye className="w-4 h-4" />
                 <span className="hidden sm:inline">预览</span>
               </Link>
             )}
             <button 
               onClick={() => setIsAiPanelOpen(!isAiPanelOpen)}
               className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-medium text-white bg-[#5a5a40] hover:bg-[#3a3a32] rounded-full transition-colors shadow-sm"
             >
               <Sparkles className="w-4 h-4" />
               <span className="hidden sm:inline">AI 助手</span>
             </button>
             <button 
               onClick={handleSave} 
               disabled={isSaving}
               className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-medium text-white bg-[#5a5a40] hover:bg-[#3a3a32] rounded-full transition-colors shadow-sm disabled:opacity-50"
             >
               {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
               <span className="hidden sm:inline">{isSaving ? '保存中...' : '保存'}</span>
             </button>
          </div>
        </div>

        {/* Editor Canvas */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 md:p-12 lg:px-24">
          {activeChapter ? (
            <div className="max-w-3xl mx-auto">
              <input
                type="text"
                value={activeChapter.title}
                onChange={(e) => {
                   setNovel(prev => ({
                     ...prev,
                     chapters: prev.chapters.map(c => c.id === activeChapter.id ? { ...c, title: e.target.value } : c)
                   }))
                }}
                className="w-full text-3xl font-bold font-serif text-[#3a3a32] mb-8 border-b-2 border-[#5a5a40] pb-2 focus:ring-0 placeholder-[#e5e5df] bg-transparent outline-none"
                placeholder="章节标题"
              />
              <textarea
                value={activeChapter.content}
                onChange={(e) => handleChapterUpdate(activeChapter.id, e.target.value)}
                className="w-full min-h-[60vh] text-lg leading-relaxed text-[#3a3a32] border-none p-0 focus:ring-0 resize-none font-serif placeholder-[#a1a196] selection:bg-[#5a5a40]/10 bg-transparent outline-none"
                placeholder="在这里开始你的故事..."
              />
            </div>
          ) : (
            <div className="h-full flex items-center justify-center text-[#a1a196]">
               请选择或创建一个章节以开始编辑
            </div>
          )}
        </div>
      </div>

      {/* AI Copilot Panel */}
      <AnimatePresence>
        {isAiPanelOpen && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 450, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            className="h-full bg-white border-l border-[#e5e5df] shadow-xl z-20 flex flex-col flex-shrink-0 relative overflow-hidden"
          >
            <div className="h-16 border-b border-[#f0f0eb] flex items-center justify-between px-3 bg-[#fcfaf7] flex-shrink-0">
               <div className="flex items-center gap-2 max-w-[200px]">
                 <div className="w-8 h-8 rounded-full bg-[#5a5a40] flex items-center justify-center text-white text-[10px] shadow-sm flex-shrink-0 relative">
                   编
                 </div>
                 <div className="flex flex-col overflow-hidden w-full">
                   <div className="flex items-center gap-2">
                     <span className="font-bold text-[#3a3a32] block leading-none text-sm truncate">全息工作群</span>
                     <button onClick={createNewSession} className="text-[#a1a196] hover:text-[#5a5a40] ml-1 pt-0.5 outline-none flex-shrink-0" title="新建会话">
                       <Plus className="w-4 h-4" />
                     </button>
                   </div>
                   <select 
                     className="text-[10px] text-[#7a7a6e] bg-transparent border-none outline-none p-0 mt-1 cursor-pointer truncate w-full"
                     value={chatSessionId || ''}
                     onChange={(e) => {
                       if (e.target.value) {
                         loadSession(e.target.value);
                       }
                     }}
                   >
                     <option value="" disabled>选择新会话...</option>
                     {chatSessions.map(s => (
                       <option key={s.id} value={s.id}>{s.title}</option>
                     ))}
                   </select>
                 </div>
               </div>
               
               <div className="flex items-center gap-1 flex-shrink-0">
                 {chatSessionId && (
                   <button onClick={() => deleteSession(chatSessionId)} className="p-1.5 rounded-md text-[#a1a196] hover:text-red-500 hover:bg-red-50 transition-colors" title="删除当前会话">
                     <Trash2 className="w-4 h-4" />
                   </button>
                 )}
                 <button onClick={() => setIsAiPanelOpen(false)} className="p-1.5 rounded-md text-[#a1a196] hover:bg-[#e5e5df] transition-colors">
                   <X className="w-5 h-5" />
                 </button>
               </div>
            </div>

            <div className="flex-1 overflow-y-auto flex flex-col p-4 bg-[#fcfaf7] gap-3">
              {chatMessages.length === 0 && !isAiGenerating && (
                <div className="m-auto text-center text-[#a1a196] max-w-[280px]">
                   <Bot className="w-12 h-12 mx-auto mb-3 opacity-50 text-[#5a5a40]" />
                   <p className="text-sm font-medium text-[#7a7a6e]">群聊已就绪</p>
                   <p className="text-[10px] mt-2">发送您的需求，所有AI编辑将协同讨论为您产出更优质的内容</p>
                </div>
              )}

              {/* Render confirmed messages */}
              {chatMessages.map(msg => (
                <div key={msg.id} className={cn("flex w-full mb-2", msg.sender === 'user' ? "justify-end" : "justify-start")}>
                  {msg.sender !== 'user' && (
                    <div className={cn("w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold mr-2 mt-1 border shadow-sm", getAgentColor(msg.sender))}>
                      {msg.sender.charAt(0)}
                    </div>
                  )}
                  <div className={cn(
                    "max-w-[85%] rounded-2xl px-4 py-2 text-sm whitespace-pre-wrap leading-relaxed shadow-sm",
                    msg.sender === 'user' 
                      ? "bg-[#5a5a40] text-white rounded-br-none" 
                      : "bg-white border border-[#e5e5df] text-[#3a3a32] rounded-tl-none"
                  )}>
                    {msg.sender !== 'user' && <div className="text-[10px] font-bold opacity-50 mb-1 border-b pb-1 inline-block">{msg.sender}</div>}
                    <div>{renderMessageText(msg.text)}</div>
                    {msg.sender !== 'user' && msg.text.length > 20 && (
                      <div className="mt-2 text-right">
                        <button 
                          onClick={() => handleInsertAiContent(msg.text)}
                          className="text-[10px] text-[#5a5a40] bg-[#f0f0eb] hover:bg-[#e5e5df] px-2 py-1 rounded transition-colors font-medium border border-[#e5e5df]"
                        >
                          使用此内容
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {/* Render streaming messages */}
              {streamingText && parseChatStr(streamingText).map((msg, i) => (
                <div key={"stream"+i} className="flex justify-start w-full mb-2 animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <div className={cn("w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold mr-2 mt-1 border shadow-sm", getAgentColor(msg.sender))}>
                    {msg.sender.charAt(0) || '系'}
                  </div>
                  <div className="max-w-[85%] rounded-2xl rounded-tl-none px-4 py-2 text-sm whitespace-pre-wrap leading-relaxed shadow-sm bg-white border border-[#e5e5df] text-[#3a3a32]">
                    <div className="text-[10px] font-bold opacity-50 mb-1 border-b pb-1 inline-block">{msg.sender || '系统'}</div>
                    <div className="h-full">
                      {renderMessageText(msg.text)}
                      {i === parseChatStr(streamingText).length - 1 && (
                        <span className="inline-block w-1.5 h-3.5 bg-[#5a5a40] ml-1 animate-pulse align-middle" />
                      )}
                    </div>
                  </div>
                </div>
              ))}
              
              <div ref={messagesEndRef} className="h-2" />
            </div>

            {/* Input Area */}
            <div className="p-3 bg-[#fcfaf7] border-t border-[#f0f0eb] flex-shrink-0 relative">
              {showMentionMenu && (
                <div className="absolute bottom-[calc(100%+8px)] left-3 bg-white w-48 rounded-lg shadow-lg border border-[#e5e5df] overflow-hidden z-50 py-1">
                  {AGENTS.filter(a => a.name.includes(mentionFilter)).map((agent, i) => (
                    <button
                      key={agent.id}
                      className={cn(
                        "w-full text-left px-3 py-2 text-xs flex items-center gap-2 hover:bg-[#fcfaf7] transition-colors",
                        i === mentionIndex && "bg-[#f0f0eb]"
                      )}
                      onClick={() => insertMention(agent.name)}
                    >
                      <span className="text-sm">{agent.icon}</span>
                      <span>{agent.name}</span>
                    </button>
                  ))}
                  {AGENTS.filter(a => a.name.includes(mentionFilter)).length === 0 && (
                     <div className="px-3 py-2 text-xs text-[#a1a196]">没找到该编辑</div>
                  )}
                </div>
              )}
              <div className="relative flex items-end bg-white rounded-xl border border-[#e5e5df] shadow-sm focus-within:ring-1 focus-within:ring-[#5a5a40] focus-within:border-[#5a5a40] transition-shadow">
                <textarea
                  ref={textareaRef}
                  rows={Math.max(1, Math.min(5, aiPrompt.split('\n').length))}
                  placeholder="在群里发送您的需求 (如：@正文执笔 写一段剧情...)"
                  value={aiPrompt}
                  onChange={handleAiPromptChange}
                  onKeyDown={(e) => {
                    if (showMentionMenu) {
                      const filtered = AGENTS.filter(a => a.name.includes(mentionFilter));
                      if (e.key === 'ArrowDown') {
                        e.preventDefault();
                        setMentionIndex(prev => (prev + 1) % filtered.length);
                        return;
                      }
                      if (e.key === 'ArrowUp') {
                        e.preventDefault();
                        setMentionIndex(prev => (prev - 1 + filtered.length) % filtered.length);
                        return;
                      }
                      if (e.key === 'Enter' || e.key === 'Tab') {
                        e.preventDefault();
                        if (filtered[mentionIndex]) {
                          insertMention(filtered[mentionIndex].name);
                        }
                        return;
                      }
                      if (e.key === 'Escape') {
                        setShowMentionMenu(false);
                        return;
                      }
                    } else {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleAiSubmit();
                      }
                    }
                  }}
                  className="w-full pl-3 pr-12 py-3 bg-transparent resize-none text-sm text-[#3a3a32] placeholder-[#a1a196] max-h-32 overflow-y-auto outline-none"
                />
                <button 
                  onClick={handleAiSubmit}
                  disabled={isAiGenerating || !aiPrompt.trim()}
                  className="absolute right-2 bottom-2 p-1.5 bg-[#5a5a40] text-white rounded-lg hover:bg-[#3a3a32] transition-colors disabled:opacity-50 disabled:bg-[#a1a196] shadow-sm"
                >
                  {isAiGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4 ml-0.5" />}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
