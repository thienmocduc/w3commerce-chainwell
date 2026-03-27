import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@hooks/useAuth';

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
    key: 'koc', label: 'KOC PRO', color: 'var(--c6-500)', icon: '⭐',
    items: [
      { key: 'overview',    icon: '📊', label: 'Tổng quan KOC' },
      { key: 'content',     icon: '📝', label: 'Nội dung & Review' },
      { key: 'campaigns',   icon: '📢', label: 'Chiến dịch' },
      { key: 'commission',  icon: '💰', label: 'Hoa hồng & Rút tiền' },
      { key: 'automkt',     icon: '🤖', label: 'Marketing tự động' },
      { key: 'community',   icon: '👥', label: 'Cộng đồng' },
      { key: 'performance', icon: '📈', label: 'Hiệu suất & Thống kê' },
      { key: 'ranking',     icon: '🏆', label: 'Xếp hạng & Giải thưởng' },
      { key: 'token',       icon: '🪙', label: 'Creator Token' },
      { key: 'missions',    icon: '🎯', label: 'Nhiệm vụ & XP' },
      { key: 'convert',     icon: '🔄', label: 'Đổi XP → WK3' },
    ],
  },
  {
    key: 'aff', label: 'AFFILIATE', color: '#f59e0b', icon: '🔗',
    items: [
      { key: 'affiliate',   icon: '🔗', label: 'Link Affiliate' },
      { key: 'share',       icon: '📤', label: 'Chia sẻ đa nền tảng' },
      { key: 'affTeam',     icon: '🌳', label: 'Cây đội nhóm' },
      { key: 'affStats',    icon: '📊', label: 'Thống kê Affiliate' },
      { key: 'affPayout',   icon: '💸', label: 'Hoa hồng Affiliate' },
      { key: 'affMaterials',icon: '🖼️', label: 'Tài liệu quảng bá' },
    ],
  },
  {
    key: 'buyer', label: 'MUA SẮM', color: 'var(--c4-500)', icon: '🛒',
    items: [
      { key: 'orders',    icon: '📦', label: 'Đơn hàng của tôi' },
      { key: 'tracking',  icon: '🚚', label: 'Theo dõi đơn hàng' },
      { key: 'history',   icon: '🕐', label: 'Lịch sử mua hàng' },
      { key: 'wkpay',     icon: '👛', label: 'Ví WK Pay' },
      { key: 'payments',  icon: '💳', label: 'Thanh toán' },
      { key: 'vouchers',  icon: '🎟️', label: 'Kho Voucher' },
      { key: 'favorites', icon: '❤️', label: 'Yêu thích' },
    ],
  },
];

/* Backward compat — flat lists for renderContent switch */
const buyerItems = sidebarGroups.find(g => g.key === 'buyer')!.items;
const kocItems = [...sidebarGroups.find(g => g.key === 'koc')!.items, { key: 'settings', icon: '⚙️', label: 'Cài đặt' }];

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

const allOrders: Order[] = [
  { id: 'ORD-2026-0147', date: '2026-03-25', items: [{ name: 'Trà Ô Long Đài Loan Premium', qty: 2, price: 194500 }], total: 389000, status: 'shipping', payment: 'VNPay', trackingCode: 'VN26032500147' },
  { id: 'ORD-2026-0143', date: '2026-03-23', items: [{ name: 'Serum Vitamin C 20%', qty: 1, price: 459000 }], total: 459000, status: 'delivered', payment: 'MoMo', reviewed: false },
  { id: 'ORD-2026-0138', date: '2026-03-21', items: [{ name: 'Cà Phê Arabica Đà Lạt', qty: 1, price: 245000 }], total: 245000, status: 'delivered', payment: 'Crypto', reviewed: true },
  { id: 'ORD-2026-0129', date: '2026-03-18', items: [{ name: 'Mật Ong Rừng Tây Nguyên', qty: 1, price: 285000 }], total: 285000, status: 'delivered', payment: 'VNPay', reviewed: true },
  { id: 'ORD-2026-0121', date: '2026-03-15', items: [{ name: 'Bột Collagen Cá Biển', qty: 1, price: 890000 }], total: 890000, status: 'delivered', payment: 'Crypto', reviewed: false },
  { id: 'ORD-2026-0115', date: '2026-03-12', items: [{ name: 'Dầu Dừa Nguyên Chất Bến Tre', qty: 2, price: 135000 }], total: 270000, status: 'confirmed', payment: 'MoMo' },
  { id: 'ORD-2026-0108', date: '2026-03-08', items: [{ name: 'Nước Mắm Phú Quốc', qty: 3, price: 95000 }, { name: 'Tiêu Đen Phú Quốc', qty: 1, price: 120000 }], total: 405000, status: 'pending', payment: 'VNPay' },
  { id: 'ORD-2026-0099', date: '2026-03-04', items: [{ name: 'Kem Chống Nắng SPF50+', qty: 1, price: 520000 }], total: 520000, status: 'cancelled', payment: 'MoMo' },
  { id: 'ORD-2026-0091', date: '2026-02-28', items: [{ name: 'Trà Hoa Cúc Organic', qty: 1, price: 175000 }], total: 175000, status: 'return', payment: 'VNPay' },
];

