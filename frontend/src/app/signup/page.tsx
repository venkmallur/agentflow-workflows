'use client';

import { useState } from 'react';
import { useSignInEmailPassword } from '@nhost/nextjs'; // Should be useSignUpEmailPassword ideally but mocking for simplicity if nhost config missing it
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { nhost } from '@/lib/nhost';

export default function SignUp() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    
    try {
      const res = await nhost.auth.signUp({
        email,
        password,
        options: {
          displayName: name
        }
      });
      
      if (res.error) {
        setError(res.error.message);
      } else {
        router.push('/dashboard');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: 'radial-gradient(circle at center, var(--bg-secondary) 0%, var(--bg-primary) 100%)' }}>
      <motion.div 
        className="glass-card fade-in" 
        style={{ width: '100%', maxWidth: '400px', margin: '20px' }}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h1 style={{ textAlign: 'center', marginBottom: '24px', fontSize: '28px', color: 'var(--text-primary)' }}>Create Account</h1>
        <form onSubmit={handleSignUp} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)' }}>Name</label>
            <input type="text" className="input" value={name} onChange={e => setName(e.target.value)} required />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)' }}>Email</label>
            <input type="email" className="input" value={email} onChange={e => setEmail(e.target.value)} required />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)' }}>Password</label>
            <input type="password" className="input" value={password} onChange={e => setPassword(e.target.value)} required />
          </div>
          
          {error && <div style={{ color: 'var(--accent-red)', fontSize: '14px', textAlign: 'center' }}>{error}</div>}
          
          <button type="submit" className="btn btn-primary" disabled={isLoading} style={{ marginTop: '8px' }}>
            {isLoading ? 'Creating Account...' : 'Sign Up'}
          </button>
          
          <div style={{ textAlign: 'center', marginTop: '16px', color: 'var(--text-muted)' }}>
            Already have an account? <Link href="/login" style={{ color: 'var(--accent-blue)', textDecoration: 'none' }}>Sign In</Link>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
