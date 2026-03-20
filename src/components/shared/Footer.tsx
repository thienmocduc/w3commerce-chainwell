import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="border-t bg-background text-muted-foreground">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {/* About */}
          <div>
            <h3 className="mb-4 text-lg font-semibold text-foreground">Về WellKOC</h3>
            <p className="text-sm leading-relaxed">
              WellKOC là nền tảng thương mại xã hội Web3 kết nối KOC/KOL với thương hiệu,
              tích hợp AI và blockchain để mang đến trải nghiệm mua sắm minh bạch và đáng tin cậy.
            </p>
          </div>

          {/* Links */}
          <div>
            <h3 className="mb-4 text-lg font-semibold text-foreground">Liên kết</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/" className="transition-colors hover:text-foreground">
                  Trang chủ
                </Link>
              </li>
              <li>
                <Link href="/products" className="transition-colors hover:text-foreground">
                  Sản phẩm
                </Link>
              </li>
              <li>
                <Link href="/academy" className="transition-colors hover:text-foreground">
                  Academy
                </Link>
              </li>
              <li>
                <Link href="/marketplace" className="transition-colors hover:text-foreground">
                  Marketplace
                </Link>
              </li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h3 className="mb-4 text-lg font-semibold text-foreground">Hỗ trợ</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/contact" className="transition-colors hover:text-foreground">
                  Liên hệ
                </Link>
              </li>
              <li>
                <Link href="/faq" className="transition-colors hover:text-foreground">
                  FAQ
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="transition-colors hover:text-foreground">
                  Chính sách bảo mật
                </Link>
              </li>
              <li>
                <Link href="/terms" className="transition-colors hover:text-foreground">
                  Điều khoản dịch vụ
                </Link>
              </li>
            </ul>
          </div>

          {/* Connect */}
          <div>
            <h3 className="mb-4 text-lg font-semibold text-foreground">Kết nối</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <a
                  href="https://facebook.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="transition-colors hover:text-foreground"
                >
                  Facebook
                </a>
              </li>
              <li>
                <a
                  href="https://twitter.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="transition-colors hover:text-foreground"
                >
                  Twitter / X
                </a>
              </li>
              <li>
                <a
                  href="https://instagram.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="transition-colors hover:text-foreground"
                >
                  Instagram
                </a>
              </li>
              <li>
                <a
                  href="https://tiktok.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="transition-colors hover:text-foreground"
                >
                  TikTok
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Copyright */}
        <div className="mt-10 border-t pt-6 text-center text-sm">
          &copy; 2024 WellKOC. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
