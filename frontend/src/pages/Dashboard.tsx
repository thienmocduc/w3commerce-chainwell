import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@hooks/useAuth';

/* ── Helpers ─────────────────────────────────────── */
const formatVND = (n: number) => n.toLocaleString('vi-VN') + '₫';

const Stars = ({ count, size = '.82rem' }: { count: number; size?: string }) => (
  <span style={{ fontSize: size, letterSpacing: 1 }}>
    {[1, 2, 3, 4, 5].map(i => (
      <span key={i} style={{ color: i <= count ? '#fbbf24' : 'var(--text-4)' }}>★</span>
    ))}
  </span>
);

/* ── Sidebar config ──────────────────────────────── */
const sidebarItems = [
  { key: 'overview', icon: '📊', label: 'Tổng quan' },
  { key: 'orders', icon: '📦', label: 'Đơn hàng của tôi' },
  { key: 'tracking', icon: '🚚', label: 'Theo dõi đơn hàng' },
  { key: 'reviews', icon: '⭐', label: 'Đánh giá & Phản hồi' },
  { key: 'returns', icon: '🔄', label: 'Đổi trả hàng' },
  { key: 'history', icon: '🕐', label: 'Lịch sử mua hàng' },
  { key: 'payments', icon: '💳', label: 'Thanh toán' },
  { key: 'wkpay', icon: '👛', label: 'Ví WK Pay' },
  { key: 'points', icon: '🏆', label: 'WK Points & Rewards' },
  { key: 'missions', icon: '🎯', label: 'Nhiệm vụ & XP' },
  { key: 'vouchers', icon: '🎟️', label: 'Kho Voucher' },
  { key: 'convert', icon: '🔄', label: 'Đổi XP → WK3' },
  { key: 'favorites', icon: '❤️', label: 'Yêu thích' },
  { key: 'notifications', icon: '🔔', label: 'Thông báo' },
  { key: 'settings', icon: '⚙️', label: 'Cài đặt tài khoản' },
];

/* ── KPI data ────────────────────────────────────── */
const kpiData = [
  { label: 'Tổng đơn hàng', value: '47', delta: '+8 tháng này', up: true, color: 'var(--c4-500)' },
  { label: 'Tổng chi tiêu', value: formatVND(18450000), delta: '+12.4% MoM', up: true, color: 'var(--c5-500)' },
  { label: 'WK Points', value: '3.280', delta: '+420 tuần này', up: true, color: 'var(--c6-500)' },
  { label: 'Level', value: 'Silver', delta: 'Lv.7', up: true, color: 'var(--c7-500)' },
];

/* ── Order data ──────────────────────────────────── */
interface OrderItem {
  name: string;
  qty: number;
  price: number;
}

interface Order {
  id: string;
  date: string;
  items: OrderItem[];
  total: number;
  status: 'pending' | 'confirmed' | 'packing' | 'shipping' | 'delivered' | 'cancelled' | 'return';
  payment: string;
  trackingCode?: string;
  reviewed?: boolean;
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

/* ── Reviews data ────────────────────────────────── */
const completedReviews = [
  { orderId: 'ORD-2026-0138', product: 'Cà Phê Arabica Đà Lạt', stars: 5, text: 'Cà phê thơm ngon, đậm vị. Đóng gói cẩn thận.', date: '2026-03-22', points: 5 },
  { orderId: 'ORD-2026-0129', product: 'Mật Ong Rừng Tây Nguyên', stars: 4, text: 'Mật ong nguyên chất, rất hài lòng.', date: '2026-03-19', points: 5 },
];

/* ── Returns data ────────────────────────────────── */
const returnRequests = [
  { id: 'RET-001', orderId: 'ORD-2026-0091', product: 'Trà Hoa Cúc Organic', reason: 'Hàng lỗi', description: 'Sản phẩm bị ẩm mốc khi nhận', status: 'approved', date: '2026-03-01', refundAmount: 175000 },
];

const returnReasons = ['Hàng lỗi', 'Sai sản phẩm', 'Không ưng ý', 'Khác'];

const returnStatusConfig: Record<string, { label: string; badge: string }> = {
  pending: { label: 'Yêu cầu', badge: 'badge-c7' },
  approved: { label: 'Đã duyệt', badge: 'badge-c5' },
  refunded: { label: 'Hoàn tiền', badge: 'badge-c4' },
};

/* ── Payment data ────────────────────────────────── */
const savedPaymentMethods = [
  { id: 1, type: 'VNPay', label: 'VNPay - Ngân hàng Vietcombank', last4: '••••4821', isDefault: true },
  { id: 2, type: 'MoMo', label: 'MoMo - 0912 345 678', last4: '', isDefault: false },
  { id: 3, type: 'Bank', label: 'Visa •••• 6789', last4: '6789', isDefault: false },
];

const paymentHistory = [
  { id: 'PAY-001', method: 'VNPay', orderId: 'ORD-2026-0147', amount: 389000, date: '2026-03-25', status: 'success', ref: 'VNP20260325001' },
  { id: 'PAY-002', method: 'MoMo', orderId: 'ORD-2026-0143', amount: 459000, date: '2026-03-23', status: 'success', ref: 'MOMO20260323002' },
  { id: 'PAY-003', method: 'Crypto', orderId: 'ORD-2026-0138', amount: 245000, date: '2026-03-21', status: 'success', ref: '0x7a2c...b41e' },
  { id: 'PAY-004', method: 'VNPay', orderId: 'ORD-2026-0129', amount: 285000, date: '2026-03-18', status: 'success', ref: 'VNP20260318004' },
  { id: 'PAY-005', method: 'Crypto', orderId: 'ORD-2026-0121', amount: 890000, date: '2026-03-15', status: 'success', ref: '0x3f8d...c92a' },
  { id: 'PAY-006', method: 'MoMo', orderId: 'ORD-2026-0115', amount: 270000, date: '2026-03-12', status: 'success', ref: 'MOMO20260312006' },
  { id: 'PAY-007', method: 'WK Pay', orderId: 'ORD-2026-0108', amount: 405000, date: '2026-03-08', status: 'pending', ref: 'WKP20260308007' },
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

/* ── Points & Rewards ────────────────────────────── */
const pointsConfig = {
  currentPoints: 3280,
  nextLevelPoints: 5000,
  level: 7,
  title: 'Silver',
  totalEarned: 4850,
  totalRedeemed: 1570,
};

const levelBenefits = [
  { level: 'Bronze', minPoints: 0, discount: '0%', cashback: '1%', freeShip: 'Không', exclusive: 'Không', color: '#cd7f32' },
  { level: 'Silver', minPoints: 2000, discount: '3%', cashback: '2%', freeShip: '2 lần/tháng', exclusive: 'Không', color: '#c0c0c0' },
  { level: 'Gold', minPoints: 5000, discount: '5%', cashback: '3%', freeShip: '5 lần/tháng', exclusive: 'Có', color: '#fbbf24' },
  { level: 'Platinum', minPoints: 10000, discount: '8%', cashback: '5%', freeShip: 'Không giới hạn', exclusive: 'Có', color: '#a78bfa' },
  { level: 'Diamond', minPoints: 25000, discount: '12%', cashback: '8%', freeShip: 'Không giới hạn', exclusive: 'VIP', color: '#67e8f9' },
];

const pointsHistory = [
  { action: 'Mua hàng ORD-2026-0147', points: 120, type: 'earn', date: '2026-03-25' },
  { action: 'Đánh giá Cà Phê Arabica', points: 5, type: 'earn', date: '2026-03-22' },
  { action: 'Đăng nhập hàng ngày', points: 10, type: 'earn', date: '2026-03-25' },
  { action: 'Mua hàng ORD-2026-0143', points: 150, type: 'earn', date: '2026-03-23' },
  { action: 'Đổi voucher giảm 50K', points: -500, type: 'redeem', date: '2026-03-20' },
  { action: 'Đánh giá Mật Ong Rừng', points: 5, type: 'earn', date: '2026-03-19' },
  { action: 'Mua hàng ORD-2026-0138', points: 100, type: 'earn', date: '2026-03-21' },
];

const redeemItems = [
  { id: 1, name: 'Voucher giảm 50.000₫', cost: 500, type: 'voucher' },
  { id: 2, name: 'Voucher giảm 100.000₫', cost: 900, type: 'voucher' },
  { id: 3, name: 'Free ship toàn quốc', cost: 200, type: 'freeShip' },
  { id: 4, name: 'Giảm 10% đơn tiếp theo', cost: 350, type: 'discount' },
  { id: 5, name: 'Trà xanh Organic (Exclusive)', cost: 1500, type: 'product' },
];

/* ── Favorites ───────────────────────────────────── */
const favoriteProducts = [
  { id: 1, name: 'Trà Ô Long Đài Loan Premium', price: 389000, rating: 4.9, reviews: 234, vendor: 'WellKOC Origin', emoji: '🍵', alert: false },
  { id: 2, name: 'Serum Vitamin C 20%', price: 459000, rating: 4.8, reviews: 189, vendor: 'K-Beauty VN', emoji: '✨', alert: true },
  { id: 3, name: 'Mật Ong Rừng Tây Nguyên', price: 285000, rating: 4.7, reviews: 156, vendor: 'GreenViet', emoji: '🍯', alert: false },
  { id: 4, name: 'Cà Phê Arabica Đà Lạt', price: 245000, rating: 4.9, reviews: 312, vendor: 'Đà Lạt Farm', emoji: '☕', alert: true },
  { id: 5, name: 'Nước Mắm Phú Quốc Truyền Thống', price: 95000, rating: 4.6, reviews: 478, vendor: 'Phú Quốc Authentic', emoji: '🐟', alert: false },
  { id: 6, name: 'Bột Collagen Cá Biển', price: 890000, rating: 4.5, reviews: 98, vendor: 'Sea Beauty', emoji: '💎', alert: false },
];

/* ── Notifications ───────────────────────────────── */
const notifications = [
  { id: 1, type: 'order', title: 'Đơn hàng ORD-2026-0147 đang được vận chuyển', message: 'Đơn hàng của bạn đã được giao cho đơn vị vận chuyển. Dự kiến giao trong 2-3 ngày.', date: '2026-03-25 14:30', read: false },
  { id: 2, type: 'promo', title: 'Flash Sale cuối tháng - Giảm đến 50%!', message: 'Hàng trăm sản phẩm giảm giá sốc. Chỉ trong 24 giờ!', date: '2026-03-25 09:00', read: false },
  { id: 3, type: 'system', title: 'Bạn đã đạt Silver Level!', message: 'Chúc mừng! Bạn đã lên Level 7 - Silver Buyer. Hưởng ưu đãi 3% cho mọi đơn hàng.', date: '2026-03-24 16:00', read: true },
  { id: 4, type: 'order', title: 'Đơn hàng ORD-2026-0143 đã giao thành công', message: 'Đơn hàng của bạn đã được giao. Hãy đánh giá sản phẩm để nhận thêm WK Points!', date: '2026-03-23 18:45', read: true },
  { id: 5, type: 'promo', title: 'Ưu đãi đặc biệt cho thành viên Silver', message: 'Giảm thêm 5% cho đơn hàng từ 500.000₫. Áp dụng đến hết tháng 3.', date: '2026-03-22 10:00', read: true },
  { id: 6, type: 'system', title: 'Cập nhật chính sách bảo mật', message: 'Chúng tôi đã cập nhật chính sách bảo mật. Vui lòng xem chi tiết.', date: '2026-03-20 08:00', read: true },
];

const notifTypeConfig: Record<string, { icon: string; badge: string }> = {
  order: { icon: '📦', badge: 'badge-c5' },
  promo: { icon: '🎉', badge: 'badge-c4' },
  system: { icon: '🔧', badge: 'badge-c7' },
};

/* ── Settings data ───────────────────────────────── */
const addresses = [
  { id: 1, label: 'Nhà riêng', name: 'Chủ tài khoản', phone: '0912 345 678', address: '123 Nguyễn Huệ, Phường Bến Nghé, Quận 1, TP. Hồ Chí Minh', isDefault: true },
  { id: 2, label: 'Công ty', name: 'Chủ tài khoản', phone: '0912 345 678', address: '456 Lê Lợi, Phường Bến Thành, Quận 1, TP. Hồ Chí Minh', isDefault: false },
];

const bankAccounts = [
  { id: 1, bank: 'Vietcombank', accountNumber: '****4821', holder: 'TRAN MINH TUAN', branch: 'Chi nhánh TP.HCM' },
];

/* ── Suggested products ──────────────────────────── */
const suggestedProducts = [
  { id: 101, name: 'Tinh Dầu Tràm Huế', price: 165000, emoji: '🌿' },
  { id: 102, name: 'Yến Sào Khánh Hòa', price: 1200000, emoji: '🥣' },
  { id: 103, name: 'Bột Cacao Đắk Lắk', price: 198000, emoji: '🍫' },
  { id: 104, name: 'Hạt Điều Rang Muối', price: 220000, emoji: '🥜' },
];

/* ── Component ───────────────────────────────────── */
export default function Dashboard() {
  const [activeNav, setActiveNav] = useState('overview');
  const [orderTab, setOrderTab] = useState('all');
  const [reviewStars, setReviewStars] = useState(5);
  const [reviewText, setReviewText] = useState('');
  const [returnOrder, setReturnOrder] = useState('');
  const [returnReason, setReturnReason] = useState(returnReasons[0]);
  const [returnDesc, setReturnDesc] = useState('');
  const [historySearch, setHistorySearch] = useState('');
  const [notifFilter, setNotifFilter] = useState('all');
  const [settingsTab, setSettingsTab] = useState('profile');
  const navigate = useNavigate();
  const { user, logout, isAdmin } = useAuth();

  // Redirect admin to /admin
  if (isAdmin) { navigate('/admin'); return null; }

  const userName = user?.name || 'Người dùng';
  const userEmail = user?.email || '';

  // Toast notifications
  const [toasts, setToasts] = useState<{ id: number; message: string }[]>([]);
  const showToast = (message: string) => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 2500);
  };

