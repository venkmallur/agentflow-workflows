'use client';

import { useState } from 'react';
import { useSignInEmailPassword } from '@nhost/nextjs';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { signInEmailPassword, isLoading, isError, error, isSuccess } = useSignInEmailPassword();
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    await signInEmailPassword(email, password);
  };

  if (isSuccess) {
    router.push('/dashboard');
  }

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: 'radial-gradient(circle at center, var(--bg-secondary) 0%, var(--bg-primary) 100%)' }}>
      <motion.div 
        className="glass-card fade-in" 
        style={{ width: '100%', maxWidth: '400px', margin: '20px' }}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h1 style={{ textAlign: 'center', marginBottom: '24px', fontSize: '28px', color: 'var(--text-primary)' }}>Welcome Back</h1>
        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)' }}>Email</label>
            <input type="email" className="input" value={email} onChange={e => setEmail(e.target.value)} required />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)' }}>Password</label>
            <input type="password" className="input" value={password} onChange={e => setPassword(e.target.value)} required />
          </div>
          
          {isError && <div style={{ color: 'var(--accent-red)', fontSize: '14px', textAlign: 'center' }}>{error?.message}</div>}
          
          <button type="submit" className="btn btn-primary" disabled={isLoading} style={{ marginTop: '8px' }}>
            {isLoading ? 'Signing In...' : 'Sign In'}
          </button>
          
          <div style={{ textAlign: 'center', marginTop: '16px', color: 'var(--text-muted)' }}>
            Don't have an account? <Link href="/signup" style={{ color: 'var(--accent-blue)', textDecoration: 'none' }}>Sign Up</Link>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
