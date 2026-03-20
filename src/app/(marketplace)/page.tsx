'use client';

export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useProducts } from '@/hooks/useProducts';
import { ProductCard } from '@/components/product/ProductCard';
import { useState } from 'react';

// ─── Pain Points Data ───────────────────────────────────────
const PAIN_POINTS = [
  {
    icon: '🚫',
    title: 'Hàng giả tràn lan',
    description: 'Người tiêu dùng mất niềm tin vì không thể xác minh nguồn gốc sản phẩm. 67% khách hàng nghi ngờ sản phẩm online.',
    stat: '67%',
    statLabel: 'khách nghi ngờ hàng giả',
  },
  {
    icon: '💸',
    title: 'KOC/KOL bị quỵt hoa hồng',
    description: 'Hệ thống affiliate truyền thống thiếu minh bạch. KOC không thể tracking chính xác doanh số và hoa hồng.',
    stat: '$2.3B',
    statLabel: 'hoa hồng bị mất/năm',
  },
  {
    icon: '🤖',
    title: 'Content sáng tạo tốn thời gian',
    description: 'KOC mất 4-8h/ngày để nghiên cứu trend, viết script. 80% content không viral vì thiếu data-driven insights.',
    stat: '80%',
    statLabel: 'content không viral',
  },
  {
    icon: '🏪',
    title: 'Vendor thiếu competitive intelligence',
    description: 'Doanh nghiệp không biết đối thủ đang làm gì, giá nào, strategy gì. Mất cơ hội thị trường.',
    stat: '45%',
    statLabel: 'vendor mất khách vì thiếu data',
  },
];

// ─── Solutions Data ─────────────────────────────────────────
const SOLUTIONS = [
  {
    icon: '🔗',
    title: 'DPP Blockchain',
    subtitle: 'Digital Product Passport',
    description: 'Mỗi sản phẩm có "hộ chiếu số" trên blockchain. Nguồn gốc, chứng nhận, carbon footprint — tất cả verified on-chain bằng Zero-Knowledge Proof.',
    color: 'from-blue-500/20 to-cyan-500/20',
    borderColor: 'border-blue-500/30',
    features: ['Merkle Tree ZKP verification', 'NFT-based product passport', 'Immutable supply chain data'],
  },
  {
    icon: '💎',
    title: 'Smart Contract Affiliate',
    subtitle: 'Hoa hồng tự động, minh bạch',
    description: '5 loại commission (flat, tiered, recurring, lifetime, split) chạy tự động trên smart contract. Không thể gian lận, không thể quỵt.',
    color: 'from-purple-500/20 to-pink-500/20',
    borderColor: 'border-purple-500/30',
    features: ['On-chain commission tracking', 'Multi-tier split automatic', 'Staking + Slash mechanism'],
  },
  {
    icon: '🧠',
    title: 'AI Agent Orchestra',
    subtitle: '3 AI Agents phục vụ 24/7',
    description: 'RAG Sales Agent tư vấn sản phẩm verified. Competitor Intel Agent giám sát đối thủ. Content Clone Agent tạo viral script trong 30 giây.',
    color: 'from-amber-500/20 to-orange-500/20',
    borderColor: 'border-amber-500/30',
    features: ['RAG + pgvector product search', 'Auto battlecard generation', 'Viral script cloning engine'],
  },
  {
    icon: '🎓',
    title: 'KOC Academy + SocialFi',
    subtitle: 'Đào tạo + Token hóa ảnh hưởng',
    description: 'Hệ thống LMS gamification biến user thành KOC chuyên nghiệp. Creator Token cho phép fan đầu tư vào KOC yêu thích.',
    color: 'from-green-500/20 to-emerald-500/20',
    borderColor: 'border-green-500/30',
    features: ['XP + Level progression', 'NFT Badge graduation', 'Creator Token launchpad'],
  },
];

// ─── Platform Stats ─────────────────────────────────────────
const PLATFORM_STATS = [
  { value: '10,000', label: 'Sản phẩm', suffix: '+' },
  { value: '5,000', label: 'KOC hoạt động', suffix: '+' },
  { value: '50,000', label: 'Đơn hàng thành công', suffix: '+' },
  { value: '99.9', label: 'Giao dịch minh bạch', suffix: '%' },
];

