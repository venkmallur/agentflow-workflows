'use client';

import { useAuthenticationStatus } from '@nhost/nextjs';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { OrgProvider } from '@/context/OrgContext';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuthenticationStatus();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isLoading, isAuthenticated, router]);

  if (isLoading || !isAuthenticated) {
    return <div className="pulse-animation" style={{ color: 'var(--accent-blue)', display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', fontSize: '24px' }}>Loading...</div>;
  }

  return (
    <OrgProvider>
      <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-primary)' }}>
        {/* Sidebar placeholder */}
        <aside style={{ width: '250px', background: 'var(--bg-secondary)', borderRight: '1px solid var(--border-glass)', padding: '24px', display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontSize: '20px', fontWeight: 'bold', color: 'var(--accent-blue)', marginBottom: '32px' }}>Healio Workflows</div>
          <nav style={{ display: 'flex', flexDirection: 'column', gap: '16px', flex: 1 }}>
            <a href="/dashboard/workflows" style={{ color: 'var(--text-primary)', textDecoration: 'none', padding: '8px 12px', borderRadius: 'var(--radius-sm)', background: 'var(--bg-glass)' }}>Workflows</a>
            <a href="/dashboard/members" style={{ color: 'var(--text-secondary)', textDecoration: 'none', padding: '8px 12px', borderRadius: 'var(--radius-sm)' }}>Members</a>
          </nav>
        </aside>
        
        <main style={{ flex: 1, padding: '32px', overflowY: 'auto', position: 'relative' }}>
          <header style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '32px' }}>
            {/* Topbar avatar placeholder */}
            <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--accent-purple)', display: 'flex', justifyContent: 'center', alignItems: 'center', fontWeight: 'bold' }}>U</div>
          </header>
          {children}
        </main>
      </div>
    </OrgProvider>
  );
}