const orderStatusConfig: Record<string, { label: string; badge: string }> = {
  pending: { label: 'Chờ xác nhận', badge: 'badge-c7' },
  confirmed: { label: 'Đã xác nhận', badge: 'badge-c5' },
  packing: { label: 'Đang đóng gói', badge: 'badge-c5' },
  shipping: { label: 'Đang giao', badge: 'badge-c5' },
  delivered: { label: 'Đã giao', badge: 'badge-c4' },
  cancelled: { label: 'Đã hủy', badge: 'badge-rose' },
  return: { label: 'Đổi/Trả', badge: 'badge-c7' },
};

/* ── Tracking steps ──────────────────────────────── */
const trackingSteps = ['Đặt hàng', 'Xác nhận', 'Đang đóng gói', 'Đang vận chuyển', 'Đã giao'];
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
  { token: 'MATIC', amount: '245.50', usd: '$196.40', icon: 'M', color: 'var(--c7-500)' },
  { token: 'USDT', amount: '1,250.00', usd: '$1,250.00', icon: 'U', color: 'var(--c4-500)' },
  { token: 'WK', amount: '8,420', usd: '$842.00', icon: 'W', color: 'var(--c6-500)' },
];

/* ── WK Pay data ─────────────────────────────────── */
const wkPayData = {
  balanceVND: 2450000,
  balanceWK: 8420,
  wkPrice: 0.10,
  wkChange24h: +3.2,
  transactions: [
    { id: 'WKT-001', type: 'Nạp tiền', source: 'Vietcombank', amount: 1000000, date: '2026-03-24', status: 'success' },
    { id: 'WKT-002', type: 'Thanh toán', source: 'ORD-2026-0108', amount: -405000, date: '2026-03-08', status: 'success' },
    { id: 'WKT-003', type: 'Nhận WK Token', source: 'Reward Lv.7', amount: 200, date: '2026-03-20', status: 'success' },
    { id: 'WKT-004', type: 'Chuyển WK Token', source: 'Tới 0x8a1...f3c2', amount: -50, date: '2026-03-18', status: 'success' },
    { id: 'WKT-005', type: 'Rút tiền', source: 'Vietcombank', amount: -500000, date: '2026-03-15', status: 'success' },
  ],
};

/* ── Favorites ───────────────────────────────────── */
const favoriteProducts = [
  { id: 1, name: 'Trà Ô Long Đài Loan Premium', price: 389000, rating: 4.9, reviews: 234, vendor: 'WellKOC Origin', emoji: '🍵', alert: false },
  { id: 2, name: 'Serum Vitamin C 20%', price: 459000, rating: 4.8, reviews: 189, vendor: 'K-Beauty VN', emoji: '✨', alert: true },
  { id: 3, name: 'Mật Ong Rừng Tây Nguyên', price: 285000, rating: 4.7, reviews: 156, vendor: 'GreenViet', emoji: '🍯', alert: false },
  { id: 4, name: 'Cà Phê Arabica Đà Lạt', price: 245000, rating: 4.9, reviews: 312, vendor: 'Đà Lạt Farm', emoji: '☕', alert: true },
  { id: 5, name: 'Nước Mắm Phú Quốc Truyền Thống', price: 95000, rating: 4.6, reviews: 478, vendor: 'Phú Quốc Authentic', emoji: '🐟', alert: false },
  { id: 6, name: 'Bột Collagen Cá Biển', price: 890000, rating: 4.5, reviews: 98, vendor: 'Sea Beauty', emoji: '💎', alert: false },
];

/* ═══════════════════════════════════════════════════ */
/*  KOC PRO DATA                                      */
/* ═══════════════════════════════════════════════════ */

/* ── KPI data ────────────────────────────────────── */
const kpiData = [
  { label: 'Hoa hồng tháng', value: '12.8M₫', delta: '+18%', up: true, color: 'var(--c4-500)' },
  { label: 'Doanh thu affiliate', value: '45.2M₫', delta: '+23% MoM', up: true, color: 'var(--c5-500)' },
  { label: 'Conversions', value: '1,247', delta: '+156 tuần', up: true, color: 'var(--c6-500)' },
  { label: 'Followers', value: '12,847', delta: '+892 tháng', up: true, color: 'var(--c7-500)' },
  { label: 'XP Points', value: '24,450', delta: 'Level 18', up: true, color: 'var(--gold-400)' },
];

/* ── Overview chart data ─────────────────────────── */
const monthlyBars = [45, 62, 38, 75, 89, 52, 70, 85, 60, 95, 78, 88];
const monthLabels = ['T1','T2','T3','T4','T5','T6','T7','T8','T9','T10','T11','T12'];

const recentActivities = [
  { time: '10 phút trước', text: 'Đơn hàng #TX-092 xác nhận — hoa hồng +185.000₫', color: 'var(--c4-500)' },
  { time: '1 giờ trước', text: 'Video "Review Serum C" đạt 5.000 views', color: 'var(--c5-500)' },
  { time: '3 giờ trước', text: 'Agent Content AI hoàn thành 12 bài viết', color: 'var(--c6-500)' },
  { time: '5 giờ trước', text: 'Nhận badge "Top KOC Tuần" — +500 XP', color: 'var(--gold-400)' },
  { time: 'Hôm qua', text: 'Rút 5.000.000₫ về Vietcombank — thành công', color: 'var(--c7-500)' },
  { time: 'Hôm qua', text: 'Khách hàng mới F1: Nguyễn Thị Mai', color: 'var(--c4-500)' },
];

