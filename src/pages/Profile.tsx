import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { MOCK_USER, Novel } from '../lib/mockData';
import { Edit3, Book, Heart, Users } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';
import { useUser, SignOutButton } from '@clerk/clerk-react';

export function Profile() {
  const { user: clerkUser } = useUser();
  const [publishedWorks, setPublishedWorks] = useState<Novel[]>([]);
  const [isLoading, setIsLoading] = useState(true);

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
    </div>
  );
}
