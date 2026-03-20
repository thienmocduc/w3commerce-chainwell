'use client';

import { useState } from 'react';
import { useConnect, useAccount, useSignMessage, useDisconnect } from 'wagmi';
import { SiweMessage } from 'siwe';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

export function Web3LoginButton() {
  const { connect, connectors } = useConnect();
  const { address, isConnected, chainId } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const { disconnect } = useDisconnect();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  async function handleWeb3Login() {
    try {
      setLoading(true);
      setError('');

      const walletAddress = address;
      const walletChainId = chainId;

      // Connect wallet if not connected
      if (!isConnected) {
        const metamask = connectors.find((c) => c.id === 'metaMask');
        if (metamask) {
          await connect({ connector: metamask });
          // Wait briefly for state to update
          await new Promise((resolve) => setTimeout(resolve, 500));
        }
      }

      if (!walletAddress) {
        setError('Please connect your wallet first');
        setLoading(false);
        return;
      }

      // 1. Get nonce from server
      const nonceRes = await fetch('/api/auth/web3/nonce');
      const { nonce } = await nonceRes.json();

      if (!nonce) {
        setError('Failed to get nonce');
        setLoading(false);
        return;
      }

      // 2. Create SIWE message
      const siweMessage = new SiweMessage({
        domain: window.location.host,
        address: walletAddress,
        statement: 'Sign in to WellKOC',
        uri: window.location.origin,
        version: '1',
        chainId: walletChainId ?? 137,
        nonce,
      });

      const messageString = siweMessage.prepareMessage();

      // 3. Sign message
      const signature = await signMessageAsync({ message: messageString });

      // 4. Verify on server
      const verifyRes = await fetch('/api/auth/web3/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: messageString,
          signature,
        }),
      });

      const result = await verifyRes.json();

      if (!verifyRes.ok) {
        setError(result.error || 'Verification failed');
        setLoading(false);
        return;
      }

      // 5. Store session and redirect
      if (result.sessionToken) {
        document.cookie = `w3c_session=${result.sessionToken}; path=/; max-age=${7 * 24 * 60 * 60}; samesite=lax`;
      }

      router.push('/');
      router.refresh();
    } catch (err) {
      console.error('Web3 login error:', err);
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-2">
      {error && (
        <div className="rounded-md bg-red-500/10 px-3 py-2 text-sm text-red-500">
          {error}
        </div>
      )}

      {isConnected && address ? (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground text-center">
            Connected: {address.slice(0, 6)}...{address.slice(-4)}
          </p>
          <Button
            className="w-full"
            onClick={handleWeb3Login}
            disabled={loading}
          >
            {loading ? 'Signing...' : 'Sign In with Wallet'}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="w-full"
            onClick={() => disconnect()}
          >
            Disconnect
          </Button>
        </div>
      ) : (
        <Button
          variant="outline"
          className="w-full"
          onClick={handleWeb3Login}
          disabled={loading}
        >
          {loading ? 'Connecting...' : 'Connect Wallet'}
        </Button>
      )}
      <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
        {`V\u00ED Web3 gi\u00FAp b\u1EA1n nh\u1EADn hoa h\u1ED3ng tr\u1EF1c ti\u1EBFp tr\u00EAn blockchain. Ch\u01B0a c\u00F3 v\u00ED?`}{' '}
        <a
          href="https://metamask.io"
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-primary hover:underline"
        >
          {`T\u1EA3i MetaMask mi\u1EC5n ph\u00ED t\u1EA1i metamask.io`}
        </a>
      </p>
    </div>
  );
}
