'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import type { UserRole } from '@/lib/types/database.types';

const ROLES: { value: UserRole; label: string; description: string }[] = [
  { value: 'user', label: 'Người mua', description: 'Mua sắm sản phẩm' },
  { value: 'vendor', label: 'Nhà bán hàng', description: 'Bán sản phẩm trên nền tảng' },
  { value: 'koc', label: 'KOC/KOL', description: 'Quảng bá sản phẩm và nhận hoa hồng' },
];

export default function RegisterPage() {
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState<UserRole>('user');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const router = useRouter();

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Mật khẩu không khớp');
      return;
    }

    if (password.length < 8) {
      setError('Mật khẩu phải có ít nhất 8 ký tự');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, phone: phone || undefined, password, role }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Đăng ký thất bại');
        setLoading(false);
        return;
      }

      setSuccess(true);
      setLoading(false);

      // Auto-redirect to login after 2 seconds
      setTimeout(() => router.push('/login'), 2000);
    } catch {
      setError('Lỗi mạng. Vui lòng thử lại.');
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="w-full max-w-sm text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
            <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-xl font-bold">Tạo tài khoản thành công!</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Tài khoản của bạn đã được tạo thành công. Đang chuyển hướng đến trang đăng nhập...
          </p>
          <Link href="/login">
            <Button className="mt-6" variant="outline">
              Đi đến trang Đăng nhập
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold">Tạo tài khoản</h1>
          <p className="mt-1 text-sm text-muted-foreground">Tham gia hệ sinh thái WellKOC</p>
        </div>

        <form onSubmit={handleRegister} className="space-y-4">
          {error && (
            <div className="rounded-md bg-red-500/10 px-3 py-2 text-sm text-red-500">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="email" className="mb-1 block text-sm font-medium">Email</label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label htmlFor="phone" className="mb-1 block text-sm font-medium">
              Số điện thoại <span className="text-xs text-muted-foreground">(không bắt buộc)</span>
            </label>
            <input
              id="phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="VD: 0901234567"
            />
          </div>

          <div>
            <label htmlFor="password" className="mb-1 block text-sm font-medium">Mật khẩu</label>
            <input
              id="password"
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="Tối thiểu 8 ký tự"
            />
          </div>

          <div>
            <label htmlFor="confirm" className="mb-1 block text-sm font-medium">Xác nhận mật khẩu</label>
            <input
              id="confirm"
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="Nhập lại mật khẩu"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">Tôi là...</label>
            <div className="space-y-2">
              {ROLES.map((r) => (
                <label
                  key={r.value}
                  className={`flex cursor-pointer items-center gap-3 rounded-md border px-3 py-2.5 transition-colors ${
                    role === r.value
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-border/80'
                  }`}
                >
                  <input
                    type="radio"
                    name="role"
                    value={r.value}
                    checked={role === r.value}
                    onChange={() => setRole(r.value)}
                    className="sr-only"
                  />
                  <div>
                    <p className="text-sm font-medium">{r.label}</p>
                    <p className="text-xs text-muted-foreground">{r.description}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Đang tạo tài khoản...' : 'Tạo tài khoản'}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Đã có tài khoản?{' '}
          <Link href="/login" className="font-medium text-primary hover:underline">
            Đăng nhập
          </Link>
        </p>
      </div>
    </div>
  );
}