/* ── Content posts ───────────────────────────────── */
const contentPosts = [
  { id: 1, type: 'review', title: 'Review Trà Ô Long Đài Loan - Hương vị authentic', date: '2026-03-25', views: 3245, likes: 187, comments: 42, revenue: '1.2M₫', emoji: '🍵' },
  { id: 2, type: 'video', title: 'Unboxing Serum Vitamin C - So sánh 3 loại', date: '2026-03-23', views: 5678, likes: 312, comments: 89, revenue: '2.1M₫', emoji: '🎬' },
  { id: 3, type: 'review', title: 'Mật ong rừng Tây Nguyên có thật sự organic?', date: '2026-03-21', views: 4123, likes: 256, comments: 67, revenue: '980K₫', emoji: '🍯' },
  { id: 4, type: 'article', title: 'Top 5 sản phẩm skincare organic tốt nhất 2026', date: '2026-03-18', views: 8945, likes: 523, comments: 134, revenue: '3.5M₫', emoji: '📝' },
  { id: 5, type: 'video', title: 'Livestream Q&A - Cách bắt đầu với KOC', date: '2026-03-15', views: 12340, likes: 890, comments: 256, revenue: '0₫', emoji: '📺' },
];

/* ── Campaigns ───────────────────────────────────── */
const campaigns = [
  { id: 1, name: 'Spring Sale 2026', brand: 'WellKOC Origin', status: 'active', commission: '20%', earned: '1.2M₫', startDate: '2026-03-01', endDate: '2026-03-31' },
  { id: 2, name: 'Organic Week', brand: 'GreenViet', status: 'active', commission: '25%', earned: '890K₫', startDate: '2026-03-15', endDate: '2026-03-22' },
  { id: 3, name: 'Tết Holiday', brand: 'Multiple', status: 'completed', commission: '18%', earned: '3.4M₫', startDate: '2026-01-15', endDate: '2026-02-15' },
  { id: 4, name: 'Beauty Festival', brand: 'K-Beauty VN', status: 'upcoming', commission: '22%', earned: '—', startDate: '2026-04-01', endDate: '2026-04-15' },
];
const campaignStatusConfig: Record<string, { label: string; badge: string }> = {
  active: { label: 'Đang chạy', badge: 'badge-c4' },
  completed: { label: 'Hoàn thành', badge: 'badge-c5' },
  upcoming: { label: 'Sắp tới', badge: 'badge-gold' },
};

/* ── Commission data ─────────────────────────────── */
const commissionData = [
  { id: 'TX-001', product: 'Trà Ô Long Premium', buyer: 'Nguyễn Văn A', amount: '389.000₫', commission: '70.020₫', rate: '18%', status: 'confirmed', date: '2026-03-25', txHash: '0x1a2b3c4d5e6f7890abcdef1234567890abcdef12' },
  { id: 'TX-002', product: 'Serum Vitamin C', buyer: 'Trần Thị B', amount: '459.000₫', commission: '100.980₫', rate: '22%', status: 'pending', date: '2026-03-24', txHash: '' },
  { id: 'TX-003', product: 'Mật Ong Rừng', buyer: 'Lê Văn C', amount: '285.000₫', commission: '42.750₫', rate: '15%', status: 'confirmed', date: '2026-03-24', txHash: '0x7f8g9h0i1j2k3l4m5n6o7p8q9r0s1t2u3v4w5x6y' },
  { id: 'TX-004', product: 'Cà Phê Arabica', buyer: 'Phạm Thị D', amount: '245.000₫', commission: '49.000₫', rate: '20%', status: 'processing', date: '2026-03-23', txHash: '' },
  { id: 'TX-005', product: 'Bột Collagen', buyer: 'Hoàng Văn E', amount: '890.000₫', commission: '222.500₫', rate: '25%', status: 'confirmed', date: '2026-03-23', txHash: '0x9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b8c' },
];
const commStatusConfig: Record<string, { label: string; badge: string }> = {
  confirmed: { label: 'Đã xác nhận', badge: 'badge-c4' },
  pending: { label: 'Chờ duyệt', badge: 'badge-gold' },
  processing: { label: 'Đang xử lý', badge: 'badge-c5' },
};

/* ── Withdrawal history ──────────────────────────── */
const withdrawalHistory = [
  { id: 'W-001', method: 'Vietcombank', amount: '5.000.000₫', fee: '25.000₫', status: 'completed', date: '2026-03-20', note: 'VCB **** 1234' },
  { id: 'W-002', method: 'MoMo', amount: '2.000.000₫', fee: '10.000₫', status: 'completed', date: '2026-03-15', note: '0909****567' },
  { id: 'W-003', method: 'USDT (Polygon)', amount: '150 USDT', fee: '0.5 USDT', status: 'completed', date: '2026-03-10', note: '0xA1B2...5678' },
  { id: 'W-004', method: 'VNPay', amount: '1.500.000₫', fee: '7.500₫', status: 'pending', date: '2026-03-26', note: 'VNPay Wallet' },
];

