import { useState } from 'react';
import { useI18n } from '@hooks/useI18n';
import AdminDetailPanel from './shared/AdminDetailPanel';

interface Props {
  kpis: { label: string; value: string; delta: string; color: string }[];
  users: { id: string; name: string; role: string; status: string; orders: number }[];
  orders: { id: string; customer: string; product: string; amount: string; status: string; date: string }[];
  kocs: { id: string; name: string; tier: string; sales: string; commission: string; status: string }[];
  vendors: { id: string; shopName: string; revenue: string; products: number; status: string }[];
  products: { id: string; name: string; vendor: string; price: string; status: string; sales: number }[];
  commissions: { koc: string; amount: string; orders: number; status: string; txHash: string; date: string }[];
  onNavigate: (tab: string) => void;
}

const thSm: React.CSSProperties = { padding: '8px 10px', textAlign: 'left' as const, fontWeight: 700, fontSize: '.62rem', color: 'var(--text-3)', letterSpacing: '.05em', textTransform: 'uppercase' as const, whiteSpace: 'nowrap' };
const tdSm: React.CSSProperties = { padding: '8px 10px', fontSize: '.75rem' };
const filterInput: React.CSSProperties = { padding: '6px 10px', fontSize: '.75rem', border: '1px solid var(--border)', borderRadius: 6, background: 'var(--bg-0)', color: 'var(--text-1)', outline: 'none', width: 130 };
const statusBadge: Record<string, string> = { active: 'badge-c4', suspended: 'badge-gold', approved: 'badge-c4', pending: 'badge-gold', rejected: 'badge-c5', delivered: 'badge-c4', shipping: 'badge-c5', processing: 'badge-c6', cancelled: 'badge-c5', paid: 'badge-c4', confirmed: 'badge-c6', packing: 'badge-c7', review: 'badge-c6' };
const statusLabelKeys: Record<string, string> = { active: 'status.active', suspended: 'status.suspended', approved: 'status.approved', pending: 'status.pending', rejected: 'status.rejected', delivered: 'status.delivered', shipping: 'status.shipping', processing: 'status.processing', cancelled: 'status.cancelled', paid: 'status.paid', confirmed: 'status.confirmed', packing: 'status.packing', review: 'status.review' };

function StatusBadge({ s, t }: { s: string; t: (key: string) => string }) {
  const label = statusLabelKeys[s] ? t(statusLabelKeys[s]) : s;
  return <span className={`badge ${statusBadge[s] || 'badge-c6'}`} style={{ fontSize: '.6rem' }}>{label}</span>;
}

function MiniTable({ headers, children }: { headers: string[]; children: React.ReactNode }) {
  return (
    <div style={{ borderRadius: 8, border: '1px solid var(--border)', overflow: 'hidden', marginTop: 12 }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead><tr style={{ background: 'var(--bg-0)' }}>{headers.map(h => <th key={h} style={thSm}>{h}</th>)}</tr></thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

function DateFilter({ from, to, onFrom, onTo, t }: { from: string; to: string; onFrom: (v: string) => void; onTo: (v: string) => void; t: (key: string) => string }) {
  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 12, flexWrap: 'wrap' }}>
      <span style={{ fontSize: '.7rem', color: 'var(--text-3)', fontWeight: 600 }}>{t('admin.filter.filterDate')}</span>
      <input type="date" value={from} onChange={e => onFrom(e.target.value)} style={filterInput} />
      <span style={{ fontSize: '.7rem', color: 'var(--text-4)' }}>→</span>
      <input type="date" value={to} onChange={e => onTo(e.target.value)} style={filterInput} />
    </div>
  );
}

