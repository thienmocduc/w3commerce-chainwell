import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useI18n } from '@hooks/useI18n';
import { useAuth } from '@hooks/useAuth';
import { productsApi, cartApi, type Product } from '@lib/api';

const formatVND = (price: number): string =>
  new Intl.NumberFormat('vi-VN').format(price) + ' \u20AB';

// Gradient palette for products without images
const GRADIENTS = [
  'linear-gradient(135deg, #fbbf24, #f59e0b)',
  'linear-gradient(135deg, #84cc16, #22c55e)',
  'linear-gradient(135deg, #06b6d4, #6366f1)',
  'linear-gradient(135deg, #f59e0b, #d97706)',
];
function getGradients(id: string): string[] {
  const base = GRADIENTS[id.charCodeAt(0) % GRADIENTS.length];
  return [base, GRADIENTS[(id.charCodeAt(0) + 1) % GRADIENTS.length], GRADIENTS[(id.charCodeAt(0) + 2) % GRADIENTS.length], GRADIENTS[(id.charCodeAt(0) + 3) % GRADIENTS.length]];
}

interface KocReview {
  id: number;
  author: string;
  avatar: string;
  rating: number;
  date: string;
  content: string;
  verified: boolean;
  purchaseBadge: boolean;
  kocLevel: string;
}

const kocReviews: KocReview[] = [
  { id: 1, author: 'Linh Nguyen', avatar: 'LN', rating: 5, date: '2026-03-20', content: 'Sản phẩm chất lượng tuyệt vời! Đã dùng 2 tháng và thấy hiệu quả rõ rệt. Nguồn gốc minh\u00A0bạch trên blockchain, rất yên tâm.', verified: true, purchaseBadge: true, kocLevel: 'Gold KOC' },
  { id: 2, author: 'Minh Tran', avatar: 'MT', rating: 5, date: '2026-03-18', content: 'Đóng gói cẩn thận, giao hàng nhanh. DPP xác minh được toàn bộ chuỗi cung ứng, từ nguyên liệu đến sản xuất.', verified: true, purchaseBadge: true, kocLevel: 'Silver KOC' },
  { id: 3, author: 'Thu Ha', avatar: 'TH', rating: 4, date: '2026-03-15', content: 'Giá hợp lý so với chất lượng. Đã giới thiệu cho bạn bè và ai cũng hài lòng. Sẽ tiếp tục ủng hộ!', verified: true, purchaseBadge: true, kocLevel: 'Gold KOC' },
  { id: 4, author: 'Van Anh', avatar: 'VA', rating: 4, date: '2026-03-12', content: 'Sản phẩm tốt, đúng như mô tả. Ship hơi lâu nhưng chấp nhận được. Giá trị nhận được xứng đáng.', verified: false, purchaseBadge: false, kocLevel: '' },
];

type TabKey = 'description' | 'dpp' | 'reviews';

