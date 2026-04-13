import { useState, useEffect, useRef } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { Sun, Moon, ChevronDown, Menu, X } from 'lucide-react';
import { useTheme } from '@hooks/useTheme';
import { useI18n } from '@hooks/useI18n';
import type { Locale } from '@hooks/useI18n';
import { useAuth } from '@hooks/useAuth';
import ChatWidget from '@components/ChatWidget';

/* ── WK Logo SVG ── */
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
      <circle cx="19" cy="19" r="17.5" stroke="url(#wkGrad)" strokeWidth="1" opacity={0.6}/>
      <circle cx="19" cy="19" r="13" stroke="url(#wkGrad)" strokeWidth="0.5" opacity={0.35}/>
      <path d="M7 11L10.5 24L14 16L17.5 24L21 11" stroke="url(#wkGrad)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M23 11V27M23 19L31 11M23 19L31 27" stroke="url(#wkGrad)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx="19" cy="19" r="2.5" fill="url(#wkGrad)" filter="url(#wkGlow)"/>
      <path d="M19 19 L23 19" stroke="url(#wkGrad)" strokeWidth="0.8" strokeDasharray="2 1" opacity={0.5}/>
    </svg>
  );
}

/* ── Mega-menu nav dropdowns ── */
const NAV_DROPDOWNS = [
  {
    label: 'Nền tảng',
    sections: [
      {
        title: 'THƯƠNG MẠI',
        items: [
          { icon: '⬡', label: 'Marketplace', desc: 'Mua sắm đa danh mục Web3', to: '/marketplace' },
          { icon: '◉', label: 'Live Commerce', desc: 'Livestream mua sắm real-time', to: '/live' },
          { icon: '⚡', label: 'Flash Sale', desc: 'Deals độc quyền mỗi ngày', to: '/promo' },
          { icon: '✦', label: 'Sản phẩm Hot', desc: 'Trending & bestsellers', to: '/hot' },
        ],
      },
      {
        title: 'QUẢN LÝ',
        items: [
          { icon: '▣', label: 'Dashboard', desc: 'Quản lý tài khoản toàn diện', to: '/dashboard' },
          { icon: '◈', label: 'Đơn hàng', desc: 'Theo dõi đơn & vận chuyển', to: '/dashboard?tab=orders' },
        ],
      },
    ],
  },
  {
    label: 'Cộng đồng',
    sections: [
      {
        title: 'VAI TRÒ',
        items: [
          { icon: '⭐', label: 'KOC Hub', desc: 'Nền tảng dành cho KOC', to: '/koc' },
          { icon: '◆', label: 'Vendor Hub', desc: 'Dành cho nhà cung cấp', to: '/vendor' },
        ],
      },
      {
        title: 'PHÁT TRIỂN',
        items: [
          { icon: '◇', label: 'KOC Academy', desc: 'Học & kiếm thu nhập thực tế', to: '/academy' },
          { icon: '⬢', label: 'Gamification', desc: 'Thách thức, huy hiệu, ranking', to: '/gamification' },
          { icon: '◎', label: 'Video Feed', desc: 'Social commerce feed', to: '/feed' },
        ],
      },
    ],
  },
  {
    label: 'Web3',
    sections: [
      {
        title: 'BLOCKCHAIN',
        items: [
          { icon: '⬡', label: 'Blockchain DPP', desc: 'Passport số hóa sản phẩm', to: '/dpp' },
          { icon: '◈', label: 'Hoa hồng On-chain', desc: 'Smart contract 100% minh bạch', to: '/dashboard?tab=payments' },
          { icon: '◎', label: 'Creator Token', desc: 'Token hóa thương hiệu KOC', to: '/koc?tab=token' },
          { icon: '◆', label: 'Ví · Wallet', desc: 'Quản lý tài sản Web3', to: '/wk-token' },
        ],
      },
      {
        title: 'KHÁM PHÁ',
        items: [
          { icon: '💰', label: 'Bảng giá', desc: 'Plans & pricing', to: '/pricing' },
        ],
      },
    ],
  },
  {
    label: 'AI',
    sections: [
      {
        title: 'AUTOMATION',
        items: [
          { icon: '⚙', label: '333 AI Agents', desc: 'Marketing tự động toàn phần', to: '/agents' },
          { icon: '⬢', label: 'Group Buy AI', desc: 'Mua nhóm thông minh', to: '/marketplace' },
          { icon: '◉', label: 'AI Live Commerce', desc: 'Livestream tự động AI', to: '/live' },
          { icon: '◎', label: 'Social Graph', desc: 'Phân tích & tối ưu mạng xã hội', to: '/feed' },
        ],
      },
    ],
  },
];

