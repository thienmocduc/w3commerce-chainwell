/**
 * WellKOC — Floating AI Customer Support Chatbot
 * Appears on all pages via MainLayout.
 * Calls /api/v1/ai/chat (public endpoint, no auth).
 */
import { useState, useRef, useEffect } from 'react';

const API_BASE = import.meta.env.VITE_API_URL ?? 'https://wellkoc-api.onrender.com/api/v1';

interface Msg {
  role: 'user' | 'bot';
  text: string;
}

const QUICK_Q = [
  'KOC là gì?',
  'Hoa hồng bao nhiêu %?',
  'Làm sao đăng ký?',
  'DPP là gì?',
];

const WELCOME: Msg = {
  role: 'bot',
  text: 'Xin chào! Tôi là WellKOC AI — trợ lý của bạn 24/7. Bạn cần hỗ trợ gì hôm nay? 😊',
};

export default function ChatWidget() {
  const [open, setOpen]       = useState(false);
  const [msgs, setMsgs]       = useState<Msg[]>([WELCOME]);
  const [input, setInput]     = useState('');
  const [loading, setLoading] = useState(false);
  const [pulse, setPulse]     = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef  = useRef<HTMLInputElement>(null);

  // Pulse the button after 8 s to attract attention
  useEffect(() => {
    const t = setTimeout(() => setPulse(true), 8000);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (open) {
      setPulse(false);
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [open]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [msgs]);

  async function send(text: string) {
    if (!text.trim() || loading) return;
    const userMsg: Msg = { role: 'user', text: text.trim() };
    setMsgs(p => [...p, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/ai/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text.trim(),
          // send last 4 turns as history
          history: msgs.slice(-4).map(m => ({ role: m.role === 'bot' ? 'assistant' : 'user', content: m.text })),
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setMsgs(p => [...p, { role: 'bot', text: data.reply ?? '...' }]);
      } else {
        throw new Error('api');
      }
    } catch {
      // Demo fallback
      setMsgs(p => [...p, { role: 'bot', text: demoReply(text) }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {/* ── Floating button (3 cm ≈ 113 px at 96 dpi) ── */}
      <button
        onClick={() => setOpen(o => !o)}
        aria-label="Chat với WellKOC AI"
        style={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          width: 113,
          height: 113,
          borderRadius: '50%',
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 4px 24px rgba(6,182,212,.45)',
          zIndex: 9999,
          transition: 'transform .2s,box-shadow .2s',
          animation: pulse && !open ? 'wk-chat-pulse 2s ease-in-out infinite' : 'none',
          padding: 0,
          overflow: 'hidden',
        }}
        onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.07)')}
        onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
      >
        {open ? (
          /* Close overlay when chat is open */
          <div style={{
            width: '100%', height: '100%',
            borderRadius: '50%',
            background: 'linear-gradient(135deg,#22c55e,#06b6d4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="26" height="26" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round">
              <line x1="5" y1="5" x2="21" y2="21"/><line x1="21" y1="5" x2="5" y2="21"/>
            </svg>
          </div>
        ) : (
          <img
            src="/chatbot-avatar.png"
            alt="WellKOC AI"
            style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover', display: 'block' }}
            onError={e => {
              // Fallback to gradient icon if image missing
              const btn = e.currentTarget.parentElement!;
              e.currentTarget.style.display = 'none';
              btn.style.background = 'linear-gradient(135deg,#22c55e,#06b6d4)';
            }}
          />
        )}
        {/* Unread dot */}
        {!open && (
          <span style={{
            position: 'absolute', top: 6, right: 6,
            width: 14, height: 14,
            background: '#f43f5e',
            borderRadius: '50%',
            border: '2px solid #fff',
            fontSize: 8, color: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 700,
          }}>1</span>
        )}
      </button>

      {/* ── Chat panel ── */}
      {open && (
        <div style={{
          position: 'fixed',
          bottom: 90,
          right: 24,
          width: 360,
          maxWidth: 'calc(100vw - 32px)',
          height: 520,
          maxHeight: 'calc(100vh - 120px)',
          background: 'var(--bg-1, #0f172a)',
          border: '1px solid var(--border, rgba(255,255,255,.1))',
          borderRadius: 20,
          boxShadow: '0 20px 60px rgba(0,0,0,.5)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          zIndex: 9998,
          animation: 'wk-slide-up .25s ease-out',
        }}>
          {/* Header */}
          <div style={{
            padding: '14px 18px',
            background: 'linear-gradient(135deg,#166534,#0e7490)',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            flexShrink: 0,
          }}>
            <img
              src="/chatbot-avatar.png"
              alt="WellKOC AI"
              style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
              onError={e => {
                e.currentTarget.style.display = 'none';
              }}
            />
            <div style={{ flex: 1 }}>
              <div style={{ color: '#fff', fontWeight: 700, fontSize: '0.9rem' }}>WellKOC AI</div>
              <div style={{ color: 'rgba(255,255,255,.7)', fontSize: '0.72rem' }}>
                <span style={{
                  display: 'inline-block', width: 6, height: 6,
                  background: '#4ade80', borderRadius: '50%', marginRight: 4,
                  verticalAlign: 'middle',
                }}/>
                Online · trả lời trong vài giây
              </div>
            </div>
            <button
              onClick={() => setMsgs([WELCOME])}
              title="Xoá lịch sử chat"
              style={{ background: 'none', border: 'none', cursor: 'pointer', opacity: .7, padding: 4 }}
            >
              <svg width="16" height="16" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-3"/></svg>
            </button>
          </div>

          {/* Messages */}
          <div style={{
            flex: 1,
            overflowY: 'auto',
            padding: '16px 14px',
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
          }}>
            {msgs.map((m, i) => (
              <div key={i} style={{
                display: 'flex',
                justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start',
              }}>
                <div style={{
                  maxWidth: '82%',
                  padding: '9px 13px',
                  borderRadius: m.role === 'user' ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                  background: m.role === 'user'
                    ? 'linear-gradient(135deg,#16a34a,#0891b2)'
                    : 'var(--bg-2, rgba(255,255,255,.07))',
                  color: m.role === 'user' ? '#fff' : 'var(--text-1, #f1f5f9)',
                  fontSize: '0.84rem',
                  lineHeight: 1.5,
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                }}>
                  {m.text}
                </div>
              </div>
            ))}

            {/* Typing indicator */}
            {loading && (
              <div style={{ display: 'flex', gap: 4, alignItems: 'center', paddingLeft: 4 }}>
                {[0,1,2].map(i => (
                  <span key={i} style={{
                    width: 7, height: 7,
                    background: 'var(--text-3, #64748b)',
                    borderRadius: '50%',
                    animation: `wk-bounce .8s ${i * .16}s ease-in-out infinite`,
                  }}/>
                ))}
              </div>
            )}
            <div ref={bottomRef}/>
          </div>

          {/* Quick questions */}
          {msgs.length <= 2 && (
            <div style={{
              padding: '0 14px 8px',
              display: 'flex',
              flexWrap: 'wrap',
              gap: 6,
              flexShrink: 0,
            }}>
              {QUICK_Q.map(q => (
                <button key={q} onClick={() => send(q)} style={{
                  padding: '5px 11px',
                  borderRadius: 20,
                  border: '1px solid var(--border, rgba(255,255,255,.1))',
                  background: 'var(--bg-2, rgba(255,255,255,.05))',
                  color: 'var(--text-2, #94a3b8)',
                  fontSize: '0.76rem',
                  cursor: 'pointer',
                  transition: 'background .15s',
                }}>
                  {q}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <div style={{
            padding: '10px 12px',
            borderTop: '1px solid var(--border, rgba(255,255,255,.08))',
            display: 'flex',
            gap: 8,
            flexShrink: 0,
          }}>
            <input
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send(input)}
              placeholder="Nhập câu hỏi..."
              disabled={loading}
              style={{
                flex: 1,
                padding: '9px 14px',
                borderRadius: 24,
                border: '1px solid var(--border, rgba(255,255,255,.1))',
                background: 'var(--bg-2, rgba(255,255,255,.05))',
                color: 'var(--text-1, #f1f5f9)',
                fontSize: '0.84rem',
                outline: 'none',
              }}
            />
            <button
              onClick={() => send(input)}
              disabled={loading || !input.trim()}
              style={{
                width: 40, height: 40,
                borderRadius: '50%',
                background: input.trim() && !loading
                  ? 'linear-gradient(135deg,#22c55e,#06b6d4)'
                  : 'var(--bg-2, rgba(255,255,255,.05))',
                border: 'none',
                cursor: input.trim() && !loading ? 'pointer' : 'default',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
                transition: 'background .15s',
              }}
            >
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24">
                <path d="M22 2L11 13" stroke="#fff" strokeWidth="2" strokeLinecap="round"/>
                <path d="M22 2L15 22L11 13L2 9L22 2Z" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes wk-chat-pulse {
          0%,100% { box-shadow: 0 4px 20px rgba(6,182,212,.4); }
          50%      { box-shadow: 0 4px 32px rgba(6,182,212,.8), 0 0 0 8px rgba(6,182,212,.15); }
        }
        @keyframes wk-slide-up {
          from { opacity: 0; transform: translateY(16px) scale(.97); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes wk-bounce {
          0%,100% { transform: translateY(0); }
          50%      { transform: translateY(-5px); }
        }
      `}</style>
    </>
  );
}

// ── Demo fallback replies (no backend) ────────────────────────────────────────
function demoReply(msg: string): string {
  const m = msg.toLowerCase();
  if (m.includes('koc') || m.includes('creator'))
    return 'KOC (Key Opinion Consumer) là creator bán hàng qua nội dung sáng tạo. WellKOC hỗ trợ KOC với AI agent, hoa hồng T1 40% — T2 13%, thanh toán on-chain minh bạch. Bạn muốn đăng ký ngay không? 🌟';
  if (m.includes('hoa hồng') || m.includes('commission') || m.includes('%'))
    return 'Hoa hồng WellKOC:\n• T1 (bán trực tiếp): 40%\n• T2 (giới thiệu KOC mới): 13%\n• Pool thưởng thêm: 9-17%\nTất cả được ghi nhận on-chain, không thể chỉnh sửa! ⛓️';
  if (m.includes('đăng ký') || m.includes('register') || m.includes('tham gia'))
    return 'Đăng ký chỉ mất 2 phút:\n1. Nhấn nút "Đăng ký" ở góc trên phải\n2. Chọn vai trò: Buyer / KOC / Vendor\n3. Xác minh định danh VNeID\n4. Bắt đầu kiếm tiền ngay! 🚀';
  if (m.includes('dpp') || m.includes('nft') || m.includes('blockchain'))
    return 'DPP (Digital Product Passport) là NFT xác thực nguồn gốc sản phẩm trên Polygon. Mỗi sản phẩm có DPP — khách hàng quét QR xem toàn bộ lịch sử xuất xứ, chứng nhận, không thể làm giả! 🔐';
  if (m.includes('giá') || m.includes('phí') || m.includes('pricing') || m.includes('gói'))
    return 'Xem bảng giá đầy đủ tại /pricing. Tóm tắt:\n• Buyer: miễn phí\n• KOC Starter: từ 199k/tháng\n• KOC Pro: từ 499k/tháng\n• Vendor: từ 999k/tháng\nDùng thử 14 ngày miễn phí! 🎁';
  if (m.includes('agent') || m.includes('ai'))
    return '333 AI Agents của WellKOC hỗ trợ:\n• Content Factory: viết script TikTok, caption, ads\n• Distribution Grid: lên lịch, quản lý ads, SEO\n• Engagement Matrix: trả lời comment, DM, báo cáo\nKOC/Vendor Pro mới được dùng full agent. ⭐';
  return 'Cảm ơn bạn đã hỏi! Để được hỗ trợ chi tiết hơn, bạn có thể:\n• Chat tiếp ở đây\n• Email: support@wellkoc.com\n• Zalo OA: WellKOC Official\nTôi luôn sẵn sàng giúp bạn! 💚';
}
