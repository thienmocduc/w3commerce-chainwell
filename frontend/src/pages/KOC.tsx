import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth, API_BASE } from '@hooks/useAuth';
import { ordersApi } from '@lib/api';
import { useI18n } from '@hooks/useI18n';

/* ── Helpers ─────────────────────────────────────── */
const formatVND = (n: number) => n.toLocaleString('vi-VN') + '₫';
const shortenHash = (h: string) => h.length > 16 ? `${h.slice(0, 6)}...${h.slice(-4)}` : h;

const Stars = ({ count, size = '.82rem' }: { count: number; size?: string }) => (
  <span style={{ fontSize: size, letterSpacing: 1 }}>
    {[1, 2, 3, 4, 5].map(i => (
      <span key={i} style={{ color: i <= count ? '#fbbf24' : 'var(--text-4)' }}>★</span>
    ))}
  </span>
);

/* ── Sidebar navigation (3 groups, accordion) ────── */
interface SidebarGroup {
  key: string;
  label: string;
  color: string;
  icon: string;
  items: { key: string; icon: string; label: string }[];
}

const sidebarGroups: SidebarGroup[] = [
  {
    key: 'koc', label: 'koc.sidebar.kocPro', color: 'var(--c6-500)', icon: '⭐',
    items: [
      { key: 'overview',    icon: '📊', label: 'koc.sidebar.overview' },
      { key: 'content',     icon: '📝', label: 'koc.sidebar.content' },
      { key: 'campaigns',   icon: '📢', label: 'koc.sidebar.campaigns' },
      { key: 'commission',  icon: '💰', label: 'koc.sidebar.commission' },
      { key: 'automkt',     icon: '🤖', label: 'koc.sidebar.automkt' },
      { key: 'community',   icon: '👥', label: 'koc.sidebar.community' },
      { key: 'performance', icon: '📈', label: 'koc.sidebar.performance' },
      { key: 'ranking',     icon: '🏆', label: 'koc.sidebar.ranking' },
      { key: 'token',       icon: '🪙', label: 'koc.sidebar.creatorToken' },
      { key: 'missions',    icon: '🎯', label: 'koc.sidebar.missions' },
      { key: 'convert',     icon: '🔄', label: 'koc.sidebar.convert' },
    ],
  },
  {
    key: 'aff', label: 'koc.sidebar.affiliate', color: '#f59e0b', icon: '🔗',
    items: [
      { key: 'affiliate',   icon: '🔗', label: 'koc.sidebar.linkAffiliate' },
      { key: 'share',       icon: '📤', label: 'koc.sidebar.share' },
      { key: 'affTeam',     icon: '🌳', label: 'koc.sidebar.affTeam' },
      { key: 'affStats',    icon: '📊', label: 'koc.sidebar.affStats' },
      { key: 'affPayout',   icon: '💸', label: 'koc.sidebar.affPayout' },
      { key: 'affMaterials',icon: '🖼️', label: 'koc.sidebar.affMaterials' },
    ],
  },
  {
    key: 'buyer', label: 'koc.sidebar.shopping', color: 'var(--c4-500)', icon: '🛒',
    items: [
      { key: 'orders',    icon: '📦', label: 'koc.sidebar.orders' },
      { key: 'tracking',  icon: '🚚', label: 'koc.sidebar.tracking' },
      { key: 'history',   icon: '🕐', label: 'koc.sidebar.history' },
      { key: 'wkpay',     icon: '👛', label: 'koc.sidebar.wkpay' },
      { key: 'payments',  icon: '💳', label: 'koc.sidebar.payments' },
      { key: 'vouchers',  icon: '🎟️', label: 'koc.sidebar.vouchers' },
      { key: 'favorites', icon: '❤️', label: 'koc.sidebar.favorites' },
    ],
  },
];

/* Backward compat — flat lists for renderContent switch */
const buyerItems = sidebarGroups.find(g => g.key === 'buyer')!.items;
const kocItems = [...sidebarGroups.find(g => g.key === 'koc')!.items, { key: 'settings', icon: '⚙️', label: 'koc.sidebar.settings' }];

/* ═══════════════════════════════════════════════════ */
/*  BUYER DATA                                        */
/* ═══════════════════════════════════════════════════ */

/* ── Order data ──────────────────────────────────── */
interface OrderItem { name: string; qty: number; price: number; }
interface Order {
  id: string; date: string; items: OrderItem[]; total: number;
  status: 'pending' | 'confirmed' | 'packing' | 'shipping' | 'delivered' | 'cancelled' | 'return';
  payment: string; trackingCode?: string; reviewed?: boolean;
}

const allOrders: Order[] = [];

const orderStatusConfig: Record<string, { labelKey: string; badge: string }> = {
  pending: { labelKey: 'koc.orderStatus.pending', badge: 'badge-c7' },
  confirmed: { labelKey: 'koc.orderStatus.confirmed', badge: 'badge-c5' },
  packing: { labelKey: 'koc.orderStatus.packing', badge: 'badge-c5' },
  shipping: { labelKey: 'koc.orderStatus.shipping', badge: 'badge-c5' },
  delivered: { labelKey: 'koc.orderStatus.delivered', badge: 'badge-c4' },
  cancelled: { labelKey: 'koc.orderStatus.cancelled', badge: 'badge-rose' },
  return: { labelKey: 'koc.orderStatus.return', badge: 'badge-c7' },
};

/* ── Tracking steps ──────────────────────────────── */
const trackingStepKeys = ['koc.tracking.placed', 'koc.tracking.confirmed', 'koc.tracking.packing', 'koc.tracking.shipping', 'koc.tracking.delivered'];
const getTrackingStep = (status: string): number => {
  switch (status) {
    case 'pending': return 0;
    case 'confirmed': return 1;
    case 'packing': return 2;
    case 'shipping': return 3;
    case 'delivered': return 4;
    default: return -1;
  }
};

/* ── Payment data ────────────────────────────────── */
const savedPaymentMethods = [
  { id: 1, type: 'VNPay', label: 'VNPay - Ngân hàng Vietcombank', last4: '••••4821', isDefault: true },
  { id: 2, type: 'MoMo', label: 'MoMo - 0912 345 678', last4: '', isDefault: false },
  { id: 3, type: 'Bank', label: 'Visa •••• 6789', last4: '6789', isDefault: false },
];

const cryptoBalances = [
  { token: 'MATIC', amount: '0', usd: '$0.00', icon: 'M', color: 'var(--c7-500)' },
  { token: 'USDT', amount: '0', usd: '$0.00', icon: 'U', color: 'var(--c4-500)' },
  { token: 'WK', amount: '0', usd: '$0.00', icon: 'W', color: 'var(--c6-500)' },
];

/* ── WK Pay data ─────────────────────────────────── */
const wkPayData = {
  balanceVND: 0,
  balanceWK: 0,
  wkPrice: 0.10,
  wkChange24h: 0,
  transactions: [] as { id: string; type: string; source: string; amount: number; date: string; status: string }[],
};

/* ── Favorites ───────────────────────────────────── */
const favoriteProducts: { id: number; name: string; price: number; rating: number; reviews: number; vendor: string; emoji: string; alert: boolean }[] = [];

/* ═══════════════════════════════════════════════════ */
/*  KOC PRO DATA                                      */
/* ═══════════════════════════════════════════════════ */

/* ── KPI data ────────────────────────────────────── */
const kpiData = [
  { label: 'Hoa hồng tháng', value: '0₫', delta: '—', up: false, color: 'var(--c4-500)' },
  { label: 'Doanh thu affiliate', value: '0₫', delta: '—', up: false, color: 'var(--c5-500)' },
  { label: 'Conversions', value: '0', delta: '—', up: false, color: 'var(--c6-500)' },
  { label: 'Followers', value: '0', delta: '—', up: false, color: 'var(--c7-500)' },
  { label: 'XP Points', value: '0', delta: 'Level 1', up: false, color: 'var(--gold-400)' },
];

/* ── Overview chart data ─────────────────────────── */
const monthlyBars = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
const monthLabels = ['T1','T2','T3','T4','T5','T6','T7','T8','T9','T10','T11','T12'];

const recentActivities: { time: string; text: string; color: string }[] = [];

/* ── Content posts ───────────────────────────────── */
const contentPosts: { id: number; type: string; title: string; date: string; views: number; likes: number; comments: number; revenue: string; emoji: string }[] = [];

/* ── Campaigns ───────────────────────────────────── */
const campaigns: { id: number; name: string; brand: string; status: string; commission: string; earned: string; startDate: string; endDate: string }[] = [];
const campaignStatusConfig: Record<string, { labelKey: string; badge: string }> = {
  active: { labelKey: 'koc.campaigns.active', badge: 'badge-c4' },
  completed: { labelKey: 'koc.campaigns.completed', badge: 'badge-c5' },
  upcoming: { labelKey: 'koc.campaigns.upcoming', badge: 'badge-gold' },
};

/* ── Commission data ─────────────────────────────── */
const commissionData: { id: string; product: string; buyer: string; amount: string; commission: string; rate: string; status: string; date: string; txHash: string }[] = [];
const commStatusConfig: Record<string, { labelKey: string; badge: string }> = {
  confirmed: { labelKey: 'koc.commission.confirmed', badge: 'badge-c4' },
  pending: { labelKey: 'koc.commission.pendingReview', badge: 'badge-gold' },
  processing: { labelKey: 'koc.commission.processing', badge: 'badge-c5' },
};

/* ── Withdrawal history ──────────────────────────── */
const withdrawalHistory: { id: string; method: string; amount: string; fee: string; status: string; date: string; note: string }[] = [];

/* ── Auto MKT Agents ─────────────────────────────── */
const mktAgents: { id: number; name: string; type: string; status: string; budget: string; spent: string; schedule: string; impressions: number; clicks: number; conversions: number; cost: string; roi: string }[] = [];
const agentTypes = ['Content AI', 'Analytics', 'Social Bot', 'Email AI', 'SEO Optimizer', 'Ad Manager'];
const agentStatusConfig: Record<string, { labelKey: string; badge: string }> = {
  running: { labelKey: 'koc.automkt.running', badge: 'badge-c4' },
  paused: { labelKey: 'koc.automkt.paused', badge: 'badge-gold' },
  completed: { labelKey: 'koc.campaigns.completed', badge: 'badge-c5' },
};

/* ── Affiliate & CRM ─────────────────────────────── */
const affiliateLinks: { id: number; product: string; link: string; clicks: number; conversions: number; revenue: string }[] = [];
const partnerStats = { f1: 0, f2: 0, totalNetwork: 0 };
const crmCustomers = [
  { id: 1, name: 'Nguyễn Thị Mai', email: 'mai.nt@gmail.com', orders: 12, totalSpend: '3.450.000₫', lastPurchase: '2026-03-25' },
  { id: 2, name: 'Trần Văn Hùng', email: 'hung.tv@gmail.com', orders: 8, totalSpend: '2.180.000₫', lastPurchase: '2026-03-23' },
  { id: 3, name: 'Lê Thị Hoa', email: 'hoa.lt@gmail.com', orders: 15, totalSpend: '5.670.000₫', lastPurchase: '2026-03-24' },
  { id: 4, name: 'Phạm Quốc Bảo', email: 'bao.pq@gmail.com', orders: 5, totalSpend: '1.290.000₫', lastPurchase: '2026-03-20' },
  { id: 5, name: 'Hoàng Thị Lan', email: 'lan.ht@gmail.com', orders: 22, totalSpend: '8.900.000₫', lastPurchase: '2026-03-26' },
];

/* ── Share / Multi-platform ──────────────────────── */
const socialPlatforms = [
  { name: 'TikTok', handle: '@minhhuong_koc', connected: true, color: '#000000', icon: '🎵' },
  { name: 'Instagram', handle: '@minhhuong', connected: true, color: '#E4405F', icon: '📸' },
  { name: 'Facebook', handle: 'Minh Hương', connected: true, color: '#1877F2', icon: '👤' },
  { name: 'YouTube', handle: 'MH Reviews', connected: false, color: '#FF0000', icon: '▶️' },
  { name: 'Zalo', handle: '0912***678', connected: true, color: '#0068FF', icon: '💬' },
  { name: 'Telegram', handle: '@mh_wellkoc', connected: false, color: '#0088CC', icon: '✈️' },
];

const shareProducts = [
  { id: 1, name: 'Serum Vitamin C 20%' },
  { id: 2, name: 'Trà Ô Long Đài Loan Premium' },
  { id: 3, name: 'Mật Ong Rừng Tây Nguyên' },
  { id: 4, name: 'Bột Collagen Cá Biển' },
  { id: 5, name: 'Cà Phê Arabica Đà Lạt' },
];

const platformAnalytics = [
  { platform: 'TikTok', clicks: 12345, orders: 592, revenue: '45.2M₫', cvr: '4.8%', color: '#000000' },
  { platform: 'Instagram', clicks: 8901, orders: 401, revenue: '38.7M₫', cvr: '4.5%', color: '#E4405F' },
  { platform: 'Facebook', clicks: 5234, orders: 198, revenue: '18.9M₫', cvr: '3.8%', color: '#1877F2' },
  { platform: 'YouTube', clicks: 3456, orders: 156, revenue: '15.2M₫', cvr: '4.5%', color: '#FF0000' },
  { platform: 'Zalo', clicks: 2100, orders: 89, revenue: '8.4M₫', cvr: '4.2%', color: '#0068FF' },
  { platform: 'Telegram', clicks: 1890, orders: 67, revenue: '6.1M₫', cvr: '3.5%', color: '#0088CC' },
];

const referralTeam = [
  { name: 'Nguyễn A', role: 'Buyer', orders: 23, active: true },
  { name: 'Trần B', role: 'KOC', orders: 45, active: true },
  { name: 'Phạm D', role: 'Buyer', orders: 8, active: false },
  { name: 'Lê C', role: 'Vendor', orders: 0, active: true },
  { name: 'Hoàng E', role: 'KOC', orders: 34, active: true },
  { name: 'Vũ F', role: 'Buyer', orders: 15, active: true },
  { name: 'Đặng G', role: 'Buyer', orders: 5, active: false },
  { name: 'Bùi H', role: 'KOC', orders: 28, active: true },
  { name: 'Ngô I', role: 'Buyer', orders: 12, active: true },
  { name: 'Trương K', role: 'Vendor', orders: 0, active: true },
  { name: 'Đinh L', role: 'Buyer', orders: 19, active: true },
  { name: 'Lý M', role: 'Buyer', orders: 3, active: false },
];

/* ── 8 cấp bậc Luân Xa ─────────────────────────── */
const RANK_TIERS = [
  { id: 'user',      label: 'Người Dùng',         icon: '🔴', color: '#ef4444', glow: 'rgba(239,68,68,.35)',   chakra: 'Muladhara C1',   bg: 'rgba(239,68,68,.1)'  },
  { id: 'koc',       label: 'KOC / KOL',           icon: '🟠', color: '#f97316', glow: 'rgba(249,115,22,.35)',  chakra: 'Svadhisthana C2', bg: 'rgba(249,115,22,.1)' },
  { id: 'amb',       label: 'Đại Sứ',              icon: '🟡', color: '#eab308', glow: 'rgba(234,179,8,.35)',   chakra: 'Manipura C3',    bg: 'rgba(234,179,8,.1)'  },
  { id: 'silver',    label: 'Đại Sứ Silver',        icon: '🟢', color: '#22c55e', glow: 'rgba(34,197,94,.35)',   chakra: 'Anahata C4',     bg: 'rgba(34,197,94,.1)'  },
  { id: 'gold',      label: 'Đại Sứ Gold',          icon: '🔵', color: '#3b82f6', glow: 'rgba(59,130,246,.35)',  chakra: 'Vishuddha C5',   bg: 'rgba(59,130,246,.1)' },
  { id: 'diamond',   label: 'Đại Sứ Diamond',       icon: '🟣', color: '#6366f1', glow: 'rgba(99,102,241,.35)', chakra: 'Ajna C6',        bg: 'rgba(99,102,241,.1)' },
  { id: 'phoenix',   label: 'Phượng Hoàng',         icon: '💜', color: '#a855f7', glow: 'rgba(168,85,247,.35)',  chakra: 'Sahasrara C7',   bg: 'rgba(168,85,247,.1)' },
  { id: 'dragon',    label: 'Long Phụng Sum Vầy',   icon: '🌈', color: 'url(#chakraGrad)', glow: 'rgba(168,85,247,.5)', chakra: 'Thiên Long ∞',  bg: 'rgba(168,85,247,.15)', gradient: 'linear-gradient(135deg,#ef4444,#f97316,#eab308,#22c55e,#3b82f6,#6366f1,#a855f7)' },
];
const getRank = (id: string) => RANK_TIERS.find(r => r.id === id) ?? RANK_TIERS[0];

/* ── Community ───────────────────────────────────── */
const communityStats = { totalMembers: 0, newThisMonth: 0, activeRate: '0%' };

// Populated from real API data
const communityTeams: {
  teamNo: number;
  f1: { id: string; name: string; rank: string; joinDate: string; orders: number; active: boolean };
  members: { id: string; name: string; rank: string; joinDate: string; orders: number; active: boolean; gen: number }[];
}[] = [];

/* ── Performance ─────────────────────────────────── */
const perfKpis = [
  { label: 'Tổng khách hàng', value: '0', color: 'var(--c4-500)' },
  { label: 'Khách hàng mới', value: '0', color: 'var(--c5-500)' },
  { label: 'Số người mua hàng', value: '0', color: 'var(--c6-500)' },
  { label: 'Tỷ lệ chuyển đổi', value: '0%', color: 'var(--c7-500)' },
  { label: 'Doanh thu/khách', value: '0₫', color: 'var(--gold-400)' },
];
const funnelSteps = [
  { label: 'Lượt truy cập', value: 0, pct: 0 },
  { label: 'Xem sản phẩm', value: 0, pct: 0 },
  { label: 'Thêm giỏ hàng', value: 0, pct: 0 },
  { label: 'Thanh toán', value: 0, pct: 0 },
];

/* ── Ranking & Rewards ───────────────────────────── */
const myRank = { rank: 0, total: 0, tier: 'Người Dùng', xp: 0, revenue: '0₫' };
const leaderboard: { rank: number; name: string; revenue: string; commission: string; badges: number; tier: string }[] = [
];
const gamificationBadges = [
  { icon: '🏅', name: 'Đơn Hàng Đầu Tiên', earned: true },
  { icon: '💯', name: '100 Đơn Hàng', earned: true },
  { icon: '🔥', name: 'Top KOC Tuần', earned: true },
  { icon: '⭐', name: '1000 Followers', earned: true },
  { icon: '🎯', name: 'Conversion Master', earned: true },
  { icon: '📹', name: 'Video Viral 10K', earned: true },
  { icon: '💎', name: 'Diamond KOC', earned: true },
  { icon: '🌟', name: 'Community Leader', earned: false },
  { icon: '🏆', name: 'Top 10 Tháng', earned: false },
  { icon: '👑', name: 'Legend KOC', earned: false },
];

const careerRewards = [
  {
    tier: 'Bronze', icon: '🎁', title: 'Quà tặng đặc biệt',
    description: 'Gift package trị giá 5.000.000₫ — bộ sản phẩm WellKOC Premium',
    target: 50000000, current: 245000000,
    gradient: 'linear-gradient(135deg, #cd7f32 0%, #e8a855 50%, #cd7f32 100%)',
    glow: '0 0 30px rgba(205,127,50,0.3)',
  },
  {
    tier: 'Silver', icon: '🏍️', title: 'Xe máy Honda Vision',
    description: 'Honda Vision phiên bản giới hạn — trị giá 35.000.000₫',
    target: 500000000, current: 245000000,
    gradient: 'linear-gradient(135deg, #8a9bb0 0%, #c0c8d4 40%, #dce3eb 60%, #8a9bb0 100%)',
    glow: '0 0 30px rgba(192,200,212,0.3)',
  },
  {
    tier: 'Gold', icon: '🚗', title: 'Ô tô VinFast VF5',
    description: 'VinFast VF5 Plus — trị giá 500.000.000₫',
    target: 2000000000, current: 245000000,
    gradient: 'linear-gradient(135deg, #b8860b 0%, #ffd700 40%, #fff4a3 60%, #b8860b 100%)',
    glow: '0 0 40px rgba(255,215,0,0.35)',
  },
  {
    tier: 'Platinum', icon: '🏠', title: 'Căn hộ WellKOC Residence',
    description: 'Căn hộ cao cấp WellKOC Residence — trị giá 2.000.000.000₫',
    target: 10000000000, current: 245000000,
    gradient: 'linear-gradient(135deg, #4a6741 0%, #7fb069 30%, #b8d4a3 60%, #4a6741 100%)',
    glow: '0 0 40px rgba(127,176,105,0.3)',
  },
  {
    tier: 'Diamond', icon: '💎', title: 'ESOP 0.1% cổ phần WellKOC',
    description: 'Sở hữu 0.1% cổ phần công ty WellKOC — cổ đông chính thức',
    target: 50000000000, current: 245000000,
    gradient: 'linear-gradient(135deg, #1a1a2e 0%, #4a69bd 30%, #82ccdd 50%, #b8e0f0 70%, #4a69bd 100%)',
    glow: '0 0 50px rgba(74,105,189,0.4)',
  },
  {
    tier: 'Legend', icon: '👑', title: 'ESOP 0.5% + Đồng sáng lập danh dự',
    description: 'Cổ phần 0.5% WellKOC + Danh hiệu Đồng sáng lập danh dự vĩnh viễn',
    target: 200000000000, current: 245000000,
    gradient: 'linear-gradient(135deg, #1a0a2e 0%, #6c2dc7 20%, #b266ff 40%, #ffd700 60%, #ff6b6b 80%, #6c2dc7 100%)',
    glow: '0 0 60px rgba(108,45,199,0.5), 0 0 120px rgba(255,215,0,0.2)',
  },
];