/* ── Per-route sub-navigation ── */
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

/* ── Sidebar sections (logged-in nav) ── */
const SIDEBAR_SECTIONS = [
  {
    titleKey: 'drawer.platform', color: '#22c55e',
    items: [
      { to: '/', key: 'nav.home', icon: '◈' },
      { to: '/marketplace', key: 'drawer.marketplace', icon: '⬡' },
      { to: '/live', key: 'nav.live', icon: '◉', isLive: true },
      { to: '/feed', key: 'nav.feed', icon: '◎' },
      { to: '/promo', key: 'nav.promo', icon: '⚡' },
      { to: '/hot', key: 'nav.hot', icon: '✦' },
      { to: '/dashboard', key: 'drawer.dashboard', icon: '▣' },
    ],
  },
  {
    titleKey: 'drawer.community', color: '#06b6d4',
    items: [
      { to: '/koc', key: 'drawer.kocHub', icon: '⭐' },
      { to: '/vendor', key: 'drawer.vendorHub', icon: '◆' },
      { to: '/academy', key: 'drawer.academy', icon: '◇' },
      { to: '/gamification', key: 'drawer.gamification', icon: '⬢' },
    ],
  },
  {
    titleKey: 'drawer.web3', color: '#6366f1',
    items: [
      { to: '/dpp', key: 'drawer.dpp', icon: '⬡' },
      { to: '/pricing', key: 'drawer.pricing', icon: '💰' },
      { to: '/dashboard?tab=payments', key: 'drawer.commission', icon: '◈' },
      { to: '/koc', key: 'drawer.creatorToken', icon: '◎' },
      { to: '/wk-token', key: 'drawer.wallet', icon: '◆' },
    ],
  },
  {
    titleKey: 'drawer.ai', color: '#a855f7',
    items: [
      { to: '/agents', key: 'drawer.agents', icon: '⚙' },
      { to: '/marketplace', key: 'drawer.groupBuy', icon: '⬢' },
      { to: '/live', key: 'drawer.liveCommerce', icon: '◉' },
      { to: '/feed', key: 'drawer.socialGraph', icon: '◎' },
    ],
  },
  {
    titleKey: 'drawer.account', color: '#ec4899',
    items: [
      { to: '/dashboard?tab=settings', key: 'drawer.profile', icon: '◈' },
      { to: '/dashboard?tab=notifications', key: 'drawer.notifications', icon: '◎' },
      { to: '/dashboard?tab=settings', key: 'drawer.settings', icon: '⚙' },
    ],
  },
];

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

const TOPBAR_H = 52;
const SIDEBAR_W = 240;

