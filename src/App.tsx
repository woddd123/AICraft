import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ClerkProvider, SignIn, SignUp, useAuth } from '@clerk/clerk-react';
import { zhCN } from '@clerk/localizations';
import React, { useState, useEffect } from 'react';
import { Layout } from './components/Layout';
import { Bookshelf } from './pages/Bookshelf';
import { NovelEditor } from './pages/NovelEditor';
import { NovelReader } from './pages/NovelReader';
import { Profile } from './pages/Profile';
import { ProfileEdit } from './pages/ProfileEdit';

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isLoaded, isSignedIn } = useAuth();
  const [showTimeoutMsg, setShowTimeoutMsg] = useState(false);

  useEffect(() => {
    let timer: any;
    if (!isLoaded) {
      timer = setTimeout(() => {
        setShowTimeoutMsg(true);
      }, 4000);
    }
    return () => clearTimeout(timer);
  }, [isLoaded]);
  
  if (!isLoaded) {
    return (
      <div className="flex flex-col h-[calc(100vh-4rem)] w-full items-center justify-center bg-[#fcfaf7] p-4 text-center">
        <div className="text-[#a1a196] text-sm flex items-center gap-2 mb-4">
          <div className="w-4 h-4 border-2 border-[#5a5a40] border-t-transparent rounded-full animate-spin" />
          身份验证服务加载中...
        </div>
        {showTimeoutMsg && (
          <div className="max-w-md bg-white p-5 rounded-lg shadow-sm border border-red-200 text-red-600 text-sm animate-in fade-in zoom-in duration-300">
            <p className="font-bold mb-2">服务加载无响应</p>
            <p className="text-[#7a7a6e] leading-relaxed">
              由于预览窗口（iframe）的跨域及第三方 Cookie 限制，Clerk 身份验证可能无法正常连接。
              <br /><br />
              💡 建议您<a href={window.location.href} target="_blank" rel="noreferrer" className="font-bold underline text-indigo-600 mx-1">在新标签页中打开</a>本应用以继续。
            </p>
          </div>
        )}
      </div>
    );
  }
  
  if (!isSignedIn) {
    return <Navigate to="/sign-in" replace />;
  }
  
  return <>{children}</>;
}

export default function App() {
  if (!PUBLISHABLE_KEY || PUBLISHABLE_KEY === 'pk_test_...') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#fcfaf7] text-[#3a3a32] p-4 text-center">
        <div className="bg-white p-8 rounded-xl border border-[#e5e5df] shadow-sm max-w-md">
          <h2 className="font-bold text-xl mb-4">缺失 Clerk 密钥</h2>
          <p className="text-[#7a7a6e] text-sm mb-4">
            请在 .env 文件中添加 VITE_CLERK_PUBLISHABLE_KEY 开启身份认证。
          </p>
        </div>
      </div>
    );
  }

  return (
    <ClerkProvider publishableKey={PUBLISHABLE_KEY} localization={zhCN} signInUrl="/sign-in" signUpUrl="/sign-up">
      <Router>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Bookshelf />} />
            <Route path="read/:id" element={<NovelReader />} />
            
            {/* Auth Routes */}
            <Route path="sign-in/*" element={
              <div className="flex h-[calc(100vh-4rem)] items-center justify-center bg-[#fcfaf7]">
                <SignIn routing="path" path="/sign-in" fallbackRedirectUrl="/" />
              </div>
            } />
            <Route path="sign-up/*" element={
              <div className="flex h-[calc(100vh-4rem)] items-center justify-center bg-[#fcfaf7]">
                <SignUp routing="path" path="/sign-up" fallbackRedirectUrl="/" />
              </div>
            } />

            {/* Protected Routes */}
            <Route path="edit/:id" element={<ProtectedRoute><NovelEditor /></ProtectedRoute>} />
            <Route path="profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
            <Route path="profile/edit" element={<ProtectedRoute><ProfileEdit /></ProtectedRoute>} />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </Router>
    </ClerkProvider>
  );
}
