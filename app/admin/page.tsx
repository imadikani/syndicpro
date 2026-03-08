'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';

const API_BASE = process.env.NEXT_PUBLIC_APP_URL || '';

type Syndic = {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  role: string;
  createdAt: string;
  _count: { buildings: number };
};

type Building = {
  id: string;
  name: string;
  address: string;
  city: string;
  totalUnits: number;
  monthlyFee: number;
  color: string;
  createdAt: string;
  managedBy: { id: string; name: string; email: string };
  _count: { units: number };
};

type DemoRequest = {
  id: string;
  name: string | null;
  email: string;
  phone: string | null;
  buildings: number | null;
  plan: string | null;
  createdAt: string;
  contacted: boolean;
};

const COLORS = ['#7b5ea7', '#e8906a', '#34d399', '#f87171', '#60a5fa', '#fbbf24', '#a78bfa'];

export default function AdminPage() {
  const router = useRouter();
  const [tab, setTab] = useState<'syndics' | 'buildings' | 'demos'>('syndics');
  const [token, setToken] = useState('');
  const [authChecked, setAuthChecked] = useState(false);
  const [accessDenied, setAccessDenied] = useState(false);

  // Data
  const [syndics, setSyndics] = useState<Syndic[]>([]);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [demos, setDemos] = useState<DemoRequest[]>([]);

  // Syndic form
  const [syndicOpen, setSyndicOpen] = useState(false);
  const [newSyndic, setNewSyndic] = useState({ name: '', email: '', password: '', phone: '' });
  const [syndicLoading, setSyndicLoading] = useState(false);
  const [syndicError, setSyndicError] = useState('');

  // Building form
  const [buildingOpen, setBuildingOpen] = useState(false);
  const [newBuilding, setNewBuilding] = useState({ name: '', address: '', city: '', totalUnits: '', monthlyFee: '', color: COLORS[0], syndicId: '' });
  const [buildingLoading, setBuildingLoading] = useState(false);
  const [buildingError, setBuildingError] = useState('');

  // Delete confirm
  const [deleteConfirm, setDeleteConfirm] = useState<{ type: 'syndic' | 'building'; id: string; label: string } | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    const t = localStorage.getItem('syndic_token') || sessionStorage.getItem('syndic_token') || '';
    if (!t) { router.push('/login'); return; }
    setToken(t);
    // Verify admin role via API (don't rely on potentially stale localStorage)
    fetch(`${API_BASE}/api/admin/syndics`, {
      headers: { Authorization: `Bearer ${t}` },
    }).then(res => {
      if (res.status === 401) { router.push('/login'); return; }
      if (res.status === 403) { setAccessDenied(true); return; }
      if (!res.ok) { router.push('/dashboard'); return; }
      setAuthChecked(true);
    }).catch(() => router.push('/login'));
  }, []);

  const headers = useCallback(() => ({ Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }), [token]);

  useEffect(() => {
    if (!authChecked || !token) return;
    const h = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
    Promise.all([
      fetch(`${API_BASE}/api/admin/syndics`, { headers: h }).then(r => r.json()),
      fetch(`${API_BASE}/api/admin/buildings`, { headers: h }).then(r => r.json()),
      fetch(`${API_BASE}/api/admin/demo-requests`, { headers: h }).then(r => r.json()),
    ]).then(([s, b, d]) => {
      if (Array.isArray(s)) setSyndics(s);
      if (Array.isArray(b)) setBuildings(b);
      if (Array.isArray(d)) setDemos(d);
    }).catch(console.error);
  }, [authChecked, token]);

  async function createSyndic() {
    if (!newSyndic.name || !newSyndic.email || !newSyndic.password) {
      setSyndicError('Name, email, and password are required.');
      return;
    }
    setSyndicLoading(true);
    setSyndicError('');
    try {
      const res = await fetch(`${API_BASE}/api/admin/syndics`, {
        method: 'POST', headers: headers(),
        body: JSON.stringify(newSyndic),
      });
      const data = await res.json();
      if (!res.ok) { setSyndicError(data.error || 'Error'); return; }
      setSyndics(prev => [{ ...data, _count: { buildings: 0 } }, ...prev]);
      setSyndicOpen(false);
      setNewSyndic({ name: '', email: '', password: '', phone: '' });
    } catch { setSyndicError('Server error'); }
    finally { setSyndicLoading(false); }
  }

  async function createBuilding() {
    if (!newBuilding.name || !newBuilding.address || !newBuilding.city || !newBuilding.totalUnits || !newBuilding.monthlyFee || !newBuilding.syndicId) {
      setBuildingError('All fields are required.');
      return;
    }
    setBuildingLoading(true);
    setBuildingError('');
    try {
      const res = await fetch(`${API_BASE}/api/admin/buildings`, {
        method: 'POST', headers: headers(),
        body: JSON.stringify(newBuilding),
      });
      const data = await res.json();
      if (!res.ok) { setBuildingError(data.error || 'Error'); return; }
      const syndic = syndics.find(s => s.id === newBuilding.syndicId);
      setBuildings(prev => [{ ...data, managedBy: syndic || { id: newBuilding.syndicId, name: '', email: '' }, _count: { units: parseInt(newBuilding.totalUnits) } }, ...prev]);
      setBuildingOpen(false);
      setNewBuilding({ name: '', address: '', city: '', totalUnits: '', monthlyFee: '', color: COLORS[0], syndicId: '' });
    } catch { setBuildingError('Server error'); }
    finally { setBuildingLoading(false); }
  }

  async function confirmDelete() {
    if (!deleteConfirm) return;
    setDeleteLoading(true);
    try {
      const url = deleteConfirm.type === 'syndic'
        ? `${API_BASE}/api/admin/syndics/${deleteConfirm.id}`
        : `${API_BASE}/api/admin/buildings/${deleteConfirm.id}`;
      await fetch(url, { method: 'DELETE', headers: headers() });
      if (deleteConfirm.type === 'syndic') setSyndics(prev => prev.filter(s => s.id !== deleteConfirm.id));
      else setBuildings(prev => prev.filter(b => b.id !== deleteConfirm.id));
      setDeleteConfirm(null);
    } catch { }
    finally { setDeleteLoading(false); }
  }

  async function toggleContacted(id: string, current: boolean) {
    const res = await fetch(`${API_BASE}/api/admin/demo-requests`, {
      method: 'PATCH', headers: headers(),
      body: JSON.stringify({ id, contacted: !current }),
    });
    if (res.ok) {
      setDemos(prev => prev.map(d => d.id === id ? { ...d, contacted: !current } : d));
    }
  }

  function fmtDate(iso: string) {
    return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  if (accessDenied) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#0f0d0b', fontFamily: "'DM Sans', sans-serif", gap: 16 }}>
      <div style={{ color: '#f87171', fontSize: 15, fontWeight: 500 }}>Access denied — your account does not have ADMIN role.</div>
      <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, textAlign: 'center', maxWidth: 480, lineHeight: 1.7 }}>
        Run this in your browser console to create the admin account:
        <pre style={{ marginTop: 12, background: 'rgba(255,255,255,0.05)', padding: '12px 16px', borderRadius: 8, fontSize: 11, color: '#c8b8e8', textAlign: 'left', overflowX: 'auto' }}>{`fetch('/api/admin/bootstrap', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ name: 'Admin', email: 'admin@syndicpro.ma', password: 'changeme123' })
}).then(r => r.json()).then(console.log)`}</pre>
        Then refresh this page.
      </div>
      <button onClick={() => window.location.reload()} style={{ marginTop: 8, padding: '10px 24px', background: '#7b5ea7', border: 'none', borderRadius: 8, color: 'white', fontSize: 13, cursor: 'pointer' }}>Refresh</button>
    </div>
  );

  if (!authChecked) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#0f0d0b', fontFamily: "'DM Sans', sans-serif", color: 'rgba(255,255,255,0.3)', fontSize: 13 }}>
      Loading admin panel...
    </div>
  );

  return (
    <div style={s.shell}>
      {/* SIDEBAR */}
      <div style={s.sidebar}>
        <div style={s.sidebarLogo}>
          <div style={s.logoText}>Syndic<span style={{ color: '#c8b8e8' }}>Pro</span></div>
          <div style={s.logoSub}>Admin Panel</div>
        </div>
        <nav style={s.nav}>
          {([
            { id: 'syndics', icon: '👤', label: 'Syndics', count: syndics.length },
            { id: 'buildings', icon: '🏢', label: 'Buildings', count: buildings.length },
            { id: 'demos', icon: '📋', label: 'Demo Requests', count: demos.filter(d => !d.contacted).length },
          ] as { id: typeof tab; icon: string; label: string; count: number }[]).map(item => (
            <button
              key={item.id}
              style={{ ...s.navItem, ...(tab === item.id ? s.navItemActive : {}) }}
              onClick={() => setTab(item.id)}
            >
              <span style={{ fontSize: 16 }}>{item.icon}</span>
              <span style={{ flex: 1, textAlign: 'left' }}>{item.label}</span>
              {item.count > 0 && (
                <span style={{ ...s.badge, ...(item.id === 'demos' && item.count > 0 ? s.badgeAlert : {}) }}>
                  {item.count}
                </span>
              )}
            </button>
          ))}
        </nav>
        <div style={s.sidebarFooter}>
          <button style={s.backBtn} onClick={() => router.push('/dashboard')}>← Dashboard</button>
        </div>
      </div>

      {/* MAIN */}
      <div style={s.main}>
        {/* ── SYNDICS TAB ── */}
        {tab === 'syndics' && (
          <div>
            <div style={s.pageHeader}>
              <div>
                <div style={s.pageTitle}>Syndic Accounts</div>
                <div style={s.pageSubtitle}>{syndics.length} account{syndics.length !== 1 ? 's' : ''}</div>
              </div>
              <button style={s.addBtn} onClick={() => { setSyndicOpen(true); setSyndicError(''); }}>
                + New Syndic
              </button>
            </div>

            <div style={s.tableWrap}>
              <table style={s.table}>
                <thead>
                  <tr>
                    {['Name', 'Email', 'Phone', 'Buildings', 'Created', ''].map(h => (
                      <th key={h} style={s.th}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {syndics.map(sy => (
                    <tr key={sy.id} style={s.tr}>
                      <td style={s.td}>
                        <div style={s.avatarRow}>
                          <div style={{ ...s.avatar, background: 'linear-gradient(135deg,#7b5ea7,#9b6bc0)' }}>
                            {sy.name.charAt(0).toUpperCase()}
                          </div>
                          <span style={s.tdName}>{sy.name}</span>
                        </div>
                      </td>
                      <td style={s.td}><span style={s.mono}>{sy.email}</span></td>
                      <td style={s.td}>{sy.phone || <span style={s.muted}>—</span>}</td>
                      <td style={s.td}>
                        <span style={s.countBadge}>{sy._count.buildings}</span>
                      </td>
                      <td style={s.td}><span style={s.muted}>{fmtDate(sy.createdAt)}</span></td>
                      <td style={{ ...s.td, textAlign: 'right' }}>
                        <button
                          style={s.deleteBtn}
                          onClick={() => setDeleteConfirm({ type: 'syndic', id: sy.id, label: sy.name })}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                  {syndics.length === 0 && (
                    <tr><td colSpan={6} style={s.empty}>No syndic accounts yet.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── BUILDINGS TAB ── */}
        {tab === 'buildings' && (
          <div>
            <div style={s.pageHeader}>
              <div>
                <div style={s.pageTitle}>Buildings</div>
                <div style={s.pageSubtitle}>{buildings.length} building{buildings.length !== 1 ? 's' : ''} across all syndics</div>
              </div>
              <button
                style={{ ...s.addBtn, ...(syndics.length === 0 ? s.addBtnDisabled : {}) }}
                onClick={() => { if (syndics.length > 0) { setBuildingOpen(true); setBuildingError(''); } }}
                disabled={syndics.length === 0}
                title={syndics.length === 0 ? 'Create a syndic account first' : ''}
              >
                + New Building
              </button>
            </div>

            <div style={s.tableWrap}>
              <table style={s.table}>
                <thead>
                  <tr>
                    {['Building', 'City', 'Units', 'Fee / month', 'Syndic', 'Created', ''].map(h => (
                      <th key={h} style={s.th}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {buildings.map(b => (
                    <tr key={b.id} style={s.tr}>
                      <td style={s.td}>
                        <div style={s.avatarRow}>
                          <div style={{ ...s.colorDot, background: b.color }} />
                          <span style={s.tdName}>{b.name}</span>
                        </div>
                      </td>
                      <td style={s.td}>{b.city}</td>
                      <td style={s.td}><span style={s.countBadge}>{b._count.units}</span></td>
                      <td style={s.td}><span style={s.mono}>{b.monthlyFee.toLocaleString()} MAD</span></td>
                      <td style={s.td}>
                        <div style={{ fontSize: 12 }}>{b.managedBy.name}</div>
                        <div style={s.muted}>{b.managedBy.email}</div>
                      </td>
                      <td style={s.td}><span style={s.muted}>{fmtDate(b.createdAt)}</span></td>
                      <td style={{ ...s.td, textAlign: 'right' }}>
                        <button
                          style={s.deleteBtn}
                          onClick={() => setDeleteConfirm({ type: 'building', id: b.id, label: b.name })}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                  {buildings.length === 0 && (
                    <tr><td colSpan={7} style={s.empty}>No buildings yet.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── DEMO REQUESTS TAB ── */}
        {tab === 'demos' && (
          <div>
            <div style={s.pageHeader}>
              <div>
                <div style={s.pageTitle}>Demo Requests</div>
                <div style={s.pageSubtitle}>
                  {demos.filter(d => !d.contacted).length} pending · {demos.filter(d => d.contacted).length} contacted
                </div>
              </div>
            </div>

            <div style={s.tableWrap}>
              <table style={s.table}>
                <thead>
                  <tr>
                    {['Name', 'Email', 'Phone', 'Plan', 'Buildings', 'Date', 'Status', ''].map(h => (
                      <th key={h} style={s.th}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {demos.map(d => (
                    <tr key={d.id} style={{ ...s.tr, ...(d.contacted ? s.trDimmed : {}) }}>
                      <td style={s.td}>{d.name || <span style={s.muted}>—</span>}</td>
                      <td style={s.td}><span style={s.mono}>{d.email}</span></td>
                      <td style={s.td}>{d.phone || <span style={s.muted}>—</span>}</td>
                      <td style={s.td}>{d.plan || <span style={s.muted}>—</span>}</td>
                      <td style={s.td}>{d.buildings ?? <span style={s.muted}>—</span>}</td>
                      <td style={s.td}><span style={s.muted}>{fmtDate(d.createdAt)}</span></td>
                      <td style={s.td}>
                        <span style={{ ...s.statusPill, ...(d.contacted ? s.pillContacted : s.pillPending) }}>
                          {d.contacted ? '✓ Contacted' : '● Pending'}
                        </span>
                      </td>
                      <td style={{ ...s.td, textAlign: 'right' }}>
                        <button
                          style={{ ...s.actionBtn, ...(d.contacted ? s.actionBtnSecondary : {}) }}
                          onClick={() => toggleContacted(d.id, d.contacted)}
                        >
                          {d.contacted ? 'Mark pending' : 'Mark contacted'}
                        </button>
                      </td>
                    </tr>
                  ))}
                  {demos.length === 0 && (
                    <tr><td colSpan={8} style={s.empty}>No demo requests yet.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* ── NEW SYNDIC MODAL ── */}
      {syndicOpen && (
        <div style={s.backdrop} onClick={e => { if (e.target === e.currentTarget) setSyndicOpen(false); }}>
          <div style={s.modal}>
            <div style={s.modalHeader}>
              <div style={s.modalTitle}>New Syndic Account</div>
              <button style={s.modalClose} onClick={() => setSyndicOpen(false)}>×</button>
            </div>
            <div style={s.modalBody}>
              {[
                { label: 'Full Name *', key: 'name', type: 'text', placeholder: 'Hassan Benali' },
                { label: 'Email *', key: 'email', type: 'email', placeholder: 'hassan@example.ma' },
                { label: 'Password *', key: 'password', type: 'password', placeholder: 'Min 8 characters' },
                { label: 'Phone (WhatsApp)', key: 'phone', type: 'tel', placeholder: '+212 6 XX XX XX XX' },
              ].map(f => (
                <div key={f.key} style={s.field}>
                  <label style={s.label}>{f.label}</label>
                  <input
                    type={f.type}
                    placeholder={f.placeholder}
                    value={(newSyndic as any)[f.key]}
                    onChange={e => setNewSyndic(prev => ({ ...prev, [f.key]: e.target.value }))}
                    style={s.input}
                  />
                </div>
              ))}
              {syndicError && <div style={s.errorBox}>{syndicError}</div>}
            </div>
            <div style={s.modalFooter}>
              <button style={s.cancelBtn} onClick={() => setSyndicOpen(false)}>Cancel</button>
              <button style={s.submitBtn} onClick={createSyndic} disabled={syndicLoading}>
                {syndicLoading ? 'Creating...' : 'Create Syndic'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── NEW BUILDING MODAL ── */}
      {buildingOpen && (
        <div style={s.backdrop} onClick={e => { if (e.target === e.currentTarget) setBuildingOpen(false); }}>
          <div style={s.modal}>
            <div style={s.modalHeader}>
              <div style={s.modalTitle}>New Building</div>
              <button style={s.modalClose} onClick={() => setBuildingOpen(false)}>×</button>
            </div>
            <div style={s.modalBody}>
              <div style={s.field}>
                <label style={s.label}>Assign to Syndic *</label>
                <select
                  style={s.input}
                  value={newBuilding.syndicId}
                  onChange={e => setNewBuilding(prev => ({ ...prev, syndicId: e.target.value }))}
                >
                  <option value="">Select syndic...</option>
                  {syndics.map(sy => (
                    <option key={sy.id} value={sy.id}>{sy.name} ({sy.email})</option>
                  ))}
                </select>
              </div>
              {[
                { label: 'Building Name *', key: 'name', type: 'text', placeholder: 'Résidence Al Andalous' },
                { label: 'Address *', key: 'address', type: 'text', placeholder: '12 Rue Ibn Battouta' },
                { label: 'City *', key: 'city', type: 'text', placeholder: 'Casablanca' },
                { label: 'Total Units *', key: 'totalUnits', type: 'number', placeholder: '18' },
                { label: 'Monthly Fee (MAD) *', key: 'monthlyFee', type: 'number', placeholder: '350' },
              ].map(f => (
                <div key={f.key} style={s.field}>
                  <label style={s.label}>{f.label}</label>
                  <input
                    type={f.type}
                    placeholder={f.placeholder}
                    value={(newBuilding as any)[f.key]}
                    onChange={e => setNewBuilding(prev => ({ ...prev, [f.key]: e.target.value }))}
                    style={s.input}
                    min={f.type === 'number' ? 1 : undefined}
                  />
                </div>
              ))}
              <div style={s.field}>
                <label style={s.label}>Color</label>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {COLORS.map(c => (
                    <button
                      key={c}
                      onClick={() => setNewBuilding(prev => ({ ...prev, color: c }))}
                      style={{
                        width: 28, height: 28, borderRadius: '50%', background: c,
                        border: newBuilding.color === c ? '2px solid white' : '2px solid transparent',
                        outline: newBuilding.color === c ? `2px solid ${c}` : 'none',
                        cursor: 'pointer',
                      }}
                    />
                  ))}
                </div>
              </div>
              {buildingError && <div style={s.errorBox}>{buildingError}</div>}
            </div>
            <div style={s.modalFooter}>
              <button style={s.cancelBtn} onClick={() => setBuildingOpen(false)}>Cancel</button>
              <button style={s.submitBtn} onClick={createBuilding} disabled={buildingLoading}>
                {buildingLoading ? 'Creating...' : 'Create Building'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── DELETE CONFIRM ── */}
      {deleteConfirm && (
        <div style={s.backdrop} onClick={e => { if (e.target === e.currentTarget) setDeleteConfirm(null); }}>
          <div style={{ ...s.modal, maxWidth: 420 }}>
            <div style={s.modalHeader}>
              <div style={s.modalTitle}>Confirm Delete</div>
              <button style={s.modalClose} onClick={() => setDeleteConfirm(null)}>×</button>
            </div>
            <div style={s.modalBody}>
              <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14, lineHeight: 1.6, margin: 0 }}>
                Are you sure you want to delete <strong style={{ color: 'white' }}>{deleteConfirm.label}</strong>?
                {deleteConfirm.type === 'building' && (
                  <><br /><span style={{ color: '#f87171', fontSize: 13 }}>This will delete all units, residents, and payment records.</span></>
                )}
                {deleteConfirm.type === 'syndic' && (
                  <><br /><span style={{ color: '#f87171', fontSize: 13 }}>This will delete all buildings and data for this syndic.</span></>
                )}
              </p>
            </div>
            <div style={s.modalFooter}>
              <button style={s.cancelBtn} onClick={() => setDeleteConfirm(null)}>Cancel</button>
              <button style={s.dangerBtn} onClick={confirmDelete} disabled={deleteLoading}>
                {deleteLoading ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  shell: {
    display: 'flex',
    minHeight: '100vh',
    background: '#0f0d0b',
    fontFamily: "'DM Sans', sans-serif",
    color: 'rgba(255,255,255,0.85)',
  },

  // Sidebar
  sidebar: {
    width: 220,
    background: '#1a1410',
    borderRight: '1px solid rgba(255,255,255,0.06)',
    display: 'flex',
    flexDirection: 'column',
    flexShrink: 0,
  },
  sidebarLogo: {
    padding: '28px 20px 24px',
    borderBottom: '1px solid rgba(255,255,255,0.06)',
  },
  logoText: {
    fontFamily: "'Cormorant Garamond', serif",
    fontSize: 22,
    fontWeight: 600,
    color: 'white',
    letterSpacing: 0.3,
  },
  logoSub: {
    fontSize: 9,
    color: 'rgba(255,255,255,0.3)',
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginTop: 2,
  },
  nav: {
    padding: '16px 12px',
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
    flex: 1,
  },
  navItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '10px 12px',
    borderRadius: 10,
    background: 'transparent',
    border: 'none',
    color: 'rgba(255,255,255,0.5)',
    fontSize: 13,
    cursor: 'pointer',
    fontFamily: "'DM Sans', sans-serif",
    transition: 'all 0.15s',
    textAlign: 'left',
  },
  navItemActive: {
    background: 'rgba(123,94,167,0.2)',
    color: '#c8b8e8',
    border: '1px solid rgba(123,94,167,0.3)',
  },
  badge: {
    background: 'rgba(255,255,255,0.1)',
    color: 'rgba(255,255,255,0.5)',
    fontSize: 10,
    borderRadius: 100,
    padding: '1px 7px',
    fontWeight: 600,
  },
  badgeAlert: {
    background: 'rgba(248,113,113,0.2)',
    color: '#f87171',
  },
  sidebarFooter: {
    padding: '16px 12px',
    borderTop: '1px solid rgba(255,255,255,0.06)',
  },
  backBtn: {
    width: '100%',
    padding: '9px 12px',
    background: 'transparent',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 8,
    color: 'rgba(255,255,255,0.4)',
    fontSize: 12,
    cursor: 'pointer',
    fontFamily: "'DM Sans', sans-serif",
  },

  // Main content
  main: {
    flex: 1,
    padding: '36px 40px',
    overflowY: 'auto',
  },
  pageHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 28,
  },
  pageTitle: {
    fontFamily: "'Cormorant Garamond', serif",
    fontSize: 28,
    fontWeight: 300,
    color: 'white',
    marginBottom: 4,
  },
  pageSubtitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.35)',
  },
  addBtn: {
    padding: '10px 20px',
    background: 'linear-gradient(135deg,#7b5ea7,#9b6bc0)',
    border: 'none',
    borderRadius: 10,
    color: 'white',
    fontSize: 13,
    fontWeight: 500,
    cursor: 'pointer',
    fontFamily: "'DM Sans', sans-serif",
  },
  addBtnDisabled: {
    opacity: 0.4,
    cursor: 'not-allowed',
  },

  // Table
  tableWrap: {
    background: '#1a1410',
    borderRadius: 14,
    border: '1px solid rgba(255,255,255,0.06)',
    overflow: 'hidden',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
  },
  th: {
    padding: '12px 18px',
    fontSize: 10,
    color: 'rgba(255,255,255,0.3)',
    letterSpacing: 1,
    textTransform: 'uppercase',
    textAlign: 'left',
    borderBottom: '1px solid rgba(255,255,255,0.06)',
    fontWeight: 500,
  },
  tr: {
    borderBottom: '1px solid rgba(255,255,255,0.04)',
    transition: 'background 0.1s',
  },
  trDimmed: {
    opacity: 0.5,
  },
  td: {
    padding: '14px 18px',
    fontSize: 13,
  },
  tdName: {
    fontWeight: 500,
    color: 'white',
  },
  avatarRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 12,
    fontWeight: 600,
    color: 'white',
    flexShrink: 0,
  },
  colorDot: {
    width: 10,
    height: 10,
    borderRadius: '50%',
    flexShrink: 0,
  },
  mono: {
    fontFamily: 'monospace',
    fontSize: 12,
    color: 'rgba(255,255,255,0.55)',
  },
  muted: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: 12,
  },
  countBadge: {
    background: 'rgba(123,94,167,0.2)',
    color: '#c8b8e8',
    fontSize: 11,
    fontWeight: 600,
    padding: '2px 8px',
    borderRadius: 100,
  },
  deleteBtn: {
    background: 'transparent',
    border: '1px solid rgba(248,113,113,0.2)',
    color: 'rgba(248,113,113,0.6)',
    borderRadius: 6,
    padding: '4px 10px',
    fontSize: 11,
    cursor: 'pointer',
    fontFamily: "'DM Sans', sans-serif",
  },
  actionBtn: {
    background: 'rgba(123,94,167,0.15)',
    border: '1px solid rgba(123,94,167,0.3)',
    color: '#c8b8e8',
    borderRadius: 6,
    padding: '4px 12px',
    fontSize: 11,
    cursor: 'pointer',
    fontFamily: "'DM Sans', sans-serif",
    whiteSpace: 'nowrap' as const,
  },
  actionBtnSecondary: {
    background: 'transparent',
    border: '1px solid rgba(255,255,255,0.1)',
    color: 'rgba(255,255,255,0.3)',
  },
  statusPill: {
    fontSize: 11,
    fontWeight: 500,
    padding: '3px 10px',
    borderRadius: 100,
  },
  pillPending: {
    background: 'rgba(248,113,113,0.15)',
    color: '#f87171',
  },
  pillContacted: {
    background: 'rgba(52,211,153,0.15)',
    color: '#34d399',
  },
  empty: {
    textAlign: 'center' as const,
    padding: '40px',
    color: 'rgba(255,255,255,0.2)',
    fontSize: 13,
  },

  // Modal
  backdrop: {
    position: 'fixed' as const,
    inset: 0,
    background: 'rgba(0,0,0,0.7)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    backdropFilter: 'blur(4px)',
  },
  modal: {
    background: '#1e1812',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 20,
    width: '100%',
    maxWidth: 500,
    maxHeight: '90vh',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column' as const,
    boxShadow: '0 40px 100px rgba(0,0,0,0.6)',
  },
  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '20px 24px',
    borderBottom: '1px solid rgba(255,255,255,0.07)',
  },
  modalTitle: {
    fontFamily: "'Cormorant Garamond', serif",
    fontSize: 22,
    fontWeight: 300,
    color: 'white',
  },
  modalClose: {
    background: 'none',
    border: 'none',
    color: 'rgba(255,255,255,0.3)',
    fontSize: 22,
    cursor: 'pointer',
    lineHeight: 1,
    padding: 0,
    fontFamily: "'DM Sans', sans-serif",
  },
  modalBody: {
    padding: '20px 24px',
    overflowY: 'auto' as const,
    flex: 1,
  },
  modalFooter: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: 10,
    padding: '16px 24px',
    borderTop: '1px solid rgba(255,255,255,0.07)',
  },
  field: {
    marginBottom: 16,
  },
  label: {
    display: 'block',
    fontSize: 10,
    color: 'rgba(255,255,255,0.4)',
    letterSpacing: 1.2,
    textTransform: 'uppercase' as const,
    marginBottom: 6,
  },
  input: {
    width: '100%',
    padding: '10px 14px',
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 8,
    color: 'white',
    fontSize: 14,
    fontFamily: "'DM Sans', sans-serif",
    outline: 'none',
    boxSizing: 'border-box' as const,
  },
  errorBox: {
    background: 'rgba(248,113,113,0.1)',
    border: '1px solid rgba(248,113,113,0.25)',
    color: '#f87171',
    borderRadius: 8,
    padding: '10px 14px',
    fontSize: 13,
    marginTop: 4,
  },
  cancelBtn: {
    padding: '10px 20px',
    background: 'transparent',
    border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: 8,
    color: 'rgba(255,255,255,0.5)',
    fontSize: 13,
    cursor: 'pointer',
    fontFamily: "'DM Sans', sans-serif",
  },
  submitBtn: {
    padding: '10px 24px',
    background: 'linear-gradient(135deg,#7b5ea7,#9b6bc0)',
    border: 'none',
    borderRadius: 8,
    color: 'white',
    fontSize: 13,
    fontWeight: 500,
    cursor: 'pointer',
    fontFamily: "'DM Sans', sans-serif",
  },
  dangerBtn: {
    padding: '10px 24px',
    background: 'linear-gradient(135deg,#dc2626,#ef4444)',
    border: 'none',
    borderRadius: 8,
    color: 'white',
    fontSize: 13,
    fontWeight: 500,
    cursor: 'pointer',
    fontFamily: "'DM Sans', sans-serif",
  },
};