export default function MainLayout() {
  const { toggleTheme, isDark } = useTheme();
  const { t, locale, setLocale, currentLanguage, languages } = useI18n();
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAuthenticated, logout } = useAuth();

  const [sidebarOpen, setSidebarOpen]       = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isDesktop, setIsDesktop]           = useState(() => window.innerWidth >= 1024);
  const [langOpen, setLangOpen]             = useState(false);
  const [userMenuOpen, setUserMenuOpen]     = useState(false);
  const [openDropdown, setOpenDropdown]     = useState<number | null>(null);
  const [navSearch, setNavSearch]           = useState('');

  const langRef     = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const closeTimer  = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const handler = () => setIsDesktop(window.innerWidth >= 1024);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  useEffect(() => {
    setSidebarOpen(false);
    setUserMenuOpen(false);
    setOpenDropdown(null);
    setNavSearch(new URLSearchParams(location.search).get('q') || '');
  }, [location.pathname]);

  useEffect(() => {
    const SEARCH_ROUTES = ['/marketplace', '/feed', '/academy', '/koc'];
    if (!SEARCH_ROUTES.includes(location.pathname)) return;
    const timer = setTimeout(() => {
      const params = new URLSearchParams(location.search);
      if (navSearch.trim()) params.set('q', navSearch.trim());
      else params.delete('q');
      const newQ = params.toString();
      if (newQ !== location.search.replace(/^\?/, ''))
        navigate(`${location.pathname}${newQ ? '?' + newQ : ''}`, { replace: true });
    }, 350);
    return () => clearTimeout(timer);
  }, [navSearch]);

  useEffect(() => {
    function outside(e: MouseEvent) {
      if (langRef.current && !langRef.current.contains(e.target as Node)) setLangOpen(false);
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) setUserMenuOpen(false);
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setOpenDropdown(null);
    }
    document.addEventListener('mousedown', outside);
    return () => document.removeEventListener('mousedown', outside);
  }, []);

  useEffect(() => {
    document.body.style.overflow = (!isDesktop && sidebarOpen) ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [sidebarOpen, isDesktop]);

  const handleLogout = () => { logout(); setUserMenuOpen(false); navigate('/'); };

  const userInitials = user?.name
    ? user.name.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2)
    : user?.email ? user.email[0].toUpperCase() : 'U';

  const subNav = SUB_NAV_CONFIG[location.pathname] ?? null;
  const isAgentsPage = location.pathname === '/agents';
  const isDashPage = ['/dashboard', '/koc', '/vendor', '/admin'].some(p => location.pathname.startsWith(p));
  const showFooter = !isAgentsPage && !isDashPage;

  // Sidebar shows only when logged in
  const sidebarVisible = isAuthenticated && !sidebarCollapsed && !isAgentsPage;
  const mobileSidebarVisible = isAuthenticated && sidebarOpen && !isAgentsPage;
  const effectiveSidebarW = isAuthenticated && !sidebarCollapsed ? SIDEBAR_W : 0;

  function isSubLinkActive(to: string): boolean {
    const qIdx = to.indexOf('?');
    const toPath = qIdx >= 0 ? to.slice(0, qIdx) : to;
    const toQ = qIdx >= 0 ? to.slice(qIdx + 1) : '';
    if (toPath !== location.pathname) return false;
    if (!toQ) return !location.search;
    const lp = new URLSearchParams(toQ);
    const cp = new URLSearchParams(location.search);
    for (const [k, v] of lp.entries()) if (cp.get(k) !== v) return false;
    return true;
  }

  const handleDropdownEnter = (i: number) => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setOpenDropdown(i);
  };
  const handleDropdownLeave = () => {
    closeTimer.current = setTimeout(() => setOpenDropdown(null), 300);
  };

  /* ── Agents page: full-screen ── */
  if (isAgentsPage) {
    return (
      <div style={{ position: 'fixed', inset: 0, overflow: 'hidden' }}>
        <Outlet />
        <ChatWidget />
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>

      {/* ── Ambient floating orbs (nexbuild-style) ── */}
      <div className="floating-orbs" aria-hidden="true">
        <div className="orb orb-1" />
        <div className="orb orb-2" />
        <div className="orb orb-3" />
        <div className="orb orb-4" />
      </div>

      {/* ═══ TOPBAR ═══ */}
      <header style={{
        position: 'fixed', top: 0, left: 0, right: 0,
        height: TOPBAR_H, zIndex: 1000,
        background: 'var(--nav-bg)',
        backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
        borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'center',
        padding: '0 20px', gap: 8,
      }}>

        {/* Sidebar toggle — ONLY when logged in */}
        {isAuthenticated && (
          <button
            onClick={() => isDesktop ? setSidebarCollapsed(v => !v) : setSidebarOpen(v => !v)}
            title="Toggle sidebar"
            style={{
              width: 32, height: 32, borderRadius: 7, flexShrink: 0,
              border: '1px solid var(--border)', background: 'transparent',
              color: 'var(--text-2)', display: 'flex', alignItems: 'center',
              justifyContent: 'center', cursor: 'pointer',
            }}
          >
            {(!isDesktop && sidebarOpen) ? <X size={15} /> : <Menu size={15} />}
          </button>
        )}

        {/* Logo */}
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 7, textDecoration: 'none', flexShrink: 0 }}>
          <WKLogo size={26} />
          <span style={{
            fontFamily: "'Noto Sans', sans-serif", fontSize: '1rem', fontWeight: 800,
            background: 'var(--chakra-text)', WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent', backgroundClip: 'text',
          }}>WellKOC</span>
        </Link>

        {/* ── Mega-menu nav (desktop) ── */}
        {isDesktop && (
          <div ref={dropdownRef} style={{ display: 'flex', alignItems: 'center', gap: 2, marginLeft: 8 }}>
            {NAV_DROPDOWNS.map((nav, i) => (
              <div
                key={nav.label}
                onMouseEnter={() => handleDropdownEnter(i)}
                onMouseLeave={handleDropdownLeave}
                style={{ position: 'relative' }}
              >
                <button style={{
                  display: 'flex', alignItems: 'center', gap: 4,
                  padding: '5px 10px', borderRadius: 8, border: 'none',
                  background: openDropdown === i ? 'var(--surface-hover)' : 'transparent',
                  color: openDropdown === i ? 'var(--text-1)' : 'var(--text-2)',
                  fontSize: '0.85rem', fontWeight: 500, cursor: 'pointer',
                  transition: 'all .15s',
                }}>
                  {nav.label}
                  <ChevronDown size={12} style={{ transition: 'transform .2s', transform: openDropdown === i ? 'rotate(180deg)' : 'rotate(0deg)' }} />
                </button>

                {/* Mega dropdown panel — always rendered, CSS visibility controlled */}
                <div
                  style={{
                    position: 'absolute', top: '100%', left: 0,
                    minWidth: 560,
                    background: 'var(--surface-card)',
                    border: '1px solid var(--border)',
                    borderRadius: '0 0 14px 14px',
                    boxShadow: '0 12px 40px rgba(0,0,0,.25)',
                    zIndex: 990,
                    overflow: 'hidden',
                    opacity: openDropdown === i ? 1 : 0,
                    visibility: openDropdown === i ? 'visible' : 'hidden',
                    pointerEvents: openDropdown === i ? 'auto' : 'none',
                    transform: openDropdown === i ? 'translateY(0)' : 'translateY(-6px)',
                    transition: 'opacity .15s ease, transform .15s ease, visibility .15s',
                  }}
                >
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: `repeat(${nav.sections.length + 1}, auto)`,
                      gap: 0, padding: '22px 20px',
                    }}>
                      {nav.sections.map((sec) => (
                        <div key={sec.title} style={{ paddingRight: 28, minWidth: 190 }}>
                          <div style={{
                            fontSize: '0.65rem', fontWeight: 800, letterSpacing: '0.12em',
                            textTransform: 'uppercase', color: 'var(--text-3)',
                            marginBottom: 14, paddingBottom: 8,
                            borderBottom: '1px solid var(--border)',
                          }}>{sec.title}</div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                            {sec.items.map((item) => (
                              <Link
                                key={item.to + item.label}
                                to={item.to}
                                onClick={() => setOpenDropdown(null)}
                                style={{
                                  display: 'flex', alignItems: 'flex-start', gap: 12,
                                  padding: '10px 12px', borderRadius: 10,
                                  textDecoration: 'none', transition: 'background .15s',
                                }}
                                onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-hover)')}
                                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                              >
                                <span style={{
                                  width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                                  background: 'var(--bg-2)', display: 'flex',
                                  alignItems: 'center', justifyContent: 'center',
                                  fontSize: '1rem', border: '1px solid var(--border)',
                                }}>{item.icon}</span>
                                <div>
                                  <div style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-1)', marginBottom: 2 }}>{item.label}</div>
                                  <div style={{ fontSize: '0.76rem', color: 'var(--text-3)', lineHeight: 1.3 }}>{item.desc}</div>
                                </div>
                              </Link>
                            ))}
                          </div>
                        </div>
                      ))}
                      {/* Explore column */}
                      <div style={{ paddingLeft: 24, borderLeft: '1px solid var(--border)', minWidth: 160 }}>
                        <div style={{
                          fontSize: '0.65rem', fontWeight: 800, letterSpacing: '0.12em',
                          textTransform: 'uppercase', color: 'var(--text-3)',
                          marginBottom: 14, paddingBottom: 8,
                          borderBottom: '1px solid var(--border)',
                        }}>KHÁM PHÁ</div>
                        {[
                          { label: 'Tại sao WellKOC?', to: '/#why' },
                          { label: 'Tài liệu & Hướng dẫn', to: '/academy' },
                          { label: 'Blog & Tin tức', to: '/feed' },
                          { label: 'Bảng xếp hạng KOC', to: '/koc?tab=ranking' },
                        ].map(lnk => (
                          <Link
                            key={lnk.to}
                            to={lnk.to}
                            onClick={() => setOpenDropdown(null)}
                            style={{
                              display: 'block', padding: '8px 10px', borderRadius: 8,
                              fontSize: '0.85rem', color: 'var(--text-2)',
                              textDecoration: 'none', transition: 'color .15s',
                            }}
                            onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-1)')}
                            onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-2)')}
                          >{lnk.label}</Link>
                        ))}
                      </div>
                    </div>
                    {/* Bottom bar */}
                    <div style={{
                      borderTop: '1px solid var(--border)',
                      padding: '10px 20px',
                      background: 'var(--bg-2)',
                    }}>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-3)' }}>Xem tất cả tính năng</span>
                        <Link to="/pricing" onClick={() => setOpenDropdown(null)} style={{ fontSize: '0.8rem', color: 'var(--primary, #22c55e)', textDecoration: 'none', fontWeight: 600 }}>
                          Bảng giá →
                        </Link>
                      </div>
                    </div>
                </div>
              </div>
            ))}
            <Link to="/pricing" style={{
              padding: '5px 10px', borderRadius: 8, textDecoration: 'none',
              fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-2)',
              transition: 'color .15s',
            }}>Pricing</Link>
          </div>
        )}

        {/* Search */}
        {['/marketplace', '/feed', '/academy', '/koc'].includes(location.pathname) && (
          <div style={{ position: 'relative', flex: 1, maxWidth: 340, marginLeft: 8 }}>
            <input
              type="text" value={navSearch} onChange={e => setNavSearch(e.target.value)}
              placeholder="Tìm kiếm..."
              style={{
                width: '100%', padding: '5px 12px 5px 30px',
                borderRadius: 20, fontSize: '.8rem',
                background: 'var(--bg-2)', border: '1px solid var(--border)',
                color: 'var(--text-1)', outline: 'none',
              }}
            />
            <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', fontSize: '.72rem', color: 'var(--text-3)', pointerEvents: 'none' }}>🔍</span>
          </div>
        )}

        <div style={{ flex: 1 }} />

        {/* Lang */}
        <div ref={langRef} style={{ position: 'relative' }}>
          <button onClick={() => setLangOpen(!langOpen)} style={{
            display: 'flex', alignItems: 'center', gap: 4, padding: '5px 8px',
            borderRadius: 8, border: '1px solid var(--border)', background: 'transparent',
            color: 'var(--text-2)', fontSize: '0.75rem', cursor: 'pointer',
          }}>
            <span>{currentLanguage.flag}</span>
            <span>{currentLanguage.code.toUpperCase()}</span>
            <ChevronDown size={11} />
          </button>
          {langOpen && (
            <div style={{
              position: 'absolute', top: '100%', right: 0, marginTop: 4,
              background: 'var(--surface-card)', border: '1px solid var(--border)',
              borderRadius: 12, padding: 6, minWidth: 160,
              boxShadow: 'var(--shadow-float)', zIndex: 1010,
            }}>
              {languages.map(lang => (
                <button key={lang.code} onClick={() => { setLocale(lang.code as Locale); setLangOpen(false); }} style={{
                  display: 'flex', alignItems: 'center', gap: 10, width: '100%',
                  padding: '8px 12px', borderRadius: 8, border: 'none',
                  background: locale === lang.code ? 'var(--surface-hover)' : 'transparent',
                  color: locale === lang.code ? 'var(--text-1)' : 'var(--text-2)',
                  fontSize: '0.82rem', cursor: 'pointer', textAlign: 'left' as const,
                }}>
                  <span style={{ fontSize: '1.1rem' }}>{lang.flag}</span>
                  <span>{lang.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Theme */}
        <button onClick={toggleTheme} title={isDark ? 'Light mode' : 'Dark mode'} style={{
          width: 34, height: 34, borderRadius: 8, border: '1px solid var(--border)',
          background: 'transparent', color: 'var(--text-2)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0,
        }}>
          {isDark ? <Sun size={15} /> : <Moon size={15} />}
        </button>

        {/* User / Auth */}
        {isAuthenticated && user ? (
          <div ref={userMenuRef} style={{ position: 'relative' }}>
            <button onClick={() => setUserMenuOpen(!userMenuOpen)} style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '4px 10px 4px 4px', borderRadius: 8,
              border: '1px solid var(--border)', background: 'transparent', cursor: 'pointer',
            }}>
              <div style={{
                width: 28, height: 28, borderRadius: '50%',
                background: 'var(--chakra-flow)', display: 'flex',
                alignItems: 'center', justifyContent: 'center',
                fontSize: '.65rem', fontWeight: 700, color: '#fff',
              }}>{userInitials}</div>
              {isDesktop && (
                <>
                  <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-2)', maxWidth: 80, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.name}</span>
                  <ChevronDown size={12} style={{ color: 'var(--text-3)' }} />
                </>
              )}
            </button>
            {userMenuOpen && (
              <div style={{
                position: 'fixed', top: TOPBAR_H + 4, right: 12,
                background: 'var(--surface-card)', border: '1px solid var(--border)',
                borderRadius: 12, padding: 6, minWidth: 180,
                boxShadow: 'var(--shadow-float)', zIndex: 9999,
              }}>
                <Link to="/dashboard?tab=profile" onClick={() => setUserMenuOpen(false)} style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '8px 12px', borderRadius: 8, fontSize: '0.82rem', color: 'var(--text-2)', textDecoration: 'none' }}>👤 {t('layout.profile')}</Link>
                <Link to="/dashboard" onClick={() => setUserMenuOpen(false)} style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '8px 12px', borderRadius: 8, fontSize: '0.82rem', color: 'var(--text-2)', textDecoration: 'none' }}>📊 Dashboard</Link>
                <Link to="/dashboard?tab=settings" onClick={() => setUserMenuOpen(false)} style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '8px 12px', borderRadius: 8, fontSize: '0.82rem', color: 'var(--text-2)', textDecoration: 'none' }}>⚙️ {t('layout.settings')}</Link>
                <div style={{ height: 1, background: 'var(--border)', margin: '4px 8px' }} />
                <button onClick={handleLogout} style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '8px 12px', borderRadius: 8, fontSize: '0.82rem', color: '#ef4444', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left' as const }}>🚪 {t('layout.logout')}</button>
              </div>
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <Link to="/login" style={{ padding: '7px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-2)', fontSize: '0.82rem', fontWeight: 600, textDecoration: 'none', whiteSpace: 'nowrap' }}>
              {t('login.loginBtn') || 'Đăng nhập'}
            </Link>
            <Link to="/register" style={{ padding: '7px 16px', borderRadius: 8, background: 'var(--chakra-flow)', color: '#fff', fontSize: '0.82rem', fontWeight: 700, textDecoration: 'none', whiteSpace: 'nowrap' }}>
              {t('login.registerNow') || 'Đăng ký'}
            </Link>
          </div>
        )}
      </header>

      {/* ═══ SIDEBAR (only when authenticated) ═══ */}
      {isAuthenticated && (
        <nav style={{
          position: 'fixed',
          top: TOPBAR_H,
          left: isDesktop ? (sidebarCollapsed ? -SIDEBAR_W : 0) : (sidebarOpen ? 0 : -SIDEBAR_W),
          width: SIDEBAR_W, bottom: 0, zIndex: 900,
          background: 'var(--nav-bg)',
          backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
          borderRight: '1px solid var(--border)',
          display: 'flex', flexDirection: 'column',
          overflowY: 'auto', overflowX: 'hidden',
          transition: 'left 280ms cubic-bezier(.4,0,.2,1)',
          scrollbarWidth: 'none' as const,
          msOverflowStyle: 'none' as const,
        }}>
          {/* Chakra glows */}
          <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 0 }}>
            <div style={{ position: 'absolute', top: '8%', left: '-40%', width: 160, height: 160, borderRadius: '50%', background: 'radial-gradient(circle, rgba(34,197,94,.1) 0%, transparent 70%)', animation: 'pulse 4s ease-in-out infinite' }} />
            <div style={{ position: 'absolute', top: '45%', right: '-30%', width: 140, height: 140, borderRadius: '50%', background: 'radial-gradient(circle, rgba(99,102,241,.08) 0%, transparent 70%)', animation: 'pulse 6s ease-in-out infinite 2s' }} />
            <div style={{ position: 'absolute', bottom: '15%', left: '-20%', width: 120, height: 120, borderRadius: '50%', background: 'radial-gradient(circle, rgba(168,85,247,.07) 0%, transparent 70%)', animation: 'pulse 7s ease-in-out infinite 3s' }} />
            <div style={{ position: 'absolute', top: 0, bottom: 0, left: 3, width: 2, background: 'linear-gradient(180deg, #22c55e, #06b6d4, #6366f1, #a855f7)', opacity: 0.12, borderRadius: 2 }} />
          </div>
          {/* Nav sections */}
          <div style={{ flex: 1, padding: '12px 10px', display: 'flex', flexDirection: 'column', gap: 18, position: 'relative', zIndex: 1 }}>
            {SIDEBAR_SECTIONS.map(section => (
              <div key={section.titleKey}>
                <div style={{
                  fontSize: '0.58rem', fontWeight: 800, letterSpacing: '0.14em',
                  textTransform: 'uppercase', color: section.color,
                  marginBottom: 5, paddingLeft: 10,
                  display: 'flex', alignItems: 'center', gap: 8,
                }}>
                  <span style={{ width: 14, height: 2, borderRadius: 1, background: section.color, opacity: 0.6, flexShrink: 0 }} />
                  {t(section.titleKey)}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  {section.items.map(item => {
                    const isActive = location.pathname === item.to || (item.to !== '/' && location.pathname.startsWith(item.to.split('?')[0]));
                    return (
                      <Link key={`${item.key}-${item.to}`} to={item.to} style={{
                        display: 'flex', alignItems: 'center', gap: 9,
                        padding: '7px 10px', borderRadius: 8,
                        fontSize: '0.82rem', fontWeight: isActive ? 600 : 400,
                        color: isActive ? '#fff' : 'var(--text-3)',
                        background: isActive ? `linear-gradient(90deg, ${section.color}22, transparent)` : 'transparent',
                        borderLeft: `2px solid ${isActive ? section.color : 'transparent'}`,
                        textDecoration: 'none', transition: 'all .18s',
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                      }}>
                        <span style={{
                          fontSize: '0.9rem', width: 24, height: 24, flexShrink: 0,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          borderRadius: 6,
                          background: isActive ? `${section.color}20` : 'rgba(255,255,255,.04)',
                          filter: isActive ? `drop-shadow(0 0 5px ${section.color})` : 'none',
                        }}>{(item as any).icon || '◈'}</span>
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', flex: 1 }}>{t(item.key)}</span>
                        {(item as any).isLive && <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#ef4444', flexShrink: 0, animation: 'pulse 2s infinite' }} />}
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
          {/* User info at bottom */}
          <div style={{ padding: '14px 12px', borderTop: '1px solid var(--border)', position: 'relative', zIndex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 32, height: 32, borderRadius: '50%', background: 'var(--chakra-flow)',
                flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff', fontSize: '.72rem', fontWeight: 700,
              }}>{userInitials}</div>
              <div style={{ overflow: 'hidden', flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: '.8rem', color: 'var(--text-1)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user?.name}</div>
                <div style={{ fontSize: '.68rem', color: 'var(--text-3)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user?.email}</div>
              </div>
            </div>
          </div>
        </nav>
      )}

      {/* Mobile sidebar overlay */}
      {!isDesktop && mobileSidebarVisible && (
        <div onClick={() => setSidebarOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 850 }} />
      )}

      {/* ═══ MAIN CONTENT ═══ */}
      <div style={{
        marginTop: TOPBAR_H,
        marginLeft: isDesktop ? effectiveSidebarW : 0,
        minHeight: `calc(100vh - ${TOPBAR_H}px)`,
        display: 'flex', flexDirection: 'column', flex: 1,
        transition: 'margin-left 280ms cubic-bezier(.4,0,.2,1)',
      }}>

        {/* Sub-nav tabs */}
        {subNav && (
          <div style={{
            position: 'sticky', top: TOPBAR_H, zIndex: 800,
            background: 'var(--nav-bg)', backdropFilter: 'blur(20px)',
            borderBottom: '1px solid var(--border)',
            display: 'flex', alignItems: 'center',
            padding: '0 20px', gap: 2,
            overflowX: 'auto', scrollbarWidth: 'none',
          }}>
            {subNav.map(link => {
              const isActive = isSubLinkActive(link.to);
              return (
                <Link key={link.to} to={link.to} style={{
                  display: 'flex', alignItems: 'center', gap: 5,
                  padding: '10px 12px', fontSize: '0.8rem', fontWeight: 600,
                  color: link.isLive ? 'var(--rose-400)' : isActive ? 'var(--primary, #22c55e)' : 'var(--text-3)',
                  textDecoration: 'none', whiteSpace: 'nowrap', flexShrink: 0,
                  borderBottom: `2px solid ${isActive ? 'var(--primary, #22c55e)' : 'transparent'}`,
                  transition: 'all .15s',
                }}>
                  {link.isLive && <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#ef4444', display: 'inline-block', animation: 'pulse 2s infinite' }} />}
                  {link.label}
                </Link>
              );
            })}
          </div>
        )}

        {/* Outlet */}
        {isDashPage ? (
          <main style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <Outlet />
          </main>
        ) : (
          <main style={{ flex: 1 }}>
            <Outlet />
          </main>
        )}

        {/* Footer */}
        {showFooter && (
          <footer style={{ borderTop: '1px solid var(--border)', background: 'var(--bg-1)', padding: '64px 24px 32px' }}>
            <div style={{ maxWidth: 1200, margin: '0 auto' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: 40, marginBottom: 48 }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                    <WKLogo size={34} />
                    <span style={{ fontFamily: 'var(--ff-display)', fontSize: '1.15rem', fontWeight: 700, background: 'var(--chakra-text)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>{t('footer.brand')}</span>
                  </div>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-3)', lineHeight: 1.6, maxWidth: 320 }}>{t('footer.tagline')}</p>
                  <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 5, fontSize: '0.78rem', color: 'var(--text-3)' }}>
                    <div style={{ fontWeight: 700, color: 'var(--text-2)' }}>Công ty Cổ phần Công nghệ WellNexus</div>
                    <div>Công ty TNHH WellKOC Việt Nam</div>
                    <div>📍 35 Thái Phiên, Hải Châu, Đà Nẵng</div>
                    <div><a href="tel:0913156676" style={{ color: 'var(--text-2)', textDecoration: 'none' }}>📞 0913 156 676</a></div>
                    <div><a href="mailto:support@wellkoc.com" style={{ color: 'var(--text-2)', textDecoration: 'none' }}>✉️ support@wellkoc.com</a></div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, marginTop: 16, flexWrap: 'wrap' }}>
                    {CHAIN_BADGES.map(c => (
                      <span key={c} style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid var(--border)', fontSize: '0.7rem', color: 'var(--text-3)', fontFamily: 'var(--ff-mono)' }}>{c}</span>
                    ))}
                  </div>
                </div>
                {FOOTER_LINKS.map(col => (
                  <div key={col.titleKey}>
                    <div style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: 16 }}>{t(col.titleKey)}</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {col.links.map((lnk: any) => (
                        <Link key={lnk.to + (lnk.label || lnk.labelKey)} to={lnk.to} style={{ fontSize: '0.85rem', color: 'var(--text-3)', textDecoration: 'none' }}>
                          {lnk.label || t(lnk.labelKey)}
                        </Link>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ borderTop: '1px solid var(--border)', paddingTop: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-3)' }}>© 2025 WellKOC. {t('footer.rights')}</div>
                <div style={{ display: 'flex', gap: 12 }}>
                  {['🐦','💬','📺','📘'].map((icon, i) => (
                    <button key={i} style={{ width: 32, height: 32, borderRadius: '50%', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-3)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>{icon}</button>
                  ))}
                </div>
              </div>
            </div>
          </footer>
        )}
      </div>

      <ChatWidget />

      <style>{`
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
