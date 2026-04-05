import { useState, useEffect, useRef } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { Sun, Moon, ChevronDown, X } from 'lucide-react';
import { useTheme } from '@hooks/useTheme';
import { useI18n, LANGUAGES } from '@hooks/useI18n';
import type { Locale } from '@hooks/useI18n';
import { useAuth } from '@hooks/useAuth';
import ChatWidget from '@components/ChatWidget';

/* ── Zeni Digital Logo ── */
function ZeniLogo({ height = 36 }: { height?: number }) {
  return (
    <img
      src="/zeni-logo.png"
      alt="Zeni Digital"
      height={height}
      style={{ display: 'block', objectFit: 'contain' }}
      onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
    />
  );
}

/* ── WK Logo SVG — Brand chuẩn từ Design System ── */
function WKLogo({ size = 38 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 38 38" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="wkGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#22c55e"/>
          <stop offset="33%" stopColor="#06b6d4"/>
          <stop offset="66%" stopColor="#6366f1"/>
          <stop offset="100%" stopColor="#a855f7"/>
        </linearGradient>
        <filter id="wkGlow">
          <feGaussianBlur stdDeviation="1.5" result="blur"/>
          <feComposite in="SourceGraphic" in2="blur" operator="over"/>
        </filter>
      </defs>
      {/* Outer chakra ring */}
      <circle cx="19" cy="19" r="17.5" stroke="url(#wkGrad)" strokeWidth="1" opacity={0.6}/>
      {/* Inner ring */}
      <circle cx="19" cy="19" r="13" stroke="url(#wkGrad)" strokeWidth="0.5" opacity={0.35}/>
      {/* W letterform */}
      <path d="M7 11L10.5 24L14 16L17.5 24L21 11" stroke="url(#wkGrad)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
      {/* K letterform */}
      <path d="M23 11V27M23 19L31 11M23 19L31 27" stroke="url(#wkGrad)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
      {/* Center lotus point */}
      <circle cx="19" cy="19" r="2.5" fill="url(#wkGrad)" filter="url(#wkGlow)"/>
      {/* Connector line W to K */}
      <path d="M19 19 L23 19" stroke="url(#wkGrad)" strokeWidth="0.8" strokeDasharray="2 1" opacity={0.5}/>
    </svg>
  );
}

/* ── Ticker bar items (translation keys + emoji prefix) ── */
const TICKER_ITEMS_DEF = [
  { emoji: '🔥', key: 'ticker.flashSale' },
  { emoji: '🎯', key: 'ticker.kocFollowers' },
  { emoji: '⛓️', key: 'ticker.dppScans' },
  { emoji: '🛒', key: 'ticker.groupBuy' },
  { emoji: '🏆', key: 'ticker.topKoc' },
  { emoji: '💎', key: 'ticker.creatorToken' },
  { emoji: '🤖', key: 'ticker.aiAgents' },
  { emoji: '📦', key: 'ticker.ordersToday' },
];

/* ── Primary nav links (visible in top bar — 5 items only) ── */
const NAV_LINKS = [
  { to: '/', key: 'nav.home' },
  { to: '/marketplace', key: 'nav.marketplace' },
  { to: '/live', key: 'nav.live', isLive: true },
  { to: '/feed', key: 'nav.feed' },
  { to: '/academy', key: 'nav.academy' },
];

