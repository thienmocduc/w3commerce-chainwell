import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@hooks/useAuth';

type RoleOption = 'buyer' | 'koc' | 'vendor';
type Step = 1 | 2 | 3;

const roleCards: { key: RoleOption; icon: string; label: string; desc: string; color: string; gradient: string }[] = [
  {
    key: 'buyer', icon: '🛒', label: 'Người mua',
    desc: 'Mua sắm sản phẩm chính hãng, nhận cashback và XP mỗi đơn hàng',
    color: 'var(--c4-500, #22c55e)', gradient: 'linear-gradient(135deg, rgba(34,197,94,.12), rgba(6,182,212,.08))',
  },
  {
    key: 'koc', icon: '🌟', label: 'KOC / KOL',
    desc: 'Sáng tạo nội dung, review sản phẩm, kiếm hoa hồng từ mạng lưới',
    color: 'var(--c6-500, #06b6d4)', gradient: 'linear-gradient(135deg, rgba(6,182,212,.12), rgba(99,102,241,.08))',
  },
  {
    key: 'vendor', icon: '🏪', label: 'Nhà cung cấp',
    desc: 'Bán sản phẩm, tạo DPP blockchain, kết nối KOC network',
    color: 'var(--c7-500, #6366f1)', gradient: 'linear-gradient(135deg, rgba(99,102,241,.12), rgba(168,85,247,.08))',
  },
];

const stepLabels = ['Chọn vai trò', 'Thông tin', 'Hoàn tất'];

/* ── CSS inject (media query đảm bảo hoạt động trên mobile thật) ── */
const REGISTER_CSS = `
.reg-wrap { min-height:100dvh; display:flex; flex-direction:row; }
.reg-brand { flex:0 0 50%; display:flex; flex-direction:column; align-items:center; justify-content:center; padding:60px 48px; position:relative; overflow:hidden; background:linear-gradient(135deg,#0f0c29 0%,#302b63 50%,#24243e 100%); }
.reg-form { flex:1; min-width:0; display:flex; align-items:center; justify-content:center; background:var(--bg-0); padding:28px 32px; overflow-y:auto; }
.reg-form-inner { width:100%; max-width:420px; }
.reg-mobile-header { display:none; }

@media (max-width: 768px) {
  .reg-wrap { flex-direction:column; }
  .reg-brand { display:none !important; }
  .reg-form { align-items:flex-start; padding:0 0 24px; }
  .reg-form-inner { max-width:100%; }
  .reg-mobile-header {
    display:block; text-align:center; padding:28px 20px 22px;
    background:linear-gradient(135deg,#0f0c29 0%,#302b63 50%,#24243e 100%);
    border-radius:0 0 24px 24px; position:relative; overflow:hidden; margin-bottom:20px;
  }
  .reg-content { padding:0 16px; }
}
`;

