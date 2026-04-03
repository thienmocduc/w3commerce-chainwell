import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useI18n } from '@hooks/useI18n';
import { useAuth } from '@hooks/useAuth';
import { cartApi } from '../lib/api';

interface CartItem {
  id: string;
  productId: string;
  name: string;
  price: number;
  quantity: number;
  dpp: boolean;
  gradient: string;
  imageUrl?: string;
  xpPerUnit: number;
}

const formatVND = (price: number): string =>
  new Intl.NumberFormat('vi-VN').format(price) + ' ₫';

function CartSkeleton() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="card" style={{ padding: '18px 20px' }}>
          <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
            <div style={{
              width: 80, height: 80, borderRadius: 14, flexShrink: 0,
              background: 'linear-gradient(90deg, var(--bg-2) 25%, var(--bg-1) 50%, var(--bg-2) 75%)',
              backgroundSize: '200% 100%',
              animation: 'shimmer 1.5s infinite',
            }} />
            <div style={{ flex: 1 }}>
              <div style={{ height: 14, borderRadius: 4, background: 'var(--bg-2)', marginBottom: 8, width: '70%' }} />
              <div style={{ height: 12, borderRadius: 4, background: 'var(--bg-2)', marginBottom: 12, width: '40%' }} />
              <div style={{ height: 32, borderRadius: 8, background: 'var(--bg-2)', width: '45%' }} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function Cart() {
  const { t } = useI18n();
  const { token, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const [items, setItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const [coupon, setCoupon] = useState('');
  const [couponApplied, setCouponApplied] = useState(false);
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [couponLoading, setCouponLoading] = useState(false);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isAuthenticated && !loading) {
      navigate('/login', { replace: true });
    }
  }, [isAuthenticated, loading, navigate]);

  const fetchCart = useCallback(async () => {
    if (!isAuthenticated) return;
    setLoading(true);
    setError(null);
    try {
      const data = await cartApi.get(token!);
      const GRADIENTS = [
        'linear-gradient(135deg, var(--c4-500), var(--c5-500))',
        'linear-gradient(135deg, var(--c5-500), var(--c6-500))',
        'linear-gradient(135deg, var(--c6-500), var(--c7-500))',
        'linear-gradient(135deg, var(--c7-500), var(--c4-500))',
      ];
      setItems((data.items || []).map((item: any, idx: number) => ({
        id: item.id,
        productId: item.product_id,
        name: item.product_name,
        price: item.unit_price,
        quantity: item.quantity,
        dpp: item.dpp_enabled,
        gradient: GRADIENTS[idx % GRADIENTS.length],
        imageUrl: item.product_image,
        xpPerUnit: item.xp_reward ?? 10,
      })));
    } catch (err: any) {
      if (err.status === 401) {
        navigate('/login', { replace: true });
      } else {
        setError(err.message || 'Không thể tải giỏ hàng');
      }
    } finally {
      setLoading(false);
    }
  }, [token, isAuthenticated, navigate]);

  useEffect(() => {
    fetchCart();
  }, [fetchCart]);

  const updateQty = async (item: CartItem, delta: number) => {
    const newQty = Math.max(1, item.quantity + delta);
    if (newQty === item.quantity) return;
    setUpdatingId(item.id);
    // Optimistic update
    setItems(prev => prev.map(i => i.id === item.id ? { ...i, quantity: newQty } : i));
    try {
      await cartApi.updateItem(item.id, newQty, token!);
    } catch (err: any) {
      // Revert on failure
      setItems(prev => prev.map(i => i.id === item.id ? { ...i, quantity: item.quantity } : i));
      toast.error(err.message || 'Không thể cập nhật số lượng');
    } finally {
      setUpdatingId(null);
    }
  };

  const removeItem = async (item: CartItem) => {
    setUpdatingId(item.id);
    // Optimistic remove
    setItems(prev => prev.filter(i => i.id !== item.id));
    try {
      await cartApi.removeItem(item.id, token ?? undefined);
      toast.success(`Đã xoá "${item.name}" khỏi giỏ hàng`);
    } catch (err: any) {
      // Revert on failure
      setItems(prev => [...prev, item].sort((a, b) => a.id.localeCompare(b.id)));
      toast.error(err.message || 'Không thể xoá sản phẩm');
    } finally {
      setUpdatingId(null);
    }
  };

  const clearCart = async () => {
    const snapshot = [...items];
    setItems([]);
    try {
      await cartApi.clear(token ?? undefined);
      toast.success('Đã xoá toàn bộ giỏ hàng');
    } catch (err: any) {
      setItems(snapshot);
      toast.error(err.message || 'Không thể xoá giỏ hàng');
    }
  };

  const applyCoupon = async () => {
    if (!coupon.trim()) return;
    setCouponLoading(true);
    try {
      const result = await cartApi.applyCoupon(coupon.trim(), token ?? undefined);
      setCouponApplied(true);
      setCouponDiscount(result.discount || 0);
      toast.success(`Mã giảm giá đã được áp dụng: -${formatVND(result.discount || 0)}`);
    } catch (err: any) {
      setCouponApplied(false);
      setCouponDiscount(0);
      toast.error(err.message || 'Mã giảm giá không hợp lệ');
    } finally {
      setCouponLoading(false);
    }
  };

  const totalItems = items.reduce((s, i) => s + i.quantity, 0);
  const subtotal = items.reduce((s, i) => s + i.price * i.quantity, 0);
  const shipping = subtotal >= 500000 ? 0 : 30000;
  const totalXP = items.reduce((s, i) => s + (i.xpPerUnit || 10) * i.quantity, 0);
  const total = subtotal + shipping - couponDiscount;

  // XP level calculation
  const currentXP = 120;
  const xpAfter = currentXP + totalXP;
  const xpForNextLevel = 200;
  const progressPercent = Math.min((xpAfter / xpForNextLevel) * 100, 100);

  if (loading) {
    return (
      <div style={{ paddingTop: 'var(--topbar-height, 64px)', minHeight: '100vh', background: 'var(--bg-0)' }}>
        <style>{`
          @keyframes shimmer {
            0% { background-position: 200% 0; }
            100% { background-position: -200% 0; }
          }
        `}</style>
        <div className="container" style={{ paddingTop: 32, paddingBottom: 80 }}>
          <div className="section-badge">🛒 {t('cart.badge')}</div>
          <h1 className="display-md" style={{ marginBottom: 28 }}>{t('cart.title')}</h1>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 28 }}>
            <CartSkeleton />
            <div className="card" style={{ padding: 24, height: 400,
              background: 'linear-gradient(90deg, var(--bg-2) 25%, var(--bg-1) 50%, var(--bg-2) 75%)',
              backgroundSize: '200% 100%',
              animation: 'shimmer 1.5s infinite',
            }} />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ paddingTop: 'var(--topbar-height, 64px)', minHeight: '100vh', background: 'var(--bg-0)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="card" style={{ padding: 48, textAlign: 'center', maxWidth: 440 }}>
          <div style={{ fontSize: '3rem', marginBottom: 16 }}>⚠️</div>
          <h2 className="display-md" style={{ marginBottom: 8 }}>Lỗi tải giỏ hàng</h2>
          <p style={{ color: 'var(--text-3)', fontSize: '.88rem', marginBottom: 24 }}>{error}</p>
          <button className="btn btn-primary" onClick={fetchCart} style={{ padding: '12px 32px' }}>
            Thử lại
          </button>
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div style={{
        paddingTop: 'var(--topbar-height, 64px)', minHeight: '100vh',
        background: 'var(--bg-0)', display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <div className="card" style={{ padding: 60, textAlign: 'center', maxWidth: 440 }}>
          <div style={{ fontSize: '4rem', marginBottom: 16, opacity: 0.6 }}>🛒</div>
          <h2 className="display-md" style={{ marginBottom: 8 }}>{t('cart.empty.title')}</h2>
          <p style={{ color: 'var(--text-3)', fontSize: '.88rem', marginBottom: 24, lineHeight: 1.6 }}>
            {t('cart.empty.desc')}
            <br />
            {t('cart.empty.explore')}
          </p>
          <Link to="/marketplace" className="btn btn-primary btn-lg" style={{ textDecoration: 'none', padding: '12px 32px' }}>
            {t('cart.empty.cta')}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div style={{ paddingTop: 'var(--topbar-height, 64px)', minHeight: '100vh', background: 'var(--bg-0)' }}>
      <div className="container" style={{ paddingTop: 32, paddingBottom: 80 }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
          <div className="section-badge">🛒 {t('cart.badge')}</div>
          <button
            onClick={clearCart}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--text-4)', fontSize: '.75rem',
              fontFamily: 'var(--ff-body, system-ui)',
              transition: 'color .2s',
            }}
          >
            {t('cart.clearAll') || 'Xoá tất cả'}
          </button>
        </div>
        <h1 className="display-md" style={{ marginBottom: 4 }}>{t('cart.title')}</h1>
        <p style={{ color: 'var(--text-3)', fontSize: '.85rem', marginBottom: 28 }}>
          {totalItems} {t('cart.itemCount')}
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 28 }}>
          {/* Left: Cart Items */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {/* Free shipping banner */}
            {subtotal < 500000 && (
              <div className="card" style={{
                padding: '10px 16px', background: 'rgba(34,197,94,.08)',
                border: '1px solid rgba(34,197,94,.2)',
              }}>
                <div style={{ fontSize: '.78rem', color: 'var(--c4-500, #22c55e)', fontWeight: 600 }}>
                  🚚 {t('cart.freeShipping.prefix')} {formatVND(500000 - subtotal)} {t('cart.freeShipping')}
                </div>
                <div className="progress-track" style={{ marginTop: 6, height: 4 }}>
                  <div className="progress-bar" style={{
                    width: `${(subtotal / 500000) * 100}%`,
                    height: '100%', borderRadius: 2,
                    background: 'var(--c4-500, #22c55e)',
                    transition: 'width .3s',
                  }} />
                </div>
              </div>
            )}

            {items.map(item => (
              <div
                key={item.id}
                className="card"
                style={{ padding: '18px 20px', opacity: updatingId === item.id ? 0.6 : 1, transition: 'opacity .2s' }}
              >
                <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                  {/* Product Image */}
                  <div style={{
                    width: 80, height: 80, borderRadius: 14, flexShrink: 0,
                    background: item.gradient || 'linear-gradient(135deg, #1e3a5f, #1e293b)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    overflow: 'hidden',
                  }}>
                    {item.imageUrl ? (
                      <img src={item.imageUrl} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <div style={{
                        width: 36, height: 36, borderRadius: '50%',
                        background: 'rgba(255,255,255,.25)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '.6rem', color: '#fff', fontWeight: 700,
                      }}>
                        IMG
                      </div>
                    )}
                  </div>

                  {/* Product Details */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', gap: 6, marginBottom: 4 }}>
                      {item.dpp && (
                        <span className="badge badge-c4" style={{ fontSize: '.55rem' }}>DPP ✓</span>
                      )}
                    </div>
                    <h3 style={{ fontWeight: 700, fontSize: '.88rem', marginBottom: 4 }}>{item.name}</h3>
                    <div style={{ fontSize: '.75rem', color: 'var(--text-3)' }}>
                      {t('cart.unitPrice')} {formatVND(item.price)}
                    </div>

                    {/* Quantity + Subtotal row */}
                    <div style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      marginTop: 12,
                    }}>
                      {/* Quantity controls */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <button
                          className="btn btn-secondary"
                          onClick={() => updateQty(item, -1)}
                          disabled={updatingId === item.id || item.quantity <= 1}
                          style={{
                            width: 32, height: 32, padding: 0,
                            fontSize: '1rem', borderRadius: 8,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                          }}
                        >
                          −
                        </button>
                        <span style={{
                          fontFamily: 'var(--ff-display, system-ui)', fontWeight: 700,
                          fontSize: '.92rem', minWidth: 36, textAlign: 'center',
                        }}>
                          {item.quantity}
                        </span>
                        <button
                          className="btn btn-secondary"
                          onClick={() => updateQty(item, 1)}
                          disabled={updatingId === item.id}
                          style={{
                            width: 32, height: 32, padding: 0,
                            fontSize: '1rem', borderRadius: 8,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                          }}
                        >
                          +
                        </button>
                      </div>

                      {/* Subtotal */}
                      <div style={{ textAlign: 'right' }}>
                        <div style={{
                          fontFamily: 'var(--ff-display, system-ui)', fontWeight: 800,
                          fontSize: '1rem',
                        }}>
                          {formatVND(item.price * item.quantity)}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Remove button */}
                  <button
                    onClick={() => removeItem(item)}
                    disabled={updatingId === item.id}
                    style={{
                      background: 'none', border: 'none', cursor: 'pointer',
                      color: 'var(--text-4)', fontSize: '.88rem', padding: 4,
                      fontFamily: 'var(--ff-body, system-ui)',
                      opacity: 0.6, transition: 'opacity .2s',
                    }}
                    title={t('cart.removeItem')}
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}

            {/* Continue shopping */}
            <Link to="/marketplace" style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              color: 'var(--c6-300, #06b6d4)', textDecoration: 'none',
              fontSize: '.82rem', fontWeight: 600, marginTop: 4,
            }}>
              ← {t('cart.continueShopping')}
            </Link>
          </div>

          {/* Right: Order Summary */}
          <div style={{ position: 'sticky', top: 'calc(var(--topbar-height, 64px) + 32px)', alignSelf: 'start' }}>
            <div className="card" style={{ padding: 24 }}>
              <div style={{
                fontSize: '.72rem', fontWeight: 700, color: 'var(--text-3)',
                textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 20,
              }}>
                {t('cart.summary')}
              </div>

              {/* Line items */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '.82rem' }}>
                  <span style={{ color: 'var(--text-3)' }}>{t('cart.subtotal')} ({totalItems} {t('marketplace.productCount')})</span>
                  <span style={{ fontWeight: 600 }}>{formatVND(subtotal)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '.82rem' }}>
                  <span style={{ color: 'var(--text-3)' }}>{t('cart.shipping')}</span>
                  <span style={{
                    fontWeight: 600,
                    color: shipping === 0 ? 'var(--c4-500, #22c55e)' : 'var(--text-1)',
                  }}>
                    {shipping === 0 ? t('cart.shipping.free') : formatVND(shipping)}
                  </span>
                </div>
                {couponApplied && couponDiscount > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '.82rem' }}>
                    <span style={{ color: 'var(--c4-500, #22c55e)' }}>{t('cart.coupon')}</span>
                    <span style={{ fontWeight: 600, color: 'var(--c4-500, #22c55e)' }}>
                      -{formatVND(couponDiscount)}
                    </span>
                  </div>
                )}
              </div>

              {/* Coupon */}
              <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                <input
                  type="text"
                  className="input-field"
                  placeholder={t('cart.coupon')}
                  value={coupon}
                  onChange={e => setCoupon(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && applyCoupon()}
                  style={{
                    flex: 1, padding: '8px 12px', fontSize: '.78rem',
                    borderRadius: 8,
                  }}
                />
                <button
                  className="btn btn-secondary"
                  onClick={applyCoupon}
                  disabled={couponLoading || !coupon.trim()}
                  style={{ padding: '8px 14px', fontSize: '.78rem', whiteSpace: 'nowrap' }}
                >
                  {couponLoading ? '...' : t('cart.coupon.apply')}
                </button>
              </div>
              {couponApplied && (
                <div style={{
                  fontSize: '.72rem', color: 'var(--c4-500, #22c55e)',
                  marginBottom: 12, marginTop: -8,
                }}>
                  ✓ {t('cart.coupon.applied')}
                </div>
              )}

              {/* Divider */}
              <div style={{ height: 1, background: 'var(--border)', margin: '4px 0 16px' }} />

              {/* Total */}
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
                <span style={{ fontWeight: 700, fontSize: '.95rem' }}>{t('cart.total')}</span>
                <span style={{
                  fontFamily: 'var(--ff-display, system-ui)', fontWeight: 800,
                  fontSize: '1.3rem', color: 'var(--c6-300, #06b6d4)',
                  whiteSpace: 'nowrap',
                }}>
                  {formatVND(total)}
                </span>
              </div>

              {/* XP Reward Preview */}
              <div className="card" style={{
                padding: '14px 16px', background: 'var(--bg-2)', marginBottom: 20,
              }}>
                <div style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  marginBottom: 8,
                }}>
                  <span style={{ fontSize: '.78rem', color: 'var(--text-3)', fontWeight: 600 }}>
                    🎮 {t('cart.xpEarned')}
                  </span>
                  <span className="badge badge-gold" style={{ fontSize: '.72rem', whiteSpace: 'nowrap' }}>
                    +{totalXP} XP
                  </span>
                </div>
                <div style={{ fontSize: '.68rem', color: 'var(--text-4)', marginBottom: 8 }}>
                  +{totalXP} XP ({totalItems} {t('marketplace.productCount')} x 10 XP)
                </div>

                {/* Level Progress Bar */}
                <div style={{
                  display: 'flex', justifyContent: 'space-between',
                  fontSize: '.62rem', color: 'var(--text-4)', marginBottom: 4,
                }}>
                  <span>Level 2</span>
                  <span>{xpAfter}/{xpForNextLevel} XP</span>
                </div>
                <div className="progress-track" style={{ height: 6, borderRadius: 3 }}>
                  <div className="progress-bar" style={{
                    width: `${progressPercent}%`, height: '100%', borderRadius: 3,
                    background: 'linear-gradient(90deg, var(--c6-500, #06b6d4), var(--c7-500, #6366f1))',
                    transition: 'width .5s',
                  }} />
                </div>
                {xpAfter >= xpForNextLevel && (
                  <div style={{ fontSize: '.65rem', color: 'var(--c4-500, #22c55e)', marginTop: 4, fontWeight: 600 }}>
                    🎉 {t('cart.xpLevelUp')}
                  </div>
                )}
              </div>

              {/* Checkout Button */}
              <Link
                to="/checkout"
                className="btn btn-primary btn-lg"
                style={{
                  width: '100%', textDecoration: 'none',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  padding: '14px 24px', fontSize: '.92rem',
                }}
              >
                {t('cart.checkout')}
              </Link>

              {/* Trust badges */}
              <div style={{
                display: 'flex', gap: 6, justifyContent: 'center', marginTop: 14,
                flexWrap: 'wrap',
              }}>
                <span className="badge badge-c4" style={{ fontSize: '.6rem', whiteSpace: 'nowrap' }}>DPP Verified</span>
                <span className="badge badge-c5" style={{ fontSize: '.6rem', whiteSpace: 'nowrap' }}>{t('cart.sslSecure')}</span>
                <span className="badge badge-c7" style={{ fontSize: '.6rem', whiteSpace: 'nowrap' }}>Web3 Ready</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
