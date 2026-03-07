'use client';

import '../portal.css';
import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';

const API_BASE = process.env.NEXT_PUBLIC_APP_URL || '';

export default function PortalVerifyPage() {
  const router = useRouter();
  const [pins, setPins] = useState(['', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);
  const refs = [useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null)];

  const phone = typeof window !== 'undefined' ? sessionStorage.getItem('portal_phone') || '' : '';
  const channel = typeof window !== 'undefined' ? sessionStorage.getItem('portal_channel') || 'whatsapp' : 'whatsapp';

  useEffect(() => {
    if (!phone) router.push('/portal');
    else refs[0].current?.focus();
  }, []);

  function handlePinChange(i: number, val: string) {
    const digit = val.replace(/\D/g, '').slice(-1);
    const next = [...pins];
    next[i] = digit;
    setPins(next);
    if (digit && i < 3) refs[i + 1].current?.focus();
    if (next.every(d => d !== '')) submitPin(next.join(''));
  }

  function handleKeyDown(i: number, e: React.KeyboardEvent) {
    if (e.key === 'Backspace' && !pins[i] && i > 0) {
      refs[i - 1].current?.focus();
    }
  }

  async function submitPin(pin: string) {
    setError('');
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/portal/auth/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, pin }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Code incorrect');
        setPins(['', '', '', '']);
        refs[0].current?.focus();
        return;
      }
      localStorage.setItem('portal_token', data.token);
      localStorage.setItem('portal_resident', JSON.stringify(data.resident));
      router.push('/portal/home');
    } catch {
      setError('Erreur de connexion. Réessayez.');
    } finally {
      setLoading(false);
    }
  }

  async function resendCode() {
    setResending(true);
    try {
      await fetch(`${API_BASE}/api/portal/auth/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, channel }),
      });
      setResent(true);
      setTimeout(() => setResent(false), 4000);
    } catch {
      //
    } finally {
      setResending(false);
    }
  }

  const maskedPhone = phone ? phone.slice(0, -4).replace(/\d/g, '•') + phone.slice(-4) : '';

  return (
    <div className="portal-shell" style={s.shell}>
      <div style={s.card}>
        <div style={s.logo}>Syndic<span style={{ color: '#7b5ea7' }}>Pro</span></div>
        <div style={s.logoSub}>Portail Résident</div>

        <h1 style={s.heading}>Entrez votre code</h1>
        <p style={s.sub}>
          Code envoyé par {channel === 'whatsapp' ? 'WhatsApp' : 'SMS'} au{' '}
          <strong style={{ color: '#1a1410' }}>{maskedPhone}</strong>
        </p>

        <div style={s.pinRow}>
          {pins.map((d, i) => (
            <input
              key={i}
              ref={refs[i]}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={d}
              onChange={e => handlePinChange(i, e.target.value)}
              onKeyDown={e => handleKeyDown(i, e)}
              style={{ ...s.pinBox, ...(d ? s.pinBoxFilled : {}) }}
              disabled={loading}
            />
          ))}
        </div>

        {error && <div style={s.error}>{error}</div>}
        {loading && <div style={s.loading}>Vérification...</div>}

        <div style={s.resendRow}>
          {resent ? (
            <span style={{ color: '#7b5ea7', fontSize: 13 }}>✓ Code renvoyé !</span>
          ) : (
            <button style={s.resendBtn} onClick={resendCode} disabled={resending}>
              {resending ? 'Envoi...' : 'Renvoyer le code'}
            </button>
          )}
          <button style={s.backBtn} onClick={() => router.push('/portal')}>
            Changer de numéro
          </button>
        </div>
      </div>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  shell: { display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: 24 },
  card: { background: 'white', borderRadius: 24, padding: '48px 40px', width: '100%', maxWidth: 420, boxShadow: '0 8px 40px rgba(26,20,16,0.08)', border: '1px solid rgba(0,0,0,0.06)', textAlign: 'center' },
  logo: { fontFamily: "'Cormorant Garamond', serif", fontSize: 24, fontWeight: 600, color: '#1a1410', letterSpacing: 0.3, marginBottom: 2 },
  logoSub: { fontSize: 9, color: '#8a7a6e', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 32 },
  heading: { fontFamily: "'Cormorant Garamond', serif", fontSize: 32, fontWeight: 300, color: '#1a1410', margin: '0 0 8px', lineHeight: 1 },
  sub: { fontSize: 13, color: '#8a7a6e', fontWeight: 300, margin: '0 0 32px', lineHeight: 1.6 },
  pinRow: { display: 'flex', gap: 12, justifyContent: 'center', marginBottom: 24 },
  pinBox: { width: 60, height: 68, border: '1.5px solid rgba(0,0,0,0.12)', borderRadius: 14, textAlign: 'center', fontSize: 28, fontWeight: 600, color: '#1a1410', background: '#faf7f2', outline: 'none', fontFamily: "'DM Sans', sans-serif", transition: 'border-color 0.15s' },
  pinBoxFilled: { border: '1.5px solid #7b5ea7', background: '#f0ebff' },
  error: { background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)', color: '#dc2626', borderRadius: 10, padding: '10px 14px', fontSize: 13, marginBottom: 14 },
  loading: { color: '#7b5ea7', fontSize: 13, marginBottom: 14 },
  resendRow: { display: 'flex', justifyContent: 'space-between', marginTop: 8 },
  resendBtn: { background: 'none', border: 'none', color: '#7b5ea7', fontSize: 13, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", padding: 0 },
  backBtn: { background: 'none', border: 'none', color: '#8a7a6e', fontSize: 13, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", padding: 0 },
};
