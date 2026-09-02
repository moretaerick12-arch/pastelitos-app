'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { 
  Map, 
  ShoppingCart, 
  Wallet, 
  FileCheck, 
  LogOut,
  Wifi,
  WifiOff,
  CloudUpload
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { SyncManager } from '@/lib/sync/syncManager';

export default function DeliveryLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  
  const [userName, setUserName] = useState<string>('Repartidor');
  const [routeName, setRouteName] = useState<string>('Sin ruta asignada');
  const [isOnline, setIsOnline] = useState<boolean>(true);

  const pendingSyncCount = useLiveQuery(
    () => db.sync_queue.where('status').equals('pending').count(),
    []
  ) ?? 0;

  const currentRouteMeta = useLiveQuery(() => db.meta.get('current_route_id'));
  const isDemo = currentRouteMeta?.value === 'demo-route-1';
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    // Check online status
    setIsOnline(navigator.onLine);
    const handleOnline = () => {
      setIsOnline(true);
      // Trigger sync when coming back online
      SyncManager.sync();
    };
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial sync attempt if online
    if (navigator.onLine) {
      SyncManager.sync();
    }

    // Fetch user and route data
    const fetchUserData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        // Fetch profile
        const { data: profile } = await supabase
          .from('profiles')
          .select('first_name')
          .eq('id', user.id)
          .single();
          
        if (profile?.first_name) {
          setUserName(profile.first_name);
        }

        // Fetch today's route
        const today = new Date().toISOString().split('T')[0];
        const { data: route } = await supabase
          .from('daily_routes')
          .select(`
            id,
            routes ( name )
          `)
          .eq('repartidor_id', user.id)
          .eq('route_date', today)
          .single();

        if ((route as any)?.routes?.name) {
          setRouteName((route as any).routes.name);
        }
      } else {
        router.push('/');
      }
    };

    fetchUserData();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [supabase, router]);

  const handleLogout = async () => {
    document.cookie = 'demo_role=; path=/; max-age=0';
    await supabase.auth.signOut();
    router.push('/login');
  };

  const navItems = [
    { href: '/ruta', label: 'Ruta', icon: Map },
    { href: '/sale', label: 'Vender', icon: ShoppingCart },
    { href: '/collection', label: 'Cobrar', icon: Wallet },
    { href: '/settlement', label: 'Cuadre', icon: FileCheck },
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 mx-auto max-w-md shadow-2xl relative pb-20 flex flex-col">
      {/* Header */}
      <header className="bg-white px-6 py-4 shadow-sm sticky top-0 z-10 flex flex-col gap-2 rounded-b-2xl">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold text-slate-900">Hola, {userName} 👋</h1>
            <p className="text-sm text-slate-500 font-medium">
              {mounted && isDemo ? 'Ruta Demo (Santo Domingo)' : routeName}
            </p>
          </div>
          <div className="flex items-center gap-2.5">
            {mounted && isDemo && (
              <div className="flex items-center gap-1 text-[11px] font-extrabold px-2.5 py-1 rounded-full bg-amber-500 text-white shadow-sm">
                <span>🧪 Demo</span>
              </div>
            )}
            {pendingSyncCount > 0 && (
              <div className="flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full bg-amber-100 text-amber-700 animate-pulse">
                <CloudUpload size={14} />
                <span>{pendingSyncCount}</span>
              </div>
            )}
            <div className={`flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full ${isOnline ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
              {isOnline ? <Wifi size={14} /> : <WifiOff size={14} />}
              {isOnline ? 'Online' : 'Offline'}
            </div>
            <button 
              onClick={handleLogout}
              className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
              aria-label="Cerrar sesión"
            >
              <LogOut size={20} />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className={`flex-1 ${pathname === '/ruta' ? 'p-0' : 'p-4'} animate-fade-in`}>
        {children}
      </main>

      {/* Bottom Navigation */}
      <nav className="bg-white border-t border-slate-200 fixed bottom-0 w-full max-w-md pb-safe z-50 rounded-t-2xl shadow-[0_-4px_10px_rgba(0,0,0,0.05)]">
        <div className="flex justify-around items-center h-16">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            
            return (
              <Link 
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors ${
                  isActive ? 'text-amber-600' : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                <Icon size={24} className={isActive ? 'stroke-[2.5px]' : 'stroke-2'} />
                <span className="text-[10px] font-medium">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