/* ── Per-route sub-navigation: replaces global nav when inside a section ── */
const SUB_NAV_CONFIG: Record<string, Array<{ label: string; to: string; isLive?: boolean }>> = {
  '/marketplace': [
    { label: 'Tất cả', to: '/marketplace' },
    { label: 'Skincare', to: '/marketplace?cat=skincare' },
    { label: 'Thực phẩm', to: '/marketplace?cat=food' },
    { label: 'Công nghệ', to: '/marketplace?cat=tech' },
    { label: 'Thời trang', to: '/marketplace?cat=fashion' },
    { label: 'Sức khoẻ', to: '/marketplace?cat=health' },
  ],
  '/feed': [
    { label: 'Trending 🔥', to: '/feed' },
    { label: 'Mới nhất', to: '/feed?sort=new' },
    { label: 'DPP Review', to: '/feed?filter=dpp' },
    { label: 'Đang theo dõi', to: '/feed?filter=following' },
  ],
  '/live': [
    { label: 'Đang Live', to: '/live', isLive: true },
    { label: 'Sắp diễn ra', to: '/live?tab=upcoming' },
    { label: 'Đã phát', to: '/live?tab=past' },
  ],
  '/academy': [
    { label: 'Tổng quan', to: '/academy' },
    { label: 'Khóa học', to: '/academy?tab=courses' },
    { label: 'Thách thức', to: '/academy?tab=challenges' },
    { label: 'Leaderboard', to: '/academy?tab=leaderboard' },
    { label: 'Huy hiệu', to: '/academy?tab=badges' },
  ],
  '/koc': [
    { label: 'KOC Hub', to: '/koc' },
    { label: 'Top KOC', to: '/koc?tab=ranking' },
    { label: 'Cộng đồng', to: '/koc?tab=community' },
    { label: 'Creator Token', to: '/koc?tab=token' },
  ],
  '/dpp': [
    { label: 'DPP Scanner', to: '/dpp' },
    { label: 'Sản phẩm', to: '/dpp?tab=products' },
    { label: 'Xác minh', to: '/dpp?tab=verify' },
    { label: 'On-Chain', to: '/dpp?tab=chain' },
  ],
  '/vendor': [
    { label: 'Tổng quan', to: '/vendor' },
    { label: 'Sản phẩm', to: '/vendor?tab=products' },
    { label: 'Đơn hàng', to: '/vendor?tab=orders' },
    { label: 'Analytics', to: '/vendor?tab=analytics' },
  ],
  '/dashboard': [
    { label: 'Tổng quan', to: '/dashboard' },
    { label: 'Đơn hàng', to: '/dashboard?tab=orders' },
    { label: 'Thanh toán', to: '/dashboard?tab=payments' },
    { label: 'Cài đặt', to: '/dashboard?tab=settings' },
  ],
  '/gamification': [
    { label: 'Tổng quan', to: '/gamification' },
    { label: 'Leaderboard', to: '/gamification?tab=leaderboard' },
    { label: 'Thách thức', to: '/gamification?tab=challenges' },
    { label: 'Huy hiệu', to: '/gamification?tab=badges' },
  ],
};

/* ── Drawer section data (organized groups, includes items not in top nav) ── */
const DRAWER_SECTIONS = [
  {
    titleKey: 'drawer.platform',
    items: [
      { to: '/', key: 'nav.home', icon: '◈' },
      { to: '/marketplace', key: 'drawer.marketplace', icon: '⬡' },
      { to: '/live', key: 'nav.live', icon: '◉' },
      { to: '/feed', key: 'nav.feed', icon: '◎' },
      { to: '/promo', key: 'nav.promo', icon: '⚡' },
      { to: '/hot', key: 'nav.hot', icon: '✦' },
      { to: '/dashboard', key: 'drawer.dashboard', icon: '▣' },
    ],
  },
  {
    titleKey: 'drawer.community',
    items: [
      { to: '/koc', key: 'drawer.kocHub', icon: '⭐' },
      { to: '/vendor', key: 'drawer.vendorHub', icon: '◆' },
      { to: '/academy', key: 'drawer.academy', icon: '◇' },
      { to: '/gamification', key: 'drawer.gamification', icon: '⬢' },
    ],
  },
  {
    titleKey: 'drawer.web3',
    items: [
      { to: '/dpp', key: 'drawer.dpp', icon: '⬡' },
      { to: '/pricing', key: 'drawer.pricing', icon: '💰' },
      { to: '/dashboard?tab=payments', key: 'drawer.commission', icon: '◈' },
      { to: '/koc', key: 'drawer.creatorToken', icon: '◎' },
      { to: '/dpp', key: 'drawer.reputationNft', icon: '◇' },
      { to: '/wk-token', key: 'drawer.wallet', icon: '◆' },
    ],
  },
  {
    titleKey: 'drawer.ai',
    items: [
      { to: '/agents', key: 'drawer.agents', icon: '⚙' },
      { to: '/marketplace', key: 'drawer.groupBuy', icon: '⬢' },
      { to: '/live', key: 'drawer.liveCommerce', icon: '◉' },
      { to: '/feed', key: 'drawer.socialGraph', icon: '◎' },
      { to: '/feed', key: 'drawer.videoFeed', icon: '▶' },
    ],
  },
  {
    titleKey: 'drawer.account',
    items: [
      { to: '/dashboard?tab=settings', key: 'drawer.profile', icon: '◈' },
      { to: '/dashboard?tab=notifications', key: 'drawer.notifications', icon: '◎' },
      { to: '/dashboard?tab=settings', key: 'drawer.settings', icon: '⚙' },
      { to: '/dashboard?tab=settings', key: 'drawer.language', icon: '◇' },
    ],
  },
];

/* ── Footer link columns ── */
const FOOTER_LINKS = [
  {
    titleKey: 'footer.product',
    links: [
      { to: '/marketplace', label: 'Marketplace' },
      { to: '/live', label: 'Live Commerce' },
      { to: '/dpp', label: 'Blockchain DPP' },
      { to: '/agents', label: 'AI Agents' },
      { to: '/academy', label: 'KOC Academy' },
    ],
  },
  {
    titleKey: 'footer.community',
    links: [
      { to: '/koc', label: 'KOC Hub' },
      { to: '/vendor', label: 'Vendor Hub' },
      { to: '/feed', label: 'Social Feed' },
      { to: '/gamification', label: 'Gamification' },
    ],
  },
  {
    titleKey: 'footer.legal',
    links: [
      { to: '/legal?doc=tos&role=general', labelKey: 'layout.footer.terms' },
      { to: '/legal?doc=privacy&role=general', labelKey: 'layout.footer.privacy' },
      { to: '/legal?doc=tos&role=general', label: 'Cookie Policy' },
      { to: '/pricing', labelKey: 'layout.footer.contact' },
    ],
  },
];

