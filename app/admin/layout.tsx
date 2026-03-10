'use client';

import './admin.css';
import { useState, useEffect, useTransition, Suspense } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import OrvaneLogo from '@/components/OrvaneLogo';

const NAV = [
  { id: 'syndics',   icon: '◎', label: 'Syndics' },
  { id: 'buildings', icon: '⬡', label: 'Buildings' },
  { id: 'demos',     icon: '◈', label: 'Demo Requests' },
];

function AdminSidebar() {
  const router = useRouter();
  const params = useSearchParams();
  const activeTab = params.get('tab') || 'syndics';
  const [user, setUser] = useState<{ name: string } | null>(null);
  const [, startTransition] = useTransition();

  useEffect(() => {
    const raw = localStorage.getItem('syndic_user') || sessionStorage.getItem('syndic_user');
    if (raw) { try { setUser(JSON.parse(raw)); } catch {} }
  }, []);

  function signOut() {
    localStorage.removeItem('syndic_token');
    localStorage.removeItem('syndic_user');
    sessionStorage.removeItem('syndic_token');
    sessionStorage.removeItem('syndic_user');
    router.push('/login');
  }

  return (
    <aside style={s.sidebar}>
      <div style={s.brand}>
        <OrvaneLogo size={96} variant="empty-bg" style={{ marginBottom: 6 }} />
        <div style={s.logoSub}>Admin Panel</div>
      </div>

      <div style={s.nav}>
        {NAV.map(item => (
          <button
            key={item.id}
            style={{ ...s.navItem, ...(activeTab === item.id ? s.navActive : {}) }}
            onClick={() => startTransition(() => router.push(`/admin?tab=${item.id}`))}
          >
            <span style={s.navIcon}>{item.icon}</span>
            <span>{item.label}</span>
          </button>
        ))}
      </div>

      <div style={s.footer}>
        <div style={s.userBadge}>
          <div style={s.avatar}>{(user?.name?.[0] || 'A').toUpperCase()}</div>
          <div>
            <div style={s.userName}>{user?.name || 'Admin'}</div>
            <div style={s.userRole}>Administrator</div>
          </div>
        </div>
        <button style={s.logoutBtn} onClick={signOut}>Sign out</button>
      </div>
    </aside>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [authChecked, setAuthChecked] = useState(false);
  const isSetup = pathname === '/admin/setup';

  useEffect(() => {
    // Setup page needs no auth
    if (isSetup) { setAuthChecked(true); return; }

    const t = localStorage.getItem('syndic_token') || sessionStorage.getItem('syndic_token') || '';
    if (!t) { router.push('/login'); return; }
    const raw = localStorage.getItem('syndic_user') || sessionStorage.getItem('syndic_user');
    const user = raw ? JSON.parse(raw) : null;
    if (!user || user.role !== 'ADMIN') { router.push('/login'); return; }
    setAuthChecked(true);
  }, [isSetup]);

  // Block render until auth resolves — prevents children from mounting
  // and avoids any redirect loops caused by page-level auth effects
  if (!authChecked) return (
    <div style={s.loading}>Loading...</div>
  );

  // Setup page: no sidebar
  if (isSetup) return <>{children}</>;

  return (
    <div style={s.shell}>
      <Suspense fallback={<div style={s.sidebar} />}>
        <AdminSidebar />
      </Suspense>
      <main style={s.main}>{children}</main>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  shell:    { display: 'flex', minHeight: '100vh', background: '#16131f', fontFamily: "'DM Sans', sans-serif" },
  loading:  { display: 'flex', minHeight: '100vh', background: '#16131f', fontFamily: "'DM Sans', sans-serif", alignItems: 'center', justifyContent: 'center', color: 'rgba(196,181,244,0.4)', fontSize: 13 },
  sidebar:  { width: 240, background: '#1d1a2e', borderRight: '1px solid rgba(196,181,244,0.08)', display: 'flex', flexDirection: 'column', flexShrink: 0, height: '100vh', position: 'sticky', top: 0 },
  brand:    { padding: '28px 24px 20px', borderBottom: '1px solid rgba(196,181,244,0.07)' },
  logoSub:  { fontSize: 9, color: 'rgba(196,181,244,0.4)', letterSpacing: 2, textTransform: 'uppercase', marginTop: 2 },
  nav:      { padding: '16px 12px', display: 'flex', flexDirection: 'column', gap: 2, flex: 1 },
  navItem:  { display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 10, background: 'none', border: 'none', color: 'rgba(196,181,244,0.45)', fontSize: 13, cursor: 'pointer', textAlign: 'left', width: '100%', fontFamily: "'DM Sans', sans-serif", transition: 'all 0.15s' },
  navActive:{ background: 'rgba(124,92,191,0.18)', color: '#e8e0ff' },
  navIcon:  { fontSize: 14, opacity: 0.7 },
  footer:   { padding: '16px 16px 24px', borderTop: '1px solid rgba(196,181,244,0.07)' },
  userBadge:{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 },
  avatar:   { width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg,#7c5cbf,#9b70e0)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 600, color: 'white', flexShrink: 0 },
  userName: { fontSize: 13, color: '#e8e0ff', fontWeight: 500 },
  userRole: { fontSize: 10, color: 'rgba(196,181,244,0.4)', letterSpacing: 0.5, textTransform: 'uppercase' },
  logoutBtn:{ width: '100%', background: 'none', border: '1px solid rgba(196,181,244,0.1)', borderRadius: 8, color: 'rgba(196,181,244,0.3)', fontSize: 11, padding: '7px 0', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", letterSpacing: 0.5 },
  main:     { flex: 1, minWidth: 0 },
};