/* ── Auto MKT Agents ─────────────────────────────── */
const mktAgents = [
  { id: 1, name: 'Content AI Writer', type: 'Content AI', status: 'running', budget: '500.000₫', spent: '320.000₫', schedule: 'Hàng ngày 8:00', impressions: 45200, clicks: 3420, conversions: 187, cost: '320.000₫', roi: '+285%' },
  { id: 2, name: 'Social Engagement Bot', type: 'Social Bot', status: 'running', budget: '300.000₫', spent: '180.000₫', schedule: '24/7', impressions: 28900, clicks: 2100, conversions: 95, cost: '180.000₫', roi: '+210%' },
  { id: 3, name: 'Analytics Reporter', type: 'Analytics', status: 'paused', budget: '200.000₫', spent: '150.000₫', schedule: 'Thứ 2 hàng tuần', impressions: 0, clicks: 0, conversions: 0, cost: '150.000₫', roi: 'N/A' },
  { id: 4, name: 'Email Nurture Flow', type: 'Email AI', status: 'completed', budget: '400.000₫', spent: '400.000₫', schedule: 'Hoàn thành', impressions: 12500, clicks: 1890, conversions: 234, cost: '400.000₫', roi: '+340%' },
];
const agentTypes = ['Content AI', 'Analytics', 'Social Bot', 'Email AI', 'SEO Optimizer', 'Ad Manager'];
const agentStatusConfig: Record<string, { label: string; badge: string }> = {
  running: { label: 'Đang chạy', badge: 'badge-c4' },
  paused: { label: 'Tạm dừng', badge: 'badge-gold' },
  completed: { label: 'Hoàn thành', badge: 'badge-c5' },
};

/* ── Affiliate & CRM ─────────────────────────────── */
const affiliateLinks = [
  { id: 1, product: 'Trà Ô Long Premium', link: 'https://wellkoc.vn/r/mh-tra-001', clicks: 1245, conversions: 89, revenue: '4.2M₫' },
  { id: 2, product: 'Serum Vitamin C', link: 'https://wellkoc.vn/r/mh-serum-002', clicks: 2340, conversions: 156, revenue: '8.9M₫' },
  { id: 3, product: 'Bột Collagen Fish', link: 'https://wellkoc.vn/r/mh-collagen-003', clicks: 890, conversions: 45, revenue: '2.8M₫' },
];
const partnerStats = { f1: 47, f2: 189, totalNetwork: 1245 };
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

/* ── Community ───────────────────────────────────── */
const communityStats = { totalMembers: 4827, newThisMonth: 342, activeRate: '68.5%' };
const communityMembers = [
  { id: 1, name: 'Nguyễn Văn Anh', joinDate: '2026-01-15', tier: 'Gold', purchases: 18, status: 'active' },
  { id: 2, name: 'Trần Thị Bích', joinDate: '2026-02-08', tier: 'Silver', purchases: 9, status: 'active' },
  { id: 3, name: 'Lê Hoàng Nam', joinDate: '2025-11-20', tier: 'Platinum', purchases: 45, status: 'active' },
  { id: 4, name: 'Phạm Minh Tú', joinDate: '2026-03-01', tier: 'Bronze', purchases: 3, status: 'inactive' },
  { id: 5, name: 'Đỗ Thị Hương', joinDate: '2025-12-10', tier: 'Gold', purchases: 24, status: 'active' },
];

/* ── Performance ─────────────────────────────────── */
const perfKpis = [
  { label: 'Tổng khách hàng', value: '4,827', color: 'var(--c4-500)' },
  { label: 'Khách hàng mới', value: '342', color: 'var(--c5-500)' },
  { label: 'Số người mua hàng', value: '1,892', color: 'var(--c6-500)' },
  { label: 'Tỷ lệ chuyển đổi', value: '12.3%', color: 'var(--c7-500)' },
  { label: 'Doanh thu/khách', value: '289.000₫', color: 'var(--gold-400)' },
];
const funnelSteps = [
  { label: 'Lượt truy cập', value: 48500, pct: 100 },
  { label: 'Xem sản phẩm', value: 22400, pct: 46 },
  { label: 'Thêm giỏ hàng', value: 8900, pct: 18 },
  { label: 'Thanh toán', value: 4827, pct: 10 },
];

/* ── Ranking & Rewards ───────────────────────────── */
const myRank = { rank: 47, total: 12847, tier: 'Diamond', xp: 24450, revenue: '245.000.000₫' };
const leaderboard = [
  { rank: 1, name: 'Trần Khánh Linh', revenue: '1.2B₫', commission: '180M₫', badges: 24, tier: 'Legend' },
  { rank: 2, name: 'Nguyễn Đức Mạnh', revenue: '890M₫', commission: '134M₫', badges: 21, tier: 'Legend' },
  { rank: 3, name: 'Phạm Thu Hà', revenue: '720M₫', commission: '108M₫', badges: 19, tier: 'Diamond' },
  { rank: 4, name: 'Lê Quang Huy', revenue: '650M₫', commission: '97M₫', badges: 18, tier: 'Diamond' },
  { rank: 5, name: 'Vũ Thị Ngọc', revenue: '580M₫', commission: '87M₫', badges: 17, tier: 'Diamond' },
  { rank: 6, name: 'Đặng Minh Tuấn', revenue: '510M₫', commission: '76M₫', badges: 15, tier: 'Master' },
  { rank: 7, name: 'Hoàng Thùy Dung', revenue: '480M₫', commission: '72M₫', badges: 14, tier: 'Master' },
  { rank: 8, name: 'Bùi Văn Toàn', revenue: '420M₫', commission: '63M₫', badges: 13, tier: 'Master' },
  { rank: 9, name: 'Ngô Thị Yến', revenue: '380M₫', commission: '57M₫', badges: 12, tier: 'Master' },
  { rank: 10, name: 'Trương Công Sơn', revenue: '350M₫', commission: '52M₫', badges: 11, tier: 'Master' },
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
const myVouchers = [
  { code: 'WELLKOC50', desc: 'Giảm 50.000₫ cho đơn từ 200K', expires: '30/04/2026', used: false },
  { code: 'FREESHIP', desc: 'Miễn phí vận chuyển', expires: '15/04/2026', used: false },
  { code: 'DPP20', desc: 'Giảm 20% sản phẩm DPP Verified', expires: '25/04/2026', used: false },
];
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
  <td style={{ padding: '12px 14px', fontFamily: mono ? 'var(--ff-display)' : undefined, fontWeight: bold ? 700 : undefined, color, ...s }}>{children}</td>
);