// ─── Tech Stack ─────────────────────────────────────────────
const TECH_STACK = [
  { name: 'Next.js 14', category: 'Frontend' },
  { name: 'Supabase', category: 'Database' },
  { name: 'Solidity', category: 'Blockchain' },
  { name: 'OpenAI GPT-4o', category: 'AI' },
  { name: 'Polygon', category: 'Chain' },
  { name: 'AWS IVS', category: 'Streaming' },
  { name: 'pgvector', category: 'RAG' },
  { name: 'Stripe', category: 'Payment' },
];

export default function HomePage() {
  const [page] = useState(1);
  const { products } = useProducts({ page, limit: 8 });

  return (
    <div className="min-h-screen">
      {/* ── HERO ── */}
      <section className="relative overflow-hidden border-b border-border">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-purple-500/5" />
        <div className="relative mx-auto max-w-7xl px-4 py-20 md:py-32">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-border bg-muted px-4 py-1.5 text-sm">
              <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
              Web3 Social Commerce Platform
            </div>
            <h1 className="text-4xl font-bold tracking-tight md:text-6xl">
              Thương Mại Cộng Đồng
              <span className="block bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
                Kỷ Nguyên Số &amp; Hệ Sinh Thái Phục Hưng Sự Sống
              </span>
            </h1>
            <p className="mt-6 text-lg text-muted-foreground md:text-xl">
              Nền tảng kết nối Vendor — KOC/KOL — Buyer với AI agents thông minh,
              hoa hồng on-chain minh bạch, và sản phẩm verified bằng Digital Product Passport.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link href="/register">
                <Button size="lg" className="px-8 text-base">
                  Bắt đầu miễn phí
                </Button>
              </Link>
              <Link href="/academy">
                <Button size="lg" variant="outline" className="px-8 text-base">
                  Khám phá KOC Academy
                </Button>
              </Link>
            </div>
          </div>

          {/* Stats bar */}
          <div className="mt-16 grid grid-cols-2 gap-4 md:grid-cols-4">
            {PLATFORM_STATS.map((stat) => (
              <div key={stat.label} className="rounded-lg border border-border bg-card/50 p-4 text-center backdrop-blur-sm">
                <p className="text-3xl font-bold">{stat.value}{stat.suffix}</p>
                <p className="mt-1 text-sm text-muted-foreground">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PAIN POINTS ── */}
      <section className="border-b border-border bg-muted/30 py-20">
        <div className="mx-auto max-w-7xl px-4">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-red-500">Vấn đề thị trường</h2>
            <p className="mt-2 text-3xl font-bold">Nỗi đau mà ai cũng gặp</p>
            <p className="mt-3 text-muted-foreground">
              Thương mại điện tử truyền thống đang gặp khủng hoảng niềm tin — từ vendor, KOC đến người mua.
            </p>
          </div>

          <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-2">
            {PAIN_POINTS.map((pain) => (
              <div key={pain.title} className="group rounded-xl border border-red-500/20 bg-card p-6 transition-all hover:border-red-500/40 hover:shadow-lg">
                <div className="flex items-start gap-4">
                  <span className="text-3xl">{pain.icon}</span>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold">{pain.title}</h3>
                    <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{pain.description}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-red-500">{pain.stat}</p>
                    <p className="text-[10px] text-muted-foreground">{pain.statLabel}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SOLUTIONS ── */}
      <section className="border-b border-border py-20">
        <div className="mx-auto max-w-7xl px-4">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-green-500">Giải pháp WellKOC</h2>
            <p className="mt-2 text-3xl font-bold">Công cụ thế mạnh của nền tảng</p>
            <p className="mt-3 text-muted-foreground">
              4 pillars công nghệ kết hợp tạo nên hệ sinh thái social commerce thế hệ mới.
            </p>
          </div>

          <div className="mt-12 grid grid-cols-1 gap-6 lg:grid-cols-2">
            {SOLUTIONS.map((sol) => (
              <div key={sol.title} className={`rounded-xl border ${sol.borderColor} bg-gradient-to-br ${sol.color} p-6 transition-all hover:shadow-lg`}>
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{sol.icon}</span>
                  <div>
                    <h3 className="text-lg font-bold">{sol.title}</h3>
                    <p className="text-xs text-muted-foreground">{sol.subtitle}</p>
                  </div>
                </div>
                <p className="mt-4 text-sm text-muted-foreground leading-relaxed">
                  {sol.description}
                </p>
                <ul className="mt-4 space-y-1.5">
                  {sol.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm">
                      <span className="h-1.5 w-1.5 rounded-full bg-foreground/40" />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section className="border-b border-border bg-muted/30 py-20">
        <div className="mx-auto max-w-7xl px-4">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-primary">Quy trình</h2>
            <p className="mt-2 text-3xl font-bold">Cách WellKOC hoạt động</p>
          </div>

          <div className="mt-12 grid grid-cols-1 gap-8 md:grid-cols-3 lg:grid-cols-5">
            {[
              {
                step: '01',
                title: 'Đăng ký & Kết nối',
                desc: 'Tạo tài khoản, chọn vai trò (Vendor, KOC, Buyer) và kết nối ví Web3 để sẵn sàng tham gia hệ sinh thái.',
                role: 'Tất cả',
              },
              {
                step: '02',
                title: 'Khám phá & Review',
                desc: 'Duyệt sản phẩm verified bằng DPP, đọc review từ cộng đồng KOC và sử dụng AI Agent để tư vấn.',
                role: 'KOC/Buyer',
              },
              {
                step: '03',
                title: 'Chia sẻ & Bán hàng',
                desc: 'KOC tạo content với AI, livestream bán hàng. Vendor quản lý đơn hàng và theo dõi doanh số real-time.',
                role: 'KOC/Vendor',
              },
              {
                step: '04',
                title: 'Nhận hoa hồng On-chain',
                desc: 'Hoa hồng được tính tự động qua smart contract, minh bạch và không thể gian lận. Rút về ví bất cứ lúc nào.',
                role: 'KOC/KOL',
              },
              {
                step: '05',
                title: 'Phát triển & Nâng cấp',
                desc: 'Tích lũy XP, lên level trong KOC Academy, mở khóa NFT Badge và phát triển thương hiệu cá nhân.',
                role: 'Tất cả',
              },
            ].map((item) => (
              <div key={item.step} className="relative rounded-xl border border-border bg-card p-6">
                <span className="text-5xl font-bold text-muted-foreground/20">{item.step}</span>
                <span className="ml-3 inline-block rounded bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                  {item.role}
                </span>
                <h3 className="mt-3 text-lg font-semibold">{item.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRODUCTS PREVIEW ── */}
      {products.length > 0 && (
        <section className="border-b border-border py-20">
          <div className="mx-auto max-w-7xl px-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold">Sản phẩm nổi bật</h2>
                <p className="mt-1 text-muted-foreground">Verified bằng Digital Product Passport</p>
              </div>
              <Link href="/marketplace">
                <Button variant="outline">Xem tất cả</Button>
              </Link>
            </div>
            <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-4">
              {products.slice(0, 8).map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── PARTNERS & MEDIA ── */}
      <section className="border-b border-border bg-muted/30 py-16">
        <div className="mx-auto max-w-7xl px-4">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Đối tác & Truyền thông
            </h2>
            <p className="mt-2 text-2xl font-bold">Được tin tưởng bởi</p>
          </div>
          <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            {['Partner 1', 'Partner 2', 'Partner 3', 'Partner 4', 'Partner 5', 'Partner 6'].map(
              (name) => (
                <div
                  key={name}
                  className="flex h-24 items-center justify-center rounded-lg border border-border bg-card grayscale transition-all hover:grayscale-0"
                >
                  <span className="text-sm font-medium text-muted-foreground">{name}</span>
                </div>
              )
            )}
          </div>
        </div>
      </section>

      {/* ── TECH STACK ── */}
      <section className="border-b border-border py-16">
        <div className="mx-auto max-w-7xl px-4">
          <p className="text-center text-sm text-muted-foreground mb-6">Powered by</p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            {TECH_STACK.map((tech) => (
              <div key={tech.name} className="rounded-lg border border-border px-4 py-2 text-sm">
                <span className="font-medium">{tech.name}</span>
                <span className="ml-2 text-xs text-muted-foreground">{tech.category}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-20">
        <div className="mx-auto max-w-7xl px-4 text-center">
          <h2 className="text-3xl font-bold">
            Sẵn sàng tham gia Web3 Commerce?
          </h2>
          <p className="mt-3 text-lg text-muted-foreground">
            Đăng ký miễn phí. Trở thành Vendor, KOC, hoặc bắt đầu mua sắm ngay.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link href="/register">
              <Button size="lg" className="px-10 text-base">
                Đăng ký ngay
              </Button>
            </Link>
            <Link href="/login">
              <Button size="lg" variant="outline" className="px-10 text-base">
                Đăng nhập
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
