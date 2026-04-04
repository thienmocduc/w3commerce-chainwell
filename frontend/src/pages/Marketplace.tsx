import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useI18n } from '@hooks/useI18n';
import { useAuth } from '@hooks/useAuth';
import { productsApi, cartApi } from '../lib/api';

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
  imageUrl?: string;
}

const formatVND = (price: number): string =>
  new Intl.NumberFormat('vi-VN').format(price) + ' ₫';

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
  { key: 'price-asc', label: 'Giá thấp → cao' },
  { key: 'price-desc', label: 'Giá cao → thấp' },
];

const SKELETON_GRADIENTS = [
  'linear-gradient(135deg, #1e293b, #334155)',
  'linear-gradient(135deg, #1e3a5f, #1e293b)',
  'linear-gradient(135deg, #2d1b69, #1e293b)',
  'linear-gradient(135deg, #14532d, #1e293b)',
];

const DEMO_PRODUCTS: Product[] = [
  { id: 'demo-1', name: 'Kem dưỡng trắng da ban đêm Sakura', price: 320000, originalPrice: 450000, category: 'skincare', dpp: true, rating: 4.8, sold: 1240, kocAvatar: '', kocName: 'Mai Linh', gradient: 'linear-gradient(135deg, #ff6b9d, #c44dff)' },
  { id: 'demo-2', name: 'Serum Vitamin C 20% Pure Glow', price: 185000, originalPrice: 250000, category: 'skincare', dpp: false, rating: 4.6, sold: 890, kocAvatar: '', kocName: 'Thu Hà', gradient: 'linear-gradient(135deg, #f7971e, #ffd200)' },
  { id: 'demo-3', name: 'Cà phê Arabica rang xay Đà Lạt 500g', price: 145000, originalPrice: 180000, category: 'food', dpp: true, rating: 4.9, sold: 3200, kocAvatar: '', kocName: 'Minh Tuấn', gradient: 'linear-gradient(135deg, #4e342e, #8d6e63)' },
  { id: 'demo-4', name: 'Mật ong rừng nguyên chất Tây Nguyên', price: 220000, originalPrice: 280000, category: 'food', dpp: true, rating: 4.7, sold: 1560, kocAvatar: '', kocName: 'Lan Anh', gradient: 'linear-gradient(135deg, #f9a825, #f57f17)' },
  { id: 'demo-5', name: 'Tai nghe không dây WK Pro X1', price: 890000, originalPrice: 1200000, category: 'tech', dpp: false, rating: 4.5, sold: 430, kocAvatar: '', kocName: 'Quang Hải', gradient: 'linear-gradient(135deg, #1a237e, #283593)' },
  { id: 'demo-6', name: 'Đồng hồ thông minh Band 7 Ultra', price: 1250000, originalPrice: 1650000, category: 'tech', dpp: false, rating: 4.4, sold: 320, kocAvatar: '', kocName: 'Văn Long', gradient: 'linear-gradient(135deg, #263238, #37474f)' },
  { id: 'demo-7', name: 'Áo thun oversize form rộng unisex', price: 195000, originalPrice: 260000, category: 'fashion', dpp: false, rating: 4.6, sold: 2100, kocAvatar: '', kocName: 'Ngọc Bích', gradient: 'linear-gradient(135deg, #880e4f, #ad1457)' },
  { id: 'demo-8', name: 'Quần jogger thể thao co giãn 4 chiều', price: 285000, originalPrice: 380000, category: 'fashion', dpp: false, rating: 4.5, sold: 1780, kocAvatar: '', kocName: 'Hồng Nhung', gradient: 'linear-gradient(135deg, #4527a0, #5e35b1)' },
  { id: 'demo-9', name: 'Collagen nước uống Fish Collagen 5000mg', price: 420000, originalPrice: 560000, category: 'health', dpp: true, rating: 4.7, sold: 920, kocAvatar: '', kocName: 'Thanh Thảo', gradient: 'linear-gradient(135deg, #00695c, #00897b)' },
  { id: 'demo-10', name: 'Viên uống vitamin tổng hợp Daily Multi', price: 165000, originalPrice: 210000, category: 'health', dpp: false, rating: 4.3, sold: 670, kocAvatar: '', kocName: 'Đức Anh', gradient: 'linear-gradient(135deg, #1b5e20, #2e7d32)' },
  { id: 'demo-11', name: 'Toner cân bằng da Hoa Hồng Dưỡng Ẩm', price: 135000, originalPrice: 175000, category: 'skincare', dpp: true, rating: 4.5, sold: 1890, kocAvatar: '', kocName: 'Phương Linh', gradient: 'linear-gradient(135deg, #b71c1c, #c62828)' },
  { id: 'demo-12', name: 'Trà xanh matcha Nhật Bản premium 100g', price: 380000, originalPrice: 490000, category: 'food', dpp: false, rating: 4.8, sold: 760, kocAvatar: '', kocName: 'Bảo Châu', gradient: 'linear-gradient(135deg, #33691e, #558b2f)' },
];

