import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@hooks/useAuth';
import { useI18n } from '@hooks/useI18n';
import { vendorApi, uploadApi, type Product as ApiProduct, type Order as ApiOrder } from '@lib/api';

const parsePrice = (s: string) => parseInt(s.replace(/[^0-9]/g, '')) || 0;

// ─────────────────────────────────────────────────────────────────────────────
// LEGAL COMPLIANCE — required documents per product category (Vietnam law)
// ─────────────────────────────────────────────────────────────────────────────

interface LegalDoc {
  key: string;
  label: string;
  desc: string;
  required: boolean;
  warning?: string;
}
interface CategoryLegal {
  title: string;
  basis: string;
  riskLevel: 'high' | 'medium' | 'low';
  docs: LegalDoc[];
}

const LEGAL_REQUIREMENTS: Record<string, CategoryLegal> = {
  'Thực phẩm & Đồ uống': {
    title: 'Pháp lý Thực phẩm & Đồ uống',
    basis: 'Luật ATTP 2010, NĐ 15/2018/NĐ-CP, NĐ 43/2017/NĐ-CP',
    riskLevel: 'medium',
    docs: [
      { key: 'attp_cert', label: 'Giấy chứng nhận ATTP', desc: 'GCN cơ sở đủ điều kiện ATTP do Sở Y tế / Sở Công thương cấp', required: true, warning: 'BẮT BUỘC theo NĐ 15/2018/NĐ-CP' },
      { key: 'product_label', label: 'Nhãn sản phẩm đúng quy định', desc: 'Nhãn tiếng Việt: tên SP, thành phần, NSX, HSD, xuất xứ — NĐ 43/2017/NĐ-CP', required: true },
      { key: 'test_result', label: 'Phiếu kiểm nghiệm chất lượng', desc: 'Kết quả từ lab được công nhận, không quá 12 tháng', required: false },
      { key: 'co', label: 'Chứng nhận xuất xứ (CO/CQ)', desc: 'Bắt buộc nếu hàng nhập khẩu', required: false, warning: 'Bắt buộc với hàng nhập khẩu' },
      { key: 'import_permit', label: 'Giấy phép nhập khẩu thực phẩm', desc: 'Giấy phép nhập khẩu từ Cục ATTP (nếu nhập)', required: false },
    ],
  },
  'Sức khỏe & Dinh dưỡng': {
    title: 'Pháp lý Thực phẩm Bảo vệ Sức khỏe (TPBVSK)',
    basis: 'NĐ 15/2018/NĐ-CP, TT 43/2014/TT-BYT, NĐ 115/2018/NĐ-CP',
    riskLevel: 'high',
    docs: [
      { key: 'product_registration', label: 'Giấy tiếp nhận bản công bố sản phẩm', desc: 'Số tiếp nhận công bố TPBVSK tại Cục An toàn thực phẩm - Bộ Y tế (bắt buộc trước khi lưu hành)', required: true, warning: 'BẮT BUỘC — Không có giấy này không được phép lưu hành (vi phạm NĐ 115/2018)' },
      { key: 'attp_cert', label: 'GCN cơ sở đủ điều kiện ATTP', desc: 'Giấy chứng nhận đủ điều kiện sản xuất/kinh doanh TPBVSK', required: true },
      { key: 'test_result', label: 'Phiếu kiểm nghiệm toàn diện', desc: 'Vi sinh, lý hóa, kim loại nặng, chất cấm — từ lab Bộ Y tế công nhận, không quá 12 tháng', required: true },
      { key: 'product_label', label: 'Nhãn sản phẩm đúng quy định', desc: 'KHÔNG được ghi tác dụng điều trị bệnh. Phải có: thành phần, công dụng, liều dùng, cảnh báo, HSD', required: true, warning: 'Vi phạm quảng cáo TPBVSK bị phạt đến 100 triệu đồng' },
      { key: 'gmp_cert', label: 'Chứng nhận GMP / ISO 22000', desc: 'GMP hoặc ISO 22000 — khuyến nghị mạnh (bắt buộc với SP xuất khẩu)', required: false },
      { key: 'cfs', label: 'Certificate of Free Sale (CFS)', desc: 'Chứng nhận lưu hành tự do tại nước xuất khẩu (bắt buộc nếu nhập khẩu)', required: false, warning: 'Bắt buộc với hàng nhập khẩu' },
    ],
  },
  'Mỹ phẩm & Skincare': {
    title: 'Pháp lý Mỹ phẩm',
    basis: 'TT 06/2011/TT-BYT, TT 34/2022/TT-BYT, Hiệp định ASEAN về Mỹ phẩm',
    riskLevel: 'high',
    docs: [
      { key: 'cosmetic_notification', label: 'Phiếu tiếp nhận công bố mỹ phẩm', desc: 'Số tiếp nhận từ Cục Quản lý Dược - Bộ Y tế. Mỗi sản phẩm một số riêng', required: true, warning: 'BẮT BUỘC — Theo ASEAN Cosmetics Directive & TT 06/2011/TT-BYT. Phạt đến 70 triệu đồng nếu vi phạm' },
      { key: 'coa_test', label: 'Phiếu kiểm nghiệm / CoA', desc: 'Certificate of Analysis: kim loại nặng (Pb, As, Hg, Cd), vi sinh, chất cấm (steroids, hydroquinone...)', required: true },
      { key: 'product_label', label: 'Nhãn phụ tiếng Việt đầy đủ', desc: 'Tên mỹ phẩm, thành phần (INCI list), công dụng, cách dùng, cảnh báo an toàn, NSX/HSD, nhà nhập khẩu', required: true },
      { key: 'cfs', label: 'Certificate of Free Sale (CFS)', desc: 'Chứng nhận lưu hành tự do tại nước xuất xứ — bắt buộc nếu nhập khẩu', required: false, warning: 'Bắt buộc với hàng nhập khẩu' },
      { key: 'import_authorization', label: 'Giấy ủy quyền nhập khẩu / phân phối', desc: 'Giấy ủy quyền chính thức từ nhà sản xuất/chủ nhãn (nếu là nhà phân phối chính thức)', required: false },
      { key: 'derma_test', label: 'Kết quả Dermatologist-tested', desc: 'Kiểm tra trên da — bắt buộc với SP nhạy cảm: dùng cho mặt, trẻ em, da nhạy cảm', required: false },
    ],
  },
  'Thời trang & Phụ kiện': {
    title: 'Pháp lý Thời trang & Phụ kiện',
    basis: 'NĐ 43/2017/NĐ-CP (nhãn hàng hóa), NĐ 69/2018/NĐ-CP',
    riskLevel: 'low',
    docs: [
      { key: 'vat_invoice', label: 'Hóa đơn VAT hợp lệ', desc: 'Hóa đơn GTGT chứng minh nguồn gốc hàng hóa hợp pháp từ nhà cung cấp', required: true },
      { key: 'product_label', label: 'Nhãn hàng hóa đúng quy định', desc: 'Nhãn tiếng Việt: tên SP, chất liệu (% thành phần vải), xuất xứ, nhà SX/nhập khẩu', required: true },
      { key: 'co', label: 'Chứng nhận xuất xứ (CO)', desc: 'Form CO từ cơ quan thẩm quyền nếu hàng nhập khẩu', required: false, warning: 'Bắt buộc với hàng nhập khẩu' },
      { key: 'brand_authorization', label: 'Giấy ủy quyền phân phối thương hiệu', desc: 'Nếu kinh doanh hàng có nhãn hiệu đã đăng ký, cần giấy ủy quyền chính thức từ chủ thương hiệu', required: false },
    ],
  },
  'Công nghệ & Điện tử': {
    title: 'Pháp lý Thiết bị Điện tử & Công nghệ',
    basis: 'Luật CLSPHH 2007, TT 28/2012/TT-BKHCN, QĐ 3810/QĐ-BKHCN',
    riskLevel: 'high',
    docs: [
      { key: 'conformity_cert', label: 'Giấy chứng nhận Hợp quy (Dấu CR)', desc: 'Dấu CR (Conformity Registration) bắt buộc với thiết bị điện tử theo QCVN. Cấp bởi tổ chức chứng nhận được chỉ định', required: true, warning: 'BẮT BUỘC — Không có dấu CR không được phép lưu thông. Phạt hành chính đến 30 triệu đồng' },
      { key: 'safety_cert', label: 'Chứng nhận an toàn điện / EMC', desc: 'Kiểm tra IEC 60950 / IEC 62368 (an toàn điện) và EMC (tương thích điện từ)', required: true },
      { key: 'vat_invoice', label: 'Hóa đơn VAT hợp lệ', desc: 'Chứng minh nguồn gốc thiết bị hợp pháp', required: true },
      { key: 'warranty_policy', label: 'Chính sách bảo hành chính hãng', desc: 'Tài liệu bảo hành từ nhà sản xuất (tối thiểu 12 tháng theo quy định pháp luật)', required: true },
      { key: 'co_cq', label: 'C/O và C/Q (xuất xứ + chất lượng)', desc: 'Certificate of Origin và Certificate of Quality từ nhà sản xuất (bắt buộc nếu nhập khẩu)', required: false, warning: 'Bắt buộc với hàng nhập khẩu' },
      { key: 'import_permit', label: 'Giấy phép nhập khẩu thiết bị đặc biệt', desc: 'Thiết bị viễn thông, tần số vô tuyến, camera giám sát: cần giấy phép Bộ TT&TT', required: false },
    ],
  },
  'Nhà cửa & Đời sống': {
    title: 'Pháp lý Đồ gia dụng, Nội thất & Vật phẩm Trang trí',
    basis: 'NĐ 43/2017/NĐ-CP, TT 28/2012/TT-BKHCN, Công ước CITES',
    riskLevel: 'medium',
    docs: [
      { key: 'vat_invoice', label: 'Hóa đơn VAT hợp lệ', desc: 'Hóa đơn GTGT chứng minh nguồn gốc hàng hóa', required: true },
      { key: 'product_label', label: 'Nhãn hàng hóa đúng quy định', desc: 'Nhãn tiếng Việt: tên SP, chất liệu, xuất xứ, nhà SX/nhập khẩu — NĐ 43/2017/NĐ-CP', required: true },
      { key: 'conformity_cert', label: 'Chứng nhận Hợp quy / Hợp chuẩn', desc: 'Đồ điện gia dụng (ấm đun, nồi cơm, quạt...): bắt buộc dấu CR. Vật dụng thông thường: công bố hợp chuẩn nếu có QCVN', required: false, warning: 'BẮT BUỘC với đồ điện gia dụng có nguồn điện' },
      { key: 'co', label: 'Chứng nhận xuất xứ (CO)', desc: 'CO từ cơ quan thẩm quyền nếu hàng nhập khẩu', required: false },
      { key: 'material_cert', label: 'Chứng nhận nguyên liệu đặc biệt (CITES)', desc: 'SP làm từ đá quý, ngà voi, san hô, gỗ quý, xương sừng động vật: BẮT BUỘC giấy chứng nhận nguồn gốc CITES hoặc giấy phép khai thác', required: false, warning: 'Vi phạm CITES = hình sự. Kiểm tra kỹ nếu SP có nguồn gốc động/thực vật quý hiếm' },
      { key: 'feng_shui_origin', label: 'Chứng nhận xuất xứ vật phẩm phong thủy', desc: 'Vật phẩm phong thủy (đá phong thủy, tượng, vòng tay): CO + hóa đơn nhập khẩu + chứng nhận chất liệu không vi phạm CITES', required: false },
    ],
  },
  'Thú cưng': {
    title: 'Pháp lý Sản phẩm Thú cưng',
    basis: 'Luật Thú y 2015, NĐ 35/2016/NĐ-CP, Luật ATTP 2010',
    riskLevel: 'medium',
    docs: [
      { key: 'vat_invoice', label: 'Hóa đơn VAT hợp lệ', desc: 'Hóa đơn hợp lệ chứng minh nguồn gốc hàng hóa', required: true },
      { key: 'product_label', label: 'Nhãn hàng hóa đúng quy định', desc: 'Nhãn tiếng Việt đầy đủ: tên, thành phần, hướng dẫn, HSD', required: true },
      { key: 'vet_hygiene_cert', label: 'Giấy kiểm tra vệ sinh thú y', desc: 'Với thức ăn thú cưng: GCN kiểm tra vệ sinh thú y từ Cục Thú y - Bộ NN&PTNT', required: false, warning: 'BẮT BUỘC với thức ăn/thực phẩm dành cho thú cưng' },
      { key: 'import_permit', label: 'Giấy phép nhập khẩu thú y', desc: 'Giấy phép nhập khẩu từ Cục Thú y (nếu nhập khẩu)', required: false },
    ],
  },
  'Khác': {
    title: 'Hồ sơ pháp lý cơ bản',
    basis: 'Luật Thương mại 2005, NĐ 43/2017/NĐ-CP',
    riskLevel: 'low',
    docs: [
      { key: 'vat_invoice', label: 'Hóa đơn VAT hợp lệ', desc: 'Hóa đơn GTGT chứng minh nguồn gốc hàng hóa hợp pháp', required: true },
      { key: 'product_label', label: 'Nhãn hàng hóa đúng quy định', desc: 'Nhãn tiếng Việt theo NĐ 43/2017/NĐ-CP', required: true },
    ],
  },
};

const RISK_COLORS = { high: '#ef4444', medium: '#f59e0b', low: '#22c55e' };
const RISK_LABELS = { high: 'Kiểm soát chặt', medium: 'Trung bình', low: 'Cơ bản' };

