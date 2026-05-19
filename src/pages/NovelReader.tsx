import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { MOCK_NOVELS, Novel } from '../lib/mockData';
import { ChevronLeft, ChevronRight, Menu, X, Settings2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

export function NovelReader() {
  const { id } = useParams();
  const [novel, setNovel] = useState<Novel | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeChapterIndex, setActiveChapterIndex] = useState(0);
  const [showDirectory, setShowDirectory] = useState(false);
  const [theme, setTheme] = useState<'light' | 'sepia' | 'dark'>('light');

  useEffect(() => {
    fetch(`/api/novels/${id}`)
      .then(res => res.json())
      .then(data => {
        if (!data.error) {
          setNovel(data);
        } else {
          // Fallback to mock
          const existing = MOCK_NOVELS.find(n => n.id === id);
          if (existing) setNovel(existing);
        }
      })
      .catch(err => {
        console.error(err);
        const existing = MOCK_NOVELS.find(n => n.id === id);
        if (existing) setNovel(existing);
      })
      .finally(() => setIsLoading(false));
  }, [id]);

  if (isLoading) {
    return <div className="flex h-[calc(100vh-4rem)] w-full items-center justify-center text-[#a1a196]">载入中...</div>;
  }

  if (!novel) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8">
        <h2 className="text-2xl font-bold text-[#3a3a32] mb-4">没有找到该小说</h2>
        <Link to="/" className="text-[#5a5a40] hover:underline">返回书架</Link>
      </div>
    );
  }

  const activeChapter = novel.chapters[activeChapterIndex];
  const hasNext = activeChapterIndex < novel.chapters.length - 1;
  const hasPrev = activeChapterIndex > 0;

  const bgColors = {
    light: 'bg-[#fcfaf7] text-[#3a3a32]',
    sepia: 'bg-[#f4ecd8] text-[#5b4636]',
    dark: 'bg-gray-900 text-gray-100',
  };

  return (
    <div className={cn("min-h-[calc(100vh-4rem)] w-full flex flex-col transition-colors duration-300", bgColors[theme])}>
      
      {/* Reader Header */}
      <div className={cn(
        "sticky top-0 z-30 flex items-center justify-between px-4 py-3 border-b backdrop-blur-md transition-colors",
        theme === 'dark' ? 'border-gray-800 bg-gray-900/80' : 'border-[#f0f0eb] bg-[#fcfaf7]/80',
        theme === 'sepia' && 'bg-[#f4ecd8]/80 border-[#e0d6bd]'
      )}>
        <button onClick={() => setShowDirectory(true)} className="p-2 -ml-2 rounded-full hover:bg-black/5" title="目录">
          <Menu className="w-5 h-5" />
        </button>
        <div className="text-center truncate flex-1 px-4">
          <h1 className="text-sm font-semibold truncate">{novel.title}</h1>
          <p className="text-xs opacity-70 truncate">{activeChapter?.title}</p>
        </div>
        <div className="flex items-center gap-1">
          {/* Simple Theme Toggle */}
           <button onClick={() => setTheme('light')} className={cn("w-6 h-6 rounded-full border shadow-sm", theme === 'light' ? 'ring-2 ring-[#5a5a40]' : '')} style={{ backgroundColor: '#ffffff' }} />
           <button onClick={() => setTheme('sepia')} className={cn("w-6 h-6 rounded-full border shadow-sm", theme === 'sepia' ? 'ring-2 ring-[#5a5a40]' : '')} style={{ backgroundColor: '#f4ecd8' }} />
           <button onClick={() => setTheme('dark')} className={cn("w-6 h-6 rounded-full border shadow-sm", theme === 'dark' ? 'ring-2 ring-[#5a5a40]' : '')} style={{ backgroundColor: '#111827' }} />
        </div>
      </div>

      {/* Directory Overlay */}
      <AnimatePresence>
        {showDirectory && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-40"
              onClick={() => setShowDirectory(false)}
            />
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', bounce: 0, duration: 0.4 }}
              className={cn(
                "fixed inset-y-0 left-0 w-80 shadow-2xl z-50 flex flex-col",
                theme === 'dark' ? 'bg-gray-900' : 'bg-[#fcfaf7]',
                theme === 'sepia' && 'bg-[#f4ecd8]'
              )}
            >
              <div className="p-4 border-b flex justify-between items-center" style={{ borderColor: 'inherit' }}>
                <h2 className="font-bold text-lg">目录</h2>
                <button onClick={() => setShowDirectory(false)} className="p-1 rounded-full hover:bg-black/5">
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="p-4 border-b border-[#e5e5df]">
                <h3 className="font-semibold mb-1">{novel.title}</h3>
                <p className="text-xs opacity-70 mb-2">作者 {novel.author}</p>
                <p className="text-sm opacity-80 line-clamp-3 italic">{novel.description}</p>
              </div>

              <div className="flex-1 overflow-y-auto p-2">
                {novel.chapters.map((chapter, idx) => (
                  <button
                    key={chapter.id}
                    onClick={() => {
                      setActiveChapterIndex(idx);
                      setShowDirectory(false);
                      window.scrollTo(0, 0);
                    }}
                    className={cn(
                      "w-full text-left px-4 py-3 rounded-lg text-sm transition-colors",
                      activeChapterIndex === idx 
                        ? (theme === 'dark' ? 'bg-indigo-900/50 text-indigo-200' : 'bg-[#5a5a40] text-white font-medium')
                        : 'hover:bg-black/5'
                    )}
                  >
                    {chapter.title}
                  </button>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Content Area */}
      <div className="flex-1 max-w-2xl mx-auto w-full px-4 sm:px-8 py-12">
        {activeChapter ? (
          <article className="prose prose-lg md:prose-xl font-serif max-w-none">
            <h2 className={cn("text-3xl sm:text-4xl font-bold mb-12 text-center", theme === 'dark' ? 'text-gray-100' : 'text-[#3a3a32]')}>{activeChapter.title}</h2>
            <div className="whitespace-pre-wrap leading-loose">
              {activeChapter.content}
            </div>
          </article>
        ) : (
          <div className="text-center opacity-50 italic mt-20">
            本章暂无内容。
          </div>
        )}

        {/* Navigation Footer */}
        <div className="mt-24 pt-8 border-t flex justify-between items-center" style={{ borderColor: 'inherit', opacity: 0.3 }}>
           <button
             disabled={!hasPrev}
             onClick={() => { setActiveChapterIndex(p => p - 1); window.scrollTo(0,0); }}
             className="flex items-center gap-2 px-4 py-2 rounded-full hover:bg-black/5 disabled:opacity-30 disabled:cursor-not-allowed"
           >
             <ChevronLeft className="w-5 h-5" />
             <span className="hidden sm:inline">上一章</span>
           </button>
           <div className="text-sm opacity-60">
             {activeChapterIndex + 1} / {novel.chapters.length}
           </div>
           <button
             disabled={!hasNext}
             onClick={() => { setActiveChapterIndex(p => p + 1); window.scrollTo(0,0); }}
             className="flex items-center gap-2 px-4 py-2 rounded-full hover:bg-black/5 disabled:opacity-30 disabled:cursor-not-allowed"
           >
             <span className="hidden sm:inline">下一章</span>
             <ChevronRight className="w-5 h-5" />
           </button>
        </div>
      </div>

    </div>
  );
}
