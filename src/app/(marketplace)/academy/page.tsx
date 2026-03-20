'use client';

import { Button } from '@/components/ui/button';

// ─── Course Modules Data ────────────────────────────────────
const MODULES = [
  {
    id: 1,
    title: 'Nhap mon KOC',
    subtitle: 'Introduction to KOC',
    description:
      'Hieu ro vai tro cua KOC trong he sinh thai thuong mai dien tu. Tim hieu cach hoat dong cua affiliate marketing, su khac biet giua KOC va KOL, va co hoi nghe nghiep trong linh vuc nay.',
    lessons: 8,
    difficulty: 'Co ban',
    duration: '4 gio',
    color: 'from-blue-500/20 to-cyan-500/20',
    borderColor: 'border-blue-500/30',
    tag: 'BAT DAU TU DAY',
  },
  {
    id: 2,
    title: 'Xay dung thuong hieu ca nhan',
    subtitle: 'Personal Branding',
    description:
      'Tao dung profile chuyen nghiep tren cac nen tang. Hoc cach dinh vi ban than, xay dung phong cach rieng, va phat trien thuong hieu ca nhan thu hut nha tai tro.',
    lessons: 10,
    difficulty: 'Co ban',
    duration: '5 gio',
    color: 'from-purple-500/20 to-pink-500/20',
    borderColor: 'border-purple-500/30',
    tag: 'PHO BIEN',
  },
  {
    id: 3,
    title: 'Ky nang review san pham',
    subtitle: 'Product Review Skills',
    description:
      'Cach danh gia san pham khach quan va thuyet phuc. Hoc ky thuat quay video review, viet bai review chat luong, va tao noi dung so sanh san pham hieu qua.',
    lessons: 12,
    difficulty: 'Trung binh',
    duration: '6 gio',
    color: 'from-green-500/20 to-emerald-500/20',
    borderColor: 'border-green-500/30',
    tag: 'THUC HANH',
  },
  {
    id: 4,
    title: 'Chien luoc noi dung',
    subtitle: 'Content Strategy',
    description:
      'Lap ke hoach noi dung (content calendar) chuyen nghiep. Nam vung SEO, chien luoc hashtag, va cach toi uu hoa noi dung de tang do phu song va tuong tac.',
    lessons: 10,
    difficulty: 'Trung binh',
    duration: '5 gio',
    color: 'from-orange-500/20 to-yellow-500/20',
    borderColor: 'border-orange-500/30',
    tag: 'CHIEN LUOC',
  },
  {
    id: 5,
    title: 'Web3 & Blockchain co ban',
    subtitle: 'Web3 Fundamentals',
    description:
      'Lam quen voi vi dien tu, token, NFT va xac minh on-chain. Hieu cach blockchain dam bao tinh minh bach trong affiliate marketing va bao ve quyen loi KOC.',
    lessons: 8,
    difficulty: 'Nang cao',
    duration: '5 gio',
    color: 'from-indigo-500/20 to-blue-500/20',
    borderColor: 'border-indigo-500/30',
    tag: 'CONG NGHE',
  },
  {
    id: 6,
    title: 'Toi uu hoa hong',
    subtitle: 'Commission Optimization',
    description:
      'Chien luoc toi uu hoa thu nhap tu hoa hong. Hoc cach doc analytics, ap dung growth hacking, va xay dung he thong thu nhap thu dong ben vung.',
    lessons: 10,
    difficulty: 'Nang cao',
    duration: '6 gio',
    color: 'from-rose-500/20 to-red-500/20',
    borderColor: 'border-rose-500/30',
    tag: 'THU NHAP',
  },
];