  // Mutable order state
  const [orders, setOrders] = useState<Order[]>(allOrders);
  // Track which orders have "added to cart" feedback
  const [addedToCart, setAddedToCart] = useState<Set<string>>(new Set());
  // Track expanded order details
  const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set());
  // Track which order is being reviewed inline
  const [reviewingOrderId, setReviewingOrderId] = useState<string | null>(null);
  // Completed reviews state
  const [reviewsList, setReviewsList] = useState(completedReviews);
  // Copy feedback
  const [copiedId, setCopiedId] = useState<string | null>(null);
  // Notifications state
  const [notifsState, setNotifsState] = useState(notifications);
  // Favorites state
  const [favProducts, setFavProducts] = useState(favoriteProducts);
  const [favAddedToCart, setFavAddedToCart] = useState<Set<number>>(new Set());
  // Return requests state
  const [returnReqs, setReturnReqs] = useState(returnRequests);
  // Settings edit mode
  const [settingsEditing, setSettingsEditing] = useState(false);
  // Convert XP amount
  const [convertAmt, setConvertAmt] = useState(500);
  // Redeem items used
  const [redeemedIds, setRedeemedIds] = useState<Set<number>>(new Set());
  // Voucher "used" state
  const [usedVouchers, setUsedVouchers] = useState<Set<string>>(new Set());
  // Payment methods state
  const [payMethods, setPayMethods] = useState(savedPaymentMethods);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Clipboard helper
  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text).catch(() => {});
    setCopiedId(text);
    showToast(`Đã sao chép ${label}`);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Add to cart helper
  const handleAddToCart = (orderId: string, productName: string) => {
    setAddedToCart(prev => new Set(prev).add(orderId));
    showToast(`Da them "${productName}" vao gio hang`);
    setTimeout(() => setAddedToCart(prev => { const n = new Set(prev); n.delete(orderId); return n; }), 2000);
  };

  // Cancel order
  const handleCancelOrder = (orderId: string) => {
    if (!confirm(`Ban co chac muon huy don hang ${orderId}?`)) return;
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: 'cancelled' as const } : o));
    showToast(`Da huy don hang ${orderId}`);
  };

  // Confirm received
  const handleConfirmReceived = (orderId: string) => {
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: 'delivered' as const, reviewed: false } : o));
    showToast(`Da xac nhan nhan hang ${orderId}`);
  };

  // Submit review
  const handleSubmitReview = (order: Order) => {
    if (!reviewText.trim()) { showToast('Vui long nhap noi dung danh gia'); return; }
    setOrders(prev => prev.map(o => o.id === order.id ? { ...o, reviewed: true } : o));
    setReviewsList(prev => [{ orderId: order.id, product: order.items[0].name, stars: reviewStars, text: reviewText, date: new Date().toISOString().slice(0, 10), points: 5 }, ...prev]);
    setReviewingOrderId(null);
    setReviewText('');
    setReviewStars(5);
    showToast(`Da gui danh gia cho ${order.items[0].name} (+5 WK Points)`);
  };

  /* ── Table header helper ─── */
  const TH = ({ children }: { children: string }) => (
    <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 700, fontSize: '.65rem', color: 'var(--text-3)', letterSpacing: '.06em', textTransform: 'uppercase' }}>{children}</th>
  );

  const TD = ({ children, mono, bold, color, style: s }: { children: React.ReactNode; mono?: boolean; bold?: boolean; color?: string; style?: React.CSSProperties }) => (
    <td style={{ padding: '12px 14px', fontFamily: mono ? 'var(--ff-mono, monospace)' : undefined, fontWeight: bold ? 700 : undefined, color, ...s }}>{children}</td>
  );

  /* ── Order filter ─── */
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

  const filteredNotifs = notifFilter === 'all' ? notifsState : notifsState.filter(n => n.type === notifFilter);

  const filteredHistory = orders.filter(o => {
    if (!historySearch) return true;
    const q = historySearch.toLowerCase();
    return o.id.toLowerCase().includes(q) || o.items.some(it => it.name.toLowerCase().includes(q));
  });

  /* ── Render content based on active tab ─── */
  const renderContent = () => {
    switch (activeNav) {

      /* ═══════════ 1. TỔNG QUAN ═══════════ */
      case 'overview':
        return (
          <>
            {/* KPIs */}
            <div className="kpi-grid" style={{ marginBottom: 24 }}>
              {kpiData.map((kpi, i) => (
                <div key={i} className="kpi-card">
                  <div className="kpi-label">{kpi.label}</div>
                  <div className="kpi-val" style={{ color: kpi.color }}>{kpi.value}</div>
                  <div className={`kpi-delta ${kpi.up ? 'delta-up' : 'delta-down'}`}>
                    {kpi.up ? '↑' : '↓'} {kpi.delta}
                  </div>
                </div>
              ))}
            </div>

            {/* Recent orders mini list */}
            <div className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: 24 }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 700, fontSize: '.88rem' }}>Đơn hàng gần đây</span>
                <span style={{ fontSize: '.72rem', color: 'var(--c5-400)', cursor: 'pointer' }} onClick={() => setActiveNav('orders')}>Xem tất cả →</span>
              </div>
              {orders.slice(0, 4).map((o, i) => {
                const sc = orderStatusConfig[o.status];
                return (
                  <div key={o.id} className="flex" style={{ justifyContent: 'space-between', alignItems: 'center', padding: '12px 20px', borderBottom: i < 3 ? '1px solid var(--border)' : 'none' }}>
                    <div>
                      <div style={{ fontSize: '.82rem', fontWeight: 600 }}>{o.items[0].name}{o.items.length > 1 ? ` (+${o.items.length - 1})` : ''}</div>
                      <div style={{ fontSize: '.68rem', color: 'var(--text-4)' }}>{o.id} · {o.date}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: 700, fontSize: '.82rem' }}>{formatVND(o.total)}</div>
                      <span className={`badge ${sc.badge}`} style={{ fontSize: '.6rem' }}>{sc.label}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Gợi ý sản phẩm */}
            <div style={{ marginBottom: 8 }}>
              <span style={{ fontWeight: 700, fontSize: '.88rem' }}>Gợi ý cho bạn</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12 }}>
              {suggestedProducts.map(p => (
                <div key={p.id} className="card card-hover" style={{ padding: 16, textAlign: 'center' }}>
                  <div style={{ fontSize: '2rem', marginBottom: 8 }}>{p.emoji}</div>
                  <div style={{ fontSize: '.78rem', fontWeight: 600, marginBottom: 6 }}>{p.name}</div>
                  <div style={{ fontWeight: 700, color: 'var(--c4-500)', marginBottom: 8 }}>{formatVND(p.price)}</div>
                  <Link to="/products" className="btn btn-primary btn-sm" style={{ width: '100%', textAlign: 'center', display: 'block' }}>Xem ngay</Link>
                </div>
              ))}
            </div>
          </>
        );

      /* ═══════════ 2. ĐƠN HÀNG CỦA TÔI ═══════════ */
      case 'orders':
        return (
          <>
            <h2 style={{ fontWeight: 700, fontSize: '1.1rem', marginBottom: 16 }}>Đơn Hàng Của Tôi</h2>

            {/* Order tabs */}
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

            {/* Orders list */}
            {filteredOrders.length === 0 ? (
              <div className="card" style={{ padding: 40, textAlign: 'center', color: 'var(--text-3)' }}>Không có đơn hàng nào</div>
            ) : (
              <div className="flex-col gap-12">
                {filteredOrders.map(order => {
                  const sc = orderStatusConfig[order.status];
                  return (
                    <div key={order.id} className="card" style={{ padding: 0, overflow: 'hidden' }}>
                      {/* Order header */}
                      <div className="flex" style={{ justifyContent: 'space-between', alignItems: 'center', padding: '12px 20px', borderBottom: '1px solid var(--border)', background: 'var(--bg-1)' }}>
                        <div className="flex gap-12" style={{ alignItems: 'center' }}>
                          <span style={{ fontSize: '.78rem', fontWeight: 600 }} className="mono">{order.id}</span>
                          <span style={{ fontSize: '.68rem', color: 'var(--text-4)' }}>{order.date}</span>
                        </div>
                        <span className={`badge ${sc.badge}`}>{sc.label}</span>
                      </div>
                      {/* Items */}
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
                      {/* Footer */}
                      <div className="flex" style={{ justifyContent: 'space-between', alignItems: 'center', padding: '12px 20px', borderTop: '1px solid var(--border)', background: 'var(--bg-1)' }}>
                        <div className="flex gap-8" style={{ flexWrap: 'wrap' }}>
                          {(order.status === 'pending' || order.status === 'confirmed') && (
                            <button className="btn btn-sm" style={{ background: '#ef4444', color: '#fff', border: 'none' }} onClick={() => handleCancelOrder(order.id)}>Huy don</button>
                          )}
                          {order.status === 'shipping' && (
                            <button className="btn btn-primary btn-sm" onClick={() => handleConfirmReceived(order.id)}>Xac nhan nhan hang</button>
                          )}
                          {order.status === 'delivered' && !order.reviewed && (
                            <button className="btn btn-primary btn-sm" onClick={() => { setReviewingOrderId(reviewingOrderId === order.id ? null : order.id); setReviewStars(5); setReviewText(''); }}>Danh gia</button>
                          )}
                          {order.status === 'delivered' && order.reviewed && (
                            <span className="badge badge-c4" style={{ fontSize: '.65rem' }}>Da danh gia</span>
                          )}
                          {order.status === 'delivered' && (
                            <button className="btn btn-secondary btn-sm" onClick={() => setActiveNav('returns')}>Yeu cau doi/tra</button>
                          )}
                          <button className="btn btn-secondary btn-sm" onClick={() => handleAddToCart(order.id, order.items[0].name)}>
                            {addedToCart.has(order.id) ? 'Da them \u2713' : 'Mua lai'}
                          </button>
                          {order.trackingCode && (
                            <button className="btn btn-secondary btn-sm" onClick={() => setActiveNav('tracking')}>Theo doi</button>
                          )}
                          <button className="btn btn-secondary btn-sm" onClick={() => setExpandedOrders(prev => { const n = new Set(prev); n.has(order.id) ? n.delete(order.id) : n.add(order.id); return n; })}>
                            {expandedOrders.has(order.id) ? 'Thu gon' : 'Xem chi tiet'}
                          </button>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <span style={{ fontSize: '.68rem', color: 'var(--text-3)' }}>Tong: </span>
                          <span style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--c4-500)' }}>{formatVND(order.total)}</span>
                        </div>
                      </div>
                      {/* Expanded details */}
                      {expandedOrders.has(order.id) && (
                        <div style={{ padding: '12px 20px', borderTop: '1px solid var(--border)', background: 'var(--bg-0)', fontSize: '.78rem' }}>
                          <div className="flex gap-16" style={{ flexWrap: 'wrap' }}>
                            <div><strong>Thanh toan:</strong> {order.payment}</div>
                            <div><strong>Ngay dat:</strong> {order.date}</div>
                            {order.trackingCode && (
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <strong>Ma van don:</strong> <span className="mono">{order.trackingCode}</span>
                                <button className="btn btn-secondary" style={{ fontSize: '.6rem', padding: '2px 8px' }} onClick={() => copyToClipboard(order.trackingCode!, 'ma van don')}>
                                  {copiedId === order.trackingCode ? 'Da sao chep \u2713' : 'Sao chep'}
                                </button>
                              </div>
                            )}
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <strong>Ma don:</strong> <span className="mono">{order.id}</span>
                              <button className="btn btn-secondary" style={{ fontSize: '.6rem', padding: '2px 8px' }} onClick={() => copyToClipboard(order.id, 'ma don hang')}>
                                {copiedId === order.id ? 'Da sao chep \u2713' : 'Sao chep'}
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                      {/* Inline review form */}
                      {reviewingOrderId === order.id && (
                        <div style={{ padding: '16px 20px', borderTop: '1px solid var(--border)', background: 'var(--bg-0)' }}>
                          <div style={{ fontSize: '.78rem', fontWeight: 600, marginBottom: 8 }}>Danh gia {order.items[0].name}</div>
                          <div style={{ display: 'flex', gap: 4, marginBottom: 8 }}>
                            {[1, 2, 3, 4, 5].map(s => (
                              <span key={s} onClick={() => setReviewStars(s)} style={{ cursor: 'pointer', fontSize: '1.3rem', color: s <= reviewStars ? '#fbbf24' : 'var(--text-4)' }}>\u2605</span>
                            ))}
                          </div>
                          <textarea placeholder="Viet danh gia cua ban..." value={reviewText} onChange={e => setReviewText(e.target.value)} style={{ width: '100%', minHeight: 60, padding: 10, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-1)', color: 'var(--text-1)', fontSize: '.8rem', resize: 'vertical', marginBottom: 8 }} />
                          <div className="flex gap-8">
                            <button className="btn btn-primary btn-sm" onClick={() => handleSubmitReview(order)}>Gui danh gia</button>
                            <button className="btn btn-secondary btn-sm" onClick={() => setReviewingOrderId(null)}>Huy</button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </>
        );

      /* ═══════════ 3. THEO DÕI ĐƠN HÀNG ═══════════ */
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
                            <div style={{ fontSize: '.65rem', color: 'var(--text-3)' }}>Ma van don</div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <span className="mono" style={{ fontSize: '.78rem', fontWeight: 600, color: 'var(--c5-400)' }}>{order.trackingCode}</span>
                              <button className="btn btn-secondary" style={{ fontSize: '.55rem', padding: '2px 6px' }} onClick={() => copyToClipboard(order.trackingCode!, 'ma van don')}>
                                {copiedId === order.trackingCode ? '\u2713' : 'Sao chep'}
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                      {/* Tracking timeline */}
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', position: 'relative' }}>
                        {/* Progress line */}
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

      /* ═══════════ 4. ĐÁNH GIÁ & PHẢN HỒI ═══════════ */
      case 'reviews':
        return (
          <>
            <h2 style={{ fontWeight: 700, fontSize: '1.1rem', marginBottom: 20 }}>Đánh Giá & Phản Hồi</h2>

            {/* Orders awaiting review */}
            {(() => {
              const awaitingReview = orders.filter(o => o.status === 'delivered' && o.reviewed === false);
              return awaitingReview.length > 0 ? (
                <div style={{ marginBottom: 24 }}>
                  <div style={{ fontSize: '.82rem', fontWeight: 600, marginBottom: 12 }}>Cho danh gia ({awaitingReview.length})</div>
                  {awaitingReview.map(o => (
                    <div key={o.id} className="card" style={{ padding: 20, marginBottom: 12 }}>
                      <div className="flex" style={{ justifyContent: 'space-between', marginBottom: 12 }}>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: '.82rem' }}>{o.items[0].name}</div>
                          <div className="mono" style={{ fontSize: '.68rem', color: 'var(--text-4)' }}>{o.id} · {o.date}</div>
                        </div>
                        <span className="badge badge-c7">Chua danh gia</span>
                      </div>
                      {/* Star rating */}
                      <div style={{ marginBottom: 12 }}>
                        <div style={{ fontSize: '.72rem', color: 'var(--text-3)', marginBottom: 6 }}>Chon so sao:</div>
                        <div style={{ display: 'flex', gap: 4 }}>
                          {[1, 2, 3, 4, 5].map(s => (
                            <span key={s} onClick={() => setReviewStars(s)} style={{ cursor: 'pointer', fontSize: '1.5rem', color: s <= reviewStars ? '#fbbf24' : 'var(--text-4)' }}>{'\u2605'}</span>
                          ))}
                        </div>
                      </div>
                      {/* Review text */}
                      <textarea
                        placeholder="Viet danh gia cua ban..."
                        value={reviewText}
                        onChange={e => setReviewText(e.target.value)}
                        style={{ width: '100%', minHeight: 80, padding: 12, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-1)', color: 'var(--text-1)', fontSize: '.82rem', resize: 'vertical', marginBottom: 12 }}
                      />
                      <div className="flex" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '.68rem', color: 'var(--c4-500)' }}>+5 WK Points khi danh gia</span>
                        <button className="btn btn-primary btn-sm" onClick={() => handleSubmitReview(o)}>Gui danh gia</button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : null;
            })()}

            {/* Completed reviews */}
            <div style={{ fontSize: '.82rem', fontWeight: 600, marginBottom: 12 }}>Da danh gia ({reviewsList.length})</div>
            <div className="flex-col gap-12">
              {reviewsList.map((r, i) => (
                <div key={i} className="card" style={{ padding: 20 }}>
                  <div className="flex" style={{ justifyContent: 'space-between', marginBottom: 8 }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '.82rem' }}>{r.product}</div>
                      <div className="mono" style={{ fontSize: '.68rem', color: 'var(--text-4)' }}>{r.orderId} · {r.date}</div>
                    </div>
                    <span className="badge badge-c4">+{r.points} WK Points</span>
                  </div>
                  <Stars count={r.stars} />
                  <div style={{ fontSize: '.82rem', marginTop: 8, color: 'var(--text-2)' }}>{r.text}</div>
                </div>
              ))}
            </div>
          </>
        );

      /* ═══════════ 5. ĐỔI TRẢ HÀNG ═══════════ */
      case 'returns':
        return (
          <>
            <h2 style={{ fontWeight: 700, fontSize: '1.1rem', marginBottom: 20 }}>Đổi Trả Hàng</h2>

            {/* New return request form */}
            <div className="card" style={{ padding: 20, marginBottom: 24 }}>
              <div style={{ fontWeight: 600, fontSize: '.88rem', marginBottom: 16 }}>Tạo yêu cầu đổi/trả mới</div>
              <div className="flex-col gap-12">
                <div>
                  <label style={{ fontSize: '.72rem', color: 'var(--text-3)', display: 'block', marginBottom: 4 }}>Chọn đơn hàng</label>
                  <select value={returnOrder} onChange={e => setReturnOrder(e.target.value)} style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-1)', color: 'var(--text-1)', fontSize: '.82rem' }}>
                    <option value="">-- Chọn đơn hàng --</option>
                    {orders.filter(o => o.status === 'delivered').map(o => (
                      <option key={o.id} value={o.id}>{o.id} - {o.items[0].name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '.72rem', color: 'var(--text-3)', display: 'block', marginBottom: 4 }}>Lý do</label>
                  <select value={returnReason} onChange={e => setReturnReason(e.target.value)} style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-1)', color: 'var(--text-1)', fontSize: '.82rem' }}>
                    {returnReasons.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '.72rem', color: 'var(--text-3)', display: 'block', marginBottom: 4 }}>Mô tả chi tiết</label>
                  <textarea value={returnDesc} onChange={e => setReturnDesc(e.target.value)} placeholder="Mô tả vấn đề..." style={{ width: '100%', minHeight: 80, padding: 12, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-1)', color: 'var(--text-1)', fontSize: '.82rem', resize: 'vertical' }} />
                </div>
                <button className="btn btn-primary btn-sm" style={{ alignSelf: 'flex-start' }} onClick={() => {
                  if (!returnOrder) { showToast('Vui long chon don hang'); return; }
                  if (!returnDesc.trim()) { showToast('Vui long mo ta van de'); return; }
                  const newId = `RET-${String(returnReqs.length + 1).padStart(3, '0')}`;
                  const ord = orders.find(o => o.id === returnOrder);
                  setReturnReqs(prev => [...prev, { id: newId, orderId: returnOrder, product: ord?.items[0].name || '', reason: returnReason, description: returnDesc, status: 'pending', date: new Date().toISOString().slice(0, 10), refundAmount: ord?.total || 0 }]);
                  setOrders(prev => prev.map(o => o.id === returnOrder ? { ...o, status: 'return' as const } : o));
                  setReturnOrder(''); setReturnDesc('');
                  showToast(`Da gui yeu cau doi/tra ${newId}`);
                }}>Gui yeu cau</button>
              </div>
            </div>

            {/* Existing return requests */}
            <div style={{ fontWeight: 600, fontSize: '.88rem', marginBottom: 12 }}>Yeu cau doi/tra ({returnReqs.length})</div>
            {returnReqs.map(r => {
              const rs = returnStatusConfig[r.status];
              return (
                <div key={r.id} className="card" style={{ padding: 20, marginBottom: 12 }}>
                  <div className="flex" style={{ justifyContent: 'space-between', marginBottom: 12 }}>
                    <div>
                      <div className="mono" style={{ fontWeight: 600, fontSize: '.82rem' }}>{r.id}</div>
                      <div style={{ fontSize: '.72rem', color: 'var(--text-3)' }}>{r.orderId} · {r.product}</div>
                    </div>
                    <span className={`badge ${rs.badge}`}>{rs.label}</span>
                  </div>
                  <div style={{ fontSize: '.78rem', marginBottom: 12 }}>
                    <strong>Lý do:</strong> {r.reason} — {r.description}
                  </div>
                  {/* Return tracking */}
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    {['Yêu cầu', 'Duyệt', 'Hoàn tiền'].map((s, i) => {
                      const stepIdx = r.status === 'pending' ? 0 : r.status === 'approved' ? 1 : 2;
                      const isActive = i <= stepIdx;
                      return (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ width: 24, height: 24, borderRadius: '50%', background: isActive ? 'var(--c4-500)' : 'var(--bg-2)', border: `2px solid ${isActive ? 'var(--c4-500)' : 'var(--border)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '.55rem', color: isActive ? '#fff' : 'var(--text-4)', fontWeight: 700 }}>
                            {isActive ? '✓' : i + 1}
                          </div>
                          <span style={{ fontSize: '.72rem', fontWeight: isActive ? 600 : 400, color: isActive ? 'var(--text-1)' : 'var(--text-4)' }}>{s}</span>
                          {i < 2 && <div style={{ width: 24, height: 2, background: isActive ? 'var(--c4-500)' : 'var(--border)' }} />}
                        </div>
                      );
                    })}
                  </div>
                  {r.status === 'approved' && (
                    <div style={{ marginTop: 12, padding: '10px 14px', borderRadius: 8, background: 'var(--bg-1)', fontSize: '.78rem' }}>
                      Hoàn tiền: <strong style={{ color: 'var(--c4-500)' }}>{formatVND(r.refundAmount)}</strong> — Đang xử lý
                    </div>
                  )}
                </div>
              );
            })}
          </>
        );

      /* ═══════════ 6. LỊCH SỬ MUA HÀNG ═══════════ */
      case 'history':
        return (
          <>
            <h2 style={{ fontWeight: 700, fontSize: '1.1rem', marginBottom: 16 }}>Lịch Sử Mua Hàng</h2>

            {/* Search & filter */}
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
                          <TD><button className="btn btn-primary btn-sm" onClick={() => handleAddToCart(o.id, o.items[0].name)}>{addedToCart.has(o.id) ? 'Da them \u2713' : 'Mua lai'}</button></TD>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        );

      /* ═══════════ 7. THANH TOÁN ═══════════ */
      case 'payments':
        return (
          <>
            <h2 style={{ fontWeight: 700, fontSize: '1.1rem', marginBottom: 20 }}>Thanh Toán</h2>

            {/* Saved payment methods */}
            <div style={{ fontWeight: 600, fontSize: '.88rem', marginBottom: 12 }}>Phương thức thanh toán đã lưu</div>
            <div className="flex-col gap-8" style={{ marginBottom: 24 }}>
              {payMethods.map(m => (
                <div key={m.id} className="card" style={{ padding: '14px 20px' }}>
                  <div className="flex" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
                    <div className="flex gap-12" style={{ alignItems: 'center' }}>
                      <span style={{ fontSize: '1.2rem' }}>{m.type === 'VNPay' ? '\uD83C\uDFE6' : m.type === 'MoMo' ? '\uD83D\uDCF1' : '\uD83D\uDCB3'}</span>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '.82rem' }}>{m.label}</div>
                        {m.isDefault && <span className="badge badge-c4" style={{ fontSize: '.55rem' }}>Mac dinh</span>}
                      </div>
                    </div>
                    <div className="flex gap-8">
                      {!m.isDefault && <button className="btn btn-secondary btn-sm" style={{ fontSize: '.7rem' }} onClick={() => { setPayMethods(prev => prev.map(p => ({ ...p, isDefault: p.id === m.id }))); showToast(`Da dat ${m.label} lam mac dinh`); }}>Dat mac dinh</button>}
                      <button className="btn btn-secondary btn-sm" style={{ fontSize: '.7rem' }} onClick={() => {
                        if (!confirm(`Xoa ${m.label}?`)) return;
                        setPayMethods(prev => prev.filter(p => p.id !== m.id));
                        showToast(`Da xoa ${m.label}`);
                      }}>Xoa</button>
                    </div>
                  </div>
                </div>
              ))}
              <button className="btn btn-secondary btn-sm" style={{ alignSelf: 'flex-start' }} onClick={() => {
                const newId = Math.max(...payMethods.map(p => p.id)) + 1;
                setPayMethods(prev => [...prev, { id: newId, type: 'Bank', label: `Visa •••• ${String(newId).padStart(4, '0')}`, last4: String(newId).padStart(4, '0'), isDefault: false }]);
                showToast('Da them phuong thuc thanh toan moi');
              }}>+ Them phuong thuc</button>
            </div>

            {/* WK Pay quick view */}
            <div className="onchain-card" style={{ marginBottom: 24, padding: 20 }}>
              <div className="flex" style={{ justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <div>
                  <div style={{ fontSize: '.72rem', color: 'var(--text-3)' }}>WK Pay</div>
                  <div style={{ fontWeight: 800, fontSize: '1.3rem', color: 'var(--c4-500)' }}>{formatVND(wkPayData.balanceVND)}</div>
                </div>
                <div className="flex gap-8">
                  <button className="btn btn-primary btn-sm" onClick={() => { setActiveNav('wkpay'); showToast('Chuyen den vi WK Pay'); }}>Nap tien</button>
                  <button className="btn btn-secondary btn-sm" onClick={() => { setActiveNav('wkpay'); showToast('Chuyen den vi WK Pay'); }}>Rut tien</button>
                </div>
              </div>
              <span style={{ fontSize: '.72rem', color: 'var(--text-3)', cursor: 'pointer' }} onClick={() => setActiveNav('wkpay')}>Quản lý ví WK Pay →</span>
            </div>

            {/* Crypto wallet */}
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

            {/* Payment history table */}
            <div style={{ fontWeight: 600, fontSize: '.88rem', marginBottom: 12 }}>Lịch sử giao dịch</div>
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ overflowX: 'auto' }}>
                <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '.78rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border)' }}>
                      <TH>Mã GD</TH><TH>Phương thức</TH><TH>Đơn hàng</TH><TH>Số tiền</TH><TH>Ngày</TH><TH>Trạng thái</TH><TH>Ref</TH>
                    </tr>
                  </thead>
                  <tbody>
                    {paymentHistory.map(p => (
                      <tr key={p.id} style={{ borderBottom: '1px solid var(--border)' }}>
                        <TD mono>{p.id}</TD>
                        <TD><span className={`badge ${p.method === 'VNPay' ? 'badge-c4' : p.method === 'MoMo' ? 'badge-c5' : p.method === 'WK Pay' ? 'badge-c6' : 'badge-c7'}`}>{p.method}</span></TD>
                        <TD mono>{p.orderId}</TD>
                        <TD bold>{formatVND(p.amount)}</TD>
                        <TD style={{ color: 'var(--text-3)' }}>{p.date}</TD>
                        <TD><span className={`badge ${p.status === 'success' ? 'badge-c4' : 'badge-c7'}`}>{p.status === 'success' ? 'Thành công' : 'Đang xử lý'}</span></TD>
                        <TD mono style={{ fontSize: '.7rem', color: 'var(--text-4)' }}>{p.ref}</TD>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        );

      /* ═══════════ 8. VÍ WK PAY ═══════════ */
      case 'wkpay':
        return (
          <>
            <h2 style={{ fontWeight: 700, fontSize: '1.1rem', marginBottom: 20 }}>Ví WK Pay</h2>

            {/* Balance cards */}
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

            {/* Quick actions */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
              {[
                { label: 'Nạp tiền', desc: 'Từ ngân hàng/MoMo/Crypto', icon: '💰' },
                { label: 'Rút tiền', desc: 'Về ngân hàng', icon: '🏦' },
                { label: 'Chuyển WK Token', desc: 'Tới ví khác', icon: '📤' },
                { label: 'Mua WK Token', desc: 'Đổi VND sang WK', icon: '🔄' },
              ].map((a, i) => (
                <div key={i} className="card card-hover" style={{ padding: 16, textAlign: 'center', cursor: 'pointer' }} onClick={() => showToast(`Chuc nang "${a.label}" dang phat trien`)}>
                  <div style={{ fontSize: '1.5rem', marginBottom: 6 }}>{a.icon}</div>
                  <div style={{ fontWeight: 600, fontSize: '.82rem', marginBottom: 2 }}>{a.label}</div>
                  <div style={{ fontSize: '.65rem', color: 'var(--text-3)' }}>{a.desc}</div>
                </div>
              ))}
            </div>

            {/* WK Token info */}
            <div className="card" style={{ padding: 20, marginBottom: 24 }}>
              <div style={{ fontWeight: 600, fontSize: '.88rem', marginBottom: 12 }}>Thông tin WK Token</div>
              <div className="flex gap-16" style={{ flexWrap: 'wrap' }}>
                <div>
                  <div style={{ fontSize: '.68rem', color: 'var(--text-3)' }}>Tên token</div>
                  <div style={{ fontWeight: 700 }}>WK</div>
                </div>
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

            {/* Transaction history */}
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

      /* ═══════════ 9. WK POINTS & REWARDS ═══════════ */
      case 'points':
        return (
          <>
            <h2 style={{ fontWeight: 700, fontSize: '1.1rem', marginBottom: 20 }}>WK Points & Rewards</h2>

            {/* Level progress */}
            <div className="onchain-card" style={{ marginBottom: 24, padding: 20 }}>
              <div className="flex" style={{ justifyContent: 'space-between', marginBottom: 12 }}>
                <div>
                  <div style={{ fontWeight: 800, fontSize: '1.6rem', color: 'var(--c6-500)' }}>Level {pointsConfig.level}</div>
                  <div style={{ fontSize: '.82rem', color: 'var(--text-2)' }}>{pointsConfig.title} Buyer</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--c4-500)' }}>{pointsConfig.currentPoints.toLocaleString()} Points</div>
                  <div style={{ fontSize: '.72rem', color: 'var(--text-3)' }}>Cần {(pointsConfig.nextLevelPoints - pointsConfig.currentPoints).toLocaleString()} cho Level tiếp theo</div>
                </div>
              </div>
              <div className="progress-track" style={{ background: 'var(--bg-2)', borderRadius: 8, height: 12, overflow: 'hidden' }}>
                <div className="progress-fill" style={{ width: `${(pointsConfig.currentPoints / pointsConfig.nextLevelPoints) * 100}%`, height: '100%', background: 'var(--chakra-flow)', borderRadius: 8, transition: 'width .5s ease' }} />
              </div>
              <div className="flex" style={{ justifyContent: 'space-between', marginTop: 4 }}>
                <span style={{ fontSize: '.65rem', color: 'var(--text-4)' }}>0</span>
                <span style={{ fontSize: '.65rem', color: 'var(--text-4)' }}>{pointsConfig.nextLevelPoints.toLocaleString()}</span>
              </div>
            </div>

            {/* Points summary */}
            <div className="kpi-grid" style={{ marginBottom: 24 }}>
              <div className="kpi-card">
                <div className="kpi-label">Tổng đã nhận</div>
                <div className="kpi-val" style={{ color: 'var(--c4-500)' }}>{pointsConfig.totalEarned.toLocaleString()}</div>
              </div>
              <div className="kpi-card">
                <div className="kpi-label">Đã đổi thưởng</div>
                <div className="kpi-val" style={{ color: 'var(--c7-500)' }}>{pointsConfig.totalRedeemed.toLocaleString()}</div>
              </div>
              <div className="kpi-card">
                <div className="kpi-label">Còn lại</div>
                <div className="kpi-val" style={{ color: 'var(--c5-500)' }}>{pointsConfig.currentPoints.toLocaleString()}</div>
              </div>
            </div>

            {/* Redeem */}
            <div style={{ fontWeight: 600, fontSize: '.88rem', marginBottom: 12 }}>Đổi thưởng</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12, marginBottom: 24 }}>
              {redeemItems.map(item => (
                <div key={item.id} className="card" style={{ padding: 16, textAlign: 'center' }}>
                  <div style={{ fontWeight: 600, fontSize: '.82rem', marginBottom: 8 }}>{item.name}</div>
                  <div style={{ fontWeight: 700, color: 'var(--c6-500)', marginBottom: 8 }}>{item.cost} Points</div>
                  <button className={`btn btn-sm ${pointsConfig.currentPoints >= item.cost && !redeemedIds.has(item.id) ? 'btn-primary' : 'btn-secondary'}`} disabled={pointsConfig.currentPoints < item.cost || redeemedIds.has(item.id)} onClick={() => { setRedeemedIds(prev => new Set(prev).add(item.id)); showToast(`Da doi "${item.name}" thanh cong!`); }}>
                    {redeemedIds.has(item.id) ? 'Da doi \u2713' : pointsConfig.currentPoints >= item.cost ? 'Doi ngay' : 'Chua du points'}
                  </button>
                </div>
              ))}
            </div>

            {/* Level benefits table */}
            <div style={{ fontWeight: 600, fontSize: '.88rem', marginBottom: 12 }}>Quyền lợi theo cấp độ</div>
            <div className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: 24 }}>
              <div style={{ overflowX: 'auto' }}>
                <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '.78rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border)' }}>
                      <TH>Cấp độ</TH><TH>Điểm tối thiểu</TH><TH>Giảm giá</TH><TH>Hoàn tiền</TH><TH>Free ship</TH><TH>Exclusive</TH>
                    </tr>
                  </thead>
                  <tbody>
                    {levelBenefits.map((l, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid var(--border)', background: l.level === pointsConfig.title ? 'var(--bg-1)' : undefined }}>
                        <TD bold style={{ color: l.color }}>
                          {l.level === pointsConfig.title ? '→ ' : ''}{l.level}
                        </TD>
                        <TD>{l.minPoints.toLocaleString()}</TD>
                        <TD>{l.discount}</TD>
                        <TD>{l.cashback}</TD>
                        <TD>{l.freeShip}</TD>
                        <TD>{l.exclusive}</TD>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Points history */}
            <div style={{ fontWeight: 600, fontSize: '.88rem', marginBottom: 12 }}>Lịch sử points</div>
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              {pointsHistory.map((h, i) => (
                <div key={i} className="flex" style={{ justifyContent: 'space-between', padding: '12px 20px', borderBottom: i < pointsHistory.length - 1 ? '1px solid var(--border)' : 'none' }}>
                  <div>
                    <div style={{ fontSize: '.82rem', fontWeight: 600 }}>{h.action}</div>
                    <div style={{ fontSize: '.68rem', color: 'var(--text-4)' }}>{h.date}</div>
                  </div>
                  <span className={`badge ${h.type === 'earn' ? 'badge-c4' : 'badge-c7'}`} style={{ fontWeight: 700 }}>
                    {h.points > 0 ? '+' : ''}{h.points} Points
                  </span>
                </div>
              ))}
            </div>
          </>
        );

      /* ═══════════ 10. NHIỆM VỤ & XP ═══════════ */
      case 'missions': {
        const dailyMissions = [
          { name: 'Đăng nhập hôm nay', xp: 5, done: true },
          { name: 'Xem 3 sản phẩm', xp: 10, progress: '2/3', done: false },
          { name: 'Mua 1 đơn hàng', xp: 20, progress: '0/1', done: false },
          { name: 'Đánh giá 1 sản phẩm', xp: 15, progress: '0/1', done: false },
          { name: 'Chia sẻ 1 sản phẩm', xp: 5, progress: '0/1', done: false },
          { name: 'Mời 1 bạn bè', xp: 50, progress: '0/1', done: false },
        ];
        const weeklyMissions = [
          { name: 'Mua 3 đơn hàng', xp: 100, progress: '1/3', done: false },
          { name: 'Review 2 sản phẩm', xp: 80, progress: '0/2', done: false },
          { name: 'Follow 5 KOC', xp: 30, progress: '2/5', done: false },
          { name: 'Đăng nhập 7 ngày liên tục', xp: 100, progress: '3/7', done: false },
        ];
        return (
          <>
            {/* Streak */}
            <div className="card" style={{ padding: 20, marginBottom: 20, background: 'linear-gradient(135deg, rgba(34,197,94,.08), rgba(99,102,241,.08))', border: '1px solid rgba(34,197,94,.2)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-1)' }}>🔥 Streak: 3 ngày liên tục</div>
                  <div style={{ fontSize: '.8rem', color: 'var(--text-3)', marginTop: 4 }}>Đăng nhập 7 ngày liên tục = bonus 100 XP</div>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  {[1,2,3,4,5,6,7].map(d => (
                    <div key={d} style={{ width: 32, height: 32, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '.7rem', fontWeight: 700, background: d <= 3 ? 'var(--c4-500)' : 'var(--bg-2)', color: d <= 3 ? '#fff' : 'var(--text-4)' }}>{d}</div>
                  ))}
                </div>
              </div>
            </div>

            {/* Flash Mission */}
            <div className="card" style={{ padding: 16, marginBottom: 20, border: '1px solid rgba(239,68,68,.3)', background: 'linear-gradient(90deg, rgba(239,68,68,.06), transparent)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <span style={{ background: '#ef4444', color: '#fff', padding: '2px 8px', borderRadius: 4, fontSize: '.65rem', fontWeight: 700 }}>⚡ FLASH</span>
                <span style={{ fontSize: '.82rem', fontWeight: 600, color: 'var(--text-1)' }}>2x XP Event — còn 02:45:30</span>
              </div>
              <div style={{ fontSize: '.78rem', color: 'var(--text-3)' }}>Mọi nhiệm vụ hoàn thành trong event nhận gấp đôi XP!</div>
            </div>

            {/* Daily Missions */}
            <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 12, color: 'var(--text-1)' }}>🎯 Nhiệm vụ hàng ngày</h3>
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
                  <span className="badge badge-c4" style={{ fontSize: '.72rem' }}>+{m.xp} XP</span>
                </div>
              ))}
            </div>

            {/* Weekly Missions */}
            <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 12, color: 'var(--text-1)' }}>📅 Nhiệm vụ tuần</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {weeklyMissions.map((m, i) => (
                <div key={i} className="card" style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 28, height: 28, borderRadius: 8, background: 'var(--bg-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '.75rem', color: 'var(--c6-500)' }}>📋</div>
                    <div>
                      <div style={{ fontSize: '.85rem', fontWeight: 500, color: 'var(--text-1)' }}>{m.name}</div>
                      <div style={{ fontSize: '.7rem', color: 'var(--text-4)' }}>Tiến độ: {m.progress}</div>
                    </div>
                  </div>
                  <span className="badge badge-c6" style={{ fontSize: '.72rem' }}>+{m.xp} XP</span>
                </div>
              ))}
            </div>
          </>
        );
      }

      /* ═══════════ 11. KHO VOUCHER ═══════════ */
      case 'vouchers': {
        const voucherTabs = ['Có thể dùng', 'Đã dùng', 'Hết hạn'] as const;
        const myVouchers = [
          { code: 'WELLKOC50', desc: 'Giảm 50.000₫ cho đơn từ 200K', expires: '30/04/2026', type: 'discount', used: false },
          { code: 'FREESHIP', desc: 'Miễn phí vận chuyển', expires: '15/04/2026', type: 'shipping', used: false },
          { code: 'DPP20', desc: 'Giảm 20% sản phẩm DPP Verified', expires: '25/04/2026', type: 'dpp', used: false },
          { code: 'WELCOME10', desc: 'Giảm 10% đơn hàng đầu tiên', expires: '01/03/2026', type: 'welcome', used: true },
        ];
        const redeemOptions = [
          { xp: 50, desc: 'Voucher giảm 20.000₫', minOrder: '100K' },
          { xp: 200, desc: 'Voucher giảm 100.000₫', minOrder: '500K' },
          { xp: 500, desc: 'Voucher Free Ship', minOrder: '0₫' },
          { xp: 1000, desc: 'Voucher giảm 500.000₫', minOrder: '1M' },
          { xp: 2000, desc: 'Voucher giảm 1.000.000₫', minOrder: '2M' },
        ];
        return (
          <>
            {/* XP Balance */}
            <div className="card" style={{ padding: 20, marginBottom: 20, background: 'linear-gradient(135deg, rgba(168,85,247,.08), rgba(99,102,241,.08))' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '.75rem', color: 'var(--text-3)', marginBottom: 4 }}>XP hiện tại</div>
                  <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--c7-500)' }}>3,280 XP</div>
                </div>
                <Link to="#" onClick={(e) => { e.preventDefault(); setActiveNav('convert'); }} style={{ padding: '8px 16px', borderRadius: 8, background: 'var(--c7-500)', color: '#fff', textDecoration: 'none', fontSize: '.82rem', fontWeight: 600 }}>Đổi XP →</Link>
              </div>
            </div>

            {/* Redeem with XP */}
            <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 12, color: 'var(--text-1)' }}>🎟️ Đổi XP lấy Voucher</h3>
            <div className="grid-3" style={{ marginBottom: 24 }}>
              {redeemOptions.map((v, i) => (
                <div key={i} className="card" style={{ padding: 16, textAlign: 'center' }}>
                  <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--c6-500)', marginBottom: 4 }}>{v.xp} XP</div>
                  <div style={{ fontSize: '.82rem', fontWeight: 600, color: 'var(--text-1)', marginBottom: 4 }}>{v.desc}</div>
                  <div style={{ fontSize: '.7rem', color: 'var(--text-4)', marginBottom: 10 }}>Đơn tối thiểu: {v.minOrder}</div>
                  <button className="btn btn-primary" style={{ width: '100%', padding: '6px 12px', fontSize: '.78rem' }} onClick={() => showToast(`Da doi ${v.xp} XP lay "${v.desc}"`)}>Doi ngay</button>
                </div>
              ))}
            </div>

            {/* My Vouchers */}
            <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 12, color: 'var(--text-1)' }}>🎫 Voucher của tôi</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {myVouchers.filter(v => !v.used && !usedVouchers.has(v.code)).map((v, i) => (
                <div key={i} className="card" style={{ padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderLeft: '3px solid var(--c5-500)' }}>
                  <div>
                    <div style={{ fontFamily: 'var(--ff-mono)', fontSize: '.85rem', fontWeight: 700, color: 'var(--c5-500)', marginBottom: 2, cursor: 'pointer' }} onClick={() => copyToClipboard(v.code, `ma voucher ${v.code}`)}>{v.code} {copiedId === v.code ? '\u2713' : ''}</div>
                    <div style={{ fontSize: '.8rem', color: 'var(--text-2)' }}>{v.desc}</div>
                    <div style={{ fontSize: '.7rem', color: 'var(--text-4)', marginTop: 2 }}>HSD: {v.expires}</div>
                  </div>
                  <button className="btn btn-secondary" style={{ fontSize: '.75rem', padding: '6px 12px' }} onClick={() => { setUsedVouchers(prev => new Set(prev).add(v.code)); showToast(`Da ap dung voucher ${v.code}`); }}>Dung ngay</button>
                </div>
              ))}
              {myVouchers.filter(v => !v.used && !usedVouchers.has(v.code)).length === 0 && (
                <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-3)', fontSize: '.82rem' }}>Khong con voucher kha dung</div>
              )}
            </div>
          </>
        );
      }

      /* ═══════════ 12. ĐỔI XP → WK3 TOKEN ═══════════ */
      case 'convert': {
        const convertAmount = convertAmt;
        const conversionRate = 100; // 100 XP = 1 WK3
        const currentXP = 3280;
        const wk3Balance = 12.5;
        const convertHistory = [
          { date: '20/03/2026', xp: 500, wk3: 5, status: 'Thành công' },
          { date: '15/03/2026', xp: 200, wk3: 2, status: 'Thành công' },
          { date: '10/03/2026', xp: 300, wk3: 3, status: 'Thành công' },
        ];
        return (
          <>
            {/* Balances */}
            <div className="grid-2" style={{ marginBottom: 24 }}>
              <div className="card" style={{ padding: 20, background: 'linear-gradient(135deg, rgba(168,85,247,.08), rgba(99,102,241,.06))' }}>
                <div style={{ fontSize: '.72rem', color: 'var(--text-3)', marginBottom: 4 }}>XP Hiện tại</div>
                <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--c7-500)' }}>{currentXP.toLocaleString()}</div>
                <div style={{ fontSize: '.72rem', color: 'var(--text-4)' }}>= {(currentXP / conversionRate).toFixed(1)} WK3</div>
              </div>
              <div className="card" style={{ padding: 20, background: 'linear-gradient(135deg, rgba(34,197,94,.08), rgba(6,182,212,.06))' }}>
                <div style={{ fontSize: '.72rem', color: 'var(--text-3)', marginBottom: 4 }}>WK3 Token</div>
                <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--c4-500)' }}>{wk3Balance} WK3</div>
                <div style={{ fontSize: '.72rem', color: 'var(--text-4)' }}>≈ {formatVND(wk3Balance * 25000)}</div>
              </div>
            </div>

            {/* Convert Form */}
            <div className="card" style={{ padding: 24, marginBottom: 24 }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 16, color: 'var(--text-1)' }}>🔄 Quy đổi XP → WK3 Token</h3>
              <div style={{ fontSize: '.78rem', color: 'var(--text-3)', marginBottom: 16 }}>Tỷ lệ: <strong>100 XP = 1 WK3 Token</strong> · Tối thiểu: 100 XP</div>

              <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                {[100, 500, 1000, 2000, 3000].map(v => (
                  <button key={v} onClick={() => setConvertAmt(v)} style={{ padding: '6px 14px', borderRadius: 8, border: convertAmount === v ? '1px solid var(--c6-500)' : '1px solid var(--border)', background: convertAmount === v ? 'rgba(99,102,241,.1)' : 'transparent', color: convertAmount === v ? 'var(--c6-500)' : 'var(--text-3)', fontSize: '.78rem', cursor: 'pointer', fontWeight: 600 }}>{v} XP</button>
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

              <button className="btn btn-primary btn-lg" style={{ width: '100%' }} disabled={convertAmount > currentXP} onClick={() => showToast(`Da quy doi ${convertAmount} XP thanh ${(convertAmount / conversionRate).toFixed(1)} WK3 thanh cong!`)}>
                {convertAmount > currentXP ? 'Khong du XP' : `Quy doi ${convertAmount} XP \u2192 ${(convertAmount / conversionRate).toFixed(1)} WK3`}
              </button>
            </div>

            {/* WK3 Token Info */}
            <div className="card" style={{ padding: 16, marginBottom: 24 }}>
              <h4 style={{ fontSize: '.88rem', fontWeight: 700, marginBottom: 10, color: 'var(--text-1)' }}>💎 WK3 Token</h4>
              <div className="grid-4">
                <div><div style={{ fontSize: '.68rem', color: 'var(--text-4)' }}>Giá</div><div style={{ fontWeight: 700, color: 'var(--c4-500)' }}>25,000₫</div></div>
                <div><div style={{ fontSize: '.68rem', color: 'var(--text-4)' }}>24h</div><div style={{ fontWeight: 700, color: '#22c55e' }}>+4.2%</div></div>
                <div><div style={{ fontSize: '.68rem', color: 'var(--text-4)' }}>Market Cap</div><div style={{ fontWeight: 700, color: 'var(--text-1)' }}>₫12.3B</div></div>
                <div><div style={{ fontSize: '.68rem', color: 'var(--text-4)' }}>Supply</div><div style={{ fontWeight: 700, color: 'var(--text-1)' }}>500K</div></div>
              </div>
            </div>

            {/* Convert History */}
            <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 12, color: 'var(--text-1)' }}>📜 Lịch sử quy đổi</h3>
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

      /* ═══════════ 13. YÊU THÍCH ═══════════ */
      case 'favorites':
        return (
          <>
            <h2 style={{ fontWeight: 700, fontSize: '1.1rem', marginBottom: 20 }}>Sản Phẩm Yêu Thích</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 16 }}>
              {favProducts.map(p => (
                <div key={p.id} className="card card-hover" style={{ padding: 0, overflow: 'hidden', position: 'relative' }}>
                  {/* Heart icon */}
                  <div style={{ position: 'absolute', top: 10, right: 10, fontSize: '1.2rem', cursor: 'pointer', color: '#ef4444', zIndex: 1 }} onClick={() => { setFavProducts(prev => prev.filter(x => x.id !== p.id)); showToast(`Da bo "${p.name}" khoi yeu thich`); }}>{'\u2764\uFE0F'}</div>
                  {/* Product image area */}
                  <div style={{ background: 'var(--bg-1)', padding: 24, textAlign: 'center', fontSize: '2.5rem' }}>{p.emoji}</div>
                  {/* Product info */}
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
                      <button className="btn btn-primary btn-sm" style={{ flex: 1 }} onClick={() => { setFavAddedToCart(prev => new Set(prev).add(p.id)); showToast(`Da them "${p.name}" vao gio hang`); setTimeout(() => setFavAddedToCart(prev => { const n = new Set(prev); n.delete(p.id); return n; }), 2000); }}>
                        {favAddedToCart.has(p.id) ? 'Da them \u2713' : 'Them vao gio'}
                      </button>
                      <button className="btn btn-secondary btn-sm" style={{ fontSize: '.65rem' }} onClick={() => { setFavProducts(prev => prev.filter(x => x.id !== p.id)); showToast(`Da xoa "${p.name}" khoi yeu thich`); }}>Xoa</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        );

      /* ═══════════ 11. THÔNG BÁO ═══════════ */
      case 'notifications':
        return (
          <>
            <div className="flex" style={{ justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ fontWeight: 700, fontSize: '1.1rem', margin: 0 }}>Thông Báo</h2>
              <span style={{ fontSize: '.72rem', color: 'var(--c5-400)', cursor: 'pointer' }} onClick={() => { setNotifsState(prev => prev.map(n => ({ ...n, read: true }))); showToast('Da danh dau tat ca da doc'); }}>Danh dau tat ca da doc</span>
            </div>

            {/* Filter */}
            <div className="flex gap-8" style={{ marginBottom: 20 }}>
              {[
                { key: 'all', label: 'Tất cả' },
                { key: 'order', label: 'Đơn hàng' },
                { key: 'promo', label: 'Khuyến mãi' },
                { key: 'system', label: 'Hệ thống' },
              ].map(f => (
                <button key={f.key} className={`btn btn-sm ${notifFilter === f.key ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setNotifFilter(f.key)}>{f.label}</button>
              ))}
            </div>

            <div className="flex-col gap-8">
              {filteredNotifs.map(n => {
                const nc = notifTypeConfig[n.type];
                return (
                  <div key={n.id} className="card" style={{ padding: '16px 20px', borderLeft: n.read ? 'none' : '3px solid var(--c5-500)', opacity: n.read ? 0.7 : 1 }}>
                    <div className="flex gap-12">
                      <span style={{ fontSize: '1.2rem' }}>{nc.icon}</span>
                      <div style={{ flex: 1 }}>
                        <div className="flex" style={{ justifyContent: 'space-between', marginBottom: 4 }}>
                          <span style={{ fontWeight: 600, fontSize: '.82rem' }}>{n.title}</span>
                          <span className={`badge ${nc.badge}`} style={{ fontSize: '.55rem' }}>{n.type === 'order' ? 'Đơn hàng' : n.type === 'promo' ? 'Khuyến mãi' : 'Hệ thống'}</span>
                        </div>
                        <div style={{ fontSize: '.78rem', color: 'var(--text-2)', marginBottom: 4 }}>{n.message}</div>
                        <div className="flex" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '.65rem', color: 'var(--text-4)' }}>{n.date}</span>
                          {!n.read && <span style={{ fontSize: '.65rem', color: 'var(--c5-400)', cursor: 'pointer' }} onClick={() => { setNotifsState(prev => prev.map(x => x.id === n.id ? { ...x, read: true } : x)); showToast('Da danh dau da doc'); }}>Danh dau da doc</span>}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        );

      /* ═══════════ 12. CÀI ĐẶT TÀI KHOẢN ═══════════ */
      case 'settings':
        return (
          <>
            <h2 style={{ fontWeight: 700, fontSize: '1.1rem', marginBottom: 20 }}>Cài Đặt Tài Khoản</h2>

            {/* Settings sub-tabs */}
            <div className="flex gap-8" style={{ marginBottom: 20, flexWrap: 'wrap' }}>
              {[
                { key: 'profile', label: 'Thông tin cá nhân' },
                { key: 'address', label: 'Địa chỉ giao hàng' },
                { key: 'bank', label: 'Tài khoản ngân hàng' },
                { key: 'wklink', label: 'Liên kết WK Pay' },
                { key: 'vneid', label: 'Xac thuc VNeID' },
                { key: 'password', label: 'Đổi mật khẩu' },
                { key: 'preferences', label: 'Ngôn ngữ & Giao diện' },
                { key: 'delete', label: 'Xóa tài khoản' },
              ].map(t => (
                <button key={t.key} className={`btn btn-sm ${settingsTab === t.key ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setSettingsTab(t.key)}>{t.label}</button>
              ))}
            </div>

            {/* Profile */}
            {settingsTab === 'profile' && (
              <div className="card" style={{ padding: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
                  <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--chakra-flow)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', fontWeight: 700 }}>TT</div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '1rem' }}>{userName}</div>
                    <span className="badge badge-c6">Silver Buyer Lv.7</span>
                  </div>
                </div>
                <div className="flex-col gap-12">
                  {[
                    { label: 'Họ tên', value: userName },
                    { label: 'Email', value: 'tuan@example.com' },
                    { label: 'Số điện thoại', value: '0912 345 678' },
                    { label: 'Ngày sinh', value: '15/06/1995' },
                    { label: 'Giới tính', value: 'Nam' },
                  ].map((f, i) => (
                    <div key={i} className="flex" style={{ justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                      <span style={{ fontSize: '.82rem', color: 'var(--text-3)' }}>{f.label}</span>
                      <span style={{ fontSize: '.82rem', fontWeight: 600 }}>{f.value}</span>
                    </div>
                  ))}
                </div>
                <button className="btn btn-primary btn-sm" style={{ marginTop: 16 }} onClick={() => { setSettingsEditing(!settingsEditing); if (settingsEditing) showToast('Da luu thong tin ca nhan'); }}>{settingsEditing ? 'Luu' : 'Chinh sua'}</button>
              </div>
            )}

            {/* Addresses */}
            {settingsTab === 'address' && (
              <div className="flex-col gap-12">
                {addresses.map(a => (
                  <div key={a.id} className="card" style={{ padding: 20 }}>
                    <div className="flex" style={{ justifyContent: 'space-between', marginBottom: 8 }}>
                      <div className="flex gap-8" style={{ alignItems: 'center' }}>
                        <span style={{ fontWeight: 700, fontSize: '.88rem' }}>{a.label}</span>
                        {a.isDefault && <span className="badge badge-c4" style={{ fontSize: '.55rem' }}>Mặc định</span>}
                      </div>
                      <div className="flex gap-8">
                        <button className="btn btn-secondary btn-sm" style={{ fontSize: '.7rem' }} onClick={() => showToast(`Chuc nang sua dia chi ${a.label} (mock)`)}>Sua</button>
                        <button className="btn btn-secondary btn-sm" style={{ fontSize: '.7rem' }} onClick={() => showToast(`Chuc nang xoa dia chi ${a.label} (mock)`)}>Xoa</button>
                      </div>
                    </div>
                    <div style={{ fontSize: '.82rem' }}>{a.name} · {a.phone}</div>
                    <div style={{ fontSize: '.78rem', color: 'var(--text-3)', marginTop: 4 }}>{a.address}</div>
                  </div>
                ))}
                <button className="btn btn-primary btn-sm" style={{ alignSelf: 'flex-start' }} onClick={() => showToast('Chuc nang them dia chi moi (mock)')}>+ Them dia chi moi</button>
              </div>
            )}

            {/* Bank accounts */}
            {settingsTab === 'bank' && (
              <div className="flex-col gap-12">
                {bankAccounts.map(b => (
                  <div key={b.id} className="card" style={{ padding: 20 }}>
                    <div className="flex" style={{ justifyContent: 'space-between', marginBottom: 8 }}>
                      <span style={{ fontWeight: 700, fontSize: '.88rem' }}>{b.bank}</span>
                      <div className="flex gap-8">
                        <button className="btn btn-secondary btn-sm" style={{ fontSize: '.7rem' }} onClick={() => showToast(`Chuc nang sua tai khoan ${b.bank} (mock)`)}>Sua</button>
                        <button className="btn btn-secondary btn-sm" style={{ fontSize: '.7rem' }} onClick={() => showToast(`Chuc nang xoa tai khoan ${b.bank} (mock)`)}>Xoa</button>
                      </div>
                    </div>
                    <div className="flex-col gap-4" style={{ fontSize: '.82rem' }}>
                      <div>So tai khoan: <span className="mono" style={{ fontWeight: 600 }}>{b.accountNumber}</span></div>
                      <div>Chu tai khoan: <span style={{ fontWeight: 600 }}>{b.holder}</span></div>
                      <div>Chi nhanh: <span style={{ color: 'var(--text-3)' }}>{b.branch}</span></div>
                    </div>
                  </div>
                ))}
                <button className="btn btn-primary btn-sm" style={{ alignSelf: 'flex-start' }} onClick={() => showToast('Chuc nang them tai khoan ngan hang (mock)')}>+ Them tai khoan ngan hang</button>
              </div>
            )}

            {/* WK Pay link */}
            {settingsTab === 'wklink' && (
              <div className="card" style={{ padding: 20 }}>
                <div className="flex-col gap-12">
                  <div className="flex" style={{ justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                    <span style={{ fontSize: '.82rem', color: 'var(--text-3)' }}>Trạng thái liên kết</span>
                    <span className="badge badge-c4">Đã liên kết</span>
                  </div>
                  <div className="flex" style={{ justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                    <span style={{ fontSize: '.82rem', color: 'var(--text-3)' }}>KYC</span>
                    <span className="badge badge-c4">Đã xác minh</span>
                  </div>
                  <div className="flex" style={{ justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                    <span style={{ fontSize: '.82rem', color: 'var(--text-3)' }}>Ví WK Pay</span>
                    <span className="mono" style={{ fontSize: '.82rem', fontWeight: 600 }}>WK-{String(Date.now()).slice(-8)}</span>
                  </div>
                  <div className="flex" style={{ justifyContent: 'space-between', padding: '8px 0' }}>
                    <span style={{ fontSize: '.82rem', color: 'var(--text-3)' }}>Số dư</span>
                    <span style={{ fontWeight: 700, color: 'var(--c4-500)' }}>{formatVND(wkPayData.balanceVND)}</span>
                  </div>
                </div>
              </div>
            )}

            {/* VNeID Verification */}
            {settingsTab === 'vneid' && (
              <div className="card" style={{ padding: 20 }}>
                {/* Mock: toggle between verified/not verified states */}
                {(() => {
                  const vneidVerified = false; // TODO: fetch from /api/v1/verify/vneid/status
                  const vneidName = 'NGUYEN VAN AN';
                  const vneidCCCD = '***2345';
                  const vneidMethod = 'chip_nfc';
                  const vneidDate = '2026-03-25T10:30:00Z';

                  if (vneidVerified) {
                    return (
                      <div>
                        <div className="flex" style={{ alignItems: 'center', gap: 12, marginBottom: 16 }}>
                          <div style={{
                            width: 48, height: 48, borderRadius: 12,
                            background: 'linear-gradient(135deg, rgba(34,197,94,.15), rgba(34,197,94,.05))',
                            border: '2px solid var(--c4-500, #22c55e)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '1.3rem',
                          }}>
                            <span>&#x2705;</span>
                          </div>
                          <div>
                            <div style={{ fontWeight: 700, fontSize: '.92rem', color: 'var(--c4-500, #22c55e)' }}>Da xac thuc VNeID</div>
                            <div style={{ fontSize: '.72rem', color: 'var(--text-3)' }}>Dinh danh dien tu Quoc gia</div>
                          </div>
                        </div>
                        <div className="flex-col gap-12">
                          <div className="flex" style={{ justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                            <span style={{ fontSize: '.82rem', color: 'var(--text-3)' }}>Ho ten (verified)</span>
                            <span style={{ fontSize: '.82rem', fontWeight: 600 }}>{vneidName}</span>
                          </div>
                          <div className="flex" style={{ justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                            <span style={{ fontSize: '.82rem', color: 'var(--text-3)' }}>So CCCD</span>
                            <span className="mono" style={{ fontSize: '.82rem', fontWeight: 600 }}>{vneidCCCD}</span>
                          </div>
                          <div className="flex" style={{ justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                            <span style={{ fontSize: '.82rem', color: 'var(--text-3)' }}>Phuong thuc</span>
                            <span className="badge badge-c4" style={{ fontSize: '.65rem' }}>{vneidMethod === 'chip_nfc' ? 'NFC Chip' : 'Face Match'}</span>
                          </div>
                          <div className="flex" style={{ justifyContent: 'space-between', padding: '8px 0' }}>
                            <span style={{ fontSize: '.82rem', color: 'var(--text-3)' }}>Ngay xac thuc</span>
                            <span style={{ fontSize: '.82rem', color: 'var(--text-2)' }}>{new Date(vneidDate).toLocaleDateString('vi-VN')}</span>
                          </div>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div>
                      <div className="flex" style={{ alignItems: 'center', gap: 12, marginBottom: 16 }}>
                        <div style={{
                          width: 48, height: 48, borderRadius: 12,
                          background: 'linear-gradient(135deg, rgba(220,38,38,.12), rgba(220,38,38,.04))',
                          border: '2px solid #dc2626',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '1.3rem',
                        }}>
                          <span>🇻🇳</span>
                        </div>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: '.92rem', color: 'var(--text-1)' }}>Xac thuc qua VNeID</div>
                          <div style={{ fontSize: '.72rem', color: 'var(--text-3)' }}>Xac thuc nhanh qua Dinh danh dien tu Quoc gia</div>
                        </div>
                      </div>
                      <div style={{ padding: 16, borderRadius: 12, background: 'var(--bg-2)', marginBottom: 16, fontSize: '.78rem', color: 'var(--text-3)', lineHeight: 1.6 }}>
                        VNeID la ung dung Dinh danh dien tu Quoc gia cua Bo Cong an. Xac thuc qua VNeID giup tu dong xac minh danh tinh cua ban (ho ten, CCCD, ngay sinh) voi do tin cay cao nhat.
                      </div>
                      <div className="flex-col gap-8" style={{ marginBottom: 16, fontSize: '.78rem' }}>
                        <div className="flex gap-8" style={{ alignItems: 'center' }}>
                          <span style={{ color: 'var(--c4-500, #22c55e)' }}>&#x2713;</span>
                          <span style={{ color: 'var(--text-2)' }}>Xac minh danh tinh tu dong, khong can upload CCCD</span>
                        </div>
                        <div className="flex gap-8" style={{ alignItems: 'center' }}>
                          <span style={{ color: 'var(--c4-500, #22c55e)' }}>&#x2713;</span>
                          <span style={{ color: 'var(--text-2)' }}>Nang cap Verification Level len cap 3 ngay lap tuc</span>
                        </div>
                        <div className="flex gap-8" style={{ alignItems: 'center' }}>
                          <span style={{ color: 'var(--c4-500, #22c55e)' }}>&#x2713;</span>
                          <span style={{ color: 'var(--text-2)' }}>Mo khoa quyen tro thanh KOC va rut tien</span>
                        </div>
                      </div>
                      <button
                        className="btn btn-lg"
                        onClick={() => {
                          fetch('/api/v1/verify/vneid/auth-url', {
                            headers: { 'Authorization': `Bearer ${localStorage.getItem('access_token') || ''}` },
                          })
                            .then(r => r.json())
                            .then(data => { if (data.auth_url) window.location.href = data.auth_url; })
                            .catch(() => showToast('Khong the ket noi VNeID. Vui long thu lai.'));
                        }}
                        style={{
                          width: '100%', padding: '12px 24px',
                          background: '#dc2626', color: '#fff', border: 'none',
                          fontSize: '.88rem', fontWeight: 700, borderRadius: 12,
                          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                        }}
                      >
                        <span>🇻🇳</span> Xac thuc qua VNeID
                      </button>
                    </div>
                  );
                })()}
              </div>
            )}

            {/* Change password */}
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
                  <div>
                    <label style={{ fontSize: '.72rem', color: 'var(--text-3)', display: 'block', marginBottom: 4 }}>Xác nhận mật khẩu mới</label>
                    <input type="password" placeholder="••••••••" style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-1)', color: 'var(--text-1)', fontSize: '.82rem' }} />
                  </div>
                  <button className="btn btn-primary btn-sm" style={{ alignSelf: 'flex-start' }} onClick={() => showToast('Da cap nhat mat khau thanh cong')}>Cap nhat mat khau</button>
                </div>
              </div>
            )}

            {/* Preferences */}
            {settingsTab === 'preferences' && (
              <div className="card" style={{ padding: 20 }}>
                <div className="flex-col gap-12">
                  <div className="flex" style={{ justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                    <span style={{ fontSize: '.82rem', color: 'var(--text-3)' }}>Ngôn ngữ</span>
                    <select style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg-1)', color: 'var(--text-1)', fontSize: '.82rem' }}>
                      <option>Tiếng Việt</option>
                      <option>English</option>
                    </select>
                  </div>
                  <div className="flex" style={{ justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                    <span style={{ fontSize: '.82rem', color: 'var(--text-3)' }}>Giao diện</span>
                    <select style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg-1)', color: 'var(--text-1)', fontSize: '.82rem' }}>
                      <option>Tối (Dark)</option>
                      <option>Sáng (Light)</option>
                      <option>Theo hệ thống</option>
                    </select>
                  </div>
                  <div className="flex" style={{ justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                    <span style={{ fontSize: '.82rem', color: 'var(--text-3)' }}>Thông báo email</span>
                    <span style={{ fontSize: '.82rem', fontWeight: 600 }}>Bật</span>
                  </div>
                  <div className="flex" style={{ justifyContent: 'space-between', padding: '8px 0' }}>
                    <span style={{ fontSize: '.82rem', color: 'var(--text-3)' }}>Thông báo đẩy</span>
                    <span style={{ fontSize: '.82rem', fontWeight: 600 }}>Bật</span>
                  </div>
                </div>
              </div>
            )}

            {/* Delete account */}
            {settingsTab === 'delete' && (
              <div className="card" style={{ padding: 20, borderColor: '#ef4444' }}>
                <div style={{ fontWeight: 700, fontSize: '.88rem', color: '#ef4444', marginBottom: 8 }}>Xóa tài khoản</div>
                <div style={{ fontSize: '.82rem', color: 'var(--text-2)', marginBottom: 16 }}>
                  Khi xóa tài khoản, tất cả dữ liệu sẽ bị xóa vĩnh viễn bao gồm: đơn hàng, WK Points, WK Pay, lịch sử giao dịch. Hành động này không thể hoàn tác.
                </div>
                <button className="btn btn-sm" style={{ background: '#ef4444', color: '#fff', border: 'none' }} onClick={() => { if (confirm('Ban co chac chan muon xoa tai khoan? Hanh dong nay khong the hoan tac.')) showToast('Da gui yeu cau xoa tai khoan. Vui long kiem tra email.'); }}>Yeu cau xoa tai khoan</button>
              </div>
            )}
          </>
        );

      default:
        return null;
    }
  };

  const unreadCount = notifsState.filter(n => !n.read).length;

  return (
    <div className="dash-wrap" style={{ paddingTop: 0, minHeight: '100vh', background: 'var(--bg-0)' }}>
      {/* Sidebar */}
      <div className="dash-sidebar">
        {/* User profile */}
        <div style={{ padding: '16px 16px 16px', borderBottom: '1px solid var(--border)', marginBottom: 8 }}>
          <div className="flex gap-8" style={{ alignItems: 'center' }}>
            <div style={{
              width: 40, height: 40, borderRadius: '50%',
              background: 'var(--chakra-flow)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '1rem', fontWeight: 700, flexShrink: 0,
            }}>TT</div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: '.82rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{userName}</div>
              <span className="badge badge-c6" style={{ marginTop: 2 }}>Silver Lv.7</span>
            </div>
          </div>
        </div>

        {/* Nav items */}
        {sidebarItems.map(item => (
          <div
            key={item.key}
            className={`dash-nav-item ${activeNav === item.key ? 'on' : ''}`}
            onClick={() => setActiveNav(item.key)}
          >
            <span className="dash-nav-icon">{item.icon}</span>
            <span style={{ flex: 1 }}>{item.label}</span>
            {item.key === 'orders' && (
              <span style={{ background: 'var(--c5-500)', color: '#fff', borderRadius: 10, padding: '1px 7px', fontSize: '.6rem', fontWeight: 700 }}>{orders.filter(o => !['delivered', 'cancelled'].includes(o.status)).length}</span>
            )}
            {item.key === 'notifications' && unreadCount > 0 && (
              <span style={{ background: '#ef4444', color: '#fff', borderRadius: 10, padding: '1px 7px', fontSize: '.6rem', fontWeight: 700 }}>{unreadCount}</span>
            )}
          </div>
        ))}

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
        {/* Toast notifications */}
        {toasts.length > 0 && (
          <div style={{ position: 'fixed', top: 20, right: 20, zIndex: 9999, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {toasts.map(t => (
              <div key={t.id} style={{ background: 'var(--c4-500)', color: '#fff', padding: '12px 20px', borderRadius: 10, fontSize: '.82rem', fontWeight: 600, boxShadow: '0 4px 20px rgba(0,0,0,.3)', animation: 'fadeIn .2s ease', maxWidth: 360 }}>
                {t.message}
              </div>
            ))}
          </div>
        )}
        {renderContent()}
      </div>
    </div>
  );
}
