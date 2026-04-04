import { useState, useCallback } from 'react';

// ── Contract config ────────────────────────────────────────────────────────
const WK_TOKEN_ADDRESS = (import.meta as any).env?.VITE_WK_TOKEN_ADDRESS || '';
const ACTIVE_CHAIN = parseInt((import.meta as any).env?.VITE_CHAIN_ID || '137');
const networkName  = ACTIVE_CHAIN === 137 ? 'Polygon Mainnet' : 'Polygon Amoy Testnet';
const explorerBase = ACTIVE_CHAIN === 137 ? 'https://polygonscan.com' : 'https://amoy.polygonscan.com';

// ── Helpers ────────────────────────────────────────────────────────────────
function fmt(wei: string, dp = 2): string {
  try {
    const n = Number(BigInt(wei || '0')) / 1e18;
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(2) + 'M';
    if (n >= 1_000)     return (n / 1_000).toFixed(2) + 'K';
    return n.toFixed(dp);
  } catch { return '0'; }
}
function fmtAddr(a: string) { return a ? a.slice(0,6) + '...' + a.slice(-4) : ''; }
function toWei(n: number) { return (BigInt(Math.floor(n * 1e9)) * BigInt(1e9)).toString(16).padStart(64,'0'); }

interface WalletState {
  address: string; wkBalance: string; maticBalance: string;
  stakedAmount: string; pendingReward: string; chainId: number;
}
interface TxRecord { hash: string; type: string; amount: string; time: string; }

const TOKENOMICS = [
  { label: 'KOC Rewards',       pct: 40, color: 'var(--c4-500)', desc: '4B WK — phần thưởng KOC theo thời gian' },
  { label: 'Platform Treasury', pct: 30, color: 'var(--c5-500)', desc: '3B WK — vận hành nền tảng & buyback' },
  { label: 'Ecosystem Fund',    pct: 20, color: 'var(--c6-500)', desc: '2B WK — grants, đối tác, thanh khoản' },
  { label: 'Team (3yr vest)',   pct: 10, color: 'var(--c7-500)', desc: '1B WK — cliff 6 tháng, vesting 3 năm' },
];

const SECURITY = [
  ['AccessControl', 'MINTER_ROLE, PAUSER_ROLE, ADMIN_ROLE riêng biệt'],
  ['Pausable', 'Dừng khẩn cấp toàn bộ giao dịch khi bị tấn công'],
  ['ReentrancyGuard', 'Bảo vệ staking khỏi reentrancy attack'],
  ['Daily Mint Limit', 'Tối đa 10M WK/ngày — không thể mint vô hạn'],
  ['MAX_SUPPLY constant', '10 tỷ WK cố định — không thể thay đổi sau deploy'],
  ['No Proxy / No Upgrade', 'Bytecode bất biến — không ai thay đổi được logic'],
  ['OpenZeppelin v5', 'Thư viện đã được audit chuyên nghiệp toàn cầu'],
  ['Emergency Recovery', 'Khôi phục token gửi nhầm — không rút được staked funds'],
];

const UTILITY = [
  { icon: '💸', title: 'Phí nền tảng -5%', desc: 'Thanh toán phí WellKOC bằng WK: giảm 5% so với USDT' },
  { icon: '🗳️', title: 'Governance', desc: 'Vote quyết định tỷ lệ hoa hồng, chính sách nền tảng' },
  { icon: '⭐', title: 'KOC Tier Boost', desc: 'Stake WK để nâng tier KOC nhanh hơn (multiplier)' },
  { icon: '🔐', title: 'DPP Mint Fee', desc: 'Trả phí mint Digital Product Passport bằng WK' },
  { icon: '💰', title: 'Pool C Bonus', desc: 'Đóng góp Pool C nhận thêm bonus WK x1.5' },
  { icon: '📈', title: 'Staking 5% APY', desc: 'Stake WK earn 5% APY/năm, trả bằng WK mới mint' },
];

