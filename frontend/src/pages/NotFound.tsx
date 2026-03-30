import { Link } from 'react-router-dom';
import { useI18n } from '@hooks/useI18n';

export default function NotFound() {
  const { t } = useI18n();
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg-0)',
      position: 'relative', overflow: 'hidden',
    }}>
      {/* Background */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'radial-gradient(ellipse 80% 60% at 50% 50%, rgba(99,102,241,.08) 0%, transparent 60%)',
        pointerEvents: 'none',
      }} />

      <div style={{ position: 'relative', zIndex: 1, textAlign: 'center', padding: 24 }}>
        {/* 404 Number */}
        <div className="gradient-text" style={{
          fontFamily: 'var(--ff-display)', fontWeight: 800,
          fontSize: 'clamp(5rem, 15vw, 10rem)', lineHeight: 1,
          marginBottom: 16,
        }}>
          404
        </div>

        <h1 className="display-md" style={{ marginBottom: 8 }}>{t('notFound.title')}</h1>
        <p style={{ color: 'var(--text-3)', fontSize: '.92rem', maxWidth: 420, margin: '0 auto 32px', lineHeight: 1.6 }}>
          {t('notFound.desc')}
        </p>

        <div className="flex gap-12" style={{ justifyContent: 'center', marginBottom: 40 }}>
          <Link to="/" className="btn btn-primary btn-lg" style={{ textDecoration: 'none' }}>
            {t('notFound.goHome')}
          </Link>
          <Link to="/hot" className="btn btn-secondary btn-lg" style={{ textDecoration: 'none' }}>
            {t('notFound.viewProducts')}
          </Link>
        </div>

        {/* Quick Links */}
        <div className="card-glass" style={{ padding: 24, maxWidth: 400, margin: '0 auto' }}>
          <div className="label" style={{ marginBottom: 12 }}>{t('notFound.quickLinks')}</div>
          <div className="flex-col gap-8">
            {[
              { to: '/hot', label: t('notFound.hotProducts'), icon: '🔥' },
              { to: '/dashboard', label: 'Dashboard', icon: '📊' },
              { to: '/academy', label: 'KOC Academy', icon: '🎓' },
              { to: '/agents', label: '333\u00A0AI\u00A0Agents', icon: '🤖' },
            ].map(link => (
              <Link
                key={link.to}
                to={link.to}
                className="card card-hover"
                style={{
                  padding: '10px 16px', textDecoration: 'none', color: 'var(--text-1)',
                  display: 'flex', alignItems: 'center', gap: 10,
                  background: 'var(--bg-2)',
                }}
              >
                <span>{link.icon}</span>
                <span style={{ fontSize: '.82rem', fontWeight: 600 }}>{link.label}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