// ─── Difficulty Badge ───────────────────────────────────────
function DifficultyBadge({ level }: { level: string }) {
  const colorMap: Record<string, string> = {
    'Co ban': 'bg-green-500/20 text-green-400',
    'Trung binh': 'bg-yellow-500/20 text-yellow-400',
    'Nang cao': 'bg-red-500/20 text-red-400',
  };
  return (
    <span
      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${colorMap[level] ?? 'bg-muted text-muted-foreground'}`}
    >
      {level}
    </span>
  );
}

// ─── Stats ──────────────────────────────────────────────────
const STATS = [
  { value: '6', label: 'Module hoc tap' },
  { value: '58', label: 'Bai hoc chi tiet' },
  { value: '31h+', label: 'Noi dung video & bai doc' },
  { value: '100%', label: 'Mien phi cho thanh vien' },
];

// ─── Page ───────────────────────────────────────────────────
export default function AcademyPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      {/* ── Hero Section ─────────────────────────────────── */}
      <section className="mb-12 rounded-2xl bg-gradient-to-br from-primary/10 via-purple-500/10 to-blue-500/10 p-8 md:p-12">
        <div className="max-w-3xl">
          <p className="mb-2 text-sm font-semibold uppercase tracking-widest text-primary">
            Chuong trinh dao tao
          </p>
          <h1 className="text-3xl font-bold md:text-4xl lg:text-5xl">
            KOC Academy — Hoc vien KOC
          </h1>
          <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
            Hoc cach tro thanh mot KOC chuyen nghiep tu con so khong. Chuong trinh dao tao
            toan dien giup ban nam vung ky nang review san pham, xay dung thuong hieu ca nhan,
            va toi uu thu nhap hoa hong tren nen tang Web3.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <a href="#modules">
              <Button size="lg">Bat dau hoc ngay</Button>
            </a>
            <a href="#loi-ich">
              <Button size="lg" variant="outline">Tim hieu them</Button>
            </a>
          </div>
        </div>

        {/* Stats row */}
        <div className="mt-10 grid grid-cols-2 gap-4 md:grid-cols-4">
          {STATS.map((s) => (
            <div
              key={s.label}
              className="rounded-lg border border-border bg-card/50 px-4 py-3 text-center"
            >
              <p className="text-2xl font-bold text-primary">{s.value}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Lo trinh hoc tap ─────────────────────────────── */}
      <section id="modules" className="mb-16 scroll-mt-20">
        <div className="mb-8 text-center">
          <h2 className="text-2xl font-bold md:text-3xl">Lo trinh hoc tap</h2>
          <p className="mt-2 text-muted-foreground">
            6 module duoc thiet ke bai ban, tu co ban den nang cao, giup ban lam chu nghe KOC.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {MODULES.map((m) => (
            <div
              key={m.id}
              className={`group relative flex flex-col rounded-xl border ${m.borderColor} bg-card p-6 transition-all hover:-translate-y-1 hover:shadow-lg`}
            >
              {/* Tag */}
              <span className="mb-3 self-start rounded bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary">
                {m.tag}
              </span>

              {/* Module number + gradient bar */}
              <div
                className={`mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br ${m.color} text-lg font-bold`}
              >
                {m.id}
              </div>

              <h3 className="text-lg font-semibold">{m.title}</h3>
              <p className="mb-1 text-xs font-medium text-muted-foreground">{m.subtitle}</p>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">
                {m.description}
              </p>

              {/* Meta */}
              <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-border pt-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <span className="inline-block h-3 w-3 rounded-sm bg-primary/30" />
                  {m.lessons} bai hoc
                </span>
                <span className="flex items-center gap-1">
                  <span className="inline-block h-3 w-3 rounded-full border border-muted-foreground/40" />
                  {m.duration}
                </span>
                <DifficultyBadge level={m.difficulty} />
              </div>

              {/* Hover overlay hint */}
              <div className="mt-4">
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full opacity-80 transition-opacity group-hover:opacity-100"
                >
                  Xem chi tiet
                </Button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Loi ich ──────────────────────────────────────── */}
      <section id="loi-ich" className="mb-16 scroll-mt-20">
        <div className="rounded-2xl border border-border bg-card p-8 md:p-12">
          <h2 className="mb-6 text-center text-2xl font-bold md:text-3xl">
            Tai sao chon KOC Academy?
          </h2>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {[
              {
                title: 'Hoc tu chuyen gia',
                desc: 'Noi dung duoc bien soan boi cac KOC hang dau va chuyen gia marketing voi nhieu nam kinh nghiem thuc chien.',
              },
              {
                title: 'Thuc hanh ngay tren nen tang',
                desc: 'Moi bai hoc gan voi bai tap thuc hanh tren WellKOC, giup ban ap dung kien thuc vao thuc te ngay lap tuc.',
              },
              {
                title: 'Chung chi on-chain',
                desc: 'Hoan thanh khoa hoc de nhan chung chi NFT xac minh tren blockchain — minh chung nang luc khong the gia mao.',
              },
              {
                title: 'Cong dong ho tro',
                desc: 'Tham gia cong dong KOC de chia se kinh nghiem, hoc hoi lan nhau, va nhan co hoi hop tac voi cac thuong hieu.',
              },
            ].map((item) => (
              <div key={item.title} className="flex gap-4">
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10 text-sm font-bold text-primary">
                  --
                </div>
                <div>
                  <h3 className="font-semibold">{item.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA Section ──────────────────────────────────── */}
      <section className="mb-8">
        <div className="rounded-2xl bg-gradient-to-r from-primary/20 via-purple-500/15 to-blue-500/20 p-8 text-center md:p-12">
          <h2 className="text-2xl font-bold md:text-3xl">
            San sang tro thanh KOC chuyen nghiep?
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
            Dang ky ngay de bat dau hanh trinh hoc tap. Hoan toan mien phi cho tat ca thanh vien
            WellKOC. Hoan thanh chuong trinh va nhan chung chi NFT dac biet.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-4">
            <Button size="lg">Dang ky hoc ngay</Button>
            <Button size="lg" variant="outline">
              Xem lich hoc
            </Button>
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            Khong yeu cau kinh nghiem truoc do — bat dau tu Module 1 va tien buoc tung ngay.
          </p>
        </div>
      </section>
    </div>
  );
}