function getLegalStatus(category: string, docs: Record<string, boolean>): { ok: boolean; missing: number } {
  const reqs = LEGAL_REQUIREMENTS[category];
  if (!reqs) return { ok: true, missing: 0 };
  const missing = reqs.docs.filter(d => d.required && !docs[d.key]).length;
  return { ok: missing === 0, missing };
}

/* ── Sidebar (accordion groups like Admin) ────────── */
interface VendorSidebarGroup {
  key: string; labelKey: string; color: string; icon: string;
  items: { key: string; icon: string; labelKey: string }[];
}
const vendorSidebarGroups: VendorSidebarGroup[] = [
  {
    key: 'shop', labelKey: 'vendor.sidebar.shop', color: 'var(--c4-500)', icon: '🏪',
    items: [
      { key: 'overview', icon: '📊', labelKey: 'vendor.sidebar.overview' },
      { key: 'products', icon: '📦', labelKey: 'vendor.sidebar.products' },
      { key: 'orders', icon: '🛒', labelKey: 'vendor.sidebar.orders' },
      { key: 'analytics', icon: '📈', labelKey: 'vendor.analytics.title' },
    ],
  },
  {
    key: 'network', labelKey: 'vendor.sidebar.network', color: 'var(--c6-500)', icon: '🌐',
    items: [
      { key: 'koc', icon: '🌟', labelKey: 'vendor.koc.title' },
      { key: 'commission', icon: '💰', labelKey: 'vendor.commissionRules.title' },
    ],
  },
  {
    key: 'web3', labelKey: 'vendor.sidebar.web3', color: '#f59e0b', icon: '🔗',
    items: [
      { key: 'dpp', icon: '🔐', labelKey: 'vendor.sidebar.dppMgmt' },
      { key: 'wallet', icon: '💎', labelKey: 'vendor.sidebar.walletBlockchain' },
    ],
  },
  {
    key: 'account', labelKey: 'vendor.sidebar.account', color: 'var(--c5-500)', icon: '👤',
    items: [
      { key: 'vendor_kyc', icon: '🛡️', labelKey: 'vendor.sidebar.verifyBusiness' },
      { key: 'settings', icon: '⚙️', labelKey: 'vendor.sidebar.settings' },
    ],
  },
];
/* Backward compat flat list */
const sidebarItems = vendorSidebarGroups.flatMap(g => g.items);

/* ── Initial Products ────────────────────────────── */
const initialProducts = [
  { id: 1, name: 'Trà Ô Long Đài Loan Premium', price: '389.000₫', stock: 234, sold: 1247, status: 'active', dppStatus: 'minted', commission: '18%', emoji: '🍵', dppTokenId: '#1247', hidden: false },
  { id: 2, name: 'Serum Vitamin C 20%', price: '459.000₫', stock: 156, sold: 892, status: 'active', dppStatus: 'minted', commission: '22%', emoji: '✨', dppTokenId: '#1248', hidden: false },
  { id: 3, name: 'Mật Ong Rừng Tây Nguyên', price: '285.000₫', stock: 89, sold: 2103, status: 'active', dppStatus: 'minted', commission: '15%', emoji: '🍯', dppTokenId: '#1249', hidden: false },
  { id: 4, name: 'Cà Phê Arabica Đà Lạt', price: '245.000₫', stock: 312, sold: 1580, status: 'active', dppStatus: 'pending', commission: '20%', emoji: '☕', dppTokenId: '—', hidden: false },
  { id: 5, name: 'Bột Collagen Cá Biển', price: '890.000₫', stock: 45, sold: 634, status: 'low_stock', dppStatus: 'minted', commission: '25%', emoji: '🐟', dppTokenId: '#1251', hidden: false },
  { id: 6, name: 'Nước Hoa Hồng Organic', price: '320.000₫', stock: 0, sold: 1890, status: 'out_of_stock', dppStatus: 'pending', commission: '19%', emoji: '🌹', dppTokenId: '—', hidden: false },
];

const productStatusConfig: Record<string, { labelKey: string; badge: string }> = {
  active: { labelKey: 'vendor.status.active', badge: 'badge-c4' },
  low_stock: { labelKey: 'vendor.status.lowStock', badge: 'badge-gold' },
  out_of_stock: { labelKey: 'vendor.status.outOfStock', badge: 'badge-c5' },
  hidden: { labelKey: 'vendor.status.hidden', badge: 'badge-c6' },
  dpp_pending: { labelKey: 'vendor.status.dppPending', badge: 'badge-c7' },
};

const dppStatusConfig: Record<string, { label: string; badge: string }> = {
  minted: { label: 'Minted', badge: 'badge-c4' },
  pending: { label: 'Pending', badge: 'badge-gold' },
};

/* ── Initial Orders ──────────────────────────────── */
const initialOrders = [
  { id: 'ORD-2026-001', customer: 'Nguyễn Văn A', product: 'Trà Ô Long Premium', amount: '389.000₫', koc: 'Minh Hương', commission: '70.020₫', status: 'delivered', date: '2026-03-25', txHash: '0x1a2b...9f3c' },
  { id: 'ORD-2026-002', customer: 'Trần Thị B', product: 'Serum Vitamin C', amount: '459.000₫', koc: 'Thảo Linh', commission: '100.980₫', status: 'shipping', date: '2026-03-24', txHash: '' },
  { id: 'ORD-2026-003', customer: 'Lê Văn C', product: 'Mật Ong Rừng', amount: '285.000₫', koc: 'Ngọc Anh', commission: '42.750₫', status: 'processing', date: '2026-03-24', txHash: '' },
  { id: 'ORD-2026-004', customer: 'Phạm Thị D', product: 'Cà Phê Arabica', amount: '245.000₫', koc: 'Văn Hoàng', commission: '49.000₫', status: 'delivered', date: '2026-03-23', txHash: '0x4d5e...8a2b' },
  { id: 'ORD-2026-005', customer: 'Hoàng Văn E', product: 'Bột Collagen', amount: '890.000₫', koc: 'Phương Thảo', commission: '222.500₫', status: 'pending', date: '2026-03-23', txHash: '' },
];

const orderStatusConfig: Record<string, { labelKey: string; badge: string }> = {
  delivered: { labelKey: 'vendor.order.delivered', badge: 'badge-c4' },
  shipping: { labelKey: 'vendor.order.shipping', badge: 'badge-c5' },
  processing: { labelKey: 'vendor.order.processing', badge: 'badge-c6' },
  pending: { labelKey: 'vendor.order.pending', badge: 'badge-gold' },
};

const orderStatusFlow: Record<string, { next: string; actionKey: string }> = {
  pending: { next: 'processing', actionKey: 'vendor.order.confirm' },
  processing: { next: 'shipping', actionKey: 'vendor.order.ship' },
  shipping: { next: 'delivered', actionKey: 'vendor.order.markDelivered' },
};

/* ── KOC Network ─────────────────────────────────── */
const kocNetwork = [
  { id: 'KOC-001', name: 'Minh Hương', level: 12, tier: 'T1', sales: '12.8M₫', commission: '2.3M₫', orders: 142, conversion: '12.3%', status: 'active', trustScore: 92 },
  { id: 'KOC-002', name: 'Thảo Linh', level: 10, tier: 'T1', sales: '10.2M₫', commission: '1.8M₫', orders: 98, conversion: '10.8%', status: 'active', trustScore: 88 },
  { id: 'KOC-003', name: 'Ngọc Anh', level: 9, tier: 'T2', sales: '7.5M₫', commission: '975K₫', orders: 67, conversion: '9.2%', status: 'active', trustScore: 85 },
  { id: 'KOC-004', name: 'Văn Hoàng', level: 8, tier: 'T2', sales: '5.1M₫', commission: '663K₫', orders: 45, conversion: '8.1%', status: 'active', trustScore: 78 },
  { id: 'KOC-005', name: 'Phương Thảo', level: 6, tier: 'T3', sales: '2.4M₫', commission: '120K₫', orders: 18, conversion: '6.5%', status: 'review', trustScore: 72 },
];

const tierConfig: Record<string, { label: string; badge: string; rate: string }> = {
  T1: { label: 'Tier 1', badge: 'badge-c4', rate: '40%' },
  T2: { label: 'Tier 2', badge: 'badge-c5', rate: '13%' },
  T3: { label: 'Tier 3', badge: 'badge-c6', rate: '5%' },
};

/* ── Initial DPP Mints ───────────────────────────── */
const initialDppMints = [
  { tokenId: '#1247', product: 'Trà Ô Long Đài Loan Premium', mintDate: '2026-02-15', chain: 'Polygon', txHash: '0xdpp1...aaaa', status: 'verified', ipfsHash: 'Qm...abc1' },
  { tokenId: '#1248', product: 'Serum Vitamin C 20%', mintDate: '2026-02-18', chain: 'Polygon', txHash: '0xdpp2...bbbb', status: 'verified', ipfsHash: 'Qm...abc2' },
  { tokenId: '#1249', product: 'Mật Ong Rừng Tây Nguyên', mintDate: '2026-02-20', chain: 'Polygon', txHash: '0xdpp3...cccc', status: 'verified', ipfsHash: 'Qm...abc3' },
  { tokenId: '#1251', product: 'Bột Collagen Cá Biển', mintDate: '2026-03-01', chain: 'Polygon', txHash: '0xdpp5...eeee', status: 'verified', ipfsHash: 'Qm...abc5' },
];

/* ── Commission Rules ────────────────────────────── */
const commissionTiers = [
  { tier: 'Tier 1 (T1)', descKey: 'vendor.commission.t1Desc', rate: '40%', minSales: '10M₫+', color: 'var(--c4-500)', smartContract: true },
  { tier: 'Tier 2 (T2)', descKey: 'vendor.commission.t2Desc', rate: '13%', minSales: '5M₫+', color: 'var(--c5-500)', smartContract: true },
  { tier: 'Tier 3 (T3)', descKey: 'vendor.commission.t3Desc', rate: '5%', minSalesKey: 'vendor.commission.noMinSales', color: 'var(--c6-500)', smartContract: true },
];

/* ── Wallet data ─────────────────────────────────── */
const initialWalletData = {
  address: '0xVendor1234567890ABCDEF1234567890ABCDEF12',
  shortAddress: '0xVend...EF12',
  balances: [
    { token: 'USDT', amount: '45,230.00', usd: '$45,230.00', icon: 'U', color: 'var(--c4-500)' },
    { token: 'MATIC', amount: '8,500.00', usd: '$6,800.00', icon: 'M', color: 'var(--c7-500)' },
    { token: 'ETH', amount: '1.85', usd: '$4,810.00', icon: 'E', color: 'var(--c5-500)' },
  ],
  totalUsd: '$56,840.00',
  pendingRevenue: 12450000,
};

const initialWalletTxHistory = [
  { hash: '0xrev1...1111', typeKey: 'vendor.wallet.txOrderRevenue', amount: '+389.000₫', token: 'USDT', date: '2026-03-25', status: 'confirmed' },
  { hash: '0xrev2...2222', typeKey: 'vendor.wallet.txOrderRevenue', amount: '+459.000₫', token: 'USDT', date: '2026-03-24', status: 'confirmed' },
  { hash: '0xcom1...3333', typeKey: 'vendor.wallet.txCommissionPayout', amount: '-70.020₫', token: 'USDT', date: '2026-03-25', status: 'confirmed' },
  { hash: '0xwd01...4444', typeKey: 'vendor.wallet.txBankWithdraw', amount: '-20.000.000₫', token: 'USDT', date: '2026-03-20', status: 'confirmed' },
  { hash: '0xdpp1...5555', typeKey: 'DPP Mint Fee', amount: '-0.5 MATIC', token: 'MATIC', date: '2026-03-15', status: 'confirmed' },
];

/* ── Settings ────────────────────────────────────── */
const getInitialSettings = (t: (k: string) => string) => [
  { title: t('vendor.settings.shopInfo'), fields: [{ label: t('vendor.settings.name'), value: 'WellKOC Origin' }, { label: t('vendor.settings.type'), value: 'Official Brand' }, { label: t('vendor.settings.rating'), value: '4.8 / 5.0' }] },
  { title: t('vendor.settings.blockchain'), fields: [{ label: 'Chain', value: 'Polygon' }, { label: t('vendor.settings.wallet'), value: '0xVend...EF12' }, { label: 'DPP Contract', value: '0xDPP...7890' }] },
  { title: t('vendor.settings.payment'), fields: [{ label: t('vendor.settings.withdrawTo'), value: 'Vietcombank **** 5678' }, { label: t('vendor.settings.autoPayoutKOC'), value: t('vendor.settings.enabled') }, { label: 'Min withdraw', value: '1.000.000₫' }] },
  { title: t('vendor.settings.commission'), fields: [{ label: 'Smart contract', value: 'Active' }, { label: 'Tiers', value: 'T1: 40% / T2: 13% / T3: 5%' }, { label: t('vendor.settings.autoDistribute'), value: t('vendor.settings.enabled') }] },
];

/* ── Helpers ──────────────────────────────────────── */
function formatVND(n: number) {
  return n.toLocaleString('vi-VN') + '₫';
}

let nextProductId = 7;
let nextDppTokenId = 1252;

/* ── Component ───────────────────────────────────── */
function mapApiProductToLocal(p: ApiProduct, idx: number) {
  const EMOJIS = ['📦','✨','🍵','🍯','☕','🌹','🐟','💎'];
  const status = p.stock === 0 ? 'out_of_stock' : p.stock <= 10 ? 'low_stock' : p.status === 'active' ? 'active' : 'hidden';
  return {
    id: p.id as unknown as number ?? idx,
    name: p.name,
    price: new Intl.NumberFormat('vi-VN').format(p.price) + '₫',
    stock: p.stock,
    sold: p.sold_count || 0,
    status,
    dppStatus: p.dpp_token_id ? 'minted' : 'pending',
    commission: '20%',
    emoji: EMOJIS[idx % EMOJIS.length],
    dppTokenId: p.dpp_token_id ? `#${p.dpp_token_id.slice(-4)}` : '—',
    hidden: p.status !== 'active',
  };
}