/* ── Creator Token ───────────────────────────────── */
const creatorToken = {
  name: '$WK', fullName: 'WK Creator Token', symbol: 'WK',
  totalSupply: '1,000,000', circulatingSupply: '125,000',
  price: '0.045 USDT', priceChange: '+12.5%',
  holders: 847, marketCap: '$5,625', chain: 'Polygon',
  contractAddress: '0xToken...7890',
};
const tokenHolders = [
  { address: '0xFan1...A1B2', amount: '12,500', pct: '10.0%' },
  { address: '0xFan2...C3D4', amount: '8,750', pct: '7.0%' },
  { address: '0xFan3...E5F6', amount: '6,250', pct: '5.0%' },
  { address: '0xFan4...G7H8', amount: '5,000', pct: '4.0%' },
  { address: '0xPool...I9J0', amount: '92,500', pct: '74.0%' },
];

/* ── Settings ────────────────────────────────────── */
const settingsSections = [
  { title: 'Hồ sơ KOC', fields: [{ label: 'Tên', value: 'Minh Hương' }, { label: 'Handle', value: '@minhhuong.koc' }, { label: 'Bio', value: 'KOC chuyên review organic & wellness' }] },
  { title: 'Địa chỉ giao hàng', fields: [{ label: 'Mặc định', value: '123 Nguyễn Huệ, Q.1, TP.HCM' }, { label: 'SĐT', value: '0912 345 678' }] },
  { title: 'Tài khoản ngân hàng', fields: [{ label: 'Ngân hàng', value: 'Vietcombank **** 1234' }, { label: 'Chủ TK', value: 'MINH HUONG' }] },
  { title: 'WK Pay KYC', fields: [{ label: 'Trạng thái', value: 'Đã xác minh' }, { label: 'Ví', value: '0xA1B2...5678' }] },
  { title: 'Blockchain', fields: [{ label: 'Chain chính', value: 'Polygon' }, { label: 'Auto-claim', value: 'Bật' }] },
  { title: 'Bảo mật', fields: [{ label: '2FA', value: 'Đã bật' }, { label: 'Mật khẩu', value: '••••••••' }, { label: 'Session', value: '30 phút' }] },
];

/* ── Voucher data ────────────────────────────────── */
const myVouchers: { code: string; desc: string; expires: string; used: boolean }[] = [];
const voucherRedeemOptions = [
  { xp: 50, desc: 'Voucher giảm 20.000₫', minOrder: '100K' },
  { xp: 200, desc: 'Voucher giảm 100.000₫', minOrder: '500K' },
  { xp: 500, desc: 'Voucher Free Ship', minOrder: '0₫' },
  { xp: 1000, desc: 'Voucher giảm 500.000₫', minOrder: '1M' },
];

/* ── Clipboard helper ────────────────────────────── */
const copyText = (text: string) => {
  if (navigator.clipboard) navigator.clipboard.writeText(text).catch(() => {});
};

/* ── Toast component ─────────────────────────────── */
const Toast = ({ message, onDone }: { message: string; onDone: () => void }) => {
  useEffect(() => { const t = setTimeout(onDone, 2500); return () => clearTimeout(t); }, [message, onDone]);
  return (
    <div style={{
      position: 'sticky', top: 0, zIndex: 999, padding: '12px 20px',
      background: 'var(--c4-500)', color: '#fff', fontWeight: 600, fontSize: '.82rem',
      borderRadius: '0 0 10px 10px', textAlign: 'center',
      animation: 'fadeIn .2s ease',
      boxShadow: '0 4px 16px rgba(0,0,0,.15)',
    }}>{message}</div>
  );
};

/* ── Shared sub-components ───────────────────────── */
const TH = ({ children }: { children: string }) => (
  <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 700, fontSize: '.65rem', color: 'var(--text-3)', letterSpacing: '.06em', textTransform: 'uppercase' }}>{children}</th>
);
const TD = ({ children, mono, bold, color, style: s }: { children: React.ReactNode; mono?: boolean; bold?: boolean; color?: string; style?: React.CSSProperties }) => (
  <td style={{ padding: '12px 14px', fontFamily: mono ? 'var(--ff-display)' : undefined, fontWeight: bold ? 700 : undefined, color, whiteSpace: mono ? 'nowrap' : undefined, ...s }}>{children}</td>
);

