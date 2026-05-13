'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Sidebar } from './Sidebar';
import { QueryProvider } from '../ui/QueryProvider';
import { getStoredUser, clearAuth } from '../../lib/auth';
import { User } from '../../types';

export const AppShell = ({ children }: { children: React.ReactNode }) => {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const stored = getStoredUser();
    if (!stored) {
      router.push('/login');
    } else {
      setUser(stored);
    }
  }, [router]);

  const handleLogout = () => {
    clearAuth();
    router.push('/login');
  };

  if (!user) return null;

  return (
    <QueryProvider>
      <div className="app-layout">
        <Sidebar user={user} onLogout={handleLogout} />
        <main className="main-content">{children}</main>
      </div>
    </QueryProvider>
  );
};
