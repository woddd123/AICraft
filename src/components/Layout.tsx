import { Outlet, Link, useLocation } from 'react-router-dom';
import { BookOpen, UserCircle, Library, PenTool, AlertTriangle } from 'lucide-react';
import { cn } from '../lib/utils';
import { motion } from 'motion/react';
import { SignedIn, SignedOut, UserButton } from '@clerk/clerk-react';
import { useState, useEffect } from 'react';

export function Layout() {
  const location = useLocation();
  const [isIframe, setIsIframe] = useState(false);

  useEffect(() => {
    try {
      setIsIframe(window !== window.top);
    } catch (e) {
      setIsIframe(true);
    }
  }, []);

  const navItems = [
    { name: '书架', path: '/', icon: Library },
    { name: '写作', path: '/edit/new', icon: PenTool },
    { name: '我的', path: '/profile', icon: UserCircle },
  ];

  return (
    <div className="flex flex-col min-h-screen bg-[#fcfaf7] text-[#3a3a32] font-sans">
      {isIframe && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 text-xs flex items-center justify-center gap-2 text-amber-800 text-center z-50">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <span>当前处于预览模式。出于安全限制，如遇登录异常，请点击<a href={window.location.href} target="_blank" rel="noreferrer" className="underline font-bold px-1">在新标签页中打开</a>。</span>
        </div>
      )}
      <header className="sticky top-0 z-40 w-full bg-[#fcfaf7]/80 backdrop-blur-md border-b border-[#f0f0eb] shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <Link to="/" className="flex items-center gap-2 text-[#5a5a40]">
              <BookOpen className="h-6 w-6" />
              <span className="font-bold text-xl tracking-tight">NovelCraft</span>
            </Link>
            <div className="flex items-center gap-4">
              <nav className="flex space-x-1 sm:space-x-2">
                {navItems.map((item) => {
                  const isActive = item.path === '/' 
                    ? location.pathname === '/' 
                    : location.pathname.startsWith(item.path.split('/')[1] ? `/${item.path.split('/')[1]}` : item.path);
                  
                  // Hide Protected links when signed out
                  if (item.path !== '/' && false) {} // We will let the route level handle block, but ideally hide nav links

                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      className={cn(
                        'relative px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2',
                        isActive ? 'text-[#5a5a40]' : 'text-[#7a7a6e] hover:text-[#5a5a40] hover:bg-[#5a5a40]/5'
                      )}
                    >
                      <item.icon className="w-5 h-5 sm:hidden" />
                      <span className="hidden sm:inline">{item.name}</span>
                      {isActive && (
                        <motion.div
                          layoutId="nav-pill"
                          className="absolute inset-0 bg-[#5a5a40]/10 rounded-md -z-10"
                          initial={false}
                          transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                        />
                      )}
                    </Link>
                  );
                })}
              </nav>
              
              <div className="pl-4 border-l border-[#e5e5df] flex items-center">
                <SignedIn>
                  <UserButton afterSignOutUrl="/" />
                </SignedIn>
                <SignedOut>
                  <Link to="/sign-in">
                    <button className="px-4 py-1.5 text-xs font-medium text-white bg-[#5a5a40] hover:bg-[#3a3a32] rounded-full transition-colors shadow-sm">
                      登录
                    </button>
                  </Link>
                </SignedOut>
              </div>
            </div>
          </div>
        </div>
      </header>
      <main className="flex-1 flex flex-col items-center w-full">
        <Outlet />
      </main>
    </div>
  );
}
