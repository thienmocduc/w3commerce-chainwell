import { Link } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';
import { productsApi } from '../lib/api';
import { useI18n } from '@hooks/useI18n';

/* ── Animated counter hook (IntersectionObserver) ── */
function useCounter(target: number, duration = 2000) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          const start = performance.now();
          const step = (now: number) => {
            const progress = Math.min((now - start) / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            setCount(Math.floor(eased * target));
            if (progress < 1) requestAnimationFrame(step);
          };
          requestAnimationFrame(step);
          observer.disconnect();
        }
      },
      { threshold: 0.3 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [target, duration]);

  return { count, ref };
}

/* ── Stat counter component ── */
function StatCounter({
  value,
  suffix,
  label,
}: {
  value: number;
  suffix: string;
  label: React.ReactNode;
}) {
  const { count, ref } = useCounter(value);
  return (
    <div className="stat-item" ref={ref}>
      <div className="stat-val">
        {suffix === '₫'
          ? `₫${count}B`
          : suffix === 'K'
            ? `${count}K`
            : count.toLocaleString()}
      </div>
      <div className="stat-lbl">{label}</div>
    </div>
  );
}

const PRODUCT_GRADIENTS = [
  'linear-gradient(135deg, #1e3a5f, #1e293b)',
  'linear-gradient(135deg, #2d1b69, #1e293b)',
  'linear-gradient(135deg, #14532d, #1e293b)',
  'linear-gradient(135deg, #7c2d12, #1e293b)',
  'linear-gradient(135deg, #1e293b, #334155)',
  'linear-gradient(135deg, #0c4a6e, #1e293b)',
];

const formatVND = (n: number) => new Intl.NumberFormat('vi-VN').format(n) + ' ₫';

// Fallback products shown while API is loading (Render free tier cold start)
const FALLBACK_FEATURED = [
  { id: 'f1', name: 'ANIMA 119 - Thức Thể Phân Tử Sống', price: 1868000, compare_at_price: null, category: 'food', dpp_verified: false, thumbnail_url: null },
  { id: 'f2', name: 'ANIMA 119 - Liệu Trình 3 Hộp (30 Gói)', price: 5604000, compare_at_price: null, category: 'food', dpp_verified: false, thumbnail_url: null },
  { id: 'f3', name: 'ANIMA 119 - Phục Hưng Toàn Diện 12 Hộp', price: 22416000, compare_at_price: null, category: 'food', dpp_verified: false, thumbnail_url: null },
  { id: 'f4', name: 'Trà Hoa Cúc Organic', price: 120000, compare_at_price: 160000, category: 'food', dpp_verified: false, thumbnail_url: null },
];