const CHAIN_BADGES = ['Polygon', 'BNB Chain', 'Ethereum', 'Solana'];

export default function MainLayout() {
  const { theme, toggleTheme, isDark } = useTheme();
  const { t, locale, setLocale, currentLanguage, languages } = useI18n();
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAuthenticated, logout } = useAuth();

  const TICKER_ITEMS = TICKER_ITEMS_DEF.map(item => `${item.emoji} ${t(item.key)}`);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [langDropdownOpen, setLangDropdownOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [navSearch, setNavSearch] = useState('');
  const langRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Close drawer on route change; reset search
  useEffect(() => {
    setDrawerOpen(false);
    setUserMenuOpen(false);
    // sync navSearch from URL when route changes
    setNavSearch(new URLSearchParams(location.search).get('q') || '');
  }, [location.pathname]);

  // Debounce navSearch → update URL ?q= param
  useEffect(() => {
    const SEARCH_ROUTES = ['/marketplace', '/feed', '/academy', '/koc'];
    if (!SEARCH_ROUTES.includes(location.pathname)) return;
    const timer = setTimeout(() => {
      const params = new URLSearchParams(location.search);
      if (navSearch.trim()) {
        params.set('q', navSearch.trim());
      } else {
        params.delete('q');
      }
      const newQ = params.toString();
      const curQ = location.search.replace(/^\?/, '');
      if (newQ !== curQ) {
        navigate(`${location.pathname}${newQ ? '?' + newQ : ''}`, { replace: true });
      }
    }, 350);
    return () => clearTimeout(timer);
  }, [navSearch]);

  // Close language dropdown and user menu on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (langRef.current && !langRef.current.contains(e.target as Node)) {
        setLangDropdownOpen(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    logout();
    setUserMenuOpen(false);
    navigate('/');
  };

  const userInitials = user?.name
    ? user.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
    : user?.email ? user.email[0].toUpperCase() : 'U';

  const subNav = SUB_NAV_CONFIG[location.pathname] ?? null;
  const isAgentsPage = location.pathname === '/agents';

  function isSubLinkActive(to: string): boolean {
    const qIdx = to.indexOf('?');
    const toPath = qIdx >= 0 ? to.slice(0, qIdx) : to;
    const toQ = qIdx >= 0 ? to.slice(qIdx + 1) : '';
    if (toPath !== location.pathname) return false;
    if (!toQ) return !location.search;
    const lp = new URLSearchParams(toQ);
    const cp = new URLSearchParams(location.search);
    for (const [k, v] of lp.entries()) {
      if (cp.get(k) !== v) return false;
    }
    return true;
  }

  // Prevent body scroll when drawer is open
  useEffect(() => {
    document.body.style.overflow = drawerOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [drawerOpen]);

  // Allow Agents page to open the drawer via custom event
  useEffect(() => {
    const handler = () => setDrawerOpen(true);
    window.addEventListener('wellkoc:open-drawer', handler);
    return () => window.removeEventListener('wellkoc:open-drawer', handler);
  }, []);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* ═══ NAVBAR ═══ */}
      {/* Nav hidden on agents page — Agents.tsx renders its own top bar */}
      <nav
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          height: isAgentsPage ? 0 : 64,
          zIndex: 1000,
          background: 'var(--nav-bg)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderBottom: isAgentsPage ? 'none' : '1px solid var(--border)',
          display: isAgentsPage ? 'none' : 'flex',
          alignItems: 'center',
          padding: '0 20px',
          overflow: 'hidden',
        }}
      >
        {/* Logo — hidden on agents page */}
        {!isAgentsPage && <Link
          to="/"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            textDecoration: 'none',
            flexShrink: 0,
          }}
        >
          <WKLogo size={32} />
          <span
            style={{
              fontFamily: "'Noto Sans', sans-serif",
              fontSize: '1.15rem',
              fontWeight: 800,
              background: 'var(--chakra-text)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            WellKOC
          </span>
        </Link>}

        {/* Spacer pushes nav + right controls to the right — hidden on agents page */}
        {!isAgentsPage && <div style={{ flex: 1 }} className="nav-mobile-spacer" />}
        {isAgentsPage && <div style={{ flex: 1 }} />}

        {/* Nav links — hidden on mobile + hidden on agents page */}
        <div
          style={{
            display: isAgentsPage ? 'none' : 'flex',
            alignItems: 'center',
            gap: 2,
            overflowX: 'auto',
            flexShrink: 0,
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
          }}
          className="nav-scroll nav-desktop-only"
        >
          {subNav ? (
            /* Sub-nav: page-specific tabs shown when inside a section */
            subNav.map((link) => {
              const isActive = isSubLinkActive(link.to);
              return (
                <Link
                  key={link.to}
                  to={link.to}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 5,
                    padding: '6px 12px',
                    borderRadius: 8,
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    color: link.isLive
                      ? 'var(--rose-400)'
                      : isActive
                        ? 'var(--primary, #22c55e)'
                        : 'var(--text-3)',
                    background: isActive ? 'rgba(34,197,94,.1)' : 'transparent',
                    textDecoration: 'none',
                    whiteSpace: 'nowrap',
                    transition: 'var(--t-fast)',
                    flexShrink: 0,
                    borderBottom: isActive ? '2px solid var(--primary, #22c55e)' : '2px solid transparent',
                  }}
                >
                  {link.isLive && (
                    <span
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: '50%',
                        background: '#ef4444',
                        display: 'inline-block',
                        animation: 'pulse 2s infinite',
                      }}
                    />
                  )}
                  {link.label}
                </Link>
              );
            })
          ) : (
            /* Global nav: shown on home and other pages not in SUB_NAV_CONFIG */
            NAV_LINKS.map((link) => {
              const isActive = location.pathname === link.to;
              return (
                <Link
                  key={link.to}
                  to={link.to}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 5,
                    padding: '6px 10px',
                    borderRadius: 8,
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    color: link.isLive
                      ? 'var(--rose-400)'
                      : isActive
                        ? 'var(--text-1)'
                        : 'var(--text-3)',
                    background: isActive ? 'var(--surface-hover)' : 'transparent',
                    textDecoration: 'none',
                    whiteSpace: 'nowrap',
                    transition: 'var(--t-fast)',
                    flexShrink: 0,
                  }}
                >
                  {link.isLive && (
                    <span
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: '50%',
                        background: '#ef4444',
                        display: 'inline-block',
                        animation: 'pulse 2s infinite',
                      }}
                    />
                  )}
                  {t(link.key)}
                </Link>
              );
            })
          )}
        </div>

        {/* Navbar search — only shown on search-enabled subpages */}
        {subNav && ['/marketplace', '/feed', '/academy', '/koc'].includes(location.pathname) && (
          <div style={{ position: 'relative', flexShrink: 0, marginLeft: 8 }} className="nav-desktop-only">
            <input
              type="text"
              value={navSearch}
              onChange={e => setNavSearch(e.target.value)}
              placeholder="Tìm kiếm..."
              style={{
                width: 180, padding: '5px 12px 5px 30px',
                borderRadius: 20, fontSize: '.78rem',
                background: 'var(--bg-2)', border: '1px solid var(--border)',
                color: 'var(--text-1)', outline: 'none',
                fontFamily: 'var(--ff-body, system-ui)',
              }}
            />
            <span style={{
              position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)',
              fontSize: '.72rem', color: 'var(--text-3)', pointerEvents: 'none', lineHeight: 1,
            }}>🔍</span>
          </div>
        )}

        {/* Nav right controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0, marginLeft: 12 }}>
          {/* Language dropdown — hidden on agents page */}
          <div ref={langRef} style={{ position: 'relative', display: isAgentsPage ? 'none' : undefined }}>
            <button
              onClick={() => setLangDropdownOpen(!langDropdownOpen)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                padding: '5px 8px',
                borderRadius: 8,
                border: '1px solid var(--border)',
                background: 'transparent',
                color: 'var(--text-2)',
                fontSize: '0.75rem',
                cursor: 'pointer',
                transition: 'var(--t-fast)',
              }}
            >
              <span>{currentLanguage.flag}</span>
              <span>{currentLanguage.code.toUpperCase()}</span>
              <ChevronDown size={12} />
            </button>

            {langDropdownOpen && (
              <div
                style={{
                  position: 'absolute',
                  top: '100%',
                  right: 0,
                  marginTop: 4,
                  background: 'var(--surface-card)',
                  border: '1px solid var(--border)',
                  borderRadius: 12,
                  padding: 6,
                  minWidth: 160,
                  boxShadow: 'var(--shadow-float)',
                  zIndex: 1010,
                }}
              >
                {languages.map((lang) => (
                  <button
                    key={lang.code}
                    onClick={() => {
                      setLocale(lang.code);
                      setLangDropdownOpen(false);
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: 8,
                      border: 'none',
                      background: locale === lang.code ? 'var(--surface-hover)' : 'transparent',
                      color: locale === lang.code ? 'var(--text-1)' : 'var(--text-2)',
                      fontSize: '0.82rem',
                      cursor: 'pointer',
                      transition: 'var(--t-fast)',
                      textAlign: 'left',
                    }}
                  >
                    <span style={{ fontSize: '1.1rem' }}>{lang.flag}</span>
                    <span>{lang.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Theme toggle — hidden on mobile */}
          <button
            onClick={toggleTheme}
            title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            className="nav-desktop-only"
            style={{
              width: 34,
              height: 34,
              borderRadius: 8,
              border: '1px solid var(--border)',
              background: 'transparent',
              color: 'var(--text-2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'var(--t-fast)',
            }}
          >
            {isDark ? <Sun size={15} /> : <Moon size={15} />}
          </button>

          {/* User menu or Auth buttons — hidden on agents page */}
          <div style={{ display: isAgentsPage ? 'none' : 'flex', alignItems: 'center', gap: 6 }}>
          {isAuthenticated && user ? (
            <div ref={userMenuRef} style={{ position: 'relative' }}>
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '4px 10px 4px 4px',
                  borderRadius: 8,
                  border: '1px solid var(--border)',
                  background: 'transparent',
                  cursor: 'pointer',
                  transition: 'var(--t-fast)',
                }}
              >
                <div style={{
                  width: 28, height: 28, borderRadius: '50%',
                  background: 'var(--chakra-flow)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '.65rem', fontWeight: 700, color: '#fff',
                }}>{userInitials}</div>
                <span className="nav-desktop-only" style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-2)', maxWidth: 80, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.name}</span>
                <ChevronDown size={12} style={{ color: 'var(--text-3)' }} className="nav-desktop-only" />
              </button>

              {userMenuOpen && (
                <div style={{
                  position: 'fixed', top: 68, right: 12, marginTop: 0,
                  background: 'var(--surface-card)', border: '1px solid var(--border)',
                  borderRadius: 12, padding: 6, minWidth: 180,
                  boxShadow: 'var(--shadow-float)', zIndex: 9999,
                }}>
                  <Link to="/dashboard?tab=profile" onClick={() => setUserMenuOpen(false)} style={{
                    display: 'flex', alignItems: 'center', gap: 10, width: '100%',
                    padding: '8px 12px', borderRadius: 8, fontSize: '0.82rem',
                    color: 'var(--text-2)', textDecoration: 'none', transition: 'var(--t-fast)',
                  }}>
                    <span style={{ fontSize: '1rem' }}>👤</span> {t('layout.profile')}
                  </Link>
                  <Link to="/dashboard" onClick={() => setUserMenuOpen(false)} style={{
                    display: 'flex', alignItems: 'center', gap: 10, width: '100%',
                    padding: '8px 12px', borderRadius: 8, fontSize: '0.82rem',
                    color: 'var(--text-2)', textDecoration: 'none', transition: 'var(--t-fast)',
                  }}>
                    <span style={{ fontSize: '1rem' }}>📊</span> Dashboard
                  </Link>
                  <Link to="/dashboard?tab=settings" onClick={() => setUserMenuOpen(false)} style={{
                    display: 'flex', alignItems: 'center', gap: 10, width: '100%',
                    padding: '8px 12px', borderRadius: 8, fontSize: '0.82rem',
                    color: 'var(--text-2)', textDecoration: 'none', transition: 'var(--t-fast)',
                  }}>
                    <span style={{ fontSize: '1rem' }}>⚙️</span> {t('layout.settings')}
                  </Link>
                  <div style={{ height: 1, background: 'var(--border)', margin: '4px 8px' }} />
                  <button onClick={handleLogout} style={{
                    display: 'flex', alignItems: 'center', gap: 10, width: '100%',
                    padding: '8px 12px', borderRadius: 8, fontSize: '0.82rem',
                    color: '#ef4444', background: 'transparent', border: 'none',
                    cursor: 'pointer', transition: 'var(--t-fast)', textAlign: 'left',
                  }}>
                    <span style={{ fontSize: '1rem' }}>🚪</span> {t('layout.logout')}
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <Link
                to="/login"
                style={{
                  padding: '7px 16px',
                  borderRadius: 10,
                  border: '1px solid var(--border)',
                  background: 'transparent',
                  color: 'var(--text-2)',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  textDecoration: 'none',
                  whiteSpace: 'nowrap',
                  transition: 'var(--t-fast)',
                }}
              >
                {t('login.loginBtn') || 'Đăng nhập'}
              </Link>
              <Link
                to="/register"
                style={{
                  padding: '8px 18px',
                  borderRadius: 10,
                  background: 'var(--chakra-flow)',
                  color: '#fff',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  textDecoration: 'none',
                  whiteSpace: 'nowrap',
                  transition: 'var(--t-fast)',
                }}
              >
                {t('login.registerNow') || 'Đăng ký'}
              </Link>
            </div>
          )}
          </div>{/* /user-auth wrapper */}

          {/* Hamburger button */}
          <button
            onClick={() => setDrawerOpen(true)}
            style={{
              width: 34,
              height: 34,
              borderRadius: 8,
              border: '1px solid var(--border)',
              background: 'transparent',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 4,
              cursor: 'pointer',
              padding: 8,
            }}
          >
            <span style={{ width: 15, height: 2, background: 'var(--text-2)', borderRadius: 1 }} />
            <span style={{ width: 15, height: 2, background: 'var(--text-2)', borderRadius: 1 }} />
            <span style={{ width: 15, height: 2, background: 'var(--text-2)', borderRadius: 1 }} />
          </button>
        </div>
      </nav>

      {/* ═══ HAMBURGER DRAWER ═══ */}
      {/* Overlay */}
      {drawerOpen && (
        <div
          onClick={() => setDrawerOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            zIndex: 1100,
            transition: 'opacity var(--t-base)',
          }}
        />
      )}

      {/* Drawer */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          bottom: 0,
          width: 340,
          maxWidth: '88vw',
          background: 'linear-gradient(180deg, rgba(10,12,20,.97) 0%, rgba(15,18,30,.98) 40%, rgba(10,12,20,.97) 100%)',
          borderLeft: '1px solid rgba(99,102,241,.15)',
          zIndex: 1200,
          transform: drawerOpen ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 300ms var(--ease-smooth)',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          backdropFilter: 'blur(30px)',
        }}
      >
        {/* Chakra energy background effects */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 0 }}>
          {/* C4 Heart - green glow top */}
          <div style={{ position: 'absolute', top: '5%', left: '-30%', width: 200, height: 200, borderRadius: '50%', background: 'radial-gradient(circle, rgba(34,197,94,.12) 0%, transparent 70%)', animation: 'pulse 4s ease-in-out infinite' }} />
          {/* C5 Throat - cyan glow */}
          <div style={{ position: 'absolute', top: '25%', right: '-20%', width: 180, height: 180, borderRadius: '50%', background: 'radial-gradient(circle, rgba(6,182,212,.1) 0%, transparent 70%)', animation: 'pulse 5s ease-in-out infinite 1s' }} />
          {/* C6 Third Eye - indigo glow */}
          <div style={{ position: 'absolute', top: '50%', left: '-15%', width: 160, height: 160, borderRadius: '50%', background: 'radial-gradient(circle, rgba(99,102,241,.1) 0%, transparent 70%)', animation: 'pulse 6s ease-in-out infinite 2s' }} />
          {/* C7 Crown - violet glow */}
          <div style={{ position: 'absolute', bottom: '10%', right: '-25%', width: 200, height: 200, borderRadius: '50%', background: 'radial-gradient(circle, rgba(168,85,247,.08) 0%, transparent 70%)', animation: 'pulse 7s ease-in-out infinite 3s' }} />
          {/* Vertical chakra flow line */}
          <div style={{ position: 'absolute', top: 80, bottom: 80, left: 4, width: 2, background: 'linear-gradient(180deg, #22c55e, #06b6d4, #6366f1, #a855f7)', opacity: 0.15, borderRadius: 2 }} />
        </div>
        {/* Drawer header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 20px',
            borderBottom: '1px solid var(--border)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <WKLogo size={28} />
            <span
              style={{
                fontFamily: 'var(--ff-display)',
                fontSize: '1.1rem',
                fontWeight: 700,
                background: 'var(--chakra-text)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              WellKOC
            </span>
          </div>
          <button
            onClick={() => setDrawerOpen(false)}
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              border: '1px solid var(--border)',
              background: 'transparent',
              color: 'var(--text-2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Drawer sections */}
        <div style={{ flex: 1, padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 22, position: 'relative', zIndex: 1 }}>
          {DRAWER_SECTIONS.map((section, si) => {
            const sectionColors = ['#22c55e', '#06b6d4', '#6366f1', '#a855f7', '#ec4899'];
            const sColor = sectionColors[si % sectionColors.length];
            return (
            <div key={section.titleKey}>
              <div
                style={{
                  fontSize: '0.6rem',
                  fontWeight: 800,
                  letterSpacing: '0.14em',
                  textTransform: 'uppercase',
                  color: sColor,
                  marginBottom: 8,
                  paddingLeft: 8,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <span style={{ width: 16, height: 2, borderRadius: 1, background: sColor, opacity: 0.6 }} />
                {t(section.titleKey)}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {section.items.map((item) => {
                  const isActive = location.pathname === item.to;
                  return (
                    <Link
                      key={item.key}
                      to={item.to}
                      onClick={() => setDrawerOpen(false)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        padding: '9px 12px',
                        borderRadius: 10,
                        fontSize: '0.85rem',
                        fontWeight: isActive ? 600 : 400,
                        color: isActive ? '#fff' : 'rgba(255,255,255,.7)',
                        background: isActive ? `linear-gradient(90deg, ${sColor}22, transparent)` : 'transparent',
                        borderLeft: isActive ? `2px solid ${sColor}` : '2px solid transparent',
                        textDecoration: 'none',
                        transition: 'all .2s',
                      }}
                    >
                      <span style={{
                        fontSize: '1rem',
                        width: 28,
                        height: 28,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderRadius: 8,
                        background: isActive ? `${sColor}20` : 'rgba(255,255,255,.04)',
                        filter: isActive ? `drop-shadow(0 0 6px ${sColor})` : 'none',
                      }}>{(item as any).icon || '◈'}</span>
                      {t(item.key)}
                    </Link>
                  );
                })}
              </div>
            </div>
          );})}
        </div>

        {/* Drawer bottom buttons */}
        <div
          style={{
            padding: '16px 20px',
            borderTop: '1px solid var(--border)',
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
          }}
        >
          {isAuthenticated ? (
            <>
              {/* User info */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
                <div style={{
                  width: 36, height: 36, borderRadius: '50%',
                  background: 'var(--chakra-flow)', display: 'flex',
                  alignItems: 'center', justifyContent: 'center',
                  color: '#fff', fontSize: '.78rem', fontWeight: 700,
                }}>{userInitials}</div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '.88rem', color: 'var(--text-1)' }}>{user?.name}</div>
                  <div style={{ fontSize: '.72rem', color: 'var(--text-3)' }}>{user?.email}</div>
                </div>
              </div>
              {/* Dashboard */}
              <Link
                to="/dashboard"
                onClick={() => setDrawerOpen(false)}
                style={{
                  display: 'block', textAlign: 'center', padding: '12px 20px',
                  borderRadius: 12, background: 'var(--chakra-flow)', color: '#fff',
                  fontSize: '0.88rem', fontWeight: 600, textDecoration: 'none',
                }}
              >
                📊 Dashboard
              </Link>
              {/* Logout */}
              <button
                onClick={() => { setDrawerOpen(false); handleLogout(); }}
                style={{
                  display: 'block', width: '100%', textAlign: 'center', padding: '12px 20px',
                  borderRadius: 12, border: '1px solid rgba(239,68,68,.3)',
                  background: 'rgba(239,68,68,.06)', color: '#ef4444',
                  fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer',
                }}
              >
                🚪 {t('layout.logout')}
              </button>
            </>
          ) : (
            <>
              <Link
                to="/register"
                onClick={() => setDrawerOpen(false)}
                style={{
                  display: 'block', textAlign: 'center', padding: '12px 20px',
                  borderRadius: 12, background: 'var(--chakra-flow)', color: '#fff',
                  fontSize: '0.9rem', fontWeight: 700, textDecoration: 'none',
                }}
              >
                {t('login.registerNow') || 'Đăng ký'}
              </Link>
              <Link
                to="/login"
                onClick={() => setDrawerOpen(false)}
                style={{
                  display: 'block', textAlign: 'center', padding: '12px 20px',
                  borderRadius: 12, border: '1px solid var(--border)',
                  background: 'transparent', color: 'var(--text-2)',
                  fontSize: '0.85rem', fontWeight: 600, textDecoration: 'none',
                }}
              >
                {t('login.loginBtn') || 'Đăng nhập'}
              </Link>
            </>
          )}
        </div>
      </div>

      {/* ═══ TICKER BAR — hidden on agents page ═══ */}
      <div
        style={{
          position: 'fixed',
          top: 64,
          left: 0,
          right: 0,
          height: 36,
          zIndex: 999,
          background: 'var(--bg-1)',
          borderBottom: '1px solid var(--border)',
          overflow: 'hidden',
          display: isAgentsPage ? 'none' : 'flex',
          alignItems: 'center',
        }}
      >
        <div
          className="ticker-track"
          style={{
            display: 'flex',
            gap: 48,
            whiteSpace: 'nowrap',
            animation: 'ticker-scroll 60s linear infinite',
          }}
        >
          {[...TICKER_ITEMS, ...TICKER_ITEMS].map((item, i) => (
            <span
              key={i}
              style={{
                fontSize: '0.75rem',
                color: 'var(--text-3)',
                flexShrink: 0,
              }}
            >
              {item}
            </span>
          ))}
        </div>
      </div>

      {/* ═══ MAIN CONTENT ═══ */}
      {(() => {
        const isDashPage = ['/dashboard', '/koc', '/vendor', '/admin'].some(p => location.pathname.startsWith(p));
        if (isAgentsPage) {
          // Agents.tsx owns its full viewport (own top bar + drawer trigger)
          return (
            <main style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, overflow: 'hidden' }}>
              <Outlet />
            </main>
          );
        }
        if (isDashPage) {
          return (
            <main style={{ position: 'fixed', top: 100, left: 0, right: 0, bottom: 0, overflow: 'hidden' }}>
              <Outlet />
            </main>
          );
        }
        return (
          <main style={{ marginTop: 100, flex: 1 }}>
            <Outlet />
          </main>
        );
      })()}

      {/* ═══ FOOTER — hidden on dashboard + agents pages ═══ */}
      {!isAgentsPage && !['/dashboard', '/koc', '/vendor', '/admin'].some(p => location.pathname.startsWith(p)) && <footer
        style={{
          borderTop: '1px solid var(--border)',
          background: 'var(--bg-1)',
          padding: '64px 24px 32px',
        }}
      >
        <div style={{ maxWidth: 1440, margin: '0 auto' }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '2fr 1fr 1fr 1fr',
              gap: 40,
              marginBottom: 48,
            }}
          >
            {/* Brand column */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                <ZeniLogo height={36} />
                <span
                  style={{
                    fontFamily: 'var(--ff-display)',
                    fontSize: '1.2rem',
                    fontWeight: 700,
                    background: 'var(--chakra-text)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                  }}
                >
                  {t('footer.brand')}
                </span>
              </div>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-3)', lineHeight: 1.6, maxWidth: 340 }}>
                {t('footer.tagline')}
              </p>

              {/* Company info */}
              <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 6, fontSize: '0.8rem', color: 'var(--text-3)', lineHeight: 1.6 }}>
                <div style={{ fontWeight: 700, color: 'var(--text-2)', fontSize: '0.82rem' }}>
                  Công ty Cổ phần Công nghệ WellNexus
                </div>
                <div style={{ fontWeight: 600, color: 'var(--text-3)', fontSize: '0.78rem' }}>
                  Công ty TNHH WellKOC Việt Nam
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6 }}>
                  <span style={{ flexShrink: 0 }}>📍</span>
                  <span>35 Thái Phiên, Phường Hải Châu, Đà Nẵng, Việt Nam</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ flexShrink: 0 }}>📞</span>
                  <a href="tel:0913156676" style={{ color: 'var(--text-2)', textDecoration: 'none' }}>Hotline: <span style={{ whiteSpace: 'nowrap' }}>0913 156 676</span></a>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ flexShrink: 0 }}>✉️</span>
                  <a href="mailto:support@wellkoc.com" style={{ color: 'var(--text-2)', textDecoration: 'none' }}>support@wellkoc.com</a>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ flexShrink: 0 }}>📧</span>
                  <a href="mailto:hotline@wellkoc.com" style={{ color: 'var(--text-2)', textDecoration: 'none' }}>hotline@wellkoc.com</a>
                </div>
              </div>

              {/* Chain badges */}
              <div style={{ display: 'flex', gap: 8, marginTop: 16, flexWrap: 'wrap' }}>
                {CHAIN_BADGES.map((chain) => (
                  <span
                    key={chain}
                    style={{
                      padding: '4px 10px',
                      borderRadius: 6,
                      border: '1px solid var(--border)',
                      fontSize: '0.7rem',
                      color: 'var(--text-3)',
                      fontFamily: 'var(--ff-mono)',
                    }}
                  >
                    {chain}
                  </span>
                ))}
              </div>
            </div>

            {/* Link columns */}
            {FOOTER_LINKS.map((col) => (
              <div key={col.titleKey}>
                <div
                  style={{
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    letterSpacing: '0.12em',
                    textTransform: 'uppercase',
                    color: 'var(--text-3)',
                    marginBottom: 16,
                  }}
                >
                  {t(col.titleKey)}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {col.links.map((link: any) => (
                    <Link
                      key={link.labelKey || link.label}
                      to={link.to}
                      style={{
                        fontSize: '0.85rem',
                        color: 'var(--text-2)',
                        textDecoration: 'none',
                        transition: 'var(--t-fast)',
                      }}
                    >
                      {link.labelKey ? t(link.labelKey) : link.label}
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Footer bottom */}
          <div
            style={{
              borderTop: '1px solid var(--border)',
              paddingTop: 24,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              fontSize: '0.78rem',
              color: 'var(--text-3)',
            }}
          >
            <span>&copy; 2026 WellNexus Technology JSC. All rights reserved.</span>
            <span style={{ fontFamily: 'var(--ff-mono)', whiteSpace: 'nowrap' }}>v3.0 · Chakra 4567</span>
          </div>
        </div>
      </footer>}

      {/* ═══ FLOATING CHAT WIDGET ═══ */}
      <ChatWidget />

      {/* ═══ GLOBAL STYLES (injected) ═══ */}
      <style>{`
        .nav-scroll::-webkit-scrollbar { display: none; }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }

        @keyframes ticker-scroll {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }

        @media (max-width: 768px) {
          footer > div > div:first-child {
            grid-template-columns: 1fr !important;
            gap: 32px !important;
          }
        }
      `}</style>
    </div>
  );
}