export default function Register() {
  const { registerAsync } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState<Step>(1);
  const [selectedRole, setSelectedRole] = useState<RoleOption | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Common fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [showCPw, setShowCPw] = useState(false);

  // KOC fields
  const [socialChannel, setSocialChannel] = useState('');
  const [followers, setFollowers] = useState('');
  const [referralCode, setReferralCode] = useState('');

  // Vendor fields
  const [shopName, setShopName] = useState('');
  const [taxCode, setTaxCode] = useState('');
  const [warehouse, setWarehouse] = useState('');

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '20px 16px 8px',
    borderRadius: 12, border: '1px solid var(--border)',
    background: 'var(--bg-2)', color: 'var(--text-1)',
    fontSize: '.88rem', outline: 'none',
    fontFamily: 'var(--ff-body, system-ui)',
    transition: 'border-color .2s',
  };

  const labelStyle: React.CSSProperties = {
    fontSize: '.68rem', fontWeight: 600, color: 'var(--text-4)',
    marginBottom: 4, display: 'block', letterSpacing: '.02em',
    textTransform: 'uppercase' as const,
  };

  // Inject CSS once
  useEffect(() => {
    const id = 'register-responsive-css';
    if (!document.getElementById(id)) {
      const style = document.createElement('style');
      style.id = id;
      style.textContent = REGISTER_CSS;
      document.head.appendChild(style);
    }
    return () => { document.getElementById(id)?.remove(); };
  }, []);

  const handleStep2Submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Mật khẩu xác nhận không khớp');
      return;
    }
    if (password.length < 6) {
      setError('Mật khẩu phải có ít nhất 6 ký tự');
      return;
    }

    setLoading(true);
    const role = selectedRole === 'koc' ? 'koc' : selectedRole === 'vendor' ? 'vendor' : 'user';
    const result = await registerAsync({
      email,
      password,
      name,
      role: role as any,
      phone: phone || undefined,
      referral_code: referralCode || undefined,
    });
    setLoading(false);
    if (result.success) {
      if (result.error === 'confirm_email') {
        // Supabase requires email confirmation
        setStep(3);
      } else {
        // Auto-confirmed — go to step 3 then dashboard
        setStep(3);
      }
    } else {
      setError(result.error || 'Đăng ký thất bại. Vui lòng thử lại.');
    }
  };

  const goToDashboard = () => {
    if (selectedRole === 'vendor') navigate('/vendor');
    else if (selectedRole === 'koc') navigate('/koc');
    else navigate('/dashboard');
  };

  return (
    <div className="reg-wrap">
      {/* ── Desktop Left Brand Panel ── */}
      <div className="reg-brand">
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 80% 60% at 30% 30%, rgba(34,197,94,.2) 0%, transparent 60%), radial-gradient(ellipse 60% 50% at 70% 70%, rgba(99,102,241,.2) 0%, transparent 50%)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', width: 200, height: 200, borderRadius: '50%', background: 'radial-gradient(circle, rgba(34,197,94,.15) 0%, transparent 70%)', top: '15%', left: '10%', filter: 'blur(40px)' }} />
        <div style={{ position: 'absolute', width: 160, height: 160, borderRadius: '50%', background: 'radial-gradient(circle, rgba(168,85,247,.15) 0%, transparent 70%)', bottom: '20%', right: '10%', filter: 'blur(30px)' }} />

        <div style={{ position: 'relative', zIndex: 1, textAlign: 'center', maxWidth: 400 }}>
          <div style={{ margin: '0 auto 24px', width: 96, height: 96, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="96" height="96" viewBox="0 0 38 38" fill="none" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <linearGradient id="wkGradR" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#22c55e"/><stop offset="33%" stopColor="#06b6d4"/>
                  <stop offset="66%" stopColor="#6366f1"/><stop offset="100%" stopColor="#a855f7"/>
                </linearGradient>
                <filter id="wkGlowR"><feGaussianBlur stdDeviation="1.5" result="blur"/><feComposite in="SourceGraphic" in2="blur" operator="over"/></filter>
              </defs>
              <circle cx="19" cy="19" r="17.5" stroke="url(#wkGradR)" strokeWidth="1" opacity={0.6}/>
              <circle cx="19" cy="19" r="13" stroke="url(#wkGradR)" strokeWidth="0.5" opacity={0.35}/>
              <path d="M7 11L10.5 24L14 16L17.5 24L21 11" stroke="url(#wkGradR)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M23 11V27M23 19L31 11M23 19L31 27" stroke="url(#wkGradR)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              <circle cx="19" cy="19" r="2.5" fill="url(#wkGradR)" filter="url(#wkGlowR)"/>
            </svg>
          </div>

          <h1 style={{ fontFamily: "'Noto Sans', sans-serif", fontWeight: 800, fontSize: '2.6rem', background: 'linear-gradient(90deg, #22c55e, #06b6d4, #6366f1, #a855f7)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', marginBottom: 16 }}>WellKOC</h1>

          <p style={{ color: 'rgba(255,255,255,.7)', fontSize: '1.15rem', lineHeight: 1.7, maxWidth: 360, margin: '0 auto' }}>
            Tham gia cộng đồng Web3 Social Commerce<br />với hơn 10,000+ thành viên
          </p>

          <div style={{ display: 'flex', gap: 24, justifyContent: 'center', marginTop: 40, padding: '20px 0', borderTop: '1px solid rgba(255,255,255,.08)', borderBottom: '1px solid rgba(255,255,255,.08)' }}>
            {[{ value: '10K+', label: 'Thành viên' }, { value: '500+', label: 'KOC/KOL' }, { value: '1K+', label: 'Sản phẩm' }].map(s => (
              <div key={s.label} style={{ textAlign: 'center' }}>
                <div style={{ fontWeight: 800, fontSize: '1.3rem', color: '#fff' }}>{s.value}</div>
                <div style={{ fontSize: '.7rem', color: 'rgba(255,255,255,.45)', marginTop: 2 }}>{s.label}</div>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 28, flexWrap: 'wrap' }}>
            {['Miễn phí', 'XP từ ngày 1', 'KOC Network', 'DPP Blockchain'].map(f => (
              <span key={f} style={{ padding: '7px 16px', borderRadius: 20, background: 'rgba(255,255,255,.08)', border: '1px solid rgba(255,255,255,.1)', color: 'rgba(255,255,255,.5)', fontSize: '.75rem', backdropFilter: 'blur(10px)' }}>{f}</span>
            ))}
          </div>
        </div>
      </div>

      {/* ── Right Side Form ── */}
      <div className="reg-form">
        <div className="reg-form-inner">

          {/* Mobile Header (ẩn trên desktop bằng CSS) */}
          <div className="reg-mobile-header">
            <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 80% 60% at 30% 30%, rgba(34,197,94,.15) 0%, transparent 60%)', pointerEvents: 'none' }} />
            <div style={{ position: 'relative', zIndex: 1 }}>
              <svg width="48" height="48" viewBox="0 0 38 38" fill="none" xmlns="http://www.w3.org/2000/svg">
                <defs><linearGradient id="wkGradRM" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#22c55e"/><stop offset="33%" stopColor="#06b6d4"/><stop offset="66%" stopColor="#6366f1"/><stop offset="100%" stopColor="#a855f7"/></linearGradient></defs>
                <circle cx="19" cy="19" r="17.5" stroke="url(#wkGradRM)" strokeWidth="1" opacity={0.6}/>
                <path d="M7 11L10.5 24L14 16L17.5 24L21 11" stroke="url(#wkGradRM)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M23 11V27M23 19L31 11M23 19L31 27" stroke="url(#wkGradRM)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <div style={{ fontFamily: "'Noto Sans', sans-serif", fontWeight: 800, fontSize: '1.3rem', background: 'linear-gradient(90deg, #22c55e, #06b6d4, #6366f1, #a855f7)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', marginTop: 6 }}>WellKOC</div>
              <p style={{ color: 'rgba(255,255,255,.5)', fontSize: '.72rem', marginTop: 4 }}>Tham gia cộng đồng Web3 Social Commerce</p>
            </div>
          </div>

          <div className="reg-content">
            {/* Progress Indicator */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginBottom: 20 }}>
              {stepLabels.map((label, i) => {
                const stepNum = (i + 1) as Step;
                const isActive = step === stepNum;
                const isDone = step > stepNum;
                return (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', flex: i < 2 ? 1 : 'none' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                      <div style={{
                        width: 30, height: 30, borderRadius: '50%',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '.72rem', fontWeight: 700,
                        background: isDone ? 'var(--c4-500, #22c55e)' : isActive ? 'var(--c7-500, #6366f1)' : 'var(--bg-2)',
                        color: isDone || isActive ? '#fff' : 'var(--text-4)',
                        border: `2px solid ${isDone ? 'var(--c4-500, #22c55e)' : isActive ? 'var(--c7-500, #6366f1)' : 'var(--border)'}`,
                        transition: 'all .3s',
                      }}>
                        {isDone ? '✓' : stepNum}
                      </div>
                      <span style={{ fontSize: '.63rem', fontWeight: 600, color: isActive ? 'var(--text-1)' : 'var(--text-4)', whiteSpace: 'nowrap' }}>{label}</span>
                    </div>
                    {i < 2 && (
                      <div style={{ flex: 1, height: 2, margin: '0 12px', marginBottom: 20, background: isDone ? 'var(--c4-500, #22c55e)' : 'var(--border)', borderRadius: 1, transition: 'background .3s' }} />
                    )}
                  </div>
                );
              })}
            </div>

            {/* Step 1: Choose Role */}
            {step === 1 && (
              <div>
                <h2 style={{ fontSize: '1.3rem', fontWeight: 800, marginBottom: 4, color: 'var(--text-1)' }}>Bạn là ai?</h2>
                <p style={{ color: 'var(--text-3)', fontSize: '.8rem', marginBottom: 16 }}>Chọn vai trò phù hợp với bạn để bắt đầu</p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {roleCards.map(role => (
                    <button
                      key={role.key}
                      onClick={() => setSelectedRole(role.key)}
                      style={{
                        padding: '12px 14px', borderRadius: 12,
                        border: '2px solid', borderColor: selectedRole === role.key ? role.color : 'var(--border)',
                        background: selectedRole === role.key ? role.gradient : 'var(--surface-card, var(--bg-1))',
                        cursor: 'pointer', transition: 'all .2s',
                        textAlign: 'left', display: 'flex', alignItems: 'center', gap: 12,
                        boxShadow: selectedRole === role.key ? `0 4px 24px ${role.color}20` : 'none',
                      }}
                    >
                      <div style={{
                        width: 40, height: 40, borderRadius: 10, background: role.gradient,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '1.1rem', flexShrink: 0,
                      }}>{role.icon}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700, fontSize: '.85rem', color: selectedRole === role.key ? role.color : 'var(--text-1)', fontFamily: 'var(--ff-body, system-ui)', marginBottom: 1 }}>{role.label}</div>
                        <div style={{ fontSize: '.7rem', color: 'var(--text-3)', lineHeight: 1.35 }}>{role.desc}</div>
                      </div>
                      <div style={{
                        width: 20, height: 20, borderRadius: '50%',
                        border: `2px solid ${selectedRole === role.key ? role.color : 'var(--border)'}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        transition: 'all .2s', flexShrink: 0,
                      }}>
                        {selectedRole === role.key && (
                          <div style={{ width: 10, height: 10, borderRadius: '50%', background: role.color }} />
                        )}
                      </div>
                    </button>
                  ))}
                </div>

                <button
                  className="btn btn-primary btn-lg"
                  disabled={!selectedRole}
                  onClick={() => selectedRole && setStep(2)}
                  style={{ width: '100%', marginTop: 18, padding: '12px 24px', opacity: selectedRole ? 1 : 0.5, fontSize: '.88rem' }}
                >
                  Tiếp tục
                </button>

                {/* VNeID Quick Register */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 16, margin: '16px 0 0' }}>
                  <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
                  <span style={{ fontSize: '.68rem', color: 'var(--text-4)', textTransform: 'uppercase', letterSpacing: '.08em' }}>hoặc</span>
                  <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
                </div>
                <button
                  onClick={() => {
                    // Redirect to VNeID OAuth for quick registration with verified identity
                    fetch('/api/v1/verify/vneid/auth-url', {
                      headers: { 'Authorization': `Bearer ${localStorage.getItem('access_token') || ''}` },
                    })
                      .then(r => r.json())
                      .then(data => { if (data.auth_url) window.location.href = data.auth_url; })
                      .catch(() => setError('Không thể kết nối VNeID'));
                  }}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    padding: '10px 12px', fontSize: '.78rem', fontWeight: 600, marginTop: 10,
                    background: '#dc2626', color: '#fff', border: 'none', borderRadius: 12,
                    cursor: 'pointer', transition: 'opacity .2s', fontFamily: 'var(--ff-body, system-ui)',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.opacity = '0.9')}
                  onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
                >
                  <span style={{ fontSize: '.9rem' }}>🇻🇳</span>
                  Đăng ký nhanh qua VNeID
                </button>

                <p style={{ textAlign: 'center', marginTop: 14, fontSize: '.82rem', color: 'var(--text-3)' }}>
                  Đã có tài khoản?{' '}
                  <Link to="/login" style={{ color: 'var(--c6-300, #06b6d4)', textDecoration: 'none', fontWeight: 700 }}>Đăng nhập</Link>
                </p>
              </div>
            )}

            {/* Step 2: Fill Form */}
            {step === 2 && (
              <div>
                <button onClick={() => setStep(1)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--c6-300, #06b6d4)', fontSize: '.82rem', fontWeight: 600, fontFamily: 'var(--ff-body, system-ui)', marginBottom: 12, padding: 0 }}>← Quay lại</button>

                <h2 style={{ fontSize: '1.3rem', fontWeight: 800, marginBottom: 6, color: 'var(--text-1)' }}>Thông tin tài khoản</h2>
                <p style={{ color: 'var(--text-3)', fontSize: '.82rem', marginBottom: 20 }}>
                  Điền đầy đủ thông tin để tạo tài khoản
                  {selectedRole === 'koc' ? ' KOC/KOL' : selectedRole === 'vendor' ? ' Nhà cung cấp' : ' Người mua'}
                </p>

                {error && (
                  <div style={{ padding: '12px 16px', borderRadius: 12, marginBottom: 20, background: 'rgba(239,68,68,.08)', color: '#ef4444', fontSize: '.82rem', border: '1px solid rgba(239,68,68,.15)' }}>{error}</div>
                )}

                <form onSubmit={handleStep2Submit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div>
                    <label style={labelStyle}>Họ và tên *</label>
                    <input type="text" placeholder="Nguyen Van A" value={name} onChange={e => setName(e.target.value)} required style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>Email *</label>
                    <input type="email" placeholder="email@example.com" value={email} onChange={e => setEmail(e.target.value)} required style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>Số điện thoại *</label>
                    <input type="tel" placeholder="0912 345 678" value={phone} onChange={e => setPhone(e.target.value)} required style={inputStyle} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div>
                      <label style={labelStyle}>Mật khẩu *</label>
                      <div style={{ position: 'relative' }}>
                        <input type={showPw ? 'text' : 'password'} placeholder="Tối thiểu 6 ký tự" value={password} onChange={e => setPassword(e.target.value)} required minLength={6} style={{ ...inputStyle, paddingRight: 40 }} />
                        <button type="button" onClick={() => setShowPw(!showPw)} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', fontSize: '.9rem' }} tabIndex={-1}>{showPw ? '🙈' : '👁️'}</button>
                      </div>
                    </div>
                    <div>
                      <label style={labelStyle}>Xác nhận mật khẩu *</label>
                      <div style={{ position: 'relative' }}>
                        <input type={showCPw ? 'text' : 'password'} placeholder="Nhập lại mật khẩu" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required style={{ ...inputStyle, paddingRight: 40 }} />
                        <button type="button" onClick={() => setShowCPw(!showCPw)} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', fontSize: '.9rem' }} tabIndex={-1}>{showCPw ? '🙈' : '👁️'}</button>
                      </div>
                    </div>
                  </div>

                  {selectedRole === 'koc' && (
                    <>
                      <div style={{ height: 1, background: 'var(--border)', margin: '4px 0' }} />
                      <div className="section-badge" style={{ fontSize: '.65rem' }}>THÔNG TIN KOC</div>
                      <div>
                        <label style={labelStyle}>Kênh social chính *</label>
                        <select value={socialChannel} onChange={e => setSocialChannel(e.target.value)} required style={{ ...inputStyle, cursor: 'pointer' }}>
                          <option value="">Chọn kênh</option>
                          <option value="tiktok">TikTok</option>
                          <option value="youtube">YouTube</option>
                          <option value="instagram">Instagram</option>
                          <option value="facebook">Facebook</option>
                        </select>
                      </div>
                      <div>
                        <label style={labelStyle}>Số followers</label>
                        <input type="text" placeholder="VD: 10,000" value={followers} onChange={e => setFollowers(e.target.value)} style={inputStyle} />
                      </div>
                      <div>
                        <label style={labelStyle}>Mã giới thiệu (không bắt buộc)</label>
                        <input type="text" placeholder="WK-XXXXX" value={referralCode} onChange={e => setReferralCode(e.target.value)} style={inputStyle} />
                      </div>
                    </>
                  )}

                  {selectedRole === 'vendor' && (
                    <>
                      <div style={{ height: 1, background: 'var(--border)', margin: '4px 0' }} />
                      <div className="section-badge" style={{ fontSize: '.65rem' }}>THÔNG TIN DOANH NGHIỆP</div>
                      <div>
                        <label style={labelStyle}>Tên cửa hàng *</label>
                        <input type="text" placeholder="Tên thương hiệu / cửa hàng" value={shopName} onChange={e => setShopName(e.target.value)} required style={inputStyle} />
                      </div>
                      <div>
                        <label style={labelStyle}>Mã số thuế</label>
                        <input type="text" placeholder="Mã số thuế doanh nghiệp" value={taxCode} onChange={e => setTaxCode(e.target.value)} style={inputStyle} />
                      </div>
                      <div>
                        <label style={labelStyle}>Địa chỉ kho hàng *</label>
                        <input type="text" placeholder="Địa chỉ kho hàng chính" value={warehouse} onChange={e => setWarehouse(e.target.value)} required style={inputStyle} />
                      </div>
                    </>
                  )}

                  <button type="submit" className="btn btn-primary btn-lg" disabled={loading} style={{ width: '100%', marginTop: 8, padding: '14px 24px', opacity: loading ? 0.7 : 1 }}>
                    {loading ? 'Đang tạo tài khoản...' : 'Đăng ký'}
                  </button>
                </form>
              </div>
            )}

            {/* Step 3: Success */}
            {step === 3 && (
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <div style={{ width: 100, height: 100, borderRadius: '50%', margin: '0 auto 24px', background: 'linear-gradient(135deg, rgba(34,197,94,.15), rgba(6,182,212,.1))', border: '3px solid var(--c4-500, #22c55e)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2.5rem' }}>🎉</div>

                <h2 className="display-lg gradient-text" style={{ marginBottom: 8 }}>Chào mừng bạn đến WellKOC!</h2>
                <p style={{ color: 'var(--text-3)', fontSize: '.92rem', marginBottom: 8, lineHeight: 1.6 }}>
                  Tài khoản của bạn đã được tạo thành công.<br />Bắt đầu hành trình Web3 Commerce ngay bây giờ!
                </p>

                <div className="card" style={{ padding: 20, margin: '24px 0', background: 'var(--bg-2)' }}>
                  <div style={{ fontSize: '.75rem', fontWeight: 700, color: 'var(--text-3)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '.05em' }}>Quà tặng chào mừng</div>
                  <div style={{ display: 'flex', gap: 16, justifyContent: 'center' }}>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '1.5rem', marginBottom: 4 }}>🎮</div>
                      <div style={{ fontWeight: 800, fontSize: '1.1rem', color: 'var(--c6-300, #06b6d4)' }}>+100 XP</div>
                      <div style={{ fontSize: '.68rem', color: 'var(--text-4)' }}>Welcome bonus</div>
                    </div>
                    <div style={{ width: 1, background: 'var(--border)' }} />
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '1.5rem', marginBottom: 4 }}>🎟️</div>
                      <div style={{ fontWeight: 800, fontSize: '1.1rem', color: 'var(--c4-500, #22c55e)' }}>50K</div>
                      <div style={{ fontSize: '.68rem', color: 'var(--text-4)' }}>Voucher mua sắm</div>
                    </div>
                    <div style={{ width: 1, background: 'var(--border)' }} />
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '1.5rem', marginBottom: 4 }}>⭐</div>
                      <div style={{ fontWeight: 800, fontSize: '1.1rem', color: 'var(--c7-500, #6366f1)' }}>Level 1</div>
                      <div style={{ fontSize: '.68rem', color: 'var(--text-4)' }}>Thành viên mới</div>
                    </div>
                  </div>
                </div>

                <button className="btn btn-primary btn-lg" onClick={goToDashboard} style={{ width: '100%', padding: '14px 24px' }}>Bắt đầu khám phá</button>
                <Link to="/marketplace" style={{ display: 'block', marginTop: 12, color: 'var(--c6-300, #06b6d4)', textDecoration: 'none', fontSize: '.85rem', fontWeight: 600 }}>Xem Marketplace</Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
