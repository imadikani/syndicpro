'use client';

import '../portal.css';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useLanguage, LangToggle } from '@/lib/i18n';

const API_BASE = process.env.NEXT_PUBLIC_APP_URL || '';

type Resident = {
  id: string; name: string; phone: string; isOwner: boolean;
  unit: string; buildingId: string;
  building: { id: string; name: string; address: string; city: string; color: string };
  currentPayment: { id: string; month: number; year: number; amount: number; status: string; paidAt: string | null } | null;
};

type Payment = { id: string; month: number; year: number; amount: number; status: string; paidAt: string | null };
type Post = { id: string; content: string; authorName: string; isPinned: boolean; createdAt: string };

export default function PortalHome() {
  const router = useRouter();
  const { t, months: MONTHS } = useLanguage();
  const [tab, setTab] = useState<'home' | 'history' | 'community' | 'contact'>('home');
  const [resident, setResident] = useState<Resident | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [newPost, setNewPost] = useState('');
  const [postLoading, setPostLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('portal_token');
    if (!token) { router.push('/portal'); return; }

    const headers = { Authorization: `Bearer ${token}` };

    async function load() {
      try {
        const [meRes, paymentsRes] = await Promise.all([
          fetch(`${API_BASE}/api/portal/me`, { headers }),
          fetch(`${API_BASE}/api/portal/payments`, { headers }),
        ]);
        if (meRes.status === 401) { router.push('/portal'); return; }
        const [meData, paymentsData] = await Promise.all([meRes.json(), paymentsRes.json()]);
        setResident(meData);
        setPayments(Array.isArray(paymentsData) ? paymentsData : []);
      } catch {
        setError(t('portal_loading_error'));
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  useEffect(() => {
    if (tab !== 'community') return;
    const token = localStorage.getItem('portal_token');
    if (!token) return;
    fetch(`${API_BASE}/api/portal/community`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(d => setPosts(Array.isArray(d) ? d : [])).catch(() => {});
  }, [tab]);

  async function submitPost() {
    if (!newPost.trim()) return;
    const token = localStorage.getItem('portal_token');
    if (!token) return;
    setPostLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/portal/community`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newPost }),
      });
      if (res.ok) {
        const post = await res.json();
        setPosts(prev => [post, ...prev]);
        setNewPost('');
      }
    } finally {
      setPostLoading(false);
    }
  }

  function logout() {
    localStorage.removeItem('portal_token');
    localStorage.removeItem('portal_resident');
    router.push('/portal');
  }

  function fmtDate(iso: string | null) {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  function statusColor(status: string) {
    if (status === 'PAID') return '#16a34a';
    if (status === 'LATE') return '#dc2626';
    return '#d97706';
  }
  function statusLabel(status: string) {
    if (status === 'PAID') return t('portal_status_paid');
    if (status === 'LATE') return t('portal_status_late');
    if (status === 'WAIVED') return t('portal_status_waived');
    return t('portal_status_pending');
  }

  if (loading) return (
    <div className="portal-shell" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
      <div style={{ color: '#8a7a6e', fontSize: 13 }}>{t('loading')}</div>
    </div>
  );

  if (error || !resident) return (
    <div className="portal-shell" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
      <div style={{ color: '#dc2626', fontSize: 13 }}>{error || t('error')}</div>
    </div>
  );

  const cp = resident.currentPayment;
  const buildingColor = resident.building.color || '#7b5ea7';

  return (
    <div className="portal-shell" style={s.shell}>
      {/* HEADER */}
      <div style={{ ...s.header, background: `linear-gradient(135deg, ${buildingColor}dd, ${buildingColor}99)` }}>
        <div style={s.headerTop}>
          <div style={s.headerLogo}>Syndic<span style={{ color: 'rgba(255,255,255,0.7)' }}>Pro</span></div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <LangToggle style={{ border: '1px solid rgba(255,255,255,0.2)' }} />
            <button style={s.logoutBtn} onClick={logout}>{t('portal_logout')}</button>
          </div>
        </div>
        <div style={s.headerBuilding}>{resident.building.name}</div>
        <div style={s.headerName}>{resident.name}</div>
        <div style={s.headerUnit}>{t('portal_apt')} {resident.unit} · {resident.isOwner ? t('portal_owner') : t('portal_tenant')}</div>
      </div>

      {/* CURRENT PAYMENT CARD */}
      {cp && (
        <div style={s.payCard}>
          <div style={s.payLabel}>{t('portal_charge')} — {MONTHS[cp.month - 1]} {cp.year}</div>
          <div style={{ ...s.payAmount, color: statusColor(cp.status) }}>
            {cp.amount.toLocaleString()} MAD
          </div>
          <div style={{ ...s.payStatus, color: statusColor(cp.status), background: statusColor(cp.status) + '14' }}>
            {statusLabel(cp.status)}
          </div>
          {cp.status !== 'PAID' && (
            <div style={s.payNote}>{t('portal_pay_note')}</div>
          )}
          {cp.paidAt && (
            <div style={s.payDate}>{t('portal_paid_on')} {fmtDate(cp.paidAt)}</div>
          )}
        </div>
      )}

      {/* TAB BAR */}
      <div style={s.tabBar}>
        {([
          { id: 'home', label: t('portal_tab_home'), icon: '⬡' },
          { id: 'history', label: t('portal_tab_history'), icon: '◉' },
          { id: 'community', label: t('portal_tab_community'), icon: '◎' },
          { id: 'contact', label: t('portal_tab_contact'), icon: '💬' },
        ] as { id: typeof tab; label: string; icon: string }[]).map(tb => (
          <button
            key={tb.id}
            style={{ ...s.tabBtn, ...(tab === tb.id ? s.tabBtnActive : {}) }}
            onClick={() => setTab(tb.id)}
          >
            <span style={{ fontSize: 16 }}>{tb.icon}</span>
            <span style={{ fontSize: 10 }}>{tb.label}</span>
          </button>
        ))}
      </div>

      {/* CONTENT */}
      <div style={s.content}>

        {/* HOME */}
        {tab === 'home' && (
          <div>
            <div style={s.infoCard}>
              <div style={s.infoTitle}>{t('portal_my_building')}</div>
              <div style={s.infoRow}><span style={s.infoKey}>{t('portal_address')}</span><span style={s.infoVal}>{resident.building.address}</span></div>
              <div style={s.infoRow}><span style={s.infoKey}>{t('portal_city')}</span><span style={s.infoVal}>{resident.building.city}</span></div>
              <div style={s.infoRow}><span style={s.infoKey}>{t('portal_apartment')}</span><span style={s.infoVal}>{resident.unit}</span></div>
              <div style={s.infoRow}><span style={s.infoKey}>{t('portal_status')}</span><span style={s.infoVal}>{resident.isOwner ? t('portal_owner') : t('portal_tenant')}</span></div>
            </div>

            <div style={s.infoCard}>
              <div style={s.infoTitle}>{t('portal_payment_summary')}</div>
              <div style={s.infoRow}>
                <span style={s.infoKey}>{t('portal_paid_count')}</span>
                <span style={{ ...s.infoVal, color: '#16a34a', fontWeight: 600 }}>
                  {payments.filter(p => p.status === 'PAID' || p.status === 'LATE').length}
                </span>
              </div>
              <div style={s.infoRow}>
                <span style={s.infoKey}>{t('portal_pending_count')}</span>
                <span style={{ ...s.infoVal, color: '#d97706', fontWeight: 600 }}>
                  {payments.filter(p => p.status === 'PENDING').length}
                </span>
              </div>
              <div style={s.infoRow}>
                <span style={s.infoKey}>{t('portal_late_count')}</span>
                <span style={{ ...s.infoVal, color: '#dc2626', fontWeight: 600 }}>
                  {payments.filter(p => p.status === 'LATE').length}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* HISTORY */}
        {tab === 'history' && (
          <div>
            <div style={s.sectionTitle}>{t('portal_history_title')}</div>
            {payments.length === 0 ? (
              <div style={s.empty}>{t('portal_no_payments')}</div>
            ) : payments.map(p => (
              <div key={p.id} style={s.historyRow}>
                <div>
                  <div style={s.historyMonth}>{MONTHS[p.month - 1]} {p.year}</div>
                  {p.paidAt && <div style={s.historyDate}>{t('portal_paid_on')} {fmtDate(p.paidAt)}</div>}
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={s.historyAmount}>{p.amount.toLocaleString()} MAD</div>
                  <div style={{ ...s.historyStatus, color: statusColor(p.status) }}>{statusLabel(p.status)}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* COMMUNITY */}
        {tab === 'community' && (
          <div>
            <div style={s.sectionTitle}>{t('portal_community_title')} — {resident.building.name}</div>

            {/* New post */}
            <div style={s.newPostCard}>
              <textarea
                style={s.postInput}
                placeholder={t('portal_share')}
                value={newPost}
                onChange={e => setNewPost(e.target.value)}
                maxLength={500}
                rows={3}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
                <span style={{ fontSize: 11, color: '#8a7a6e' }}>{newPost.length}/500</span>
                <button style={s.postBtn} onClick={submitPost} disabled={postLoading || !newPost.trim()}>
                  {postLoading ? t('portal_publishing') : t('portal_publish')}
                </button>
              </div>
            </div>

            {posts.length === 0 ? (
              <div style={s.empty}>{t('portal_no_posts')}</div>
            ) : posts.map(post => (
              <div key={post.id} style={{ ...s.postCard, ...(post.isPinned ? s.postCardPinned : {}) }}>
                {post.isPinned && <div style={s.pinnedBadge}>{t('portal_pinned')}</div>}
                <div style={s.postAuthor}>{post.authorName}</div>
                <div style={s.postContent}>{post.content}</div>
                <div style={s.postDate}>{new Date(post.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}</div>
              </div>
            ))}
          </div>
        )}

        {/* CONTACT */}
        {tab === 'contact' && (
          <div>
            <div style={s.sectionTitle}>{t('portal_contact_title')}</div>
            <div style={s.infoCard}>
              <p style={{ fontSize: 14, color: '#4a3f35', lineHeight: 1.7, margin: '0 0 20px' }}>
                {t('portal_contact_desc')}
              </p>
              <a
                href={`https://wa.me/${process.env.NEXT_PUBLIC_SYNDIC_WHATSAPP || '212600000000'}?text=Bonjour, je suis ${resident.name} (Apt. ${resident.unit} - ${resident.building.name}). `}
                target="_blank"
                rel="noopener noreferrer"
                style={s.whatsappBtn}
              >
                {t('portal_whatsapp_btn')}
              </a>
            </div>
            <div style={s.infoCard}>
              <div style={s.infoTitle}>{t('portal_my_building')}</div>
              <div style={s.infoRow}><span style={s.infoKey}>{t('portal_name_col')}</span><span style={s.infoVal}>{resident.building.name}</span></div>
              <div style={s.infoRow}><span style={s.infoKey}>{t('portal_address')}</span><span style={s.infoVal}>{resident.building.address}, {resident.building.city}</span></div>
              <div style={s.infoRow}><span style={s.infoKey}>{t('portal_apartment')}</span><span style={s.infoVal}>{resident.unit}</span></div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  shell: { display: 'flex', flexDirection: 'column', minHeight: '100vh', maxWidth: 480, margin: '0 auto' },
  header: { padding: '32px 24px 28px', color: 'white' },
  headerTop: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  headerLogo: { fontFamily: "'DM Sans', sans-serif", fontSize: 20, fontWeight: 600 },
  logoutBtn: { background: 'rgba(255,255,255,0.15)', border: 'none', color: 'white', fontSize: 11, padding: '5px 12px', borderRadius: 100, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" },
  headerBuilding: { fontSize: 11, color: 'rgba(255,255,255,0.65)', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 4 },
  headerName: { fontFamily: "'DM Sans', sans-serif", fontSize: 28, fontWeight: 300, marginBottom: 4 },
  headerUnit: { fontSize: 12, color: 'rgba(255,255,255,0.6)' },

  payCard: { margin: '0 16px', marginTop: -20, background: 'white', borderRadius: 18, padding: '20px 22px', boxShadow: '0 4px 24px rgba(0,0,0,0.08)', border: '1px solid rgba(0,0,0,0.05)' },
  payLabel: { fontSize: 10, color: '#8a7a6e', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 6 },
  payAmount: { fontFamily: "'DM Sans', sans-serif", fontSize: 36, fontWeight: 300, lineHeight: 1, marginBottom: 10 },
  payStatus: { display: 'inline-block', fontSize: 12, fontWeight: 600, padding: '4px 12px', borderRadius: 100, marginBottom: 10 },
  payNote: { fontSize: 12, color: '#8a7a6e', lineHeight: 1.5 },
  payDate: { fontSize: 12, color: '#8a7a6e', marginTop: 6 },

  tabBar: { display: 'flex', background: 'white', borderTop: '1px solid rgba(0,0,0,0.06)', borderBottom: '1px solid rgba(0,0,0,0.06)', marginTop: 16, position: 'sticky', top: 0, zIndex: 10 },
  tabBtn: { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, padding: '12px 4px', background: 'none', border: 'none', cursor: 'pointer', color: '#8a7a6e', fontFamily: "'DM Sans', sans-serif", borderBottom: '2px solid transparent' },
  tabBtnActive: { color: '#7b5ea7', borderBottom: '2px solid #7b5ea7' },

  content: { padding: '20px 16px 40px', flex: 1 },

  sectionTitle: { fontFamily: "'DM Sans', sans-serif", fontSize: 20, fontWeight: 400, color: '#1a1410', marginBottom: 14 },

  infoCard: { background: 'white', borderRadius: 16, padding: '18px 20px', marginBottom: 12, border: '1px solid rgba(0,0,0,0.06)' },
  infoTitle: { fontSize: 11, color: '#8a7a6e', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 12 },
  infoRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid rgba(0,0,0,0.05)' },
  infoKey: { fontSize: 13, color: '#8a7a6e' },
  infoVal: { fontSize: 13, color: '#1a1410', fontWeight: 500, textAlign: 'right', maxWidth: '60%' },

  historyRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'white', borderRadius: 12, padding: '14px 18px', marginBottom: 8, border: '1px solid rgba(0,0,0,0.06)' },
  historyMonth: { fontSize: 14, color: '#1a1410', fontWeight: 500, marginBottom: 2 },
  historyDate: { fontSize: 11, color: '#8a7a6e' },
  historyAmount: { fontSize: 15, fontWeight: 600, color: '#1a1410', marginBottom: 2 },
  historyStatus: { fontSize: 11, fontWeight: 500 },

  newPostCard: { background: 'white', borderRadius: 14, padding: '16px', marginBottom: 14, border: '1px solid rgba(0,0,0,0.06)' },
  postInput: { width: '100%', border: 'none', outline: 'none', resize: 'none', fontSize: 14, color: '#1a1410', fontFamily: "'DM Sans', sans-serif", background: 'transparent', lineHeight: 1.6 },
  postBtn: { background: '#7b5ea7', color: 'white', border: 'none', borderRadius: 8, padding: '7px 18px', fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" },
  postCard: { background: 'white', borderRadius: 14, padding: '16px 18px', marginBottom: 10, border: '1px solid rgba(0,0,0,0.06)' },
  postCardPinned: { border: '1px solid rgba(123,94,167,0.25)', background: '#f9f7ff' },
  pinnedBadge: { fontSize: 10, color: '#7b5ea7', marginBottom: 8 },
  postAuthor: { fontSize: 11, fontWeight: 600, color: '#7b5ea7', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 },
  postContent: { fontSize: 14, color: '#1a1410', lineHeight: 1.6, marginBottom: 8 },
  postDate: { fontSize: 11, color: '#8a7a6e' },

  whatsappBtn: { display: 'block', width: '100%', textAlign: 'center', background: '#25D366', color: 'white', padding: '13px', borderRadius: 12, fontSize: 14, fontWeight: 500, textDecoration: 'none', boxSizing: 'border-box' },

  empty: { textAlign: 'center', color: '#8a7a6e', fontSize: 13, padding: '32px 0' },
};