function StatGrid({ items }: { items: { label: string; value: string | number; color: string; pct?: string; onClick?: () => void }[] }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(items.length, 4)}, 1fr)`, gap: 10, marginBottom: 16 }}>
      {items.map((r, i) => (
        <div key={i} style={{ padding: 14, borderRadius: 10, background: 'var(--bg-2)', textAlign: 'center', cursor: r.onClick ? 'pointer' : 'default', border: '1px solid var(--border)', transition: 'all .15s' }} onClick={r.onClick}>
          <div style={{ fontSize: '1.4rem', fontWeight: 800, color: r.color, whiteSpace: 'nowrap' }}>{r.value}</div>
          <div style={{ fontSize: '.68rem', color: 'var(--text-3)', marginTop: 2, whiteSpace: 'nowrap' }}>{r.label}</div>
          {r.pct && <div style={{ height: 3, borderRadius: 2, background: 'var(--bg-0)', marginTop: 6 }}><div style={{ height: '100%', width: `${Math.min(parseFloat(r.pct), 100)}%`, background: r.color, borderRadius: 2 }} /></div>}
        </div>
      ))}
    </div>
  );
}

export default function AdminOverview({ kpis, users, orders, kocs, vendors, products, commissions, onNavigate }: Props) {
  const { t } = useI18n();
  const [drillDown, setDrillDown] = useState<string | null>(null);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const usersByRole = { buyer: users.filter(u => u.role === 'user').length, koc: users.filter(u => u.role === 'koc').length, vendor: users.filter(u => u.role === 'vendor').length, admin: users.filter(u => u.role === 'admin').length };
  const ordersByStatus = { pending: orders.filter(o => o.status === 'pending').length, confirmed: orders.filter(o => o.status === 'confirmed').length, packing: orders.filter(o => o.status === 'packing').length, shipping: orders.filter(o => o.status === 'shipping').length, delivered: orders.filter(o => o.status === 'delivered').length, cancelled: orders.filter(o => o.status === 'cancelled').length };

  // Revenue by vendor
  const revenueByVendor = vendors.map(v => ({ name: v.shopName, revenue: v.revenue, products: v.products, status: v.status }));
  // Revenue by product (top sellers)
  const revenueByProduct = [...products].filter(p => p.sales > 0).sort((a, b) => b.sales - a.sales);

  // Filter helper
  const filterByDate = <T extends { date?: string }>(items: T[]) => {
    if (!dateFrom && !dateTo) return items;
    return items.filter(item => {
      const d = (item as any).date || (item as any).joinDate || '';
      if (dateFrom && d < dateFrom) return false;
      if (dateTo && d > dateTo) return false;
      return true;
    });
  };

  const filteredOrders = filterByDate(orders);

  const drillDownConfig: Record<string, { title: string; subtitle: string; tabs: { key: string; label: string; icon: string; content: JSX.Element }[] }> = {
    /* ═══════ DOANH THU ═══════ */
    'revenue': {
      title: t('admin.overview.revenueAnalysis'),
      subtitle: `${t('admin.misc.total')} ${kpis[1]?.value || '—'}`,
      tabs: [
        { key: 'byProduct', label: t('admin.overview.byProduct'), icon: '📦', content: (
          <div>
            <h4 style={{ fontSize: '.82rem', fontWeight: 700, marginBottom: 8 }}>{t('admin.overview.revenueByProduct')}</h4>
            <MiniTable headers={[t('admin.th.product'), t('admin.th.vendor'), t('admin.th.price'), t('admin.th.sold'), t('admin.th.status')]}>
              {revenueByProduct.map(p => (
                <tr key={p.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ ...tdSm, fontWeight: 600 }}>{p.name}</td>
                  <td style={{ ...tdSm, color: 'var(--text-3)' }}>{p.vendor}</td>
                  <td style={tdSm}>{p.price}</td>
                  <td style={{ ...tdSm, fontWeight: 700, color: 'var(--c4-500)' }}>{p.sales.toLocaleString()}</td>
                  <td style={tdSm}><StatusBadge t={t} s={p.status} /></td>
                </tr>
              ))}
            </MiniTable>
            <button style={{ marginTop: 14, padding: '8px 16px', borderRadius: 8, border: '1px solid var(--c6-500)', background: 'transparent', color: 'var(--c6-500)', cursor: 'pointer', fontSize: '.75rem', fontWeight: 600 }} onClick={() => { setDrillDown(null); onNavigate('products'); }}>{t('admin.overview.viewAllProducts')}</button>
          </div>
        )},
        { key: 'byVendor', label: t('admin.overview.byVendor'), icon: '🏪', content: (
          <div>
            <h4 style={{ fontSize: '.82rem', fontWeight: 700, marginBottom: 8 }}>{t('admin.overview.revenueByVendor')}</h4>
            {revenueByVendor.map((v, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px', borderRadius: 10, marginBottom: 6, background: 'var(--bg-2)', border: '1px solid var(--border)' }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '.82rem' }}>{v.name}</div>
                  <div style={{ fontSize: '.68rem', color: 'var(--text-3)' }}>{v.products} {t('admin.misc.products')} · <StatusBadge t={t} s={v.status} /></div>
                </div>
                <div style={{ fontWeight: 800, fontSize: '.95rem', color: 'var(--c4-500)' }}>{v.revenue}</div>
              </div>
            ))}
            <button style={{ marginTop: 14, padding: '8px 16px', borderRadius: 8, border: '1px solid var(--c6-500)', background: 'transparent', color: 'var(--c6-500)', cursor: 'pointer', fontSize: '.75rem', fontWeight: 600 }} onClick={() => { setDrillDown(null); onNavigate('vendor'); }}>{t('admin.overview.manageVendor')}</button>
          </div>
        )},
        { key: 'trend', label: 'Trend', icon: '📈', content: (
          <div>
            <h4 style={{ fontSize: '.82rem', fontWeight: 700, marginBottom: 12 }}>{t('admin.overview.trend12m')}</h4>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 140, padding: '0 4px' }}>
              {[
                { m: 'T4', v: 0.6 }, { m: 'T5', v: 0.7 }, { m: 'T6', v: 0.8 }, { m: 'T7', v: 0.75 },
                { m: 'T8', v: 0.9 }, { m: 'T9', v: 0.85 }, { m: 'T10', v: 1.0 }, { m: 'T11', v: 0.95 },
                { m: 'T12', v: 1.1 }, { m: 'T1', v: 1.05 }, { m: 'T2', v: 1.2 }, { m: 'T3', v: 1.28 },
              ].map((d, i) => (
                <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                  <span style={{ fontSize: '.55rem', color: 'var(--text-2)', fontWeight: 600 }}>{d.v}B</span>
                  <div style={{ width: '100%', height: `${d.v * 90}px`, background: i === 11 ? 'var(--c4-500)' : `linear-gradient(180deg, var(--c6-500), var(--c7-500))`, borderRadius: '3px 3px 0 0', opacity: 0.6 + (i * 0.03) }} />
                  <span style={{ fontSize: '.5rem', color: 'var(--text-4)' }}>{d.m}</span>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 16, padding: 12, borderRadius: 8, background: 'var(--bg-2)', border: '1px solid var(--border)' }}>
              <div style={{ fontSize: '.72rem', color: 'var(--text-3)' }}>{t('admin.overview.highestMonth')} <strong style={{ color: 'var(--c4-500)' }}>T3/2026 — 1.28B₫</strong></div>
              <div style={{ fontSize: '.72rem', color: 'var(--text-3)', marginTop: 4 }}>{t('admin.overview.avgGrowth')} <strong style={{ color: 'var(--c4-500)' }}>+6.7% MoM</strong></div>
            </div>
          </div>
        )},
      ],
    },

    /* ═══════ NGƯỜI DÙNG ═══════ */
    'users': {
      title: t('admin.overview.userAnalysis'),
      subtitle: `${t('admin.misc.total')} ${users.length} ${t('admin.misc.users')}`,
      tabs: [
        { key: 'breakdown', label: t('admin.overview.userDistribution'), icon: '📊', content: (
          <div>
            <StatGrid items={[
              { label: 'Buyer', value: usersByRole.buyer, color: 'var(--c4-500)', pct: ((usersByRole.buyer / users.length) * 100).toFixed(1) },
              { label: 'KOC/KOL', value: usersByRole.koc, color: 'var(--c6-500)', pct: ((usersByRole.koc / users.length) * 100).toFixed(1) },
              { label: 'Vendor', value: usersByRole.vendor, color: '#f59e0b', pct: ((usersByRole.vendor / users.length) * 100).toFixed(1) },
              { label: 'Admin', value: usersByRole.admin, color: '#ef4444', pct: ((usersByRole.admin / users.length) * 100).toFixed(1) },
            ]} />
            <h4 style={{ fontSize: '.82rem', fontWeight: 700, marginBottom: 8 }}>{t('admin.overview.userList')}</h4>
            <MiniTable headers={[t('admin.th.id'), t('admin.th.name'), t('admin.th.role'), t('admin.th.orders'), t('admin.th.status')]}>
              {users.map(u => (
                <tr key={u.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ ...tdSm, fontWeight: 600 }} className="mono">{u.id}</td>
                  <td style={{ ...tdSm, fontWeight: 600 }}>{u.name}</td>
                  <td style={tdSm}><span className={`badge badge-${u.role === 'koc' ? 'c6' : u.role === 'vendor' ? 'gold' : u.role === 'admin' ? 'c5' : 'c4'}`} style={{ fontSize: '.58rem' }}>{u.role}</span></td>
                  <td style={{ ...tdSm, fontWeight: 700, color: 'var(--c4-500)' }}>{u.orders}</td>
                  <td style={tdSm}><StatusBadge t={t} s={u.status} /></td>
                </tr>
              ))}
            </MiniTable>
            <button style={{ marginTop: 14, padding: '8px 16px', borderRadius: 8, border: '1px solid var(--c6-500)', background: 'transparent', color: 'var(--c6-500)', cursor: 'pointer', fontSize: '.75rem', fontWeight: 600 }} onClick={() => { setDrillDown(null); onNavigate('users'); }}>{t('admin.overview.viewAllUsers')}</button>
          </div>
        )},
      ],
    },

    /* ═══════ ĐƠN HÀNG ═══════ */
    'orders': {
      title: t('admin.overview.orderPipeline'),
      subtitle: `${t('admin.misc.total')} ${orders.length} ${t('admin.misc.orderCount')}`,
      tabs: [
        { key: 'pipeline', label: 'Pipeline', icon: '📦', content: (
          <div>
            <StatGrid items={[
              { label: t('admin.overview.waitConfirm'), value: ordersByStatus.pending, color: '#f59e0b' },
              { label: t('status.confirmed'), value: ordersByStatus.confirmed, color: 'var(--c6-500)' },
              { label: t('status.packing'), value: ordersByStatus.packing, color: 'var(--c7-500)' },
              { label: t('status.shipping'), value: ordersByStatus.shipping, color: 'var(--c5-500)' },
            ]} />
            <StatGrid items={[
              { label: t('status.delivered'), value: ordersByStatus.delivered, color: 'var(--c4-500)' },
              { label: t('status.cancelled'), value: ordersByStatus.cancelled, color: '#ef4444' },
            ]} />

            <DateFilter from={dateFrom} to={dateTo} onFrom={setDateFrom} onTo={setDateTo} t={t} />

            <h4 style={{ fontSize: '.82rem', fontWeight: 700, margin: '14px 0 8px' }}>{t('admin.overview.orderDetail')}</h4>
            <MiniTable headers={[t('admin.th.orderId'), t('admin.th.customer'), t('admin.th.product'), t('admin.th.amount'), t('admin.th.status'), t('admin.th.date')]}>
              {filteredOrders.map(o => {
                const isError = o.status === 'cancelled';
                return (
                  <tr key={o.id} style={{ borderBottom: '1px solid var(--border)', background: isError ? 'rgba(239,68,68,.06)' : 'transparent' }}>
                    <td style={{ ...tdSm, fontWeight: 600 }} className="mono">{o.id}</td>
                    <td style={tdSm}>{o.customer}</td>
                    <td style={tdSm}>{o.product}</td>
                    <td style={{ ...tdSm, fontWeight: 700, color: 'var(--c4-500)' }}>{o.amount}</td>
                    <td style={tdSm}><StatusBadge t={t} s={o.status} /></td>
                    <td style={{ ...tdSm, color: 'var(--text-3)' }}>{o.date}</td>
                  </tr>
                );
              })}
            </MiniTable>
            <button style={{ marginTop: 14, padding: '8px 16px', borderRadius: 8, border: '1px solid var(--c6-500)', background: 'transparent', color: 'var(--c6-500)', cursor: 'pointer', fontSize: '.75rem', fontWeight: 600 }} onClick={() => { setDrillDown(null); onNavigate('orders'); }}>{t('admin.overview.viewAllOrders')}</button>
          </div>
        )},
      ],
    },

    /* ═══════ KOC ═══════ */
    'koc': {
      title: t('admin.overview.kocPerformance'),
      subtitle: `${kocs.length} KOC ${t('admin.misc.activeLabel')}`,
      tabs: [
        { key: 'ranking', label: t('admin.overview.ranking'), icon: '🏆', content: (
          <div>
            {kocs.map((k, i) => (
              <div key={k.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px', borderRadius: 10, marginBottom: 6, background: 'var(--bg-2)', border: `1px solid ${i < 3 ? 'var(--gold-400)' : 'var(--border)'}` }}>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  <span style={{ fontSize: '1rem', fontWeight: 800, color: i < 3 ? 'var(--gold-400)' : 'var(--text-3)', width: 22, textAlign: 'center' }}>{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1}</span>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '.82rem' }}>{k.name}</div>
                    <span className={`badge badge-${k.tier === 'Diamond' ? 'c7' : k.tier === 'Gold' ? 'gold' : k.tier === 'Silver' ? 'c5' : 'c6'}`} style={{ fontSize: '.55rem' }}>{k.tier}</span>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: 700, color: 'var(--c4-500)', fontSize: '.82rem' }}>{k.sales}</div>
                  <div style={{ fontSize: '.65rem', color: 'var(--text-3)' }}>HH: {k.commission}</div>
                </div>
                <StatusBadge t={t} s={k.status} />
              </div>
            ))}
            <button style={{ marginTop: 14, padding: '8px 16px', borderRadius: 8, border: '1px solid var(--c6-500)', background: 'transparent', color: 'var(--c6-500)', cursor: 'pointer', fontSize: '.75rem', fontWeight: 600 }} onClick={() => { setDrillDown(null); onNavigate('koc'); }}>{t('admin.overview.manageKoc')}</button>
          </div>
        )},
      ],
    },

    /* ═══════ HOA HỒNG ═══════ */
    'commission': {
      title: t('admin.overview.commissionDetail'),
      subtitle: `${t('admin.misc.total')} ${kpis[4]?.value || '—'}`,
      tabs: [
        { key: 'list', label: t('admin.overview.list'), icon: '💰', content: (
          <div>
            <StatGrid items={[
              { label: t('admin.overview.paidLabel'), value: commissions.filter(c => c.status === 'paid').length, color: 'var(--c4-500)' },
              { label: t('admin.overview.pendingPay'), value: commissions.filter(c => c.status === 'pending').length, color: '#f59e0b' },
              { label: t('status.processing'), value: commissions.filter(c => c.status === 'processing').length, color: 'var(--c6-500)' },
            ]} />
            <MiniTable headers={['KOC', t('admin.th.amount'), t('admin.th.orders'), t('admin.th.txHash'), t('admin.th.date'), t('admin.th.status')]}>
              {commissions.map((c, i) => (
                <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ ...tdSm, fontWeight: 600 }}>{c.koc}</td>
                  <td style={{ ...tdSm, fontWeight: 700, color: 'var(--c4-500)' }}>{c.amount}</td>
                  <td style={tdSm}>{c.orders}</td>
                  <td style={{ ...tdSm, fontFamily: 'monospace', fontSize: '.65rem', color: 'var(--text-3)' }}>{c.txHash}</td>
                  <td style={{ ...tdSm, color: 'var(--text-3)' }}>{c.date}</td>
                  <td style={tdSm}><StatusBadge t={t} s={c.status} /></td>
                </tr>
              ))}
            </MiniTable>
            <button style={{ marginTop: 14, padding: '8px 16px', borderRadius: 8, border: '1px solid var(--c6-500)', background: 'transparent', color: 'var(--c6-500)', cursor: 'pointer', fontSize: '.75rem', fontWeight: 600 }} onClick={() => { setDrillDown(null); onNavigate('commission'); }}>{t('admin.overview.manageCommission')}</button>
          </div>
        )},
      ],
    },

    /* ═══════ DPP ═══════ */
    'dpp': {
      title: t('admin.overview.dppOverview'),
      subtitle: `${t('admin.misc.total')} ${kpis[5]?.value || '—'} DPP`,
      tabs: [
        { key: 'products', label: t('admin.overview.dppProducts'), icon: '🛡️', content: (
          <div>
            <StatGrid items={[
              { label: t('admin.overview.hasDpp'), value: products.filter(p => (p as any).dpp).length, color: 'var(--c4-500)' },
              { label: t('admin.overview.noDpp'), value: products.filter(p => !(p as any).dpp).length, color: '#f59e0b' },
            ]} />
            <h4 style={{ fontSize: '.82rem', fontWeight: 700, marginBottom: 8 }}>{t('admin.overview.dppMintedProducts')}</h4>
            <MiniTable headers={[t('admin.th.product'), t('admin.th.vendor'), t('admin.th.sold'), 'DPP']}>
              {products.filter(p => (p as any).dpp).map(p => (
                <tr key={p.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ ...tdSm, fontWeight: 600 }}>{p.name}</td>
                  <td style={{ ...tdSm, color: 'var(--text-3)' }}>{p.vendor}</td>
                  <td style={{ ...tdSm, fontWeight: 700, color: 'var(--c4-500)' }}>{p.sales.toLocaleString()}</td>
                  <td style={tdSm}><span className="badge badge-c4" style={{ fontSize: '.55rem' }}>Verified</span></td>
                </tr>
              ))}
            </MiniTable>
            <button style={{ marginTop: 14, padding: '8px 16px', borderRadius: 8, border: '1px solid var(--c6-500)', background: 'transparent', color: 'var(--c6-500)', cursor: 'pointer', fontSize: '.75rem', fontWeight: 600 }} onClick={() => { setDrillDown(null); onNavigate('dpp'); }}>{t('admin.overview.manageDpp')}</button>
          </div>
        )},
      ],
    },
  };

  // Map KPI index to drilldown config key
  const kpiDrillKeys = ['users', 'revenue', 'koc', 'orders', 'commission', 'dpp'];

  return (
    <>
      <h2 style={{ fontWeight: 700, fontSize: '1.1rem', marginBottom: 20 }}>{t('admin.overview.title')}</h2>

      {/* KPI Cards — clickable */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 24 }}>
        {kpis.map((kpi, i) => (
          <div key={i} className="card card-hover" style={{ padding: 20, cursor: 'pointer', border: '1px solid var(--border)', transition: 'all .2s' }}
            onClick={() => { setDrillDown(kpiDrillKeys[i] || kpi.label); setDateFrom(''); setDateTo(''); }}>
            <div style={{ fontSize: '.68rem', color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 6 }}>{kpi.label}</div>
            <div style={{ fontFamily: 'var(--ff-display)', fontWeight: 800, fontSize: '1.6rem', color: kpi.color }}>{kpi.value}</div>
            <div style={{ fontSize: '.72rem', color: 'var(--c4-500)', marginTop: 4 }}>↑ {kpi.delta}</div>
            <div style={{ fontSize: '.6rem', color: 'var(--text-4)', marginTop: 6 }}>{t('admin.overview.clickToDetail')}</div>
          </div>
        ))}
      </div>

      {/* Revenue chart */}
      <div className="card" style={{ padding: 20, marginBottom: 20 }}>
        <div style={{ fontSize: '.88rem', fontWeight: 700, marginBottom: 16 }}>{t('admin.overview.revenue12m')}</div>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 120 }}>
          {[0.6, 0.7, 0.8, 0.75, 0.9, 0.85, 1.0, 0.95, 1.1, 1.05, 1.2, 1.28].map((v, i) => (
            <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
              <div style={{ width: '100%', height: `${v * 90}px`, background: `linear-gradient(180deg, var(--c6-500), var(--c7-500))`, borderRadius: '4px 4px 0 0', opacity: 0.7 + (i * 0.025) }} />
              <span style={{ fontSize: '.5rem', color: 'var(--text-4)' }}>T{i + 1}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Quick links */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
        {[
          { label: t('admin.overview.manageUsers'), icon: '👥', tab: 'users' },
          { label: t('admin.overview.manageOrders'), icon: '📦', tab: 'orders' },
          { label: t('admin.overview.kycPending'), icon: '🪪', tab: 'kyc' },
          { label: t('admin.overview.commission'), icon: '💰', tab: 'commission' },
        ].map(link => (
          <div key={link.tab} className="card card-hover" style={{ padding: 16, cursor: 'pointer', textAlign: 'center' }} onClick={() => onNavigate(link.tab)}>
            <div style={{ fontSize: '1.3rem', marginBottom: 6 }}>{link.icon}</div>
            <div style={{ fontSize: '.75rem', fontWeight: 600 }}>{link.label}</div>
          </div>
        ))}
      </div>

      {/* Drill-down panel */}
      {drillDown && drillDownConfig[drillDown] && (
        <AdminDetailPanel
          title={drillDownConfig[drillDown].title}
          subtitle={drillDownConfig[drillDown].subtitle}
          tabs={drillDownConfig[drillDown].tabs}
          onClose={() => setDrillDown(null)}
        />
      )}
    </>
  );
}
