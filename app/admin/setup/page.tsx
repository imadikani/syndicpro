'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

const API_BASE = process.env.NEXT_PUBLIC_APP_URL || '';

export default function AdminSetupPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [checking, setChecking] = useState(true);

  // If an admin already exists, this page should not be accessible
  useEffect(() => {
    fetch(`${API_BASE}/api/admin/bootstrap/check`)
      .then(r => r.json())
      .then(d => {
        if (d.adminExists) router.push('/login');
        else setChecking(false);
      })
      .catch(() => setChecking(false));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/admin/bootstrap`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Error'); return; }
      router.push('/login?setup=done');
    } catch {
      setError('Connection error.');
    } finally {
      setLoading(false);
    }
  }

  if (checking) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#16131f', color: 'rgba(196,181,244,0.4)', fontFamily: "'DM Sans', sans-serif", fontSize: 13 }}>
      Checking...
    </div>
  );

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#16131f', fontFamily: "'DM Sans', sans-serif", padding: 24 }}>
      <div style={{ background: '#1d1a2e', border: '1px solid rgba(196,181,244,0.12)', borderRadius: 24, padding: '48px 44px', width: '100%', maxWidth: 420, boxShadow: '0 32px 80px rgba(0,0,0,0.5)' }}>
        <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 26, fontWeight: 600, color: 'white', marginBottom: 2 }}>
          Orvane
        </div>
        <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 36 }}>Admin Setup</div>

        <h1 style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 30, fontWeight: 300, color: 'white', margin: '0 0 8px' }}>Create admin account</h1>
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)', margin: '0 0 32px', lineHeight: 1.6 }}>
          This runs once. After setup, this page is disabled.
        </p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={labelStyle}>Name</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Admin" required style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="admin@orvane.com" required style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required minLength={8} style={inputStyle} />
          </div>
          {error && <div style={{ color: '#f87171', fontSize: 13 }}>{error}</div>}
          <button type="submit" disabled={loading} style={btnStyle}>
            {loading ? 'Creating...' : 'Create admin account →'}
          </button>
        </form>
      </div>
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: 10, color: 'rgba(255,255,255,0.4)',
  letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 6,
};
const inputStyle: React.CSSProperties = {
  width: '100%', padding: '12px 14px', background: 'rgba(255,255,255,0.05)',
  border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, color: 'white',
  fontSize: 14, fontFamily: "'DM Sans', sans-serif", outline: 'none', boxSizing: 'border-box',
};
const btnStyle: React.CSSProperties = {
  width: '100%', padding: 14, background: 'linear-gradient(135deg,#7c5cbf,#9b70e0)',
  border: 'none', borderRadius: 12, color: 'white', fontSize: 14, fontWeight: 500,
  cursor: 'pointer', fontFamily: "'DM Sans', sans-serif",
};