export default function ProductDetail() {
  const { t } = useI18n();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { token } = useAuth();
  const [quantity, setQuantity] = useState(1);
  const [activeTab, setActiveTab] = useState<TabKey>('description');
  const [selectedImage, setSelectedImage] = useState(0);
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [addingToCart, setAddingToCart] = useState(false);
  const [cartToast, setCartToast] = useState('');

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    // Try UUID lookup first, then slug
    const isUuid = /^[0-9a-f-]{36}$/.test(id);
    const fetch$ = isUuid ? productsApi.getById(id) : productsApi.getBySlug(id);
    fetch$
      .then(p => setProduct(p))
      .catch(() => {
        // Fallback: try the other lookup
        (isUuid ? productsApi.getBySlug(id) : productsApi.getById(id))
          .then(p => setProduct(p))
          .catch(() => setProduct(null));
      })
      .finally(() => setLoading(false));
  }, [id]);

  const handleAddToCart = async () => {
    if (!product) return;
    if (!token) { navigate('/login'); return; }
    setAddingToCart(true);
    try {
      await cartApi.addItem({ product_id: product.id, quantity }, token);
      setCartToast(t('product.addedToCart') || 'Đã thêm vào giỏ hàng!');
      setTimeout(() => setCartToast(''), 2500);
    } catch {
      setCartToast('Không thể thêm vào giỏ. Vui lòng thử lại.');
      setTimeout(() => setCartToast(''), 2500);
    } finally {
      setAddingToCart(false);
    }
  };

  if (loading) {
    return (
      <div style={{ paddingTop: 'var(--topbar-height, 64px)', minHeight: '100vh', background: 'var(--bg-0)' }}>
        <div className="container" style={{ paddingTop: 28, paddingBottom: 80 }}>
          <div style={{ height: 20, width: 300, borderRadius: 8, background: 'var(--bg-2)', marginBottom: 28, animation: 'pulse 1.5s ease-in-out infinite' }} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 40 }}>
            <div style={{ height: 400, borderRadius: 20, background: 'var(--bg-2)', animation: 'pulse 1.5s ease-in-out infinite' }} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {[80, 40, 120, 60, 48].map((h, i) => (
                <div key={i} style={{ height: h, borderRadius: 8, background: 'var(--bg-2)', animation: 'pulse 1.5s ease-in-out infinite' }} />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div style={{ paddingTop: 'var(--topbar-height, 64px)', minHeight: '100vh', background: 'var(--bg-0)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="card" style={{ padding: 48, textAlign: 'center', maxWidth: 400 }}>
          <div style={{ fontSize: '3rem', marginBottom: 16 }}>😕</div>
          <h2 style={{ marginBottom: 8 }}>Không tìm thấy sản phẩm</h2>
          <p style={{ color: 'var(--text-3)', fontSize: '.88rem', marginBottom: 24 }}>Sản phẩm không tồn tại hoặc đã bị xoá.</p>
          <Link to="/marketplace" className="btn btn-primary" style={{ textDecoration: 'none' }}>← Quay lại Marketplace</Link>
        </div>
      </div>
    );
  }

  const galleryGradients = getGradients(product.id);
  const discount = product.original_price
    ? Math.round((1 - product.price / product.original_price) * 100)
    : 0;

  const tabs: { key: TabKey; label: string }[] = [
    { key: 'description', label: t('product.tab.description') },
    { key: 'dpp', label: t('product.tab.dpp') },
    { key: 'reviews', label: `${t('product.tab.reviews')} (${product.review_count})` },
  ];

  return (
    <div style={{ paddingTop: 'var(--topbar-height, 64px)', minHeight: '100vh', background: 'var(--bg-0)' }}>
      {/* Cart toast */}
      {cartToast && (
        <div style={{
          position: 'fixed', top: 80, left: '50%', transform: 'translateX(-50%)',
          zIndex: 9999, padding: '10px 24px', borderRadius: 10,
          background: 'rgba(34,197,94,.15)', border: '1px solid rgba(34,197,94,.3)',
          color: '#15803d', fontSize: '.82rem', fontWeight: 600,
          backdropFilter: 'blur(8px)',
        }}>
          {cartToast}
        </div>
      )}
      <div className="container" style={{ paddingTop: 28, paddingBottom: 80 }}>
        {/* Breadcrumb */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          fontSize: '.75rem', color: 'var(--text-4)', marginBottom: 28,
        }}>
          <Link to="/" style={{ color: 'var(--text-4)', textDecoration: 'none' }}>{t('product.breadcrumb.home')}</Link>
          <span>/</span>
          <Link to="/marketplace" style={{ color: 'var(--text-4)', textDecoration: 'none' }}>Marketplace</Link>
          <span>/</span>
          <span style={{ color: 'var(--text-3)' }}>{product.category}</span>
          <span>/</span>
          <span style={{ color: 'var(--text-2)' }}>{product.name}</span>
        </div>

        {/* Product Header: Image Gallery + Info */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 40, marginBottom: 48 }}>
          {/* Left: Image Gallery */}
          <div>
            {/* Main Image */}
            <div style={{
              height: 400, borderRadius: 20, overflow: 'hidden',
              background: product.images?.[selectedImage]
                ? undefined
                : galleryGradients[selectedImage],
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              position: 'relative', marginBottom: 12,
            }}>
              {product.images?.[selectedImage] ? (
                <img
                  src={product.images[selectedImage]}
                  alt={product.name}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              ) : (
                <div style={{
                  width: 100, height: 100, borderRadius: '50%',
                  background: 'rgba(255,255,255,.2)', backdropFilter: 'blur(10px)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '1rem', color: '#fff', fontWeight: 700,
                }}>
                  IMG
                </div>
              )}
              {product.dpp_enabled && (
                <span className="badge badge-c4" style={{
                  position: 'absolute', top: 16, right: 16,
                  padding: '4px 10px', fontSize: '.68rem',
                  background: 'rgba(34,197,94,.9)', color: '#fff',
                }}>
                  DPP Verified ✓
                </span>
              )}
              {discount > 0 && (
                <span style={{
                  position: 'absolute', top: 16, left: 16,
                  padding: '4px 10px', borderRadius: 8,
                  background: 'rgba(239,68,68,.9)', color: '#fff',
                  fontSize: '.72rem', fontWeight: 700,
                }}>
                  -{discount}%
                </span>
              )}
            </div>

            {/* Thumbnail Row */}
            <div style={{ display: 'flex', gap: 8 }}>
              {(product.images?.length ? product.images : galleryGradients).map((src, i) => (
                <div
                  key={i}
                  onClick={() => setSelectedImage(i)}
                  style={{
                    width: 72, height: 72, borderRadius: 12, cursor: 'pointer',
                    background: product.images?.length ? undefined : src as string,
                    border: `2px solid ${selectedImage === i ? 'var(--c7-500, #6366f1)' : 'transparent'}`,
                    opacity: selectedImage === i ? 1 : 0.6,
                    transition: 'all .2s', overflow: 'hidden',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '.5rem', color: 'rgba(255,255,255,.6)',
                  }}
                >
                  {product.images?.length ? (
                    <img src={src as string} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : i + 1}
                </div>
              ))}
            </div>
          </div>

          {/* Right: Product Info */}
          <div>
            {/* Certifications */}
            <div style={{ display: 'flex', gap: 6, marginBottom: 10, flexWrap: 'wrap' }}>
              {product.certifications?.map(c => (
                <span key={c} className="badge badge-c4" style={{ fontSize: '.65rem' }}>{c}</span>
              ))}
            </div>

            {/* Name */}
            <h1 style={{
              fontFamily: 'var(--ff-display, system-ui)', fontWeight: 800,
              fontSize: '1.6rem', lineHeight: 1.3, marginBottom: 12,
            }}>
              {product.name}
            </h1>

            {/* Rating + Sold */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
              <span style={{ fontSize: '.85rem', color: 'var(--gold-400, #f59e0b)' }}>
                {'★'.repeat(Math.floor(product.rating))} <span style={{ color: 'var(--text-2)', fontWeight: 600 }}>{product.rating}</span>
              </span>
              <span style={{ fontSize: '.82rem', color: 'var(--text-3)' }}>
                {product.review_count} {t('product.reviews')}
              </span>
              <span style={{ fontSize: '.82rem', color: 'var(--text-3)' }}>
                {t('product.sold')} {product.sold_count?.toLocaleString('vi-VN')}
              </span>
            </div>

            {/* Price */}
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 24 }}>
              <span style={{
                fontFamily: 'var(--ff-display, system-ui)', fontWeight: 800,
                fontSize: '2rem', color: 'var(--c6-300, #06b6d4)',
                whiteSpace: 'nowrap',
              }}>
                {formatVND(product.price)}
              </span>
              {product.original_price && (
                <span style={{
                  fontSize: '1rem', color: 'var(--text-4)',
                  textDecoration: 'line-through',
                }}>
                  {formatVND(product.original_price)}
                </span>
              )}
              {discount > 0 && (
                <span style={{
                  padding: '2px 8px', borderRadius: 6,
                  background: 'rgba(239,68,68,.1)', color: '#ef4444',
                  fontSize: '.78rem', fontWeight: 700,
                }}>
                  -{discount}%
                </span>
              )}
            </div>

            {/* DPP Badge link */}
            {product.dpp_enabled && (
              <Link to="/dpp" style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                padding: '10px 16px', borderRadius: 12,
                background: 'rgba(34,197,94,.06)', border: '1px solid rgba(34,197,94,.2)',
                textDecoration: 'none', marginBottom: 20,
                transition: 'background .2s',
              }}>
                <span style={{ fontSize: '.85rem' }}>🔗</span>
                <div>
                  <div style={{ fontSize: '.78rem', fontWeight: 700, color: 'var(--c4-500, #22c55e)', whiteSpace: 'nowrap' }}>
                    DPP Verified on Blockchain
                  </div>
                  <div style={{ fontSize: '.65rem', color: 'var(--text-4)' }}>
                    {t('product.dpp.viewDetail')}
                  </div>
                </div>
              </Link>
            )}

            {/* Quantity Selector */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
              <span style={{ fontSize: '.82rem', color: 'var(--text-3)', fontWeight: 600 }}>{t('product.quantity')}</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <button
                  className="btn btn-secondary"
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  style={{ width: 36, height: 36, padding: 0, fontSize: '1rem', borderRadius: 8 }}
                >
                  −
                </button>
                <span style={{
                  fontFamily: 'var(--ff-display, system-ui)', fontWeight: 700,
                  fontSize: '1rem', minWidth: 44, textAlign: 'center',
                }}>
                  {quantity}
                </span>
                <button
                  className="btn btn-secondary"
                  onClick={() => setQuantity(quantity + 1)}
                  style={{ width: 36, height: 36, padding: 0, fontSize: '1rem', borderRadius: 8 }}
                >
                  +
                </button>
              </div>
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
              <button
                className="btn btn-primary btn-lg"
                onClick={handleAddToCart}
                disabled={addingToCart}
                style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, opacity: addingToCart ? 0.7 : 1 }}
              >
                🛒 {addingToCart ? '...' : t('product.addToCart')}
              </button>
              <Link
                to="/checkout"
                className="btn btn-secondary btn-lg"
                style={{ flex: 1, textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
              >
                {t('product.buyNow')}
              </Link>
            </div>

            {/* XP Preview */}
            <div style={{
              padding: '10px 16px', borderRadius: 12,
              background: 'rgba(6,182,212,.06)', border: '1px solid rgba(6,182,212,.12)',
              display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20,
            }}>
              <span style={{ fontSize: '1rem' }}>🎮</span>
              <span style={{ fontSize: '.82rem', color: 'var(--text-2)' }}>
                {t('product.xp.prefix')}
              </span>
              <span className="badge badge-gold" style={{ fontSize: '.72rem' }}>
                +{product.xp_reward * quantity} XP
              </span>
            </div>

            {/* Quick Info Table */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {[
                [t('product.info.brand'), product.brand],
                [t('product.info.origin'), product.origin],
                [t('product.info.category'), product.category],
              ].map(([label, val], i) => (
                <div key={i} style={{
                  display: 'flex', justifyContent: 'space-between',
                  padding: '10px 0', borderBottom: '1px solid var(--border)',
                  fontSize: '.82rem',
                }}>
                  <span style={{ color: 'var(--text-3)' }}>{label}</span>
                  <span style={{ fontWeight: 600 }}>{val}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div style={{
          display: 'flex', gap: 4, padding: 4, borderRadius: 14,
          background: 'var(--bg-2)', marginBottom: 28, maxWidth: 500,
        }}>
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                flex: 1, padding: '10px 14px', borderRadius: 10,
                border: 'none', cursor: 'pointer',
                background: activeTab === tab.key ? 'var(--surface-card, var(--bg-1))' : 'transparent',
                boxShadow: activeTab === tab.key ? '0 1px 3px rgba(0,0,0,.1)' : 'none',
                color: activeTab === tab.key ? 'var(--text-1)' : 'var(--text-3)',
                fontWeight: activeTab === tab.key ? 700 : 500,
                fontSize: '.78rem',
                fontFamily: 'var(--ff-body, system-ui)',
                transition: 'all .2s', whiteSpace: 'nowrap',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === 'description' && (
          <div className="card" style={{ padding: 28 }}>
            <h3 style={{ fontWeight: 700, fontSize: '1rem', marginBottom: 14 }}>{t('product.description.title')}</h3>
            <p style={{ fontSize: '.88rem', color: 'var(--text-2)', lineHeight: 1.8 }}>
              {product.description}
            </p>
          </div>
        )}

        {activeTab === 'dpp' && (
          <div className="onchain-card" style={{ padding: 28 }}>
            <div className="verified-seal" style={{ marginBottom: 16, fontSize: '.88rem' }}>
              DPP Verified On-Chain
            </div>
            <p style={{ fontSize: '.82rem', color: 'var(--text-3)', marginBottom: 20, lineHeight: 1.6 }}>
              {t('product.dpp.desc')}
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[
                { label: 'DPP Token ID', value: product.dpp_token_id || '—', mono: true },
                { label: 'Blockchain', value: product.dpp_chain || 'Polygon', badge: true },
                { label: t('product.info.origin'), value: product.origin },
                { label: t('product.info.brand'), value: product.brand },
              ].map((row, i) => (
                <div key={i} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,.05)',
                  fontSize: '.82rem',
                }}>
                  <span style={{ color: 'var(--text-3)' }}>{row.label}</span>
                  {row.mono ? (
                    <span style={{ fontFamily: 'monospace', color: 'var(--c4-300, #22c55e)', fontSize: '.75rem' }}>
                      {row.value}
                    </span>
                  ) : row.badge ? (
                    <span className="badge badge-c7">{row.value}</span>
                  ) : (
                    <span style={{ fontWeight: 600 }}>{row.value}</span>
                  )}
                </div>
              ))}

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', fontSize: '.82rem' }}>
                <span style={{ color: 'var(--text-3)' }}>{t('product.dpp.certifications')}</span>
                <div style={{ display: 'flex', gap: 6 }}>
                  {product.certifications?.map(c => (
                    <span key={c} className="badge badge-c4" style={{ fontSize: '.65rem' }}>{c}</span>
                  ))}
                </div>
              </div>
            </div>

            <Link
              to="/dpp"
              className="btn btn-primary btn-sm"
              style={{ marginTop: 20, textDecoration: 'none', display: 'inline-block' }}
            >
              {t('product.dpp.viewDetail')}
            </Link>
          </div>
        )}

        {activeTab === 'reviews' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {/* Rating summary */}
            <div className="card" style={{
              padding: 20, display: 'flex', alignItems: 'center', gap: 24, marginBottom: 8,
            }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{
                  fontFamily: 'var(--ff-display, system-ui)', fontWeight: 800,
                  fontSize: '2.5rem', color: 'var(--gold-400, #f59e0b)',
                }}>
                  {product.rating}
                </div>
                <div style={{ fontSize: '.82rem', color: 'var(--gold-400, #f59e0b)' }}>
                  {'★'.repeat(Math.floor(product.rating))}
                </div>
                <div style={{ fontSize: '.72rem', color: 'var(--text-4)', marginTop: 2 }}>
                  {product.reviewCount} {t('product.reviews')}
                </div>
              </div>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
                {[5, 4, 3, 2, 1].map(stars => {
                  const pct = stars === 5 ? 65 : stars === 4 ? 25 : stars === 3 ? 7 : stars === 2 ? 2 : 1;
                  return (
                    <div key={stars} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: '.68rem', color: 'var(--text-3)', minWidth: 14, textAlign: 'right' }}>{stars}</span>
                      <span style={{ fontSize: '.68rem', color: 'var(--gold-400, #f59e0b)' }}>★</span>
                      <div className="progress-track" style={{ flex: 1, height: 6 }}>
                        <div className="progress-bar" style={{
                          width: `${pct}%`, height: '100%', borderRadius: 3,
                          background: 'var(--gold-400, #f59e0b)',
                        }} />
                      </div>
                      <span style={{ fontSize: '.62rem', color: 'var(--text-4)', minWidth: 28 }}>{pct}%</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Individual reviews */}
            {kocReviews.map(review => (
              <div key={review.id} className="card" style={{ padding: '18px 20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: '50%',
                      background: 'linear-gradient(135deg, var(--c6-500, #06b6d4), var(--c7-500, #6366f1))',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '.6rem', color: '#fff', fontWeight: 700,
                    }}>
                      {review.avatar}
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontWeight: 700, fontSize: '.85rem' }}>{review.author}</span>
                        {review.purchaseBadge && (
                          <span className="badge badge-c4" style={{ fontSize: '.55rem' }}>{t('product.review.purchased')}</span>
                        )}
                        {review.kocLevel && (
                          <span className="badge badge-c6" style={{ fontSize: '.55rem' }}>{review.kocLevel}</span>
                        )}
                      </div>
                      <div style={{ fontSize: '.72rem', color: 'var(--gold-400, #f59e0b)', marginTop: 2 }}>
                        {'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}
                      </div>
                    </div>
                  </div>
                  <span style={{ fontSize: '.68rem', color: 'var(--text-4)' }}>{review.date}</span>
                </div>
                <p style={{ fontSize: '.82rem', color: 'var(--text-2)', lineHeight: 1.6, margin: 0 }}>
                  {review.content}
                </p>
                {review.verified && (
                  <div style={{
                    display: 'inline-flex', alignItems: 'center', gap: 4,
                    marginTop: 8, fontSize: '.68rem', color: 'var(--c4-500, #22c55e)',
                  }}>
                    ✓ {t('product.review.verified')}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
