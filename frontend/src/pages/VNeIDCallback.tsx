import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@hooks/useAuth';

const API_BASE = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api/v1`
  : '/api/v1';

export default function VNeIDCallback() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { login } = useAuth();
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [error, setError] = useState('');

  useEffect(() => {
    const code = searchParams.get('code');
    const state = searchParams.get('state');

    if (!code || !state) {
      setStatus('error');
      setError('Thiếu thông tin xác thực từ VNeID');
      return;
    }

    (async () => {
      try {
        const res = await fetch(`${API_BASE}/verify/vneid/callback`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code, state }),
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.detail || 'Xác thực VNeID thất bại');
        }

        const data = await res.json();
        if (data.access_token && data.user) {
          login(
            {
              id: data.user.id,
              email: data.user.email || '',
              name: data.user.full_name || data.user.display_name || 'User',
              role: data.user.role || 'user',
              avatar: data.user.avatar_url,
            },
            data.access_token,
          );
          setStatus('success');
          setTimeout(() => navigate('/dashboard'), 1500);
        } else {
          setStatus('success');
          setTimeout(() => navigate('/dashboard'), 1500);
        }
      } catch (err: any) {
        setStatus('error');
        setError(err.message || 'Xác thực VNeID thất bại');
      }
    })();
  }, [searchParams, login, navigate]);

  return (
    <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-0)' }}>
      <div style={{ textAlign: 'center', padding: 40 }}>
        {status === 'processing' && (
          <>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🇻🇳</div>
            <h2 style={{ color: 'var(--text-1)', marginBottom: 8 }}>Đang xác thực VNeID...</h2>
            <p style={{ color: 'var(--text-3)', fontSize: '.85rem' }}>Vui lòng chờ trong giây lát</p>
          </>
        )}
        {status === 'success' && (
          <>
            <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
            <h2 style={{ color: 'var(--text-1)', marginBottom: 8 }}>Xác thực thành công!</h2>
            <p style={{ color: 'var(--text-3)', fontSize: '.85rem' }}>Đang chuyển hướng...</p>
          </>
        )}
        {status === 'error' && (
          <>
            <div style={{ fontSize: 48, marginBottom: 16 }}>❌</div>
            <h2 style={{ color: 'var(--text-1)', marginBottom: 8 }}>Xác thực thất bại</h2>
            <p style={{ color: '#ef4444', fontSize: '.85rem', marginBottom: 16 }}>{error}</p>
            <button onClick={() => navigate('/login')} className="btn btn-primary" style={{ padding: '10px 24px' }}>
              Quay lại đăng nhập
            </button>
          </>
        )}
      </div>
    </div>
  );
}
