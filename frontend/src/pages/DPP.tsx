import React, { useState } from 'react';
import { useI18n } from '@hooks/useI18n';

const productPassport = {
  name: 'Trà Ô Long Đài Loan Premium',
  sku: 'WK-TEA-001',
  brand: 'WellKOC Origin',
  category: 'dpp.passport.categoryValue',
  origin: 'dpp.passport.originValue',
  certifications: ['Organic EU', 'HACCP', 'ISO 22000', 'Fair Trade'],
  dppHash: '0x7a3f...b92c1d4e',
  mintDate: '2026-01-15',
  chain: 'Polygon',
  ipfsCID: 'QmX7k...89fN2',
  zkProof: 'zk-SNARK verified',
};

const supplyChainSteps = [
  { step: 1, titleKey: 'dpp.step1.title', location: 'Ali Shan, Đài Loan', date: '2025-11-20', icon: '🌱', color: 'var(--c4-500)', verified: true, txHash: '0x1a2b...3c4d', descKey: 'dpp.step1.desc' },
  { step: 2, titleKey: 'dpp.step2.title', location: 'Nhà máy Taipei', date: '2025-11-25', icon: '🏭', color: 'var(--c5-500)', verified: true, txHash: '0x5e6f...7g8h', descKey: 'dpp.step2.desc' },
  { step: 3, titleKey: 'dpp.step3.title', location: 'SGS Vietnam Lab', date: '2025-12-01', icon: '🔬', color: 'var(--c6-500)', verified: true, txHash: '0x9i0j...1k2l', descKey: 'dpp.step3.desc' },
  { step: 4, titleKey: 'dpp.step4.title', location: 'Cảng Keelung → Cát Lái', date: '2025-12-10', icon: '🚢', color: 'var(--c7-500)', verified: true, txHash: '0x3m4n...5o6p', descKey: 'dpp.step4.desc' },
  { step: 5, titleKey: 'dpp.step5.title', location: 'Kho Bình Dương', date: '2025-12-15', icon: '📦', color: 'var(--c6-300)', verified: true, txHash: '0x7q8r...9s0t', descKey: 'dpp.step5.desc' },
  { step: 6, titleKey: 'dpp.step6.title', location: 'Polygon Chain', date: '2026-01-15', icon: '⛓️', color: 'var(--c4-300)', verified: true, txHash: '0x1u2v...3w4x', descKey: 'dpp.step6.desc' },
];