function mapApiOrderToLocal(o: ApiOrder, idx: number) {
  return {
    id: o.order_number || o.id,
    customer: o.shipping_address?.full_name || 'Khách hàng',
    product: o.items?.[0]?.product_name || '—',
    amount: new Intl.NumberFormat('vi-VN').format(o.total) + '₫',
    koc: '—',
    commission: '—',
    status: o.status === 'shipped' ? 'shipping' : o.status === 'processing' ? 'processing' : o.status,
    date: o.created_at?.slice(0, 10) || '',
    txHash: '',
  };
}

export default function Vendor() {
  const { t } = useI18n();
  const [activeNav, setActiveNav] = useState('overview');
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({ shop: true, network: false, web3: false, account: false });
  const toggleGroup = (key: string) => setOpenGroups(prev => ({ ...prev, [key]: !prev[key] }));
  const handleNavClick = (groupKey: string, itemKey: string) => {
    setActiveNav(itemKey);
    if (!openGroups[groupKey]) setOpenGroups(prev => ({ ...prev, [groupKey]: true }));
  };
  const navigate = useNavigate();
  const { user, logout, token } = useAuth();
  const userName = user?.name || 'Vendor';
  const userEmail = user?.email || '';

  // Toast
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'info' | 'error' } | null>(null);
  const showToast = useCallback((msg: string, type: 'success' | 'info' | 'error' = 'success') => {
    setToast({ msg, type });
  }, []);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2500);
    return () => clearTimeout(t);
  }, [toast]);

  // Products — loaded from API, fallback to demo data
  const [productList, setProductList] = useState(initialProducts);
  const [productSearch, setProductSearch] = useState('');
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [editingProduct, setEditingProduct] = useState<number | null>(null);
  const [newProduct, setNewProduct] = useState({ name: '', price: '', stock: '', commission: '', description: '', category: '', origin: '', weight: '', sku: '', imageUrl: '' });
  const [legalDocs, setLegalDocs] = useState<Record<string, boolean>>({});
  const [legalError, setLegalError] = useState('');
  const toggleLegalDoc = (key: string) => setLegalDocs(prev => ({ ...prev, [key]: !prev[key] }));
  const [mintingIds, setMintingIds] = useState<Set<number>>(new Set());

  // Orders — loaded from API, fallback to demo data
  const [orderList, setOrderList] = useState(initialOrders);
  const [orderFilter, setOrderFilter] = useState('all');
  const [orderSearch, setOrderSearch] = useState('');

  useEffect(() => {
    if (!token) return;
    vendorApi.getProducts({ per_page: 50 }, token)
      .then(res => { if (res.items?.length) setProductList(res.items.map((p, i) => mapApiProductToLocal(p, i)) as typeof initialProducts); })
      .catch(() => {});
    vendorApi.getOrders({ per_page: 50 }, token)
      .then(res => { if (res.items?.length) setOrderList(res.items.map((o, i) => mapApiOrderToLocal(o, i)) as typeof initialOrders); })
      .catch(() => {});
  }, [token]);

  // DPP
  const [dppMintList, setDppMintList] = useState(initialDppMints);

  // Wallet
  const [pendingRevenue, setPendingRevenue] = useState(initialWalletData.pendingRevenue);
  const [walletTxHistory, setWalletTxHistory] = useState(initialWalletTxHistory);
  const [showWithdrawForm, setShowWithdrawForm] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');

  // Settings
  const [settingsData, setSettingsData] = useState(() => getInitialSettings(t));
  const [editingSettings, setEditingSettings] = useState<{ si: number; fi: number } | null>(null);
  const [editSettingsValue, setEditSettingsValue] = useState('');

  // KOC search
  const [kocSearch, setKocSearch] = useState('');

  // Vendor onboarding / KYC form state
  const [onboardData, setOnboardData] = useState({
    idNumber: '', fullName: '', frontUrl: '', backUrl: '',
    businessName: '', licenseNo: '', licenseUrl: '',
    taxCode: '', address: '',
    bankName: '', bankAccount: '', bankHolder: '',
    phone: '',
  });
  const setOD = (k: keyof typeof onboardData, v: string) =>
    setOnboardData(prev => ({ ...prev, [k]: v }));
  const [onboardStepDone, setOnboardStepDone] = useState({
    identity: false, business: false, tax: false, bank: false, verified: false,
  });
  const [onboardLoading, setOnboardLoading] = useState(false);

  const handleOnboardSubmit = async () => {
    if (onboardLoading || !token) return;
    setOnboardLoading(true);
    try {
      await vendorApi.onboard({
        business_name: onboardData.businessName,
        tax_code: onboardData.taxCode,
        business_license_url: onboardData.licenseUrl,
        bank_account: onboardData.bankAccount,
        bank_name: onboardData.bankName,
        address: onboardData.address,
        phone: onboardData.phone || user?.phone || '',
        product_categories: [],
        dpp_certifications: [],
      }, token);
      setOnboardStepDone(prev => ({ ...prev, bank: true, verified: true }));
      showToast('🎉 Đăng ký vendor thành công! Hồ sơ đang được xét duyệt.', 'success');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Đăng ký thất bại';
      showToast(msg, 'error');
    } finally {
      setOnboardLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  /* ── Product CRUD ──────────────────────────────── */
  const handleAddProduct = async () => {
    if (!newProduct.name.trim()) { showToast(t('vendor.toast.enterProductName'), 'error'); return; }
    if (!newProduct.category) { showToast('Vui lòng chọn danh mục sản phẩm', 'error'); return; }
    const legalStatus = getLegalStatus(newProduct.category, legalDocs);
    if (!legalStatus.ok) {
      setLegalError(`Còn ${legalStatus.missing} giấy tờ pháp lý bắt buộc chưa được xác nhận. Vui lòng kiểm tra và đánh dấu xác nhận đã có đầy đủ hồ sơ.`);
      showToast(`Thiếu ${legalStatus.missing} giấy tờ pháp lý bắt buộc`, 'error');
      return;
    }
    setLegalError('');
    const payload = {
      name: newProduct.name,
      price: parsePrice(newProduct.price),
      stock: parseInt(newProduct.stock) || 0,
      description: newProduct.description,
      category: newProduct.category,
      origin: newProduct.origin,
      sku: newProduct.sku,
      status: 'active',
    };
    const requiredCount = (LEGAL_REQUIREMENTS[newProduct.category]?.docs.filter(d => d.required).length) || 0;
    const approvedCount = Object.values(legalDocs).filter(Boolean).length;
    const newId = nextProductId++;
    const p = {
      id: newId,
      name: newProduct.name,
      price: newProduct.price || '0₫',
      stock: payload.stock,
      sold: 0,
      status: 'dpp_pending' as string,  // blocked until DPP minted
      dppStatus: 'pending' as string,
      commission: newProduct.commission || '15%',
      emoji: '📦',
      dppTokenId: '—',
      hidden: true,   // not visible to buyers until on-chain
      legalOk: approvedCount >= requiredCount && requiredCount > 0,
      legalDocs: { ...legalDocs },
      category: newProduct.category,
    };
    setProductList(prev => [...prev, p]);
    setNewProduct({ name: '', price: '', stock: '', commission: '', description: '', category: '', origin: '', weight: '', sku: '', imageUrl: '' });
    setLegalDocs({});
    setLegalError('');
    setShowAddProduct(false);
    showToast(`📦 Sản phẩm đã lưu — đang mint DPP lên blockchain...`, 'info');
    if (token) {
      vendorApi.createProduct(payload as unknown as ApiProduct, token)
        .then(created => setProductList(prev => prev.map(x => x.id === newId ? mapApiProductToLocal(created, prev.indexOf(x)) : x)))
        .catch(() => {});
    }
    // Auto-mint DPP immediately after product creation (blockchain compliance)
    setTimeout(() => handleMintDpp(newId), 300);
  };

  const handleDeleteProduct = (id: number) => {
    const p = productList.find(x => x.id === id);
    setProductList(prev => prev.filter(x => x.id !== id));
    showToast(`${t('vendor.toast.productDeleted')} "${p?.name}"`);
    if (token) vendorApi.deleteProduct(String(id), token).catch(() => {});
  };

  const handleToggleProduct = (id: number) => {
    const p = productList.find(x => x.id === id);
    if (!p) return;
    // Block: cannot activate if DPP not minted (blockchain compliance)
    if (p.hidden && p.dppStatus !== 'minted') {
      showToast('⛓️ Sản phẩm chưa được xác thực trên blockchain. Vui lòng mint DPP trước khi kích hoạt.', 'error');
      return;
    }
    const nowHidden = !p.hidden;
    setProductList(prev => prev.map(x => {
      if (x.id !== id) return x;
      return { ...x, hidden: nowHidden, status: nowHidden ? 'hidden' : (x.stock === 0 ? 'out_of_stock' : x.stock <= 50 ? 'low_stock' : 'active') };
    }));
    showToast(nowHidden ? `${t('vendor.toast.productHidden')} "${p.name}"` : `${t('vendor.toast.productShown')} "${p.name}"`);
    if (token) vendorApi.updateProduct(String(id), { status: nowHidden ? 'hidden' : 'active' } as Partial<ApiProduct>, token).catch(() => {});
  };

  const handleSaveEditProduct = (id: number) => {
    const updated = { name: newProduct.name, price: parsePrice(newProduct.price), commission: newProduct.commission };
    setProductList(prev => prev.map(p => {
      if (p.id !== id) return p;
      return { ...p, name: newProduct.name || p.name, price: newProduct.price || p.price, commission: newProduct.commission || p.commission };
    }));
    setEditingProduct(null);
    setNewProduct({ name: '', price: '', stock: '', commission: '', description: '', category: '', origin: '', weight: '', sku: '', imageUrl: '' });
    showToast(t('vendor.toast.productUpdated'));
    if (token) vendorApi.updateProduct(String(id), updated as Partial<ApiProduct>, token).catch(() => {});
  };

  /* ── Order status flow ─────────────────────────── */
  const handleAdvanceOrder = (orderId: string) => {
    const o = orderList.find(x => x.id === orderId);
    const flow = orderStatusFlow[o?.status ?? ''];
    if (!flow) return;
    setOrderList(prev => prev.map(ord => {
      if (ord.id !== orderId) return ord;
      const newTxHash = flow.next === 'delivered' ? `0x${Math.random().toString(16).slice(2, 6)}...${Math.random().toString(16).slice(2, 6)}` : ord.txHash;
      return { ...ord, status: flow.next, txHash: newTxHash };
    }));
    showToast(`${t('vendor.kpi.orders')} ${orderId}: ${t(flow.actionKey)}`);
    if (token) vendorApi.updateOrderStatus(orderId, flow.next, token).catch(() => {});
  };

  /* ── DPP Mint (blockchain) ─────────────────────── */
  const handleMintDpp = async (productId: number) => {
    const product = productList.find(p => p.id === productId);
    if (!product || mintingIds.has(productId)) return;
    setMintingIds(prev => new Set(prev).add(productId));
    showToast(`⛓️ Đang ghi lên blockchain Polygon...`, 'info');
    // Simulate on-chain transaction (2s)
    await new Promise(r => setTimeout(r, 2000));
    const tokenId = `#${nextDppTokenId++}`;
    const txHash = `0x${Math.random().toString(16).slice(2, 10)}${Math.random().toString(16).slice(2, 10)}`;
    const ipfsHash = `QmW${Math.random().toString(36).slice(2, 10)}`;
    setProductList(prev => prev.map(p =>
      p.id === productId ? { ...p, dppStatus: 'minted', dppTokenId: tokenId, status: p.status === 'dpp_pending' ? 'active' : p.status, hidden: false } : p
    ));
    setDppMintList(prev => [...prev, {
      tokenId,
      product: product.name,
      mintDate: new Date().toISOString().slice(0, 10),
      chain: 'Polygon',
      txHash,
      status: 'verified',
      ipfsHash,
    }]);
    setMintingIds(prev => { const s = new Set(prev); s.delete(productId); return s; });
    showToast(`✅ DPP minted on-chain! "${product.name}" (${tokenId}) — TX: ${txHash.slice(0, 14)}...`);
  };

  /* ── Withdraw ──────────────────────────────────── */
  const handleWithdraw = () => {
    const amt = parseInt(withdrawAmount.replace(/\D/g, '')) || 0;
    if (amt <= 0 || amt > pendingRevenue) {
      showToast(t('vendor.toast.invalidAmount'), 'error');
      return;
    }
    setPendingRevenue(prev => prev - amt);
    setWalletTxHistory(prev => [{
      hash: `0xwd${Math.random().toString(16).slice(2, 6)}...${Math.random().toString(16).slice(2, 6)}`,
      typeKey: 'vendor.wallet.txBankWithdraw',
      amount: `-${formatVND(amt)}`,
      token: 'USDT',
      date: new Date().toISOString().slice(0, 10),
      status: 'confirmed',
    }, ...prev]);
    setWithdrawAmount('');
    setShowWithdrawForm(false);
    showToast(`${t('vendor.toast.withdrawn')} ${formatVND(amt)} ${t('vendor.toast.toBank')}`);
  };

  /* ── Copy to clipboard ─────────────────────────── */
  const handleCopy = (text: string, label: string = '') => {
    navigator.clipboard.writeText(text).then(() => {
      showToast(`${t('vendor.toast.copied')} ${label || text}`, 'info');
    }).catch(() => {
      showToast(`${t('vendor.toast.copied')} ${label || text}`, 'info');
    });
  };

  /* ── Settings save ─────────────────────────────── */
  const handleSaveSettings = (si: number, fi: number) => {
    setSettingsData(prev => prev.map((s, i) => {
      if (i !== si) return s;
      return { ...s, fields: s.fields.map((f, j) => j === fi ? { ...f, value: editSettingsValue } : f) };
    }));
    setEditingSettings(null);
    setEditSettingsValue('');
    showToast(t('vendor.toast.settingsSaved'));
  };

  /* ── Filtered data ─────────────────────────────── */
  const filteredProducts = productList.filter(p =>
    p.name.toLowerCase().includes(productSearch.toLowerCase())
  );

  const filteredOrders = orderList.filter(o => {
    const matchFilter = orderFilter === 'all' || o.status === orderFilter;
    const matchSearch = o.id.toLowerCase().includes(orderSearch.toLowerCase()) ||
      o.customer.toLowerCase().includes(orderSearch.toLowerCase()) ||
      o.product.toLowerCase().includes(orderSearch.toLowerCase());
    return matchFilter && matchSearch;
  });

  const filteredKOC = kocNetwork.filter(k =>
    k.name.toLowerCase().includes(kocSearch.toLowerCase()) ||
    k.id.toLowerCase().includes(kocSearch.toLowerCase())
  );

  /* ── KPI data (derived) ────────────────────────── */
  const visibleProducts = productList.filter(p => !p.hidden);
  const kpiData = [
    { label: t('vendor.kpi.monthlyRevenue'), value: '89.5M₫', delta: '+28% MoM', up: true, color: 'var(--c4-500)' },
    { label: t('vendor.kpi.orders'), value: String(orderList.length), delta: `${orderList.filter(o => o.status === 'pending').length} ${t('vendor.kpi.pendingProcess')}`, up: true, color: 'var(--c5-500)' },
    { label: t('vendor.kpi.products'), value: String(visibleProducts.length), delta: `${productList.filter(p => p.dppStatus === 'minted').length} ${t('vendor.kpi.dppDone')}`, up: true, color: 'var(--c6-500)' },
    { label: 'KOC Partners', value: '156', delta: `+23 ${t('vendor.kpi.newKoc')}`, up: true, color: 'var(--c7-500)' },
  ];

  const renderContent = () => {
    switch (activeNav) {
      /* ────── TỔNG QUAN ────── */
      case 'overview':
        return (
          <>
            <h2 style={{ fontWeight: 700, fontSize: '1.1rem', marginBottom: 20 }}>{t('vendor.overview.title')}</h2>

            <div className="chart-bar-wrap" style={{ marginBottom: 24 }}>
              <div className="flex" style={{ justifyContent: 'space-between', marginBottom: 8 }}>
                <span className="label">{t('vendor.overview.revenue12m')}</span>
                <span className="badge badge-c4">+28% YoY</span>
              </div>
              <div className="chart-bars">
                {[55, 68, 48, 82, 95, 72, 88, 105, 78, 112, 98, 120].map((v, i) => (
                  <div key={i} className="chart-bar" style={{ height: `${Math.min(v, 100)}%` }} />
                ))}
              </div>
              <div className="flex" style={{ justifyContent: 'space-between', marginTop: 8 }}>
                {['T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8', 'T9', 'T10', 'T11', 'T12'].map(m => (
                  <span key={m} style={{ flex: 1, textAlign: 'center', fontSize: '.58rem', color: 'var(--text-4)' }}>{m}</span>
                ))}
              </div>
            </div>

            <div className="grid-2" style={{ gap: 20 }}>
              <div className="card" style={{ padding: 20 }}>
                <div className="label" style={{ marginBottom: 12 }}>{t('vendor.overview.topProducts')}</div>
                <div className="flex-col gap-10">
                  {visibleProducts.slice(0, 4).map((p, i) => (
                    <div key={i} className="flex" style={{ justifyContent: 'space-between', padding: '8px 0', borderBottom: i < 3 ? '1px solid var(--border)' : 'none' }}>
                      <div className="flex gap-8">
                        <span>{p.emoji}</span>
                        <span style={{ fontSize: '.82rem', fontWeight: 600 }}>{p.name}</span>
                      </div>
                      <span style={{ fontFamily: 'var(--ff-display)', fontWeight: 700, color: 'var(--c4-500)' }}>{p.sold.toLocaleString()} sold</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="card" style={{ padding: 20 }}>
                <div className="label" style={{ marginBottom: 12 }}>{t('vendor.overview.topKoc')}</div>
                <div className="flex-col gap-10">
                  {kocNetwork.slice(0, 4).map((k, i) => (
                    <div key={i} className="flex" style={{ justifyContent: 'space-between', padding: '8px 0', borderBottom: i < 3 ? '1px solid var(--border)' : 'none' }}>
                      <div>
                        <span style={{ fontSize: '.82rem', fontWeight: 600 }}>{k.name}</span>
                        <span className={`badge ${tierConfig[k.tier].badge}`} style={{ marginLeft: 8 }}>{k.tier}</span>
                      </div>
                      <span style={{ fontFamily: 'var(--ff-display)', fontWeight: 700, color: 'var(--c4-500)' }}>{k.sales}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        );

      /* ────── SẢN PHẨM ────── */
      case 'products':
        return (
          <>
            <div className="flex" style={{ justifyContent: 'space-between', marginBottom: 12 }}>
              <h2 style={{ fontWeight: 700, fontSize: '1.1rem' }}>{t('vendor.products.title')} ({visibleProducts.length})</h2>
              <button className="btn btn-primary btn-sm" onClick={() => { setShowAddProduct(!showAddProduct); setEditingProduct(null); }}>{t('vendor.products.addBtn')}</button>
            </div>

            {/* ⛓️ Blockchain compliance notice */}
            <div style={{ padding: '10px 16px', marginBottom: 16, borderRadius: 10, background: 'rgba(99,102,241,.07)', border: '1px solid rgba(99,102,241,.2)', display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontSize: '1.3rem' }}>⛓️</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: '.78rem', color: 'var(--c6-500)' }}>Quy định Blockchain — Bắt buộc với mọi sản phẩm</div>
                <div style={{ fontSize: '.68rem', color: 'var(--text-3)', marginTop: 2 }}>
                  Mỗi sản phẩm phải được cấp <strong>Digital Product Passport (DPP)</strong> trên chuỗi Polygon trước khi hiển thị với người mua. Hệ thống tự động mint sau khi pháp lý đầy đủ.
                </div>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{ fontSize: '.65rem', color: 'var(--text-4)' }}>DPP đã mint</div>
                <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--c6-500)' }}>{productList.filter(p => p.dppStatus === 'minted').length}/{productList.length}</div>
              </div>
            </div>

            {/* Search */}
            <div style={{ marginBottom: 16 }}>
              <input
                type="text"
                placeholder={t('vendor.products.searchPlaceholder')}
                value={productSearch}
                onChange={e => setProductSearch(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-1)', color: 'var(--text-1)', fontSize: '.82rem' }}
              />
            </div>

            {/* Add product form — full */}
            {showAddProduct && (
              <div className="card" style={{ padding: 24, marginBottom: 16, borderLeft: '3px solid var(--c4-500)' }}>
                <div className="label" style={{ marginBottom: 16 }}>{t('vendor.products.addFormTitle')}</div>
                <div className="flex-col gap-14">
                  {/* Row 1: Name */}
                  <div>
                    <label style={{ fontSize: '.72rem', color: 'var(--text-3)', display: 'block', marginBottom: 4 }}>{t('vendor.products.labelName')}</label>
                    <input placeholder="VD: Trà Ô Long Đài Loan Premium" value={newProduct.name} onChange={e => setNewProduct(p => ({ ...p, name: e.target.value }))} style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-1)', color: 'var(--text-1)', fontSize: '.82rem' }} />
                  </div>

                  {/* Row 2: Price, Stock, Commission, SKU */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 10 }}>
                    <div>
                      <label style={{ fontSize: '.72rem', color: 'var(--text-3)', display: 'block', marginBottom: 4 }}>{t('vendor.products.labelPrice')}</label>
                      <input placeholder="250.000₫" value={newProduct.price} onChange={e => setNewProduct(p => ({ ...p, price: e.target.value }))} style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-1)', color: 'var(--text-1)', fontSize: '.82rem' }} />
                    </div>
                    <div>
                      <label style={{ fontSize: '.72rem', color: 'var(--text-3)', display: 'block', marginBottom: 4 }}>{t('vendor.products.labelStock')}</label>
                      <input type="number" placeholder="100" value={newProduct.stock} onChange={e => setNewProduct(p => ({ ...p, stock: e.target.value }))} style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-1)', color: 'var(--text-1)', fontSize: '.82rem' }} />
                    </div>
                    <div>
                      <label style={{ fontSize: '.72rem', color: 'var(--text-3)', display: 'block', marginBottom: 4 }}>{t('vendor.products.labelCommission')}</label>
                      <input placeholder="15%" value={newProduct.commission} onChange={e => setNewProduct(p => ({ ...p, commission: e.target.value }))} style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-1)', color: 'var(--text-1)', fontSize: '.82rem' }} />
                    </div>
                    <div>
                      <label style={{ fontSize: '.72rem', color: 'var(--text-3)', display: 'block', marginBottom: 4 }}>{t('vendor.products.labelSku')}</label>
                      <input placeholder="SP-001" value={newProduct.sku} onChange={e => setNewProduct(p => ({ ...p, sku: e.target.value }))} style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-1)', color: 'var(--text-1)', fontSize: '.82rem' }} />
                    </div>
                  </div>

                  {/* Row 3: Category, Origin, Weight */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 10 }}>
                    <div>
                      <label style={{ fontSize: '.72rem', color: 'var(--text-3)', display: 'block', marginBottom: 4 }}>{t('vendor.products.labelCategory')}</label>
                      <select value={newProduct.category} onChange={e => setNewProduct(p => ({ ...p, category: e.target.value }))} style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-1)', color: 'var(--text-1)', fontSize: '.82rem' }}>
                        <option value="">{t('vendor.products.selectCategory')}</option>
                        {[
                          { key: 'catFood', value: t('vendor.products.catFood') },
                          { key: 'catBeauty', value: t('vendor.products.catBeauty') },
                          { key: 'catHealth', value: t('vendor.products.catHealth') },
                          { key: 'catFashion', value: t('vendor.products.catFashion') },
                          { key: 'catTech', value: t('vendor.products.catTech') },
                          { key: 'catHome', value: t('vendor.products.catHome') },
                          { key: 'catPets', value: t('vendor.products.catPets') },
                          { key: 'catOther', value: t('vendor.products.catOther') },
                        ].map(c => <option key={c.key} value={c.value}>{c.value}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={{ fontSize: '.72rem', color: 'var(--text-3)', display: 'block', marginBottom: 4 }}>{t('vendor.products.labelOrigin')}</label>
                      <input placeholder="VD: Việt Nam, Đài Loan" value={newProduct.origin} onChange={e => setNewProduct(p => ({ ...p, origin: e.target.value }))} style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-1)', color: 'var(--text-1)', fontSize: '.82rem' }} />
                    </div>
                    <div>
                      <label style={{ fontSize: '.72rem', color: 'var(--text-3)', display: 'block', marginBottom: 4 }}>{t('vendor.products.labelWeight')}</label>
                      <input placeholder="VD: 500g, 1 hộp" value={newProduct.weight} onChange={e => setNewProduct(p => ({ ...p, weight: e.target.value }))} style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-1)', color: 'var(--text-1)', fontSize: '.82rem' }} />
                    </div>
                  </div>

                  {/* Row 4: Description */}
                  <div>
                    <label style={{ fontSize: '.72rem', color: 'var(--text-3)', display: 'block', marginBottom: 4 }}>{t('vendor.products.labelDescription')}</label>
                    <textarea placeholder={t('vendor.products.descPlaceholder')} value={newProduct.description} onChange={e => setNewProduct(p => ({ ...p, description: e.target.value }))} rows={4} style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-1)', color: 'var(--text-1)', fontSize: '.82rem', resize: 'vertical' }} />
                  </div>

                  {/* Row 5: Image upload */}
                  <div>
                    <label style={{ fontSize: '.72rem', color: 'var(--text-3)', display: 'block', marginBottom: 4 }}>{t('vendor.products.labelImage')}</label>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 10 }}>
                      <label style={{ textAlign: 'center', padding: 20, border: `2px dashed ${newProduct.imageUrl ? '#22c55e' : 'var(--border)'}`, borderRadius: 12, cursor: 'pointer', background: newProduct.imageUrl ? 'rgba(16,185,129,.06)' : 'var(--bg-2)', display: 'block' }}>
                        <div style={{ fontSize: '1.5rem', marginBottom: 4 }}>{newProduct.imageUrl ? '✅' : '📷'}</div>
                        <div style={{ fontSize: '.68rem', color: 'var(--text-3)' }}>{newProduct.imageUrl ? t('vendor.products.imageUploaded') : t('vendor.products.mainImage')}</div>
                        <input type="file" accept="image/*" className="hidden" onChange={async e => {
                          const f = e.target.files?.[0]; if (!f || !token) return;
                          try {
                            showToast('⏳ Đang upload...');
                            const r = await uploadApi.upload(f, 'product', token);
                            setNewProduct(p => ({ ...p, imageUrl: r.url }));
                            showToast(t('vendor.toast.imageUploaded'));
                          } catch { showToast('Upload ảnh thất bại', 'error'); }
                        }} />
                      </label>
                    </div>
                  </div>

                  {/* Row 6: DPP option */}
                  <div style={{ padding: '12px 16px', background: 'rgba(99,102,241,.06)', borderRadius: 10, border: '1px solid rgba(99,102,241,.15)' }}>
                    <div className="flex gap-8" style={{ alignItems: 'center' }}>
                      <span style={{ fontSize: '1.1rem' }}>🔐</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700, fontSize: '.82rem' }}>{t('vendor.products.dppOption')}</div>
                        <div style={{ fontSize: '.7rem', color: 'var(--text-3)' }}>{t('vendor.products.dppOptionDesc')}</div>
                      </div>
                      <span className="badge badge-c6" style={{ fontSize: '.65rem' }}>{t('vendor.products.auto')}</span>
                    </div>
                  </div>

                  {/* Row 7: Legal Compliance — dynamic by category */}
                  {newProduct.category && LEGAL_REQUIREMENTS[newProduct.category] && (() => {
                    const legal = LEGAL_REQUIREMENTS[newProduct.category];
                    const riskColor = RISK_COLORS[legal.riskLevel];
                    return (
                      <div style={{ border: `2px solid ${riskColor}40`, borderRadius: 12, overflow: 'hidden' }}>
                        {/* Header */}
                        <div style={{ padding: '10px 16px', background: `${riskColor}10`, borderBottom: `1px solid ${riskColor}30`, display: 'flex', alignItems: 'center', gap: 10 }}>
                          <span style={{ fontSize: '1.1rem' }}>⚖️</span>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 700, fontSize: '.85rem', color: riskColor }}>{legal.title}</div>
                            <div style={{ fontSize: '.65rem', color: 'var(--text-4)', marginTop: 2 }}>📋 Căn cứ pháp lý: {legal.basis}</div>
                          </div>
                          <span style={{ padding: '2px 10px', borderRadius: 20, background: `${riskColor}20`, color: riskColor, fontSize: '.65rem', fontWeight: 700, whiteSpace: 'nowrap' as const }}>
                            {RISK_LABELS[legal.riskLevel]}
                          </span>
                        </div>
                        {/* Doc list */}
                        <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                          <div style={{ fontSize: '.72rem', color: 'var(--text-3)', marginBottom: 4 }}>
                            Xác nhận đã chuẩn bị đầy đủ các giấy tờ sau. <strong style={{ color: '#ef4444' }}>Giấy tờ bắt buộc (*)</strong> phải có trước khi đăng sản phẩm.
                          </div>
                          {legal.docs.map(doc => {
                            const checked = !!legalDocs[doc.key];
                            return (
                              <div key={doc.key}
                                onClick={() => toggleLegalDoc(doc.key)}
                                style={{ display: 'flex', gap: 12, padding: '10px 12px', borderRadius: 8, border: `1px solid ${checked ? 'var(--c4-500)' : doc.required ? '#ef444440' : 'var(--border)'}`, background: checked ? 'rgba(34,197,94,.06)' : doc.required ? 'rgba(239,68,68,.03)' : 'var(--bg-2)', cursor: 'pointer', transition: 'all .15s' }}>
                                <div style={{ width: 18, height: 18, borderRadius: 4, border: `2px solid ${checked ? 'var(--c4-500)' : doc.required ? '#ef4444' : 'var(--border)'}`, background: checked ? 'var(--c4-500)' : 'transparent', flexShrink: 0, marginTop: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '.7rem', color: '#fff' }}>
                                  {checked ? '✓' : ''}
                                </div>
                                <div style={{ flex: 1 }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                                    <span style={{ fontWeight: 700, fontSize: '.78rem', color: checked ? 'var(--c4-500)' : 'var(--text-1)' }}>{doc.label}</span>
                                    {doc.required && <span style={{ fontSize: '.6rem', color: '#ef4444', fontWeight: 700 }}>* BẮT BUỘC</span>}
                                    {!doc.required && <span style={{ fontSize: '.6rem', color: 'var(--text-4)' }}>Khuyến nghị</span>}
                                  </div>
                                  <div style={{ fontSize: '.68rem', color: 'var(--text-3)', lineHeight: 1.5 }}>{doc.desc}</div>
                                  {doc.warning && <div style={{ marginTop: 4, fontSize: '.65rem', color: '#f59e0b', fontWeight: 600 }}>⚠️ {doc.warning}</div>}
                                </div>
                              </div>
                            );
                          })}
                          {/* Summary */}
                          {(() => {
                            const status = getLegalStatus(newProduct.category, legalDocs);
                            return (
                              <div style={{ marginTop: 4, padding: '8px 12px', borderRadius: 8, background: status.ok ? 'rgba(34,197,94,.08)' : 'rgba(239,68,68,.08)', border: `1px solid ${status.ok ? 'rgba(34,197,94,.3)' : 'rgba(239,68,68,.3)'}`, display: 'flex', alignItems: 'center', gap: 8 }}>
                                <span style={{ fontSize: '1rem' }}>{status.ok ? '✅' : '❌'}</span>
                                <span style={{ fontSize: '.75rem', fontWeight: 700, color: status.ok ? 'var(--c4-500)' : '#ef4444' }}>
                                  {status.ok ? 'Đã xác nhận đủ giấy tờ bắt buộc — có thể đăng sản phẩm' : `Còn thiếu ${status.missing} giấy tờ bắt buộc`}
                                </span>
                              </div>
                            );
                          })()}
                        </div>
                        {legalError && (
                          <div style={{ padding: '8px 16px', background: 'rgba(239,68,68,.1)', borderTop: '1px solid rgba(239,68,68,.2)', fontSize: '.75rem', color: '#ef4444', fontWeight: 600 }}>
                            ⛔ {legalError}
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  {/* Actions */}
                  <div className="flex gap-8" style={{ paddingTop: 4 }}>
                    <button className="btn btn-primary btn-sm" onClick={handleAddProduct}>💾 {t('vendor.products.saveBtn')}</button>
                    <button className="btn btn-secondary btn-sm" onClick={() => { setShowAddProduct(false); setLegalDocs({}); setLegalError(''); }}>{t('vendor.products.cancelBtn')}</button>
                  </div>
                </div>
              </div>
            )}

            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ overflowX: 'auto' }}>
                <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '.78rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border)' }}>
                      {['', t('vendor.products.thProduct'), t('vendor.products.thPrice'), t('vendor.products.thStock'), t('vendor.products.thSold'), t('vendor.products.thCommission'), 'DPP', 'Pháp lý', t('vendor.products.thStatus'), t('vendor.products.thActions')].map(h => (
                        <th key={h} style={{ padding: '12px 14px', textAlign: 'left', fontWeight: 700, fontSize: '.65rem', color: 'var(--text-3)', letterSpacing: '.06em', textTransform: 'uppercase' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredProducts.map(p => {
                      const sc = productStatusConfig[p.hidden ? 'hidden' : p.status] || productStatusConfig.active;
                      const dsc = dppStatusConfig[p.dppStatus];
                      const isEditing = editingProduct === p.id;
                      return (
                        <tr key={p.id} style={{ borderBottom: '1px solid var(--border)', opacity: p.hidden ? 0.5 : 1 }}>
                          <td style={{ padding: '12px 14px', fontSize: '1.3rem' }}>{p.emoji}</td>
                          <td style={{ padding: '12px 14px', fontWeight: 600 }}>
                            {isEditing ? (
                              <input value={newProduct.name} onChange={e => setNewProduct(prev => ({ ...prev, name: e.target.value }))} placeholder={p.name} style={{ padding: '4px 8px', borderRadius: 4, border: '1px solid var(--border)', background: 'var(--bg-1)', color: 'var(--text-1)', fontSize: '.78rem', width: '100%' }} />
                            ) : p.name}
                          </td>
                          <td style={{ padding: '12px 14px', fontFamily: 'var(--ff-display)', fontWeight: 700 }}>{p.price}</td>
                          <td style={{ padding: '12px 14px', color: p.stock <= 50 ? 'var(--rose-400)' : 'var(--text-2)' }}>{p.stock}</td>
                          <td style={{ padding: '12px 14px' }}>{p.sold.toLocaleString()}</td>
                          <td style={{ padding: '12px 14px' }}><span className="badge badge-c6">{p.commission}</span></td>
                          <td style={{ padding: '12px 14px' }}>
                            {mintingIds.has(p.id) ? (
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px', borderRadius: 20, background: 'rgba(99,102,241,.12)', color: 'var(--c6-500)', fontSize: '.65rem', fontWeight: 700 }}>
                                ⛓️ Đang mint...
                              </span>
                            ) : (
                              <>
                                <span className={`status-pill badge ${dsc.badge}`}>{dsc.label}</span>
                                {p.dppTokenId !== '—' && <span className="mono" style={{ fontSize: '.6rem', color: 'var(--text-4)', marginLeft: 4 }}>{p.dppTokenId}</span>}
                              </>
                            )}
                          </td>
                          <td style={{ padding: '12px 14px' }}>
                            {(p as any).legalOk === true ? (
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, padding: '2px 8px', borderRadius: 20, background: 'rgba(34,197,94,.1)', color: '#16a34a', fontSize: '.65rem', fontWeight: 700, whiteSpace: 'nowrap' as const }}>✅ Đủ hồ sơ</span>
                            ) : (p as any).legalOk === false ? (
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, padding: '2px 8px', borderRadius: 20, background: 'rgba(239,68,68,.1)', color: '#ef4444', fontSize: '.65rem', fontWeight: 700, whiteSpace: 'nowrap' as const }}>⚠️ Thiếu hồ sơ</span>
                            ) : (
                              <span style={{ fontSize: '.65rem', color: 'var(--text-4)' }}>—</span>
                            )}
                          </td>
                          <td style={{ padding: '12px 14px' }}><span className={`badge ${sc.badge}`}>{t(sc.labelKey)}</span></td>
                          <td style={{ padding: '12px 14px' }}>
                            <div className="flex gap-8" style={{ flexWrap: 'nowrap' }}>
                              {isEditing ? (
                                <>
                                  <button className="btn btn-primary btn-sm" style={{ fontSize: '.65rem', padding: '4px 8px' }} onClick={() => handleSaveEditProduct(p.id)}>{t('vendor.products.saveEditBtn')}</button>
                                  <button className="btn btn-secondary btn-sm" style={{ fontSize: '.65rem', padding: '4px 8px' }} onClick={() => { setEditingProduct(null); setNewProduct({ name: '', price: '', stock: '', commission: '', description: '', category: '', origin: '', weight: '', sku: '', imageUrl: '' }); }}>{t('vendor.products.cancelBtn')}</button>
                                </>
                              ) : (
                                <>
                                  {p.dppStatus === 'pending' && !mintingIds.has(p.id) && (
                                    <button className="btn btn-primary btn-sm" style={{ fontSize: '.65rem', padding: '4px 10px', background: 'var(--c6-500)', border: 'none' }} onClick={() => handleMintDpp(p.id)}>
                                      ⛓️ Mint DPP
                                    </button>
                                  )}
                                  {mintingIds.has(p.id) && (
                                    <span style={{ fontSize: '.65rem', color: 'var(--c6-500)', fontWeight: 700 }}>⛓️ Minting...</span>
                                  )}
                                  <button className="btn btn-secondary btn-sm" style={{ fontSize: '.65rem', padding: '4px 8px' }} onClick={() => { setEditingProduct(p.id); setNewProduct({ name: p.name, price: p.price, stock: String(p.stock), commission: p.commission, description: (p as any).description || '', category: (p as any).category || '', origin: (p as any).origin || '', weight: (p as any).weight || '', sku: (p as any).sku || '', imageUrl: (p as any).imageUrl || '' }); setShowAddProduct(false); }}>{t('vendor.products.editBtn')}</button>
                                  <button className="btn btn-secondary btn-sm" style={{ fontSize: '.65rem', padding: '4px 8px' }} onClick={() => handleToggleProduct(p.id)}>{p.hidden ? t('vendor.products.showBtn') : t('vendor.products.hideBtn')}</button>
                                  <button className="btn btn-secondary btn-sm" style={{ fontSize: '.65rem', padding: '4px 8px', color: '#ef4444' }} onClick={() => handleDeleteProduct(p.id)}>{t('vendor.products.deleteBtn')}</button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        );

      /* ────── ĐƠN HÀNG ────── */
      case 'orders':
        return (
          <>
            <h2 style={{ fontWeight: 700, fontSize: '1.1rem', marginBottom: 16 }}>{t('vendor.orders.title')}</h2>

            {/* Filters */}
            <div className="flex gap-8" style={{ marginBottom: 16, flexWrap: 'wrap' }}>
              {[{ key: 'all', label: t('vendor.orders.all') }, ...Object.entries(orderStatusConfig).map(([k, v]) => ({ key: k, label: t(v.labelKey) }))].map(f => (
                <button key={f.key} className={`btn btn-sm ${orderFilter === f.key ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setOrderFilter(f.key)} style={{ fontSize: '.72rem' }}>
                  {f.label}
                  {f.key !== 'all' && <span style={{ marginLeft: 4, opacity: 0.7 }}>({orderList.filter(o => o.status === f.key).length})</span>}
                </button>
              ))}
            </div>

            {/* Search */}
            <div style={{ marginBottom: 16 }}>
              <input
                type="text"
                placeholder={t('vendor.orders.searchPlaceholder')}
                value={orderSearch}
                onChange={e => setOrderSearch(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-1)', color: 'var(--text-1)', fontSize: '.82rem' }}
              />
            </div>

            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ overflowX: 'auto' }}>
                <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '.78rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border)' }}>
                      {[t('vendor.orders.thOrderId'), t('vendor.orders.thCustomer'), t('vendor.orders.thProduct'), t('vendor.orders.thValue'), 'KOC', t('vendor.orders.thCommission'), t('vendor.orders.thStatus'), 'TX Hash', t('vendor.orders.thActions')].map(h => (
                        <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 700, fontSize: '.65rem', color: 'var(--text-3)', letterSpacing: '.06em', textTransform: 'uppercase' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredOrders.map(o => {
                      const sc = orderStatusConfig[o.status];
                      const flow = orderStatusFlow[o.status];
                      return (
                        <tr key={o.id} style={{ borderBottom: '1px solid var(--border)' }}>
                          <td style={{ padding: '12px 14px' }} className="mono">{o.id}</td>
                          <td style={{ padding: '12px 14px' }}>{o.customer}</td>
                          <td style={{ padding: '12px 14px', fontWeight: 600 }}>{o.product}</td>
                          <td style={{ padding: '12px 14px', fontFamily: 'var(--ff-display)', fontWeight: 700 }}>{o.amount}</td>
                          <td style={{ padding: '12px 14px', color: 'var(--c6-300)' }}>{o.koc}</td>
                          <td style={{ padding: '12px 14px', color: 'var(--c4-500)', fontWeight: 600 }}>{o.commission}</td>
                          <td style={{ padding: '12px 14px' }}><span className={`status-pill badge ${sc.badge}`}>{t(sc.labelKey)}</span></td>
                          <td style={{ padding: '12px 14px' }} className="mono tx-hash">
                            {o.txHash ? (
                              <span style={{ cursor: 'pointer', color: 'var(--c6-300)' }} onClick={() => handleCopy(o.txHash, 'TX Hash')}>{o.txHash}</span>
                            ) : '—'}
                          </td>
                          <td style={{ padding: '12px 14px' }}>
                            {flow ? (
                              <button className="btn btn-primary btn-sm" style={{ fontSize: '.65rem', padding: '4px 10px' }} onClick={() => handleAdvanceOrder(o.id)}>{t(flow.actionKey)}</button>
                            ) : (
                              <span style={{ fontSize: '.68rem', color: 'var(--text-4)' }}>{t('vendor.order.completed')}</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        );

      /* ────── KOC NETWORK ────── */
      case 'koc':
        return (
          <>
            <h2 style={{ fontWeight: 700, fontSize: '1.1rem', marginBottom: 20 }}>{t('vendor.koc.title')}</h2>

            {/* Tier summary */}
            <div className="kpi-grid" style={{ marginBottom: 24 }}>
              {[
                { tier: 'Tier 1', count: 12, rate: '40%', revenue: '45.2M₫', color: 'var(--c4-500)' },
                { tier: 'Tier 2', count: 48, rate: '13%', revenue: '28.7M₫', color: 'var(--c5-500)' },
                { tier: 'Tier 3', count: 96, rate: '5%', revenue: '12.1M₫', color: 'var(--c6-500)' },
              ].map((ti, i) => (
                <div key={i} className="kpi-card">
                  <div className="kpi-label">{ti.tier} ({ti.rate})</div>
                  <div className="kpi-val" style={{ color: ti.color }}>{ti.count} KOC</div>
                  <div className="kpi-delta delta-up">{t('vendor.koc.revenue')}: {ti.revenue}</div>
                </div>
              ))}
            </div>

            {/* Search */}
            <div style={{ marginBottom: 16 }}>
              <input
                type="text"
                placeholder={t('vendor.koc.searchPlaceholder')}
                value={kocSearch}
                onChange={e => setKocSearch(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-1)', color: 'var(--text-1)', fontSize: '.82rem' }}
              />
            </div>

            {/* KOC list */}
            <div className="flex-col gap-12">
              {filteredKOC.map(k => {
                const tc = tierConfig[k.tier];
                return (
                  <div key={k.id} className="card" style={{ padding: '18px 24px' }}>
                    <div className="flex" style={{ justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                      <div>
                        <div className="flex gap-8" style={{ marginBottom: 4 }}>
                          <span className="mono" style={{ fontSize: '.65rem', color: 'var(--text-4)', cursor: 'pointer' }} onClick={() => handleCopy(k.id, k.id)}>{k.id}</span>
                          <span className={`badge ${tc.badge}`}>{tc.label} ({tc.rate})</span>
                          <span className="badge badge-c7">Lv{k.level}</span>
                          <span className="badge badge-gold">Trust {k.trustScore}</span>
                        </div>
                        <div style={{ fontWeight: 700, fontSize: '.92rem' }}>{k.name}</div>
                        <div className="flex gap-16" style={{ fontSize: '.72rem', color: 'var(--text-3)', marginTop: 6 }}>
                          <span>{k.orders} {t('vendor.koc.orders')}</span>
                          <span>Conv: {k.conversion}</span>
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontFamily: 'var(--ff-display)', fontWeight: 700, color: 'var(--c4-500)' }}>{k.sales}</div>
                        <div style={{ fontSize: '.72rem', color: 'var(--text-3)' }}>{t('vendor.koc.commission')}: {k.commission}</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        );

      /* ────── DPP MANAGEMENT ────── */
      case 'dpp':
        return (
          <>
            <div className="flex" style={{ justifyContent: 'space-between', marginBottom: 20 }}>
              <h2 style={{ fontWeight: 700, fontSize: '1.1rem' }}>{t('vendor.dpp.title')}</h2>
            </div>

            {/* DPP Stats */}
            <div className="kpi-grid" style={{ marginBottom: 24 }}>
              {[
                { label: t('vendor.dpp.minted'), value: String(dppMintList.length), color: 'var(--c4-500)' },
                { label: t('vendor.dpp.pendingMint'), value: String(productList.filter(p => p.dppStatus === 'pending').length), color: 'var(--gold-400)' },
                { label: t('vendor.dpp.verifiedOnchain'), value: String(dppMintList.length), color: 'var(--c6-500)' },
                { label: t('vendor.dpp.gasFeesMonth'), value: '12.5 MATIC', color: 'var(--c7-500)' },
              ].map((s, i) => (
                <div key={i} className="kpi-card">
                  <div className="kpi-label">{s.label}</div>
                  <div className="kpi-val" style={{ color: s.color }}>{s.value}</div>
                </div>
              ))}
            </div>

            {/* Pending DPP mints */}
            {productList.filter(p => p.dppStatus === 'pending').length > 0 && (
              <div className="card" style={{ padding: 20, marginBottom: 20, borderLeft: '3px solid var(--gold-400)' }}>
                <div className="label" style={{ marginBottom: 12 }}>{t('vendor.dpp.pendingMintTitle')}</div>
                {productList.filter(p => p.dppStatus === 'pending').map(p => (
                  <div key={p.id} className="flex" style={{ justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                    <div className="flex gap-8">
                      <span>{p.emoji}</span>
                      <span style={{ fontWeight: 600, fontSize: '.85rem' }}>{p.name}</span>
                    </div>
                    <button className="btn btn-primary btn-sm" onClick={() => handleMintDpp(p.id)}>{t('vendor.dpp.mintBtn')}</button>
                  </div>
                ))}
              </div>
            )}

            {/* Minted DPPs table */}
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
                <span style={{ fontWeight: 700, fontSize: '.88rem' }}>{t('vendor.dpp.mintedTitle')} ({dppMintList.length})</span>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '.78rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border)' }}>
                      {[t('vendor.dpp.thTokenId'), t('vendor.dpp.thProduct'), t('vendor.dpp.thMintDate'), 'Chain', 'TX Hash', 'IPFS', t('vendor.dpp.thStatus')].map(h => (
                        <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 700, fontSize: '.65rem', color: 'var(--text-3)', letterSpacing: '.06em', textTransform: 'uppercase' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {dppMintList.map((d, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: '12px 14px', fontFamily: 'var(--ff-display)', fontWeight: 700, color: 'var(--c4-500)' }}>{d.tokenId}</td>
                        <td style={{ padding: '12px 14px', fontWeight: 600 }}>{d.product}</td>
                        <td style={{ padding: '12px 14px', color: 'var(--text-3)' }}>{d.mintDate}</td>
                        <td style={{ padding: '12px 14px' }}><span className="badge badge-c7">{d.chain}</span></td>
                        <td style={{ padding: '12px 14px' }} className="mono">
                          <span style={{ color: 'var(--c6-300)', cursor: 'pointer' }} onClick={() => handleCopy(d.txHash, 'TX Hash')}>{d.txHash}</span>
                        </td>
                        <td style={{ padding: '12px 14px', fontSize: '.7rem', color: 'var(--text-3)' }} className="mono">
                          <span style={{ cursor: 'pointer' }} onClick={() => handleCopy(d.ipfsHash, 'IPFS Hash')}>{d.ipfsHash}</span>
                        </td>
                        <td style={{ padding: '12px 14px' }}><span className="badge badge-c4">Verified</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="onchain-card" style={{ marginTop: 20 }}>
              <div className="verified-seal">On-chain DPP</div>
              <div style={{ fontSize: '.82rem', fontWeight: 600, marginBottom: 8 }}>{t('vendor.dpp.onchainTitle')}</div>
              <div style={{ fontSize: '.72rem', color: 'var(--text-3)', lineHeight: 1.6 }}>
                {t('vendor.dpp.onchainDesc')}
              </div>
              <div className="flex gap-8" style={{ marginTop: 12 }}>
                <span className="badge badge-c4">ERC-721</span>
                <span className="badge badge-c5">IPFS</span>
                <span className="badge badge-c7">Polygon</span>
              </div>
            </div>
          </>
        );

      /* ────── COMMISSION RULES ────── */
      case 'commission':
        return (
          <>
            <h2 style={{ fontWeight: 700, fontSize: '1.1rem', marginBottom: 20 }}>{t('vendor.commissionRules.title')}</h2>

            <div className="flex-col gap-12" style={{ marginBottom: 32 }}>
              {commissionTiers.map((rule, i) => (
                <div key={i} className="card" style={{ padding: '18px 24px', borderLeft: `3px solid ${rule.color}` }}>
                  <div className="flex" style={{ justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '.92rem', color: rule.color }}>{rule.tier}</div>
                      <div style={{ fontSize: '.72rem', color: 'var(--text-3)', marginTop: 2 }}>{t(rule.descKey)}</div>
                      <div style={{ fontSize: '.68rem', color: 'var(--text-4)', marginTop: 4 }}>{t('vendor.commission.minSales')}: {rule.minSalesKey ? t(rule.minSalesKey) : rule.minSales}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontFamily: 'var(--ff-display)', fontWeight: 800, fontSize: '1.4rem', color: rule.color }}>{rule.rate}</div>
                      {rule.smartContract && <span className="badge badge-c4" style={{ fontSize: '.55rem' }}>Smart Contract</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="onchain-card" style={{ padding: 24 }}>
              <div className="verified-seal">Smart Contract Commission</div>
              <p style={{ fontSize: '.82rem', color: 'var(--text-2)', lineHeight: 1.6 }}>
                {t('vendor.commissionRules.desc')}
              </p>
              <div className="flex gap-8" style={{ marginTop: 12 }}>
                <span className="badge badge-c4">Auto payout</span>
                <span className="badge badge-c5">Transparent</span>
                <span className="badge badge-c6">On-chain verified</span>
                <span className="badge badge-c7">Immutable</span>
              </div>
            </div>
          </>
        );

      /* ────── VÍ BLOCKCHAIN ────── */
      case 'wallet':
        return (
          <>
            <h2 style={{ fontWeight: 700, fontSize: '1.1rem', marginBottom: 20 }}>{t('vendor.wallet.title')}</h2>

            {/* Wallet address */}
            <div className="onchain-card" style={{ marginBottom: 20 }}>
              <div className="flex" style={{ justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                <div>
                  <div style={{ fontSize: '.72rem', color: 'var(--text-3)', marginBottom: 4 }}>{t('vendor.wallet.addressLabel')}</div>
                  <div className="mono" style={{ fontSize: '.88rem', fontWeight: 700, color: 'var(--c6-300)', cursor: 'pointer' }} onClick={() => handleCopy(initialWalletData.address, 'wallet')}>{initialWalletData.shortAddress} <span style={{ fontSize: '.65rem', color: 'var(--text-4)' }}>[{t('vendor.wallet.copy')}]</span></div>
                  <div className="mono" style={{ fontSize: '.65rem', color: 'var(--text-4)', marginTop: 2 }}>{initialWalletData.address}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '.72rem', color: 'var(--text-3)' }}>{t('vendor.wallet.totalValue')}</div>
                  <div style={{ fontFamily: 'var(--ff-display)', fontWeight: 800, fontSize: '1.3rem', color: 'var(--c4-500)' }}>{initialWalletData.totalUsd}</div>
                </div>
              </div>
            </div>

            {/* Token balances */}
            <div className="kpi-grid" style={{ marginBottom: 20 }}>
              {initialWalletData.balances.map((b, i) => (
                <div key={i} className="kpi-card">
                  <div className="flex gap-8" style={{ marginBottom: 8 }}>
                    <div style={{
                      width: 32, height: 32, borderRadius: '50%', background: b.color,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '.7rem', fontWeight: 800, color: '#fff',
                    }}>{b.icon}</div>
                    <div className="kpi-label">{b.token}</div>
                  </div>
                  <div className="kpi-val" style={{ color: b.color }}>{b.amount}</div>
                  <div className="kpi-delta delta-up">{b.usd}</div>
                </div>
              ))}
            </div>

            {/* Pending revenue */}
            <div className="card" style={{ padding: 20, marginBottom: 20, borderLeft: '3px solid var(--gold-400)' }}>
              <div className="flex" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '.78rem', color: 'var(--text-3)' }}>{t('vendor.wallet.pendingRevenue')}</div>
                  <div style={{ fontFamily: 'var(--ff-display)', fontWeight: 800, fontSize: '1.2rem', color: 'var(--gold-400)' }}>{formatVND(pendingRevenue)}</div>
                </div>
                <button className="btn btn-primary btn-sm" onClick={() => setShowWithdrawForm(!showWithdrawForm)}>{t('vendor.wallet.withdrawBtn')}</button>
              </div>

              {/* Withdraw form */}
              {showWithdrawForm && (
                <div style={{ marginTop: 16, padding: 16, borderRadius: 8, background: 'var(--bg-1)', border: '1px solid var(--border)' }}>
                  <div className="label" style={{ marginBottom: 8 }}>{t('vendor.wallet.withdrawTitle')}</div>
                  <div style={{ fontSize: '.72rem', color: 'var(--text-3)', marginBottom: 8 }}>Vietcombank **** 5678 | {t('vendor.wallet.available')}: {formatVND(pendingRevenue)}</div>
                  <div className="flex gap-8">
                    <input
                      type="text"
                      placeholder={t('vendor.wallet.amountPlaceholder')}
                      value={withdrawAmount}
                      onChange={e => setWithdrawAmount(e.target.value)}
                      style={{ flex: 1, padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-0)', color: 'var(--text-1)', fontSize: '.82rem' }}
                    />
                    <button className="btn btn-primary btn-sm" onClick={handleWithdraw}>{t('vendor.wallet.confirmWithdraw')}</button>
                    <button className="btn btn-secondary btn-sm" onClick={() => { setShowWithdrawForm(false); setWithdrawAmount(''); }}>{t('vendor.products.cancelBtn')}</button>
                  </div>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-8" style={{ marginBottom: 24 }}>
              <button className="btn btn-secondary btn-sm" onClick={() => { setShowWithdrawForm(true); showToast(t('vendor.toast.selectWithdrawAmount'), 'info'); }}>{t('vendor.wallet.bankWithdraw')}</button>
              <button className="btn btn-secondary btn-sm" onClick={() => showToast(t('vendor.toast.connectingBlockchain'), 'info')}>{t('vendor.wallet.transferToken')}</button>
            </div>

            {/* Transaction history */}
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
                <span style={{ fontWeight: 700, fontSize: '.88rem' }}>{t('vendor.wallet.txHistoryTitle')} ({walletTxHistory.length})</span>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '.78rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border)' }}>
                      {[t('vendor.wallet.thTxHash'), t('vendor.wallet.thType'), t('vendor.wallet.thAmount'), 'Token', t('vendor.wallet.thDate'), t('vendor.wallet.thStatus')].map(h => (
                        <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 700, fontSize: '.65rem', color: 'var(--text-3)', letterSpacing: '.06em', textTransform: 'uppercase' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {walletTxHistory.map((tx, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: '12px 14px' }} className="mono">
                          <span style={{ color: 'var(--c6-300)', cursor: 'pointer' }} onClick={() => handleCopy(tx.hash, 'TX Hash')}>{tx.hash}</span>
                        </td>
                        <td style={{ padding: '12px 14px' }}>{t(tx.typeKey)}</td>
                        <td style={{ padding: '12px 14px', fontFamily: 'var(--ff-display)', fontWeight: 700, color: tx.amount.startsWith('+') ? 'var(--c4-500)' : 'var(--text-1)' }}>{tx.amount}</td>
                        <td style={{ padding: '12px 14px' }}><span className="badge badge-c7">{tx.token}</span></td>
                        <td style={{ padding: '12px 14px', color: 'var(--text-3)' }}>{tx.date}</td>
                        <td style={{ padding: '12px 14px' }}><span className="badge badge-c4">Confirmed</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        );

      /* ────── ANALYTICS ────── */
      case 'analytics':
        return (
          <>
            <h2 style={{ fontWeight: 700, fontSize: '1.1rem', marginBottom: 20 }}>{t('vendor.analytics.title')}</h2>
            <div className="grid-2" style={{ gap: 20, marginBottom: 24 }}>
              <div className="card" style={{ padding: 20 }}>
                <div className="label" style={{ marginBottom: 12 }}>{t('vendor.analytics.revenueByChannel')}</div>
                <div className="flex-col gap-10">
                  {[
                    { label: 'KOC Tier 1', value: '45.2M₫', pct: '52%', color: 'var(--c4-500)' },
                    { label: 'KOC Tier 2', value: '28.7M₫', pct: '33%', color: 'var(--c5-500)' },
                    { label: 'KOC Tier 3', value: '12.1M₫', pct: '14%', color: 'var(--c6-500)' },
                    { label: 'Direct', value: '3.5M₫', pct: '1%', color: 'var(--c7-500)' },
                  ].map((ch, i) => (
                    <div key={i} className="flex" style={{ justifyContent: 'space-between', padding: '8px 0', borderBottom: i < 3 ? '1px solid var(--border)' : 'none' }}>
                      <span style={{ fontSize: '.82rem' }}>{ch.label} ({ch.pct})</span>
                      <span style={{ fontFamily: 'var(--ff-display)', fontWeight: 700, color: ch.color }}>{ch.value}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="card" style={{ padding: 20 }}>
                <div className="label" style={{ marginBottom: 12 }}>{t('vendor.analytics.commissionPaid')}</div>
                <div className="flex-col gap-10">
                  {[
                    { label: 'Tier 1 (40%)', value: '18.08M₫', color: 'var(--c4-500)' },
                    { label: 'Tier 2 (13%)', value: '3.73M₫', color: 'var(--c5-500)' },
                    { label: 'Tier 3 (5%)', value: '605K₫', color: 'var(--c6-500)' },
                    { label: t('vendor.analytics.totalCommission'), value: '22.42M₫', color: 'var(--gold-400)' },
                  ].map((ch, i) => (
                    <div key={i} className="flex" style={{ justifyContent: 'space-between', padding: '8px 0', borderBottom: i < 3 ? '1px solid var(--border)' : 'none' }}>
                      <span style={{ fontSize: '.82rem' }}>{ch.label}</span>
                      <span style={{ fontFamily: 'var(--ff-display)', fontWeight: 700, color: ch.color }}>{ch.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="chart-bar-wrap">
              <div className="label" style={{ marginBottom: 12 }}>{t('vendor.analytics.orders7d')}</div>
              <div className="chart-bars">
                {[78, 92, 65, 110, 95, 88, 102].map((v, i) => (
                  <div key={i} className="chart-bar" style={{ height: `${Math.min(v, 100)}%` }} />
                ))}
              </div>
              <div className="flex" style={{ justifyContent: 'space-between', marginTop: 6 }}>
                {['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map(d => (
                  <span key={d} style={{ flex: 1, textAlign: 'center', fontSize: '.58rem', color: 'var(--text-4)' }}>{d}</span>
                ))}
              </div>
            </div>
          </>
        );

      /* ────── XÁC MINH DOANH NGHIỆP ────── */
      case 'vendor_kyc': {
        const vkycSteps = [
          { key: 'identity', label: t('vendor.kyc.stepIdentity'), icon: '🪪', done: onboardStepDone.identity, desc: t('vendor.kyc.stepIdentityDesc') },
          { key: 'business', label: t('vendor.kyc.stepBusiness'), icon: '📋', done: onboardStepDone.business, desc: t('vendor.kyc.stepBusinessDesc') },
          { key: 'tax', label: t('vendor.kyc.stepTax'), icon: '🏛️', done: onboardStepDone.tax, desc: t('vendor.kyc.stepTaxDesc') },
          { key: 'bank', label: t('vendor.kyc.stepBank'), icon: '🏦', done: onboardStepDone.bank, desc: t('vendor.kyc.stepBankDesc') },
          { key: 'verified', label: t('vendor.kyc.stepComplete'), icon: '✅', done: onboardStepDone.verified, desc: t('vendor.kyc.stepCompleteDesc') },
        ];
        const vCompletedCount = vkycSteps.filter(s => s.done).length;
        const vProgressPct = (vCompletedCount / vkycSteps.length) * 100;

        return (
          <>
            <h2 style={{ fontWeight: 700, fontSize: '1.1rem', marginBottom: 20 }}>{t('vendor.kyc.title')}</h2>
            <div className="flex-col gap-16">
              {/* Progress */}
              <div className="card" style={{ padding: 20 }}>
                <div className="flex" style={{ justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <h3 style={{ fontSize: '.95rem', fontWeight: 700, margin: 0 }}>{t('vendor.kyc.progress')}</h3>
                  <span className="badge" style={{ background: vCompletedCount >= 4 ? 'rgba(34,197,94,.15)' : 'rgba(245,158,11,.15)', color: vCompletedCount >= 4 ? '#22c55e' : '#f59e0b', fontWeight: 700 }}>
                    {vCompletedCount}/{vkycSteps.length} {t('vendor.kyc.steps')}
                  </span>
                </div>
                <div style={{ background: 'var(--bg-2)', borderRadius: 8, height: 10, overflow: 'hidden', marginBottom: 12 }}>
                  <div style={{ width: `${vProgressPct}%`, height: '100%', background: vCompletedCount >= 4 ? '#22c55e' : 'var(--chakra-flow)', borderRadius: 8, transition: 'width .5s' }} />
                </div>
                {vCompletedCount < 4 && (
                  <div style={{ fontSize: '.78rem', color: '#f59e0b', background: 'rgba(245,158,11,.08)', padding: '8px 12px', borderRadius: 8, border: '1px solid rgba(245,158,11,.15)' }}>
                    {t('vendor.kyc.warning')}
                  </div>
                )}
              </div>

              {/* Steps */}
              {vkycSteps.map((step, i) => (
                <div key={step.key} className="card" style={{ padding: 20, opacity: step.done ? 0.7 : 1, border: !step.done && i === vCompletedCount ? '1px solid var(--c6-300)' : undefined }}>
                  <div className="flex" style={{ justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: step.done ? 0 : 12 }}>
                    <div className="flex gap-12" style={{ alignItems: 'center' }}>
                      <span style={{ fontSize: '1.2rem' }}>{step.icon}</span>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '.88rem' }}>{t('vendor.kyc.step')} {i + 1}: {step.label}</div>
                        <div style={{ fontSize: '.75rem', color: 'var(--text-3)', marginTop: 2 }}>{step.desc}</div>
                      </div>
                    </div>
                    <span className="badge" style={{ background: step.done ? 'rgba(34,197,94,.15)' : 'rgba(156,163,175,.15)', color: step.done ? '#22c55e' : 'var(--text-4)', fontWeight: 600, flexShrink: 0 }}>
                      {step.done ? `✓ ${t('vendor.kyc.completed')}` : t('vendor.kyc.notVerified')}
                    </span>
                  </div>

                  {/* CCCD form */}
                  {step.key === 'identity' && !step.done && i === vCompletedCount && (
                    <div className="flex-col gap-12" style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
                      <div>
                        <label style={{ fontSize: '.72rem', fontWeight: 600, color: 'var(--text-3)', marginBottom: 4, display: 'block' }}>{t('vendor.kyc.idNumber')}</label>
                        <input type="text" maxLength={12} placeholder="001234567890" value={onboardData.idNumber} onChange={e => setOD('idNumber', e.target.value)} style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--bg-2)', fontSize: '.85rem', outline: 'none' }} />
                      </div>
                      <div>
                        <label style={{ fontSize: '.72rem', fontWeight: 600, color: 'var(--text-3)', marginBottom: 4, display: 'block' }}>{t('vendor.kyc.fullName')}</label>
                        <input type="text" placeholder="NGUYEN VAN A" value={onboardData.fullName} onChange={e => setOD('fullName', e.target.value.toUpperCase())} style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--bg-2)', fontSize: '.85rem', outline: 'none', textTransform: 'uppercase' }} />
                      </div>
                      <div className="flex gap-12">
                        <div style={{ flex: 1 }}>
                          <label style={{ fontSize: '.72rem', fontWeight: 600, color: 'var(--text-3)', marginBottom: 4, display: 'block' }}>{t('vendor.kyc.frontPhoto')}</label>
                          <label style={{ border: `2px dashed ${onboardData.frontUrl ? '#22c55e' : 'var(--border)'}`, borderRadius: 12, padding: 20, textAlign: 'center', cursor: 'pointer', background: 'var(--bg-2)', display: 'block' }}>
                            <div style={{ fontSize: '1.5rem', marginBottom: 4 }}>{onboardData.frontUrl ? '✅' : '📄'}</div>
                            <div style={{ fontSize: '.72rem', color: 'var(--text-3)' }}>{onboardData.frontUrl ? 'Đã tải lên' : t('vendor.kyc.dragOrClick')}</div>
                            <input type="file" accept="image/*" className="hidden" onChange={async e => {
                              const f = e.target.files?.[0]; if (!f || !token) return;
                              try { const r = await uploadApi.upload(f, 'kyc', token); setOD('frontUrl', r.url); showToast('Ảnh mặt trước đã tải lên'); } catch { showToast('Upload thất bại', 'error'); }
                            }} />
                          </label>
                        </div>
                        <div style={{ flex: 1 }}>
                          <label style={{ fontSize: '.72rem', fontWeight: 600, color: 'var(--text-3)', marginBottom: 4, display: 'block' }}>{t('vendor.kyc.backPhoto')}</label>
                          <label style={{ border: `2px dashed ${onboardData.backUrl ? '#22c55e' : 'var(--border)'}`, borderRadius: 12, padding: 20, textAlign: 'center', cursor: 'pointer', background: 'var(--bg-2)', display: 'block' }}>
                            <div style={{ fontSize: '1.5rem', marginBottom: 4 }}>{onboardData.backUrl ? '✅' : '📄'}</div>
                            <div style={{ fontSize: '.72rem', color: 'var(--text-3)' }}>{onboardData.backUrl ? 'Đã tải lên' : t('vendor.kyc.dragOrClick')}</div>
                            <input type="file" accept="image/*" className="hidden" onChange={async e => {
                              const f = e.target.files?.[0]; if (!f || !token) return;
                              try { const r = await uploadApi.upload(f, 'kyc', token); setOD('backUrl', r.url); showToast('Ảnh mặt sau đã tải lên'); } catch { showToast('Upload thất bại', 'error'); }
                            }} />
                          </label>
                        </div>
                      </div>
                      <button className="btn btn-primary btn-sm" style={{ alignSelf: 'flex-start' }}
                        onClick={() => {
                          if (!onboardData.idNumber || !onboardData.fullName) { showToast('Vui lòng nhập đầy đủ thông tin', 'error'); return; }
                          setOnboardStepDone(prev => ({ ...prev, identity: true }));
                          showToast(t('vendor.toast.cccdSubmitted'));
                        }}>{t('vendor.kyc.submitVerify')}</button>
                    </div>
                  )}

                  {/* Business license form */}
                  {step.key === 'business' && !step.done && i === vCompletedCount && (
                    <div className="flex-col gap-12" style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
                      <div style={{ fontSize: '.78rem', color: '#3b82f6', background: 'rgba(59,130,246,.08)', padding: '8px 12px', borderRadius: 8 }}>
                        {t('vendor.kyc.businessNameMatch')}
                      </div>
                      <div>
                        <label style={{ fontSize: '.72rem', fontWeight: 600, color: 'var(--text-3)', marginBottom: 4, display: 'block' }}>{t('vendor.kyc.businessNameOnLicense')}</label>
                        <input type="text" placeholder="CÔNG TY TNHH ABC" value={onboardData.businessName} onChange={e => setOD('businessName', e.target.value.toUpperCase())} style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--bg-2)', fontSize: '.85rem', outline: 'none', textTransform: 'uppercase' }} />
                      </div>
                      <div>
                        <label style={{ fontSize: '.72rem', fontWeight: 600, color: 'var(--text-3)', marginBottom: 4, display: 'block' }}>{t('vendor.kyc.businessLicenseNo')}</label>
                        <input type="text" placeholder="0123456789" value={onboardData.licenseNo} onChange={e => setOD('licenseNo', e.target.value)} style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--bg-2)', fontSize: '.85rem', outline: 'none' }} />
                      </div>
                      <div>
                        <label style={{ fontSize: '.72rem', fontWeight: 600, color: 'var(--text-3)', marginBottom: 4, display: 'block' }}>{t('vendor.kyc.uploadLicense')}</label>
                        <label style={{ border: `2px dashed ${onboardData.licenseUrl ? '#22c55e' : 'var(--border)'}`, borderRadius: 12, padding: 24, textAlign: 'center', cursor: 'pointer', background: 'var(--bg-2)', display: 'block' }}>
                          <div style={{ fontSize: '1.5rem', marginBottom: 4 }}>{onboardData.licenseUrl ? '✅' : '📋'}</div>
                          <div style={{ fontSize: '.72rem', color: 'var(--text-3)' }}>{onboardData.licenseUrl ? 'Đã tải lên' : t('vendor.kyc.dragUploadLicense')}</div>
                          <div style={{ fontSize: '.65rem', color: 'var(--text-4)', marginTop: 4 }}>{t('vendor.kyc.fileFormats')}</div>
                          <input type="file" accept="image/*,application/pdf" className="hidden" onChange={async e => {
                            const f = e.target.files?.[0]; if (!f || !token) return;
                            try { const r = await uploadApi.upload(f, 'license', token); setOD('licenseUrl', r.url); showToast('Giấy phép đã tải lên'); } catch { showToast('Upload thất bại', 'error'); }
                          }} />
                        </label>
                      </div>
                      <button className="btn btn-primary btn-sm" style={{ alignSelf: 'flex-start' }}
                        onClick={() => {
                          if (!onboardData.businessName || !onboardData.licenseNo) { showToast('Vui lòng nhập đầy đủ thông tin', 'error'); return; }
                          setOnboardStepDone(prev => ({ ...prev, business: true }));
                          showToast(t('vendor.toast.licenseSubmitted'));
                        }}>{t('vendor.kyc.submitLicense')}</button>
                    </div>
                  )}

                  {/* Tax code form */}
                  {step.key === 'tax' && !step.done && i === vCompletedCount && (
                    <div className="flex-col gap-12" style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
                      <div>
                        <label style={{ fontSize: '.72rem', fontWeight: 600, color: 'var(--text-3)', marginBottom: 4, display: 'block' }}>{t('vendor.kyc.taxCode')}</label>
                        <input type="text" placeholder="0123456789" value={onboardData.taxCode} onChange={e => setOD('taxCode', e.target.value)} style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--bg-2)', fontSize: '.85rem', outline: 'none' }} />
                      </div>
                      <div>
                        <label style={{ fontSize: '.72rem', fontWeight: 600, color: 'var(--text-3)', marginBottom: 4, display: 'block' }}>{t('vendor.kyc.businessAddress')}</label>
                        <input type="text" placeholder="123 Nguyễn Huệ, Q.1, TP.HCM" value={onboardData.address} onChange={e => setOD('address', e.target.value)} style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--bg-2)', fontSize: '.85rem', outline: 'none' }} />
                      </div>
                      <button className="btn btn-primary btn-sm" style={{ alignSelf: 'flex-start' }}
                        onClick={() => {
                          if (!onboardData.taxCode || !onboardData.address) { showToast('Vui lòng nhập đầy đủ thông tin', 'error'); return; }
                          setOnboardStepDone(prev => ({ ...prev, tax: true }));
                          showToast(t('vendor.toast.taxVerified'));
                        }}>{t('vendor.kyc.verifyTax')}</button>
                    </div>
                  )}

                  {/* Bank account form */}
                  {step.key === 'bank' && !step.done && i === vCompletedCount && (
                    <div className="flex-col gap-12" style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
                      <div style={{ fontSize: '.78rem', color: '#f59e0b', background: 'rgba(245,158,11,.08)', padding: '8px 12px', borderRadius: 8 }}>
                        {t('vendor.kyc.bankNameMatch')}
                      </div>
                      <div>
                        <label style={{ fontSize: '.72rem', fontWeight: 600, color: 'var(--text-3)', marginBottom: 4, display: 'block' }}>{t('vendor.kyc.bankName')}</label>
                        <select value={onboardData.bankName} onChange={e => setOD('bankName', e.target.value)} style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--bg-2)', fontSize: '.85rem', outline: 'none' }}>
                          <option value="">{t('vendor.kyc.selectBank')}</option>
                          <option>Vietcombank</option><option>BIDV</option><option>Agribank</option>
                          <option>VietinBank</option><option>Techcombank</option><option>MB Bank</option>
                          <option>ACB</option><option>VPBank</option><option>TPBank</option>
                        </select>
                      </div>
                      <div>
                        <label style={{ fontSize: '.72rem', fontWeight: 600, color: 'var(--text-3)', marginBottom: 4, display: 'block' }}>{t('vendor.kyc.bankAccountNumber')}</label>
                        <input type="text" placeholder="1234567890" value={onboardData.bankAccount} onChange={e => setOD('bankAccount', e.target.value)} style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--bg-2)', fontSize: '.85rem', outline: 'none' }} />
                      </div>
                      <div>
                        <label style={{ fontSize: '.72rem', fontWeight: 600, color: 'var(--text-3)', marginBottom: 4, display: 'block' }}>{t('vendor.kyc.bankAccountHolder')}</label>
                        <input type="text" placeholder="CONG TY TNHH ABC" value={onboardData.bankHolder} onChange={e => setOD('bankHolder', e.target.value.toUpperCase())} style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--bg-2)', fontSize: '.85rem', outline: 'none', textTransform: 'uppercase' }} />
                      </div>
                      <button
                        className="btn btn-primary btn-sm"
                        style={{ alignSelf: 'flex-start', opacity: onboardLoading ? 0.6 : 1 }}
                        disabled={onboardLoading}
                        onClick={() => {
                          if (!onboardData.bankName || !onboardData.bankAccount || !onboardData.bankHolder) {
                            showToast('Vui lòng nhập đầy đủ thông tin ngân hàng', 'error'); return;
                          }
                          handleOnboardSubmit();
                        }}>
                        {onboardLoading ? '⏳ Đang gửi...' : t('vendor.kyc.verifyBank')}
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        );
      }

      /* ────── CÀI ĐẶT ────── */
      case 'settings':
        return (
          <>
            <h2 style={{ fontWeight: 700, fontSize: '1.1rem', marginBottom: 20 }}>{t('vendor.settingsPage.title')}</h2>
            <div className="flex-col gap-16">
              {settingsData.map((section, si) => (
                <div key={si} className="card" style={{ padding: 20 }}>
                  <div className="flex" style={{ justifyContent: 'space-between', marginBottom: 12 }}>
                    <div className="label">{section.title.toUpperCase()}</div>
                  </div>
                  <div className="flex-col gap-10">
                    {section.fields.map((f, fi) => {
                      const isEditing = editingSettings?.si === si && editingSettings?.fi === fi;
                      return (
                        <div key={fi} className="flex" style={{ justifyContent: 'space-between', padding: '8px 0', borderBottom: fi < section.fields.length - 1 ? '1px solid var(--border)' : 'none', alignItems: 'center' }}>
                          <span style={{ fontSize: '.82rem', color: 'var(--text-3)' }}>{f.label}</span>
                          <div className="flex gap-8" style={{ alignItems: 'center' }}>
                            {isEditing ? (
                              <>
                                <input
                                  value={editSettingsValue}
                                  onChange={e => setEditSettingsValue(e.target.value)}
                                  style={{ padding: '4px 8px', borderRadius: 4, border: '1px solid var(--border)', background: 'var(--bg-1)', color: 'var(--text-1)', fontSize: '.78rem' }}
                                />
                                <button className="btn btn-primary btn-sm" style={{ fontSize: '.65rem', padding: '4px 8px' }} onClick={() => handleSaveSettings(si, fi)}>{t('vendor.products.saveEditBtn')}</button>
                                <button className="btn btn-secondary btn-sm" style={{ fontSize: '.65rem', padding: '4px 8px' }} onClick={() => setEditingSettings(null)}>{t('vendor.products.cancelBtn')}</button>
                              </>
                            ) : (
                              <>
                                <span style={{ fontSize: '.82rem', fontWeight: 600 }}>{f.value}</span>
                                <button className="btn btn-secondary btn-sm" style={{ fontSize: '.6rem', padding: '2px 8px' }} onClick={() => { setEditingSettings({ si, fi }); setEditSettingsValue(f.value); }}>{t('vendor.settingsPage.updateBtn')}</button>
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </>
        );

      default:
        return null;
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', background: 'var(--bg-0)' }}>
        <div className="dash-wrap" style={{ flex: 1, minHeight: 0 }}>
          {/* Sidebar */}
          <div className="dash-sidebar">
            {/* Sidebar header — fixed */}
            <div className="dash-sidebar-header">
              <div style={{ padding: '0 0 16px', borderBottom: '1px solid var(--border)' }}>
                <div className="flex gap-8">
                  <div style={{
                    width: 40, height: 40, borderRadius: '50%',
                    background: 'var(--chakra-flow)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '.8rem', fontWeight: 700,
                  }}>{(userName || 'V').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}</div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '.82rem' }}>{userName}</div>
                    <span className="badge badge-c4" style={{ marginTop: 2 }}>Official Brand</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Sidebar nav — accordion groups */}
            <div className="dash-sidebar-nav">
              {vendorSidebarGroups.map(group => {
                const isOpen = openGroups[group.key];
                const hasActiveItem = group.items.some(i => i.key === activeNav);
                return (
                  <div key={group.key} style={{ marginBottom: 4 }}>
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
                      <span style={{ flex: 1, fontSize: '.72rem', fontWeight: 800, letterSpacing: '.06em', textTransform: 'uppercase', color: group.color }}>{t(group.labelKey)}</span>
                      <span style={{ fontSize: '.6rem', color: 'var(--text-4)', transition: 'transform .2s', transform: isOpen ? 'rotate(180deg)' : 'rotate(0)' }}>▼</span>
                    </div>
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
                          <span style={{ flex: 1 }}>{t(item.labelKey)}</span>
                        </div>
                      ))}
                    </div>
                    <div style={{ height: 1, background: 'var(--border)', margin: '6px 0' }} />
                  </div>
                );
              })}
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
                {t('vendor.sidebar.logout')}
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="dash-content">
            {/* Toast */}
            {toast && (
              <div style={{
                position: 'sticky', top: 0, zIndex: 100,
                padding: '10px 16px', marginBottom: 16, borderRadius: 8,
                fontSize: '.82rem', fontWeight: 600,
                background: toast.type === 'success' ? 'var(--c4-500)' : toast.type === 'error' ? '#ef4444' : 'var(--c6-500)',
                color: '#fff',
                animation: 'fadeIn .2s ease',
              }}>
                {toast.type === 'success' && '✓ '}{toast.type === 'error' && '✗ '}{toast.type === 'info' && 'ℹ '}
                {toast.msg}
              </div>
            )}

            {/* KPI Cards — always visible */}
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

            {renderContent()}
          </div>
        </div>
    </div>
  );
}