export default function WKToken() {
  const [tab, setTab] = useState<'wallet'|'stake'|'send'|'info'>('wallet');
  const [wallet, setWallet] = useState<WalletState | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [error, setError]   = useState('');
  const [txHistory, setTxHistory] = useState<TxRecord[]>([]);
  const [sendTo, setSendTo] = useState('');
  const [sendAmount, setSendAmount] = useState('');
  const [sending, setSending] = useState(false);
  const [stakeAmt, setStakeAmt]   = useState('');
  const [unstakeAmt, setUnstakeAmt] = useState('');
  const [staking, setStaking]   = useState(false);
  const [unstaking, setUnstaking] = useState(false);
  const [claiming, setClaiming]   = useState(false);
  const [toast, setToast] = useState<{msg:string;ok:boolean}|null>(null);

  const showToast = (msg: string, ok = true) => {
    setToast({msg,ok});
    setTimeout(() => setToast(null), 3500);
  };

  const eth = () => (window as any).ethereum;

  const refreshWallet = useCallback(async (address: string) => {
    const e = eth(); if (!e) return;
    const maticHex: string = await e.request({ method:'eth_getBalance', params:[address,'latest'] });
    const maticBalance = BigInt(maticHex).toString();
    let wkBalance = '0', stakedAmount = '0', pendingReward = '0';
    if (WK_TOKEN_ADDRESS) {
      try {
        const pad = address.slice(2).padStart(64,'0');
        const balRes: string = await e.request({ method:'eth_call', params:[{to:WK_TOKEN_ADDRESS, data:'0x70a08231'+pad},'latest'] });
        wkBalance = BigInt(balRes).toString();
        const stakeRes: string = await e.request({ method:'eth_call', params:[{to:WK_TOKEN_ADDRESS, data:'0x9a65ea14'+pad},'latest'] });
        if (stakeRes?.length >= 2+192) {
          stakedAmount  = BigInt('0x'+stakeRes.slice(2,66)).toString();
          pendingReward = BigInt('0x'+stakeRes.slice(130,194)).toString();
        }
      } catch { /* contract not yet deployed */ }
    }
    const chainHex: string = await e.request({ method:'eth_chainId' });
    setWallet({ address, wkBalance, maticBalance, stakedAmount, pendingReward, chainId: parseInt(chainHex,16) });
  }, []);

  const connectWallet = async () => {
    setError('');
    if (!eth()) { setError('MetaMask chưa cài. Vui lòng cài MetaMask.'); return; }
    setConnecting(true);
    try {
      const accounts: string[] = await eth().request({ method:'eth_requestAccounts' });
      const chainHex: string = await eth().request({ method:'eth_chainId' });
      const chainId = parseInt(chainHex, 16);
      if (chainId !== ACTIVE_CHAIN) {
        try {
          await eth().request({ method:'wallet_switchEthereumChain', params:[{chainId:'0x'+ACTIVE_CHAIN.toString(16)}] });
        } catch (sw: any) {
          if (sw.code === 4902 && ACTIVE_CHAIN === 137) {
            await eth().request({ method:'wallet_addEthereumChain', params:[{
              chainId:'0x89', chainName:'Polygon Mainnet',
              nativeCurrency:{name:'MATIC',symbol:'MATIC',decimals:18},
              rpcUrls:['https://polygon-rpc.com'], blockExplorerUrls:['https://polygonscan.com'],
            }]});
          }
        }
      }
      await refreshWallet(accounts[0]);
    } catch(err:any) { setError(err.message||'Lỗi kết nối ví'); }
    finally { setConnecting(false); }
  };

  const sendTx = async (data: string, label: string, amount = '') => {
    if (!wallet) return;
    const txHash = await eth().request({ method:'eth_sendTransaction',
      params:[{from:wallet.address, to:WK_TOKEN_ADDRESS, data}] });
    showToast(`✅ ${label}: ${txHash.slice(0,14)}...`);
    setTxHistory(prev => [{hash:txHash, type:label, amount, time:new Date().toLocaleString('vi-VN')}, ...prev]);
    setTimeout(() => refreshWallet(wallet.address), 3000);
    return txHash;
  };

  const handleSend = async () => {
    if (!wallet || !WK_TOKEN_ADDRESS) return;
    if (!/^0x[0-9a-fA-F]{40}$/.test(sendTo)) { setError('Địa chỉ không hợp lệ'); return; }
    const n = parseFloat(sendAmount);
    if (!n || n <= 0) { setError('Nhập số WK'); return; }
    setSending(true); setError('');
    try {
      await sendTx('0xa9059cbb'+sendTo.slice(2).padStart(64,'0')+toWei(n), `Gửi ${sendAmount} WK`, `-${sendAmount} WK`);
      setSendTo(''); setSendAmount('');
    } catch(err:any) { setError(err.message); } finally { setSending(false); }
  };

  const handleStake = async () => {
    const n = parseFloat(stakeAmt); if (!n||n<=0){setError('Nhập số WK');return;}
    setStaking(true); setError('');
    try { await sendTx('0xa694fc3a'+toWei(n), `Stake ${stakeAmt} WK`); setStakeAmt(''); }
    catch(err:any){setError(err.message);} finally{setStaking(false);}
  };

  const handleUnstake = async () => {
    const n = parseFloat(unstakeAmt); if (!n||n<=0){setError('Nhập số WK');return;}
    setUnstaking(true); setError('');
    try { await sendTx('0x2e1a7d4d'+toWei(n), `Unstake ${unstakeAmt} WK`); setUnstakeAmt(''); }
    catch(err:any){setError(err.message);} finally{setUnstaking(false);}
  };

  const handleClaim = async () => {
    setClaiming(true); setError('');
    try { await sendTx('0x4e71d92d', 'Claim WK Reward'); }
    catch(err:any){setError(err.message);} finally{setClaiming(false);}
  };

  const isWrongNet = wallet && wallet.chainId !== ACTIVE_CHAIN;

  const inputStyle: React.CSSProperties = {
    width:'100%', padding:'10px 14px', borderRadius:8, border:'1px solid var(--border)',
    background:'var(--bg-1)', color:'var(--text-1)', fontSize:'.82rem',
  };
  const cardStyle: React.CSSProperties = {
    padding:20, borderRadius:12, border:'1px solid var(--border)', background:'var(--bg-1)', marginBottom:16,
  };

  return (
    <div style={{minHeight:'100vh', background:'var(--bg-0)', color:'var(--text-1)'}}>
      {toast && (
        <div style={{position:'fixed',top:80,right:20,zIndex:9999,padding:'12px 20px',borderRadius:10,
          background:toast.ok?'rgba(34,197,94,.95)':'rgba(239,68,68,.95)',
          color:'#fff',fontWeight:700,fontSize:'.82rem',boxShadow:'0 4px 20px rgba(0,0,0,.3)',maxWidth:340}}>
          {toast.msg}
        </div>
      )}

      <div style={{padding:'24px 32px 40px', maxWidth:1400, margin:'0 auto'}}>
        {/* Header */}
        <div style={{display:'flex',alignItems:'center',gap:16,marginBottom:24}}>
          <div style={{width:52,height:52,borderRadius:'50%',
            background:'linear-gradient(135deg,var(--c4-500),var(--c6-500))',
            display:'flex',alignItems:'center',justifyContent:'center',
            fontSize:'1.1rem',fontWeight:900,color:'#fff',flexShrink:0}}>
            WK
          </div>
          <div style={{flex:1}}>
            <div style={{fontWeight:900,fontSize:'1.3rem'}}>WellKOC Token (WK)</div>
            <div style={{fontSize:'.72rem',color:'var(--text-3)'}}>
              ERC-20 · Polygon · 10,000,000,000 WK · {networkName}
            </div>
          </div>
          {wallet ? (
            <div style={{padding:'6px 14px',borderRadius:20,fontSize:'.72rem',fontWeight:700,
              background:isWrongNet?'rgba(239,68,68,.15)':'rgba(34,197,94,.12)',
              color:isWrongNet?'#ef4444':'var(--c4-500)'}}>
              {isWrongNet ? '⚠️ Sai mạng' : '🟢 ' + fmtAddr(wallet.address)}
            </div>
          ) : null}
        </div>

        {/* Tabs */}
        <div style={{display:'flex',gap:2,marginBottom:20,borderBottom:'1px solid var(--border)'}}>
          {(['wallet','stake','send','info'] as const).map(t=>(
            <button key={t} onClick={()=>setTab(t)} style={{
              padding:'8px 16px',background:'none',border:'none',cursor:'pointer',fontSize:'.82rem',
              fontWeight:tab===t?700:400, color:tab===t?'var(--c4-500)':'var(--text-3)',
              borderBottom:tab===t?'2px solid var(--c4-500)':'2px solid transparent',transition:'all .15s',
            }}>
              {t==='wallet'?'💼 Ví':t==='stake'?'🔒 Stake':t==='send'?'📤 Gửi':'ℹ️ Thông tin'}
            </button>
          ))}
        </div>

        {error && <div style={{color:'#ef4444',fontSize:'.82rem',marginBottom:12,padding:'8px 12px',borderRadius:8,background:'rgba(239,68,68,.1)'}}>⚠️ {error}</div>}

        {/* ── WALLET ── */}
        {tab==='wallet' && (
          !wallet ? (
            <div style={{textAlign:'center',padding:'60px 20px'}}>
              <div style={{fontSize:'3rem',marginBottom:12}}>🦊</div>
              <div style={{fontWeight:700,fontSize:'1.1rem',marginBottom:8}}>Kết nối MetaMask để quản lý WK Token</div>
              <div style={{fontSize:'.82rem',color:'var(--text-3)',marginBottom:24}}>
                Cần MetaMask để xem số dư, gửi, stake WK Token trên Polygon
              </div>
              <button onClick={connectWallet} disabled={connecting} style={{
                padding:'12px 32px',borderRadius:10,border:'none',cursor:'pointer',fontWeight:700,fontSize:'1rem',
                background:'linear-gradient(135deg,var(--c4-500),var(--c6-500))',color:'#fff'}}>
                {connecting?'Đang kết nối...':'🦊 Kết nối MetaMask'}
              </button>
              <div style={{marginTop:14,fontSize:'.72rem',color:'var(--text-4)'}}>
                Chưa có MetaMask? <a href="https://metamask.io" target="_blank" rel="noreferrer" style={{color:'var(--c4-500)'}}>Tải tại đây ↗</a>
              </div>
            </div>
          ) : (
            <>
              {isWrongNet && (
                <div style={{padding:'10px 16px',marginBottom:16,borderRadius:10,
                  background:'rgba(239,68,68,.1)',border:'1px solid rgba(239,68,68,.3)',
                  color:'#ef4444',fontSize:'.82rem',fontWeight:600}}>
                  ⚠️ Bạn đang ở sai mạng. Chuyển sang {networkName} trong MetaMask.
                </div>
              )}
              <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(140px,1fr))',gap:14,marginBottom:16}}>
                {[
                  {label:'WK Balance',value:fmt(wallet.wkBalance),sub:`≈ $${(Number(BigInt(wallet.wkBalance||'0'))/1e18*0.012).toFixed(4)}`,color:'var(--c4-500)',icon:'💎'},
                  {label:'WK Staked',value:fmt(wallet.stakedAmount),sub:'5% APY',color:'var(--c6-500)',icon:'🔒'},
                  {label:'MATIC',value:fmt(wallet.maticBalance,4),sub:'Gas fee',color:'var(--c7-500)',icon:'⬡'},
                ].map(c=>(
                  <div key={c.label} style={{...cardStyle,borderLeft:`3px solid ${c.color}`,marginBottom:0}}>
                    <div style={{fontSize:'.65rem',color:'var(--text-3)',marginBottom:4,textTransform:'uppercase',letterSpacing:'.05em'}}>{c.icon} {c.label}</div>
                    <div style={{fontWeight:900,fontSize:'1.4rem',color:c.color,fontFamily:'var(--ff-display)'}}>{c.value}</div>
                    <div style={{fontSize:'.65rem',color:'var(--text-4)'}}>{c.sub}</div>
                  </div>
                ))}
              </div>

              {BigInt(wallet.pendingReward||'0') > 0n && (
                <div style={{...cardStyle,background:'rgba(34,197,94,.07)',border:'1px solid rgba(34,197,94,.25)',
                  display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                  <div>
                    <div style={{fontWeight:700,fontSize:'.82rem',color:'var(--c4-500)'}}>🎁 Phần thưởng Staking đang chờ</div>
                    <div style={{fontSize:'.72rem',color:'var(--text-3)'}}>{fmt(wallet.pendingReward)} WK (5% APY)</div>
                  </div>
                  <button onClick={handleClaim} disabled={claiming} style={{padding:'8px 18px',borderRadius:8,
                    background:'var(--c4-500)',color:'#fff',border:'none',cursor:'pointer',fontWeight:700,fontSize:'.78rem'}}>
                    {claiming?'...':'Claim'}
                  </button>
                </div>
              )}

              <div style={{...cardStyle}}>
                <div style={{fontSize:'.68rem',color:'var(--text-3)',marginBottom:6}}>Địa chỉ ví</div>
                <div style={{display:'flex',alignItems:'center',gap:8,flexWrap:'wrap'}}>
                  <code style={{fontSize:'.75rem',flex:1,wordBreak:'break-all'}}>{wallet.address}</code>
                  <button onClick={()=>{navigator.clipboard.writeText(wallet.address);showToast('Đã copy địa chỉ');}}
                    style={{padding:'4px 10px',borderRadius:6,background:'var(--bg-2)',border:'1px solid var(--border)',cursor:'pointer',fontSize:'.7rem'}}>Copy</button>
                  <a href={`${explorerBase}/address/${wallet.address}`} target="_blank" rel="noreferrer"
                    style={{padding:'4px 10px',borderRadius:6,background:'var(--bg-2)',border:'1px solid var(--border)',fontSize:'.7rem',color:'var(--c5-500)',textDecoration:'none'}}>
                    Polygonscan ↗
                  </a>
                </div>
              </div>

              <div style={{display:'flex',gap:10,marginBottom:16,flexWrap:'wrap'}}>
                <button onClick={()=>setTab('send')} className="btn btn-secondary btn-sm">📤 Gửi WK</button>
                <button onClick={()=>setTab('stake')} className="btn btn-secondary btn-sm">🔒 Stake WK</button>
                <a href={`https://quickswap.exchange/#/swap?outputCurrency=${WK_TOKEN_ADDRESS}`} target="_blank" rel="noreferrer"
                  style={{padding:'6px 14px',borderRadius:8,background:'rgba(99,102,241,.1)',color:'var(--c6-500)',
                    border:'1px solid rgba(99,102,241,.2)',fontSize:'.78rem',fontWeight:700,textDecoration:'none'}}>
                  ⇄ Swap QuickSwap
                </a>
                <button onClick={()=>refreshWallet(wallet.address)} className="btn btn-secondary btn-sm">🔄 Làm mới</button>
              </div>

              {txHistory.length > 0 && (
                <div style={{...cardStyle,padding:0,overflow:'hidden'}}>
                  <div style={{padding:'12px 16px',borderBottom:'1px solid var(--border)',fontWeight:700,fontSize:'.82rem'}}>📋 Lịch sử giao dịch</div>
                  {txHistory.slice(0,8).map((tx,i)=>(
                    <div key={i} style={{padding:'10px 16px',borderBottom:i<txHistory.length-1?'1px solid var(--border)':'none',
                      display:'flex',gap:12,alignItems:'center',fontSize:'.78rem'}}>
                      <div style={{flex:1}}>
                        <div style={{fontWeight:600}}>{tx.type}</div>
                        <div style={{fontSize:'.65rem',color:'var(--text-4)'}}>{tx.time}</div>
                      </div>
                      {tx.amount && <div style={{color:tx.amount.startsWith('-')?'#ef4444':'var(--c4-500)',fontWeight:700}}>{tx.amount}</div>}
                      <a href={`${explorerBase}/tx/${tx.hash}`} target="_blank" rel="noreferrer"
                        style={{fontSize:'.65rem',color:'var(--c5-500)'}}>{tx.hash.slice(0,10)}...↗</a>
                    </div>
                  ))}
                </div>
              )}
            </>
          )
        )}

        {/* ── STAKE ── */}
        {tab==='stake' && (
          !wallet ? <div style={{textAlign:'center',padding:40}}><button onClick={connectWallet} className="btn btn-primary">🦊 Kết nối ví trước</button></div> : (
            <>
              <div style={{...cardStyle,background:'rgba(99,102,241,.06)',border:'1px solid rgba(99,102,241,.2)'}}>
                <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(130px,1fr))',gap:16}}>
                  {[
                    {label:'APY',value:'5%',sub:'Trả WK mới',color:'var(--c4-500)'},
                    {label:'Đang stake',value:fmt(wallet.stakedAmount)+' WK',sub:'của bạn',color:'var(--c6-500)'},
                    {label:'Phần thưởng',value:fmt(wallet.pendingReward)+' WK',sub:'Claim bất kỳ lúc',color:'var(--c4-500)'},
                  ].map(c=>(
                    <div key={c.label}>
                      <div style={{fontSize:'.68rem',color:'var(--text-3)',marginBottom:4}}>{c.label}</div>
                      <div style={{fontWeight:900,fontSize:'1.3rem',color:c.color}}>{c.value}</div>
                      <div style={{fontSize:'.65rem',color:'var(--text-4)'}}>{c.sub}</div>
                    </div>
                  ))}
                </div>
              </div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
                <div style={cardStyle}>
                  <div style={{fontWeight:700,fontSize:'.85rem',marginBottom:12}}>🔒 Stake WK</div>
                  <input type="number" placeholder="Số WK" value={stakeAmt} onChange={e=>setStakeAmt(e.target.value)} style={{...inputStyle,marginBottom:6}} />
                  <div style={{fontSize:'.65rem',color:'var(--text-4)',marginBottom:10}}>Có sẵn: {fmt(wallet.wkBalance)} WK</div>
                  <button onClick={handleStake} disabled={staking} style={{width:'100%',padding:'10px',borderRadius:8,
                    background:'var(--c6-500)',color:'#fff',border:'none',cursor:'pointer',fontWeight:700,fontSize:'.82rem'}}>
                    {staking?'⛓️ Đang xử lý...':'🔒 Stake ngay'}
                  </button>
                </div>
                <div style={cardStyle}>
                  <div style={{fontWeight:700,fontSize:'.85rem',marginBottom:12}}>🔓 Unstake WK</div>
                  <input type="number" placeholder="Số WK" value={unstakeAmt} onChange={e=>setUnstakeAmt(e.target.value)} style={{...inputStyle,marginBottom:6}} />
                  <div style={{fontSize:'.65rem',color:'var(--text-4)',marginBottom:10}}>Đang stake: {fmt(wallet.stakedAmount)} WK</div>
                  <button onClick={handleUnstake} disabled={unstaking} style={{width:'100%',padding:'10px',borderRadius:8,
                    background:'rgba(99,102,241,.15)',color:'var(--c6-500)',border:'1px solid rgba(99,102,241,.3)',cursor:'pointer',fontWeight:700,fontSize:'.82rem'}}>
                    {unstaking?'⛓️ Đang xử lý...':'🔓 Unstake + nhận thưởng'}
                  </button>
                </div>
              </div>
              {BigInt(wallet.pendingReward||'0') > 0n && (
                <div style={{...cardStyle,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                  <div>
                    <div style={{fontWeight:700,fontSize:'.82rem'}}>🎁 Claim phần thưởng</div>
                    <div style={{fontSize:'.72rem',color:'var(--text-3)'}}>{fmt(wallet.pendingReward)} WK đang chờ</div>
                  </div>
                  <button onClick={handleClaim} disabled={claiming} style={{padding:'8px 20px',borderRadius:8,
                    background:'var(--c4-500)',color:'#fff',border:'none',cursor:'pointer',fontWeight:700,fontSize:'.78rem'}}>
                    {claiming?'...':'Claim WK'}
                  </button>
                </div>
              )}
            </>
          )
        )}

        {/* ── SEND ── */}
        {tab==='send' && (
          !wallet ? <div style={{textAlign:'center',padding:40}}><button onClick={connectWallet} className="btn btn-primary">🦊 Kết nối ví trước</button></div> : (
            <div style={{...cardStyle,maxWidth:640}}>
              <div style={{fontWeight:700,fontSize:'1rem',marginBottom:20}}>📤 Gửi WK Token</div>
              <div style={{marginBottom:14}}>
                <label style={{fontSize:'.72rem',color:'var(--text-3)',display:'block',marginBottom:4}}>Địa chỉ nhận (0x...)</label>
                <input value={sendTo} onChange={e=>setSendTo(e.target.value)} placeholder="0x1234...abcd" style={inputStyle} />
              </div>
              <div style={{marginBottom:14}}>
                <label style={{fontSize:'.72rem',color:'var(--text-3)',display:'block',marginBottom:4}}>Số WK muốn gửi</label>
                <div style={{display:'flex',gap:8}}>
                  <input type="number" value={sendAmount} onChange={e=>setSendAmount(e.target.value)} placeholder="100" style={{...inputStyle,flex:1}} />
                  <button onClick={()=>setSendAmount(fmt(wallet.wkBalance,6))} style={{padding:'0 12px',borderRadius:8,
                    background:'var(--bg-2)',border:'1px solid var(--border)',cursor:'pointer',fontSize:'.72rem'}}>MAX</button>
                </div>
                <div style={{fontSize:'.65rem',color:'var(--text-4)',marginTop:4}}>Số dư: {fmt(wallet.wkBalance)} WK</div>
              </div>
              <button onClick={handleSend} disabled={sending} style={{width:'100%',padding:'12px',borderRadius:8,
                background:'linear-gradient(135deg,var(--c4-500),var(--c6-500))',
                color:'#fff',border:'none',cursor:'pointer',fontWeight:700,fontSize:'.9rem'}}>
                {sending?'⛓️ Đang gửi...':'📤 Xác nhận gửi WK'}
              </button>
              <div style={{fontSize:'.65rem',color:'var(--text-4)',marginTop:10,textAlign:'center'}}>
                Cần xác nhận trong MetaMask. Cần MATIC để trả gas.
              </div>
            </div>
          )
        )}

        {/* ── INFO ── */}
        {tab==='info' && (
          <>
            <div style={cardStyle}>
              <div style={{fontWeight:700,marginBottom:16}}>📋 Thông tin Token</div>
              <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(130px,1fr))',gap:10}}>
                {[
                  ['Tên token','WellKOC Token'],['Symbol','WK'],['Decimal','18'],
                  ['Blockchain','Polygon (MATIC)'],['Chuẩn','ERC-20 + Permit + Votes'],
                  ['Tổng cung (cố định)','10,000,000,000 WK'],
                  ['Contract',WK_TOKEN_ADDRESS||'Đang deploy...'],
                  ['Thư viện','OpenZeppelin v5 (audited)'],
                ].map(([k,v])=>(
                  <div key={k} style={{padding:'10px 12px',borderRadius:8,background:'var(--bg-2)'}}>
                    <div style={{fontSize:'.62rem',color:'var(--text-4)',marginBottom:2}}>{k}</div>
                    <div style={{fontSize:'.78rem',fontWeight:600,wordBreak:'break-all'}}>{v}</div>
                  </div>
                ))}
              </div>
            </div>

            <div style={cardStyle}>
              <div style={{fontWeight:700,marginBottom:16}}>🥧 Tokenomics — 10 tỷ WK (bất biến)</div>
              <div style={{display:'flex',flexDirection:'column',gap:12}}>
                {TOKENOMICS.map(t=>(
                  <div key={t.label}>
                    <div style={{display:'flex',justifyContent:'space-between',marginBottom:4}}>
                      <span style={{fontSize:'.78rem',fontWeight:600}}>{t.label}</span>
                      <span style={{fontSize:'.78rem',fontWeight:700,color:t.color}}>{t.pct}%</span>
                    </div>
                    <div style={{height:8,borderRadius:4,background:'var(--bg-2)',overflow:'hidden'}}>
                      <div style={{width:`${t.pct}%`,height:'100%',background:t.color,borderRadius:4}} />
                    </div>
                    <div style={{fontSize:'.65rem',color:'var(--text-4)',marginTop:2}}>{t.desc}</div>
                  </div>
                ))}
              </div>
            </div>

            <div style={cardStyle}>
              <div style={{fontWeight:700,marginBottom:16}}>⚡ Ứng dụng WK Token</div>
              <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(140px,1fr))',gap:12}}>
                {UTILITY.map(u=>(
                  <div key={u.title} style={{padding:14,borderRadius:10,background:'var(--bg-2)',border:'1px solid var(--border)'}}>
                    <div style={{fontSize:'1.2rem',marginBottom:6}}>{u.icon}</div>
                    <div style={{fontWeight:700,fontSize:'.8rem',marginBottom:4}}>{u.title}</div>
                    <div style={{fontSize:'.68rem',color:'var(--text-3)',lineHeight:1.5}}>{u.desc}</div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{...cardStyle,background:'rgba(99,102,241,.06)',border:'1px solid rgba(99,102,241,.2)'}}>
              <div style={{fontWeight:700,marginBottom:12,color:'var(--c6-500)'}}>🔐 Bảo mật Smart Contract</div>
              <div style={{display:'flex',flexDirection:'column',gap:8}}>
                {SECURITY.map(([k,v])=>(
                  <div key={k} style={{display:'flex',gap:10,padding:'8px 12px',borderRadius:8,background:'var(--bg-1)'}}>
                    <span style={{color:'var(--c4-500)',fontWeight:700,fontSize:'.72rem',minWidth:160,flexShrink:0}}>✅ {k}</span>
                    <span style={{fontSize:'.72rem',color:'var(--text-3)'}}>{v}</span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
