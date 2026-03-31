/**
 * WellKOC — 333 Agent Command Center
 * Tab theo nhóm → grid agent → click agent locked → upgrade modal
 * Click agent unlocked → detail panel + dispatch / launch pipeline
 */
import { useState, useRef, useCallback, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@hooks/useAuth';
import { API_BASE } from '@hooks/useAuth';

/* ─── Types ─── */
interface AgentDef {
  id: string; name: string; squad: Squad;
  icon: string; count: number; color: string;
  role: string; spec: string[]; desc: string;
}
interface Msg { id: string; agentId: string; content: string; ts: string; }
interface OutItem { icon: string; title: string; color: string; }
type AS = 'idle' | 'working' | 'done';
type Squad = 'content' | 'dist' | 'engage';

/* ─── Palette ─── */
const C = {
  gold: '#f0a500', cyan: '#00c9c8', purple: '#a78bfa',
  green: '#22c55e', red: '#ff6b6b', amber: '#fb923c',
  rose: '#f472b6', blue: '#60a5fa', muted: '#4a6a8a',
} as const;

/* ─── Agent catalogue ─── */
const AGENTS: AgentDef[] = [
  // Content Factory (111 = 10+10+10+10+10+10+10+10+11+10 simplified as ×10 per agent)
  { id:'tiktok_s',  name:'TikTok Script',      squad:'content', icon:'📱', count:12, color:C.amber,  role:'Video Agent',    spec:['Hook 3s','Script 60s','Caption','Hashtag'],       desc:'Tự động viết script TikTok tối ưu thuật toán, hook 3 giây đầu, call-to-action mạnh.' },
  { id:'reels_s',   name:'Reels Script',        squad:'content', icon:'🎬', count:10, color:C.purple, role:'Video Agent',    spec:['IG Reels','FB Reels','Audio suggest'],             desc:'Script cho Instagram & Facebook Reels, đề xuất âm thanh trending phù hợp sản phẩm.' },
  { id:'blog_w',    name:'Blog Writer',          squad:'content', icon:'✍️',  count:10, color:C.blue,   role:'Content Agent',  spec:['SEO','Long-form','Product review'],               desc:'Viết bài blog chuẩn SEO, đánh giá sản phẩm, tối ưu từ khoá và meta description.' },
  { id:'img_gen',   name:'Image Generator',      squad:'content', icon:'🎨', count:10, color:C.rose,   role:'Design Agent',   spec:['Banner','Thumbnail','Infographic'],               desc:'Tạo banner đa kích thước, thumbnail YouTube, infographic sản phẩm theo brand.' },
  { id:'email_c',   name:'Email Copywriter',     squad:'content', icon:'📧', count:10, color:C.green,  role:'Copy Agent',     spec:['Subject line','CTA','Personalize'],               desc:'Viết chuỗi email marketing cá nhân hoá, tối ưu open rate và click-through rate.' },
  { id:'seo_opt',   name:'SEO Optimizer',        squad:'content', icon:'🔍', count:10, color:C.cyan,   role:'SEO Agent',      spec:['Keywords','Meta tags','Backlink'],                desc:'Phân tích và tối ưu SEO on-page, đề xuất từ khoá, cấu trúc nội dung chuẩn Google.' },
  { id:'script_fb', name:'Facebook Ad Script',   squad:'content', icon:'💬', count:10, color:C.blue,   role:'Ad Agent',       spec:['Ad copy','Hook','Objection handle'],              desc:'Viết nội dung quảng cáo Facebook, xử lý phản đối và tối ưu tỷ lệ chuyển đổi.' },
  { id:'zalo_c',    name:'Zalo Content',         squad:'content', icon:'💚', count:10, color:C.cyan,   role:'Content Agent',  spec:['Zalo OA','Broadcast','Mini App'],                desc:'Tạo nội dung cho Zalo OA, tin broadcast, bài viết trang Zalo tối ưu.' },
  { id:'shopee_c',  name:'Shopee Listing',       squad:'content', icon:'🛍️',  count:10, color:C.amber,  role:'Commerce Agent', spec:['Product title','Description','Bullet'],          desc:'Tối ưu tiêu đề, mô tả sản phẩm Shopee, từ khoá tìm kiếm và bullet points.' },
  { id:'yt_script', name:'YouTube Script',       squad:'content', icon:'▶️',  count:9,  color:C.red,    role:'Video Agent',    spec:['Intro hook','Chapter','CTA'],                     desc:'Script YouTube dạng dài, cấu trúc chương, hook mở đầu và lời kêu gọi hành động.' },
  { id:'infl_b',    name:'Influencer Brief',     squad:'content', icon:'⭐', count:10, color:C.gold,   role:'KOC Agent',      spec:['Brand voice','Dos & Donts','KPI'],               desc:'Tạo brief cho KOC/Influencer: brand voice, guideline, KPI target và deliverables.' },

  // Distribution Grid (111)
  { id:'tiktok_d',  name:'TikTok Distributor',   squad:'dist',    icon:'📤', count:12, color:C.amber,  role:'Dist Agent',     spec:['Best time','Auto-post','A/B test'],               desc:'Phân tích giờ vàng TikTok, tự động lên lịch và A/B test nội dung để tối ưu reach.' },
  { id:'ig_d',      name:'IG Distributor',        squad:'dist',    icon:'📸', count:10, color:C.rose,   role:'Dist Agent',     spec:['Feed + Story','Carousel','Reel'],                 desc:'Quản lý lịch đăng Instagram: Feed, Story, Carousel, Reel — tối ưu thuật toán IG.' },
  { id:'fb_d',      name:'Facebook Distributor',  squad:'dist',    icon:'👥', count:10, color:C.blue,   role:'Dist Agent',     spec:['Page + Group','Boost ready','Pixel'],             desc:'Đăng bài trang & nhóm Facebook, chuẩn bị nội dung boost ads và cài Pixel tracking.' },
  { id:'yt_d',      name:'YouTube Scheduler',     squad:'dist',    icon:'📺', count:10, color:C.red,    role:'Dist Agent',     spec:['Thumbnail','Description','Card'],                 desc:'Lên lịch upload YouTube, tối ưu metadata, thumbnail và end card.' },
  { id:'zalo_d',    name:'Zalo Distributor',      squad:'dist',    icon:'💬', count:10, color:C.cyan,   role:'Dist Agent',     spec:['OA Post','Zalo Ad','Broadcast'],                  desc:'Phân phối nội dung qua Zalo OA, quảng cáo Zalo và tin broadcast hàng loạt.' },
  { id:'shopee_d',  name:'Shopee Scheduler',      squad:'dist',    icon:'🛒', count:10, color:C.amber,  role:'Dist Agent',     spec:['Flash deal','Feed post','Voucher'],               desc:'Quản lý flash deal, lịch đăng feed Shopee và phát hành voucher tự động.' },
  { id:'lazada_d',  name:'Lazada Distributor',    squad:'dist',    icon:'📦', count:10, color:C.blue,   role:'Dist Agent',     spec:['LazLive','Campaign','Flash sale'],                desc:'Phân phối sản phẩm trên Lazada, tham gia campaign nền tảng và flash sale.' },
  { id:'email_d',   name:'Email Distributor',     squad:'dist',    icon:'📨', count:10, color:C.green,  role:'Dist Agent',     spec:['Segment','A/B','Drip'],                           desc:'Phân đoạn danh sách email, A/B test tiêu đề, tự động hóa drip campaign.' },
  { id:'sms_d',     name:'SMS Dispatcher',        squad:'dist',    icon:'📱', count:10, color:C.purple, role:'Dist Agent',     spec:['OTP','Promo SMS','Zalo ZNS'],                     desc:'Gửi SMS khuyến mại, OTP và Zalo ZNS notification tự động theo trigger.' },
  { id:'push_d',    name:'Push Notification',     squad:'dist',    icon:'🔔', count:9,  color:C.cyan,   role:'Dist Agent',     spec:['Web push','App push','Segment'],                  desc:'Gửi web push và app push notification theo segment người dùng tự động.' },

  // Engagement Matrix (111)
  { id:'comment_r', name:'Comment Responder',     squad:'engage',  icon:'💬', count:12, color:C.purple, role:'Engage Agent',   spec:['Sentiment','Auto-reply','Escalate'],              desc:'Phân tích sentiment, tự động trả lời comment theo tone brand, escalate vấn đề.' },
  { id:'koc_m',     name:'KOC Matcher',           squad:'engage',  icon:'🤝', count:10, color:C.gold,   role:'Engage Agent',   spec:['Match score','Brief send','Track'],               desc:'Tìm kiếm và match KOC phù hợp sản phẩm, gửi brief tự động và tracking kết quả.' },
  { id:'review_a',  name:'Review Analyzer',       squad:'engage',  icon:'⭐', count:10, color:C.green,  role:'Engage Agent',   spec:['NPS','Sentiment','Alert'],                        desc:'Phân tích đánh giá sản phẩm, tính NPS, cảnh báo review tiêu cực.' },
  { id:'trend_w',   name:'Trend Watcher',         squad:'engage',  icon:'📈', count:10, color:C.blue,   role:'Intel Agent',    spec:['Trending tags','Viral detect','Alert'],           desc:'Theo dõi xu hướng TikTok/IG/FB, phát hiện nội dung viral, cảnh báo cơ hội.' },
  { id:'bi_r',      name:'BI Reporter',           squad:'engage',  icon:'📊', count:10, color:C.cyan,   role:'Analyst Agent',  spec:['ROAS','GMV','CAC','LTV'],                         desc:'Báo cáo BI tự động: ROAS, GMV, CAC, LTV — xuất Excel và dashboard real-time.' },
  { id:'fraud_d',   name:'Fraud Detector',        squad:'engage',  icon:'🛡️',  count:10, color:C.red,    role:'Guard Agent',    spec:['Bot detect','Click fraud','Shield'],              desc:'Phát hiện bot traffic, click fraud, bảo vệ ngân sách quảng cáo và brand safety.' },
  { id:'cs_bot',    name:'CS Chatbot',            squad:'engage',  icon:'🤖', count:10, color:C.purple, role:'CS Agent',       spec:['FAQ','Order track','Refund'],                     desc:'Chatbot CSKH tự động trả lời FAQ, tra cứu đơn hàng và xử lý hoàn trả.' },
  { id:'loyalty_e', name:'Loyalty Engine',        squad:'engage',  icon:'💎', count:10, color:C.gold,   role:'CRM Agent',      spec:['Points','Tier upgrade','Gift'],                   desc:'Quản lý điểm thưởng, nâng hạng tự động và gợi ý quà tặng cho khách hàng trung thành.' },
  { id:'live_a',    name:'Live Commerce Agent',   squad:'engage',  icon:'📡', count:10, color:C.red,    role:'Live Agent',     spec:['Script','Q&A','Flash deal'],                     desc:'Hỗ trợ livestream: script realtime, trả lời Q&A tự động, kích hoạt flash deal.' },
  { id:'retarget',  name:'Retargeting Agent',     squad:'engage',  icon:'🎯', count:9,  color:C.amber,  role:'Ads Agent',      spec:['Custom audience','Lookalike','ROAS opt'],         desc:'Tạo custom audience, lookalike và tối ưu retargeting ads tự động.' },
];

const SQUADS: { id: Squad; label: string; count: number; icon: string; color: string }[] = [
  { id:'content', label:'Content Factory',    count:111, icon:'✍️',  color:C.purple },
  { id:'dist',    label:'Distribution Grid',  count:111, icon:'📤', color:C.amber },
  { id:'engage',  label:'Engagement Matrix',  count:111, icon:'💬', color:C.cyan },
];

const STAGES = [
  {id:'intake',label:'Intake',icon:'📥',color:C.blue},{id:'research',label:'Research',icon:'🔍',color:C.cyan},
  {id:'content',label:'Content',icon:'✍️',color:C.purple},{id:'design',label:'Design',icon:'🎨',color:C.rose},
  {id:'schedule',label:'Schedule',icon:'📅',color:C.amber},{id:'publish',label:'Publish',icon:'📤',color:C.green},
  {id:'engage',label:'Engage',icon:'💬',color:C.gold},{id:'analyze',label:'Analyze',icon:'📊',color:C.blue},
  {id:'report',label:'Report',icon:'📋',color:C.cyan},
];

const PRESETS = [
  {label:'Flash Sale 12/12',brief:'Chiến dịch flash sale lớn ngày 12/12, giảm đến 70%, tất cả danh mục sản phẩm, thúc đẩy GMV tối đa trong 24h.',platforms:['tiktok','instagram','facebook','shopee']},
  {label:'Ra mắt sản phẩm',brief:'Ra mắt dòng sản phẩm skincare organic mới, target phụ nữ 25-35 tuổi, Hà Nội & HCM, budget 50M VND.',platforms:['tiktok','instagram','youtube']},
  {label:'KOC Ambassador',brief:'Tuyển dụng và kích hoạt 50 KOC tier micro, category thời trang & beauty, campaign 30 ngày.',platforms:['tiktok','instagram']},
  {label:'Tet Campaign',brief:'Chiến dịch Tết Nguyên Đán, quà tặng cao cấp, voucher gia đình, livestream Tất Niên, target toàn quốc.',platforms:['tiktok','facebook','zalo','shopee']},
  {label:'Reactivation',brief:'Tái kích hoạt 100K khách hàng cũ chưa mua trong 90 ngày, email + Zalo OA + retargeting.',platforms:['zalo','facebook']},
];

const PLATFORMS:{[k:string]:{label:string;color:string}}={
  tiktok:{label:'TikTok',color:'#00c9c8'},instagram:{label:'Instagram',color:'#f472b6'},
  facebook:{label:'Facebook',color:'#60a5fa'},youtube:{label:'YouTube',color:'#ff6b6b'},
  zalo:{label:'Zalo',color:'#2563eb'},shopee:{label:'Shopee',color:'#f0a500'},
};

function uid(){return Math.random().toString(36).slice(2,8);}
function ts(){return new Date().toLocaleTimeString('vi-VN',{hour12:false});}
function getAccess(role?:string){return role==='koc'||role==='vendor'||role==='admin';}

/* ─── Upgrade Modal ─── */
function UpgradeModal({agent,onClose}:{agent:AgentDef;onClose:()=>void}) {
  return (
    <div style={{position:'fixed',inset:0,zIndex:2000,display:'flex',alignItems:'center',justifyContent:'center',background:'rgba(0,0,0,.7)',backdropFilter:'blur(8px)'}}
      onClick={onClose}>
      <div style={{background:'#0d2137',border:'1px solid rgba(0,201,200,.25)',borderRadius:20,padding:'32px',maxWidth:480,width:'90%',boxShadow:'0 24px 60px rgba(0,0,0,.6)'}}
        onClick={e=>e.stopPropagation()}>
        {/* Agent preview */}
        <div style={{textAlign:'center',marginBottom:24}}>
          <div style={{fontSize:48,marginBottom:8}}>{agent.icon}</div>
          <div style={{fontSize:'1.2rem',fontWeight:800,color:agent.color,marginBottom:4}}>{agent.name}</div>
          <div style={{fontSize:'0.8rem',color:'#4a6a8a'}}>{agent.role}</div>
        </div>

        <div style={{background:'rgba(255,255,255,.04)',borderRadius:12,padding:'16px',marginBottom:20,border:'1px solid rgba(255,255,255,.08)'}}>
          <div style={{fontSize:'0.8rem',color:'#8ba3c1',lineHeight:1.6}}>{agent.desc}</div>
          <div style={{display:'flex',flexWrap:'wrap' as const,gap:6,marginTop:12}}>
            {agent.spec.map(s=>(
              <span key={s} style={{padding:'3px 10px',borderRadius:20,background:`${agent.color}18`,color:agent.color,fontSize:'0.72rem',fontWeight:600,border:`1px solid ${agent.color}33`}}>{s}</span>
            ))}
          </div>
        </div>

        <div style={{background:'rgba(0,201,200,.06)',border:'1px solid rgba(0,201,200,.2)',borderRadius:12,padding:'14px',marginBottom:20,textAlign:'center'}}>
          <div style={{fontSize:'0.82rem',color:'#8ba3c1',marginBottom:4}}>Nâng cấp để mở khóa agent này</div>
          <div style={{fontSize:'1rem',fontWeight:700,color:'#00c9c8'}}>KOC Pro · 25 Agents — từ 299.000đ/tháng</div>
        </div>

        <div style={{display:'flex',gap:10}}>
          <button onClick={onClose} style={{flex:1,padding:'11px',borderRadius:10,border:'1px solid rgba(255,255,255,.12)',background:'transparent',color:'#8ba3c1',cursor:'pointer',fontSize:'0.85rem'}}>
            Để sau
          </button>
          <Link to="/pricing" onClick={onClose} style={{flex:2,padding:'11px',borderRadius:10,border:'none',background:'linear-gradient(135deg,#00c9c8,#a78bfa)',color:'#fff',cursor:'pointer',fontSize:'0.85rem',fontWeight:700,textDecoration:'none',textAlign:'center' as const,display:'flex',alignItems:'center',justifyContent:'center',gap:6}}>
            🚀 Xem gói KOC / Vendor
          </Link>
        </div>
      </div>
    </div>
  );
}

/* ─── Agent Detail Panel (right side) ─── */
function AgentPanel({agent,status,onClose,onDispatch,onLaunch,running}:{
  agent:AgentDef; status:AS; onClose:()=>void;
  onDispatch:(id:string)=>void; onLaunch:()=>void; running:boolean;
}) {
  return (
    <div style={{position:'absolute',top:0,right:0,bottom:0,width:320,background:'#071525',borderLeft:'1px solid rgba(255,255,255,.08)',display:'flex',flexDirection:'column',zIndex:100,boxShadow:'-8px 0 32px rgba(0,0,0,.4)'}}>
      {/* Header */}
      <div style={{padding:'20px',borderBottom:'1px solid rgba(255,255,255,.06)',display:'flex',alignItems:'flex-start',gap:12}}>
        <div style={{fontSize:36}}>{agent.icon}</div>
        <div style={{flex:1}}>
          <div style={{fontSize:'1rem',fontWeight:800,color:agent.color}}>{agent.name}</div>
          <div style={{fontSize:'0.72rem',color:'#4a6a8a',marginTop:2}}>{agent.role} · ×{agent.count} instances</div>
          <div style={{marginTop:6,display:'flex',alignItems:'center',gap:6}}>
            <div style={{width:7,height:7,borderRadius:'50%',background:status==='working'?C.amber:status==='done'?C.green:'#4a6a8a',boxShadow:status==='working'?`0 0 6px ${C.amber}`:undefined}}/>
            <span style={{fontSize:'0.7rem',color:'#8ba3c1'}}>{status==='working'?'Running':status==='done'?'Done':'Idle'}</span>
          </div>
        </div>
        <button onClick={onClose} style={{background:'none',border:'none',color:'#4a6a8a',cursor:'pointer',fontSize:'1.1rem',padding:4}}>✕</button>
      </div>

      {/* Desc */}
      <div style={{padding:'16px',borderBottom:'1px solid rgba(255,255,255,.06)'}}>
        <div style={{fontSize:'0.8rem',color:'#8ba3c1',lineHeight:1.6}}>{agent.desc}</div>
        <div style={{display:'flex',flexWrap:'wrap' as const,gap:5,marginTop:10}}>
          {agent.spec.map(s=>(
            <span key={s} style={{padding:'3px 9px',borderRadius:4,background:'rgba(255,255,255,.06)',color:'#8ba3c1',fontSize:'0.68rem'}}>{s}</span>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div style={{padding:'16px',borderBottom:'1px solid rgba(255,255,255,.06)',display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
        {[
          {lbl:'Instances',val:`×${agent.count}`},
          {lbl:'Squad',val:agent.squad==='content'?'Content':agent.squad==='dist'?'Distribution':'Engagement'},
          {lbl:'Status',val:status},
          {lbl:'Type',val:agent.role.replace(' Agent','')},
        ].map(m=>(
          <div key={m.lbl} style={{background:'rgba(255,255,255,.03)',borderRadius:8,padding:'10px',border:'1px solid rgba(255,255,255,.06)'}}>
            <div style={{fontSize:'0.72rem',color:'#4a6a8a',marginBottom:3}}>{m.lbl}</div>
            <div style={{fontSize:'0.85rem',fontWeight:700,color:'#c0d8f0',textTransform:'capitalize' as const}}>{m.val}</div>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div style={{padding:'16px',display:'flex',flexDirection:'column',gap:8,marginTop:'auto'}}>
        <button
          onClick={()=>onDispatch(agent.id)}
          disabled={running}
          style={{padding:'11px',borderRadius:10,border:'1px solid rgba(0,201,200,.3)',background:'rgba(0,201,200,.08)',color:'#00c9c8',cursor:'pointer',fontWeight:600,fontSize:'0.85rem'}}
        >⚡ Quick Dispatch</button>
        <button
          onClick={onLaunch}
          disabled={running}
          style={{padding:'11px',borderRadius:10,border:'none',background:running?'rgba(255,255,255,.08)':'linear-gradient(135deg,#00c9c8,#a78bfa)',color:running?'#4a6a8a':'#fff',cursor:running?'not-allowed':'pointer',fontWeight:700,fontSize:'0.85rem'}}
        >{running?'Pipeline đang chạy…':'🚀 Launch Pipeline'}</button>
      </div>
    </div>
  );
}

/* ─── Main page ─── */
export default function Agents() {
  const { token, user } = useAuth() as { token: string | null; user: { role?: string } | null };
  const hasAccess = getAccess(user?.role);

  /* squad tabs */
  const [activeSquad, setActiveSquad] = useState<Squad>('content');
  /* selected agent */
  const [selAgent, setSelAgent] = useState<AgentDef | null>(null);
  /* upgrade modal */
  const [upgradeAgent, setUpgradeAgent] = useState<AgentDef | null>(null);
  /* pipeline */
  const [agStatus, setAgStatus] = useState<Record<string,AS>>({});
  const [running, setRunning] = useState(false);
  const [actStage, setActStage] = useState<string|null>(null);
  const [doneStg, setDoneStg] = useState<string[]>([]);
  const [pct, setPct] = useState(0);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [outs, setOuts] = useState<OutItem[]>([]);
  const [brief, setBrief] = useState('');
  const [platforms, setPlatforms] = useState(['tiktok','instagram','facebook']);
  const [showPipeline, setShowPipeline] = useState(false);
  const [kpiPost, setKpiPost] = useState(0);
  const [kpiReach, setKpiReach] = useState(0);
  const [kpiRoas, setKpiRoas] = useState(0);
  const [kpiGmv, setKpiGmv] = useState(0);
  const [uptime, setUptime] = useState(0);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const msgsRef = useRef<HTMLDivElement>(null);

  useEffect(()=>{ const t=setInterval(()=>setUptime(u=>u+1),1000); return()=>clearInterval(t); },[]);
  useEffect(()=>{ if(msgsRef.current) msgsRef.current.scrollTop=msgsRef.current.scrollHeight; },[msgs]);

  const addMsg = useCallback((agentId:string,content:string)=>{
    setMsgs(m=>[...m,{id:uid(),agentId,content,ts:ts()}]);
  },[]);

  const handleEv = useCallback((ev:{type:string;stage?:string;agent_id?:string;content?:string;pct?:number;done_stages?:string[];metrics?:Record<string,number>})=>{
    if(ev.type==='stage_start'&&ev.stage){ setActStage(ev.stage); if(ev.agent_id) setAgStatus(s=>({...s,[ev.agent_id!]:'working'})); }
    if(ev.type==='stage_done'&&ev.stage){
      setDoneStg(d=>[...d,ev.stage!]);
      if(ev.pct!=null) setPct(ev.pct);
      if(ev.done_stages) setDoneStg(ev.done_stages);
      if(ev.content&&ev.agent_id){ addMsg(ev.agent_id,ev.content); setAgStatus(s=>({...s,[ev.agent_id!]:'done'})); }
      if(ev.metrics){
        if(ev.metrics.posts) setKpiPost(p=>p+ev.metrics!.posts);
        if(ev.metrics.reach) setKpiReach(p=>p+ev.metrics!.reach);
        if(ev.metrics.roas)  setKpiRoas(ev.metrics.roas);
        if(ev.metrics.gmv)   setKpiGmv(p=>p+ev.metrics!.gmv);
      }
      setOuts(o=>[...o,{icon:STAGES.find(s=>s.id===ev.stage)?.icon||'📄',title:`${ev.stage} output`,color:C.green}]);
    }
    if(ev.type==='complete'){ setRunning(false); setActStage(null); setPct(100); AGENTS.forEach(a=>setAgStatus(s=>({...s,[a.id]:'done'}))); }
    if(ev.type==='error'){ setRunning(false); }
  },[addMsg]);

  const runDemo = useCallback(()=>{
    timers.current.forEach(clearTimeout); timers.current=[];
    const ds=[
      {stage:'intake',  agent:'tiktok_s', content:'Phân tích brief xong. 6 nền tảng, budget 50M, KPI: GMV 500M.',         metrics:{posts:0,reach:0,roas:0,gmv:0}},
      {stage:'research',agent:'trend_w',  content:'Trending: #FlashSale #WellKOC. 3 đối thủ phân tích xong.',             metrics:{posts:0,reach:5000,roas:0,gmv:0}},
      {stage:'content', agent:'blog_w',   content:'12 TikTok scripts, 8 blogs, 24 IG captions đã hoàn thành.',            metrics:{posts:50,reach:20000,roas:0,gmv:0}},
      {stage:'design',  agent:'img_gen',  content:'48 banners, 12 thumbnails YouTube, 6 infographics xong.',               metrics:{posts:0,reach:0,roas:0,gmv:0}},
      {stage:'schedule',agent:'tiktok_d', content:'Lịch tối ưu: TikTok 19:00, IG 20:30, FB 12:00 & 21:00.',              metrics:{posts:60,reach:50000,roas:0,gmv:0}},
      {stage:'publish', agent:'ig_d',     content:'60 posts đã lên 6 nền tảng. Success rate 98.3%.',                       metrics:{posts:60,reach:150000,roas:0,gmv:0}},
      {stage:'engage',  agent:'comment_r',content:'284 comments trả lời. 12 KOC micro matched, brief đã gửi.',            metrics:{posts:0,reach:200000,roas:0,gmv:5000000}},
      {stage:'analyze', agent:'bi_r',     content:'CTR 4.7%, Conv 2.1%, ROAS 3.8x. Tăng budget TikTok +20%.',             metrics:{posts:0,reach:250000,roas:3.8,gmv:45000000}},
      {stage:'report',  agent:'fraud_d',  content:'Kết quả: GMV 450M, 18.5K đơn, ROAS 3.8x, NPS +12.',                   metrics:{posts:0,reach:300000,roas:3.8,gmv:450000000}},
    ];
    let delay=0;
    ds.forEach((st,i)=>{
      const pct=Math.round((i+1)/ds.length*100);
      timers.current.push(setTimeout(()=>handleEv({type:'stage_start',stage:st.stage,agent_id:st.agent}),delay));
      delay+=1800;
      timers.current.push(setTimeout(()=>handleEv({type:'stage_done',stage:st.stage,agent_id:st.agent,content:st.content,pct,done_stages:ds.slice(0,i+1).map(s=>s.stage),metrics:st.metrics}),delay));
      delay+=400;
    });
    timers.current.push(setTimeout(()=>handleEv({type:'complete'}),delay+300));
  },[handleEv]);

  const runFull = useCallback(async()=>{
    if(!brief.trim()) return;
    setRunning(true); setMsgs([]); setOuts([]); setDoneStg([]); setPct(0); setActStage(null);
    setKpiPost(0); setKpiReach(0); setKpiRoas(0); setKpiGmv(0);
    AGENTS.forEach(a=>setAgStatus(s=>({...s,[a.id]:'idle'})));
    if(!token){ runDemo(); return; }
    try{
      const res=await fetch(`${API_BASE}/api/v1/ai/marketing/run-campaign`,{method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${token}`},body:JSON.stringify({brief,platforms})});
      if(!res.ok||!res.body) throw new Error(`HTTP ${res.status}`);
      const reader=res.body.getReader(); const dec=new TextDecoder(); let buf='';
      while(true){ const {done,value}=await reader.read(); if(done) break;
        buf+=dec.decode(value,{stream:true}); const lines=buf.split('\n'); buf=lines.pop()||'';
        for(const line of lines){ if(line.startsWith('data: ')){ try{ handleEv(JSON.parse(line.slice(6))); }catch(_){} } }
      }
    }catch(_e){ runDemo(); }
  },[brief,platforms,token,handleEv,runDemo]);

  const quickDispatch = useCallback(async(agentId:string)=>{
    if(!token) return;
    try{ await fetch(`${API_BASE}/api/v1/ai/marketing/quick`,{method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${token}`},body:JSON.stringify({agent_id:agentId,task:'Thực hiện nhiệm vụ',context:{}})}); }catch(_){}
  },[token]);

  const handleAgentClick = (agent:AgentDef)=>{
    if(!hasAccess){ setUpgradeAgent(agent); return; }
    setSelAgent(s=>s?.id===agent.id?null:agent);
  };

  const fmtUptime=`${String(Math.floor(uptime/3600)).padStart(2,'0')}:${String(Math.floor(uptime%3600/60)).padStart(2,'0')}:${String(uptime%60).padStart(2,'0')}`;
  const squadAgents = AGENTS.filter(a=>a.squad===activeSquad);

  return (
    <>
      {/* Fixed full-page container below navbar */}
      <div style={{position:'fixed',top:100,left:0,right:0,bottom:0,background:'#05101e',color:'#d4e6ff',fontFamily:'Inter,system-ui,sans-serif',display:'flex',flexDirection:'column',overflow:'hidden'}}>

        {/* ── Top bar ── */}
        <div style={{background:'linear-gradient(135deg,#071a2e,#0d2137)',borderBottom:'1px solid rgba(0,201,200,.12)',padding:'12px 28px',display:'flex',alignItems:'center',gap:16,flexShrink:0}}>
          <div style={{fontSize:24,width:38,height:38,borderRadius:10,background:'linear-gradient(135deg,#00c9c8,#a78bfa)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>🤖</div>
          <div>
            <div style={{fontSize:'1.05rem',fontWeight:800,background:'linear-gradient(135deg,#00c9c8,#a78bfa)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent'}}>333 Agent Command Center</div>
            <div style={{fontSize:'0.72rem',color:'#4a6a8a',marginTop:1}}>Content Factory · Distribution Grid · Engagement Matrix</div>
          </div>
          <div style={{marginLeft:'auto',display:'flex',gap:8,alignItems:'center'}}>
            {/* KPI chips */}
            {kpiPost>0&&<span style={{padding:'3px 10px',borderRadius:20,fontSize:'0.7rem',fontWeight:600,background:'rgba(0,201,200,.12)',color:C.cyan,border:'1px solid rgba(0,201,200,.25)'}}>📤 {kpiPost} posts</span>}
            {kpiRoas>0&&<span style={{padding:'3px 10px',borderRadius:20,fontSize:'0.7rem',fontWeight:600,background:'rgba(240,165,0,.12)',color:C.gold,border:'1px solid rgba(240,165,0,.25)'}}>💰 ROAS {kpiRoas}x</span>}
            {kpiGmv>0&&<span style={{padding:'3px 10px',borderRadius:20,fontSize:'0.7rem',fontWeight:600,background:'rgba(34,197,94,.12)',color:C.green,border:'1px solid rgba(34,197,94,.25)'}}>📈 {(kpiGmv/1e6).toFixed(0)}M GMV</span>}
            <span style={{padding:'3px 10px',borderRadius:20,fontSize:'0.7rem',fontWeight:600,background:'rgba(167,139,250,.12)',color:C.purple,border:'1px solid rgba(167,139,250,.25)'}}>⚡ {fmtUptime}</span>
            <span style={{padding:'3px 10px',borderRadius:20,fontSize:'0.7rem',fontWeight:600,background:running?'rgba(251,146,60,.15)':'rgba(34,197,94,.12)',color:running?C.amber:C.green,border:`1px solid ${running?'rgba(251,146,60,.3)':'rgba(34,197,94,.25)'}`}}>
              ● {running?'Running':'Standby'}
            </span>
            <button
              onClick={()=>setShowPipeline(p=>!p)}
              style={{padding:'5px 14px',borderRadius:8,border:'1px solid rgba(0,201,200,.3)',background:showPipeline?'rgba(0,201,200,.12)':'transparent',color:'#00c9c8',cursor:'pointer',fontSize:'0.75rem',fontWeight:600}}
            >{showPipeline?'⬆ Ẩn Pipeline':'⬇ Mở Pipeline'}</button>
          </div>
        </div>

        {/* ── Pipeline panel (collapsible) ── */}
        {showPipeline&&(
          <div style={{background:'#071525',borderBottom:'1px solid rgba(255,255,255,.06)',padding:'12px 28px',flexShrink:0}}>
            {/* Stage nodes */}
            <div style={{display:'flex',alignItems:'center',marginBottom:10}}>
              {STAGES.map((st,i)=>{
                const done=doneStg.includes(st.id); const active=actStage===st.id;
                return(
                  <div key={st.id} style={{display:'flex',alignItems:'center',flex:1}}>
                    <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:2,flex:1}}>
                      <div style={{width:34,height:34,borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',fontSize:15,border:`2px solid ${done?st.color:active?st.color:'rgba(255,255,255,.08)'}`,background:done?`${st.color}20`:active?`${st.color}30`:'rgba(255,255,255,.04)',boxShadow:active?`0 0 10px ${st.color}`:undefined,transition:'all .3s'}}>{st.icon}</div>
                      <div style={{fontSize:'0.58rem',color:done||active?st.color:'#4a6a8a',textAlign:'center' as const}}>{st.label}</div>
                    </div>
                    {i<STAGES.length-1&&<div style={{flex:1,height:2,background:done?`${st.color}40`:'rgba(255,255,255,.06)',marginTop:-14,transition:'background .3s'}}/>}
                  </div>
                );
              })}
            </div>
            {/* Progress + brief */}
            <div style={{display:'flex',gap:12,alignItems:'flex-start'}}>
              <div style={{flex:1}}>
                <div style={{height:3,background:'rgba(255,255,255,.06)',borderRadius:2,overflow:'hidden',marginBottom:4}}>
                  <div style={{height:'100%',width:`${pct}%`,background:'linear-gradient(90deg,#00c9c8,#a78bfa)',borderRadius:2,transition:'width .6s ease'}}/>
                </div>
                <div style={{fontSize:'0.65rem',color:'#4a6a8a',display:'flex',justifyContent:'space-between'}}>
                  <span>{actStage?`Running: ${actStage}`:pct===100?'Complete ✓':'Waiting…'}</span>
                  <span>{pct}%</span>
                </div>
              </div>
              <div style={{flexShrink:0,display:'flex',gap:6,alignItems:'center',flexWrap:'wrap' as const}}>
                {Object.entries(PLATFORMS).map(([k,v])=>{
                  const on=platforms.includes(k);
                  return <div key={k} onClick={()=>setPlatforms(pl=>pl.includes(k)?pl.filter(x=>x!==k):[...pl,k])} style={{padding:'3px 9px',borderRadius:20,fontSize:'0.68rem',fontWeight:600,cursor:'pointer',border:`1px solid ${on?v.color:'rgba(255,255,255,.1)'}`,background:on?`${v.color}18`:'rgba(255,255,255,.04)',color:on?v.color:'#4a6a8a'}}>{v.label}</div>;
                })}
              </div>
            </div>
            {/* Presets + input */}
            <div style={{display:'flex',gap:6,marginTop:8,flexWrap:'wrap' as const}}>
              {PRESETS.map(p=><button key={p.label} onClick={()=>{setBrief(p.brief);setPlatforms(p.platforms);}} style={{padding:'3px 9px',borderRadius:20,border:'1px solid rgba(255,255,255,.1)',background:'rgba(255,255,255,.03)',color:'#8ba3c1',fontSize:'0.67rem',cursor:'pointer'}}>{p.label}</button>)}
            </div>
            <div style={{display:'flex',gap:8,marginTop:8}}>
              <textarea value={brief} onChange={e=>setBrief(e.target.value)} rows={2} placeholder="Nhập campaign brief hoặc chọn preset ở trên…"
                style={{flex:1,background:'rgba(255,255,255,.05)',border:'1px solid rgba(255,255,255,.1)',borderRadius:8,padding:'8px 12px',color:'#d4e6ff',fontSize:'0.82rem',resize:'none' as const,outline:'none',fontFamily:'inherit'}}/>
              <button onClick={runFull} disabled={running||!brief.trim()} style={{padding:'8px 18px',borderRadius:8,border:'none',background:running||!brief.trim()?'rgba(255,255,255,.08)':'linear-gradient(135deg,#00c9c8,#a78bfa)',color:running||!brief.trim()?'#4a6a8a':'#fff',cursor:running||!brief.trim()?'not-allowed':'pointer',fontWeight:700,fontSize:'0.82rem',flexShrink:0}}>
                {running?'Running…':'🚀 Launch'}
              </button>
            </div>
            {/* Messages */}
            {msgs.length>0&&(
              <div ref={msgsRef} style={{maxHeight:80,overflowY:'auto',marginTop:8,display:'flex',flexDirection:'column',gap:4}}>
                {msgs.slice(-5).map(m=>{
                  const ag=AGENTS.find(a=>a.id===m.agentId);
                  return <div key={m.id} style={{fontSize:'0.75rem',color:'#8ba3c1',padding:'4px 8px',background:'rgba(255,255,255,.03)',borderRadius:6,borderLeft:`2px solid ${ag?.color||C.cyan}`}}>
                    <span style={{color:ag?.color||C.cyan,fontWeight:600}}>{ag?.icon} {ag?.name}: </span>{m.content}
                  </div>;
                })}
              </div>
            )}
          </div>
        )}

        {/* ── Squad tabs ── */}
        <div style={{display:'flex',borderBottom:'1px solid rgba(255,255,255,.06)',flexShrink:0,background:'#071525'}}>
          {SQUADS.map(sq=>(
            <button key={sq.id} onClick={()=>{setActiveSquad(sq.id);setSelAgent(null);}}
              style={{flex:1,padding:'14px 20px',background:'none',border:'none',borderBottom:`2px solid ${activeSquad===sq.id?sq.color:'transparent'}`,color:activeSquad===sq.id?sq.color:'#4a6a8a',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:8,transition:'all .2s',fontWeight:activeSquad===sq.id?700:400,fontSize:'0.85rem'}}>
              <span style={{fontSize:18}}>{sq.icon}</span>
              <span>{sq.label}</span>
              <span style={{padding:'2px 8px',borderRadius:20,background:activeSquad===sq.id?`${sq.color}20`:'rgba(255,255,255,.05)',color:activeSquad===sq.id?sq.color:'#4a6a8a',fontSize:'0.7rem',fontWeight:600}}>{sq.count}</span>
            </button>
          ))}
        </div>

        {/* ── Agent grid + side panel ── */}
        <div style={{flex:1,display:'flex',overflow:'hidden',position:'relative'}}>
          {/* Grid */}
          <div style={{flex:1,overflowY:'auto',padding:'20px 24px',paddingRight:selAgent?'344px':'24px',transition:'padding-right .2s'}}>
            {!hasAccess&&(
              <div style={{marginBottom:16,padding:'10px 16px',borderRadius:10,background:'rgba(0,201,200,.06)',border:'1px solid rgba(0,201,200,.2)',display:'flex',alignItems:'center',gap:10}}>
                <span style={{fontSize:'1.2rem'}}>🔒</span>
                <div>
                  <div style={{fontSize:'0.82rem',fontWeight:600,color:'#00c9c8'}}>Đăng nhập KOC/Vendor để mở khóa agents</div>
                  <div style={{fontSize:'0.72rem',color:'#4a6a8a',marginTop:2}}>Click vào bất kỳ agent nào để xem gói phù hợp</div>
                </div>
                <div style={{marginLeft:'auto',display:'flex',gap:8}}>
                  <Link to="/login" style={{padding:'6px 14px',borderRadius:8,border:'1px solid rgba(255,255,255,.12)',background:'transparent',color:'#8ba3c1',fontSize:'0.75rem',fontWeight:600,textDecoration:'none'}}>Đăng nhập</Link>
                  <Link to="/pricing" style={{padding:'6px 14px',borderRadius:8,background:'linear-gradient(135deg,#00c9c8,#a78bfa)',color:'#fff',fontSize:'0.75rem',fontWeight:600,textDecoration:'none'}}>Xem gói</Link>
                </div>
              </div>
            )}

            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(220px,1fr))',gap:12}}>
              {squadAgents.map(agent=>{
                const st:AS = agStatus[agent.id]||'idle';
                const locked = !hasAccess;
                const isSelected = selAgent?.id===agent.id;
                const dotColor = st==='working'?C.amber:st==='done'?C.green:'#2a3d52';
                return (
                  <div key={agent.id} onClick={()=>handleAgentClick(agent)}
                    style={{background:isSelected?`${agent.color}10`:'rgba(255,255,255,.03)',border:`1px solid ${isSelected?agent.color:'rgba(255,255,255,.07)'}`,borderRadius:14,padding:'16px',cursor:'pointer',transition:'all .18s',position:'relative',boxShadow:isSelected?`0 0 0 1px ${agent.color}40`:undefined}}
                    onMouseEnter={e=>{if(!isSelected)(e.currentTarget as HTMLDivElement).style.background='rgba(255,255,255,.06)';}}
                    onMouseLeave={e=>{if(!isSelected)(e.currentTarget as HTMLDivElement).style.background='rgba(255,255,255,.03)';}}
                  >
                    {/* Lock badge */}
                    {locked&&<div style={{position:'absolute',top:10,right:10,fontSize:'0.65rem',background:'rgba(0,0,0,.5)',border:'1px solid rgba(255,255,255,.12)',borderRadius:4,padding:'2px 6px',color:'#4a6a8a'}}>🔒 Locked</div>}
                    {/* Status dot */}
                    {!locked&&<div style={{position:'absolute',top:12,right:12,width:8,height:8,borderRadius:'50%',background:dotColor,boxShadow:st==='working'?`0 0 8px ${C.amber}`:undefined}}/>}

                    <div style={{fontSize:32,marginBottom:8}}>{agent.icon}</div>
                    <div style={{fontSize:'0.88rem',fontWeight:700,color:isSelected?agent.color:'#c0d8f0',marginBottom:3}}>{agent.name}</div>
                    <div style={{fontSize:'0.7rem',color:'#4a6a8a',marginBottom:10}}>
                      {agent.role}
                      <span style={{marginLeft:8,padding:'1px 6px',borderRadius:4,background:'rgba(255,255,255,.05)',color:'#8ba3c1'}}>×{agent.count}</span>
                    </div>
                    <div style={{display:'flex',flexWrap:'wrap' as const,gap:4}}>
                      {agent.spec.slice(0,2).map(s=>(
                        <span key={s} style={{padding:'2px 7px',borderRadius:4,background:locked?'rgba(255,255,255,.04)':`${agent.color}12`,color:locked?'#2a3d52':agent.color,fontSize:'0.65rem',border:`1px solid ${locked?'rgba(255,255,255,.06)':`${agent.color}25`}`}}>{s}</span>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Agent detail panel */}
          {selAgent&&hasAccess&&(
            <AgentPanel
              agent={selAgent}
              status={agStatus[selAgent.id]||'idle'}
              onClose={()=>setSelAgent(null)}
              onDispatch={quickDispatch}
              onLaunch={()=>{setShowPipeline(true);if(!brief)setBrief(PRESETS[0].brief);runFull();}}
              running={running}
            />
          )}
        </div>
      </div>

      {/* Upgrade modal */}
      {upgradeAgent&&<UpgradeModal agent={upgradeAgent} onClose={()=>setUpgradeAgent(null)}/>}
    </>
  );
}
