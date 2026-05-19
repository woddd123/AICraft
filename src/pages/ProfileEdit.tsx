import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MOCK_USER } from '../lib/mockData';
import { Camera, Save, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

export function ProfileEdit() {
  const navigate = useNavigate();
  const [username, setUsername] = useState(MOCK_USER.username);
  const [bio, setBio] = useState(MOCK_USER.bio);
  
  const handleSave = () => {
    // In a real app, send to backend
    MOCK_USER.username = username;
    MOCK_USER.bio = bio;
    navigate('/profile');
  };

  return (
    <div className="w-full max-w-2xl mx-auto px-4 py-8 sm:px-6">
      <Link to="/profile" className="inline-flex items-center gap-2 text-[#7a7a6e] hover:text-[#3a3a32] mb-6 transition-colors">
        <ArrowLeft className="w-4 h-4" />
        返回个人信息
      </Link>

      <div className="bg-white rounded-2xl shadow-sm border border-[#e5e5df] p-6 sm:p-8">
        <h1 className="text-2xl font-bold text-[#3a3a32] mb-8">编辑个人资料</h1>

        <div className="flex flex-col sm:flex-row gap-8">
          {/* Avatar Section */}
          <div className="flex flex-col items-center gap-4">
             <div className="relative w-32 h-32 rounded-full bg-[#fcfaf7] border border-[#5a5a40] flex items-center justify-center group overflow-hidden border-2">
               {MOCK_USER.avatarUrl ? (
                 <img src={MOCK_USER.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
               ) : (
                 <span className="text-4xl font-bold text-[#5a5a40]">{username.charAt(0) || '?'}</span>
               )}
               <button className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity">
                 <Camera className="w-6 h-6 mb-1" />
                 <span className="text-xs font-medium">更改头像</span>
               </button>
             </div>
             <p className="text-xs text-[#a1a196]">JPG, GIF 或 PNG格式。最大允许 2MB。</p>
          </div>

          {/* Form Section */}
          <div className="flex-1 space-y-5">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-[#a1a196] mb-1">用户名</label>
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                className="w-full px-4 py-2 border border-[#e5e5df] rounded-md shadow-sm focus:ring-[#5a5a40] focus:border-[#5a5a40] outline-none"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-[#a1a196] mb-1">个人简介</label>
              <textarea
                rows={4}
                value={bio}
                onChange={e => setBio(e.target.value)}
                className="w-full px-4 py-2 border border-[#e5e5df] rounded-md shadow-sm focus:ring-[#5a5a40] focus:border-[#5a5a40] outline-none resize-none"
                placeholder="向世界介绍一下你自己吧..."
              />
            </div>

            <div className="pt-4 flex justify-end">
              <button 
                onClick={handleSave}
                className="flex items-center gap-2 bg-[#5a5a40] hover:bg-[#3a3a32] text-white px-6 py-2.5 rounded-full font-medium transition-colors shadow-sm"
              >
                <Save className="w-4 h-4" />
                保存更改
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
