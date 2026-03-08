'use client';

import './admin.css';
import { useState, useEffect, Suspense } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { LangToggle } from '@/lib/i18n';

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
        <div style={s.logo}>Syndic<span style={{ color: '#c8b8e8' }}>Pro</span></div>
        <div style={s.logoSub}>Admin Panel</div>
      </div>

      <div style={s.nav}>
        {NAV.map(item => (
          <button
            key={item.id}
            style={{ ...s.navItem, ...(activeTab === item.id ? s.navActive : {}) }}
            onClick={() => router.push(`/admin?tab=${item.id}`)}
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
        <LangToggle style={{ marginBottom: 8 }} />
        <button style={s.logoutBtn} onClick={signOut}>Sign out</button>
      </div>
    </aside>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // Setup page has no sidebar
  if (pathname === '/admin/setup') return <>{children}</>;

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
  shell:    { display: 'flex', minHeight: '100vh', background: '#0f0b08', fontFamily: "'DM Sans', sans-serif" },
  sidebar:  { width: 240, background: '#1a1410', borderRight: '1px solid rgba(200,184,232,0.08)', display: 'flex', flexDirection: 'column', flexShrink: 0, height: '100vh', position: 'sticky', top: 0 },
  brand:    { padding: '28px 24px 24px', borderBottom: '1px solid rgba(200,184,232,0.07)' },
  logo:     { fontSize: 22, fontWeight: 600, color: 'white', letterSpacing: 0.3 },
  logoSub:  { fontSize: 9, color: 'rgba(255,255,255,0.3)', letterSpacing: 2, textTransform: 'uppercase', marginTop: 3 },
  nav:      { padding: '16px 12px', display: 'flex', flexDirection: 'column', gap: 2, flex: 1 },
  navItem:  { display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 10, background: 'none', border: 'none', color: 'rgba(255,255,255,0.45)', fontSize: 13, cursor: 'pointer', textAlign: 'left', width: '100%', fontFamily: "'DM Sans', sans-serif", transition: 'all 0.15s' },
  navActive:{ background: 'rgba(200,184,232,0.1)', color: 'rgba(255,255,255,0.95)' },
  navIcon:  { fontSize: 14, opacity: 0.7 },
  footer:   { padding: '16px 16px 24px', borderTop: '1px solid rgba(200,184,232,0.07)' },
  userBadge:{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 },
  avatar:   { width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg,#7b5ea7,#9b6bc0)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 600, color: 'white', flexShrink: 0 },
  userName: { fontSize: 13, color: 'rgba(255,255,255,0.8)', fontWeight: 500 },
  userRole: { fontSize: 10, color: 'rgba(255,255,255,0.35)', letterSpacing: 0.5, textTransform: 'uppercase' },
  logoutBtn:{ width: '100%', background: 'none', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, color: 'rgba(255,255,255,0.3)', fontSize: 11, padding: '7px 0', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", letterSpacing: 0.5 },
  main:     { flex: 1, minWidth: 0 },
};