/* ══════════════════════════════════════════════════ */
/*  MAIN COMPONENT                                   */
/* ══════════════════════════════════════════════════ */
export default function KOC() {
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
  const [commBalance, setCommBalance] = useState(8450000);
  const [showWithdrawForm, setShowWithdrawForm] = useState(false);
  const [withdrawAmt, setWithdrawAmt] = useState('');

  /* ── Vouchers state ─── */
  const [vouchers, setVouchers] = useState(myVouchers);

  /* ── XP state (shared across missions/voucher/convert) ─── */
  const [xp, setXp] = useState(24450);

  /* ── Favorites state ─── */
  const [favs, setFavs] = useState(favoriteProducts);

  /* ── Affiliate links state ─── */
  const [affLinks, setAffLinks] = useState(affiliateLinks);

  /* ── Settings edit mode ─── */
  const [settingsEditing, setSettingsEditing] = useState(false);
  const [settingsFormData, setSettingsFormData] = useState({ name: 'Minh Hương', email: 'minhhuong@example.com', phone: '0912 345 678', handle: '@minhhuong.koc', bio: 'KOC chuyên review organic & wellness' });

  /* ── Missions state ─── */
  const [claimedMissions, setClaimedMissions] = useState<Set<string>>(new Set(['Đăng nhập hôm nay']));

  /* ── Convert state ─── */
  const [convertAmount, setConvertAmount] = useState(500);
  const [wk3Balance, setWk3Balance] = useState(42.5);

  /* ── Token form state ─── */
  const [tokenAction, setTokenAction] = useState<'buy' | 'sell' | null>(null);

  /* ── QR modal ─── */
  const [showQR, setShowQR] = useState(false);

  const toggleGroup = (key: string) => setOpenGroups(prev => ({ ...prev, [key]: !prev[key] }));
  // Auto-open group when clicking a nav item inside it
  const handleNavClick = (groupKey: string, itemKey: string) => {
    setActiveNav(itemKey);
    if (!openGroups[groupKey]) setOpenGroups(prev => ({ ...prev, [groupKey]: true }));
  };
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const userName = user?.name || 'KOC';
  const userEmail = user?.email || '';

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
            <h2 style={{ fontWeight: 700, fontSize: '1.1rem', marginBottom: 16 }}>Đơn Hàng Của Tôi</h2>
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
                        <span className={`badge ${sc.badge}`}>{sc.label}</span>
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
            <h2 style={{ fontWeight: 700, fontSize: '1.1rem', marginBottom: 20 }}>Theo Dõi Đơn Hàng</h2>
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
                          <div style={{ width: `${(step / (trackingSteps.length - 1)) * 100}%`, height: '100%', background: 'var(--c4-500)', transition: 'width .4s ease' }} />
                        </div>
                        {trackingSteps.map((s, i) => {
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
                              <div style={{ fontSize: '.65rem', fontWeight: isCurrent ? 700 : 400, color: isActive ? 'var(--text-1)' : 'var(--text-4)', marginTop: 8, textAlign: 'center' }}>{s}</div>
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
            <h2 style={{ fontWeight: 700, fontSize: '1.1rem', marginBottom: 16 }}>Lịch Sử Mua Hàng</h2>
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
                          <TD><span className={`badge ${sc.badge}`}>{sc.label}</span></TD>
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
            <h2 style={{ fontWeight: 700, fontSize: '1.1rem', marginBottom: 20 }}>Ví WK Pay</h2>
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
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 24 }}>
              {[
                { label: 'Nạp tiền', desc: 'Từ ngân hàng/MoMo', icon: '💰' },
                { label: 'Rút tiền', desc: 'Về ngân hàng', icon: '🏦' },
                { label: 'Chuyển WK Token', desc: 'Tới ví khác', icon: '📤' },
              ].map((a, i) => (
                <div key={i} className="card card-hover" style={{ padding: 16, textAlign: 'center', cursor: 'pointer' }} onClick={() => showToast(`${a.label} — tính năng sẽ sớm ra mắt`)}>
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
            <h2 style={{ fontWeight: 700, fontSize: '1.1rem', marginBottom: 20 }}>Thanh Toán</h2>
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
                    <button className="btn btn-secondary btn-sm" style={{ fontSize: '.7rem' }} onClick={() => showToast(`Không thể xóa ${m.label} trong bản demo`)}>Xóa</button>
                  </div>
                </div>
              ))}
              <button className="btn btn-secondary btn-sm" style={{ alignSelf: 'flex-start' }} onClick={() => showToast('Tính năng thêm phương thức sẽ sớm ra mắt')}>+ Thêm phương thức</button>
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
            <h2 style={{ fontWeight: 700, fontSize: '1.1rem', marginBottom: 20 }}>Sản Phẩm Yêu Thích</h2>
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
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12, marginBottom: 24 }}>
              {kpiData.map((kpi, i) => (
                <div key={i} className="kpi-card">
                  <div className="kpi-label">{kpi.label}</div>
                  <div className="kpi-val" style={{ color: kpi.color }}>{kpi.label === 'XP Points' ? xp.toLocaleString() : kpi.value}</div>
                  <div className={`kpi-delta ${kpi.up ? 'delta-up' : 'delta-down'}`}>
                    {kpi.up ? '↑' : '↓'} {kpi.delta}
                  </div>
                </div>
              ))}
            </div>
            <div className="chart-bar-wrap" style={{ marginBottom: 24 }}>
              <div className="flex" style={{ justifyContent: 'space-between', marginBottom: 8 }}>
                <span className="label">DOANH THU 12 THÁNG GẦN ĐÂY</span>
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
              <div className="label" style={{ marginBottom: 14 }}>HOẠT ĐỘNG GẦN ĐÂY</div>
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
              <h2 style={{ fontWeight: 700, fontSize: '1.1rem' }}>Quản Lý Nội Dung</h2>
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
            <h2 style={{ fontWeight: 700, fontSize: '1.1rem', marginBottom: 20 }}>Chiến Dịch</h2>
            <div className="flex-col gap-12">
              {camps.map(camp => {
                const sc = campaignStatusConfig[camp.status];
                return (
                  <div key={camp.id} className="card" style={{ padding: '20px 24px' }}>
                    <div className="flex" style={{ justifyContent: 'space-between', marginBottom: 10 }}>
                      <div>
                        <div className="flex gap-8" style={{ marginBottom: 4 }}>
                          <span className={`badge ${sc.badge}`}>{sc.label}</span>
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
            <h2 style={{ fontWeight: 700, fontSize: '1.1rem', marginBottom: 20 }}>Hoa Hồng & Rút Tiền</h2>
            <div className="grid-3" style={{ gap: 16, marginBottom: 24 }}>
              <div className="card" style={{ padding: 20, borderLeft: '3px solid var(--c4-500)' }}>
                <div style={{ fontSize: '.72rem', color: 'var(--text-3)', marginBottom: 4 }}>Số dư khả dụng</div>
                <div style={{ fontFamily: 'var(--ff-display)', fontWeight: 800, fontSize: '1.3rem', color: 'var(--c4-500)' }}>{formatVND(commBalance)}</div>
              </div>
              <div className="card" style={{ padding: 20, borderLeft: '3px solid var(--gold-400)' }}>
                <div style={{ fontSize: '.72rem', color: 'var(--text-3)', marginBottom: 4 }}>Đang chờ duyệt</div>
                <div style={{ fontFamily: 'var(--ff-display)', fontWeight: 800, fontSize: '1.3rem', color: 'var(--gold-400)' }}>3.200.000₫</div>
              </div>
              <div className="card" style={{ padding: 20, borderLeft: '3px solid var(--c5-500)' }}>
                <div style={{ fontSize: '.72rem', color: 'var(--text-3)', marginBottom: 4 }}>Tổng đã rút</div>
                <div style={{ fontFamily: 'var(--ff-display)', fontWeight: 800, fontSize: '1.3rem', color: 'var(--c5-500)' }}>45.200.000₫</div>
              </div>
            </div>

            <div className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: 24 }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
                <div className="flex" style={{ justifyContent: 'space-between' }}>
                  <span style={{ fontWeight: 700, fontSize: '.88rem' }}>Hoa Hồng Gần Đây</span>
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
                          <TD><span className={`status-pill badge ${sc.badge}`}>{sc.label}</span></TD>
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
              <div className="verified-seal">On-chain Verified</div>
              <div style={{ fontSize: '.82rem', fontWeight: 600, marginBottom: 8 }}>Tất cả hoa hồng được ghi nhận trên blockchain</div>
              <div style={{ fontSize: '.72rem', color: 'var(--text-3)', lineHeight: 1.6 }}>
                Smart contract tự động tính toán và phân phối hoa hồng minh bạch. Mọi giao dịch đều có thể xác minh trên Polygon.
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
            <h2 style={{ fontWeight: 700, fontSize: '1.1rem', marginBottom: 20 }}>Marketing Tự Động (AI Agents)</h2>
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
                  <div style={{ fontSize: '.82rem', color: 'var(--text-2)' }}>Hàng ngày, Hàng tuần, 24/7, Tùy chỉnh</div>
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
                          <span className={`badge ${sc.badge}`}>{sc.label}</span>
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
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
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
            <h2 style={{ fontWeight: 700, fontSize: '1.1rem', marginBottom: 20 }}>Affiliate & CRM</h2>
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
                  <button className="btn btn-primary btn-sm" onClick={() => {
                    const id = Date.now();
                    const newLink = { id, product: 'Sản phẩm mới', link: `https://wellkoc.vn/r/mh-new-${id.toString().slice(-4)}`, clicks: 0, conversions: 0, revenue: '0₫' };
                    setAffLinks(prev => [...prev, newLink]);
                    showToast('Đã tạo link affiliate mới');
                  }}>+ Tạo link mới</button>
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
        const refCode = 'MH123';
        const shareLink = `https://wk.co/mh-${selectedShareProduct.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '').slice(0, 12)}?ref=${refCode}`;
        return (
          <>
            <h2 style={{ fontWeight: 700, fontSize: '1.1rem', marginBottom: 20 }}>Chia Sẻ Đa Nền Tảng</h2>

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
                    <button key={i} className="btn btn-sm" style={{ background: p.color, color: '#fff', border: 'none', fontWeight: 600, fontSize: '.75rem', padding: '8px 14px', borderRadius: 8 }} onClick={() => { copyText(`${shareLink}&utm_source=${p.name.toLowerCase()}`); showToast(`Link đã được sao chép cho ${p.name} (UTM: ${p.name.toLowerCase()})`); }}>
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
                    <span className="mono" style={{ fontWeight: 700, fontSize: '.88rem', color: 'var(--c6-500)' }}>WK-MH1234</span>
                  </div>
                  <button className="btn btn-secondary btn-sm" style={{ fontSize: '.7rem' }} onClick={() => { copyText('WK-MH1234'); showToast('Đã sao chép mã giới thiệu WK-MH1234'); }}>📋 Copy</button>
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
            <h2 style={{ fontWeight: 700, fontSize: '1.1rem', marginBottom: 20 }}>Cộng Đồng</h2>
            <div className="grid-3" style={{ gap: 16, marginBottom: 24 }}>
              {[
                { label: 'Tổng thành viên', value: communityStats.totalMembers.toLocaleString(), color: 'var(--c4-500)' },
                { label: 'Thành viên mới tháng này', value: communityStats.newThisMonth.toLocaleString(), color: 'var(--c5-500)' },
                { label: 'Tỷ lệ hoạt động', value: communityStats.activeRate, color: 'var(--c6-500)' },
              ].map((s, i) => (
                <div key={i} className="kpi-card">
                  <div className="kpi-label">{s.label}</div>
                  <div className="kpi-val" style={{ color: s.color }}>{s.value}</div>
                </div>
              ))}
            </div>
            <div className="grid-4" style={{ gap: 12, marginBottom: 24 }}>
              {[
                { label: 'Bài viết cộng đồng', value: '1,247' },
                { label: 'Bình luận tháng', value: '8,920' },
                { label: 'Lượt chia sẻ', value: '3,456' },
                { label: 'Phản hồi tích cực', value: '94.2%' },
              ].map((m, i) => (
                <div key={i} style={{ textAlign: 'center', padding: 16, background: 'var(--bg-2)', borderRadius: 8 }}>
                  <div style={{ fontFamily: 'var(--ff-display)', fontWeight: 800, fontSize: '1rem', color: 'var(--text-1)' }}>{m.value}</div>
                  <div style={{ fontSize: '.68rem', color: 'var(--text-4)', marginTop: 4 }}>{m.label}</div>
                </div>
              ))}
            </div>
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
                <span style={{ fontWeight: 700, fontSize: '.88rem' }}>Danh Sách Thành Viên</span>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '.78rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border)' }}>
                      {['Tên', 'Ngày tham gia', 'Hạng', 'Mua hàng', 'Trạng thái'].map(h => <TH key={h}>{h}</TH>)}
                    </tr>
                  </thead>
                  <tbody>
                    {communityMembers.map(m => (
                      <tr key={m.id} style={{ borderBottom: '1px solid var(--border)' }}>
                        <TD bold>{m.name}</TD>
                        <TD color="var(--text-3)">{m.joinDate}</TD>
                        <TD><span className={`badge ${m.tier === 'Platinum' ? 'badge-c7' : m.tier === 'Gold' ? 'badge-gold' : m.tier === 'Silver' ? 'badge-c5' : 'badge-c6'}`}>{m.tier}</span></TD>
                        <TD mono bold>{m.purchases}</TD>
                        <TD><span className={`badge ${m.status === 'active' ? 'badge-c4' : 'badge-gold'}`}>{m.status === 'active' ? 'Hoạt động' : 'Không HĐ'}</span></TD>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        );

      /* ══════ 15. HIỆU SUẤT & THỐNG KÊ ══════ */
      case 'performance':
        return (
          <>
            <h2 style={{ fontWeight: 700, fontSize: '1.1rem', marginBottom: 20 }}>Hiệu Suất & Thống Kê</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12, marginBottom: 24 }}>
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
            <h2 style={{ fontWeight: 700, fontSize: '1.1rem', marginBottom: 20 }}>Xếp Hạng & Giải Thưởng</h2>
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
                  <div style={{ fontFamily: 'var(--ff-display)', fontWeight: 800, fontSize: '1.2rem', color: 'var(--gold-400)' }}>{myRank.revenue}</div>
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
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12 }}>
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
            <h2 style={{ fontWeight: 700, fontSize: '1.1rem', marginBottom: 20 }}>Creator Token</h2>
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
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
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
            <h2 style={{ fontWeight: 700, fontSize: '1.1rem', marginBottom: 20 }}>🌳 Cây Đội Nhóm Affiliate</h2>
            {/* Stats */}
            <div className="grid-3 gap-12" style={{ marginBottom: 20 }}>
              {[
                { label: 'Tổng thành viên', value: '156', color: 'var(--c6-500)' },
                { label: 'Cấp sâu nhất', value: '5', color: 'var(--c4-500)' },
                { label: 'Commission tháng', value: '12.4M₫', color: '#f59e0b' },
              ].map(s => (
                <div key={s.label} className="kpi-card">
                  <div style={{ fontSize: '.68rem', color: 'var(--text-3)' }}>{s.label}</div>
                  <div style={{ fontSize: '1.3rem', fontWeight: 800, color: s.color }}>{s.value}</div>
                </div>
              ))}
            </div>
            {/* Tree */}
            <div className="card" style={{ padding: 20 }}>
              <div style={{ fontSize: '.82rem', fontWeight: 700, marginBottom: 16 }}>Cấp 1 — Trực tiếp (12 người)</div>
              {[
                { name: 'Ngọc Anh', level: 1, referrals: 8, commission: '2.1M₫', active: true },
                { name: 'Bảo Trân', level: 1, referrals: 15, commission: '3.8M₫', active: true },
                { name: 'Hải Yến', level: 1, referrals: 3, commission: '890K₫', active: true },
                { name: 'Đức Minh', level: 1, referrals: 0, commission: '120K₫', active: false },
              ].map((m, i) => (
                <div key={i} className="flex gap-12" style={{ padding: '10px 0', borderBottom: '1px solid var(--border)', alignItems: 'center' }}>
                  <div style={{ width: 32, height: 32, borderRadius: '50%', background: m.active ? 'var(--c6-500)' : 'var(--bg-3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '.65rem', fontWeight: 700, color: '#fff' }}>{m.name[0]}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: '.82rem' }}>{m.name} {!m.active && <span className="badge badge-rose" style={{ fontSize: '.55rem' }}>Inactive</span>}</div>
                    <div style={{ fontSize: '.7rem', color: 'var(--text-3)' }}>{m.referrals} referrals · {m.commission}</div>
                  </div>
                  <button className="btn btn-secondary btn-sm" style={{ fontSize: '.68rem' }} onClick={() => showToast(`Nhánh ${m.name}: ${m.referrals} referrals — Commission: ${m.commission}`)}>Xem nhánh</button>
                </div>
              ))}
            </div>
          </>
        );

      case 'affStats':
        return (
          <>
            <h2 style={{ fontWeight: 700, fontSize: '1.1rem', marginBottom: 20 }}>📊 Thống Kê Affiliate</h2>
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
            <h2 style={{ fontWeight: 700, fontSize: '1.1rem', marginBottom: 20 }}>💸 Hoa Hồng Affiliate</h2>
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
            <h2 style={{ fontWeight: 700, fontSize: '1.1rem', marginBottom: 20 }}>🖼️ Tài Liệu Quảng Bá</h2>
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
            <h2 style={{ fontWeight: 700, fontSize: '1.1rem', marginBottom: 20 }}>Cài Đặt</h2>

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
                  <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--chakra-flow)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', fontWeight: 700 }}>MH</div>
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
                <button className="btn btn-secondary btn-sm" style={{ marginTop: 16 }} onClick={() => showToast('Tính năng thêm địa chỉ sẽ sớm ra mắt')}>+ Thêm địa chỉ mới</button>
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
                <button className="btn btn-secondary btn-sm" style={{ marginTop: 16 }} onClick={() => showToast('Tính năng thêm tài khoản sẽ sớm ra mắt')}>+ Thêm tài khoản</button>
              </div>
            )}

            {settingsTab === 'wkpay' && (
              <div className="card" style={{ padding: 20 }}>
                <div className="flex-col gap-12">
                  <div className="flex" style={{ justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                    <span style={{ fontSize: '.82rem', color: 'var(--text-3)' }}>KYC</span>
                    <span className="badge badge-c4">Đã xác minh</span>
                  </div>
                  <div className="flex" style={{ justifyContent: 'space-between', padding: '8px 0' }}>
                    <span style={{ fontSize: '.82rem', color: 'var(--text-3)' }}>Ví</span>
                    <span className="mono" style={{ fontSize: '.82rem', fontWeight: 600 }}>0xA1B2...5678</span>
                  </div>
                </div>
              </div>
            )}

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
    <div style={{ paddingTop: 0, minHeight: '100vh', background: 'var(--bg-0)' }}>
      <div className="container" style={{ paddingTop: 0, paddingBottom: 64 }}>
        <div className="dash-wrap">
          {/* Sidebar */}
          <div className="dash-sidebar" style={{ width: 240, minWidth: 240 }}>
            {/* User profile header */}
            <div style={{ padding: '0 8px 16px', borderBottom: '1px solid var(--border)', marginBottom: 12 }}>
              <div className="flex gap-8">
                <div style={{
                  width: 40, height: 40, borderRadius: '50%',
                  background: 'var(--chakra-flow)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '1rem', fontWeight: 700,
                }}>MH</div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '.82rem' }}>Minh Hương</div>
                  <span className="badge badge-c6" style={{ marginTop: 2 }}>KOC Level 18</span>
                </div>
              </div>
            </div>

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
                    <span style={{ flex: 1, fontSize: '.72rem', fontWeight: 800, letterSpacing: '.06em', textTransform: 'uppercase', color: group.color }}>{group.label}</span>
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
                        <span style={{ flex: 1 }}>{item.label}</span>
                        {item.key === 'orders' && pendingOrderCount > 0 && (
                          <span style={{ background: '#ef4444', color: '#fff', borderRadius: 10, padding: '1px 7px', fontSize: '.6rem', fontWeight: 700 }}>{pendingOrderCount}</span>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Divider */}
                  <div style={{ height: 1, background: 'var(--border)', margin: '6px 8px' }} />
                </div>
              );
            })}

            {/* Settings */}
            <div
              className={`dash-nav-item ${activeNav === 'settings' ? 'on' : ''}`}
              onClick={() => setActiveNav('settings')}
            >
              <span className="dash-nav-icon">⚙️</span>
              <span style={{ flex: 1 }}>Cài đặt</span>
            </div>

            {/* Logout */}
            <div style={{ height: 1, background: 'var(--border)', margin: '12px 8px' }} />
            <div
              className="dash-nav-item"
              onClick={handleLogout}
              style={{ color: '#ef4444', cursor: 'pointer' }}
            >
              <span className="dash-nav-icon">🚪</span>
              <span style={{ flex: 1 }}>Đăng xuất</span>
            </div>
          </div>

          {/* Content */}
          <div className="dash-content">
            {toast && <Toast message={toast} onDone={clearToast} />}
            {renderContent()}
          </div>
        </div>
      </div>
    </div>
  );
}
