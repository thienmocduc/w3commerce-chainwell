import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useI18n } from '@hooks/useI18n';

interface Product {
  id: string;
  name: string;
  price: number;
  originalPrice?: number;
  category: string;
  dpp: boolean;
  rating: number;
  sold: number;
  kocAvatar: string;
  kocName: string;
  gradient: string;
}

const formatVND = (price: number): string =>
  new Intl.NumberFormat('vi-VN').format(price) + ' \u20AB';

const categories = [
  { key: 'all', label: 'Tất cả' },
  { key: 'skincare', label: 'Skincare' },
  { key: 'food', label: 'Thực phẩm' },
  { key: 'tech', label: 'Công nghệ' },
  { key: 'fashion', label: 'Thời trang' },
  { key: 'health', label: 'Sức khoẻ' },
];

const sortOptions = [
  { key: 'newest', label: 'Mới nhất' },
  { key: 'bestseller', label: 'Bán chạy' },
  { key: 'price-asc', label: 'Giá thấp \u2192 cao' },
  { key: 'price-desc', label: 'Giá cao \u2192 thấp' },
];

const products: Product[] = [
  { id: 'serum-vitc', name: 'Serum Vitamin C 20% Brightening', price: 315000, originalPrice: 470000, category: 'skincare', dpp: true, rating: 4.8, sold: 2341, kocAvatar: 'LK', kocName: '@linh.koc', gradient: 'linear-gradient(135deg, #fbbf24, #f59e0b)' },
  { id: 'collagen-marine', name: 'Collagen Peptide Marine 5000mg', price: 680000, category: 'health', dpp: true, rating: 4.9, sold: 1856, kocAvatar: 'MK', kocName: '@minh.kol', gradient: 'linear-gradient(135deg, #06b6d4, #6366f1)' },
  { id: 'matcha-uji', name: 'Matcha Uji Premium Nhật Bản', price: 285000, category: 'food', dpp: true, rating: 4.7, sold: 3102, kocAvatar: 'NA', kocName: '@ngoc.review', gradient: 'linear-gradient(135deg, #22c55e, #06b6d4)' },
  { id: 'vitamin-d3k2', name: 'Vitamin D3 K2 MK-7 Premium', price: 420000, originalPrice: 560000, category: 'health', dpp: true, rating: 4.6, sold: 1523, kocAvatar: 'TK', kocName: '@thu.koc', gradient: 'linear-gradient(135deg, #a855f7, #6366f1)' },
  { id: 'sunscreen-spf50', name: 'Kem Chống Nắng SPF50+ PA++++', price: 245000, originalPrice: 350000, category: 'skincare', dpp: true, rating: 4.8, sold: 4210, kocAvatar: 'HT', kocName: '@hien.beauty', gradient: 'linear-gradient(135deg, #f97316, #fbbf24)' },
  { id: 'tra-olong', name: 'Trà Ô Long Đài Loan Cao Cấp', price: 389000, category: 'food', dpp: true, rating: 4.9, sold: 1247, kocAvatar: 'MH', kocName: '@minh.huong', gradient: 'linear-gradient(135deg, #84cc16, #22c55e)' },
  { id: 'smart-watch', name: 'Đồng Hồ Thông Minh WellFit Pro', price: 1890000, originalPrice: 2500000, category: 'tech', dpp: true, rating: 4.5, sold: 876, kocAvatar: 'DT', kocName: '@dat.tech', gradient: 'linear-gradient(135deg, #3b82f6, #8b5cf6)' },
  { id: 'ao-thun-organic', name: 'Áo Thun Cotton Organic Premium', price: 450000, category: 'fashion', dpp: true, rating: 4.4, sold: 2156, kocAvatar: 'TL', kocName: '@thao.fashion', gradient: 'linear-gradient(135deg, #ec4899, #f43f5e)' },
  { id: 'mat-ong-rung', name: 'Mật Ong Rừng Tây Nguyên 500ml', price: 285000, category: 'food', dpp: true, rating: 4.7, sold: 1893, kocAvatar: 'VA', kocName: '@van.anh', gradient: 'linear-gradient(135deg, #f59e0b, #d97706)' },
  { id: 'tinh-dau-tram', name: 'Tinh Dầu Tràm Hữu Cơ 50ml', price: 195000, originalPrice: 280000, category: 'health', dpp: false, rating: 4.3, sold: 967, kocAvatar: 'PH', kocName: '@phuong.herbal', gradient: 'linear-gradient(135deg, #10b981, #059669)' },
  { id: 'tai-nghe-bluetooth', name: 'Tai Nghe Bluetooth ANC Pro', price: 1250000, originalPrice: 1800000, category: 'tech', dpp: true, rating: 4.6, sold: 1342, kocAvatar: 'KD', kocName: '@khanh.tech', gradient: 'linear-gradient(135deg, #6366f1, #4f46e5)' },
  { id: 'khan-lua-dalat', name: 'Khăn Lụa Đà Lạt Thêu Tay', price: 520000, category: 'fashion', dpp: true, rating: 4.8, sold: 645, kocAvatar: 'ML', kocName: '@mai.style', gradient: 'linear-gradient(135deg, #e11d48, #be185d)' },
];

