import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { cn } from '@/lib/utils';
import { Providers } from '@/components/providers/Providers';
import Footer from '@/components/shared/Footer';

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' });

export const metadata: Metadata = {
  title: 'WellKOC - Nền tảng Social Commerce Web3',
  description: 'WellKOC kết nối KOC, nhà bán hàng và người mua trên nền tảng Web3 minh bạch. Hoa hồng on-chain, AI matching, DPP verification.',
  openGraph: {
    title: 'WellKOC - Social Commerce Web3',
    description: 'Nền tảng Social Commerce Web3 đầu tiên tại Việt Nam',
    url: 'https://wellkoc.com',
    siteName: 'WellKOC',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <body className={cn('min-h-screen bg-background font-sans antialiased', inter.variable)}>
        <Providers>
          {children}
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
