'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Sidebar } from './Sidebar';
import { QueryProvider } from '../ui/QueryProvider';
import { getStoredUser, setStoredUser, clearAuth } from '../../lib/auth';
import { supabase } from '../../lib/supabase';
import { User } from '../../types';

export const AppShell = ({ children }: { children: React.ReactNode }) => {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    // Verificar sesión activa y refrescar perfil desde Supabase
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        clearAuth();
        router.push('/login');
        return;
      }

      // Refrescar perfil desde Supabase para tener rol actualizado
      const { data: profile } = await supabase
        .from('profiles')
        .select('id, email, full_name, role')
        .eq('id', session.user.id)
        .single();

      if (profile) {
        const u: User = { id: profile.id, email: profile.email, full_name: profile.full_name, role: profile.role };
        setStoredUser(u);
        setUser(u);
      } else {
        // Fallback a localStorage si Supabase falla
        const stored = getStoredUser();
        if (stored) setUser(stored);
        else { router.push('/login'); }
      }
    };

    init();

    // Detectar cambios de sesión (logout automático al expirar)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT' || event === 'TOKEN_REFRESHED') {
        if (event === 'SIGNED_OUT') {
          clearAuth();
          router.push('/login');
        }
      }
    });

    return () => subscription.unsubscribe();
  }, [router]);

  const handleLogout = async () => {
    await clearAuth();
    router.push('/login');
  };

  if (!user) return (
    <div style={{ display: 'grid', placeItems: 'center', height: '100vh', background: 'var(--bg)' }}>
      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
        {[0, 1, 2].map((i) => (
          <span key={i} style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent)', animation: `bounce .9s ${i * 0.15}s infinite` }} />
        ))}
      </div>
    </div>
  );

  return (
    <QueryProvider>
      <div className="app-layout">
        <Sidebar user={user} onLogout={handleLogout} />
        <main className="main-content">{children}</main>
      </div>
    </QueryProvider>
  );
};
