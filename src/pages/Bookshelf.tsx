import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { Eye, BookOpen } from 'lucide-react';
import { MOCK_NOVELS, Novel } from '../lib/mockData';

export function Bookshelf() {
  const [novels, setNovels] = useState<Novel[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch('/api/novels')
      .then(res => res.json())
      .then(data => {
        if (!data.error && Array.isArray(data) && data.length > 0) {
          setNovels(data);
        } else {
          setNovels(MOCK_NOVELS); // fallback
        }
      })
      .catch(err => {
        console.error(err);
        setNovels(MOCK_NOVELS); // fallback
      })
      .finally(() => setIsLoading(false));
  }, []);

  if (isLoading) {
    return <div className="flex h-[calc(100vh-4rem)] w-full items-center justify-center text-[#a1a196]">载入中...</div>;
  }

  return (
    <div className="w-full max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex justify-between items-end mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-[#3a3a32]">书架</h1>
          <p className="text-[#7a7a6e] mt-2">探索各种生成的精彩小说世界。</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {novels.map((novel, i) => (
          <motion.div
            key={novel.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="group relative flex flex-col bg-white border border-[#e5e5df] rounded-2xl overflow-hidden hover:shadow-lg transition-all duration-300"
          >
            <div className="aspect-[2/3] bg-[#e5e5df] relative">
              {/* Fallback cover visual */}
              <div className="absolute inset-0 flex items-center justify-center text-[#a1a196] opacity-50 group-hover:scale-110 transition-transform duration-500">
                <BookOpen className="w-24 h-24" />
              </div>
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center backdrop-blur-sm">
                <Link
                  to={`/read/${novel.id}`}
                  className="px-6 py-2 bg-white text-[#3a3a32] font-medium rounded-full cursor-pointer hover:scale-105 transition-transform"
                >
                  开始阅读
                </Link>
              </div>
            </div>
            <div className="p-5 flex-1 flex flex-col">
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-bold text-lg text-[#3a3a32] line-clamp-2 leading-tight">
                  <Link to={`/read/${novel.id}`} className="hover:text-[#5a5a40]">
                    {novel.title}
                  </Link>
                </h3>
              </div>
              <p className="text-sm text-[#7a7a6e] mb-4 line-clamp-2 flex-1">
                {novel.description}
              </p>
              <div className="flex items-center justify-between mt-auto pt-4 border-t border-[#f0f0eb]">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-[#f5f5f0] border border-[#e5e5df] flex items-center justify-center text-xs font-bold text-[#5a5a40]">
                    {novel.author.charAt(0)}
                  </div>
                  <span className="text-xs font-medium text-[#7a7a6e]">{novel.author}</span>
                </div>
                <div className="flex items-center gap-1 text-xs text-[#a1a196]">
                  <Eye className="w-3 h-3" />
                  {novel.views.toLocaleString()}
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