/* ══════════════════════════════════════════════════ */
/*  MAIN COMPONENT                                   */
/* ══════════════════════════════════════════════════ */
export default function KOC() {
  const navigate = useNavigate();
  const { user, token, logout } = useAuth();
  const { t } = useI18n();
  const userName = user?.name || 'KOC';
  const userEmail = user?.email || '';
  const userRefCode = user?.referral_code || `WK-${(user?.id || '').slice(0, 6).toUpperCase()}`;

  const [activeNav, setActiveNav] = useState('overview');
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({ koc: true, aff: false, buyer: false });
  const [orderTab, setOrderTab] = useState('all');
  const [historySearch, setHistorySearch] = useState('');
  const [settingsTab, setSettingsTab] = useState('profile');
  const [selectedShareProduct, setSelectedShareProduct] = useState(shareProducts[0].name);

  /* ── Toast state ─── */
  const [toast, setToast] = useState('');
  const showToast = useCallback((msg: string) => setToast(msg), []);
  const clearToast = useCallback(() => setToast(''), []);

  /* ── Orders state ─── */
  const [orders, setOrders] = useState<Order[]>(allOrders);

  /* ── Content state ─── */
  const [posts, setPosts] = useState(contentPosts);

  /* ── Campaigns state ─── */
  const [camps, setCamps] = useState(campaigns);

  /* ── Commission balance ─── */
  const [commBalance, setCommBalance] = useState(0);
  const [showWithdrawForm, setShowWithdrawForm] = useState(false);
  const [withdrawAmt, setWithdrawAmt] = useState('');

  /* ── Community expanded teams ─── */
  const [expandedTeams, setExpandedTeams] = useState<Record<number, boolean>>({});

  /* ── Vouchers state ─── */
  const [vouchers, setVouchers] = useState(myVouchers);

  /* ── XP state (shared across missions/voucher/convert) ─── */
  const [xp, setXp] = useState(0);

  /* ── Favorites state ─── */
  const [favs, setFavs] = useState(favoriteProducts);

  /* ── Affiliate links state ─── */
  const [affLinks, setAffLinks] = useState(affiliateLinks);

  /* ── Settings edit mode ─── */
  const [settingsEditing, setSettingsEditing] = useState(false);
  const [settingsFormData, setSettingsFormData] = useState({ name: '', email: '', phone: '', handle: '', bio: '' });
  useEffect(() => {
    if (user) setSettingsFormData({ name: user.name || '', email: user.email || '', phone: user.phone || '', handle: `@${(user.name || 'user').toLowerCase().replace(/\s/g, '')}.koc`, bio: '' });
  }, [user]);

  /* ── Missions state ─── */
  const [claimedMissions, setClaimedMissions] = useState<Set<string>>(new Set(['Đăng nhập hôm nay']));

  /* ── Convert state ─── */
  const [convertAmount, setConvertAmount] = useState(500);
  const [wk3Balance, setWk3Balance] = useState(42.5);

  /* ── Token form state ─── */
  const [tokenAction, setTokenAction] = useState<'buy' | 'sell' | null>(null);

  /* ── QR modal ─── */
  const [showQR, setShowQR] = useState(false);

  /* ── Mobile sidebar toggle ─── */
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  /* ── KYC verification state ─── */
  const [kycStep, setKycStep] = useState(0); // 0=not started, 1=email, 2=phone, 3=identity, 4=bank, 5=complete
  const [kycData, setKycData] = useState({ idType: 'cccd', idNumber: '', idFront: '', idBack: '', selfie: '', bankName: '', bankAccount: '', bankHolder: '' });
  const [kycSubmitting, setKycSubmitting] = useState(false);

  const toggleGroup = (key: string) => setOpenGroups(prev => ({ ...prev, [key]: !prev[key] }));
  // Auto-open group when clicking a nav item inside it
  const handleNavClick = (groupKey: string, itemKey: string) => {
    setActiveNav(itemKey);
    if (!openGroups[groupKey]) setOpenGroups(prev => ({ ...prev, [groupKey]: true }));
    setMobileSidebarOpen(false); // close sidebar on mobile after click
  };

  // Derive KYC step from verified user info
  useEffect(() => {
    if (user) {
      let step = 0;
      if (user.email) step = 1;
      if (user.phone) step = 2;
      setKycStep(step);
    }
  }, [user]);

  // No auth guard — page renders for all users

  /* ── Server connection status ─── */
  const [serverNotice, setServerNotice] = useState('');

  /* ── Share link from API ─── */
  const [generatedShareLink, setGeneratedShareLink] = useState('');
  const [isGeneratingLink, setIsGeneratingLink] = useState(false);

  /* ── Affiliate product picker ─── */
  const [showAffPicker, setShowAffPicker] = useState(false);
  const [pickerProducts, setPickerProducts] = useState<{id:string;name:string;price:number;image?:string}[]>([]);
  const [pickerLoading, setPickerLoading] = useState(false);
  const [pickerSearch, setPickerSearch] = useState('');
  const [pickerPlatform, setPickerPlatform] = useState('direct');

  /* ── Community teams from API ─── */
  const [communityTeamsData, setCommunityTeamsData] = useState(communityTeams);
  const [communityStatsData, setCommunityStatsData] = useState(communityStats);
  useEffect(() => {
    if (!token) return;
    fetch(`${API_BASE}/referral/my-team`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(data => {
        // Map API response to communityTeams shape
        if (data?.direct_referrals && Array.isArray(data.direct_referrals)) {
          const teams = data.direct_referrals.map((f1: any, idx: number) => ({
            teamNo: idx + 1,
            f1: { id: f1.id, name: f1.name || f1.email, rank: f1.role || 'user', joinDate: (f1.created_at || '').slice(0, 10), orders: f1.orders_count || 0, active: f1.is_active !== false },
            members: (f1.children || []).map((m: any) => ({ id: m.id, name: m.name || m.email, rank: m.role || 'user', joinDate: (m.created_at || '').slice(0, 10), orders: m.orders_count || 0, active: m.is_active !== false, gen: 2 })),
          }));
          setCommunityTeamsData(teams);
          setCommunityStatsData({ totalMembers: data.total_members || teams.length, newThisMonth: data.new_this_month || 0, activeRate: data.active_rate || '0%' });
        }
      })
      .catch(() => {});
  }, [token]);

  /* ── Commission summary from API ─── */
  useEffect(() => {
    if (!token) return;
    fetch(`${API_BASE}/commissions/summary`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(data => {
        if (data?.total_settled != null) setCommBalance(Number(data.pending_amount ?? 0));
      })
      .catch(() => {});
  }, [token]);

  /* ── Real orders from API ─── */
  const [ordersLoaded, setOrdersLoaded] = useState(false);
  useEffect(() => {
    if (!token || ordersLoaded) return;
    ordersApi.list({ per_page: 50 }, token)
      .then(res => {
        if (res.items?.length) {
          const mapped = res.items.map((o: any) => ({
            id: o.order_number || o.id,
            date: (o.created_at || '').slice(0, 10),
            items: (o.items || []).map((i: any) => ({ name: i.name || i.product_name, qty: i.quantity, price: i.price || i.unit_price || 0 })),
            total: o.total || o.total_amount || 0,
            status: o.status || 'pending',
            payment: o.payment_method || '—',
            trackingCode: o.tracking_code,
            reviewed: o.reviewed,
          }));
          setOrders(mapped);
          setOrdersLoaded(true);
        }
      })
      .catch(() => {});
  }, [token, ordersLoaded]);

  /* ── Affiliate links from API ─── */
  const [affLinksLoaded, setAffLinksLoaded] = useState(false);

  // Fetch real affiliate links on mount
  useEffect(() => {
    const fetchAffLinks = async () => {
      try {
        const res = await fetch(`${API_BASE}/share/affiliate-links`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (!res.ok) throw new Error('API error');
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          setAffLinks(data);
          setAffLinksLoaded(true);
          setServerNotice('');
        }
      } catch {
        setServerNotice('Đang kết nối server...');
        // Keep mock data as fallback
      }
    };
    fetchAffLinks();
  }, [token]);

  // Generate share link via API
  const generateShareLink = async (platform: string) => {
    const product = shareProducts.find(p => p.name === selectedShareProduct);
    if (!product) return null;

    setIsGeneratingLink(true);
    try {
      const res = await fetch(`${API_BASE}/share/generate-link`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          product_id: product.id,
          platform,
          campaign_name: 'koc_share',
        }),
      });
      if (!res.ok) throw new Error('API error');
      const data = await res.json();
      const link = data.affiliate_link || data.link;
      if (link) {
        setGeneratedShareLink(link);
        setServerNotice('');
        return link;
      }
      throw new Error('No link returned');
    } catch {
      // Fallback: generate client-side link
      const fallback = `https://wellkoc.com/p/${product.id}?ref=${userRefCode}&utm_source=${platform}`;
      setGeneratedShareLink(fallback);
      setServerNotice('Đang kết nối server...');
      return fallback;
    } finally {
      setIsGeneratingLink(false);
    }
  };

  const openAffPicker = async () => {
    setShowAffPicker(true);
    setPickerLoading(true);
    setPickerSearch('');
    try {
      const res = await fetch(`${API_BASE}/products?per_page=50&status=active`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error('API');
      const data = await res.json();
      const items = data.items || data || [];
      setPickerProducts(items.map((p: any) => ({
        id: p.id,
        name: p.name,
        price: p.price,
        image: p.thumbnail_url || p.image_url || p.images?.[0],
      })));
    } catch {
      // keep empty; user can still type a product ID manually
    } finally {
      setPickerLoading(false);
    }
  };

  const generateAffLink = async (productId: string, productName: string) => {
    setShowAffPicker(false);
    try {
      const res = await fetch(`${API_BASE}/share/generate-link`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ product_id: productId, platform: pickerPlatform, campaign_name: 'affiliate' }),
      });
      if (!res.ok) throw new Error('API');
      const data = await res.json();
      const link = data.url || data.affiliate_link || data.link || `https://wellkoc.com/p/${productId}?ref=${userRefCode}`;
      setAffLinks(prev => [...prev, { id: Date.now(), product: productName, link, clicks: 0, conversions: 0, revenue: '0₫' }]);
      showToast('✅ Đã tạo link affiliate!');
    } catch {
      const link = `https://wellkoc.com/p/${productId}?ref=${userRefCode}&utm_source=${pickerPlatform}`;
      setAffLinks(prev => [...prev, { id: Date.now(), product: productName, link, clicks: 0, conversions: 0, revenue: '0₫' }]);
      showToast('Link tạo offline — sẽ sync khi server sẵn sàng');
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  /* ── Order helpers ─── */
  const orderTabMap: Record<string, string[]> = {
    all: [],
    pending: ['pending'],
    shipping: ['confirmed', 'packing', 'shipping'],
    delivered: ['delivered'],
    cancelled: ['cancelled'],
    return: ['return'],
  };
  const filteredOrders = orderTab === 'all' ? orders : orders.filter(o => orderTabMap[orderTab]?.includes(o.status));
  const activeTrackingOrders = orders.filter(o => ['pending', 'confirmed', 'packing', 'shipping'].includes(o.status));
  const pendingOrderCount = orders.filter(o => ['pending', 'confirmed', 'packing', 'shipping'].includes(o.status)).length;
  const filteredHistory = orders.filter(o => {
    if (!historySearch) return true;
    const q = historySearch.toLowerCase();
    return o.id.toLowerCase().includes(q) || o.items.some(it => it.name.toLowerCase().includes(q));
  });

  /* ── Tab renderer ──────────────────────────────── */
  const renderContent = () => {
    switch (activeNav) {

      /* ═══════════════════════════════════════════════ */
      /*  BUYER FEATURES                                 */
      /* ═══════════════════════════════════════════════ */

      /* ══════ 1. ĐƠN HÀNG CỦA TÔI ══════ */
      case 'orders':
        return (
          <>
            <h2 style={{ fontWeight: 700, fontSize: '1.1rem', marginBottom: 16 }}>{t('koc.orders.title')}</h2>
            <div className="flex gap-8" style={{ marginBottom: 20, flexWrap: 'wrap' }}>
              {[
                { key: 'all', label: 'Tất cả' },
                { key: 'pending', label: 'Chờ xác nhận' },
                { key: 'shipping', label: 'Đang giao' },
                { key: 'delivered', label: 'Đã giao' },
                { key: 'cancelled', label: 'Đã hủy' },
                { key: 'return', label: 'Đổi/Trả' },
              ].map(t => (
                <button key={t.key} className={`btn btn-sm ${orderTab === t.key ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setOrderTab(t.key)}>
                  {t.label}
                  {t.key !== 'all' && <span style={{ marginLeft: 4, opacity: .7 }}>({orders.filter(o => orderTabMap[t.key]?.includes(o.status)).length})</span>}
                </button>
              ))}
            </div>
            {filteredOrders.length === 0 ? (
              <div className="card" style={{ padding: 40, textAlign: 'center', color: 'var(--text-3)' }}>Không có đơn hàng nào</div>
            ) : (
              <div className="flex-col gap-12">
                {filteredOrders.map(order => {
                  const sc = orderStatusConfig[order.status];
                  return (
                    <div key={order.id} className="card" style={{ padding: 0, overflow: 'hidden' }}>
                      <div className="flex" style={{ justifyContent: 'space-between', alignItems: 'center', padding: '12px 20px', borderBottom: '1px solid var(--border)', background: 'var(--bg-1)' }}>
                        <div className="flex gap-12" style={{ alignItems: 'center' }}>
                          <span style={{ fontSize: '.78rem', fontWeight: 600 }} className="mono">{order.id}</span>
                          <span style={{ fontSize: '.68rem', color: 'var(--text-4)' }}>{order.date}</span>
                        </div>
                        <span className={`badge ${sc.badge}`}>{t(sc.labelKey)}</span>
                      </div>
                      <div style={{ padding: '14px 20px' }}>
                        {order.items.map((item, idx) => (
                          <div key={idx} className="flex" style={{ justifyContent: 'space-between', marginBottom: idx < order.items.length - 1 ? 8 : 0 }}>
                            <div>
                              <span style={{ fontSize: '.82rem', fontWeight: 600 }}>{item.name}</span>
                              <span style={{ fontSize: '.72rem', color: 'var(--text-3)', marginLeft: 8 }}>x{item.qty}</span>
                            </div>
                            <span style={{ fontSize: '.82rem', fontWeight: 600 }}>{formatVND(item.price)}</span>
                          </div>
                        ))}
                      </div>
                      <div className="flex" style={{ justifyContent: 'space-between', alignItems: 'center', padding: '12px 20px', borderTop: '1px solid var(--border)', background: 'var(--bg-1)' }}>
                        <div className="flex gap-8">
                          {order.status === 'pending' && (
                            <button className="btn btn-secondary btn-sm" style={{ color: '#ef4444' }} onClick={() => { setOrders(prev => prev.map(o => o.id === order.id ? { ...o, status: 'cancelled' as const } : o)); showToast(`Đã hủy đơn ${order.id}`); }}>Hủy</button>
                          )}
                          {order.status === 'shipping' && (
                            <button className="btn btn-primary btn-sm" onClick={() => { setOrders(prev => prev.map(o => o.id === order.id ? { ...o, status: 'delivered' as const, reviewed: false } : o)); showToast(`Đã xác nhận nhận hàng ${order.id}`); }}>Xác nhận nhận hàng</button>
                          )}
                          {order.status === 'delivered' && !order.reviewed && (
                            <button className="btn btn-primary btn-sm" onClick={() => { setOrders(prev => prev.map(o => o.id === order.id ? { ...o, reviewed: true } : o)); showToast(`Đã đánh giá đơn ${order.id} — cảm ơn bạn!`); }}>Đánh giá</button>
                          )}
                          <button className="btn btn-secondary btn-sm" onClick={() => showToast(`Đã thêm sản phẩm từ đơn ${order.id} vào giỏ hàng`)}>Mua lại</button>
                          {order.trackingCode && (
                            <button className="btn btn-secondary btn-sm" onClick={() => setActiveNav('tracking')}>Theo dõi</button>
                          )}
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <span style={{ fontSize: '.68rem', color: 'var(--text-3)' }}>Tổng: </span>
                          <span style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--c4-500)' }}>{formatVND(order.total)}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        );

      /* ══════ 2. THEO DÕI ĐƠN HÀNG ══════ */
      case 'tracking':
        return (
          <>
            <h2 style={{ fontWeight: 700, fontSize: '1.1rem', marginBottom: 20 }}>{t('koc.tracking.title')}</h2>
            {activeTrackingOrders.length === 0 ? (
              <div className="card" style={{ padding: 40, textAlign: 'center', color: 'var(--text-3)' }}>Không có đơn hàng đang vận chuyển</div>
            ) : (
              <div className="flex-col gap-16">
                {activeTrackingOrders.map(order => {
                  const step = getTrackingStep(order.status);
                  return (
                    <div key={order.id} className="card" style={{ padding: 24 }}>
                      <div className="flex" style={{ justifyContent: 'space-between', marginBottom: 20 }}>
                        <div>
                          <div className="mono" style={{ fontWeight: 700, fontSize: '.88rem' }}>{order.id}</div>
                          <div style={{ fontSize: '.72rem', color: 'var(--text-3)' }}>{order.items[0].name}{order.items.length > 1 ? ` (+${order.items.length - 1})` : ''}</div>
                        </div>
                        {order.trackingCode && (
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: '.65rem', color: 'var(--text-3)' }}>Mã vận đơn</div>
                            <div className="mono" style={{ fontSize: '.78rem', fontWeight: 600, color: 'var(--c5-400)' }}>{order.trackingCode}</div>
                          </div>
                        )}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', position: 'relative' }}>
                        <div style={{ position: 'absolute', top: 14, left: 20, right: 20, height: 3, background: 'var(--border)', zIndex: 0 }}>
                          <div style={{ width: `${(step / (trackingStepKeys.length - 1)) * 100}%`, height: '100%', background: 'var(--c4-500)', transition: 'width .4s ease' }} />
                        </div>
                        {trackingStepKeys.map((s, i) => {
                          const isActive = i <= step;
                          const isCurrent = i === step;
                          return (
                            <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, position: 'relative', zIndex: 1 }}>
                              <div style={{
                                width: isCurrent ? 30 : 24, height: isCurrent ? 30 : 24,
                                borderRadius: '50%',
                                background: isActive ? 'var(--c4-500)' : 'var(--bg-2)',
                                border: isCurrent ? '3px solid var(--c4-300)' : isActive ? '2px solid var(--c4-500)' : '2px solid var(--border)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: '.6rem', color: isActive ? '#fff' : 'var(--text-4)', fontWeight: 700,
                                transition: 'all .3s ease',
                              }}>
                                {isActive ? '✓' : i + 1}
                              </div>
                              <div style={{ fontSize: '.65rem', fontWeight: isCurrent ? 700 : 400, color: isActive ? 'var(--text-1)' : 'var(--text-4)', marginTop: 8, textAlign: 'center' }}>{t(s)}</div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        );

      /* ══════ 3. LỊCH SỬ MUA HÀNG ══════ */
      case 'history':
        return (
          <>
            <h2 style={{ fontWeight: 700, fontSize: '1.1rem', marginBottom: 16 }}>{t('koc.history.title')}</h2>
            <div className="flex gap-8" style={{ marginBottom: 20 }}>
              <input type="text" placeholder="Tìm kiếm sản phẩm hoặc mã đơn..." value={historySearch} onChange={e => setHistorySearch(e.target.value)} style={{ flex: 1, padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-1)', color: 'var(--text-1)', fontSize: '.82rem' }} />
            </div>
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ overflowX: 'auto' }}>
                <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '.78rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border)' }}>
                      <TH>Ngày</TH><TH>Mã đơn</TH><TH>Sản phẩm</TH><TH>Tổng</TH><TH>Trạng thái</TH><TH>Hành động</TH>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredHistory.map(o => {
                      const sc = orderStatusConfig[o.status];
                      return (
                        <tr key={o.id} style={{ borderBottom: '1px solid var(--border)' }}>
                          <TD style={{ color: 'var(--text-3)' }}>{o.date}</TD>
                          <TD mono>{o.id}</TD>
                          <TD>{o.items.map(it => it.name).join(', ')}</TD>
                          <TD bold>{formatVND(o.total)}</TD>
                          <TD><span className={`badge ${sc.badge}`}>{t(sc.labelKey)}</span></TD>
                          <TD><button className="btn btn-primary btn-sm" onClick={() => showToast(`Đã thêm sản phẩm từ đơn ${o.id} vào giỏ hàng`)}>Mua lại</button></TD>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        );

      /* ══════ 4. VÍ WK PAY ══════ */
      case 'wkpay':
        return (
          <>
            <h2 style={{ fontWeight: 700, fontSize: '1.1rem', marginBottom: 20 }}>{t('koc.wkpay.title')}</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
              <div className="onchain-card" style={{ padding: 20 }}>
                <div style={{ fontSize: '.72rem', color: 'var(--text-3)', marginBottom: 4 }}>Số dư VND</div>
                <div style={{ fontWeight: 800, fontSize: '1.5rem', color: 'var(--c4-500)' }}>{formatVND(wkPayData.balanceVND)}</div>
              </div>
              <div className="onchain-card" style={{ padding: 20 }}>
                <div style={{ fontSize: '.72rem', color: 'var(--text-3)', marginBottom: 4 }}>WK Token</div>
                <div style={{ fontWeight: 800, fontSize: '1.5rem', color: 'var(--c6-500)' }}>{wkPayData.balanceWK.toLocaleString()} WK</div>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 12, marginBottom: 24 }}>
              {[
                { label: 'Nạp tiền', desc: 'Từ ngân hàng/MoMo', icon: '💰' },
                { label: 'Rút tiền', desc: 'Về ngân hàng', icon: '🏦' },
                { label: 'Chuyển WK Token', desc: 'Tới ví khác', icon: '📤' },
              ].map((a, i) => (
                <div key={i} className="card card-hover" style={{ padding: 16, textAlign: 'center', cursor: 'pointer' }} onClick={() => showToast(`${a.label} — đang kết nối blockchain. Vui lòng thử lại sau.`)}>
                  <div style={{ fontSize: '1.5rem', marginBottom: 6 }}>{a.icon}</div>
                  <div style={{ fontWeight: 600, fontSize: '.82rem', marginBottom: 2 }}>{a.label}</div>
                  <div style={{ fontSize: '.65rem', color: 'var(--text-3)' }}>{a.desc}</div>
                </div>
              ))}
            </div>
            <div className="card" style={{ padding: 20, marginBottom: 24 }}>
              <div style={{ fontWeight: 600, fontSize: '.88rem', marginBottom: 12 }}>Thông tin WK Token</div>
              <div className="flex gap-16" style={{ flexWrap: 'wrap' }}>
                <div>
                  <div style={{ fontSize: '.68rem', color: 'var(--text-3)' }}>Giá hiện tại</div>
                  <div style={{ fontWeight: 700 }}>${wkPayData.wkPrice.toFixed(2)}</div>
                </div>
                <div>
                  <div style={{ fontSize: '.68rem', color: 'var(--text-3)' }}>24h thay đổi</div>
                  <div style={{ fontWeight: 700, color: wkPayData.wkChange24h > 0 ? 'var(--c4-500)' : 'var(--text-1)' }}>
                    {wkPayData.wkChange24h > 0 ? '+' : ''}{wkPayData.wkChange24h}%
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '.68rem', color: 'var(--text-3)' }}>Giá trị nắm giữ</div>
                  <div style={{ fontWeight: 700 }}>${(wkPayData.balanceWK * wkPayData.wkPrice).toFixed(2)}</div>
                </div>
              </div>
            </div>
            <div style={{ fontWeight: 600, fontSize: '.88rem', marginBottom: 12 }}>Lịch sử giao dịch</div>
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ overflowX: 'auto' }}>
                <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '.78rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border)' }}>
                      <TH>Mã GD</TH><TH>Loại</TH><TH>Chi tiết</TH><TH>Số tiền</TH><TH>Ngày</TH><TH>Trạng thái</TH>
                    </tr>
                  </thead>
                  <tbody>
                    {wkPayData.transactions.map(tx => (
                      <tr key={tx.id} style={{ borderBottom: '1px solid var(--border)' }}>
                        <TD mono>{tx.id}</TD>
                        <TD>{tx.type}</TD>
                        <TD style={{ color: 'var(--text-3)', fontSize: '.72rem' }}>{tx.source}</TD>
                        <TD bold style={{ color: tx.amount > 0 ? 'var(--c4-500)' : 'var(--text-1)' }}>
                          {tx.amount > 0 ? '+' : ''}{typeof tx.amount === 'number' && Math.abs(tx.amount) > 1000 ? formatVND(Math.abs(tx.amount)) : `${tx.amount} WK`}
                        </TD>
                        <TD style={{ color: 'var(--text-3)' }}>{tx.date}</TD>
                        <TD><span className="badge badge-c4">Thành công</span></TD>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        );

      /* ══════ 5. THANH TOÁN ══════ */
      case 'payments':
        return (
          <>
            <h2 style={{ fontWeight: 700, fontSize: '1.1rem', marginBottom: 20 }}>{t('koc.payments.title')}</h2>
            <div style={{ fontWeight: 600, fontSize: '.88rem', marginBottom: 12 }}>Phương thức thanh toán đã lưu</div>
            <div className="flex-col gap-8" style={{ marginBottom: 24 }}>
              {savedPaymentMethods.map(m => (
                <div key={m.id} className="card" style={{ padding: '14px 20px' }}>
                  <div className="flex" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
                    <div className="flex gap-12" style={{ alignItems: 'center' }}>
                      <span style={{ fontSize: '1.2rem' }}>{m.type === 'VNPay' ? '🏦' : m.type === 'MoMo' ? '📱' : '💳'}</span>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '.82rem' }}>{m.label}</div>
                        {m.isDefault && <span className="badge badge-c4" style={{ fontSize: '.55rem' }}>Mặc định</span>}
                      </div>
                    </div>
                    <button className="btn btn-secondary btn-sm" style={{ fontSize: '.7rem' }} onClick={() => showToast(`Đã xoá ${m.label}`)}>Xóa</button>
                  </div>
                </div>
              ))}
              <button className="btn btn-secondary btn-sm" style={{ alignSelf: 'flex-start' }} onClick={() => showToast('Đã thêm phương thức thanh toán mới')}>+ Thêm phương thức</button>
            </div>

            <div style={{ fontWeight: 600, fontSize: '.88rem', marginBottom: 12 }}>Ví Crypto</div>
            <div className="kpi-grid" style={{ marginBottom: 24 }}>
              {cryptoBalances.map((b, i) => (
                <div key={i} className="kpi-card">
                  <div className="flex gap-8" style={{ marginBottom: 8 }}>
                    <div style={{ width: 28, height: 28, borderRadius: '50%', background: b.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '.65rem', fontWeight: 800, color: '#fff' }}>{b.icon}</div>
                    <div className="kpi-label">{b.token}</div>
                  </div>
                  <div className="kpi-val" style={{ color: b.color }}>{b.amount}</div>
                  <div className="kpi-delta delta-up">{b.usd}</div>
                </div>
              ))}
            </div>
          </>
        );

      /* ══════ 6. KHO VOUCHER ══════ */
      case 'vouchers':
        return (
          <>
            <div className="card" style={{ padding: 20, marginBottom: 20, background: 'linear-gradient(135deg, rgba(168,85,247,.08), rgba(99,102,241,.08))' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '.75rem', color: 'var(--text-3)', marginBottom: 4 }}>XP hiện tại</div>
                  <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--c7-500)' }}>{xp.toLocaleString()} XP</div>
                </div>
                <Link to="#" onClick={(e) => { e.preventDefault(); setActiveNav('convert'); }} style={{ padding: '8px 16px', borderRadius: 8, background: 'var(--c7-500)', color: '#fff', textDecoration: 'none', fontSize: '.82rem', fontWeight: 600 }}>Đổi XP →</Link>
              </div>
            </div>

            <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 12, color: 'var(--text-1)' }}>Đổi XP lấy Voucher</h3>
            <div className="grid-3" style={{ marginBottom: 24 }}>
              {voucherRedeemOptions.map((v, i) => (
                <div key={i} className="card" style={{ padding: 16, textAlign: 'center' }}>
                  <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--c6-500)', marginBottom: 4 }}>{v.xp} XP</div>
                  <div style={{ fontSize: '.82rem', fontWeight: 600, color: 'var(--text-1)', marginBottom: 4 }}>{v.desc}</div>
                  <div style={{ fontSize: '.7rem', color: 'var(--text-4)', marginBottom: 10 }}>Đơn tối thiểu: {v.minOrder}</div>
                  <button className="btn btn-primary" style={{ width: '100%', padding: '6px 12px', fontSize: '.78rem' }} disabled={xp < v.xp} onClick={() => {
                    if (xp < v.xp) return;
                    setXp(prev => prev - v.xp);
                    const code = `XP${v.xp}-${Date.now().toString().slice(-4)}`;
                    setVouchers(prev => [...prev, { code, desc: v.desc, expires: '30/04/2026', used: false }]);
                    showToast(`Đã đổi ${v.xp} XP lấy voucher "${v.desc}" — Mã: ${code}`);
                  }}>{xp < v.xp ? 'Không đủ XP' : 'Đổi ngay'}</button>
                </div>
              ))}
            </div>

            <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 12, color: 'var(--text-1)' }}>Voucher đang có</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {vouchers.filter(v => !v.used).length === 0 && (
                <div className="card" style={{ padding: 20, textAlign: 'center', color: 'var(--text-3)' }}>Không có voucher nào — đổi XP để nhận!</div>
              )}
              {vouchers.filter(v => !v.used).map((v, i) => (
                <div key={i} className="card" style={{ padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderLeft: '3px solid var(--c5-500)' }}>
                  <div>
                    <div style={{ fontFamily: 'var(--ff-mono)', fontSize: '.85rem', fontWeight: 700, color: 'var(--c5-500)', marginBottom: 2 }}>{v.code}</div>
                    <div style={{ fontSize: '.8rem', color: 'var(--text-2)' }}>{v.desc}</div>
                    <div style={{ fontSize: '.7rem', color: 'var(--text-4)', marginTop: 2 }}>HSD: {v.expires}</div>
                  </div>
                  <button className="btn btn-secondary" style={{ fontSize: '.75rem', padding: '6px 12px' }} onClick={() => { setVouchers(prev => prev.map(vc => vc.code === v.code ? { ...vc, used: true } : vc)); showToast(`Đã sử dụng voucher ${v.code} — áp dụng cho đơn hàng tiếp theo`); }}>Dùng ngay</button>
                </div>
              ))}
            </div>
          </>
        );

      /* ══════ 7. YÊU THÍCH ══════ */
      case 'favorites':
        return (
          <>
            <h2 style={{ fontWeight: 700, fontSize: '1.1rem', marginBottom: 20 }}>{t('koc.favorites.title')}</h2>
            {favs.length === 0 && <div className="card" style={{ padding: 40, textAlign: 'center', color: 'var(--text-3)' }}>Chưa có sản phẩm yêu thích nào</div>}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 16 }}>
              {favs.map(p => (
                <div key={p.id} className="card card-hover" style={{ padding: 0, overflow: 'hidden', position: 'relative' }}>
                  <div style={{ position: 'absolute', top: 10, right: 10, fontSize: '1.2rem', cursor: 'pointer', color: '#ef4444', zIndex: 1 }} onClick={() => { setFavs(prev => prev.filter(f => f.id !== p.id)); showToast(`Đã bỏ yêu thích "${p.name}"`); }}>❤️</div>
                  <div style={{ background: 'var(--bg-1)', padding: 24, textAlign: 'center', fontSize: '2.5rem' }}>{p.emoji}</div>
                  <div style={{ padding: 16 }}>
                    <div style={{ fontWeight: 600, fontSize: '.82rem', marginBottom: 4, minHeight: '2.2em' }}>{p.name}</div>
                    <div style={{ fontSize: '.68rem', color: 'var(--text-3)', marginBottom: 6 }}>{p.vendor}</div>
                    <div className="flex" style={{ justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <Stars count={Math.round(p.rating)} size=".72rem" />
                      <span style={{ fontSize: '.65rem', color: 'var(--text-3)' }}>{p.reviews} đánh giá</span>
                    </div>
                    <div className="flex" style={{ justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                      <span style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--c4-500)' }}>{formatVND(p.price)}</span>
                      {p.alert && <span className="badge badge-c5" style={{ fontSize: '.55rem' }}>Giá giảm!</span>}
                    </div>
                    <div className="flex gap-8">
                      <button className="btn btn-primary btn-sm" style={{ flex: 1 }} onClick={() => showToast(`Đã thêm "${p.name}" vào giỏ hàng`)}>Thêm vào giỏ</button>
                      <button className="btn btn-secondary btn-sm" style={{ fontSize: '.65rem' }} onClick={() => { setFavs(prev => prev.filter(f => f.id !== p.id)); showToast(`Đã xóa "${p.name}" khỏi yêu thích`); }}>Xóa</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        );

      /* ═══════════════════════════════════════════════ */
      /*  KOC PRO FEATURES                              */
      /* ═══════════════════════════════════════════════ */

      /* ══════ 8. TỔNG QUAN KOC ══════ */
      case 'overview':
        return (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: 12, marginBottom: 24 }}>
              {kpiData.map((kpi, i) => (
                <div key={i} className="kpi-card">
                  <div className="kpi-label" style={{ whiteSpace: 'nowrap' }}>{kpi.label}</div>
                  <div className="kpi-val" style={{ color: kpi.color, whiteSpace: 'nowrap' }}>{kpi.label === 'XP Points' ? xp.toLocaleString() : kpi.value}</div>
                  <div className={`kpi-delta ${kpi.up ? 'delta-up' : 'delta-down'}`} style={{ whiteSpace: 'nowrap' }}>
                    {kpi.up ? '↑' : '↓'} {kpi.delta}
                  </div>
                </div>
              ))}
            </div>
            <div className="chart-bar-wrap" style={{ marginBottom: 24 }}>
              <div className="flex" style={{ justifyContent: 'space-between', marginBottom: 8 }}>
                <span className="label">{t('koc.overview.last12Months')}</span>
                <span className="badge badge-c4">+23.5% YoY</span>
              </div>
              <div className="chart-bars">
                {monthlyBars.map((v, i) => (
                  <div key={i} className="chart-bar" style={{ height: `${v}%` }} />
                ))}
              </div>
              <div className="flex" style={{ justifyContent: 'space-between', marginTop: 6 }}>
                {monthLabels.map(m => (
                  <span key={m} style={{ flex: 1, textAlign: 'center', fontSize: '.58rem', color: 'var(--text-4)' }}>{m}</span>
                ))}
              </div>
            </div>
            <div className="card" style={{ padding: 20 }}>
              <div className="label" style={{ marginBottom: 14 }}>{t('koc.overview.recentActivity')}</div>
              <div className="flex-col gap-10">
                {recentActivities.map((a, i) => (
                  <div key={i} className="flex gap-12" style={{ padding: '8px 0', borderBottom: i < recentActivities.length - 1 ? '1px solid var(--border)' : 'none', alignItems: 'center' }}>
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: a.color, flexShrink: 0 }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '.82rem' }}>{a.text}</div>
                      <div style={{ fontSize: '.65rem', color: 'var(--text-4)', marginTop: 2 }}>{a.time}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        );

      /* ══════ 9. NỘI DUNG ══════ */
      case 'content':
        return (
          <>
            <div className="flex" style={{ justifyContent: 'space-between', marginBottom: 20 }}>
              <h2 style={{ fontWeight: 700, fontSize: '1.1rem' }}>{t('koc.content.title')}</h2>
              <button className="btn btn-primary btn-sm" onClick={() => {
                const id = Date.now();
                setPosts(prev => [{ id, type: 'review', title: `Bài viết mới #${prev.length + 1}`, date: new Date().toISOString().slice(0, 10), views: 0, likes: 0, comments: 0, revenue: '0₫', emoji: '📝' }, ...prev]);
                showToast('Đã tạo nội dung mới — chỉnh sửa để hoàn thiện');
              }}>+ Tạo nội dung mới</button>
            </div>
            <div className="flex-col gap-12">
              {posts.map(post => (
                <div key={post.id} className="card card-hover" style={{ padding: '18px 24px' }}>
                  <div className="flex" style={{ justifyContent: 'space-between', gap: 16 }}>
                    <div className="flex gap-12" style={{ flex: 1 }}>
                      <span style={{ fontSize: '1.5rem' }}>{post.emoji}</span>
                      <div>
                        <div className="flex gap-8" style={{ marginBottom: 4 }}>
                          <span className="badge badge-c6" style={{ textTransform: 'uppercase' }}>{post.type}</span>
                          <span style={{ fontSize: '.65rem', color: 'var(--text-4)' }}>{post.date}</span>
                        </div>
                        <div style={{ fontWeight: 600, fontSize: '.88rem', marginBottom: 8 }}>{post.title}</div>
                        <div className="flex gap-16" style={{ fontSize: '.72rem', color: 'var(--text-3)' }}>
                          <span>👁 {post.views.toLocaleString()}</span>
                          <span>❤️ {post.likes}</span>
                          <span>💬 {post.comments}</span>
                        </div>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontFamily: 'var(--ff-display)', fontWeight: 800, color: 'var(--c4-500)' }}>{post.revenue}</div>
                      <div style={{ fontSize: '.65rem', color: 'var(--text-4)' }}>Doanh thu</div>
                      <div className="flex gap-4" style={{ marginTop: 8, justifyContent: 'flex-end' }}>
                        <button className="btn btn-secondary btn-sm" style={{ fontSize: '.65rem', padding: '3px 8px' }} onClick={() => { setPosts(prev => prev.map(p => p.id === post.id ? { ...p, title: p.title + ' (đã sửa)' } : p)); showToast(`Đã cập nhật "${post.title}"`); }}>Sửa</button>
                        <button className="btn btn-secondary btn-sm" style={{ fontSize: '.65rem', padding: '3px 8px', color: '#ef4444' }} onClick={() => { setPosts(prev => prev.filter(p => p.id !== post.id)); showToast(`Đã xóa "${post.title}"`); }}>Xóa</button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        );

      /* ══════ 10. CHIẾN DỊCH ══════ */
      case 'campaigns':
        return (
          <>
            <h2 style={{ fontWeight: 700, fontSize: '1.1rem', marginBottom: 20 }}>{t('koc.campaigns.title')}</h2>
            <div className="flex-col gap-12">
              {camps.map(camp => {
                const sc = campaignStatusConfig[camp.status];
                return (
                  <div key={camp.id} className="card" style={{ padding: '20px 24px' }}>
                    <div className="flex" style={{ justifyContent: 'space-between', marginBottom: 10 }}>
                      <div>
                        <div className="flex gap-8" style={{ marginBottom: 4 }}>
                          <span className={`badge ${sc.badge}`}>{t(sc.labelKey)}</span>
                        </div>
                        <div style={{ fontWeight: 700, fontSize: '.92rem' }}>{camp.name}</div>
                        <div style={{ fontSize: '.72rem', color: 'var(--text-3)' }}>Brand: {camp.brand}</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontFamily: 'var(--ff-display)', fontWeight: 800, fontSize: '1.1rem', color: 'var(--c4-500)' }}>{camp.earned}</div>
                        <span className="badge badge-c6">Hoa hồng {camp.commission}</span>
                      </div>
                    </div>
                    <div style={{ fontSize: '.7rem', color: 'var(--text-4)' }}>{camp.startDate} → {camp.endDate}</div>
                    <div className="flex gap-8" style={{ marginTop: 12 }}>
                      {camp.status === 'upcoming' && (
                        <button className="btn btn-primary btn-sm" onClick={() => { setCamps(prev => prev.map(c => c.id === camp.id ? { ...c, status: 'active', earned: '0₫' } : c)); showToast(`Đã tham gia chiến dịch "${camp.name}"`); }}>Tham gia</button>
                      )}
                      <button className="btn btn-secondary btn-sm" onClick={() => showToast(`Chiến dịch "${camp.name}" — ${camp.startDate} → ${camp.endDate}, Commission: ${camp.commission}`)}>Xem chi tiết</button>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        );

      /* ══════ 11. HOA HỒNG & RÚT TIỀN ══════ */
      case 'commission':
        return (
          <>
            <h2 style={{ fontWeight: 700, fontSize: '1.1rem', marginBottom: 20 }}>{t('koc.commission.title')}</h2>
            <div className="grid-3" style={{ gap: 16, marginBottom: 24 }}>
              <div className="card" style={{ padding: 20, borderLeft: '3px solid var(--c4-500)' }}>
                <div style={{ fontSize: '.72rem', color: 'var(--text-3)', marginBottom: 4 }}>Số dư khả dụng</div>
                <div style={{ fontFamily: 'var(--ff-display)', fontWeight: 800, fontSize: '1.3rem', color: 'var(--c4-500)', whiteSpace: 'nowrap' }}>{formatVND(commBalance)}</div>
              </div>
              <div className="card" style={{ padding: 20, borderLeft: '3px solid var(--gold-400)' }}>
                <div style={{ fontSize: '.72rem', color: 'var(--text-3)', marginBottom: 4 }}>Đang chờ duyệt</div>
                <div style={{ fontFamily: 'var(--ff-display)', fontWeight: 800, fontSize: '1.3rem', color: 'var(--gold-400)', whiteSpace: 'nowrap' }}>3.200.000₫</div>
              </div>
              <div className="card" style={{ padding: 20, borderLeft: '3px solid var(--c5-500)' }}>
                <div style={{ fontSize: '.72rem', color: 'var(--text-3)', marginBottom: 4 }}>Tổng đã rút</div>
                <div style={{ fontFamily: 'var(--ff-display)', fontWeight: 800, fontSize: '1.3rem', color: 'var(--c5-500)', whiteSpace: 'nowrap' }}>45.200.000₫</div>
              </div>
            </div>

            <div className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: 24 }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
                <div className="flex" style={{ justifyContent: 'space-between' }}>
                  <span style={{ fontWeight: 700, fontSize: '.88rem', whiteSpace: 'nowrap' }}><span style={{ whiteSpace: 'nowrap' }}>Hoa Hồng</span> Gần Đây</span>
                  <span className="badge badge-c5">{commissionData.length} giao dịch</span>
                </div>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '.78rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border)' }}>
                      {['Mã GD', 'Sản phẩm', 'Người mua', 'Giá trị', 'Hoa hồng', '%', 'Trạng thái', 'TX Hash'].map(h => (
                        <TH key={h}>{h}</TH>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {commissionData.map(row => {
                      const sc = commStatusConfig[row.status];
                      return (
                        <tr key={row.id} style={{ borderBottom: '1px solid var(--border)' }}>
                          <TD mono>{row.id}</TD>
                          <TD bold>{row.product}</TD>
                          <TD color="var(--text-2)">{row.buyer}</TD>
                          <TD mono bold>{row.amount}</TD>
                          <TD mono bold color="var(--c4-500)">{row.commission}</TD>
                          <TD><span className="badge badge-c6">{row.rate}</span></TD>
                          <TD><span className={`status-pill badge ${sc.badge}`}>{t(sc.labelKey)}</span></TD>
                          <TD mono>
                            {row.txHash ? (
                              <div className="flex gap-4" style={{ alignItems: 'center' }}>
                                <a href={`https://polygonscan.com/tx/${row.txHash}`} target="_blank" rel="noreferrer" style={{ color: 'var(--c6-300)' }}>{shortenHash(row.txHash)}</a>
                                <button className="btn btn-secondary btn-sm" style={{ fontSize: '.5rem', padding: '1px 5px' }} onClick={() => { copyText(row.txHash); showToast('Đã sao chép TX Hash'); }}>Copy</button>
                              </div>
                            ) : '—'}
                          </TD>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="card" style={{ padding: 24, marginBottom: 24 }}>
              <div className="flex" style={{ justifyContent: 'space-between', marginBottom: 16 }}>
                <span style={{ fontWeight: 700, fontSize: '.92rem' }}>Rút Tiền</span>
                <button className="btn btn-primary btn-sm" onClick={() => setShowWithdrawForm(!showWithdrawForm)}>{showWithdrawForm ? 'Đóng' : 'Rút tiền'}</button>
              </div>
              {showWithdrawForm && (
                <div className="card" style={{ padding: 16, marginBottom: 16, background: 'var(--bg-1)', border: '1px solid var(--c4-500)' }}>
                  <div style={{ fontSize: '.82rem', fontWeight: 600, marginBottom: 10 }}>Nhập số tiền muốn rút</div>
                  <div className="flex gap-8" style={{ marginBottom: 8 }}>
                    <input type="number" placeholder="Số tiền (VND)" value={withdrawAmt} onChange={e => setWithdrawAmt(e.target.value)} style={{ flex: 1, padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-2)', color: 'var(--text-1)', fontSize: '.82rem' }} />
                    <button className="btn btn-primary btn-sm" onClick={() => {
                      const amt = Number(withdrawAmt);
                      if (!amt || amt <= 0) { showToast('Vui lòng nhập số tiền hợp lệ'); return; }
                      if (amt > commBalance) { showToast('Số dư không đủ'); return; }
                      setCommBalance(prev => prev - amt);
                      setShowWithdrawForm(false);
                      setWithdrawAmt('');
                      showToast(`Yêu cầu rút ${formatVND(amt)} đã được gửi`);
                    }}>Xác nhận</button>
                  </div>
                  <div style={{ fontSize: '.68rem', color: 'var(--text-4)' }}>Số dư khả dụng: {formatVND(commBalance)}</div>
                </div>
              )}
              <div className="grid-2" style={{ gap: 16 }}>
                <div className="card" style={{ padding: 20, background: 'var(--bg-2)' }}>
                  <div style={{ fontWeight: 600, fontSize: '.85rem', marginBottom: 12 }}>Rút về ngân hàng / ví điện tử</div>
                  <div className="flex-col gap-8">
                    {['VNPay', 'MoMo', 'Chuyển khoản ngân hàng'].map(m => (
                      <button key={m} className="btn btn-secondary btn-sm" style={{ width: '100%' }} onClick={() => { setShowWithdrawForm(true); showToast(`Đã chọn rút qua ${m} — nhập số tiền`); }}>{m}</button>
                    ))}
                  </div>
                </div>
                <div className="card" style={{ padding: 20, background: 'var(--bg-2)' }}>
                  <div style={{ fontWeight: 600, fontSize: '.85rem', marginBottom: 12 }}>Rút về ví crypto</div>
                  <div className="flex-col gap-8">
                    {['USDT (Polygon)', 'MATIC (Polygon)', 'ETH (Ethereum)'].map(m => (
                      <button key={m} className="btn btn-secondary btn-sm" style={{ width: '100%' }} onClick={() => { setShowWithdrawForm(true); showToast(`Đã chọn rút qua ${m} — nhập số tiền`); }}>{m}</button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: 20 }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
                <span style={{ fontWeight: 700, fontSize: '.88rem' }}>Lịch Sử Rút Tiền</span>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '.78rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border)' }}>
                      {['Mã', 'Phương thức', 'Số tiền', 'Phí', 'Trạng thái', 'Ngày', 'Ghi chú'].map(h => <TH key={h}>{h}</TH>)}
                    </tr>
                  </thead>
                  <tbody>
                    {withdrawalHistory.map(w => (
                      <tr key={w.id} style={{ borderBottom: '1px solid var(--border)' }}>
                        <TD mono>{w.id}</TD>
                        <TD bold>{w.method}</TD>
                        <TD mono bold color="var(--c4-500)">{w.amount}</TD>
                        <TD color="var(--text-3)">{w.fee}</TD>
                        <TD><span className={`badge ${w.status === 'completed' ? 'badge-c4' : 'badge-gold'}`}>{w.status === 'completed' ? 'Thành công' : 'Đang xử lý'}</span></TD>
                        <TD color="var(--text-3)">{w.date}</TD>
                        <TD mono style={{ fontSize: '.72rem' }}>{w.note}</TD>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="onchain-card">
              <div className="verified-seal" style={{ whiteSpace: 'nowrap' }}>On-chain Verified</div>
              <div style={{ fontSize: '.82rem', fontWeight: 600, marginBottom: 8 }}>Tất cả hoa hồng được ghi nhận trên blockchain</div>
              <div style={{ fontSize: '.72rem', color: 'var(--text-3)', lineHeight: 1.6 }}>
                Smart contract tự động tính toán và phân phối <span style={{ whiteSpace: 'nowrap' }}>hoa hồng</span> <span style={{ whiteSpace: 'nowrap' }}>minh bạch</span>. Mọi giao dịch đều có thể xác minh trên Polygon.
              </div>
              <div className="flex gap-8" style={{ marginTop: 12 }}>
                <span className="badge badge-c4">Polygon</span>
                <span className="badge badge-c5">Auto-payout</span>
                <span className="badge badge-c6">IPFS</span>
              </div>
            </div>
          </>
        );

      /* ══════ 12. MARKETING TỰ ĐỘNG ══════ */
      case 'automkt':
        return (
          <>
            <h2 style={{ fontWeight: 700, fontSize: '1.1rem', marginBottom: 20 }}>{t('koc.automkt.title')}</h2>
            <div className="card" style={{ padding: 20, marginBottom: 20, borderLeft: '3px solid var(--c6-500)' }}>
              <div className="flex" style={{ justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: '.72rem', color: 'var(--text-3)' }}>Tổng chi phí agents tháng này</div>
                  <div style={{ fontFamily: 'var(--ff-display)', fontWeight: 800, fontSize: '1.3rem', color: 'var(--c6-500)' }}>1.050.000₫</div>
                </div>
                <button className="btn btn-primary btn-sm" onClick={() => showToast('Đang thiết lập Agent mới — chọn loại Agent bên dưới')}>+ Tạo Agent mới</button>
              </div>
            </div>
            <div className="card" style={{ padding: 20, marginBottom: 20, background: 'var(--bg-2)' }}>
              <div style={{ fontWeight: 700, fontSize: '.88rem', marginBottom: 10 }}>Thiết lập Agent mới</div>
              <div className="grid-3" style={{ gap: 12 }}>
                <div>
                  <div className="label" style={{ marginBottom: 6 }}>Loại Agent</div>
                  <div className="flex-col gap-4">
                    {agentTypes.map(t => (
                      <div key={t} className="badge badge-c6" style={{ display: 'inline-block', marginRight: 4, marginBottom: 4 }}>{t}</div>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="label" style={{ marginBottom: 6 }}>Ngân sách</div>
                  <div style={{ fontSize: '.82rem', color: 'var(--text-2)' }}>100.000₫ — 5.000.000₫/tháng</div>
                </div>
                <div>
                  <div className="label" style={{ marginBottom: 6 }}>Lịch chạy</div>
                  <div style={{ fontSize: '.82rem', color: 'var(--text-2)' }}>Hàng ngày, Hàng tuần, <span style={{ whiteSpace: 'nowrap' }}>24/7</span>, Tùy chỉnh</div>
                </div>
              </div>
            </div>
            <div className="flex-col gap-12">
              {mktAgents.map(agent => {
                const sc = agentStatusConfig[agent.status];
                return (
                  <div key={agent.id} className="card" style={{ padding: '20px 24px' }}>
                    <div className="flex" style={{ justifyContent: 'space-between', marginBottom: 12 }}>
                      <div>
                        <div className="flex gap-8" style={{ marginBottom: 4 }}>
                          <span className={`badge ${sc.badge}`}>{t(sc.labelKey)}</span>
                          <span className="badge badge-c6">{agent.type}</span>
                        </div>
                        <div style={{ fontWeight: 700, fontSize: '.92rem' }}>{agent.name}</div>
                        <div style={{ fontSize: '.7rem', color: 'var(--text-4)' }}>Lịch: {agent.schedule} — Ngân sách: {agent.budget}</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontFamily: 'var(--ff-display)', fontWeight: 800, color: agent.roi !== 'N/A' ? 'var(--c4-500)' : 'var(--text-3)' }}>ROI: {agent.roi}</div>
                        <div style={{ fontSize: '.7rem', color: 'var(--text-4)' }}>Chi: {agent.spent}</div>
                      </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 12 }}>
                      {[
                        { label: 'Impressions', value: agent.impressions.toLocaleString() },
                        { label: 'Clicks', value: agent.clicks.toLocaleString() },
                        { label: 'Conversions', value: agent.conversions.toLocaleString() },
                        { label: 'Chi phí', value: agent.cost },
                      ].map((m, i) => (
                        <div key={i} style={{ textAlign: 'center', padding: '8px', background: 'var(--bg-2)', borderRadius: 8 }}>
                          <div style={{ fontSize: '.6rem', color: 'var(--text-4)', textTransform: 'uppercase', marginBottom: 2 }}>{m.label}</div>
                          <div style={{ fontFamily: 'var(--ff-display)', fontWeight: 700, fontSize: '.82rem' }}>{m.value}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        );

      /* ══════ 13. AFFILIATE & CRM ══════ */
      case 'affiliate':
        return (
          <>
            <h2 style={{ fontWeight: 700, fontSize: '1.1rem', marginBottom: 20 }}>{t('koc.affiliate.title')}</h2>

            {/* ── Referral Link Section ── */}
            <div className="card" style={{ padding: 20, marginBottom: 20, background: 'linear-gradient(135deg,rgba(34,197,94,.07),rgba(99,102,241,.07))', border: '1px solid rgba(34,197,94,.2)' }}>
              <div style={{ fontWeight: 700, fontSize: '.88rem', marginBottom: 14, color: 'var(--text-1)', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: '1.1rem' }}>🔗</span> Link Giới Thiệu Cộng Đồng
              </div>
              <div style={{ fontSize: '.75rem', color: 'var(--text-3)', marginBottom: 14 }}>
                Chia sẻ link này để mời thành viên mới tham gia mạng lưới của bạn. Mỗi F1 bạn giới thiệu sẽ trở thành đầu <strong>1 team</strong> trong cộng đồng.
              </div>
              {/* Link display */}
              <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                <div style={{ flex: 1, padding: '9px 14px', background: 'var(--bg-2)', borderRadius: 8, border: '1px solid var(--border)', fontFamily: 'var(--ff-mono)', fontSize: '.78rem', color: 'var(--c6-300)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {`https://wellkoc.com/join?ref=${userRefCode}`}
                </div>
                <button className="btn btn-primary btn-sm" onClick={() => { copyText(`https://wellkoc.com/join?ref=${userRefCode}`); showToast('Đã copy link giới thiệu!'); }}>📋 Copy</button>
              </div>
              {/* Mã giới thiệu */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                <span style={{ fontSize: '.72rem', color: 'var(--text-3)' }}>Mã của bạn:</span>
                <span style={{ fontFamily: 'var(--ff-mono)', fontWeight: 700, fontSize: '.88rem', color: '#22c55e', padding: '2px 10px', background: 'rgba(34,197,94,.1)', borderRadius: 6, border: '1px solid rgba(34,197,94,.3)' }}>{userRefCode}</span>
                <button className="btn btn-secondary btn-sm" onClick={() => { copyText(userRefCode); showToast('Đã copy mã!'); }}>Copy</button>
              </div>
              {/* Share buttons */}
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {[
                  { label: '💬 Zalo', color: '#0068ff', bg: 'rgba(0,104,255,.1)' },
                  { label: '👤 Facebook', color: '#1877f2', bg: 'rgba(24,119,242,.1)' },
                  { label: '🎵 TikTok', color: '#e91e63', bg: 'rgba(233,30,99,.1)' },
                  { label: '📸 Instagram', color: '#e4405f', bg: 'rgba(228,64,95,.1)' },
                  { label: '✈️ Telegram', color: '#0088cc', bg: 'rgba(0,136,204,.1)' },
                ].map(btn => (
                  <button key={btn.label} className="btn btn-secondary btn-sm" onClick={() => showToast(`Chia sẻ qua ${btn.label}`)}
                    style={{ color: btn.color, background: btn.bg, border: `1px solid ${btn.color}44`, fontWeight: 600, fontSize: '.72rem' }}>
                    {btn.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Tier legend */}
            <div className="card" style={{ padding: '14px 20px', marginBottom: 20 }}>
              <div style={{ fontWeight: 700, fontSize: '.78rem', marginBottom: 12, color: 'var(--text-2)' }}>📊 8 CẤP BẬC CỘNG ĐỒNG — MÀU LUÂN XA</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {RANK_TIERS.map((r, i) => (
                  <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 20, background: r.bg, border: `1px solid ${r.gradient ? 'transparent' : r.color}44`, backgroundImage: r.gradient ? undefined : undefined }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: r.gradient ?? r.color, display: 'inline-block', flexShrink: 0, boxShadow: `0 0 6px ${r.glow}` }} />
                    <span style={{ fontSize: '.68rem', fontWeight: 600, color: r.gradient ? undefined : r.color, background: r.gradient, WebkitBackgroundClip: r.gradient ? 'text' : undefined, WebkitTextFillColor: r.gradient ? 'transparent' : undefined }}>
                      C{i + 1} · {r.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {serverNotice && (
              <div style={{ padding: '8px 14px', borderRadius: 8, marginBottom: 16, background: 'rgba(251,191,36,.1)', border: '1px solid rgba(251,191,36,.25)', color: '#b45309', fontSize: '.75rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ animation: 'pulse 1.5s infinite' }}>●</span> {serverNotice}
              </div>
            )}

            <div className="grid-3" style={{ gap: 16, marginBottom: 24 }}>
              {[
                { label: 'Đối tác F1 (trực tiếp)', value: partnerStats.f1, color: 'var(--c4-500)' },
                { label: 'Đối tác F2', value: partnerStats.f2, color: 'var(--c5-500)' },
                { label: 'Tổng mạng lưới', value: partnerStats.totalNetwork, color: 'var(--c6-500)' },
              ].map((s, i) => (
                <div key={i} className="kpi-card">
                  <div className="kpi-label">{s.label}</div>
                  <div className="kpi-val" style={{ color: s.color }}>{s.value.toLocaleString()}</div>
                </div>
              ))}
            </div>

            <div className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: 24 }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
                <div className="flex" style={{ justifyContent: 'space-between' }}>
                  <span style={{ fontWeight: 700, fontSize: '.88rem' }}>Link Affiliate</span>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <select value={pickerPlatform} onChange={e => setPickerPlatform(e.target.value)}
                      style={{ padding: '4px 8px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg-2)', color: 'var(--text-2)', fontSize: '.75rem', cursor: 'pointer' }}>
                      {['direct','tiktok','instagram','facebook','youtube','zalo','telegram'].map(p => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                    <button className="btn btn-primary btn-sm" onClick={openAffPicker}>+ Chọn sản phẩm</button>
                  </div>
                </div>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '.78rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border)' }}>
                      {['Sản phẩm', 'Link', 'Clicks', 'Conversions', 'Doanh thu'].map(h => <TH key={h}>{h}</TH>)}
                    </tr>
                  </thead>
                  <tbody>
                    {affLinks.map(l => (
                      <tr key={l.id} style={{ borderBottom: '1px solid var(--border)' }}>
                        <TD bold>{l.product}</TD>
                        <TD mono style={{ fontSize: '.68rem' }}>
                          <span style={{ color: 'var(--c6-300)' }}>{l.link}</span>
                          <button className="btn btn-secondary btn-sm" style={{ marginLeft: 8, fontSize: '.55rem', padding: '2px 6px' }} onClick={() => { copyText(l.link); showToast(`Đã sao chép link: ${l.link}`); }}>Copy</button>
                        </TD>
                        <TD mono bold>{l.clicks.toLocaleString()}</TD>
                        <TD mono bold color="var(--c4-500)">{l.conversions}</TD>
                        <TD mono bold color="var(--c4-500)">{l.revenue}</TD>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: 20 }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
                <div className="flex" style={{ justifyContent: 'space-between' }}>
                  <span style={{ fontWeight: 700, fontSize: '.88rem' }}>Khách Hàng (CRM)</span>
                  <span className="badge badge-c5">{crmCustomers.length} khách hàng</span>
                </div>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '.78rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border)' }}>
                      {['Tên', 'Email', 'Đơn hàng', 'Tổng chi tiêu', 'Mua gần nhất'].map(h => <TH key={h}>{h}</TH>)}
                    </tr>
                  </thead>
                  <tbody>
                    {crmCustomers.map(c => (
                      <tr key={c.id} style={{ borderBottom: '1px solid var(--border)' }}>
                        <TD bold>{c.name}</TD>
                        <TD color="var(--text-3)">{c.email}</TD>
                        <TD mono bold>{c.orders}</TD>
                        <TD mono bold color="var(--c4-500)">{c.totalSpend}</TD>
                        <TD color="var(--text-3)">{c.lastPurchase}</TD>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="card" style={{ padding: 20 }}>
              <div className="label" style={{ marginBottom: 12 }}>PHÂN KHÚC KHÁCH HÀNG</div>
              <div className="grid-4" style={{ gap: 12 }}>
                {[
                  { label: 'VIP (>10 đơn)', count: 12, color: 'var(--gold-400)' },
                  { label: 'Thường xuyên (5-10)', count: 28, color: 'var(--c4-500)' },
                  { label: 'Mới (<5 đơn)', count: 156, color: 'var(--c5-500)' },
                  { label: 'Không hoạt động', count: 43, color: 'var(--text-4)' },
                ].map((seg, i) => (
                  <div key={i} style={{ textAlign: 'center', padding: 14, background: 'var(--bg-2)', borderRadius: 8 }}>
                    <div style={{ fontFamily: 'var(--ff-display)', fontWeight: 800, fontSize: '1.2rem', color: seg.color }}>{seg.count}</div>
                    <div style={{ fontSize: '.7rem', color: 'var(--text-3)', marginTop: 4 }}>{seg.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </>
        );

      /* ══════ CHIA SẺ ĐA NỀN TẢNG ══════ */
      case 'share': {
        const refCode = userRefCode;
        const shareLink = generatedShareLink || `https://wellkoc.com/p/${shareProducts.find(p => p.name === selectedShareProduct)?.id || 1}?ref=${refCode}&utm_source=direct`;
        return (
          <>
            <h2 style={{ fontWeight: 700, fontSize: '1.1rem', marginBottom: 20 }}>{t('koc.share.title')}</h2>

            {serverNotice && (
              <div style={{ padding: '8px 14px', borderRadius: 8, marginBottom: 16, background: 'rgba(251,191,36,.1)', border: '1px solid rgba(251,191,36,.25)', color: '#b45309', fontSize: '.75rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ animation: 'pulse 1.5s infinite' }}>●</span> {serverNotice}
              </div>
            )}

            {/* ── 1. Social Links Management ── */}
            <div className="card" style={{ padding: 20, marginBottom: 24 }}>
              <div className="flex" style={{ justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <div className="flex gap-8" style={{ alignItems: 'center' }}>
                  <span style={{ fontSize: '1.1rem' }}>🔗</span>
                  <span style={{ fontWeight: 700, fontSize: '.88rem' }}>Liên kết nền tảng</span>
                </div>
                <button className="btn btn-primary btn-sm" onClick={() => showToast('Đã cập nhật liên kết nền tảng')}>Cập nhật liên kết</button>
              </div>
              <div className="flex-col gap-8">
                {socialPlatforms.map((p, i) => (
                  <div key={i} className="flex" style={{ justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: 'var(--bg-1)', borderRadius: 8, borderLeft: `3px solid ${p.color}` }}>
                    <div className="flex gap-12" style={{ alignItems: 'center' }}>
                      <span style={{ fontSize: '1rem' }}>{p.icon}</span>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '.82rem' }}>{p.name}</div>
                        <div style={{ fontSize: '.72rem', color: 'var(--text-3)' }}>{p.handle}</div>
                      </div>
                    </div>
                    <span className={`badge ${p.connected ? 'badge-c4' : 'badge-rose'}`}>
                      {p.connected ? '✅ Connected' : '❌ Chưa kết nối'}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* ── 2. Share Link Generator ── */}
            <div className="card" style={{ padding: 20, marginBottom: 24 }}>
              <div className="flex gap-8" style={{ alignItems: 'center', marginBottom: 16 }}>
                <span style={{ fontSize: '1.1rem' }}>📤</span>
                <span style={{ fontWeight: 700, fontSize: '.88rem' }}>Tạo link chia sẻ</span>
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: '.72rem', color: 'var(--text-3)', display: 'block', marginBottom: 6 }}>Chọn sản phẩm</label>
                <select
                  value={selectedShareProduct}
                  onChange={e => setSelectedShareProduct(e.target.value)}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-1)', color: 'var(--text-1)', fontSize: '.82rem' }}
                >
                  {shareProducts.map(p => (
                    <option key={p.id} value={p.name}>{p.name}</option>
                  ))}
                </select>
              </div>

              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: '.72rem', color: 'var(--text-3)', marginBottom: 8 }}>Chia sẻ qua</div>
                <div className="flex gap-8" style={{ flexWrap: 'wrap' }}>
                  {socialPlatforms.map((p, i) => (
                    <button key={i} className="btn btn-sm" disabled={isGeneratingLink} style={{ background: p.color, color: '#fff', border: 'none', fontWeight: 600, fontSize: '.75rem', padding: '8px 14px', borderRadius: 8, opacity: isGeneratingLink ? 0.6 : 1 }} onClick={async () => {
                      const link = await generateShareLink(p.name.toLowerCase());
                      if (link) { copyText(link); showToast(`Link đã được sao chép cho ${p.name}`); }
                    }}>
                      {p.icon} {p.name}
                    </button>
                  ))}
                  <button className="btn btn-secondary btn-sm" style={{ fontSize: '.75rem', padding: '8px 14px' }} onClick={() => { copyText(shareLink); showToast('Đã sao chép link chia sẻ'); }}>📋 Copy Link</button>
                  <button className="btn btn-secondary btn-sm" style={{ fontSize: '.75rem', padding: '8px 14px' }} onClick={() => { setShowQR(!showQR); showToast(showQR ? 'Đã ẩn QR Code' : 'QR Code đã hiển thị — chia sẻ cho khách hàng!'); }}>📱 QR Code</button>
                </div>
                {showQR && (
                  <div style={{ marginTop: 12, padding: 16, background: '#fff', borderRadius: 12, display: 'inline-block', border: '2px dashed var(--border)' }}>
                    <div style={{ width: 120, height: 120, background: '#000', display: 'grid', gridTemplateColumns: 'repeat(8,1fr)', gap: 1, padding: 8, borderRadius: 4 }}>
                      {Array.from({ length: 64 }, (_, i) => <div key={i} style={{ background: [0,1,2,5,6,7,8,9,15,16,23,24,25,31,32,39,40,47,48,49,55,56,57,58,62,63].includes(i) ? '#000' : '#fff', borderRadius: 1 }} />)}
                    </div>
                    <div style={{ fontSize: '.6rem', color: '#666', textAlign: 'center', marginTop: 6 }}>Scan QR</div>
                  </div>
                )}
              </div>

              <div style={{ background: 'var(--bg-1)', borderRadius: 8, padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '.68rem', color: 'var(--text-3)', marginBottom: 4 }}>Link</div>
                  <div className="mono" style={{ fontSize: '.78rem', color: 'var(--c6-300)', fontWeight: 600 }}>{shareLink}</div>
                </div>
                <button className="btn btn-primary btn-sm" style={{ fontSize: '.72rem' }} onClick={() => { copyText(shareLink); showToast('Đã sao chép link chia sẻ'); }}>📋 Copy</button>
              </div>
            </div>

            {/* ── 3. Platform Analytics ── */}
            <div className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: 24 }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
                <div className="flex gap-8" style={{ alignItems: 'center' }}>
                  <span style={{ fontSize: '1.1rem' }}>📊</span>
                  <span style={{ fontWeight: 700, fontSize: '.88rem' }}>Hiệu suất theo nền tảng</span>
                </div>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '.78rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border)' }}>
                      {['Nền tảng', 'Clicks', 'Đơn hàng', 'Revenue', 'CVR'].map(h => <TH key={h}>{h}</TH>)}
                    </tr>
                  </thead>
                  <tbody>
                    {platformAnalytics.map((p, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                        <TD>
                          <div className="flex gap-8" style={{ alignItems: 'center' }}>
                            <div style={{ width: 8, height: 8, borderRadius: '50%', background: p.color }} />
                            <span style={{ fontWeight: 600 }}>{p.platform}</span>
                          </div>
                        </TD>
                        <TD mono bold>{p.clicks.toLocaleString()}</TD>
                        <TD mono bold>{p.orders.toLocaleString()}</TD>
                        <TD mono bold color="var(--c4-500)">{p.revenue}</TD>
                        <TD>
                          <span className="badge badge-c5" style={{ fontSize: '.65rem' }}>{p.cvr}</span>
                        </TD>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr style={{ borderTop: '2px solid var(--border)' }}>
                      <TD bold>Tổng cộng</TD>
                      <TD mono bold>{platformAnalytics.reduce((s, p) => s + p.clicks, 0).toLocaleString()}</TD>
                      <TD mono bold>{platformAnalytics.reduce((s, p) => s + p.orders, 0).toLocaleString()}</TD>
                      <TD mono bold color="var(--c4-500)">132.5M₫</TD>
                      <TD><span className="badge badge-c4" style={{ fontSize: '.65rem' }}>4.2%</span></TD>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* ── 4. My Referral Team ── */}
            <div className="card" style={{ padding: 20 }}>
              <div className="flex" style={{ justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <div className="flex gap-8" style={{ alignItems: 'center' }}>
                  <span style={{ fontSize: '1.1rem' }}>👥</span>
                  <span style={{ fontWeight: 700, fontSize: '.88rem' }}>Đội ngũ của tôi</span>
                  <span className="badge badge-c5">{referralTeam.length} thành viên</span>
                </div>
              </div>

              <div className="flex-col gap-6" style={{ marginBottom: 20 }}>
                {referralTeam.map((m, i) => (
                  <div key={i} className="flex" style={{ justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: 'var(--bg-1)', borderRadius: 8 }}>
                    <div className="flex gap-12" style={{ alignItems: 'center' }}>
                      <span style={{ fontSize: '.82rem' }}>{m.active ? '🟢' : '🟡'}</span>
                      <div>
                        <span style={{ fontWeight: 600, fontSize: '.82rem' }}>{m.name}</span>
                        <span className={`badge ${m.role === 'KOC' ? 'badge-c6' : m.role === 'Vendor' ? 'badge-c7' : 'badge-c5'}`} style={{ marginLeft: 8, fontSize: '.55rem' }}>{m.role}</span>
                      </div>
                    </div>
                    <div className="flex gap-16" style={{ alignItems: 'center' }}>
                      <span style={{ fontSize: '.78rem', color: 'var(--text-3)' }}>{m.orders > 0 ? `${m.orders} đơn` : '—'}</span>
                      <span className={`badge ${m.active ? 'badge-c4' : 'badge-gold'}`} style={{ fontSize: '.6rem' }}>{m.active ? 'Active' : 'Inactive'}</span>
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ background: 'var(--bg-1)', borderRadius: 8, padding: '14px 16px' }}>
                <div className="flex" style={{ justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <div>
                    <span style={{ fontSize: '.72rem', color: 'var(--text-3)' }}>Mã giới thiệu: </span>
                    <span className="mono" style={{ fontWeight: 700, fontSize: '.88rem', color: 'var(--c6-500)' }}>{userRefCode}</span>
                  </div>
                  <button className="btn btn-secondary btn-sm" style={{ fontSize: '.7rem' }} onClick={() => { copyText(userRefCode); showToast(`Đã sao chép mã giới thiệu ${userRefCode}`); }}>📋 Copy</button>
                </div>
                <div className="flex" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '.78rem', color: 'var(--text-3)' }}>Tổng commission từ team</span>
                  <span style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--c4-500)' }}>8.1M₫</span>
                </div>
              </div>
            </div>
          </>
        );
      }

      /* ══════ 14. CỘNG ĐỒNG ══════ */
      case 'community':
        return (
          <>
            <h2 style={{ fontWeight: 700, fontSize: '1.1rem', marginBottom: 20 }}>{t('koc.community.title')}</h2>
            {/* Stats */}
            <div className="grid-3" style={{ gap: 16, marginBottom: 24 }}>
              {[
                { label: 'Tổng thành viên', value: communityStatsData.totalMembers.toLocaleString(), color: 'var(--c4-500)' },
                { label: 'Thành viên mới tháng này', value: communityStatsData.newThisMonth.toLocaleString(), color: 'var(--c5-500)' },
                { label: 'Tỷ lệ hoạt động', value: communityStatsData.activeRate, color: 'var(--c6-500)' },
              ].map((s, i) => (
                <div key={i} className="kpi-card">
                  <div className="kpi-label">{s.label}</div>
                  <div className="kpi-val" style={{ color: s.color }}>{s.value}</div>
                </div>
              ))}
            </div>
            {/* Chakra rank legend */}
            <div className="card" style={{ padding: '12px 16px', marginBottom: 20 }}>
              <div style={{ fontSize: '.72rem', fontWeight: 700, color: 'var(--text-3)', marginBottom: 8, letterSpacing: '.06em' }}>BẢNG CẤP BẬC LUÂN XA</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {RANK_TIERS.map(r => (
                  <div key={r.id} style={{
                    display: 'flex', alignItems: 'center', gap: 5,
                    padding: '3px 10px', borderRadius: 20, fontSize: '.68rem', fontWeight: 600,
                    background: r.gradient ? 'transparent' : r.bg,
                    backgroundImage: r.gradient ?? undefined,
                    border: `1px solid ${r.color === 'url(#chakraGrad)' ? 'transparent' : r.color}44`,
                    color: r.color === 'url(#chakraGrad)' ? '#fff' : r.color,
                  }}>
                    <span>{r.icon}</span>
                    <span>{r.label}</span>
                    <span style={{ opacity: .6, fontSize: '.62rem' }}>· {r.chakra}</span>
                  </div>
                ))}
              </div>
            </div>
            {/* Team list */}
            {communityTeamsData.length === 0 && (
              <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-3)', fontSize: '.85rem' }}>
                Chưa có thành viên trong nhóm. Chia sẻ link giới thiệu để bắt đầu xây dựng team!
              </div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {communityTeamsData.map(team => {
                const f1Rank = getRank(team.f1.rank);
                const isOpen = !!expandedTeams[team.teamNo];
                return (
                  <div key={team.teamNo} className="card" style={{ padding: 0, overflow: 'hidden' }}>
                    {/* Team header row (F1 = team head) */}
                    <button
                      onClick={() => setExpandedTeams(prev => ({ ...prev, [team.teamNo]: !prev[team.teamNo] }))}
                      style={{
                        width: '100%', display: 'flex', alignItems: 'center', gap: 12,
                        padding: '12px 16px', background: 'none', border: 'none', cursor: 'pointer',
                        textAlign: 'left',
                      }}
                    >
                      {/* Team number badge */}
                      <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--bg-3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '.7rem', fontWeight: 800, color: 'var(--text-3)', flexShrink: 0 }}>
                        {team.teamNo}
                      </div>
                      {/* F1 avatar */}
                      <div style={{
                        width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '.82rem', fontWeight: 800, color: '#fff',
                        background: f1Rank.gradient ?? f1Rank.color,
                        boxShadow: `0 0 8px ${f1Rank.glow}`,
                      }}>
                        {team.f1.name[0]}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                          <span style={{ fontWeight: 700, fontSize: '.88rem', color: 'var(--text-1)' }}>{team.f1.name}</span>
                          <span style={{ fontSize: '.65rem', fontWeight: 600, padding: '2px 8px', borderRadius: 10, background: f1Rank.bg, color: f1Rank.color }}>{f1Rank.icon} {f1Rank.label}</span>
                          <span style={{ fontSize: '.65rem', color: 'var(--text-4)' }}>Đầu Team #{team.teamNo}</span>
                        </div>
                        <div style={{ fontSize: '.7rem', color: 'var(--text-3)', marginTop: 2 }}>
                          {team.f1.orders} đơn · Tham gia {team.f1.joinDate}
                          {' · '}{team.members.length} thành viên bên dưới
                        </div>
                      </div>
                      {/* Expand arrow */}
                      <div style={{ color: 'var(--text-3)', fontSize: '.85rem', flexShrink: 0, transition: 'transform .2s', transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}>▼</div>
                    </button>
                    {/* Members list (expandable) */}
                    {isOpen && (
                      <div style={{ borderTop: '1px solid var(--border)' }}>
                        {team.members.map(m => {
                          const mRank = getRank(m.rank);
                          return (
                            <div key={m.id} style={{
                              display: 'flex', alignItems: 'center', gap: 10,
                              padding: '10px 16px 10px ' + (m.gen === 3 ? '48px' : '32px'),
                              borderBottom: '1px solid var(--border)',
                            }}>
                              {/* Gen indicator */}
                              <div style={{ fontSize: '.6rem', color: 'var(--text-4)', flexShrink: 0, width: 24, textAlign: 'right' }}>
                                F{m.gen}
                              </div>
                              {/* Avatar */}
                              <div style={{
                                width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: '.72rem', fontWeight: 700, color: '#fff',
                                background: mRank.gradient ?? mRank.color,
                                opacity: m.active ? 1 : 0.5,
                              }}>
                                {m.name[0]}
                              </div>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                  <span style={{ fontWeight: 600, fontSize: '.82rem', color: m.active ? 'var(--text-1)' : 'var(--text-4)' }}>{m.name}</span>
                                  <span style={{ fontSize: '.6rem', padding: '1px 6px', borderRadius: 8, background: mRank.bg, color: mRank.color, fontWeight: 600 }}>{mRank.icon} {mRank.label}</span>
                                  {!m.active && <span style={{ fontSize: '.6rem', color: '#ef4444' }}>Không HĐ</span>}
                                </div>
                                <div style={{ fontSize: '.68rem', color: 'var(--text-4)' }}>{m.orders} đơn · {m.joinDate}</div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        );

      /* ══════ 15. HIỆU SUẤT & THỐNG KÊ ══════ */
      case 'performance':
        return (
          <>
            <h2 style={{ fontWeight: 700, fontSize: '1.1rem', marginBottom: 20 }}>{t('koc.performance.title')}</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: 12, marginBottom: 24 }}>
              {perfKpis.map((kpi, i) => (
                <div key={i} className="kpi-card">
                  <div className="kpi-label">{kpi.label}</div>
                  <div className="kpi-val" style={{ color: kpi.color }}>{kpi.value}</div>
                </div>
              ))}
            </div>
            <div className="card" style={{ padding: 24, marginBottom: 24 }}>
              <div className="label" style={{ marginBottom: 16 }}>PHỄU CHUYỂN ĐỔI</div>
              <div className="flex-col gap-12">
                {funnelSteps.map((step, i) => (
                  <div key={i}>
                    <div className="flex" style={{ justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontSize: '.82rem', fontWeight: 600 }}>{step.label}</span>
                      <span style={{ fontSize: '.78rem', color: 'var(--text-3)' }}>{step.value.toLocaleString()} ({step.pct}%)</span>
                    </div>
                    <div className="progress-track" style={{ height: 8, background: 'var(--bg-2)', borderRadius: 4, overflow: 'hidden' }}>
                      <div className="progress-fill" style={{ width: `${step.pct}%`, height: '100%', background: i === 0 ? 'var(--c4-500)' : i === 1 ? 'var(--c5-500)' : i === 2 ? 'var(--c6-500)' : 'var(--c7-500)', borderRadius: 4, transition: 'width .3s ease' }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
                <span style={{ fontWeight: 700, fontSize: '.88rem' }}>Hiệu Suất Agent</span>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '.78rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border)' }}>
                      {['Agent', 'Impressions', 'Clicks', 'Conversions', 'Chi phí', 'ROI'].map(h => <TH key={h}>{h}</TH>)}
                    </tr>
                  </thead>
                  <tbody>
                    {mktAgents.map(a => (
                      <tr key={a.id} style={{ borderBottom: '1px solid var(--border)' }}>
                        <TD bold>{a.name}</TD>
                        <TD mono>{a.impressions.toLocaleString()}</TD>
                        <TD mono>{a.clicks.toLocaleString()}</TD>
                        <TD mono bold color="var(--c4-500)">{a.conversions.toLocaleString()}</TD>
                        <TD mono>{a.cost}</TD>
                        <TD bold color={a.roi !== 'N/A' ? 'var(--c4-500)' : 'var(--text-3)'}>{a.roi}</TD>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        );

      /* ══════ 16. XẾP HẠNG & GIẢI THƯỞNG ══════ */
      case 'ranking':
        return (
          <>
            <h2 style={{ fontWeight: 700, fontSize: '1.1rem', marginBottom: 20 }}>{t('koc.ranking.title')}</h2>
            <div className="onchain-card" style={{ marginBottom: 24, position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: -20, right: -20, fontSize: '6rem', opacity: 0.06 }}>🏆</div>
              <div className="flex" style={{ justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
                <div>
                  <div style={{ fontSize: '.72rem', color: 'var(--text-3)', marginBottom: 4 }}>Hạng của tôi</div>
                  <div style={{ fontFamily: 'var(--ff-display)', fontWeight: 900, fontSize: '2rem', color: 'var(--c4-500)' }}>
                    #{myRank.rank} <span style={{ fontSize: '.72rem', fontWeight: 400, color: 'var(--text-3)' }}>/ {myRank.total.toLocaleString()} KOCs</span>
                  </div>
                  <div className="flex gap-8" style={{ marginTop: 8 }}>
                    <span className="badge badge-c7">{myRank.tier}</span>
                    <span className="badge badge-gold">{xp.toLocaleString()} XP</span>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '.72rem', color: 'var(--text-3)' }}>Tổng doanh thu</div>
                  <div style={{ fontFamily: 'var(--ff-display)', fontWeight: 800, fontSize: '1.2rem', color: 'var(--gold-400)', whiteSpace: 'nowrap' }}>{myRank.revenue}</div>
                </div>
              </div>
            </div>

            <div className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: 24 }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
                <span style={{ fontWeight: 700, fontSize: '.88rem' }}>Bảng Xếp Hạng Top 10</span>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '.78rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border)' }}>
                      {['Hạng', 'KOC', 'Doanh thu', 'Hoa hồng', 'Badges', 'Tier'].map(h => <TH key={h}>{h}</TH>)}
                    </tr>
                  </thead>
                  <tbody>
                    {leaderboard.map(l => (
                      <tr key={l.rank} style={{ borderBottom: '1px solid var(--border)', background: l.rank <= 3 ? 'var(--bg-2)' : undefined }}>
                        <TD bold color={l.rank === 1 ? 'var(--gold-400)' : l.rank === 2 ? 'var(--text-2)' : l.rank === 3 ? 'var(--c5-500)' : undefined}>
                          {l.rank === 1 ? '🥇' : l.rank === 2 ? '🥈' : l.rank === 3 ? '🥉' : `#${l.rank}`}
                        </TD>
                        <TD bold>{l.name}</TD>
                        <TD mono bold color="var(--c4-500)">{l.revenue}</TD>
                        <TD mono>{l.commission}</TD>
                        <TD><span className="badge badge-gold">{l.badges}</span></TD>
                        <TD><span className={`badge ${l.tier === 'Legend' ? 'badge-c7' : l.tier === 'Diamond' ? 'badge-c5' : 'badge-c6'}`}>{l.tier}</span></TD>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="card" style={{ padding: 24, marginBottom: 28 }}>
              <div className="label" style={{ marginBottom: 14 }}>BADGES ĐÃ ĐẠT ĐƯỢC</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: 12 }}>
                {gamificationBadges.map((b, i) => (
                  <div key={i} style={{
                    textAlign: 'center', padding: 14, borderRadius: 10,
                    background: b.earned ? 'var(--bg-2)' : 'var(--bg-1)',
                    opacity: b.earned ? 1 : 0.4,
                    border: b.earned ? '1px solid var(--border)' : '1px dashed var(--border)',
                  }}>
                    <div style={{ fontSize: '1.5rem', marginBottom: 6 }}>{b.icon}</div>
                    <div style={{ fontSize: '.68rem', fontWeight: 600, color: b.earned ? 'var(--text-1)' : 'var(--text-4)' }}>{b.name}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Career Achievement Rewards */}
            <div style={{ marginBottom: 8 }}>
              <div style={{ fontSize: '.65rem', letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--gold-400)', fontWeight: 700, marginBottom: 6 }}>GIẢI THƯỞNG CỐNG HIẾN SỰ NGHIỆP</div>
              <div style={{ fontFamily: 'var(--ff-display)', fontWeight: 800, fontSize: '1.15rem', color: 'var(--text-1)', marginBottom: 20 }}>Phục Hưng Cộng Đồng</div>
            </div>

            <div className="flex-col gap-16">
              {careerRewards.map((reward, i) => {
                const pct = Math.min((reward.current / reward.target) * 100, 100);
                const achieved = pct >= 100;
                return (
                  <div key={i} style={{
                    position: 'relative', borderRadius: 16, overflow: 'hidden',
                    background: 'var(--bg-1)', border: '1px solid var(--border)',
                    boxShadow: achieved ? reward.glow : 'none',
                  }}>
                    <div style={{
                      background: reward.gradient, padding: '20px 24px',
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    }}>
                      <div className="flex gap-12" style={{ alignItems: 'center' }}>
                        <span style={{ fontSize: '2rem' }}>{reward.icon}</span>
                        <div>
                          <div style={{ fontWeight: 800, fontSize: '1rem', color: '#fff', textShadow: '0 1px 4px rgba(0,0,0,0.4)' }}>{reward.title}</div>
                          <div style={{ fontSize: '.72rem', color: 'rgba(255,255,255,0.85)', marginTop: 2 }}>Hạng {reward.tier}</div>
                        </div>
                      </div>
                      {achieved && (
                        <div style={{
                          background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(8px)',
                          padding: '6px 14px', borderRadius: 20,
                          fontWeight: 800, fontSize: '.72rem', color: '#fff',
                          border: '1px solid rgba(255,255,255,0.3)',
                        }}>ĐÃ ĐẠT ĐƯỢC</div>
                      )}
                    </div>
                    <div style={{ padding: '20px 24px' }}>
                      <div style={{ fontSize: '.82rem', color: 'var(--text-2)', marginBottom: 14, lineHeight: 1.5 }}>{reward.description}</div>
                      <div className="flex" style={{ justifyContent: 'space-between', marginBottom: 6 }}>
                        <span style={{ fontSize: '.7rem', color: 'var(--text-3)' }}>Tiến độ</span>
                        <span style={{ fontSize: '.7rem', fontWeight: 700, color: achieved ? 'var(--c4-500)' : 'var(--text-2)' }}>{pct.toFixed(1)}%</span>
                      </div>
                      <div className="progress-track" style={{ height: 8, background: 'var(--bg-2)', borderRadius: 4, overflow: 'hidden' }}>
                        <div className="progress-fill" style={{
                          width: `${pct}%`, height: '100%', borderRadius: 4,
                          background: achieved ? 'var(--c4-500)' : reward.gradient,
                          transition: 'width .5s ease',
                        }} />
                      </div>
                      <div className="flex" style={{ justifyContent: 'space-between', marginTop: 6 }}>
                        <span style={{ fontSize: '.65rem', color: 'var(--text-4)' }}>Hiện tại: {formatVND(reward.current)}</span>
                        <span style={{ fontSize: '.65rem', color: 'var(--text-4)' }}>Mục tiêu: {formatVND(reward.target)}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        );

      /* ══════ 17. CREATOR TOKEN ══════ */
      case 'token':
        return (
          <>
            <h2 style={{ fontWeight: 700, fontSize: '1.1rem', marginBottom: 20 }}>{t('koc.token.title')}</h2>
            <div className="onchain-card" style={{ marginBottom: 24 }}>
              <div className="flex" style={{ justifyContent: 'space-between', flexWrap: 'wrap', gap: 16, marginBottom: 16 }}>
                <div>
                  <div className="flex gap-8" style={{ marginBottom: 8 }}>
                    <div style={{
                      width: 48, height: 48, borderRadius: '50%',
                      background: 'var(--chakra-flow)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '1rem', fontWeight: 800, color: '#fff',
                    }}>{creatorToken.symbol.charAt(0)}</div>
                    <div>
                      <div style={{ fontFamily: 'var(--ff-display)', fontWeight: 800, fontSize: '1.2rem' }}>{creatorToken.name}</div>
                      <div style={{ fontSize: '.72rem', color: 'var(--text-3)' }}>{creatorToken.fullName}</div>
                    </div>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontFamily: 'var(--ff-display)', fontWeight: 800, fontSize: '1.4rem', color: 'var(--c4-500)' }}>{creatorToken.price}</div>
                  <span className="badge badge-c4">{creatorToken.priceChange}</span>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 12 }}>
                {[
                  { label: 'Total Supply', value: creatorToken.totalSupply },
                  { label: 'Circulating', value: creatorToken.circulatingSupply },
                  { label: 'Holders', value: creatorToken.holders.toString() },
                  { label: 'Market Cap', value: creatorToken.marketCap },
                ].map((s, i) => (
                  <div key={i} style={{ textAlign: 'center', padding: '10px 8px', background: 'var(--bg-2)', borderRadius: 8 }}>
                    <div style={{ fontSize: '.65rem', color: 'var(--text-4)', marginBottom: 4 }}>{s.label}</div>
                    <div style={{ fontFamily: 'var(--ff-display)', fontWeight: 700, fontSize: '.88rem' }}>{s.value}</div>
                  </div>
                ))}
              </div>
              <div className="flex gap-8" style={{ marginTop: 16 }}>
                <span className="badge badge-c7">{creatorToken.chain}</span>
                <span className="mono badge badge-c5" style={{ fontSize: '.6rem' }}>{creatorToken.contractAddress}</span>
              </div>
            </div>
            <div className="flex gap-8" style={{ marginBottom: 16 }}>
              <button className="btn btn-primary btn-sm" onClick={() => setTokenAction(tokenAction === 'buy' ? null : 'buy')}>Mua {creatorToken.name}</button>
              <button className="btn btn-secondary btn-sm" onClick={() => setTokenAction(tokenAction === 'sell' ? null : 'sell')}>Bán {creatorToken.name}</button>
            </div>
            {tokenAction && (
              <div className="card" style={{ padding: 16, marginBottom: 24, border: `1px solid ${tokenAction === 'buy' ? 'var(--c4-500)' : 'var(--c7-500)'}` }}>
                <div style={{ fontWeight: 600, fontSize: '.85rem', marginBottom: 10 }}>{tokenAction === 'buy' ? 'Mua' : 'Bán'} {creatorToken.name}</div>
                <div className="flex gap-8" style={{ marginBottom: 8 }}>
                  <input type="number" placeholder="Số lượng token" style={{ flex: 1, padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-1)', color: 'var(--text-1)', fontSize: '.82rem' }} />
                  <button className="btn btn-primary btn-sm" onClick={() => { setTokenAction(null); showToast(`Lệnh ${tokenAction === 'buy' ? 'mua' : 'bán'} ${creatorToken.name} đã được gửi`); }}>Xác nhận</button>
                </div>
                <div style={{ fontSize: '.68rem', color: 'var(--text-4)' }}>Giá hiện tại: {creatorToken.price}</div>
              </div>
            )}
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
                <span style={{ fontWeight: 700, fontSize: '.88rem' }}>Top Holders</span>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '.78rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border)' }}>
                      {['Địa chỉ', 'Số lượng', 'Tỷ lệ'].map(h => <TH key={h}>{h}</TH>)}
                    </tr>
                  </thead>
                  <tbody>
                    {tokenHolders.map((h, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                        <TD mono>{h.address}</TD>
                        <TD mono bold>{h.amount}</TD>
                        <TD><span className="badge badge-c6">{h.pct}</span></TD>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        );

      /* ══════ 18. NHIỆM VỤ & XP ══════ */
      case 'missions': {
        const dailyMissions = [
          { name: 'Đăng nhập hôm nay', xp: 5, done: claimedMissions.has('Đăng nhập hôm nay') },
          { name: 'Xem 3 sản phẩm', xp: 10, progress: '2/3', done: claimedMissions.has('Xem 3 sản phẩm') },
          { name: 'Mua 1 đơn hàng', xp: 20, progress: '0/1', done: claimedMissions.has('Mua 1 đơn hàng') },
          { name: 'Đánh giá 1 sản phẩm', xp: 15, progress: '0/1', done: claimedMissions.has('Đánh giá 1 sản phẩm') },
          { name: 'Chia sẻ 1 sản phẩm', xp: 5, progress: '0/1', done: claimedMissions.has('Chia sẻ 1 sản phẩm') },
          { name: 'Mời 1 bạn bè', xp: 50, progress: '0/1', done: claimedMissions.has('Mời 1 bạn bè') },
        ];
        const weeklyMissions = [
          { name: 'Mua 3 đơn hàng', xp: 100, progress: '1/3', done: claimedMissions.has('Mua 3 đơn hàng') },
          { name: 'Review 2 sản phẩm', xp: 80, progress: '0/2', done: claimedMissions.has('Review 2 sản phẩm') },
          { name: 'Follow 5 KOC', xp: 30, progress: '2/5', done: claimedMissions.has('Follow 5 KOC') },
          { name: 'Đăng nhập 7 ngày liên tục', xp: 100, progress: '3/7', done: claimedMissions.has('Đăng nhập 7 ngày liên tục') },
        ];
        return (
          <>
            <div className="card" style={{ padding: 20, marginBottom: 20, background: 'linear-gradient(135deg, rgba(34,197,94,.08), rgba(99,102,241,.08))', border: '1px solid rgba(34,197,94,.2)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-1)' }}>Streak: 3 ngày liên tục</div>
                  <div style={{ fontSize: '.8rem', color: 'var(--text-3)', marginTop: 4 }}>Đăng nhập 7 ngày liên tục = bonus 100 XP</div>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  {[1,2,3,4,5,6,7].map(d => (
                    <div key={d} style={{ width: 32, height: 32, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '.7rem', fontWeight: 700, background: d <= 3 ? 'var(--c4-500)' : 'var(--bg-2)', color: d <= 3 ? '#fff' : 'var(--text-4)' }}>{d}</div>
                  ))}
                </div>
              </div>
            </div>

            <div className="card" style={{ padding: 16, marginBottom: 20, border: '1px solid rgba(239,68,68,.3)', background: 'linear-gradient(90deg, rgba(239,68,68,.06), transparent)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <span style={{ background: '#ef4444', color: '#fff', padding: '2px 8px', borderRadius: 4, fontSize: '.65rem', fontWeight: 700 }}>FLASH</span>
                <span style={{ fontSize: '.82rem', fontWeight: 600, color: 'var(--text-1)' }}>2x XP Event — còn 02:45:30</span>
              </div>
              <div style={{ fontSize: '.78rem', color: 'var(--text-3)' }}>Mọi nhiệm vụ hoàn thành trong event nhận gấp đôi XP!</div>
            </div>

            <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 12, color: 'var(--text-1)' }}>Nhiệm vụ hàng ngày</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 24 }}>
              {dailyMissions.map((m, i) => (
                <div key={i} className="card" style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', opacity: m.done ? 0.6 : 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 28, height: 28, borderRadius: 8, background: m.done ? 'var(--c4-500)' : 'var(--bg-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '.8rem', color: m.done ? '#fff' : 'var(--text-3)' }}>{m.done ? '✓' : '○'}</div>
                    <div>
                      <div style={{ fontSize: '.85rem', fontWeight: 500, color: 'var(--text-1)', textDecoration: m.done ? 'line-through' : 'none' }}>{m.name}</div>
                      {!m.done && m.progress && <div style={{ fontSize: '.7rem', color: 'var(--text-4)' }}>Tiến độ: {m.progress}</div>}
                    </div>
                  </div>
                  <div className="flex gap-8" style={{ alignItems: 'center' }}>
                    <span className="badge badge-c4" style={{ fontSize: '.72rem' }}>+{m.xp} XP</span>
                    {!m.done && (
                      <button className="btn btn-primary btn-sm" style={{ fontSize: '.65rem', padding: '3px 8px' }} onClick={() => { setClaimedMissions(prev => new Set([...prev, m.name])); setXp(prev => prev + m.xp); showToast(`Nhận thưởng "${m.name}" — +${m.xp} XP`); }}>Nhận</button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 12, color: 'var(--text-1)' }}>Nhiệm vụ tuần</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {weeklyMissions.map((m, i) => (
                <div key={i} className="card" style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', opacity: m.done ? 0.6 : 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 28, height: 28, borderRadius: 8, background: m.done ? 'var(--c4-500)' : 'var(--bg-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '.75rem', color: m.done ? '#fff' : 'var(--c6-500)' }}>{m.done ? '✓' : '📋'}</div>
                    <div>
                      <div style={{ fontSize: '.85rem', fontWeight: 500, color: 'var(--text-1)', textDecoration: m.done ? 'line-through' : 'none' }}>{m.name}</div>
                      {!m.done && <div style={{ fontSize: '.7rem', color: 'var(--text-4)' }}>Tiến độ: {m.progress}</div>}
                    </div>
                  </div>
                  <div className="flex gap-8" style={{ alignItems: 'center' }}>
                    <span className="badge badge-c6" style={{ fontSize: '.72rem' }}>+{m.xp} XP</span>
                    {!m.done && (
                      <button className="btn btn-primary btn-sm" style={{ fontSize: '.65rem', padding: '3px 8px' }} onClick={() => { setClaimedMissions(prev => new Set([...prev, m.name])); setXp(prev => prev + m.xp); showToast(`Nhận thưởng "${m.name}" — +${m.xp} XP`); }}>Nhận</button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        );
      }

      /* ══════ 19. ĐỔI XP → WK3 ══════ */
      case 'convert': {
        const conversionRate = 100;
        const convertHistory = [
          { date: '20/03/2026', xp: 500, wk3: 5, status: 'Thành công' },
          { date: '15/03/2026', xp: 1000, wk3: 10, status: 'Thành công' },
          { date: '10/03/2026', xp: 2000, wk3: 20, status: 'Thành công' },
        ];
        return (
          <>
            <div className="grid-2" style={{ marginBottom: 24 }}>
              <div className="card" style={{ padding: 20, background: 'linear-gradient(135deg, rgba(168,85,247,.08), rgba(99,102,241,.06))' }}>
                <div style={{ fontSize: '.72rem', color: 'var(--text-3)', marginBottom: 4 }}>XP Hiện tại</div>
                <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--c7-500)' }}>{xp.toLocaleString()}</div>
                <div style={{ fontSize: '.72rem', color: 'var(--text-4)' }}>= {(xp / conversionRate).toFixed(1)} WK3</div>
              </div>
              <div className="card" style={{ padding: 20, background: 'linear-gradient(135deg, rgba(34,197,94,.08), rgba(6,182,212,.06))' }}>
                <div style={{ fontSize: '.72rem', color: 'var(--text-3)', marginBottom: 4 }}>WK3 Token</div>
                <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--c4-500)' }}>{wk3Balance.toFixed(1)} WK3</div>
                <div style={{ fontSize: '.72rem', color: 'var(--text-4)' }}>≈ {formatVND(wk3Balance * 25000)}</div>
              </div>
            </div>

            <div className="card" style={{ padding: 24, marginBottom: 24 }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 16, color: 'var(--text-1)' }}>Quy đổi XP → WK3 Token</h3>
              <div style={{ fontSize: '.78rem', color: 'var(--text-3)', marginBottom: 16 }}>Tỷ lệ: <strong>100 XP = 1 WK3 Token</strong> · Tối thiểu: 100 XP</div>
              <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                {[100, 500, 1000, 2000, 5000].map(v => (
                  <button key={v} onClick={() => setConvertAmount(v)} style={{ padding: '6px 14px', borderRadius: 8, border: convertAmount === v ? '1px solid var(--c6-500)' : '1px solid var(--border)', background: convertAmount === v ? 'rgba(99,102,241,.1)' : 'transparent', color: convertAmount === v ? 'var(--c6-500)' : 'var(--text-3)', fontSize: '.78rem', cursor: 'pointer', fontWeight: 600 }}>{v} XP</button>
                ))}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16, padding: 16, borderRadius: 12, background: 'var(--bg-2)' }}>
                <div style={{ flex: 1, textAlign: 'center' }}>
                  <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--c7-500)' }}>{convertAmount} XP</div>
                </div>
                <div style={{ fontSize: '1.2rem', color: 'var(--text-3)' }}>→</div>
                <div style={{ flex: 1, textAlign: 'center' }}>
                  <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--c4-500)' }}>{(convertAmount / conversionRate).toFixed(1)} WK3</div>
                </div>
              </div>
              <button className="btn btn-primary btn-lg" style={{ width: '100%' }} disabled={convertAmount > xp} onClick={() => {
                if (convertAmount > xp) return;
                setXp(prev => prev - convertAmount);
                setWk3Balance(prev => prev + convertAmount / conversionRate);
                showToast(`Đã quy đổi ${convertAmount} XP → ${(convertAmount / conversionRate).toFixed(1)} WK3`);
              }}>
                {convertAmount > xp ? 'Không đủ XP' : `Quy đổi ${convertAmount} XP → ${(convertAmount / conversionRate).toFixed(1)} WK3`}
              </button>
            </div>

            <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 12, color: 'var(--text-1)' }}>Lịch sử quy đổi</h3>
            <table className="data-table">
              <thead><tr><th>Ngày</th><th>XP</th><th>WK3</th><th>Trạng thái</th></tr></thead>
              <tbody>
                {convertHistory.map((h, i) => (
                  <tr key={i}><td>{h.date}</td><td>-{h.xp}</td><td>+{h.wk3} WK3</td><td><span className="badge badge-c4">{h.status}</span></td></tr>
                ))}
              </tbody>
            </table>
          </>
        );
      }

      /* ══════ 20. CÀI ĐẶT ══════ */
      /* ── AFFILIATE TABS ── */
      case 'affTeam':
        return (
          <>
            <h2 style={{ fontWeight: 700, fontSize: '1.1rem', marginBottom: 20 }}>{t('koc.affTeam.title')}</h2>
            {/* Stats */}
            <div className="grid-3 gap-12" style={{ marginBottom: 20 }}>
              {[
                { label: 'Tổng thành viên', value: communityStatsData.totalMembers.toLocaleString(), color: 'var(--c6-500)' },
                { label: 'Team trực tiếp (F1)', value: communityTeamsData.length.toString(), color: 'var(--c4-500)' },
                { label: 'Commission chờ', value: commBalance > 0 ? commBalance.toLocaleString('vi-VN') + '₫' : '0₫', color: '#f59e0b' },
              ].map(s => (
                <div key={s.label} className="kpi-card">
                  <div style={{ fontSize: '.68rem', color: 'var(--text-3)' }}>{s.label}</div>
                  <div style={{ fontSize: '1.3rem', fontWeight: 800, color: s.color }}>{s.value}</div>
                </div>
              ))}
            </div>
            {/* User Affiliate list */}
            <div className="card" style={{ padding: 20 }}>
              <div style={{ fontSize: '.82rem', fontWeight: 700, marginBottom: 16 }}>
                {t('koc.affTeam.level1')} ({communityTeamsData.length} người)
              </div>
              {communityTeamsData.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-3)', fontSize: '.82rem' }}>
                  Chưa có User Affiliate. Chia sẻ link giới thiệu để phát triển mạng lưới!
                </div>
              ) : communityTeamsData.map((team, i) => {
                const f1Rank = getRank(team.f1.rank);
                return (
                  <div key={team.teamNo} className="flex gap-12" style={{ padding: '10px 0', borderBottom: '1px solid var(--border)', alignItems: 'center' }}>
                    <div style={{ width: 32, height: 32, borderRadius: '50%', background: team.f1.active ? (f1Rank.gradient ?? f1Rank.color) : 'var(--bg-3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '.65rem', fontWeight: 700, color: '#fff' }}>{team.f1.name[0]}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: '.82rem' }}>
                        {team.f1.name}
                        <span style={{ marginLeft: 6, fontSize: '.6rem', padding: '1px 6px', borderRadius: 8, background: f1Rank.bg, color: f1Rank.color }}>{f1Rank.icon} {f1Rank.label}</span>
                        {!team.f1.active && <span className="badge badge-rose" style={{ fontSize: '.55rem', marginLeft: 4 }}>Inactive</span>}
                      </div>
                      <div style={{ fontSize: '.7rem', color: 'var(--text-3)' }}>{team.members.length} thành viên bên dưới · {team.f1.orders} đơn hàng</div>
                    </div>
                    <button className="btn btn-secondary btn-sm" style={{ fontSize: '.68rem' }} onClick={() => showToast(`Team ${team.f1.name}: ${team.members.length} thành viên`)}>Xem nhánh</button>
                  </div>
                );
              })}
            </div>
          </>
        );

      case 'affStats':
        return (
          <>
            <h2 style={{ fontWeight: 700, fontSize: '1.1rem', marginBottom: 20 }}>{t('koc.affStats.title')}</h2>
            <div className="grid-4 gap-12" style={{ marginBottom: 20 }}>
              {[
                { label: 'Link clicks', value: '4,521', sub: '+12% tuần', color: 'var(--c6-500)' },
                { label: 'Đơn hàng qua aff', value: '89', sub: 'CVR 1.97%', color: 'var(--c4-500)' },
                { label: 'Doanh thu aff', value: '45.2M₫', sub: 'Tháng này', color: '#f59e0b' },
                { label: 'Commission chờ', value: '8.1M₫', sub: '23 đơn', color: '#ef4444' },
              ].map(s => (
                <div key={s.label} className="kpi-card">
                  <div style={{ fontSize: '.68rem', color: 'var(--text-3)' }}>{s.label}</div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 800, color: s.color }}>{s.value}</div>
                  <div style={{ fontSize: '.65rem', color: 'var(--text-4)', marginTop: 2 }}>{s.sub}</div>
                </div>
              ))}
            </div>
            {/* Top products */}
            <div className="card" style={{ padding: 20 }}>
              <div style={{ fontWeight: 700, fontSize: '.88rem', marginBottom: 14 }}>Top sản phẩm theo doanh thu Affiliate</div>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead><tr style={{ borderBottom: '2px solid var(--border)' }}><TH>Sản phẩm</TH><TH>Clicks</TH><TH>Đơn</TH><TH>Doanh thu</TH><TH>Commission</TH></tr></thead>
                <tbody>
                  {[
                    { name: 'Serum Vitamin C', clicks: 1240, orders: 34, revenue: '17M₫', comm: '1.7M₫' },
                    { name: 'Kem chống nắng SPF50', clicks: 890, orders: 28, revenue: '11.2M₫', comm: '1.1M₫' },
                    { name: 'Nước tẩy trang', clicks: 650, orders: 18, revenue: '5.4M₫', comm: '540K₫' },
                  ].map((p, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                      <TD bold>{p.name}</TD><TD mono>{p.clicks.toLocaleString()}</TD><TD mono>{p.orders}</TD><TD mono>{p.revenue}</TD><TD mono color="var(--c4-500)">{p.comm}</TD>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        );

      case 'affPayout':
        return (
          <>
            <h2 style={{ fontWeight: 700, fontSize: '1.1rem', marginBottom: 20 }}>{t('koc.affPayout.title')}</h2>
            <div className="grid-3 gap-12" style={{ marginBottom: 20 }}>
              {[
                { label: 'Tổng kiếm được', value: '56.8M₫', color: 'var(--c4-500)' },
                { label: 'Đã rút', value: '48.2M₫', color: 'var(--c6-500)' },
                { label: 'Chờ thanh toán', value: '8.6M₫', color: '#f59e0b' },
              ].map(s => (
                <div key={s.label} className="kpi-card">
                  <div style={{ fontSize: '.68rem', color: 'var(--text-3)' }}>{s.label}</div>
                  <div style={{ fontSize: '1.3rem', fontWeight: 800, color: s.color }}>{s.value}</div>
                </div>
              ))}
            </div>
            {/* Payout history */}
            <div className="card" style={{ padding: 20 }}>
              <div className="flex" style={{ justifyContent: 'space-between', marginBottom: 14 }}>
                <span style={{ fontWeight: 700, fontSize: '.88rem' }}>Lịch sử thanh toán</span>
                <button className="btn btn-primary btn-sm" onClick={() => { setActiveNav('commission'); setShowWithdrawForm(true); showToast('Chuyển đến trang rút tiền'); }}>Rút tiền</button>
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead><tr style={{ borderBottom: '2px solid var(--border)' }}><TH>Ngày</TH><TH>Số tiền</TH><TH>Phương thức</TH><TH>Trạng thái</TH></tr></thead>
                <tbody>
                  {[
                    { date: '15/03/2026', amount: '12.5M₫', method: 'Vietcombank', status: 'completed' },
                    { date: '01/03/2026', amount: '8.2M₫', method: 'USDT Polygon', status: 'completed' },
                    { date: '15/02/2026', amount: '10.1M₫', method: 'Vietcombank', status: 'completed' },
                    { date: '27/03/2026', amount: '8.6M₫', method: 'Vietcombank', status: 'pending' },
                  ].map((p, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                      <TD mono>{p.date}</TD><TD mono bold>{p.amount}</TD><TD>{p.method}</TD>
                      <TD><span className={`badge ${p.status === 'completed' ? 'badge-c4' : 'badge-amber'}`}>{p.status === 'completed' ? 'Đã trả' : 'Chờ'}</span></TD>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        );

      case 'affMaterials':
        return (
          <>
            <h2 style={{ fontWeight: 700, fontSize: '1.1rem', marginBottom: 20 }}>{t('koc.affMaterials.title')}</h2>
            <p style={{ color: 'var(--text-3)', fontSize: '.82rem', marginBottom: 20 }}>Banner, hình ảnh, video mẫu để chia sẻ trên các nền tảng</p>
            <div className="grid-3 gap-16">
              {[
                { type: 'Banner', size: '1200x628', platform: 'Facebook', desc: 'Banner sản phẩm DPP Verified' },
                { type: 'Story', size: '1080x1920', platform: 'Instagram', desc: 'Story template review sản phẩm' },
                { type: 'Video', size: '1080x1080', platform: 'TikTok', desc: 'Template video unbox sản phẩm' },
                { type: 'Banner', size: '800x418', platform: 'Zalo', desc: 'Banner chia sẻ link Zalo OA' },
                { type: 'Thumbnail', size: '1280x720', platform: 'YouTube', desc: 'Thumbnail review sản phẩm' },
                { type: 'Post', size: '1080x1080', platform: 'Instagram', desc: 'Template post carousel' },
              ].map((m, i) => (
                <div key={i} className="card" style={{ padding: 16 }}>
                  <div style={{ height: 80, borderRadius: 8, background: 'var(--bg-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
                    <span style={{ fontSize: '.72rem', color: 'var(--text-4)' }}>{m.size}</span>
                  </div>
                  <div style={{ fontWeight: 700, fontSize: '.82rem', marginBottom: 2 }}>{m.type} — {m.platform}</div>
                  <div style={{ fontSize: '.72rem', color: 'var(--text-3)', marginBottom: 10 }}>{m.desc}</div>
                  <button className="btn btn-secondary btn-sm" style={{ width: '100%', fontSize: '.72rem' }} onClick={() => showToast(`Đang tải "${m.type} — ${m.platform}" (${m.size})...`)}>Tải xuống</button>
                </div>
              ))}
            </div>
          </>
        );

      case 'settings':
        return (
          <>
            <h2 style={{ fontWeight: 700, fontSize: '1.1rem', marginBottom: 20 }}>{t('koc.settings.title')}</h2>

            <div className="flex gap-8" style={{ marginBottom: 20, flexWrap: 'wrap' }}>
              {[
                { key: 'profile', label: 'Hồ sơ KOC' },
                { key: 'address', label: 'Địa chỉ' },
                { key: 'bank', label: 'Ngân hàng' },
                { key: 'wkpay', label: 'WK Pay KYC' },
                { key: 'password', label: 'Mật khẩu' },
                { key: 'koc', label: 'KOC Profile' },
              ].map(t => (
                <button key={t.key} className={`btn btn-sm ${settingsTab === t.key ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setSettingsTab(t.key)}>{t.label}</button>
              ))}
            </div>

            {settingsTab === 'profile' && (
              <div className="card" style={{ padding: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
                  <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--chakra-flow)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', fontWeight: 700 }}>{userName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}</div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '1rem' }}>{settingsFormData.name}</div>
                    <span className="badge badge-c6">KOC Level 18</span>
                  </div>
                </div>
                <div className="flex-col gap-12">
                  {([
                    { label: 'Họ tên', key: 'name' as const },
                    { label: 'Email', key: 'email' as const },
                    { label: 'Số điện thoại', key: 'phone' as const },
                    { label: 'Handle', key: 'handle' as const },
                    { label: 'Bio', key: 'bio' as const },
                  ] as const).map((f, i) => (
                    <div key={i} className="flex" style={{ justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)', alignItems: 'center' }}>
                      <span style={{ fontSize: '.82rem', color: 'var(--text-3)' }}>{f.label}</span>
                      {settingsEditing ? (
                        <input value={settingsFormData[f.key]} onChange={e => setSettingsFormData(prev => ({ ...prev, [f.key]: e.target.value }))} style={{ padding: '4px 8px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg-1)', color: 'var(--text-1)', fontSize: '.82rem', fontWeight: 600, textAlign: 'right', width: '60%' }} />
                      ) : (
                        <span style={{ fontSize: '.82rem', fontWeight: 600 }}>{settingsFormData[f.key]}</span>
                      )}
                    </div>
                  ))}
                </div>
                {settingsEditing ? (
                  <div className="flex gap-8" style={{ marginTop: 16 }}>
                    <button className="btn btn-primary btn-sm" onClick={() => { setSettingsEditing(false); showToast('Đã lưu thông tin hồ sơ'); }}>Lưu</button>
                    <button className="btn btn-secondary btn-sm" onClick={() => setSettingsEditing(false)}>Hủy</button>
                  </div>
                ) : (
                  <button className="btn btn-primary btn-sm" style={{ marginTop: 16 }} onClick={() => setSettingsEditing(true)}>Chỉnh sửa</button>
                )}
              </div>
            )}

            {settingsTab === 'address' && (
              <div className="card" style={{ padding: 20 }}>
                <div className="flex-col gap-12">
                  <div className="flex" style={{ justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                    <span style={{ fontSize: '.82rem', color: 'var(--text-3)' }}>Mặc định</span>
                    <span style={{ fontSize: '.82rem', fontWeight: 600 }}>123 Nguyễn Huệ, Q.1, TP.HCM</span>
                  </div>
                  <div className="flex" style={{ justifyContent: 'space-between', padding: '8px 0' }}>
                    <span style={{ fontSize: '.82rem', color: 'var(--text-3)' }}>SĐT</span>
                    <span style={{ fontSize: '.82rem', fontWeight: 600 }}>0912 345 678</span>
                  </div>
                </div>
                <button className="btn btn-secondary btn-sm" style={{ marginTop: 16 }} onClick={() => showToast('Đã thêm địa chỉ mới — bấm Sửa để cập nhật')}>+ Thêm địa chỉ mới</button>
              </div>
            )}

            {settingsTab === 'bank' && (
              <div className="card" style={{ padding: 20 }}>
                <div className="flex-col gap-12">
                  <div className="flex" style={{ justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                    <span style={{ fontSize: '.82rem', color: 'var(--text-3)' }}>Ngân hàng</span>
                    <span style={{ fontSize: '.82rem', fontWeight: 600 }}>Vietcombank **** 1234</span>
                  </div>
                  <div className="flex" style={{ justifyContent: 'space-between', padding: '8px 0' }}>
                    <span style={{ fontSize: '.82rem', color: 'var(--text-3)' }}>Chủ TK</span>
                    <span style={{ fontSize: '.82rem', fontWeight: 600 }}>MINH HUONG</span>
                  </div>
                </div>
                <button className="btn btn-secondary btn-sm" style={{ marginTop: 16 }} onClick={() => showToast('Đã thêm tài khoản ngân hàng mới')}>+ Thêm tài khoản</button>
              </div>
            )}

            {settingsTab === 'wkpay' && (() => {
              const kycSteps = [
                { key: 'email', label: 'Email', icon: '📧', desc: 'Xác minh email đăng ký' },
                { key: 'phone', label: 'Số điện thoại', icon: '📱', desc: 'Xác minh SĐT qua OTP' },
                { key: 'identity', label: 'Giấy tờ tùy thân', icon: '🪪', desc: 'Upload CCCD/CMND/Hộ chiếu' },
                { key: 'bank', label: 'Tài khoản ngân hàng', icon: '🏦', desc: 'Liên kết tài khoản thanh toán' },
                { key: 'complete', label: 'Hoàn tất', icon: '✅', desc: 'KYC đã xác minh đầy đủ' },
              ];
              return (
                <div className="flex-col gap-16">
                  {/* KYC Progress */}
                  <div className="card" style={{ padding: 20 }}>
                    <div className="flex" style={{ justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                      <h3 style={{ fontSize: '.95rem', fontWeight: 700, margin: 0 }}>🛡️ Xác minh tài khoản (KYC)</h3>
                      <span className={`badge ${kycStep >= 5 ? 'badge-c4' : kycStep >= 3 ? 'badge-c5' : 'badge-c7'}`}>
                        {kycStep >= 5 ? '✅ Đã xác minh' : kycStep >= 3 ? '⏳ Đang xử lý' : `${kycStep}/5 bước`}
                      </span>
                    </div>

                    {/* Progress bar */}
                    <div style={{ height: 6, borderRadius: 3, background: 'var(--bg-2)', marginBottom: 20, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${(kycStep / 5) * 100}%`, background: kycStep >= 5 ? 'var(--c4-500)' : 'var(--c6-500)', borderRadius: 3, transition: 'width .5s ease' }} />
                    </div>

                    {/* Steps */}
                    <div className="flex-col gap-8">
                      {kycSteps.map((s, i) => {
                        const done = kycStep > i;
                        const active = kycStep === i;
                        return (
                          <div key={s.key} style={{
                            display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px',
                            borderRadius: 10, border: `1px solid ${active ? 'var(--c6-500)' : 'var(--border)'}`,
                            background: done ? 'rgba(16,185,129,.06)' : active ? 'rgba(99,102,241,.06)' : 'var(--bg-1)',
                            opacity: (!done && !active) ? 0.5 : 1, transition: 'all .3s',
                          }}>
                            <span style={{ fontSize: '1.2rem' }}>{done ? '✅' : s.icon}</span>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontWeight: 700, fontSize: '.82rem' }}>{s.label}</div>
                              <div style={{ fontSize: '.7rem', color: 'var(--text-3)' }}>{s.desc}</div>
                            </div>
                            {done && <span style={{ fontSize: '.68rem', color: 'var(--c4-500)', fontWeight: 600 }}>Hoàn tất</span>}
                            {active && <span style={{ fontSize: '.68rem', color: 'var(--c6-500)', fontWeight: 600 }}>Đang thực hiện →</span>}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Active step form */}
                  {kycStep < 5 && (
                    <div className="card" style={{ padding: 20 }}>
                      {kycStep === 0 && (
                        <div className="flex-col gap-12">
                          <h4 style={{ fontWeight: 700, fontSize: '.88rem', margin: 0 }}>📧 Xác minh Email</h4>
                          <div style={{ fontSize: '.78rem', color: 'var(--text-3)' }}>Email: <strong>{userEmail || 'chưa có'}</strong></div>
                          <button className="btn btn-primary btn-sm" disabled={kycSubmitting} onClick={() => { setKycSubmitting(true); setTimeout(() => { setKycStep(1); setKycSubmitting(false); showToast('Email đã được xác minh!'); }, 1500); }}>
                            {kycSubmitting ? '⏳ Đang gửi...' : '📨 Gửi mã xác minh'}
                          </button>
                        </div>
                      )}
                      {kycStep === 1 && (
                        <div className="flex-col gap-12">
                          <h4 style={{ fontWeight: 700, fontSize: '.88rem', margin: 0 }}>📱 Xác minh Số điện thoại</h4>
                          <div>
                            <label style={{ fontSize: '.72rem', color: 'var(--text-3)', display: 'block', marginBottom: 4 }}>Số điện thoại</label>
                            <input type="tel" placeholder="0912 345 678" defaultValue={user?.phone || ''} style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-1)', color: 'var(--text-1)', fontSize: '.82rem' }} />
                          </div>
                          <button className="btn btn-primary btn-sm" disabled={kycSubmitting} onClick={() => { setKycSubmitting(true); setTimeout(() => { setKycStep(2); setKycSubmitting(false); showToast('SĐT đã được xác minh qua OTP!'); }, 1500); }}>
                            {kycSubmitting ? '⏳ Đang gửi OTP...' : '📲 Gửi OTP xác minh'}
                          </button>
                        </div>
                      )}
                      {kycStep === 2 && (
                        <div className="flex-col gap-12">
                          <h4 style={{ fontWeight: 700, fontSize: '.88rem', margin: 0 }}>🪪 Xác minh Giấy tờ tùy thân</h4>
                          <div>
                            <label style={{ fontSize: '.72rem', color: 'var(--text-3)', display: 'block', marginBottom: 4 }}>Loại giấy tờ</label>
                            <select value={kycData.idType} onChange={e => setKycData(prev => ({ ...prev, idType: e.target.value }))} style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-1)', color: 'var(--text-1)', fontSize: '.82rem' }}>
                              <option value="cccd">CCCD (Căn cước công dân)</option>
                              <option value="cmnd">CMND</option>
                              <option value="passport">Hộ chiếu</option>
                            </select>
                          </div>
                          <div>
                            <label style={{ fontSize: '.72rem', color: 'var(--text-3)', display: 'block', marginBottom: 4 }}>Số giấy tờ</label>
                            <input type="text" placeholder="VD: 001234567890" value={kycData.idNumber} onChange={e => setKycData(prev => ({ ...prev, idNumber: e.target.value }))} style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-1)', color: 'var(--text-1)', fontSize: '.82rem' }} />
                          </div>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 12 }}>
                            {[
                              { key: 'idFront', label: 'Mặt trước', icon: '📄' },
                              { key: 'idBack', label: 'Mặt sau', icon: '📄' },
                              { key: 'selfie', label: 'Ảnh selfie + giấy tờ', icon: '🤳' },
                            ].map(f => (
                              <div key={f.key} style={{ textAlign: 'center', padding: 20, border: '2px dashed var(--border)', borderRadius: 12, cursor: 'pointer', background: kycData[f.key as keyof typeof kycData] ? 'rgba(16,185,129,.06)' : 'var(--bg-2)' }}
                                onClick={() => { setKycData(prev => ({ ...prev, [f.key]: 'uploaded' })); showToast(`Đã upload ${f.label}`); }}>
                                <div style={{ fontSize: '1.5rem', marginBottom: 6 }}>{kycData[f.key as keyof typeof kycData] ? '✅' : f.icon}</div>
                                <div style={{ fontSize: '.7rem', color: 'var(--text-3)' }}>{f.label}</div>
                              </div>
                            ))}
                          </div>
                          <button className="btn btn-primary btn-sm" disabled={kycSubmitting || !kycData.idNumber} onClick={() => { setKycSubmitting(true); setTimeout(() => { setKycStep(3); setKycSubmitting(false); showToast('Giấy tờ đã được gửi xác minh!'); }, 2000); }}>
                            {kycSubmitting ? '⏳ Đang xác minh...' : '🔍 Gửi xác minh giấy tờ'}
                          </button>
                        </div>
                      )}
                      {kycStep === 3 && (
                        <div className="flex-col gap-12">
                          <h4 style={{ fontWeight: 700, fontSize: '.88rem', margin: 0 }}>🏦 Liên kết Tài khoản ngân hàng</h4>
                          <div>
                            <label style={{ fontSize: '.72rem', color: 'var(--text-3)', display: 'block', marginBottom: 4 }}>Ngân hàng</label>
                            <select value={kycData.bankName} onChange={e => setKycData(prev => ({ ...prev, bankName: e.target.value }))} style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-1)', color: 'var(--text-1)', fontSize: '.82rem' }}>
                              <option value="">-- Chọn ngân hàng --</option>
                              {['Vietcombank', 'VietinBank', 'BIDV', 'Techcombank', 'MB Bank', 'ACB', 'Sacombank', 'TPBank', 'VPBank', 'Agribank'].map(b => <option key={b} value={b}>{b}</option>)}
                            </select>
                          </div>
                          <div>
                            <label style={{ fontSize: '.72rem', color: 'var(--text-3)', display: 'block', marginBottom: 4 }}>Số tài khoản</label>
                            <input type="text" placeholder="VD: 1234567890" value={kycData.bankAccount} onChange={e => setKycData(prev => ({ ...prev, bankAccount: e.target.value }))} style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-1)', color: 'var(--text-1)', fontSize: '.82rem' }} />
                          </div>
                          <div>
                            <label style={{ fontSize: '.72rem', color: 'var(--text-3)', display: 'block', marginBottom: 4 }}>Chủ tài khoản</label>
                            <input type="text" placeholder="VD: NGUYEN VAN A" value={kycData.bankHolder} onChange={e => setKycData(prev => ({ ...prev, bankHolder: e.target.value }))} style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-1)', color: 'var(--text-1)', fontSize: '.82rem', textTransform: 'uppercase' }} />
                          </div>
                          <button className="btn btn-primary btn-sm" disabled={kycSubmitting || !kycData.bankName || !kycData.bankAccount} onClick={() => { setKycSubmitting(true); setTimeout(() => { setKycStep(4); setKycSubmitting(false); showToast('Tài khoản ngân hàng đã được xác minh!'); }, 1500); }}>
                            {kycSubmitting ? '⏳ Đang xác minh...' : '🔗 Liên kết tài khoản'}
                          </button>
                        </div>
                      )}
                      {kycStep === 4 && (
                        <div className="flex-col gap-12" style={{ textAlign: 'center', padding: 20 }}>
                          <div style={{ fontSize: '3rem' }}>🎉</div>
                          <h4 style={{ fontWeight: 700, fontSize: '1rem', margin: 0 }}>Sắp hoàn tất!</h4>
                          <div style={{ fontSize: '.82rem', color: 'var(--text-3)' }}>Tất cả thông tin đã được gửi. Bấm xác nhận để hoàn tất KYC.</div>
                          <button className="btn btn-primary" onClick={() => { setKycStep(5); showToast('🎉 KYC đã hoàn tất — tài khoản được xác minh đầy đủ!'); }}>✅ Hoàn tất xác minh</button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Verified summary */}
                  {kycStep >= 5 && (
                    <div className="card" style={{ padding: 20, border: '1px solid rgba(16,185,129,.3)', background: 'rgba(16,185,129,.04)' }}>
                      <div className="flex gap-12" style={{ alignItems: 'center', marginBottom: 16 }}>
                        <span style={{ fontSize: '1.5rem' }}>🛡️</span>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: '.88rem', color: 'var(--c4-500)' }}>Tài khoản đã xác minh đầy đủ</div>
                          <div style={{ fontSize: '.72rem', color: 'var(--text-3)' }}>Bạn đã hoàn tất tất cả các bước KYC</div>
                        </div>
                      </div>
                      <div className="flex-col gap-6">
                        {[
                          { label: 'Email', value: userEmail, icon: '📧' },
                          { label: 'SĐT', value: user?.phone || '0912 ***  678', icon: '📱' },
                          { label: 'Giấy tờ', value: kycData.idType === 'cccd' ? 'CCCD' : kycData.idType === 'cmnd' ? 'CMND' : 'Hộ chiếu', icon: '🪪' },
                          { label: 'Ngân hàng', value: kycData.bankName || 'Vietcombank ****1234', icon: '🏦' },
                        ].map((item, i) => (
                          <div key={i} className="flex" style={{ justifyContent: 'space-between', padding: '8px 0', borderBottom: i < 3 ? '1px solid var(--border)' : 'none' }}>
                            <span style={{ fontSize: '.82rem', color: 'var(--text-3)' }}>{item.icon} {item.label}</span>
                            <span style={{ fontSize: '.82rem', fontWeight: 600 }}>{item.value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}

            {settingsTab === 'password' && (
              <div className="card" style={{ padding: 20 }}>
                <div className="flex-col gap-12">
                  <div>
                    <label style={{ fontSize: '.72rem', color: 'var(--text-3)', display: 'block', marginBottom: 4 }}>Mật khẩu hiện tại</label>
                    <input type="password" placeholder="••••••••" style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-1)', color: 'var(--text-1)', fontSize: '.82rem' }} />
                  </div>
                  <div>
                    <label style={{ fontSize: '.72rem', color: 'var(--text-3)', display: 'block', marginBottom: 4 }}>Mật khẩu mới</label>
                    <input type="password" placeholder="••••••••" style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-1)', color: 'var(--text-1)', fontSize: '.82rem' }} />
                  </div>
                  <button className="btn btn-primary btn-sm" style={{ alignSelf: 'flex-start' }} onClick={() => showToast('Mật khẩu đã được cập nhật thành công')}>Cập nhật mật khẩu</button>
                </div>
              </div>
            )}

            {settingsTab === 'koc' && (
              <div className="flex-col gap-16">
                {settingsSections.map((section, si) => (
                  <div key={si} className="card" style={{ padding: 20 }}>
                    <div className="label" style={{ marginBottom: 12 }}>{section.title.toUpperCase()}</div>
                    <div className="flex-col gap-10">
                      {section.fields.map((f, fi) => (
                        <div key={fi} className="flex" style={{ justifyContent: 'space-between', padding: '8px 0', borderBottom: fi < section.fields.length - 1 ? '1px solid var(--border)' : 'none' }}>
                          <span style={{ fontSize: '.82rem', color: 'var(--text-3)' }}>{f.label}</span>
                          <span style={{ fontSize: '.82rem', fontWeight: 600 }}>{f.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        );

      default:
        return null;
    }
  };

  /* ── Render ──────────────────────────────────────── */
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', background: 'var(--bg-0)' }}>
        {/* Mobile sidebar toggle button */}
        <button
          className="koc-mobile-menu-btn"
          onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}
        >
          {mobileSidebarOpen ? '✕' : '☰'}
        </button>

        {/* Mobile overlay */}
        {mobileSidebarOpen && <div className="koc-mobile-overlay" onClick={() => setMobileSidebarOpen(false)} />}

        <div className="dash-wrap" style={{ flex: 1, minHeight: 0 }}>
          {/* Sidebar */}
          <div className={`dash-sidebar ${mobileSidebarOpen ? 'mobile-open' : ''}`} style={{ width: 240, minWidth: 240 }}>
            {/* Sidebar header — fixed */}
            <div className="dash-sidebar-header">
              <div style={{ padding: '0 0 10px', borderBottom: '1px solid var(--border)' }}>
                <div className="flex gap-8">
                  <div style={{
                    width: 40, height: 40, borderRadius: '50%',
                    background: 'var(--chakra-flow)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '1rem', fontWeight: 700,
                  }}>{userName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}</div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '.82rem' }}>{userName}</div>
                    <span className="badge badge-c6" style={{ marginTop: 2 }}>KOC Level 18</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Sidebar nav — scrollable */}
            <div className="dash-sidebar-nav">
              {/* ── Accordion groups ── */}
              {sidebarGroups.map(group => {
                const isOpen = openGroups[group.key];
                const hasActiveItem = group.items.some(i => i.key === activeNav);
                return (
                  <div key={group.key} style={{ marginBottom: 4 }}>
                    {/* Group header — clickable accordion */}
                    <div
                      onClick={() => toggleGroup(group.key)}
                      style={{
                        padding: '10px 10px 10px 8px', marginBottom: isOpen ? 2 : 0,
                        display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer',
                        borderLeft: `3px solid ${group.color}`, marginLeft: 4,
                        borderRadius: '0 8px 8px 0',
                        background: hasActiveItem ? `${group.color}10` : 'transparent',
                        transition: 'background .2s',
                      }}
                    >
                      <span style={{ fontSize: '.9rem' }}>{group.icon}</span>
                      <span style={{ flex: 1, fontSize: '.72rem', fontWeight: 800, letterSpacing: '.06em', textTransform: 'uppercase', color: group.color }}>{t(group.label)}</span>
                      <span style={{ fontSize: '.6rem', color: 'var(--text-4)', transition: 'transform .2s', transform: isOpen ? 'rotate(180deg)' : 'rotate(0)' }}>▼</span>
                    </div>

                    {/* Group items — collapsible */}
                    <div style={{
                      maxHeight: isOpen ? `${group.items.length * 40 + 10}px` : '0',
                      overflow: 'hidden', transition: 'max-height .25s ease-in-out',
                    }}>
                      {group.items.map(item => (
                        <div
                          key={item.key}
                          className={`dash-nav-item ${activeNav === item.key ? 'on' : ''}`}
                          onClick={() => handleNavClick(group.key, item.key)}
                          style={{ position: 'relative', paddingLeft: 20 }}
                        >
                          <span className="dash-nav-icon">{item.icon}</span>
                          <span style={{ flex: 1 }}>{t(item.label)}</span>
                          {item.key === 'orders' && pendingOrderCount > 0 && (
                            <span style={{ background: '#ef4444', color: '#fff', borderRadius: 10, padding: '1px 7px', fontSize: '.6rem', fontWeight: 700 }}>{pendingOrderCount}</span>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Divider */}
                    <div style={{ height: 1, background: 'var(--border)', margin: '6px 0' }} />
                  </div>
                );
              })}

              {/* Settings */}
              <div
                className={`dash-nav-item ${activeNav === 'settings' ? 'on' : ''}`}
                onClick={() => setActiveNav('settings')}
              >
                <span className="dash-nav-icon">⚙️</span>
                <span style={{ flex: 1 }}>{t('koc.sidebar.settings')}</span>
              </div>
            </div>

            {/* Sidebar footer — fixed */}
            <div className="dash-sidebar-footer">
              <div style={{ height: 1, background: 'var(--border)', margin: '12px 0' }} />
              <div
                className="dash-nav-item"
                onClick={handleLogout}
                style={{ color: '#ef4444', cursor: 'pointer' }}
              >
                <span className="dash-nav-icon">🚪</span>
                <span style={{ flex: 1 }}>{t('koc.sidebar.logout')}</span>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="dash-content">
            {toast && <Toast message={toast} onDone={clearToast} />}
            {renderContent()}
          </div>
        </div>

      {/* ── Affiliate Product Picker Modal ── */}
      {showAffPicker && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.6)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
          onClick={() => setShowAffPicker(false)}>
          <div style={{ background: 'var(--surface-card)', borderRadius: 16, padding: 24, width: '100%', maxWidth: 520, maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontWeight: 700, fontSize: '1rem' }}>🔗 Chọn sản phẩm để tạo link affiliate</h3>
              <button onClick={() => setShowAffPicker(false)} style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: 'var(--text-3)' }}>✕</button>
            </div>
            <input
              value={pickerSearch} onChange={e => setPickerSearch(e.target.value)}
              placeholder="🔍 Tìm sản phẩm..."
              style={{ padding: '9px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-2)', color: 'var(--text-1)', fontSize: '.85rem', marginBottom: 12, outline: 'none' }}
            />
            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {pickerLoading ? (
                <div style={{ textAlign: 'center', padding: 32, color: 'var(--text-3)' }}>Đang tải sản phẩm...</div>
              ) : pickerProducts.filter(p => !pickerSearch || p.name.toLowerCase().includes(pickerSearch.toLowerCase())).length === 0 ? (
                <div style={{ textAlign: 'center', padding: 32, color: 'var(--text-3)', fontSize: '.85rem' }}>
                  {pickerProducts.length === 0 ? 'Chưa có sản phẩm nào. Vendor cần đăng sản phẩm trước.' : 'Không tìm thấy sản phẩm.'}
                </div>
              ) : pickerProducts
                .filter(p => !pickerSearch || p.name.toLowerCase().includes(pickerSearch.toLowerCase()))
                .map(p => (
                  <button key={p.id} onClick={() => generateAffLink(p.id, p.name)}
                    style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--bg-1)', cursor: 'pointer', textAlign: 'left', transition: 'var(--t-fast)' }}>
                    <div style={{ width: 40, height: 40, borderRadius: 8, background: 'var(--bg-2)', flexShrink: 0, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem' }}>
                      {p.image ? <img src={p.image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : '📦'}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: '.85rem', color: 'var(--text-1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</div>
                      <div style={{ fontSize: '.75rem', color: 'var(--text-3)' }}>{p.price?.toLocaleString('vi-VN')}₫</div>
                    </div>
                    <span style={{ fontSize: '.75rem', color: 'var(--c4-500)', fontWeight: 600, flexShrink: 0 }}>+ Lấy link</span>
                  </button>
                ))
              }
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
