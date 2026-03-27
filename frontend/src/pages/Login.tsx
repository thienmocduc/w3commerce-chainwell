import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@hooks/useAuth';

function WKLogo({ size = 48 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 38 38" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="wkGradL" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#22c55e"/><stop offset="33%" stopColor="#06b6d4"/>
          <stop offset="66%" stopColor="#6366f1"/><stop offset="100%" stopColor="#a855f7"/>
        </linearGradient>
        <filter id="wkGlowL"><feGaussianBlur stdDeviation="1.5" result="blur"/><feComposite in="SourceGraphic" in2="blur" operator="over"/></filter>
      </defs>
      <circle cx="19" cy="19" r="17.5" stroke="url(#wkGradL)" strokeWidth="1" opacity={0.6}/>
      <circle cx="19" cy="19" r="13" stroke="url(#wkGradL)" strokeWidth="0.5" opacity={0.35}/>
      <path d="M7 11L10.5 24L14 16L17.5 24L21 11" stroke="url(#wkGradL)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M23 11V27M23 19L31 11M23 19L31 27" stroke="url(#wkGradL)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx="19" cy="19" r="2.5" fill="url(#wkGradL)" filter="url(#wkGlowL)"/>
      <path d="M19 19 L23 19" stroke="url(#wkGradL)" strokeWidth="0.8" strokeDasharray="2 1" opacity={0.5}/>
    </svg>
  );
}

type RoleTab = 'buyer' | 'koc' | 'vendor';

const roleTabs: { key: RoleTab; label: string; icon: string }[] = [
  { key: 'buyer', label: 'Người mua', icon: '🛒' },
  { key: 'koc', label: 'KOC/KOL', icon: '🌟' },
  { key: 'vendor', label: 'Vendor', icon: '🏪' },
];

/* ── CSS inject (media query đảm bảo hoạt động trên mobile thật) ── */
const LOGIN_CSS = `
.login-wrap { min-height:100dvh; display:flex; flex-direction:row; }
.login-brand { flex:0 0 50%; display:flex; flex-direction:column; align-items:center; justify-content:center; padding:60px 48px; position:relative; overflow:hidden; background:linear-gradient(135deg,#0f0c29 0%,#302b63 50%,#24243e 100%); }
.login-form { flex:1; min-width:0; display:flex; align-items:center; justify-content:center; background:var(--bg-0); padding:28px 32px; position:relative; overflow-y:auto; }
.login-form-inner { width:100%; max-width:380px; }
.login-mobile-header { display:none; }

@media (max-width: 768px) {
  .login-wrap { flex-direction:column; }
  .login-brand { display:none !important; }
  .login-form { align-items:flex-start; padding:0 0 24px; }
  .login-form-inner { max-width:100%; }
  .login-mobile-header {
    display:block; text-align:center; padding:28px 20px 22px;
    background:linear-gradient(135deg,#0f0c29 0%,#302b63 50%,#24243e 100%);
    border-radius:0 0 24px 24px; position:relative; overflow:hidden; margin-bottom:20px;
  }
  .login-content { padding:0 16px; }
}
`;

export default function Login() {
  const { loginAsync, loginWithGoogle, loginWithFacebook } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectTo = searchParams.get('redirect');

  const [activeRole, setActiveRole] = useState<RoleTab>('buyer');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isAdminMode, setIsAdminMode] = useState(false);

  // Inject CSS once
  useEffect(() => {
    const id = 'login-responsive-css';
    if (!document.getElementById(id)) {
      const style = document.createElement('style');
      style.id = id;
      style.textContent = LOGIN_CSS;
      document.head.appendChild(style);
    }
    return () => { document.getElementById(id)?.remove(); };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const role = isAdminMode ? 'admin' : activeRole === 'koc' ? 'koc' : activeRole === 'vendor' ? 'vendor' : 'user';
    const result = await loginAsync(email, password, role as any);
    setLoading(false);
    if (result.success) {
      if (redirectTo) navigate(redirectTo);
      else if (isAdminMode) navigate('/admin');
      else if (activeRole === 'vendor') navigate('/vendor');
      else if (activeRole === 'koc') navigate('/koc');
      else navigate('/dashboard');
    } else {
      setError(result.error || 'Đăng nhập thất bại');
    }
  };

  const handleGoogleLogin = async () => {
    setError('');
    const result = await loginWithGoogle();
    if (!result.success) {
      setError(result.error || 'Đăng nhập Google thất bại');
    }
  };

  const handleFacebookLogin = async () => {
    setError('');
    const result = await loginWithFacebook();
    if (!result.success) {
      setError(result.error || 'Đăng nhập Facebook thất bại');
    }
  };

  const handleVNeIDLogin = async () => {
    setError('');
    try {
      // Call backend to get VNeID OAuth URL
      const res = await fetch('/api/v1/verify/vneid/auth-url', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('access_token') || ''}` },
      });
      if (res.ok) {
        const data = await res.json();
        window.location.href = data.auth_url;
      } else {
        setError('Không thể kết nối VNeID. Vui lòng thử lại.');
      }
    } catch {
      setError('Không thể kết nối VNeID. Vui lòng thử lại.');
    }
  };

  return (
    <div className="login-wrap">
      {/* ── Desktop Left Brand Panel ── */}
      <div className="login-brand">
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 80% 60% at 20% 20%, rgba(99,102,241,.3) 0%, transparent 60%), radial-gradient(ellipse 60% 50% at 80% 80%, rgba(168,85,247,.25) 0%, transparent 50%)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', width: 200, height: 200, borderRadius: '50%', background: 'radial-gradient(circle, rgba(99,102,241,.2) 0%, transparent 70%)', top: '10%', left: '10%', filter: 'blur(40px)' }} />
        <div style={{ position: 'absolute', width: 150, height: 150, borderRadius: '50%', background: 'radial-gradient(circle, rgba(168,85,247,.2) 0%, transparent 70%)', bottom: '20%', right: '15%', filter: 'blur(30px)' }} />

        <div style={{ position: 'relative', zIndex: 1, textAlign: 'center', maxWidth: 400 }}>
          <div style={{ margin: '0 auto 24px', width: 96, height: 96, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><WKLogo size={96} /></div>

          <h1 style={{ fontFamily: "'Noto Sans', sans-serif", fontWeight: 800, fontSize: '2.6rem', background: 'linear-gradient(90deg, #22c55e, #06b6d4, #6366f1, #a855f7)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', marginBottom: 16 }}>WellKOC</h1>

          <p style={{ color: 'rgba(255,255,255,.7)', fontSize: '1.15rem', lineHeight: 1.7, maxWidth: 360, margin: '0 auto' }}>Nền tảng Web3 Social Commerce<br />hàng đầu Việt Nam</p>

          <div style={{ display: 'flex', gap: 24, justifyContent: 'center', marginTop: 40, padding: '20px 0', borderTop: '1px solid rgba(255,255,255,.08)', borderBottom: '1px solid rgba(255,255,255,.08)' }}>
            {[{ value: '10K+', label: 'Thành viên' }, { value: '500+', label: 'KOC/KOL' }, { value: '1K+', label: 'Sản phẩm' }].map(s => (
              <div key={s.label} style={{ textAlign: 'center' }}>
                <div style={{ fontWeight: 800, fontSize: '1.3rem', color: '#fff' }}>{s.value}</div>
                <div style={{ fontSize: '.7rem', color: 'rgba(255,255,255,.45)', marginTop: 2 }}>{s.label}</div>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 28, flexWrap: 'wrap' }}>
            {['DPP Verified', 'KOC Network', 'Blockchain', 'XP Rewards'].map(f => (
              <span key={f} style={{ padding: '7px 16px', borderRadius: 20, background: 'rgba(255,255,255,.08)', border: '1px solid rgba(255,255,255,.1)', color: 'rgba(255,255,255,.5)', fontSize: '.75rem', backdropFilter: 'blur(10px)' }}>{f}</span>
            ))}
          </div>
        </div>
      </div>

      {/* ── Right Side Form ── */}
      <div className="login-form">
        <div className="login-form-inner">

          {/* Mobile Header */}
          <div className="login-mobile-header">
            <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 80% 60% at 20% 20%, rgba(99,102,241,.2) 0%, transparent 60%)', pointerEvents: 'none' }} />
            <div style={{ position: 'relative', zIndex: 1 }}>
              <WKLogo size={48} />
              <div style={{ fontFamily: "'Noto Sans', sans-serif", fontWeight: 800, fontSize: '1.3rem', background: 'linear-gradient(90deg, #22c55e, #06b6d4, #6366f1, #a855f7)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', marginTop: 6 }}>WellKOC</div>
              <p style={{ color: 'rgba(255,255,255,.5)', fontSize: '.72rem', marginTop: 4 }}>Nền tảng Web3 Social Commerce hàng đầu Việt Nam</p>
            </div>
          </div>

          <div className="login-content">
            {/* Header */}
            <div style={{ marginBottom: 16 }}>
              <h2 style={{ fontSize: '1.3rem', fontWeight: 800, marginBottom: 4, color: 'var(--text-1)' }}>
                {isAdminMode ? 'Đăng nhập Admin' : 'Chào mừng trở lại'}
              </h2>
              <p style={{ color: 'var(--text-3)', fontSize: '.82rem' }}>
                {isAdminMode ? 'Nhập thông tin quản trị viên' : 'Đăng nhập vào tài khoản của bạn để tiếp tục'}
              </p>
            </div>

            {/* Role Tabs */}
            {!isAdminMode && (
              <div style={{ display: 'flex', gap: 4, padding: 3, borderRadius: 12, background: 'var(--bg-2)', marginBottom: 16 }}>
                {roleTabs.map(tab => (
                  <button
                    key={tab.key}
                    onClick={() => setActiveRole(tab.key)}
                    style={{
                      flex: 1, padding: '8px 6px', borderRadius: 9,
                      border: 'none', cursor: 'pointer',
                      background: activeRole === tab.key ? 'var(--surface-card)' : 'transparent',
                      boxShadow: activeRole === tab.key ? 'var(--shadow-sm, 0 1px 3px rgba(0,0,0,.1))' : 'none',
                      color: activeRole === tab.key ? 'var(--text-1)' : 'var(--text-3)',
                      fontWeight: activeRole === tab.key ? 700 : 500,
                      fontSize: '.78rem', fontFamily: 'var(--ff-body, system-ui)',
                      transition: 'all .2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                    }}
                  >
                    <span>{tab.icon}</span>{tab.label}
                  </button>
                ))}
              </div>
            )}

            {/* Error */}
            {error && (
              <div style={{ padding: '12px 16px', borderRadius: 12, marginBottom: 16, background: 'rgba(239,68,68,.08)', color: '#ef4444', fontSize: '.82rem', border: '1px solid rgba(239,68,68,.15)' }}>{error}</div>
            )}

            {/* Login Form */}
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ position: 'relative' }}>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} onFocus={() => setEmailFocused(true)} onBlur={() => setEmailFocused(false)} required placeholder=" "
                  style={{ width: '100%', padding: '20px 16px 8px', borderRadius: 12, border: '1px solid', borderColor: emailFocused ? 'var(--c7-500, #6366f1)' : 'var(--border)', background: 'var(--bg-2)', color: 'var(--text-1)', fontSize: '.88rem', outline: 'none', fontFamily: 'var(--ff-body, system-ui)', transition: 'border-color .2s' }} />
                <label style={{ position: 'absolute', left: 16, top: email || emailFocused ? 6 : 14, fontSize: email || emailFocused ? '.65rem' : '.82rem', color: emailFocused ? 'var(--c7-500, #6366f1)' : 'var(--text-4)', transition: 'all .2s', pointerEvents: 'none', fontWeight: 600, letterSpacing: '.02em' }}>Email</label>
              </div>

              <div style={{ position: 'relative' }}>
                <input type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} onFocus={() => setPasswordFocused(true)} onBlur={() => setPasswordFocused(false)} required placeholder=" "
                  style={{ width: '100%', padding: '20px 48px 8px 16px', borderRadius: 12, border: '1px solid', borderColor: passwordFocused ? 'var(--c7-500, #6366f1)' : 'var(--border)', background: 'var(--bg-2)', color: 'var(--text-1)', fontSize: '.88rem', outline: 'none', fontFamily: 'var(--ff-body, system-ui)', transition: 'border-color .2s' }} />
                <button type="button" onClick={() => setShowPassword(!showPassword)} style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', fontSize: '1rem', padding: 4, display: 'flex', alignItems: 'center' }} tabIndex={-1}>{showPassword ? '🙈' : '👁️'}</button>
                <label style={{ position: 'absolute', left: 16, top: password || passwordFocused ? 6 : 14, fontSize: password || passwordFocused ? '.65rem' : '.82rem', color: passwordFocused ? 'var(--c7-500, #6366f1)' : 'var(--text-4)', transition: 'all .2s', pointerEvents: 'none', fontWeight: 600, letterSpacing: '.02em' }}>Mật khẩu</label>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <Link to="#" style={{ color: 'var(--c6-300, #06b6d4)', textDecoration: 'none', fontSize: '.78rem', fontWeight: 600 }}>Quên mật khẩu?</Link>
              </div>

              <button type="submit" className="btn btn-primary btn-lg" disabled={loading} style={{ width: '100%', padding: '12px 24px', opacity: loading ? 0.7 : 1, fontSize: '.88rem' }}>
                {loading ? 'Đang xử lý...' : 'Đăng nhập'}
              </button>
            </form>

            {/* Divider */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, margin: '16px 0' }}>
              <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
              <span style={{ fontSize: '.68rem', color: 'var(--text-4)', textTransform: 'uppercase', letterSpacing: '.08em' }}>hoặc</span>
              <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
            </div>

            {/* Social Login */}
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-secondary" onClick={handleGoogleLogin} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '10px 12px', fontSize: '.78rem' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
                Google
              </button>
              <button className="btn btn-secondary" onClick={handleFacebookLogin} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '10px 12px', fontSize: '.78rem' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="#1877F2"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                Facebook
              </button>
              <button className="btn btn-secondary" onClick={() => console.log('Wallet connect coming soon')} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '10px 12px', fontSize: '.78rem' }}>
                <span style={{ fontSize: '.9rem' }}>🔗</span>Wallet
              </button>
            </div>

            {/* VNeID Login */}
            <button
              onClick={handleVNeIDLogin}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                padding: '10px 12px', fontSize: '.78rem', fontWeight: 600,
                background: '#dc2626', color: '#fff', border: 'none', borderRadius: 12,
                cursor: 'pointer', transition: 'opacity .2s', fontFamily: 'var(--ff-body, system-ui)',
                marginTop: 8,
              }}
              onMouseEnter={e => (e.currentTarget.style.opacity = '0.9')}
              onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
            >
              <span style={{ fontSize: '.9rem' }}>🇻🇳</span>
              VNeID
              <span style={{ fontSize: '.65rem', opacity: 0.8, marginLeft: 4 }}>Định danh điện tử</span>
            </button>

            {/* Register Link */}
            <p style={{ textAlign: 'center', marginTop: 16, fontSize: '.82rem', color: 'var(--text-3)' }}>
              Chưa có tài khoản?{' '}
              <Link to="/register" style={{ color: 'var(--c6-300, #06b6d4)', textDecoration: 'none', fontWeight: 700 }}>Đăng ký ngay</Link>
            </p>

            {/* Admin link - separate page */}
            <div style={{ textAlign: 'center', marginTop: 10 }}>
              <a href="/admin/login" style={{ color: 'var(--text-4)', fontSize: '.65rem', textDecoration: 'none', opacity: 0.4 }}>Admin Panel →</a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
