'use client';

import '../portal.css';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useLanguage, LangToggle } from '@/lib/i18n';



type Resident = {
  id: string; name: string; phone: string; isOwner: boolean;
  unit: string; buildingId: string;
  building: { id: string; name: string; address: string; city: string; color: string };
  currentPayment: { id: string; month: number; year: number; chargeMonth: number | null; billingPeriod: string; periodLabel: string | null; amount: number; status: string; paidAt: string | null; receiptStatus: string | null; receiptAiData: { notes?: string } | null } | null;
};

type Payment = { id: string; month: number; year: number; periodLabel: string | null; amount: number; status: string; paidAt: string | null; receiptStatus: string | null; receiptAiData: { notes?: string } | null };
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
  const [uploadModal, setUploadModal] = useState(false);
  const [uploadPaymentId, setUploadPaymentId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [pollingStatus, setPollingStatus] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('portal_token');
    if (!token) { router.push('/portal'); return; }

    const headers = { Authorization: `Bearer ${token}` };

    async function load() {
      try {
        const [meRes, paymentsRes] = await Promise.all([
          fetch(`/api/portal/me`, { headers }),
          fetch(`/api/portal/payments`, { headers }),
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
    fetch(`/api/portal/community`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(d => setPosts(Array.isArray(d) ? d : [])).catch(() => {});
  }, [tab]);

  async function submitPost() {
    if (!newPost.trim()) return;
    const token = localStorage.getItem('portal_token');
    if (!token) return;
    setPostLoading(true);
    try {
      const res = await fetch(`/api/portal/community`, {
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

  function openUpload(paymentId: string) {
    setUploadPaymentId(paymentId);
    setUploadModal(true);
    setUploadError('');
    setPollingStatus(null);
  }

  async function handleUpload(file: File) {
    if (!uploadPaymentId) return;
    const token = localStorage.getItem('portal_token');
    if (!token) return;

    setUploading(true);
    setUploadError('');
    try {
      const formData = new FormData();
      formData.append('receipt', file);
      const res = await fetch(`/api/portal/payments/${uploadPaymentId}/upload-receipt`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) { setUploadError(data.error || 'Erreur'); setUploading(false); return; }

      // Start polling
      setPollingStatus('PENDING_APPROVAL');
      const poll = setInterval(async () => {
        try {
          const pRes = await fetch('/api/portal/me', { headers: { Authorization: `Bearer ${token}` } });
          const pData = await pRes.json();
          const cp = pData.currentPayment;
          if (cp && cp.receiptStatus && cp.receiptStatus !== 'PENDING_APPROVAL') {
            clearInterval(poll);
            setPollingStatus(cp.receiptStatus);
            setResident(pData);
            // Also refresh payments
            const paymentsRes = await fetch('/api/portal/payments', { headers: { Authorization: `Bearer ${token}` } });
            const paymentsData = await paymentsRes.json();
            setPayments(Array.isArray(paymentsData) ? paymentsData : []);
          }
        } catch { /* continue polling */ }
      }, 3000);

      // Stop polling after 2 minutes max
      setTimeout(() => clearInterval(poll), 120000);
    } catch {
      setUploadError('Erreur réseau');
    } finally {
      setUploading(false);
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

  function statusColor(status: string, receiptStatus?: string | null) {
    if (receiptStatus === 'PENDING_APPROVAL') return '#fbbf24';
    if (receiptStatus === 'APPROVED_PENDING_RECEIPT') return '#60a5fa';
    if (receiptStatus === 'REJECTED') return '#f87171';
    if (receiptStatus === 'DISPUTE') return '#fb923c';
    if (status === 'PAID') return '#16a34a';
    if (status === 'LATE') return '#dc2626';
    if (status === 'WAIVED') return '#a855f7';
    return '#d97706';
  }
  function statusLabel(status: string, receiptStatus?: string | null) {
    if (receiptStatus === 'PENDING_APPROVAL') return 'Analyse en cours...';
    if (receiptStatus === 'APPROVED_PENDING_RECEIPT') return 'En attente de réception';
    if (receiptStatus === 'REJECTED') return 'Reçu rejeté';
    if (receiptStatus === 'DISPUTE') return 'En vérification';
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
  const buildingColor = resident.building.color || '#7c5cbf';

  return (
    <div className="portal-shell" style={s.shell}>
      {/* HEADER */}
      <div style={{ ...s.header, background: `linear-gradient(135deg, ${buildingColor}dd, ${buildingColor}99)` }}>
        <div style={s.headerTop}>
          <div style={s.headerLogo}>Orvane</div>
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
          <div style={s.payLabel}>{t('portal_charge')} — {cp.periodLabel || (cp.month > 0 ? `${MONTHS[cp.month - 1]} ${cp.year}` : String(cp.year))}</div>
          <div style={{ ...s.payAmount, color: statusColor(cp.status, cp.receiptStatus) }}>
            {cp.amount.toLocaleString()} MAD
          </div>
          <div style={{ ...s.payStatus, color: statusColor(cp.status, cp.receiptStatus), background: statusColor(cp.status, cp.receiptStatus) + '14' }}>
            {statusLabel(cp.status, cp.receiptStatus)}
          </div>
          {cp.receiptStatus === 'APPROVED_PENDING_RECEIPT' && (
            <div style={s.receiptMsg}>✅ Reçu vérifié — en attente de réception par votre syndic</div>
          )}
          {cp.receiptStatus === 'REJECTED' && (
            <div style={s.receiptMsgError}>
              ❌ Reçu rejeté{cp.receiptAiData?.notes ? `: ${cp.receiptAiData.notes}` : ''}
            </div>
          )}
          {cp.status !== 'PAID' && !cp.receiptStatus && (
            <div style={s.payNote}>{t('portal_pay_note')}</div>
          )}
          {cp.paidAt && (
            <div style={s.payDate}>{t('portal_paid_on')} {fmtDate(cp.paidAt)}</div>
          )}
          {/* Upload receipt button — show when unpaid and no pending/approved receipt */}
          {cp.status !== 'PAID' && cp.status !== 'WAIVED' && (!cp.receiptStatus || cp.receiptStatus === 'REJECTED') && (
            <button style={s.uploadBtn} onClick={() => openUpload(cp.id)}>
              📎 Envoyer mon reçu
            </button>
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
                  <div style={s.historyMonth}>{p.periodLabel || (p.month > 0 ? `${MONTHS[p.month - 1]} ${p.year}` : String(p.year))}</div>
                  {p.paidAt && <div style={s.historyDate}>{t('portal_paid_on')} {fmtDate(p.paidAt)}</div>}
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={s.historyAmount}>{p.amount.toLocaleString()} MAD</div>
                  <div style={{ ...s.historyStatus, color: statusColor(p.status, p.receiptStatus) }}>{statusLabel(p.status, p.receiptStatus)}</div>
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

      {/* UPLOAD MODAL */}
      {uploadModal && (
        <div style={s.modalBg} onClick={() => { if (!uploading && !pollingStatus) setUploadModal(false); }}>
          <div style={s.modal} onClick={e => e.stopPropagation()}>
            {pollingStatus === 'PENDING_APPROVAL' ? (
              <div style={{ textAlign: 'center', padding: '32px 0' }}>
                <div style={s.spinner} />
                <div style={{ fontSize: 14, color: '#4a3f35', marginTop: 16 }}>Analyse en cours...</div>
                <div style={{ fontSize: 12, color: '#8a7a6e', marginTop: 6 }}>Votre reçu est en cours de vérification par IA</div>
              </div>
            ) : pollingStatus === 'APPROVED_PENDING_RECEIPT' ? (
              <div style={{ textAlign: 'center', padding: '32px 0' }}>
                <div style={{ fontSize: 32, marginBottom: 12 }}>✅</div>
                <div style={{ fontSize: 15, color: '#16a34a', fontWeight: 500, marginBottom: 8 }}>Reçu vérifié</div>
                <div style={{ fontSize: 13, color: '#8a7a6e', lineHeight: 1.6 }}>En attente de réception par votre syndic</div>
                <button style={{ ...s.uploadBtn, marginTop: 20 }} onClick={() => setUploadModal(false)}>Fermer</button>
              </div>
            ) : pollingStatus === 'REJECTED' ? (
              <div style={{ textAlign: 'center', padding: '32px 0' }}>
                <div style={{ fontSize: 32, marginBottom: 12 }}>❌</div>
                <div style={{ fontSize: 15, color: '#dc2626', fontWeight: 500, marginBottom: 8 }}>Reçu rejeté</div>
                <div style={{ fontSize: 13, color: '#8a7a6e', lineHeight: 1.6, marginBottom: 16 }}>
                  {resident?.currentPayment?.receiptAiData?.notes || 'Veuillez soumettre un nouveau reçu'}
                </div>
                <button style={s.uploadBtn} onClick={() => { setPollingStatus(null); setUploadError(''); }}>
                  Soumettre un nouveau reçu
                </button>
              </div>
            ) : (
              <>
                <div style={{ fontSize: 16, fontWeight: 500, color: '#1a1410', marginBottom: 6 }}>Envoyer mon reçu</div>
                <div style={{ fontSize: 12, color: '#8a7a6e', marginBottom: 20, lineHeight: 1.5 }}>
                  Prenez en photo ou sélectionnez votre ordre de virement bancaire
                </div>
                {uploadError && (
                  <div style={{ background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.2)', color: '#dc2626', borderRadius: 10, padding: '8px 12px', fontSize: 12, marginBottom: 12 }}>
                    {uploadError}
                  </div>
                )}
                <label style={s.dropZone}>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    capture="environment"
                    style={{ display: 'none' }}
                    onChange={e => {
                      const f = e.target.files?.[0];
                      if (f) handleUpload(f);
                    }}
                    disabled={uploading}
                  />
                  {uploading ? (
                    <div style={{ color: '#8a7a6e', fontSize: 13 }}>Envoi en cours...</div>
                  ) : (
                    <>
                      <div style={{ fontSize: 28, marginBottom: 8 }}>📷</div>
                      <div style={{ fontSize: 13, color: '#4a3f35', fontWeight: 500 }}>Prendre une photo ou choisir un fichier</div>
                      <div style={{ fontSize: 11, color: '#8a7a6e', marginTop: 4 }}>JPEG, PNG — max 10 MB</div>
                    </>
                  )}
                </label>
                <button style={{ ...s.cancelBtn, marginTop: 12 }} onClick={() => setUploadModal(false)}>Annuler</button>
              </>
            )}
          </div>
        </div>
      )}
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
  tabBtnActive: { color: '#7c5cbf', borderBottom: '2px solid #7c5cbf' },

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
  postBtn: { background: '#7c5cbf', color: 'white', border: 'none', borderRadius: 8, padding: '7px 18px', fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" },
  postCard: { background: 'white', borderRadius: 14, padding: '16px 18px', marginBottom: 10, border: '1px solid rgba(0,0,0,0.06)' },
  postCardPinned: { border: '1px solid rgba(123,94,167,0.25)', background: '#f9f7ff' },
  pinnedBadge: { fontSize: 10, color: '#7c5cbf', marginBottom: 8 },
  postAuthor: { fontSize: 11, fontWeight: 600, color: '#7c5cbf', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 },
  postContent: { fontSize: 14, color: '#1a1410', lineHeight: 1.6, marginBottom: 8 },
  postDate: { fontSize: 11, color: '#8a7a6e' },

  whatsappBtn: { display: 'block', width: '100%', textAlign: 'center', background: '#25D366', color: 'white', padding: '13px', borderRadius: 12, fontSize: 14, fontWeight: 500, textDecoration: 'none', boxSizing: 'border-box' },

  empty: { textAlign: 'center', color: '#8a7a6e', fontSize: 13, padding: '32px 0' },

  uploadBtn: { width: '100%', padding: '12px', background: '#7c5cbf', color: 'white', border: 'none', borderRadius: 12, fontSize: 14, fontWeight: 500, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", marginTop: 14 },
  receiptMsg: { fontSize: 12, color: '#60a5fa', lineHeight: 1.5, marginTop: 6, background: 'rgba(96,165,250,0.08)', padding: '8px 12px', borderRadius: 10 },
  receiptMsgError: { fontSize: 12, color: '#dc2626', lineHeight: 1.5, marginTop: 6, background: 'rgba(220,38,38,0.08)', padding: '8px 12px', borderRadius: 10 },
  modalBg: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 100 },
  modal: { background: 'white', borderRadius: '20px 20px 0 0', padding: '28px 24px', width: '100%', maxWidth: 480, maxHeight: '80vh', overflowY: 'auto' },
  dropZone: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px 20px', border: '2px dashed rgba(0,0,0,0.12)', borderRadius: 14, cursor: 'pointer', textAlign: 'center' },
  cancelBtn: { width: '100%', padding: '10px', background: 'transparent', border: '1px solid rgba(0,0,0,0.1)', color: '#8a7a6e', borderRadius: 10, fontSize: 13, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" },
  spinner: { width: 32, height: 32, border: '3px solid rgba(0,0,0,0.08)', borderTop: '3px solid #7c5cbf', borderRadius: '50%', margin: '0 auto', animation: 'spin 0.8s linear infinite' },
};