export default function Home() {
  const { t } = useI18n();
  const [featuredProducts, setFeaturedProducts] = useState<any[]>(FALLBACK_FEATURED);

  useEffect(() => {
    productsApi.list({ per_page: '6', sort: 'newest' } as any)
      .then((res: any) => {
        const items = res?.items ?? (Array.isArray(res) ? res : []);
        if (items.length > 0) setFeaturedProducts(items.slice(0, 6));
      })
      .catch(() => {}); // Keep fallback on error
  }, []);

  return (
    <>
      {/* ═══════════════════════════════════════════
          SECTION 1 — HERO
      ═══════════════════════════════════════════ */}
      <section className="hero">
        <div className="hero-bg" />

        <div className="chakra-rings">
          <div className="ring ring-1" />
          <div className="ring ring-2" />
          <div className="ring ring-3" />
          <div className="ring ring-4" />
        </div>

        <div className="hero-content" style={{ maxWidth: 1100, padding: 'clamp(8px,2vw,16px) 16px clamp(20px,3vw,40px)', boxSizing: 'border-box', width: '100%' }}>
          <div className="section-badge" style={{ marginBottom: 'clamp(10px,2vw,24px)', flexWrap: 'wrap', textAlign: 'center' }}>
            <span className="dot-pulse dot-indigo" /> Conscious Community Commerce · Polygon
          </div>

          <h1 className="display-xl" style={{ marginBottom: 'clamp(8px,1.5vw,16px)', lineHeight: 1.15, fontSize: 'clamp(1.7rem, 7vw, 5rem)', wordBreak: 'keep-all', overflowWrap: 'break-word' }}>
            <span className="gradient-text">{t('home.hero.title')}</span>
          </h1>

          <div style={{ textAlign: 'center', marginBottom: 'clamp(14px,3vw,36px)', display: 'flex', flexDirection: 'column', gap: 'clamp(6px,1.5vw,14px)', alignItems: 'center', width: '100%' }}>
            <div style={{ fontStyle: 'italic', fontSize: 'clamp(0.95rem, 4vw, 2.4rem)', fontWeight: 700, letterSpacing: '.03em', wordBreak: 'keep-all', overflowWrap: 'break-word', background: 'var(--chakra-text)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
              "{t('home.hero.line1')}"
            </div>
            <div style={{ fontStyle: 'italic', fontSize: 'clamp(0.95rem, 4vw, 2.4rem)', fontWeight: 700, letterSpacing: '.03em', wordBreak: 'keep-all', overflowWrap: 'break-word', background: 'var(--chakra-text)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
              "{t('home.hero.line2')}"
            </div>
            <div style={{ fontStyle: 'italic', fontSize: 'clamp(0.95rem, 4.2vw, 2.6rem)', fontWeight: 800, letterSpacing: '.03em', wordBreak: 'keep-all', overflowWrap: 'break-word', background: 'linear-gradient(135deg, #22c55e, #06b6d4, #6366f1)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
              "{t('home.hero.line3')}"
            </div>
          </div>

          <p
            style={{
              fontSize: 'clamp(0.88rem, 2.5vw, 1.35rem)',
              color: 'var(--text-2)',
              lineHeight: 1.7,
              maxWidth: 680,
              margin: '0 auto clamp(18px,3vw,40px)',
            }}
          >
            {t('home.hero.desc.prefix')} <strong style={{ color: 'var(--text-1)' }}>{t('home.hero.desc.buyer')}</strong> ·{' '}
            <strong style={{ color: 'var(--text-1)' }}>KOC</strong> ·{' '}
            <strong style={{ color: 'var(--text-1)' }}>Vendor</strong> {t('home.hero.desc.suffix')}
          </p>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 12,
              flexWrap: 'wrap',
            }}
          >
            <Link to="/login" className="btn btn-primary btn-lg" style={{ background: 'linear-gradient(135deg, #22c55e, #06b6d4)', fontSize: 'clamp(0.9rem,2.5vw,1.05rem)', padding: 'clamp(10px,2vw,14px) clamp(20px,4vw,36px)' }}>
              Bắt đầu →
            </Link>
            <Link to="/marketplace" className="btn btn-ghost btn-lg" style={{ border: '1px solid var(--border)', fontSize: 'clamp(0.9rem,2.5vw,1.05rem)', padding: 'clamp(10px,2vw,14px) clamp(20px,4vw,36px)' }}>
              {t('home.hero.cta.explore')}
            </Link>
          </div>

          {/* Stats bar */}
          <div className="stats-bar" style={{ marginTop: 'clamp(20px,4vw,48px)' }}>
            <StatCounter value={142} suffix="₫" label="GMV · YTD" />
            <StatCounter value={12847} suffix="" label="Active KOCs" />
            <StatCounter value={890} suffix="K" label={<span style={{ whiteSpace: 'nowrap' }}>DPP Minted</span>} />
            <StatCounter value={333} suffix="" label={<span style={{ whiteSpace: 'nowrap' }}>AI Agents</span>} />
          </div>
        </div>
      </section>

      <div className="chakra-divider" />

      {/* ═══════════════════════════════════════════
          SECTION 2 — TRIẾT LÝ THIỆN LÀNH
      ═══════════════════════════════════════════ */}
      <section className="section" style={{ background: 'var(--bg-1)' }}>
        <div className="container">
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <div className="section-badge">
              <span className="dot-pulse dot-green" /> {t('home.philosophy.badge')}
            </div>
            <h2 className="display-lg" style={{ marginBottom: 12 }}>
              {t('home.philosophy.title.prefix')} <span className="gradient-text">{t('home.philosophy.title.highlight')}</span>
            </h2>
            <p
              style={{
                fontSize: '1.05rem',
                color: 'var(--text-2)',
                maxWidth: 560,
                margin: '0 auto',
                lineHeight: 1.7,
              }}
            >
              {t('home.philosophy.desc')}
            </p>
          </div>

          <div className="grid-3">
            {/* Principle 1 — Minh bạch */}
            <div className="card card-glass card-hover" style={{ padding: 36, textAlign: 'center' }}>
              <div
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, var(--c4-500), var(--c5-500))',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.5rem',
                  margin: '0 auto 20px',
                  color: '#fff',
                  boxShadow: '0 4px 20px rgba(34,197,94,.3)',
                }}
              >
                ⬡
              </div>
              <h3
                style={{
                  fontSize: '1.15rem',
                  fontWeight: 700,
                  marginBottom: 10,
                  color: 'var(--text-1)',
                }}
              >
                {t('home.philosophy.transparency.title')}
              </h3>
              <p
                style={{
                  fontSize: '.9rem',
                  color: 'var(--text-2)',
                  lineHeight: 1.7,
                  marginBottom: 16,
                }}
              >
                {t('home.philosophy.transparency.desc').replace(/on-chain/gi, 'on\u2011chain')}
              </p>
              <div
                style={{
                  width: 40,
                  height: 3,
                  borderRadius: 2,
                  background: 'linear-gradient(90deg, var(--c4-500), var(--c5-500))',
                  margin: '0 auto',
                }}
              />
            </div>

            {/* Principle 2 — Công bằng */}
            <div className="card card-glass card-hover" style={{ padding: 36, textAlign: 'center' }}>
              <div
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, var(--c5-500), var(--c6-500))',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.5rem',
                  margin: '0 auto 20px',
                  color: '#fff',
                  boxShadow: '0 4px 20px rgba(6,182,212,.3)',
                }}
              >
                ⚖️
              </div>
              <h3
                style={{
                  fontSize: '1.15rem',
                  fontWeight: 700,
                  marginBottom: 10,
                  color: 'var(--text-1)',
                }}
              >
                {t('home.philosophy.fairness.title')}
              </h3>
              <p
                style={{
                  fontSize: '.9rem',
                  color: 'var(--text-2)',
                  lineHeight: 1.7,
                  marginBottom: 16,
                }}
              >
                {t('home.philosophy.fairness.desc')}
              </p>
              <div
                style={{
                  width: 40,
                  height: 3,
                  borderRadius: 2,
                  background: 'linear-gradient(90deg, var(--c5-500), var(--c6-500))',
                  margin: '0 auto',
                }}
              />
            </div>

            {/* Principle 3 — Trí tuệ */}
            <div className="card card-glass card-hover" style={{ padding: 36, textAlign: 'center' }}>
              <div
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, var(--c6-500), var(--c7-500))',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.5rem',
                  margin: '0 auto 20px',
                  color: '#fff',
                  boxShadow: '0 4px 20px rgba(99,102,241,.3)',
                }}
              >
                🧠
              </div>
              <h3
                style={{
                  fontSize: '1.15rem',
                  fontWeight: 700,
                  marginBottom: 10,
                  color: 'var(--text-1)',
                }}
              >
                {t('home.philosophy.intelligence.title')}
              </h3>
              <p
                style={{
                  fontSize: '.9rem',
                  color: 'var(--text-2)',
                  lineHeight: 1.7,
                  marginBottom: 16,
                }}
              >
                {t('home.philosophy.intelligence.desc')}
              </p>
              <div
                style={{
                  width: 40,
                  height: 3,
                  borderRadius: 2,
                  background: 'linear-gradient(90deg, var(--c6-500), var(--c7-500))',
                  margin: '0 auto',
                }}
              />
            </div>
          </div>
        </div>
      </section>

      <div className="chakra-divider" />

      {/* ═══════════════════════════════════════════
          SECTION 3 — HỆ SINH THÁI 3 VAI TRÒ
      ═══════════════════════════════════════════ */}
      <section className="section" style={{ background: 'var(--bg-0)' }}>
        <div className="container">
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <div className="section-badge">
              <span className="dot-pulse dot-blue" /> {t('home.ecosystem.badge')}
            </div>
            <h2 className="display-lg" style={{ marginBottom: 12 }}>
              {t('home.ecosystem.title.prefix')}{' '}
              <span className="gradient-text">{t('home.ecosystem.title.highlight')}</span>
            </h2>
            <p
              style={{
                fontSize: '1.05rem',
                color: 'var(--text-2)',
                maxWidth: 560,
                margin: '0 auto',
                lineHeight: 1.7,
              }}
            >
              {t('home.ecosystem.desc')}
            </p>
          </div>

          <div className="grid-3">
            {/* ── Buyer Card ── */}
            <div className="role-card role-buyer card-hover" style={{ padding: 32 }}>
              <div className="role-icon">🛍️</div>
              <h3
                style={{
                  fontSize: '1.25rem',
                  fontWeight: 700,
                  marginBottom: 10,
                  color: 'var(--text-1)',
                }}
              >
                {t('home.ecosystem.buyer.title')}
              </h3>
              <p
                style={{
                  fontSize: '.9rem',
                  color: 'var(--text-2)',
                  lineHeight: 1.7,
                  marginBottom: 20,
                }}
              >
                {t('home.ecosystem.buyer.desc')}
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 20 }}>
                <span className="badge badge-c4" style={{ whiteSpace: 'nowrap' }}>DPP Verify</span>
                <span className="badge badge-c5" style={{ whiteSpace: 'nowrap' }}>Group Buy</span>
                <span className="badge badge-c4" style={{ whiteSpace: 'nowrap' }}>Follow KOC</span>
                <span className="badge badge-c5" style={{ whiteSpace: 'nowrap' }}>Copy Cart</span>
              </div>
              <div
                style={{
                  fontSize: '.72rem',
                  color: 'var(--text-3)',
                  borderTop: '1px solid var(--border)',
                  paddingTop: 14,
                  fontWeight: 600,
                  letterSpacing: '.04em',
                }}
              >
                <span style={{ whiteSpace: 'nowrap' }}>Discover → Verify → Buy → Review</span>
              </div>
            </div>

            {/* ── KOC Card (highlighted) ── */}
            <div
              className="role-card role-koc card-hover"
              style={{
                padding: 32,
                position: 'relative',
                transform: 'scale(1.04)',
                zIndex: 2,
                boxShadow: '0 8px 40px rgba(99,102,241,.15)',
              }}
            >
              <div
                className="badge badge-gold"
                style={{ position: 'absolute', top: 16, right: 16, fontSize: '.65rem' }}
              >
                {t('home.ecosystem.koc.badge')}
              </div>
              <div className="role-icon">⭐</div>
              <h3
                style={{
                  fontSize: '1.25rem',
                  fontWeight: 700,
                  marginBottom: 10,
                  color: 'var(--text-1)',
                }}
              >
                KOC / KOL
              </h3>
              <p
                style={{
                  fontSize: '.9rem',
                  color: 'var(--text-2)',
                  lineHeight: 1.7,
                  marginBottom: 20,
                }}
              >
                {t('home.ecosystem.koc.desc')}
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 20 }}>
                <span className="badge badge-c6" style={{ whiteSpace: 'nowrap' }}>T1 40%</span>
                <span className="badge badge-c7" style={{ whiteSpace: 'nowrap' }}>T2 13%</span>
                <span className="badge badge-c6" style={{ whiteSpace: 'nowrap' }}>Creator Token</span>
                <span className="badge badge-c7" style={{ whiteSpace: 'nowrap' }}>Reputation NFT</span>
              </div>
              <div
                style={{
                  fontSize: '.72rem',
                  color: 'var(--text-3)',
                  borderTop: '1px solid var(--border)',
                  paddingTop: 14,
                  fontWeight: 600,
                  letterSpacing: '.04em',
                }}
              >
                <span style={{ whiteSpace: 'nowrap' }}>Create → Promote → Convert → Earn</span>
              </div>
            </div>

            {/* ── Vendor Card ── */}
            <div className="role-card role-vendor card-hover" style={{ padding: 32 }}>
              <div className="role-icon">🏪</div>
              <h3
                style={{
                  fontSize: '1.25rem',
                  fontWeight: 700,
                  marginBottom: 10,
                  color: 'var(--text-1)',
                }}
              >
                Vendor
              </h3>
              <p
                style={{
                  fontSize: '.9rem',
                  color: 'var(--text-2)',
                  lineHeight: 1.7,
                  marginBottom: 20,
                }}
              >
                {t('home.ecosystem.vendor.desc')}
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 20 }}>
                <span className="badge badge-c7" style={{ whiteSpace: 'nowrap' }}>DPP Mint</span>
                <span className="badge badge-c6" style={{ whiteSpace: 'nowrap' }}>AI Live</span>
                <span className="badge badge-c7" style={{ whiteSpace: 'nowrap' }}>Analytics</span>
                <span className="badge badge-c6" style={{ whiteSpace: 'nowrap' }}>333 Agents</span>
              </div>
              <div
                style={{
                  fontSize: '.72rem',
                  color: 'var(--text-3)',
                  borderTop: '1px solid var(--border)',
                  paddingTop: 14,
                  fontWeight: 600,
                  letterSpacing: '.04em',
                }}
              >
                <span style={{ whiteSpace: 'nowrap' }}>List → Mint DPP → KOC Sell → Earn</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="chakra-divider" />

      {/* ═══════════════════════════════════════════
          SECTION 4 — HOA HỒNG ON-CHAIN
      ═══════════════════════════════════════════ */}
      <section className="section" style={{ background: 'var(--bg-1)' }}>
        <div className="container">
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <div className="section-badge">
              <span className="dot-pulse dot-violet" /> <span style={{ whiteSpace: 'nowrap' }}>On-chain Commission</span>
            </div>
            <h2 className="display-lg" style={{ marginBottom: 12 }}>
              {t('home.commission.title.prefix').replace(/Hoa hồng/g, 'Hoa\u00A0hồng').replace(/minh bạch/g, 'minh\u00A0bạch')}{' '}
              <span className="gradient-text">{t('home.commission.title.highlight')}</span>
            </h2>
            <p
              style={{
                fontSize: '1.05rem',
                color: 'var(--text-2)',
                maxWidth: 520,
                margin: '0 auto',
              }}
            >
              {t('home.commission.desc')}
            </p>
          </div>

          {/* Horizontal flow */}
          <div className="commission-flow" style={{ padding: '48px 32px', borderRadius: 28 }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 0,
                position: 'relative',
                zIndex: 1,
                flexWrap: 'wrap',
              }}
            >
              {/* Step 1 */}
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  textAlign: 'center',
                  minWidth: 100,
                  padding: '8px 12px',
                }}
              >
                <div
                  style={{
                    width: 64,
                    height: 64,
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, var(--c4-500), var(--c5-500))',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.5rem',
                    marginBottom: 12,
                    boxShadow: '0 4px 20px rgba(34,197,94,.3)',
                  }}
                >
                  🛍️
                </div>
                <span
                  style={{
                    fontSize: '.82rem',
                    fontWeight: 600,
                    color: 'var(--text-1)',
                    marginBottom: 2,
                  }}
                >
                  {t('home.commission.step1')}
                </span>
                <span className="mono" style={{ color: 'var(--text-3)', fontSize: '.68rem' }}>
                  {t('home.commission.step1.label')}
                </span>
              </div>

              {/* Arrow */}
              <div
                style={{
                  width: 48,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  position: 'relative',
                }}
              >
                <div
                  style={{
                    width: '100%',
                    height: 2,
                    background: 'var(--chakra-flow)',
                    borderRadius: 1,
                  }}
                />
                <span style={{ position: 'absolute', color: 'var(--text-3)', fontSize: '.8rem' }}>
                  →
                </span>
              </div>

              {/* Step 2 */}
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  textAlign: 'center',
                  minWidth: 100,
                  padding: '8px 12px',
                }}
              >
                <div
                  style={{
                    width: 64,
                    height: 64,
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, var(--c5-500), var(--c5-700))',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.5rem',
                    marginBottom: 12,
                    boxShadow: '0 4px 20px rgba(6,182,212,.3)',
                  }}
                >
                  📦
                </div>
                <span
                  style={{
                    fontSize: '.82rem',
                    fontWeight: 600,
                    color: 'var(--text-1)',
                    marginBottom: 2,
                  }}
                >
                  {t('home.commission.step2')}
                </span>
                <span className="mono" style={{ color: 'var(--text-3)', fontSize: '.68rem' }}>
                  {t('home.commission.step2.label')}
                </span>
              </div>

              {/* Arrow */}
              <div
                style={{
                  width: 48,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  position: 'relative',
                }}
              >
                <div
                  style={{
                    width: '100%',
                    height: 2,
                    background: 'var(--chakra-flow)',
                    borderRadius: 1,
                  }}
                />
                <span style={{ position: 'absolute', color: 'var(--text-3)', fontSize: '.8rem' }}>
                  →
                </span>
              </div>

              {/* Step 3 — Highlight */}
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  textAlign: 'center',
                  minWidth: 110,
                  padding: '8px 12px',
                }}
              >
                <div
                  style={{
                    width: 72,
                    height: 72,
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, var(--c6-500), var(--c7-500))',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.6rem',
                    marginBottom: 12,
                    boxShadow: 'var(--chakra-glow)',
                    border: '2px solid rgba(99,102,241,.4)',
                  }}
                >
                  ⛓️
                </div>
                <span
                  style={{
                    fontSize: '.82rem',
                    fontWeight: 700,
                    color: 'var(--text-1)',
                    marginBottom: 2,
                  }}
                >
                  {t('home.commission.step3')}
                </span>
                <span className="mono" style={{ color: 'var(--c6-300)', fontSize: '.68rem' }}>
                  Polygon
                </span>
              </div>

              {/* Arrow */}
              <div
                style={{
                  width: 48,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  position: 'relative',
                }}
              >
                <div
                  style={{
                    width: '100%',
                    height: 2,
                    background: 'var(--chakra-flow)',
                    borderRadius: 1,
                  }}
                />
                <span style={{ position: 'absolute', color: 'var(--text-3)', fontSize: '.8rem' }}>
                  →
                </span>
              </div>

              {/* Step 4 */}
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  textAlign: 'center',
                  minWidth: 100,
                  padding: '8px 12px',
                }}
              >
                <div
                  style={{
                    width: 64,
                    height: 64,
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, var(--c6-500), var(--c7-500))',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.5rem',
                    marginBottom: 12,
                    boxShadow: '0 4px 20px rgba(99,102,241,.3)',
                  }}
                >
                  ⭐
                </div>
                <span
                  style={{
                    fontSize: '.82rem',
                    fontWeight: 600,
                    color: 'var(--text-1)',
                    marginBottom: 2,
                  }}
                >
                  {t('home.commission.step4')}
                </span>
                <span className="mono" style={{ color: 'var(--text-3)', fontSize: '.68rem' }}>
                  <span style={{ whiteSpace: 'nowrap' }}>T1 40%</span> · <span style={{ whiteSpace: 'nowrap' }}>T2 13%</span>
                </span>
              </div>

              {/* Arrow */}
              <div
                style={{
                  width: 48,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  position: 'relative',
                }}
              >
                <div
                  style={{
                    width: '100%',
                    height: 2,
                    background: 'var(--chakra-flow)',
                    borderRadius: 1,
                  }}
                />
                <span style={{ position: 'absolute', color: 'var(--text-3)', fontSize: '.8rem' }}>
                  →
                </span>
              </div>

              {/* Step 5 */}
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  textAlign: 'center',
                  minWidth: 100,
                  padding: '8px 12px',
                }}
              >
                <div
                  style={{
                    width: 64,
                    height: 64,
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, var(--c7-500), var(--c4-500))',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.5rem',
                    marginBottom: 12,
                    boxShadow: '0 4px 20px rgba(168,85,247,.3)',
                  }}
                >
                  ✓
                </div>
                <span
                  style={{
                    fontSize: '.82rem',
                    fontWeight: 600,
                    color: 'var(--text-1)',
                    marginBottom: 2,
                  }}
                >
                  {t('home.commission.step5').replace(/on-chain/gi, 'on\u2011chain')}
                </span>
                <span className="mono" style={{ color: 'var(--text-3)', fontSize: '.68rem' }}>
                  Immutable
                </span>
              </div>
            </div>
          </div>

          {/* Verified strip */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 24,
              marginTop: 24,
              padding: '14px 24px',
              borderRadius: 14,
              background: 'var(--badge-verified-bg)',
              border: '1px solid rgba(34,197,94,.2)',
              flexWrap: 'wrap',
            }}
          >
            <span
              style={{
                fontSize: '.78rem',
                fontWeight: 700,
                color: 'var(--badge-verified-clr)',
              }}
            >
              <span style={{ whiteSpace: 'nowrap' }}>⬡ Verified on Polygon</span>
            </span>
            <span className="mono" style={{ color: 'var(--text-3)', whiteSpace: 'nowrap' }}>
              0x7A3b...2eF8::CommissionSplit
            </span>
            <span
              style={{
                fontSize: '.78rem',
                fontWeight: 700,
                color: 'var(--badge-verified-clr)',
              }}
            >
              ✓ Immutable
            </span>
          </div>
        </div>
      </section>

      <div className="chakra-divider" />

      {/* ═══════════════════════════════════════════
          SECTION 5 — CON SỐ ẤN TƯỢNG
      ═══════════════════════════════════════════ */}
      <section
        style={{
          padding: '96px 0',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Gradient background */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background:
              'linear-gradient(135deg, rgba(34,197,94,.1) 0%, rgba(6,182,212,.12) 25%, rgba(99,102,241,.14) 50%, rgba(168,85,247,.1) 75%, rgba(34,197,94,.08) 100%)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'var(--bg-0)',
            opacity: 0.82,
          }}
        />

        <div
          className="container"
          style={{ position: 'relative', zIndex: 1, textAlign: 'center' }}
        >
          <div style={{ marginBottom: 56 }}>
            <div className="section-badge">
              <span className="dot-pulse dot-indigo" /> Social Proof
            </div>
            <h2 className="display-lg">
              {t('home.stats.title.prefix')} <span className="gradient-text">{t('home.stats.title.highlight')}</span>
            </h2>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))',
              gap: 16,
              maxWidth: 960,
              margin: '0 auto',
            }}
          >
            {[
              { value: 142, suffix: '₫', label: t('home.stats.gmv') },
              { value: 12847, suffix: '', label: 'Active\u00A0KOCs' },
              { value: 890, suffix: 'K', label: 'DPP\u00A0Minted' },
              { value: 333, suffix: '', label: 'AI\u00A0Agents' },
              { value: 2400, suffix: '', label: 'Live\u00A0Sessions' },
              { value: 38, suffix: '₫', label: t('home.stats.commissionPaid') },
            ].map((stat, i) => (
              <MetricCounter
                key={i}
                value={stat.value}
                suffix={stat.suffix}
                label={stat.label}
              />
            ))}
          </div>
        </div>
      </section>

      <div className="chakra-divider" />

      {/* ═══════════════════════════════════════════
          SECTION 6 — CÔNG NGHỆ ĐÁNG TIN
      ═══════════════════════════════════════════ */}
      <section className="section" style={{ background: 'var(--bg-1)' }}>
        <div className="container">
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <div className="section-badge">
              <span className="dot-pulse dot-indigo" /> {t('home.tech.badge')}
            </div>
            <h2 className="display-lg">
              {t('home.tech.title.prefix')} <span className="gradient-text">{t('home.tech.title.highlight')}</span>
            </h2>
          </div>

          {/* Tech badges */}
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              justifyContent: 'center',
              gap: 12,
              marginBottom: 48,
            }}
          >
            {['Polygon', 'IPFS', 'OpenAI', 'Supabase', 'React', 'Solidity'].map(
              (tech) => (
                <div
                  key={tech}
                  className="card"
                  style={{
                    padding: '12px 24px',
                    borderRadius: 12,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    fontSize: '.85rem',
                    fontWeight: 600,
                    color: 'var(--text-2)',
                    transition: 'var(--t-base)',
                    cursor: 'default',
                  }}
                >
                  <span
                    style={{
                      fontFamily: 'var(--ff-mono)',
                      fontSize: '.75rem',
                      color: 'var(--text-3)',
                    }}
                  >
                    {'<>'}
                  </span>
                  {tech}
                </div>
              ),
            )}
          </div>

          {/* Trust indicators */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              gap: 24,
              flexWrap: 'wrap',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '16px 28px',
                borderRadius: 16,
                background: 'var(--badge-verified-bg)',
                border: '1px solid rgba(34,197,94,.2)',
              }}
            >
              <span style={{ fontSize: '1.2rem' }}>⬡</span>
              <div>
                <div
                  style={{
                    fontWeight: 700,
                    fontSize: '.85rem',
                    color: 'var(--badge-verified-clr)',
                  }}
                >
                  <span style={{ whiteSpace: 'nowrap' }}>100% On-chain</span>
                </div>
                <div style={{ fontSize: '.72rem', color: 'var(--text-3)' }}>
                  {t('home.tech.onchain.desc')}
                </div>
              </div>
            </div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '16px 28px',
                borderRadius: 16,
                background: 'rgba(99,102,241,.08)',
                border: '1px solid rgba(99,102,241,.2)',
              }}
            >
              <span style={{ fontSize: '1.2rem' }}>⛓️</span>
              <div>
                <div
                  style={{
                    fontWeight: 700,
                    fontSize: '.85rem',
                    color: 'var(--c6-300)',
                  }}
                >
                  <span style={{ whiteSpace: 'nowrap' }}>Smart Contract Audited</span>
                </div>
                <div style={{ fontSize: '.72rem', color: 'var(--text-3)' }}>
                  {t('home.tech.audit.desc')}
                </div>
              </div>
            </div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '16px 28px',
                borderRadius: 16,
                background: 'rgba(168,85,247,.08)',
                border: '1px solid rgba(168,85,247,.2)',
              }}
            >
              <span style={{ fontSize: '1.2rem' }}>🧠</span>
              <div>
                <div
                  style={{
                    fontWeight: 700,
                    fontSize: '.85rem',
                    color: 'var(--c7-300)',
                  }}
                >
                  <span style={{ whiteSpace: 'nowrap' }}>333 AI Agents</span> <span style={{ whiteSpace: 'nowrap' }}>24/7</span>
                </div>
                <div style={{ fontSize: '.72rem', color: 'var(--text-3)' }}>
                  {t('home.tech.ai.desc')}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="chakra-divider" />

      {/* ═══════════════════════════════════════════
          SECTION 7 — SẢN PHẨM NỔI BẬT
      ═══════════════════════════════════════════ */}
      <section className="section" style={{ background: 'var(--bg-0)' }}>
          <div className="container">
            <div style={{ textAlign: 'center', marginBottom: 48 }}>
              <div className="section-badge" style={{ marginBottom: 12 }}>
                <span className="dot-pulse dot-green" /> Sản phẩm trên WellKOC
              </div>
              <h2 className="display-lg" style={{ marginBottom: 16 }}>
                Sản phẩm <span className="gradient-text">nổi bật</span>
              </h2>
              <p style={{ color: 'var(--text-2)', maxWidth: 500, margin: '0 auto' }}>
                Sản phẩm được xác thực nguồn gốc DPP on-chain, minh bạch tuyệt đối.
              </p>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
              gap: 20,
            }}>
              {featuredProducts.map((p: any, i: number) => (
                <Link
                  key={p.id}
                  to={`/marketplace`}
                  style={{ textDecoration: 'none' }}
                >
                  <div style={{
                    background: 'var(--bg-1)',
                    border: '1px solid var(--border)',
                    borderRadius: 16,
                    overflow: 'hidden',
                    transition: 'transform .2s, box-shadow .2s',
                    cursor: 'pointer',
                  }}
                    onMouseEnter={e => {
                      (e.currentTarget as HTMLElement).style.transform = 'translateY(-4px)';
                      (e.currentTarget as HTMLElement).style.boxShadow = '0 12px 32px rgba(0,0,0,.25)';
                    }}
                    onMouseLeave={e => {
                      (e.currentTarget as HTMLElement).style.transform = '';
                      (e.currentTarget as HTMLElement).style.boxShadow = '';
                    }}
                  >
                    {/* Product image / gradient placeholder */}
                    <div style={{
                      height: 180,
                      background: p.thumbnail_url ? `url(${p.thumbnail_url}) center/cover` : PRODUCT_GRADIENTS[i % PRODUCT_GRADIENTS.length],
                      position: 'relative',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                      {!p.thumbnail_url && (
                        <span style={{ fontSize: 40 }}>🌿</span>
                      )}
                      {p.dpp_verified && (
                        <span style={{
                          position: 'absolute', top: 10, left: 10,
                          background: 'rgba(34,197,94,.9)', color: '#fff',
                          fontSize: '.7rem', fontWeight: 700,
                          padding: '3px 8px', borderRadius: 20,
                        }}>DPP ✓</span>
                      )}
                      {p.compare_at_price && p.compare_at_price > p.price && (
                        <span style={{
                          position: 'absolute', top: 10, right: 10,
                          background: 'rgba(239,68,68,.9)', color: '#fff',
                          fontSize: '.7rem', fontWeight: 700,
                          padding: '3px 8px', borderRadius: 20,
                        }}>
                          -{Math.round((1 - p.price / p.compare_at_price) * 100)}%
                        </span>
                      )}
                    </div>

                    {/* Info */}
                    <div style={{ padding: '14px 16px' }}>
                      <div style={{
                        fontSize: '.75rem', color: 'var(--text-3)',
                        textTransform: 'uppercase', letterSpacing: '.05em',
                        marginBottom: 6,
                      }}>{p.category}</div>
                      <div style={{
                        fontWeight: 600, color: 'var(--text-1)',
                        fontSize: '.95rem', lineHeight: 1.4, marginBottom: 10,
                        display: '-webkit-box', WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical', overflow: 'hidden',
                      }}>{p.name}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontWeight: 700, color: '#22c55e', fontSize: '1rem' }}>
                          {formatVND(p.price)}
                        </span>
                        {p.compare_at_price && p.compare_at_price > p.price && (
                          <span style={{ fontSize: '.8rem', color: 'var(--text-3)', textDecoration: 'line-through' }}>
                            {formatVND(p.compare_at_price)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>

            <div style={{ textAlign: 'center', marginTop: 40 }}>
              <Link to="/marketplace" className="btn btn-primary btn-lg">
                Xem tất cả sản phẩm →
              </Link>
            </div>
          </div>
        </section>

      <div className="chakra-divider" />

      {/* ═══════════════════════════════════════════
          SECTION 8 — CTA BOTTOM
      ═══════════════════════════════════════════ */}
      <section
        style={{
          padding: '96px 24px',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Warm gradient background */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background:
              'linear-gradient(135deg, rgba(34,197,94,.1) 0%, rgba(6,182,212,.12) 25%, rgba(99,102,241,.14) 50%, rgba(168,85,247,.1) 75%, rgba(34,197,94,.08) 100%)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'var(--bg-0)',
            opacity: 0.85,
          }}
        />

        <div
          className="container"
          style={{ position: 'relative', zIndex: 1, textAlign: 'center' }}
        >
          <h2 className="display-lg" style={{ marginBottom: 16 }}>
            {t('home.cta.title.prefix')}{' '}
            <span className="gradient-text">{t('home.cta.title.highlight')}</span>
          </h2>
          <p
            style={{
              fontSize: '1.05rem',
              color: 'var(--text-2)',
              maxWidth: 520,
              margin: '0 auto 40px',
              lineHeight: 1.7,
            }}
          >
            {t('home.cta.desc')}
          </p>

          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              gap: 16,
              flexWrap: 'wrap',
            }}
          >
            <Link to="/login" className="btn btn-primary btn-lg">
              {t('home.cta.login')}
            </Link>
            <Link to="/register" className="btn btn-secondary btn-lg">
              {t('home.cta.register')}
            </Link>
          </div>

          <p style={{ marginTop: 24, fontSize: '.78rem', color: 'var(--text-3)' }}>
            {t('home.cta.footnote')}
          </p>
        </div>
      </section>

      {/* Inline animation keyframes */}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
        @media (max-width: 768px) {
          .grid-6-metrics {
            grid-template-columns: repeat(2, 1fr) !important;
          }
        }
      `}</style>
    </>
  );
}

/* ── Metric counter for Section 5 ── */
function MetricCounter({
  value,
  suffix,
  label,
}: {
  value: number;
  suffix: string;
  label: React.ReactNode;
}) {
  const { count, ref } = useCounter(value);
  return (
    <div
      ref={ref}
      style={{
        textAlign: 'center',
        padding: '24px 8px',
      }}
    >
      <div
        style={{
          fontFamily: 'var(--ff-display)',
          fontWeight: 800,
          fontSize: 'clamp(1.6rem, 3vw, 2.2rem)',
          lineHeight: 1,
          background: 'var(--chakra-text)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
          marginBottom: 8,
        }}
      >
        {suffix === '₫'
          ? `₫${count}B`
          : suffix === 'K'
            ? `${count.toLocaleString()}K`
            : count.toLocaleString()}
      </div>
      <div
        style={{
          fontSize: '.68rem',
          fontWeight: 600,
          color: 'var(--text-3)',
          letterSpacing: '.06em',
          textTransform: 'uppercase',
          whiteSpace: 'nowrap',
        }}
      >
        {label}
      </div>
    </div>
  );
}
