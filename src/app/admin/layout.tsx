// src/app/admin/layout.tsx
"use client";
import { useState } from 'react'; // [추가]
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  
  // [수정] useState로 감싸서 최초 1회만 생성되도록 변경 (경고 해결)
  const [supabase] = useState(() => createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  ));

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  // ... (나머지 UI 코드는 그대로 유지) ...
  const menuItems = [
    { name: 'Dashboard', path: '/admin', icon: '🏠' },
    { name: 'Category Management', path: '/admin/categories', icon: '📑' },
    { name: 'Menu Management', path: '/admin/menu', icon: '🍔' },
    { name: 'Modifier Management', path: '/admin/modifiers', icon: '✅' },
    { name: 'Order History', path: '/admin/orders', icon: '🧾' },
  ];

  return (
    <div className="flex h-screen bg-gray-100">
      <aside className="w-64 bg-gray-900 text-white flex flex-col shadow-xl z-20">
        <div className="h-20 flex items-center justify-center border-b border-gray-700">
          <h1 className="text-xl font-bold tracking-wider">ADMIN PORTAL</h1>
        </div>
        <nav className="flex-1 py-6 px-3 space-y-2">
          {menuItems.map((item) => {
            const isActive = pathname === item.path;
            return (
              <Link 
                key={item.path} 
                href={item.path}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium
                  ${isActive 
                    ? 'bg-blue-600 text-white shadow-lg translate-x-1' 
                    : 'text-gray-400 hover:bg-gray-800 hover:text-white'}`}
              >
                <span className="text-xl">{item.icon}</span>
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>
        <div className="p-4 border-t border-gray-800">
          <button 
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-4 py-3 text-red-400 hover:bg-gray-800 hover:text-red-300 rounded-xl transition-colors font-bold"
          >
            <span>🚪</span>
            <span>Sign Out</span>
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-y-auto bg-gray-50 relative">
        {children}
      </main>
    </div>
  );
}