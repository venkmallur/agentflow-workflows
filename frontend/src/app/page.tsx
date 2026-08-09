'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthenticationStatus } from '@nhost/nextjs';

export default function Home() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuthenticationStatus();

  useEffect(() => {
    if (!isLoading) {
      if (isAuthenticated) {
        router.push('/dashboard');
      } else {
        router.push('/login');
      }
    }
  }, [isAuthenticated, isLoading, router]);

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
      <div className="pulse-animation" style={{ color: 'var(--accent-blue)', fontSize: '24px' }}>Loading...</div>
    </div>
  );
}
