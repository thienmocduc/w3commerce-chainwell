/**
 * WellKOC API Service Layer
 *
 * Centralised HTTP client + typed service modules for every backend domain.
 * All requests are routed through `apiClient` which reads `API_BASE` from
 * the `useAuth` hook export and attaches JWT bearer tokens automatically.
 *
 * Usage:
 *   import { productsApi, cartApi } from '@lib/api';
 *   const products = await productsApi.list({ category: 'skincare' }, token);
 */

import { API_BASE } from '@hooks/useAuth';

// ─── Shared helpers ────────────────────────────────────────────────────────────

/** Build query string from a plain object, skipping undefined/null values. */
function buildQuery(params: Record<string, unknown>): string {
  const entries = Object.entries(params).filter(
    ([, v]) => v !== undefined && v !== null && v !== '',
  );
  if (!entries.length) return '';
  return '?' + entries.map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`).join('&');
}

/** Extract a human-readable message from a backend error response. */
async function extractErrorMessage(res: Response): Promise<string> {
  try {
    const body = await res.json();
    if (typeof body?.detail === 'string') return body.detail;
    if (Array.isArray(body?.detail)) {
      // FastAPI validation errors → first message
      return body.detail[0]?.msg || body.detail[0] || res.statusText;
    }
    if (typeof body?.message === 'string') return body.message;
    if (typeof body?.error === 'string') return body.error;
  } catch {
    // Response body isn't JSON
  }
  return res.statusText || `HTTP ${res.status}`;
}

// ─── Core API client ───────────────────────────────────────────────────────────

function buildHeaders(token?: string | null, extra?: HeadersInit): HeadersInit {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    ...(extra as Record<string, string> | undefined),
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  token?: string | null,
): Promise<T> {
  const url = `${API_BASE}${path}`;
  const res = await fetch(url, {
    method,
    headers: buildHeaders(token),
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const msg = await extractErrorMessage(res);
    const err = new Error(msg) as Error & { status: number };
    err.status = res.status;
    throw err;
  }

  // 204 No Content
  if (res.status === 204) return undefined as unknown as T;

  return res.json() as Promise<T>;
}

export const apiClient = {
  get<T>(path: string, token?: string | null): Promise<T> {
    return request<T>('GET', path, undefined, token);
  },
  post<T>(path: string, body: unknown, token?: string | null): Promise<T> {
    return request<T>('POST', path, body, token);
  },
  put<T>(path: string, body: unknown, token?: string | null): Promise<T> {
    return request<T>('PUT', path, body, token);
  },
  patch<T>(path: string, body: unknown, token?: string | null): Promise<T> {
    return request<T>('PATCH', path, body, token);
  },
  delete<T>(path: string, token?: string | null): Promise<T> {
    return request<T>('DELETE', path, undefined, token);
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// SHARED TYPES
// ─────────────────────────────────────────────────────────────────────────────

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

export interface ApiMessage {
  message: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// PRODUCTS
// ─────────────────────────────────────────────────────────────────────────────

export interface ProductVariant {
  id: string;
  name: string;
  sku: string;
  price: number;
  stock: number;
  attributes: Record<string, string>;
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  description: string;
  short_description?: string;
  price: number;
  original_price?: number;
  currency: string;
  category: string;
  category_slug: string;
  brand: string;
  origin: string;
  images: string[];
  thumbnail?: string;
  variants?: ProductVariant[];
  rating: number;
  review_count: number;
  sold_count: number;
  stock: number;
  xp_reward: number;
  dpp_enabled: boolean;
  dpp_token_id?: string;
  dpp_chain?: string;
  certifications: string[];
  vendor_id: string;
  vendor_name?: string;
  status: 'active' | 'pending' | 'rejected' | 'draft';
  tags: string[];
  created_at: string;
  updated_at: string;
}

export interface CreateProductInput {
  name: string;
  description: string;
  short_description?: string;
  price: number;
  original_price?: number;
  currency?: string;
  category: string;
  brand: string;
  origin: string;
  images: string[];
  variants?: Omit<ProductVariant, 'id'>[];
  stock: number;
  dpp_enabled?: boolean;
  certifications?: string[];
  tags?: string[];
}

export interface ProductListParams {
  category?: string;
  search?: string;
  sort?: string;
  page?: number;
  per_page?: number;
  dpp_only?: boolean;
  vendor_id?: string;
  status?: string;
  min_price?: number;
  max_price?: number;
}

export const productsApi = {
  list(params: ProductListParams = {}, token?: string): Promise<PaginatedResponse<Product>> {
    return apiClient.get(`/products${buildQuery(params as Record<string, unknown>)}`, token);
  },

  getById(id: string, token?: string): Promise<Product> {
    return apiClient.get(`/products/${id}`, token);
  },

  getBySlug(slug: string, token?: string): Promise<Product> {
    return apiClient.get(`/products/slug/${slug}`, token);
  },

  create(data: CreateProductInput, token: string): Promise<Product> {
    return apiClient.post('/products', data, token);
  },

  update(id: string, data: Partial<CreateProductInput>, token: string): Promise<Product> {
    return apiClient.put(`/products/${id}`, data, token);
  },

  delete(id: string, token: string): Promise<ApiMessage> {
    return apiClient.delete(`/products/${id}`, token);
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// CART
// ─────────────────────────────────────────────────────────────────────────────

export interface CartItem {
  id: string;
  product_id: string;
  product_name: string;
  product_image?: string;
  variant_id?: string;
  variant_name?: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
  xp_reward: number;
  dpp_enabled: boolean;
}

export interface Cart {
  id: string;
  user_id: string;
  items: CartItem[];
  subtotal: number;
  discount: number;
  shipping_fee: number;
  total: number;
  total_xp: number;
  coupon_code?: string;
  updated_at: string;
}

export interface AddCartItemInput {
  product_id: string;
  quantity: number;
  variant_id?: string;
}

export const cartApi = {
  get(token: string): Promise<Cart> {
    return apiClient.get('/cart', token);
  },

  addItem(item: AddCartItemInput, token: string): Promise<Cart> {
    return apiClient.post('/cart/items', item, token);
  },

  updateItem(itemId: string, quantity: number, token: string): Promise<Cart> {
    return apiClient.put(`/cart/items/${itemId}`, { quantity }, token);
  },

  removeItem(itemId: string, token: string): Promise<Cart> {
    return apiClient.delete(`/cart/items/${itemId}`, token);
  },

  applyCoupon(code: string, token: string): Promise<Cart> {
    return apiClient.post('/cart/coupon', { coupon_code: code }, token);
  },

  removeCoupon(token: string): Promise<Cart> {
    return apiClient.delete('/cart/coupon', token);
  },

  clear(token: string): Promise<ApiMessage> {
    return apiClient.delete('/cart', token);
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// ORDERS
// ─────────────────────────────────────────────────────────────────────────────

export interface ShippingAddress {
  full_name: string;
  phone: string;
  email?: string;
  address: string;
  district: string;
  city: string;
  country?: string;
  postal_code?: string;
  note?: string;
}

export interface OrderItem {
  id: string;
  product_id: string;
  product_name: string;
  product_image?: string;
  variant_id?: string;
  variant_name?: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
  xp_reward: number;
}

export interface TrackingEvent {
  timestamp: string;
  status: string;
  description: string;
  location?: string;
}

export interface Order {
  id: string;
  order_number: string;
  user_id: string;
  items: OrderItem[];
  shipping_address: ShippingAddress;
  subtotal: number;
  shipping_fee: number;
  discount: number;
  total: number;
  currency: string;
  payment_method: string;
  payment_status: 'pending' | 'paid' | 'failed' | 'refunded';
  status: 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'returned';
  tracking_number?: string;
  tracking_events?: TrackingEvent[];
  coupon_code?: string;
  xp_earned: number;
  koc_referral_code?: string;
  use_w3c_token?: boolean;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface CheckoutData {
  shipping_address: ShippingAddress;
  payment_method: string;
  coupon_code?: string;
  use_w3c_token?: boolean;
  koc_referral_code?: string;
  notes?: string;
}

export interface OrderListParams {
  status?: string;
  page?: number;
  per_page?: number;
  from_date?: string;
  to_date?: string;
}

export const ordersApi = {
  create(data: CheckoutData, token: string): Promise<Order> {
    return apiClient.post('/orders', data, token);
  },

  list(params: OrderListParams = {}, token: string): Promise<PaginatedResponse<Order>> {
    return apiClient.get(`/orders${buildQuery(params as Record<string, unknown>)}`, token);
  },

  getById(id: string, token: string): Promise<Order> {
    return apiClient.get(`/orders/${id}`, token);
  },

  track(id: string, token: string): Promise<{ order_id: string; tracking_number?: string; events: TrackingEvent[] }> {
    return apiClient.get(`/orders/${id}/tracking`, token);
  },

  cancel(id: string, reason: string, token: string): Promise<Order> {
    return apiClient.post(`/orders/${id}/cancel`, { reason }, token);
  },

  requestReturn(id: string, reason: string, token: string): Promise<ApiMessage> {
    return apiClient.post(`/orders/${id}/return`, { reason }, token);
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// PAYMENTS
// ─────────────────────────────────────────────────────────────────────────────

export interface PaymentInitResponse {
  payment_url: string;
  payment_id: string;
  gateway: string;
  expires_at: string;
}

export interface USDTPaymentInfo {
  wallet_address: string;
  amount_usdt: string;
  network: string;
  memo?: string;
  expires_at: string;
  payment_id: string;
}

export interface USDTVerifyResponse {
  verified: boolean;
  order_id: string;
  tx_hash: string;
  amount: string;
  confirmations: number;
  message: string;
}

export interface PayOSPaymentResponse {
  checkout_url: string;
  payment_link_id: string;
  qr_code?: string;
  expires_at: string;
}

export const paymentsApi = {
  createVNPay(
    orderId: string,
    amount: number,
    token: string,
  ): Promise<PaymentInitResponse> {
    return apiClient.post(
      '/payments/vnpay/create',
      {
        order_id: orderId,
        amount,
        return_url: `${window.location.origin}/checkout?payment=vnpay`,
      },
      token,
    );
  },

  createMoMo(
    orderId: string,
    amount: number,
    token: string,
  ): Promise<PaymentInitResponse> {
    return apiClient.post(
      '/payments/momo/create',
      {
        order_id: orderId,
        amount,
        return_url: `${window.location.origin}/checkout?payment=momo`,
        notify_url: `${window.location.origin}/checkout?payment=momo&notify=1`,
      },
      token,
    );
  },

  createPayOS(
    orderId: string,
    amount: number,
    token: string,
  ): Promise<PayOSPaymentResponse> {
    return apiClient.post(
      '/payments/payos/create',
      {
        order_id: orderId,
        amount,
        return_url: `${window.location.origin}/checkout?payment=payos`,
        cancel_url: `${window.location.origin}/checkout?payment=payos&cancelled=1`,
      },
      token,
    );
  },

  initiateUSDT(
    orderId: string,
    amount: number,
    network: 'polygon' | 'bsc' | 'tron',
    token: string,
  ): Promise<USDTPaymentInfo> {
    return apiClient.post(
      '/payments/usdt/initiate',
      { order_id: orderId, amount, network },
      token,
    );
  },

  verifyUSDT(
    data: { tx_hash: string; order_id: string },
    token: string,
  ): Promise<USDTVerifyResponse> {
    return apiClient.post('/payments/usdt/verify', data, token);
  },

  getStatus(
    paymentId: string,
    token: string,
  ): Promise<{ payment_id: string; status: string; order_id: string }> {
    return apiClient.get(`/payments/${paymentId}/status`, token);
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// KOC
// ─────────────────────────────────────────────────────────────────────────────

export interface KOCProfile {
  id: string;
  user_id: string;
  display_name: string;
  bio?: string;
  avatar?: string;
  rank: 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond';
  rank_score: number;
  referral_code: string;
  total_earnings: number;
  pending_earnings: number;
  paid_earnings: number;
  total_referrals: number;
  active_referrals: number;
  team_size: number;
  xp_balance: number;
  w3c_balance: number;
  joined_at: string;
}

export interface CommissionRecord {
  id: string;
  order_id: string;
  product_name: string;
  buyer_name?: string;
  amount: number;
  rate: number;
  level: number;
  status: 'pending' | 'approved' | 'paid' | 'rejected';
  created_at: string;
  paid_at?: string;
}

export interface AffiliateLink {
  id: string;
  product_id: string;
  product_name: string;
  product_image?: string;
  url: string;
  short_url: string;
  clicks: number;
  conversions: number;
  earnings: number;
  created_at: string;
}

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  rank: string;
  level: number;
  referral_code: string;
  total_earnings: number;
  joined_at: string;
}

export interface KOCRanking {
  rank: number;
  koc_id: string;
  display_name: string;
  avatar?: string;
  rank_title: string;
  score: number;
  total_earnings: number;
  period: string;
}

export interface KOCCommissionParams {
  page?: number;
  per_page?: number;
  status?: string;
  from_date?: string;
  to_date?: string;
}

export const kocApi = {
  getProfile(token: string): Promise<KOCProfile> {
    return apiClient.get('/koc/profile', token);
  },

  updateProfile(data: Partial<Pick<KOCProfile, 'display_name' | 'bio' | 'avatar'>>, token: string): Promise<KOCProfile> {
    return apiClient.put('/koc/profile', data, token);
  },

  getCommissions(params: KOCCommissionParams = {}, token: string): Promise<PaginatedResponse<CommissionRecord>> {
    return apiClient.get(`/koc/commissions${buildQuery(params as Record<string, unknown>)}`, token);
  },

  getAffiliateLinks(token: string): Promise<AffiliateLink[]> {
    return apiClient.get('/koc/affiliate-links', token);
  },

  createShareLink(productId: string, token: string): Promise<AffiliateLink> {
    return apiClient.post('/koc/affiliate-links', { product_id: productId }, token);
  },

  deleteShareLink(linkId: string, token: string): Promise<ApiMessage> {
    return apiClient.delete(`/koc/affiliate-links/${linkId}`, token);
  },

  getTeam(token: string): Promise<{ members: TeamMember[]; tree: unknown }> {
    return apiClient.get('/koc/team', token);
  },

  getRanking(token: string): Promise<{ my_rank: KOCRanking; leaderboard: KOCRanking[] }> {
    return apiClient.get('/koc/ranking', token);
  },

  requestPayout(amount: number, method: string, token: string): Promise<ApiMessage> {
    return apiClient.post('/koc/payout/request', { amount, method }, token);
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// VENDOR
// ─────────────────────────────────────────────────────────────────────────────

export interface VendorProfile {
  id: string;
  user_id: string;
  store_name: string;
  store_description?: string;
  logo?: string;
  banner?: string;
  website?: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  country: string;
  tax_id?: string;
  business_license?: string;
  status: 'pending' | 'active' | 'suspended' | 'rejected';
  rating: number;
  review_count: number;
  total_products: number;
  total_orders: number;
  total_earnings: number;
  commission_rate: number;
  joined_at: string;
}

export interface VendorAnalytics {
  period: string;
  revenue: number;
  orders: number;
  avg_order_value: number;
  products_sold: number;
  new_customers: number;
  returning_customers: number;
  revenue_chart: { date: string; revenue: number }[];
  top_products: { product_id: string; name: string; revenue: number; units: number }[];
}

export interface VendorCommission {
  id: string;
  order_id: string;
  gross_amount: number;
  commission_rate: number;
  commission_amount: number;
  net_amount: number;
  status: 'pending' | 'approved' | 'paid';
  created_at: string;
  paid_at?: string;
}

export interface VendorListParams {
  page?: number;
  per_page?: number;
  status?: string;
  from_date?: string;
  to_date?: string;
}

export const vendorApi = {
  getProfile(token: string): Promise<VendorProfile> {
    return apiClient.get('/vendor/profile', token);
  },

  updateProfile(data: Partial<VendorProfile>, token: string): Promise<VendorProfile> {
    return apiClient.put('/vendor/profile', data, token);
  },

  getProducts(params: VendorListParams = {}, token: string): Promise<PaginatedResponse<Product>> {
    return apiClient.get(`/vendor/products${buildQuery(params as Record<string, unknown>)}`, token);
  },

  getOrders(params: VendorListParams = {}, token: string): Promise<PaginatedResponse<Order>> {
    return apiClient.get(`/vendor/orders${buildQuery(params as Record<string, unknown>)}`, token);
  },

  updateOrderStatus(orderId: string, status: string, token: string): Promise<Order> {
    return apiClient.put(`/vendor/orders/${orderId}/status`, { status }, token);
  },

  getAnalytics(token: string): Promise<VendorAnalytics> {
    return apiClient.get('/vendor/analytics', token);
  },

  getCommissions(token: string): Promise<PaginatedResponse<VendorCommission>> {
    return apiClient.get('/vendor/commissions', token);
  },

  requestPayout(amount: number, token: string): Promise<ApiMessage> {
    return apiClient.post('/vendor/payout/request', { amount }, token);
  },

  createProduct(data: Partial<Product>, token: string): Promise<Product> {
    return apiClient.post('/vendor/products', data, token);
  },

  updateProduct(id: string, data: Partial<Product>, token: string): Promise<Product> {
    return apiClient.put(`/vendor/products/${id}`, data, token);
  },

  deleteProduct(id: string, token: string): Promise<ApiMessage> {
    return apiClient.delete(`/vendor/products/${id}`, token);
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN
// ─────────────────────────────────────────────────────────────────────────────

export interface AdminOverview {
  total_users: number;
  total_orders: number;
  total_revenue: number;
  active_products: number;
  pending_kyc: number;
  pending_approvals: number;
  fraud_alerts: number;
  revenue_today: number;
  orders_today: number;
  new_users_today: number;
  revenue_chart: { date: string; revenue: number; orders: number }[];
  top_koc: { id: string; name: string; earnings: number }[];
  recent_orders: Order[];
}

export interface KYCRecord {
  id: string;
  user_id: string;
  user_name: string;
  user_email: string;
  id_type: string;
  id_number: string;
  front_image_url: string;
  back_image_url: string;
  selfie_url?: string;
  status: 'pending' | 'approved' | 'rejected';
  rejection_reason?: string;
  submitted_at: string;
  reviewed_at?: string;
  reviewed_by?: string;
}

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: 'user' | 'koc' | 'vendor' | 'admin';
  avatar?: string;
  phone?: string;
  status: 'active' | 'suspended' | 'banned';
  kyc_status: 'none' | 'pending' | 'approved' | 'rejected';
  total_orders: number;
  total_spent: number;
  referral_code?: string;
  created_at: string;
  last_login?: string;
}

export interface FraudAlert {
  id: string;
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  user_id?: string;
  order_id?: string;
  description: string;
  details: Record<string, unknown>;
  status: 'open' | 'investigating' | 'resolved' | 'false_positive';
  created_at: string;
  resolved_at?: string;
}

export interface AdminAnalytics {
  revenue: { daily: { date: string; amount: number }[]; monthly: { month: string; amount: number }[] };
  orders: { by_status: Record<string, number>; by_payment: Record<string, number> };
  users: { total: number; by_role: Record<string, number>; growth: { date: string; count: number }[] };
  products: { total: number; by_category: Record<string, number>; dpp_enabled: number };
  commissions: { total_paid: number; total_pending: number };
}

export interface AdminListParams {
  page?: number;
  per_page?: number;
  status?: string;
  search?: string;
  role?: string;
  from_date?: string;
  to_date?: string;
}

export const adminApi = {
  getOverview(token: string): Promise<AdminOverview> {
    return apiClient.get('/admin/overview', token);
  },

  // KYC
  getKYCList(params: AdminListParams = {}, token: string): Promise<PaginatedResponse<KYCRecord>> {
    return apiClient.get(`/admin/kyc${buildQuery(params as Record<string, unknown>)}`, token);
  },

  getKYCById(id: string, token: string): Promise<KYCRecord> {
    return apiClient.get(`/admin/kyc/${id}`, token);
  },

  approveKYC(userId: string, token: string): Promise<ApiMessage> {
    return apiClient.post(`/admin/kyc/${userId}/approve`, {}, token);
  },

  rejectKYC(userId: string, reason: string, token: string): Promise<ApiMessage> {
    return apiClient.post(`/admin/kyc/${userId}/reject`, { reason }, token);
  },

  // Users
  getUsers(params: AdminListParams = {}, token: string): Promise<PaginatedResponse<AdminUser>> {
    return apiClient.get(`/admin/users${buildQuery(params as Record<string, unknown>)}`, token);
  },

  getUserById(id: string, token: string): Promise<AdminUser> {
    return apiClient.get(`/admin/users/${id}`, token);
  },

  updateUserStatus(userId: string, status: 'active' | 'suspended' | 'banned', token: string): Promise<ApiMessage> {
    return apiClient.put(`/admin/users/${userId}/status`, { status }, token);
  },

  updateUserRole(userId: string, role: string, token: string): Promise<ApiMessage> {
    return apiClient.put(`/admin/users/${userId}/role`, { role }, token);
  },

  // Orders
  getOrders(params: AdminListParams = {}, token: string): Promise<PaginatedResponse<Order>> {
    return apiClient.get(`/admin/orders${buildQuery(params as Record<string, unknown>)}`, token);
  },

  getOrderById(id: string, token: string): Promise<Order> {
    return apiClient.get(`/admin/orders/${id}`, token);
  },

  updateOrderStatus(orderId: string, status: string, token: string): Promise<Order> {
    return apiClient.put(`/admin/orders/${orderId}/status`, { status }, token);
  },

  // Products
  getProducts(params: AdminListParams = {}, token: string): Promise<PaginatedResponse<Product>> {
    return apiClient.get(`/admin/products${buildQuery(params as Record<string, unknown>)}`, token);
  },

  approveProduct(productId: string, token: string): Promise<ApiMessage> {
    return apiClient.post(`/admin/products/${productId}/approve`, {}, token);
  },

  rejectProduct(productId: string, reason: string, token: string): Promise<ApiMessage> {
    return apiClient.post(`/admin/products/${productId}/reject`, { reason }, token);
  },

  // Fraud
  getFraudAlerts(token: string): Promise<PaginatedResponse<FraudAlert>> {
    return apiClient.get('/admin/fraud-alerts', token);
  },

  updateFraudAlert(id: string, status: string, token: string): Promise<FraudAlert> {
    return apiClient.put(`/admin/fraud-alerts/${id}`, { status }, token);
  },

  // Analytics
  getAnalytics(token: string): Promise<AdminAnalytics> {
    return apiClient.get('/admin/analytics', token);
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// GAMIFICATION
// ─────────────────────────────────────────────────────────────────────────────

export interface GamificationProfile {
  user_id: string;
  level: number;
  xp: number;
  xp_to_next_level: number;
  rank: string;
  rank_icon?: string;
  badges: Badge[];
  missions_completed: number;
  streak_days: number;
  total_points: number;
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  earned_at: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
}

export interface Mission {
  id: string;
  title: string;
  description: string;
  type: 'daily' | 'weekly' | 'special' | 'permanent';
  category: string;
  xp_reward: number;
  points_reward: number;
  token_reward?: number;
  badge_reward?: Badge;
  target: number;
  progress: number;
  completed: boolean;
  claimed: boolean;
  expires_at?: string;
  started_at?: string;
  completed_at?: string;
}

export interface LeaderboardEntry {
  rank: number;
  user_id: string;
  display_name: string;
  avatar?: string;
  score: number;
  level: number;
  rank_title: string;
}

export const gamificationApi = {
  getProfile(token: string): Promise<GamificationProfile> {
    return apiClient.get('/gamification/profile', token);
  },

  getMissions(token: string): Promise<{ daily: Mission[]; weekly: Mission[]; special: Mission[]; permanent: Mission[] }> {
    return apiClient.get('/gamification/missions', token);
  },

  getLeaderboard(type: string = 'global'): Promise<{ entries: LeaderboardEntry[]; period: string }> {
    return apiClient.get(`/gamification/leaderboard${buildQuery({ type })}`);
  },

  claimMission(missionId: string, token: string): Promise<{ xp_gained: number; points_gained: number; badge?: Badge; message: string }> {
    return apiClient.post(`/gamification/missions/${missionId}/claim`, {}, token);
  },

  getMyLeaderboardRank(token: string): Promise<LeaderboardEntry & { total_players: number }> {
    return apiClient.get('/gamification/leaderboard/me', token);
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// DPP (Digital Product Passport)
// ─────────────────────────────────────────────────────────────────────────────

export interface DPPRecord {
  token_id: string;
  product_id: string;
  product_name: string;
  brand: string;
  origin: string;
  chain: string;
  contract_address: string;
  metadata_uri: string;
  certifications: DPPCertification[];
  supply_chain: SupplyChainStep[];
  ingredients?: string[];
  manufacturing_date?: string;
  expiry_date?: string;
  batch_number?: string;
  qr_code_url?: string;
  scan_count: number;
  minted_at: string;
  last_updated: string;
  verified: boolean;
}

export interface DPPCertification {
  name: string;
  issuer: string;
  issued_at: string;
  expires_at?: string;
  certificate_url?: string;
  verified: boolean;
}

export interface SupplyChainStep {
  stage: string;
  location: string;
  actor: string;
  timestamp: string;
  description: string;
  tx_hash?: string;
  verified: boolean;
}

export interface DPPScanResult {
  token_id: string;
  product: Product;
  dpp: DPPRecord;
  authentic: boolean;
  scan_id: string;
  scanned_at: string;
  xp_awarded?: number;
}

export const dppApi = {
  getByProduct(productId: string): Promise<DPPRecord> {
    return apiClient.get(`/dpp/product/${productId}`);
  },

  getByTokenId(tokenId: string): Promise<DPPRecord> {
    return apiClient.get(`/dpp/token/${tokenId}`);
  },

  verify(tokenId: string): Promise<{ token_id: string; authentic: boolean; details: DPPRecord }> {
    return apiClient.get(`/dpp/verify/${tokenId}`);
  },

  scan(tokenId: string, token?: string): Promise<DPPScanResult> {
    return apiClient.post(`/dpp/scan`, { token_id: tokenId }, token);
  },

  getScanHistory(productId: string, token: string): Promise<{ scans: { timestamp: string; location?: string }[] }> {
    return apiClient.get(`/dpp/product/${productId}/scans`, token);
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// REVIEWS
// ─────────────────────────────────────────────────────────────────────────────

export interface Review {
  id: string;
  product_id: string;
  order_id: string;
  user_id: string;
  user_name: string;
  user_avatar?: string;
  rating: number;
  title?: string;
  comment: string;
  images?: string[];
  helpful_count: number;
  verified_purchase: boolean;
  reply?: { content: string; created_at: string };
  created_at: string;
  updated_at: string;
}

export interface CreateReviewInput {
  product_id: string;
  order_id: string;
  rating: number;
  title?: string;
  comment: string;
  images?: string[];
}

export interface ReviewSummary {
  average_rating: number;
  total_reviews: number;
  rating_distribution: Record<string, number>;
}

export const reviewsApi = {
  getByProduct(
    productId: string,
    params: { page?: number; per_page?: number; sort?: string; rating?: number } = {},
  ): Promise<PaginatedResponse<Review> & { summary: ReviewSummary }> {
    return apiClient.get(`/products/${productId}/reviews${buildQuery(params as Record<string, unknown>)}`);
  },

  create(data: CreateReviewInput, token: string): Promise<Review> {
    return apiClient.post('/reviews', data, token);
  },

  markHelpful(reviewId: string, token: string): Promise<ApiMessage> {
    return apiClient.post(`/reviews/${reviewId}/helpful`, {}, token);
  },

  update(reviewId: string, data: Partial<CreateReviewInput>, token: string): Promise<Review> {
    return apiClient.put(`/reviews/${reviewId}`, data, token);
  },

  delete(reviewId: string, token: string): Promise<ApiMessage> {
    return apiClient.delete(`/reviews/${reviewId}`, token);
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// COMMISSIONS (buyer dashboard)
// ─────────────────────────────────────────────────────────────────────────────

export interface BuyerCommission {
  id: string;
  type: 'referral' | 'cashback' | 'bonus';
  source: string;
  amount: number;
  currency: string;
  status: 'pending' | 'approved' | 'paid' | 'expired';
  order_id?: string;
  product_name?: string;
  created_at: string;
  paid_at?: string;
}

export interface CommissionSummary {
  total_earned: number;
  total_pending: number;
  total_paid: number;
  this_month: number;
  last_month: number;
  available_for_withdrawal: number;
}

export interface CommissionListParams {
  page?: number;
  per_page?: number;
  status?: string;
  type?: string;
  from_date?: string;
  to_date?: string;
}

export const commissionsApi = {
  list(params: CommissionListParams = {}, token: string): Promise<PaginatedResponse<BuyerCommission>> {
    return apiClient.get(`/commissions${buildQuery(params as Record<string, unknown>)}`, token);
  },

  getSummary(token: string): Promise<CommissionSummary> {
    return apiClient.get('/commissions/summary', token);
  },

  getPending(token: string): Promise<BuyerCommission[]> {
    return apiClient.get('/commissions/pending', token);
  },

  requestWithdrawal(amount: number, method: string, token: string): Promise<ApiMessage> {
    return apiClient.post('/commissions/withdraw', { amount, method }, token);
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// POOLS
// ─────────────────────────────────────────────────────────────────────────────

export interface PoolRanking {
  pool_id: string;
  pool_name: string;
  pool_type: 'weekly' | 'monthly' | 'season';
  rank: number;
  user_id: string;
  display_name: string;
  avatar?: string;
  score: number;
  reward_amount: number;
  reward_token: string;
  period_start: string;
  period_end: string;
}

export interface MyPoolRanking {
  pool_id: string;
  pool_name: string;
  rank: number;
  total_participants: number;
  score: number;
  score_to_next_rank: number;
  estimated_reward: number;
  reward_token: string;
  period_end: string;
}

export const poolsApi = {
  getRankings(token: string): Promise<{ pools: { id: string; name: string; type: string; entries: PoolRanking[] }[] }> {
    return apiClient.get('/pools/rankings', token);
  },

  getMyRanking(token: string): Promise<MyPoolRanking[]> {
    return apiClient.get('/pools/rankings/me', token);
  },

  getPoolById(poolId: string, token: string): Promise<{ id: string; name: string; entries: PoolRanking[]; total_prize: number; reward_token: string }> {
    return apiClient.get(`/pools/${poolId}`, token);
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// AUTH (supplementary — registration/profile update via backend)
// ─────────────────────────────────────────────────────────────────────────────

export interface BackendUser {
  id: string;
  email: string;
  name: string;
  role: 'user' | 'koc' | 'vendor' | 'admin';
  avatar?: string;
  phone?: string;
  referral_code?: string;
  kyc_status: 'none' | 'pending' | 'approved' | 'rejected';
  created_at: string;
}

export interface UpdateProfileInput {
  name?: string;
  phone?: string;
  avatar?: string;
}

export const authApi = {
  /** Sync user profile with backend after Supabase login. */
  syncProfile(token: string): Promise<BackendUser> {
    return apiClient.post('/auth/sync', {}, token);
  },

  getProfile(token: string): Promise<BackendUser> {
    return apiClient.get('/auth/profile', token);
  },

  updateProfile(data: UpdateProfileInput, token: string): Promise<BackendUser> {
    return apiClient.put('/auth/profile', data, token);
  },

  /** Submit KYC documents for verification. */
  submitKYC(
    data: { id_type: string; id_number: string; front_image_url: string; back_image_url: string; selfie_url?: string },
    token: string,
  ): Promise<ApiMessage> {
    return apiClient.post('/auth/kyc', data, token);
  },

  connectWallet(wallet_address: string, signature: string, message: string, token: string): Promise<BackendUser> {
    return apiClient.post('/auth/wallet/link', { wallet_address, signature, message }, token);
  },

  /** Request referral code assignment (e.g. if first-time user was referred). */
  applyReferralCode(code: string, token: string): Promise<ApiMessage> {
    return apiClient.post('/auth/referral/apply', { code }, token);
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// NOTIFICATIONS
// ─────────────────────────────────────────────────────────────────────────────

export interface Notification {
  id: string;
  type: string;
  title: string;
  body: string;
  read: boolean;
  action_url?: string;
  metadata?: Record<string, unknown>;
  created_at: string;
}

export const notificationsApi = {
  list(params: { page?: number; unread_only?: boolean } = {}, token: string): Promise<PaginatedResponse<Notification>> {
    return apiClient.get(`/notifications${buildQuery(params as Record<string, unknown>)}`, token);
  },

  markRead(id: string, token: string): Promise<ApiMessage> {
    return apiClient.put(`/notifications/${id}/read`, {}, token);
  },

  markAllRead(token: string): Promise<ApiMessage> {
    return apiClient.put('/notifications/read-all', {}, token);
  },

  getUnreadCount(token: string): Promise<{ count: number }> {
    return apiClient.get('/notifications/unread-count', token);
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// SOCIAL (follow / unfollow / followers)
// ─────────────────────────────────────────────────────────────────────────────

export const socialApi = {
  follow(userId: string, token: string): Promise<ApiMessage> {
    return apiClient.post(`/social/follow/${userId}`, {}, token);
  },

  unfollow(userId: string, token: string): Promise<ApiMessage> {
    return apiClient.delete(`/social/follow/${userId}`, token);
  },

  getFollowers(userId: string, token?: string): Promise<{ followers: { id: string; name: string; avatar?: string }[]; count: number }> {
    return apiClient.get(`/social/followers/${userId}`, token);
  },

  getFollowing(userId: string, token: string): Promise<{ following: { id: string; name: string; avatar?: string }[]; count: number }> {
    return apiClient.get(`/social/following/${userId}`, token);
  },

  isFollowing(userId: string, token: string): Promise<{ following: boolean }> {
    return apiClient.get(`/social/following/${userId}/check`, token);
  },
};
