'use client';

import Link from 'next/link';
import { useUser } from '@/hooks/useUser';
import { useCart } from '@/hooks/useCart';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ShoppingCart } from 'lucide-react';
import { useAccount, useChainId } from 'wagmi';

const CHAIN_NAMES: Record<number, { name: string; isMainnet: boolean }> = {
  1: { name: 'Ethereum', isMainnet: true },
  137: { name: 'Polygon', isMainnet: true },
  56: { name: 'BSC', isMainnet: true },
  42161: { name: 'Arbitrum', isMainnet: true },
  10: { name: 'Optimism', isMainnet: true },
  8453: { name: 'Base', isMainnet: true },
  11155111: { name: 'Sepolia', isMainnet: false },
  80002: { name: 'Amoy', isMainnet: false },
  97: { name: 'BSC Testnet', isMainnet: false },
  421614: { name: 'Arb Sepolia', isMainnet: false },
  84532: { name: 'Base Sepolia', isMainnet: false },
};

function NetworkIndicator() {
  const { isConnected } = useAccount();
  const chainId = useChainId();

  if (!isConnected) {
    return (
      <span className="hidden text-xs text-muted-foreground md:inline-flex items-center gap-1">
        Not connected
      </span>
    );
  }

  const chain = chainId ? CHAIN_NAMES[chainId] : null;
  const name = chain?.name ?? `Chain ${chainId}`;
  const isMainnet = chain?.isMainnet ?? false;

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/50 px-2 py-0.5 text-xs">
      <span
        className={`h-2 w-2 rounded-full ${isMainnet ? 'bg-green-500' : 'bg-yellow-500'}`}
      />
      {name}
    </span>
  );
}

export function NavBar() {
  const { profile, loading } = useUser();
  const { totalItems } = useCart();
  const router = useRouter();

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
  }

  return (
    <nav className="sticky top-0 z-50 border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4">
        <div className="flex items-center gap-6">
          <Link href="/" className="text-lg font-bold">
            WellKOC
          </Link>
          <div className="hidden items-center gap-4 md:flex">
            <Link href="/products" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Products
            </Link>
            <Link href="/academy" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Academy
            </Link>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <NetworkIndicator />

          <Link
            href="/cart"
            className="relative text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ShoppingCart className="h-5 w-5" />
            {totalItems > 0 && (
              <span className="absolute -right-2.5 -top-2 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                {totalItems > 9 ? '9+' : totalItems}
              </span>
            )}
          </Link>

          {loading ? (
            <div className="h-8 w-20 animate-pulse rounded bg-muted" />
          ) : profile ? (
            <>
              <Link href="/orders" className="hidden text-sm text-muted-foreground hover:text-foreground md:block transition-colors">
                Orders
              </Link>
              {profile.role === 'vendor' && (
                <Link href="/vendor/dashboard">
                  <Button variant="ghost" size="sm">Vendor</Button>
                </Link>
              )}
              {profile.role === 'koc' && (
                <Link href="/koc/dashboard">
                  <Button variant="ghost" size="sm">KOC</Button>
                </Link>
              )}
              {profile.role === 'admin' && (
                <Link href="/admin/dashboard">
                  <Button variant="ghost" size="sm">Admin</Button>
                </Link>
              )}
              <span className="text-xs text-muted-foreground">
                Lv.{profile.level} · {profile.xp_points} XP
              </span>
              <Button variant="outline" size="sm" onClick={handleSignOut}>
                Sign Out
              </Button>
            </>
          ) : (
            <>
              <Link href="/login">
                <Button variant="ghost" size="sm">Login</Button>
              </Link>
              <Link href="/register">
                <Button size="sm">Register</Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
