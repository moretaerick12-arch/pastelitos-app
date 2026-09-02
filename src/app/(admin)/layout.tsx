'use client';
import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LayoutDashboard, MapPin, Store, Package, DollarSign, BarChart3, Box, Users, Menu, X, User, LogOut } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

const navItems = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Rutas', href: '/routes', icon: MapPin },
  { name: 'Clientes', href: '/clients', icon: Store },
  { name: 'Inventario', href: '/inventory', icon: Package },
  { name: 'Finanzas', href: '/finances', icon: DollarSign },
  { name: 'Usuarios', href: '/users', icon: Users },
  { name: 'Reportes', href: '/reports', icon: BarChart3 },
  { name: 'Activos', href: '/assets', icon: Box },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    document.cookie = 'demo_role=; path=/; max-age=0';
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
  };

  return (
    <div className="flex h-screen bg-[#0f0f1a] text-white overflow-hidden">
      {/* Sidebar overlay for mobile */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed md:static inset-y-0 left-0 z-50 w-64 
        bg-white/5 border-r border-white/10 backdrop-blur-md
        transition-transform duration-300 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        <div className="flex items-center justify-between p-4 border-b border-white/10 h-16">
          <span className="text-xl font-bold bg-gradient-to-r from-amber-400 to-orange-500 bg-clip-text text-transparent">
            Pastelitos Patria
          </span>
          <button 
            className="md:hidden text-gray-400 hover:text-white"
            onClick={() => setSidebarOpen(false)}
          >
            <X size={20} />
          </button>
        </div>
        
        <nav className="p-4 space-y-2">
          {navItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`
                  flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200
                  ${isActive 
                    ? 'bg-gradient-to-r from-amber-500/20 to-orange-500/20 text-amber-400 border border-amber-500/30 shadow-[0_0_15px_rgba(245,158,11,0.15)]' 
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                  }
                `}
                onClick={() => setSidebarOpen(false)}
              >
                <item.icon size={20} className={isActive ? 'text-amber-400' : ''} />
                <span className="font-medium">{item.name}</span>
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Header */}
        <header className="h-16 flex items-center justify-between px-6 border-b border-white/10 bg-white/5 backdrop-blur-sm z-30">
          <div className="flex items-center">
            <button
              className="md:hidden mr-4 text-gray-400 hover:text-white"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu size={24} />
            </button>
            <h1 className="text-lg font-semibold tracking-wide hidden sm:block">Panel de Administración</h1>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-3 bg-white/5 px-3 py-1.5 rounded-full border border-white/10">
              <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-500">
                <User size={16} />
              </div>
              <span className="text-sm font-medium text-gray-300">Admin</span>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center space-x-2 bg-white/5 px-3 py-2 rounded-full border border-white/10 cursor-pointer hover:bg-red-500/20 hover:border-red-500/30 hover:text-red-400 transition-all text-gray-400"
              title="Cerrar sesión"
            >
              <LogOut size={16} />
              <span className="text-sm font-medium hidden sm:inline">Salir</span>
            </button>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 custom-scrollbar">
          {children}
        </main>
      </div>
    </div>
  );
}