export default function Marketplace() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [dppOnly, setDppOnly] = useState(false);
  const [hoveredProduct, setHoveredProduct] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(8);

  const filtered = products
    .filter(p => {
      if (activeCategory !== 'all' && p.category !== activeCategory) return false;
      if (dppOnly && !p.dpp) return false;
      if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'price-asc') return a.price - b.price;
      if (sortBy === 'price-desc') return b.price - a.price;
      if (sortBy === 'bestseller') return b.sold - a.sold;
      return 0; // newest = default order
    });

  const visible = filtered.slice(0, visibleCount);

  return (
    <section style={{ paddingTop: 'calc(var(--topbar-height, 64px) + 24px)', minHeight: '100vh', background: 'var(--bg-0)' }}>
      <div className="container" style={{ paddingBottom: 80 }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <div className="section-badge">
            <span className="dot-pulse dot-green"></span>
            MARKETPLACE
          </div>
          <h1 className="display-lg gradient-text" style={{ marginBottom: 8 }}>
            {t('marketplace.title')}
          </h1>
          <p style={{ color: 'var(--text-3)', fontSize: '.88rem', maxWidth: 480, margin: '0 auto' }}>
            {t('marketplace.desc')}
          </p>
        </div>

        {/* Search Bar */}
        <div style={{ maxWidth: 560, margin: '0 auto 24px', position: 'relative' }}>
          <input
            className="input-field"
            type="text"
            placeholder={t('marketplace.search')}
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              width: '100%', padding: '14px 16px 14px 44px',
              borderRadius: 14, fontSize: '.88rem',
            }}
          />
          <span style={{
            position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)',
            fontSize: '1rem', color: 'var(--text-3)', pointerEvents: 'none',
          }}>
            🔍
          </span>
        </div>

        {/* Category Tabs */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginBottom: 20, flexWrap: 'wrap' }}>
          {categories.map(cat => (
            <button
              key={cat.key}
              className={`feature-tab${activeCategory === cat.key ? ' on' : ''}`}
              onClick={() => { setActiveCategory(cat.key); setVisibleCount(8); }}
              style={{ padding: '8px 18px', borderRadius: 20, fontSize: '.78rem' }}
            >
              {cat.key === 'all' ? t('marketplace.cat.all') : cat.key === 'food' ? t('marketplace.cat.food') : cat.key === 'tech' ? t('marketplace.cat.tech') : cat.key === 'fashion' ? t('marketplace.cat.fashion') : cat.key === 'health' ? t('marketplace.cat.health') : cat.label}
            </button>
          ))}
        </div>

        {/* Filter Row */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          marginBottom: 28, padding: '12px 20px', borderRadius: 14,
          background: 'var(--bg-2)', flexWrap: 'wrap', gap: 12,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: '.78rem', color: 'var(--text-3)', fontWeight: 600 }}>{t('marketplace.sort.label')}</span>
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value)}
              style={{
                padding: '6px 12px', borderRadius: 8,
                border: '1px solid var(--border)', background: 'var(--surface-card, var(--bg-1))',
                color: 'var(--text-1)', fontSize: '.78rem',
                fontFamily: 'var(--ff-body, system-ui)', cursor: 'pointer',
              }}
            >
              {sortOptions.map(opt => (
                <option key={opt.key} value={opt.key}>{opt.key === 'newest' ? t('marketplace.sort.newest') : opt.key === 'bestseller' ? t('marketplace.sort.bestseller') : opt.key === 'price-asc' ? t('marketplace.sort.priceAsc') : t('marketplace.sort.priceDesc')}</option>
              ))}
            </select>
          </div>

          <label style={{
            display: 'flex', alignItems: 'center', gap: 8,
            cursor: 'pointer', fontSize: '.78rem', color: 'var(--text-2)',
          }}>
            <div style={{
              width: 40, height: 22, borderRadius: 11, padding: 2,
              background: dppOnly ? 'var(--c4-500, #22c55e)' : 'var(--border)',
              transition: 'background .2s', cursor: 'pointer',
              display: 'flex', alignItems: 'center',
            }} onClick={() => setDppOnly(!dppOnly)}>
              <div style={{
                width: 18, height: 18, borderRadius: '50%',
                background: '#fff', transition: 'transform .2s',
                transform: dppOnly ? 'translateX(18px)' : 'translateX(0)',
                boxShadow: '0 1px 3px rgba(0,0,0,.2)',
              }} />
            </div>
            <span style={{ fontWeight: 600 }}>{t('marketplace.dppOnly')}</span>
          </label>

          <span style={{ fontSize: '.75rem', color: 'var(--text-4)' }}>
            {filtered.length} {t('marketplace.productCount')}
          </span>
        </div>

        {/* Product Grid */}
        {filtered.length === 0 ? (
          <div className="card" style={{ padding: 48, textAlign: 'center' }}>
            <div style={{ fontSize: '3rem', marginBottom: 12 }}>🔍</div>
            <h3 style={{ marginBottom: 8, color: 'var(--text-2)' }}>{t('marketplace.noProducts')}</h3>
            <p style={{ color: 'var(--text-3)', fontSize: '.85rem' }}>{t('marketplace.noProducts.hint')}</p>
          </div>
        ) : (
          <div className="grid-4" style={{ gap: 20 }}>
            {visible.map(p => {
              const discount = p.originalPrice
                ? Math.round((1 - p.price / p.originalPrice) * 100)
                : 0;

              return (
                <div
                  key={p.id}
                  className="card card-hover"
                  style={{ overflow: 'hidden', cursor: 'pointer', position: 'relative' }}
                  onClick={() => navigate(`/product/${p.id}`)}
                  onMouseEnter={() => setHoveredProduct(p.id)}
                  onMouseLeave={() => setHoveredProduct(null)}
                >
                  {/* Image Placeholder */}
                  <div style={{
                    height: 180, background: p.gradient,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    position: 'relative',
                  }}>
                    <div style={{
                      width: 60, height: 60, borderRadius: '50%',
                      background: 'rgba(255,255,255,.2)',
                      backdropFilter: 'blur(10px)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '.85rem', color: '#fff', fontWeight: 700,
                    }}>
                      IMG
                    </div>

                    {/* Badges */}
                    {p.dpp && (
                      <span className="badge badge-c4" style={{
                        position: 'absolute', top: 10, left: 10,
                        fontSize: '.6rem', padding: '3px 8px',
                        background: 'rgba(34,197,94,.9)', color: '#fff',
                        whiteSpace: 'nowrap',
                      }}>
                        DPP ✓
                      </span>
                    )}
                    {discount > 0 && (
                      <span style={{
                        position: 'absolute', top: 10, right: 10,
                        padding: '3px 8px', borderRadius: 6,
                        background: 'rgba(239,68,68,.9)', color: '#fff',
                        fontSize: '.65rem', fontWeight: 700,
                      }}>
                        -{discount}%
                      </span>
                    )}

                    {/* Add to Cart overlay on hover */}
                    {hoveredProduct === p.id && (
                      <div style={{
                        position: 'absolute', inset: 0,
                        background: 'rgba(0,0,0,.4)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        transition: 'opacity .2s',
                      }}>
                        <button
                          className="btn btn-primary"
                          onClick={e => { e.stopPropagation(); }}
                          style={{ padding: '10px 20px', fontSize: '.82rem' }}
                        >
                          🛒 {t('marketplace.addToCart')}
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Product Info */}
                  <div style={{ padding: '14px 16px' }}>
                    <h3 style={{
                      fontSize: '.82rem', fontWeight: 700, marginBottom: 8,
                      lineHeight: 1.3, minHeight: '2.2em',
                      overflow: 'hidden', textOverflow: 'ellipsis',
                      display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const,
                    }}>
                      {p.name}
                    </h3>

                    {/* Price */}
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 8 }}>
                      <span style={{
                        fontFamily: 'var(--ff-display, system-ui)', fontWeight: 800,
                        fontSize: '1rem', color: 'var(--c6-300, #06b6d4)',
                        whiteSpace: 'nowrap',
                      }}>
                        {formatVND(p.price)}
                      </span>
                      {p.originalPrice && (
                        <span style={{
                          fontSize: '.72rem', color: 'var(--text-4)',
                          textDecoration: 'line-through',
                          whiteSpace: 'nowrap',
                        }}>
                          {formatVND(p.originalPrice)}
                        </span>
                      )}
                    </div>

                    {/* Rating + Sold */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                      <span style={{ fontSize: '.72rem', color: 'var(--gold-400, #f59e0b)' }}>
                        {'★'.repeat(Math.floor(p.rating))} <span style={{ color: 'var(--text-3)' }}>{p.rating}</span>
                      </span>
                      <span style={{ fontSize: '.68rem', color: 'var(--text-4)' }}>
                        {t('marketplace.sold')} {p.sold.toLocaleString('vi-VN')}
                      </span>
                    </div>

                    {/* KOC */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <div style={{
                        width: 22, height: 22, borderRadius: '50%',
                        background: 'linear-gradient(135deg, var(--c6-500, #06b6d4), var(--c7-500, #6366f1))',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '.5rem', color: '#fff', fontWeight: 700,
                      }}>
                        {p.kocAvatar}
                      </div>
                      <span style={{ fontSize: '.68rem', color: 'var(--text-3)' }}>{p.kocName}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Load More */}
        {visibleCount < filtered.length && (
          <div style={{ textAlign: 'center', marginTop: 36 }}>
            <button
              className="btn btn-secondary"
              onClick={() => setVisibleCount(prev => prev + 4)}
              style={{ padding: '12px 32px' }}
            >
              {t('marketplace.loadMore')} ({filtered.length - visibleCount} {t('marketplace.remaining')})
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