export default function DPP() {
  const { t } = useI18n();
  const [selectedStep, setSelectedStep] = useState<number | null>(null);
  const [showZKP, setShowZKP] = useState(false);

  return (
    <div style={{ paddingTop: 'var(--topbar-height)', minHeight: '100vh', background: 'var(--bg-0)' }}>
      {/* Header */}
      <div style={{
        padding: '60px 0 40px',
        background: 'radial-gradient(ellipse 80% 60% at 50% 0%, rgba(34,197,94,.1) 0%, transparent 60%)',
      }}>
        <div className="container" style={{ textAlign: 'center' }}>
          <div className="section-badge" style={{ background: 'rgba(34,197,94,.1)', color: 'var(--c4-300)', borderColor: 'rgba(34,197,94,.2)' }}>
            <span style={{ whiteSpace: 'nowrap' }}>⛓️ BLOCKCHAIN DPP</span>
          </div>
          <h1 className="display-lg gradient-text" style={{ marginBottom: 12 }}>
            Digital Product Passport
          </h1>
          <p style={{ color: 'var(--text-3)', maxWidth: 580, margin: '0 auto', fontSize: '.88rem' }}>
            {t('dpp.header.subtitle')}
          </p>
        </div>
      </div>

      <div className="container" style={{ paddingTop: 40, paddingBottom: 80 }}>
        {/* Product Passport Card */}
        <div className="onchain-card" style={{ marginBottom: 40, padding: 32 }}>
          <div className="verified-seal" style={{ whiteSpace: 'nowrap' }}>✅ DPP Verified <span style={{ whiteSpace: 'nowrap' }}>On-Chain</span></div>
          <div className="grid-2" style={{ gap: 32, marginTop: 16 }}>
            <div>
              <div style={{ fontSize: '2.5rem', marginBottom: 16 }}>🍵</div>
              <h2 style={{ fontFamily: 'var(--ff-display)', fontWeight: 800, fontSize: '1.3rem', marginBottom: 8 }}>{productPassport.name}</h2>
              <div className="flex gap-8" style={{ marginBottom: 16, flexWrap: 'wrap' }}>
                {productPassport.certifications.map(cert => (
                  <span key={cert} className="badge badge-c4">{cert}</span>
                ))}
              </div>
              <div className="flex-col gap-8" style={{ fontSize: '.78rem' }}>
                {[
                  ['SKU', productPassport.sku, true],
                  [t('dpp.passport.brand'), productPassport.brand, false],
                  [t('dpp.passport.origin'), t(productPassport.origin), false],
                  [t('dpp.passport.category'), t(productPassport.category), false],
                ].map(([label, val, isMono]) => (
                  <div key={label as string} className="flex" style={{ justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-3)' }}>{label as string}</span>
                    <span className={isMono ? 'mono' : ''} style={!isMono ? { fontWeight: 600 } : undefined}>{val as string}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="card" style={{ padding: 20, background: 'var(--bg-2)' }}>
              <div className="label" style={{ marginBottom: 12 }}>{t('dpp.passport.blockchainInfo')}</div>
              <div className="flex-col gap-12" style={{ fontSize: '.78rem' }}>
                <div className="flex" style={{ justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-3)' }}>DPP Hash</span>
                  <span className="mono" style={{ color: 'var(--c4-300)' }}>{productPassport.dppHash}</span>
                </div>
                <div className="flex" style={{ justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-3)' }}>{t('dpp.passport.mintDate')}</span>
                  <span className="mono">{productPassport.mintDate}</span>
                </div>
                <div className="flex" style={{ justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-3)' }}>Chain</span>
                  <span className="badge badge-c7">{productPassport.chain}</span>
                </div>
                <div className="flex" style={{ justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-3)' }}>IPFS CID</span>
                  <span className="mono" style={{ color: 'var(--c5-300)' }}>{productPassport.ipfsCID}</span>
                </div>
                <div className="flex" style={{ justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-3)' }}>ZKP Status</span>
                  <span className="badge badge-c4">{productPassport.zkProof}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Supply Chain Timeline */}
        <div style={{ marginBottom: 40 }}>
          <div className="section-header" style={{ marginBottom: 32 }}>
            <div className="section-badge">📦 SUPPLY CHAIN</div>
            <h2 className="display-md">{t('dpp.supply.title')}</h2>
          </div>

          <div style={{ position: 'relative', paddingLeft: 40 }}>
            <div style={{
              position: 'absolute', left: 19, top: 0, bottom: 0, width: 2,
              background: 'linear-gradient(180deg, var(--c4-500), var(--c5-500), var(--c6-500), var(--c7-500))',
            }} />

            {supplyChainSteps.map((step) => (
              <div
                key={step.step}
                className="card card-hover"
                style={{
                  padding: '20px 24px', marginBottom: 16, position: 'relative', cursor: 'pointer',
                  borderColor: selectedStep === step.step ? 'var(--border-glow)' : undefined,
                }}
                onClick={() => setSelectedStep(selectedStep === step.step ? null : step.step)}
              >
                <div style={{
                  position: 'absolute', left: -33, top: 24,
                  width: 14, height: 14, borderRadius: '50%',
                  background: step.color, border: '3px solid var(--bg-0)',
                  boxShadow: `0 0 12px ${step.color}60`,
                }} />

                <div className="flex" style={{ justifyContent: 'space-between' }}>
                  <div className="flex gap-12">
                    <span style={{ fontSize: '1.3rem' }}>{step.icon}</span>
                    <div>
                      <div className="label" style={{ marginBottom: 2, color: step.color }}>{t('dpp.supply.step')} {step.step}</div>
                      <div style={{ fontWeight: 700, fontSize: '.88rem' }}>{t(step.titleKey)}</div>
                      <div style={{ fontSize: '.72rem', color: 'var(--text-3)' }}>{step.location}</div>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div className="mono" style={{ fontSize: '.68rem', color: 'var(--text-3)' }}>{step.date}</div>
                    {step.verified && <span className="badge badge-c4" style={{ marginTop: 4 }}>✓ Verified</span>}
                  </div>
                </div>

                {selectedStep === step.step && (
                  <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--border)' }}>
                    <p style={{ fontSize: '.78rem', color: 'var(--text-2)', lineHeight: 1.6, marginBottom: 10 }}>
                      {t(step.descKey)}
                    </p>
                    <span className="badge badge-c5">TX: {step.txHash}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* ZKP Section */}
        <div className="card card-glow" style={{ padding: 32, textAlign: 'center' }}>
          <div className="section-badge" style={{ background: 'rgba(168,85,247,.1)', color: 'var(--c7-300)', borderColor: 'rgba(168,85,247,.2)' }}>
            <span style={{ whiteSpace: 'nowrap' }}>🔐 ZERO-KNOWLEDGE PROOF</span>
          </div>
          <h3 className="display-md" style={{ marginBottom: 12 }}>{t('dpp.zkp.title')}</h3>
          <p style={{ fontSize: '.82rem', color: 'var(--text-3)', maxWidth: 500, margin: '0 auto 20px' }}>
            {t('dpp.zkp.desc')}
          </p>
          <button className="btn btn-primary" onClick={() => setShowZKP(!showZKP)}>
            {showZKP ? t('dpp.zkp.hideBtn') : t('dpp.zkp.verifyBtn')}
          </button>

          {showZKP && (
            <div className="card" style={{ marginTop: 20, padding: 20, background: 'var(--bg-2)', textAlign: 'left' }}>
              <div className="label" style={{ marginBottom: 12 }}>ZKP VERIFICATION RESULT</div>
              <div className="flex-col gap-8">
                {[
                  t('dpp.zkp.claim1'),
                  t('dpp.zkp.claim2'),
                  t('dpp.zkp.claim3'),
                  t('dpp.zkp.claim4'),
                  t('dpp.zkp.claim5'),
                ].map((claim, i) => (
                  <div key={i} className="flex" style={{ justifyContent: 'space-between', padding: '8px 12px', borderRadius: 8, background: 'var(--bg-1)' }}>
                    <span style={{ fontSize: '.78rem' }}>{claim}</span>
                    <span className="badge badge-c4">✓ Verified</span>
                  </div>
                ))}
              </div>
              <div className="mono" style={{ marginTop: 14, padding: 12, background: 'var(--bg-1)', borderRadius: 8, fontSize: '.68rem', color: 'var(--c4-300)', wordBreak: 'break-all' }}>
                <span style={{ whiteSpace: 'nowrap' }}>Proof: zk-SNARK</span> · <span style={{ whiteSpace: 'nowrap' }}>Circuit: DPP-Supply-v3</span> · <span style={{ whiteSpace: 'nowrap' }}>Verifier: 0x7a3f...b92c</span> · <span style={{ whiteSpace: 'nowrap' }}>Block: #45,892,103</span> · <span style={{ whiteSpace: 'nowrap' }}>Gas: 0.0023 MATIC</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