function ProductSkeleton() {
  return (
    <div className="card" style={{ overflow: 'hidden' }}>
      <div style={{
        height: 180,
        background: 'linear-gradient(90deg, var(--bg-2) 25%, var(--bg-1) 50%, var(--bg-2) 75%)',
        backgroundSize: '200% 100%',
        animation: 'shimmer 1.5s infinite',
      }} />
      <div style={{ padding: '14px 16px' }}>
        <div style={{ height: 14, borderRadius: 4, background: 'var(--bg-2)', marginBottom: 8, width: '85%' }} />
        <div style={{ height: 14, borderRadius: 4, background: 'var(--bg-2)', marginBottom: 12, width: '60%' }} />
        <div style={{ height: 20, borderRadius: 4, background: 'var(--bg-2)', marginBottom: 8, width: '45%' }} />
        <div style={{ height: 12, borderRadius: 4, background: 'var(--bg-2)', width: '70%' }} />
      </div>
    </div>
  );
}

export default function Marketplace() {
  const { t } = useI18n();
  const { token } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState(searchParams.get('q') || '');
  const [activeCategory, setActiveCategory] = useState(searchParams.get('cat') || 'all');
  const [sortBy, setSortBy] = useState('newest');
  const [dppOnly, setDppOnly] = useState(false);
  const [hoveredProduct, setHoveredProduct] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(8);
  const [addingToCart, setAddingToCart] = useState<string | null>(null);

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, string> = {};
      if (activeCategory !== 'all') params.category = activeCategory;
      if (dppOnly) params.dpp_only = 'true';
      if (search.trim()) params.search = search.trim();
      // Map frontend sort keys to backend enum values
      const sortMap: Record<string, string> = {
        'newest': 'newest',
        'bestseller': 'popular',
        'price-asc': 'price_asc',
        'price-desc': 'price_desc',
      };
      if (sortBy && sortMap[sortBy]) params.sort = sortMap[sortBy];

      const res = await productsApi.list(params);
      const items = (res as any).items ?? (Array.isArray(res) ? res : []);
      if (items.length > 0) {
        setProducts(items.map((p: any) => ({
          id: p.id,
          name: p.name,
          price: p.price,
          originalPrice: p.original_price,
          category: p.category || 'other',
          dpp: p.dpp_enabled ?? false,
          rating: p.rating ?? 0,
          sold: p.sold_count ?? 0,
          kocAvatar: p.koc_avatar || '',
          kocName: p.koc_name || '',
          gradient: DEMO_PRODUCTS[Math.floor(Math.random() * DEMO_PRODUCTS.length)].gradient,
          imageUrl: p.image_url,
        })));
      } else {
        setProducts(DEMO_PRODUCTS);
      }
    } catch {
      setProducts(DEMO_PRODUCTS);
    } finally {
      setLoading(false);
    }
  }, [activeCategory, dppOnly, search, sortBy]);

  // Sync activeCategory with URL ?cat= param
  useEffect(() => {
    const cat = searchParams.get('cat');
    setActiveCategory(cat || 'all');
    setVisibleCount(8);
  }, [searchParams]);

  // Sync search with URL ?q= param (from navbar search)
  useEffect(() => {
    const q = searchParams.get('q') || '';
    setSearch(q);
  }, [searchParams]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchProducts();
    }, search ? 400 : 0);
    return () => clearTimeout(timer);
  }, [fetchProducts, search]);

  const handleAddToCart = async (e: React.MouseEvent, product: Product) => {
    e.stopPropagation();
    setAddingToCart(product.id);
    try {
      await cartApi.addItem({ product_id: product.id, quantity: 1 }, token ?? undefined);
      toast.success(`Đã thêm "${product.name}" vào giỏ hàng`);
    } catch (err: any) {
      if (err.status === 401 || err.message?.includes('401')) {
        toast.error('Vui lòng đăng nhập để thêm vào giỏ hàng');
        navigate('/login');
      } else {
        toast.error(err.message || 'Không thể thêm vào giỏ hàng');
      }
    } finally {
      setAddingToCart(null);
    }
  };

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
      return 0;
    });

  const visible = filtered.slice(0, visibleCount);

  return (
    <section style={{ paddingTop: 'calc(var(--topbar-height, 64px) + 12px)', minHeight: '100vh', background: 'var(--bg-0)' }}>
      <style>{`
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
      <div className="container" style={{ paddingBottom: 80 }}>
        {/* Slim page header — title + sort controls on one row */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          marginBottom: 24, gap: 16, flexWrap: 'wrap',
          paddingBottom: 16, borderBottom: '1px solid var(--border)',
        }}>
          <h1 className="display-lg gradient-text" style={{ whiteSpace: 'nowrap', margin: 0 }}>
            {t('marketplace.title')}
          </h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0, flexWrap: 'wrap' }}>
            <span style={{ fontSize: '.8rem', color: 'var(--text-3)', fontWeight: 600 }}>{t('marketplace.sort.label')}</span>
            <select
              value={sortBy}
              onChange={e => { setSortBy(e.target.value); setVisibleCount(8); }}
              style={{
                padding: '6px 12px', borderRadius: 8,
                border: '1px solid var(--border)', background: 'var(--surface-card, var(--bg-1))',
                color: 'var(--text-1)', fontSize: '.8rem',
                fontFamily: 'var(--ff-body, system-ui)', cursor: 'pointer',
              }}
            >
              {sortOptions.map(opt => (
                <option key={opt.key} value={opt.key}>{opt.key === 'newest' ? t('marketplace.sort.newest') : opt.key === 'bestseller' ? t('marketplace.sort.bestseller') : opt.key === 'price-asc' ? t('marketplace.sort.priceAsc') : t('marketplace.sort.priceDesc')}</option>
              ))}
            </select>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: '.8rem', color: 'var(--text-2)' }}>
              <div
                style={{
                  width: 36, height: 20, borderRadius: 10, padding: 2,
                  background: dppOnly ? '#22c55e' : 'var(--border)',
                  transition: 'background .2s', cursor: 'pointer',
                  display: 'flex', alignItems: 'center',
                }}
                onClick={() => { setDppOnly(!dppOnly); setVisibleCount(8); }}
              >
                <div style={{
                  width: 16, height: 16, borderRadius: '50%',
                  background: '#fff', transition: 'transform .2s',
                  transform: dppOnly ? 'translateX(16px)' : 'translateX(0)',
                  boxShadow: '0 1px 3px rgba(0,0,0,.2)',
                }} />
              </div>
              <span style={{ fontWeight: 600 }}>DPP</span>
            </label>
            <span style={{ fontSize: '.8rem', color: 'var(--text-3)', whiteSpace: 'nowrap' }}>
              {loading ? '...' : `${filtered.length} ${t('marketplace.productCount')}`}
            </span>
          </div>
        </div>

        {/* Error State — kept for fallback UI if needed */}
        {false && !loading && (
          <div className="card" style={{ padding: 32, textAlign: 'center', marginBottom: 24, borderColor: 'rgba(239,68,68,.3)' }}>
            <div style={{ fontSize: '2rem', marginBottom: 12 }}>⚠️</div>
            <h3 style={{ marginBottom: 8, color: 'var(--text-2)' }}>Không thể tải sản phẩm</h3>
            <p style={{ color: 'var(--text-3)', fontSize: '.85rem', marginBottom: 16 }}>{error}</p>
            <button className="btn btn-primary" onClick={fetchProducts} style={{ padding: '10px 24px' }}>
              Thử lại
            </button>
          </div>
        )}

        {/* Product Grid — Loading Skeletons */}
        {loading && (
          <div className="grid-4" style={{ gap: 20 }}>
            {Array.from({ length: 8 }).map((_, i) => (
              <ProductSkeleton key={i} />
            ))}
          </div>
        )}

        {/* Product Grid — Empty State */}
        {!loading && filtered.length === 0 && (
          <div className="card" style={{ padding: 48, textAlign: 'center' }}>
            <div style={{ fontSize: '3rem', marginBottom: 12 }}>🔍</div>
            <h3 style={{ marginBottom: 8, color: 'var(--text-2)' }}>{t('marketplace.noProducts')}</h3>
            <p style={{ color: 'var(--text-3)', fontSize: '.85rem' }}>{t('marketplace.noProducts.hint')}</p>
          </div>
        )}

        {/* Product Grid — Results */}
        {!loading && filtered.length > 0 && (
          <div className="grid-4" style={{ gap: 20 }}>
            {visible.map(p => {
              const discount = p.originalPrice
                ? Math.round((1 - p.price / p.originalPrice) * 100)
                : 0;
              const isAdding = addingToCart === p.id;

              return (
                <div
                  key={p.id}
                  className="card card-hover"
                  style={{ overflow: 'hidden', cursor: 'pointer', position: 'relative' }}
                  onClick={() => navigate(`/products/${p.id}`)}
                  onMouseEnter={() => setHoveredProduct(p.id)}
                  onMouseLeave={() => setHoveredProduct(null)}
                >
                  {/* Image */}
                  <div style={{
                    height: 180,
                    background: p.gradient || SKELETON_GRADIENTS[parseInt(p.id, 36) % SKELETON_GRADIENTS.length] || SKELETON_GRADIENTS[0],
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    position: 'relative', overflow: 'hidden',
                  }}>
                    {p.imageUrl ? (
                      <img
                        src={p.imageUrl}
                        alt={p.name}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    ) : (
                      <div style={{
                        width: 60, height: 60, borderRadius: '50%',
                        background: 'rgba(255,255,255,.2)',
                        backdropFilter: 'blur(10px)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '.85rem', color: '#fff', fontWeight: 700,
                      }}>
                        IMG
                      </div>
                    )}

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
                          onClick={e => handleAddToCart(e, p)}
                          disabled={isAdding}
                          style={{ padding: '10px 20px', fontSize: '.82rem', opacity: isAdding ? 0.7 : 1 }}
                        >
                          {isAdding ? '...' : `🛒 ${t('marketplace.addToCart')}`}
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
        {!loading && visibleCount < filtered.length && (
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
