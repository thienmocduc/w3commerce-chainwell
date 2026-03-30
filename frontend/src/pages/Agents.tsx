import { useState } from 'react';
import { useI18n } from '@hooks/useI18n';

interface Agent {
  id: number;
  name: string;
  description: string;
  capabilities: string[];
  status: 'active' | 'beta' | 'coming';
}

interface Category {
  key: string;
  label: string;
  labelKey: string;
  icon: string;
  color: string;
  agents: Agent[];
}

const agentCategories: Category[] = [
  {
    key: 'content', label: 'Sáng Tạo Nội Dung', labelKey: 'agents.cat.content', icon: '✍️', color: 'var(--c6-500)',
    agents: [
      { id: 1, name: 'AI Copywriter', description: 'Viết bài review, caption, mô tả sản phẩm tự động', capabilities: ['Viết review sản phẩm', 'Tạo caption social', 'SEO optimization', 'Đa ngôn ngữ'], status: 'active' },
      { id: 2, name: 'AI Video Script', description: 'Tạo kịch bản video review, unboxing, so sánh', capabilities: ['Script video ngắn', 'Storyboard', 'Hook generation', 'CTA optimization'], status: 'active' },
      { id: 3, name: 'AI Thumbnail Designer', description: 'Thiết kế thumbnail hấp dẫn cho video và bài viết', capabilities: ['Auto layout', 'Text overlay', 'Color matching', 'A/B variants'], status: 'active' },
      { id: 4, name: 'AI Hashtag Master', description: 'Tối ưu hashtag cho từng nền tảng social', capabilities: ['Trending analysis', 'Niche hashtags', 'Platform-specific', 'Performance tracking'], status: 'active' },
      { id: 5, name: 'AI Story Generator', description: 'Tạo story hấp dẫn cho Instagram, TikTok', capabilities: ['Template stories', 'Poll/quiz ideas', 'Countdown timers', 'Swipe-up CTAs'], status: 'active' },
      { id: 6, name: 'AI Blog Writer', description: 'Viết bài blog dài, chuyên sâu về sản phẩm', capabilities: ['Long-form content', 'Product comparison', 'Buyer guide', 'Internal linking'], status: 'active' },
      { id: 7, name: 'AI Email Marketer', description: 'Tạo email marketing sequence tự động', capabilities: ['Welcome series', 'Cart recovery', 'Product launch', 'Newsletter'], status: 'active' },
      { id: 8, name: 'AI Meme Creator', description: 'Tạo meme viral liên quan đến sản phẩm', capabilities: ['Trending templates', 'Brand-safe', 'Multi-format', 'Viral prediction'], status: 'beta' },
      { id: 9, name: 'AI Voice Script', description: 'Tạo kịch bản cho podcast và voice content', capabilities: ['Podcast outline', 'Interview prep', 'Voice-over script', 'Audio SEO'], status: 'beta' },
      { id: 10, name: 'AI Infographic', description: 'Thiết kế infographic từ dữ liệu sản phẩm', capabilities: ['Data visualization', 'Comparison charts', 'Timeline graphics', 'Stats cards'], status: 'active' },
      { id: 11, name: 'AI Carousel Builder', description: 'Tạo carousel posts cho Instagram/LinkedIn', capabilities: ['Slide design', 'Text formatting', 'Brand consistency', 'Engagement hooks'], status: 'active' },
      { id: 12, name: 'AI Caption Localizer', description: 'Dịch và localize caption cho thị trường Việt Nam', capabilities: ['VN localization', 'Slang adaptation', 'Cultural context', 'Regional dialects'], status: 'active' },
      { id: 13, name: 'AI Product Stylist', description: 'Gợi ý cách trình bày sản phẩm cho ảnh chụp', capabilities: ['Flat lay ideas', 'Background suggest', 'Props recommendation', 'Lighting tips'], status: 'beta' },
      { id: 14, name: 'AI Music Selector', description: 'Chọn nhạc nền phù hợp cho video', capabilities: ['Mood matching', 'Copyright-free', 'Trending sounds', 'BPM analysis'], status: 'coming' },
      { id: 15, name: 'AI Subtitle Generator', description: 'Tạo phụ đề tự động cho video content', capabilities: ['Auto transcribe', 'Multi-language', 'Styled captions', 'SRT export'], status: 'active' },
      { id: 16, name: 'AI Content Calendar', description: 'Lập lịch đăng bài tối ưu cho từng nền tảng', capabilities: ['Best time posting', 'Content mix', 'Holiday planning', 'Frequency optimize'], status: 'active' },
    ]
  },
  {
    key: 'analytics', label: 'Phân Tích & Dữ Liệu', labelKey: 'agents.cat.analytics', icon: '📊', color: 'var(--c5-500)',
    agents: [
      { id: 17, name: 'AI Performance Tracker', description: 'Theo dõi hiệu suất chiến dịch real-time', capabilities: ['Real-time dashboard', 'ROI calculation', 'Conversion tracking', 'A/B analysis'], status: 'active' },
      { id: 18, name: 'AI Audience Analyzer', description: 'Phân tích đối tượng khách hàng mục tiêu', capabilities: ['Demographics', 'Behavior patterns', 'Interest mapping', 'Lookalike audiences'], status: 'active' },
      { id: 19, name: 'AI Trend Predictor', description: 'Dự đoán xu hướng sản phẩm và thị trường', capabilities: ['Trend forecasting', 'Seasonal analysis', 'Viral prediction', 'Market signals'], status: 'active' },
      { id: 20, name: 'AI Competitor Watch', description: 'Theo dõi và phân tích đối thủ cạnh tranh', capabilities: ['Price monitoring', 'Content analysis', 'Strategy insights', 'Gap identification'], status: 'active' },
      { id: 21, name: 'AI Revenue Forecaster', description: 'Dự báo doanh thu và hoa hồng', capabilities: ['Revenue projection', 'Commission forecast', 'Seasonal adjust', 'Growth modeling'], status: 'active' },
      { id: 22, name: 'AI Sentiment Analyzer', description: 'Phân tích cảm xúc khách hàng từ review', capabilities: ['Review sentiment', 'Brand perception', 'Issue detection', 'NPS tracking'], status: 'active' },
      { id: 23, name: 'AI Funnel Optimizer', description: 'Tối ưu conversion funnel từ click đến mua', capabilities: ['Drop-off analysis', 'CTA optimization', 'Page flow', 'Checkout optimize'], status: 'beta' },
      { id: 24, name: 'AI Report Generator', description: 'Tạo báo cáo tự động theo tuần/tháng/quý', capabilities: ['Auto reports', 'Custom metrics', 'Visual charts', 'PDF export'], status: 'active' },
      { id: 25, name: 'AI Attribution Model', description: 'Phân bổ doanh thu theo touchpoint marketing', capabilities: ['Multi-touch', 'First/last click', 'Time decay', 'Custom models'], status: 'active' },
      { id: 26, name: 'AI Cohort Analyzer', description: 'Phân tích nhóm khách hàng theo thời gian', capabilities: ['Retention cohorts', 'LTV analysis', 'Churn prediction', 'Segment comparison'], status: 'beta' },
      { id: 27, name: 'AI Heatmap Analyzer', description: 'Phân tích heatmap tương tác trên trang', capabilities: ['Click heatmaps', 'Scroll depth', 'Attention maps', 'Device comparison'], status: 'coming' },
      { id: 28, name: 'AI Social Listener', description: 'Lắng nghe và phân tích mentions trên mạng xã hội', capabilities: ['Brand mentions', 'Keyword tracking', 'Influencer detection', 'Crisis alerts'], status: 'active' },
    ]
  },
  {
    key: 'customer', label: 'Chăm Sóc Khách Hàng', labelKey: 'agents.cat.customer', icon: '💬', color: 'var(--c4-500)',
    agents: [
      { id: 29, name: 'AI Chat Support', description: 'Chatbot hỗ trợ khách hàng\u00A024/7', capabilities: ['Auto response', 'FAQ handling', 'Escalation', 'Multi-language'], status: 'active' },
      { id: 30, name: 'AI Review Responder', description: 'Phản hồi đánh giá sản phẩm tự động', capabilities: ['Positive thanks', 'Issue resolution', 'Brand voice', 'Sentiment-aware'], status: 'active' },
      { id: 31, name: 'AI Order Tracker', description: 'Cập nhật trạng thái đơn hàng cho khách', capabilities: ['Status updates', 'Delivery ETA', 'Issue alerts', 'Proactive notify'], status: 'active' },
      { id: 32, name: 'AI Return Handler', description: 'Xử lý yêu cầu đổi trả tự động', capabilities: ['Return eligibility', 'Process guide', 'Refund track', 'Policy explain'], status: 'active' },
      { id: 33, name: 'AI FAQ Builder', description: 'Tạo và cập nhật FAQ tự động từ câu hỏi thường gặp', capabilities: ['Auto categorize', 'Answer generate', 'Priority rank', 'Gap detection'], status: 'active' },
      { id: 34, name: 'AI Feedback Collector', description: 'Thu thập và phân loại feedback khách hàng', capabilities: ['Survey design', 'NPS collection', 'Theme extraction', 'Action items'], status: 'active' },
      { id: 35, name: 'AI Loyalty Manager', description: 'Quản lý chương trình khách hàng thân thiết', capabilities: ['Points tracking', 'Reward suggest', 'Tier management', 'Re-engagement'], status: 'beta' },
      { id: 36, name: 'AI Complaint Resolver', description: 'Phân tích và đề xuất giải pháp cho khiếu nại', capabilities: ['Root cause', 'Solution suggest', 'Priority score', 'Follow-up auto'], status: 'active' },
      { id: 37, name: 'AI Upsell Bot', description: 'Gợi ý sản phẩm cross-sell/upsell thông minh', capabilities: ['Bundle suggest', 'Timing optimize', 'Personalized', 'Revenue lift'], status: 'active' },
      { id: 38, name: 'AI Win-back Agent', description: 'Tái kích hoạt khách hàng không hoạt động', capabilities: ['Churn detection', 'Personalized offer', 'Re-engagement email', 'Win-back campaign'], status: 'beta' },
      { id: 39, name: 'AI Live Chat Assist', description: 'Hỗ trợ agent trực trong live chat', capabilities: ['Quick replies', 'Knowledge base', 'Canned responses', 'Smart routing'], status: 'active' },
      { id: 40, name: 'AI Warranty Tracker', description: 'Quản lý bảo hành sản phẩm tự động', capabilities: ['Warranty check', 'Claim process', 'Expiry alerts', 'Service history'], status: 'coming' },
    ]
  },
  {
    key: 'commerce', label: 'Thương Mại & Bán Hàng', labelKey: 'agents.cat.commerce', icon: '🛒', color: 'var(--c7-500)',
    agents: [
      { id: 41, name: 'AI Pricing Engine', description: 'Tối ưu giá bán theo thời gian thực', capabilities: ['Dynamic pricing', 'Competitor match', 'Demand-based', 'Margin protect'], status: 'active' },
      { id: 42, name: 'AI Product Matcher', description: 'Ghép sản phẩm phù hợp với KOC', capabilities: ['Interest match', 'Audience fit', 'Commission optimize', 'Brand alignment'], status: 'active' },
      { id: 43, name: 'AI Inventory Planner', description: 'Dự báo và tối ưu tồn kho', capabilities: ['Demand forecast', 'Reorder alerts', 'Overstock prevent', 'Seasonal adjust'], status: 'active' },
      { id: 44, name: 'AI Bundle Creator', description: 'Tạo combo sản phẩm hấp dẫn', capabilities: ['Affinity analysis', 'Price optimize', 'Theme bundles', 'Limited editions'], status: 'active' },
      { id: 45, name: 'AI Flash Deal Optimizer', description: 'Tối ưu flash deal và khuyến mãi', capabilities: ['Timing optimize', 'Discount calculate', 'Urgency create', 'Stock allocate'], status: 'active' },
      { id: 46, name: 'AI Commission Calculator', description: 'Tính toán hoa hồng multi-tier phức tạp', capabilities: ['Multi-tier calc', 'Bonus rules', 'Override commission', 'Real-time settle'], status: 'active' },
      { id: 47, name: 'AI Catalog Enricher', description: 'Làm giàu thông tin catalog sản phẩm', capabilities: ['Auto describe', 'Specs extract', 'Image enhance', 'Category suggest'], status: 'active' },
      { id: 48, name: 'AI Shipping Optimizer', description: 'Tối ưu vận chuyển và logistics', capabilities: ['Route optimize', 'Carrier select', 'Cost calculate', 'Delivery predict'], status: 'active' },
      { id: 49, name: 'AI Coupon Manager', description: 'Quản lý và tối ưu mã giảm giá', capabilities: ['Auto generate', 'Usage tracking', 'Fraud detect', 'ROI measure'], status: 'active' },
      { id: 50, name: 'AI Payment Optimizer', description: 'Tối ưu tỉ lệ thanh toán thành công', capabilities: ['Retry logic', 'Method suggest', 'Fraud check', 'Conversion lift'], status: 'active' },
      { id: 51, name: 'AI Tax Calculator', description: 'Tính thuế tự động theo quy định VN', capabilities: ['VAT calculate', 'Import tax', 'Special tax', 'Report generate'], status: 'active' },
      { id: 52, name: 'AI Marketplace Sync', description: 'Đồng bộ sản phẩm across marketplaces', capabilities: ['Multi-platform', 'Stock sync', 'Price sync', 'Order merge'], status: 'beta' },
    ]
  },
  {
    key: 'blockchain', label: 'Blockchain & Web3', labelKey: 'agents.cat.blockchain', icon: '⛓️', color: 'var(--c4-300)',
    agents: [
      { id: 53, name: 'AI DPP Generator', description: 'Tạo Digital Product Passport on\u2011chain', capabilities: ['Auto metadata', 'IPFS upload', 'Smart mint', 'QR generate'], status: 'active' },
      { id: 54, name: 'AI Gas Optimizer', description: 'Tối ưu gas fee cho on\u2011chain transactions', capabilities: ['Gas prediction', 'Batch transactions', 'L2 routing', 'Priority queue'], status: 'active' },
      { id: 55, name: 'AI NFT Minter', description: 'Mint Reputation NFT và certificates', capabilities: ['Auto mint', 'Metadata generate', 'Batch mint', 'Cross-chain'], status: 'active' },
      { id: 56, name: 'AI Smart Contract Auditor', description: 'Kiểm tra và audit smart contract', capabilities: ['Vulnerability scan', 'Gas analysis', 'Logic verify', 'Compliance check'], status: 'active' },
      { id: 57, name: 'AI Wallet Analyzer', description: 'Phân tích on\u2011chain activity của ví', capabilities: ['Transaction history', 'Token balance', 'DeFi positions', 'Risk score'], status: 'active' },
      { id: 58, name: 'AI Token Economist', description: 'Phân tích và mô hình tokenomics', capabilities: ['Supply model', 'Velocity analysis', 'Staking optimize', 'Burn mechanism'], status: 'beta' },
      { id: 59, name: 'AI Bridge Agent', description: 'Hỗ trợ cross-chain bridge transactions', capabilities: ['Route finding', 'Fee compare', 'Safety check', 'Auto bridge'], status: 'active' },
      { id: 60, name: 'AI ZKP Verifier', description: 'Xác minh Zero-Knowledge Proofs', capabilities: ['Proof verify', 'Circuit check', 'Batch verify', 'Privacy audit'], status: 'active' },
      { id: 61, name: 'AI Oracle Feeder', description: 'Cung cấp dữ liệu off-chain cho smart contract', capabilities: ['Price feed', 'Weather data', 'Supply chain', 'Event trigger'], status: 'active' },
      { id: 62, name: 'AI DAO Governance', description: 'Hỗ trợ quản trị DAO và proposal', capabilities: ['Proposal create', 'Vote analysis', 'Quorum check', 'Execution auto'], status: 'beta' },
      { id: 63, name: 'AI Airdrop Manager', description: 'Quản lý và phân phối airdrop', capabilities: ['Eligibility check', 'Batch distribute', 'Claim process', 'Analytics'], status: 'active' },
      { id: 64, name: 'AI Chain Monitor', description: 'Giám sát blockchain events và anomalies', capabilities: ['Event listening', 'Anomaly detect', 'Alert system', 'Dashboard'], status: 'active' },
    ]
  },
  {
    key: 'social', label: 'Mạng Xã Hội', labelKey: 'agents.cat.social', icon: '📱', color: 'var(--rose-400)',
    agents: [
      { id: 65, name: 'AI TikTok Optimizer', description: 'Tối ưu nội dung cho TikTok', capabilities: ['Trend detection', 'Sound match', 'Hashtag optimize', 'Best time post'], status: 'active' },
      { id: 66, name: 'AI Instagram Growth', description: 'Chiến lược tăng trưởng Instagram', capabilities: ['Content plan', 'Reel ideas', 'Story templates', 'Engagement boost'], status: 'active' },
      { id: 67, name: 'AI Facebook Ads', description: 'Tối ưu quảng cáo Facebook/Meta', capabilities: ['Ad copy', 'Audience target', 'Budget optimize', 'Creative test'], status: 'active' },
      { id: 68, name: 'AI YouTube Strategy', description: 'Chiến lược phát triển kênh YouTube', capabilities: ['Title optimize', 'Description SEO', 'Thumbnail test', 'Upload schedule'], status: 'active' },
      { id: 69, name: 'AI Zalo Marketing', description: 'Tối ưu marketing trên Zalo OA', capabilities: ['Message template', 'Mini app', 'ZNS optimize', 'Audience segment'], status: 'active' },
      { id: 70, name: 'AI Shopee Connect', description: 'Kết nối và tối ưu trên Shopee', capabilities: ['Listing optimize', 'Flash sale', 'Chat response', 'Review manage'], status: 'active' },
      { id: 71, name: 'AI Cross-Post', description: 'Đăng bài cross-platform tự động', capabilities: ['Auto adapt', 'Schedule sync', 'Format convert', 'Performance track'], status: 'active' },
      { id: 72, name: 'AI Engagement Bot', description: 'Tương tác cộng đồng tự động thông minh', capabilities: ['Comment respond', 'Like strategy', 'DM auto', 'Community build'], status: 'active' },
      { id: 73, name: 'AI Influencer Finder', description: 'Tìm kiếm và đánh giá micro-influencer', capabilities: ['Score ranking', 'Niche match', 'Fake detect', 'Outreach auto'], status: 'active' },
      { id: 74, name: 'AI Live Commerce Host', description: 'Hỗ trợ livestream bán hàng', capabilities: ['Script prompt', 'Product queue', 'Chat moderate', 'Sales track'], status: 'active' },
      { id: 75, name: 'AI Pinterest Optimizer', description: 'Tối ưu content trên Pinterest', capabilities: ['Pin design', 'Board strategy', 'SEO optimize', 'Traffic drive'], status: 'beta' },
      { id: 76, name: 'AI Thread Writer', description: 'Viết thread viral cho X/Twitter', capabilities: ['Hook writing', 'Thread structure', 'Engagement predict', 'Best time'], status: 'active' },
    ]
  },
  {
    key: 'operations', label: 'Vận Hành & Quản Lý', labelKey: 'agents.cat.operations', icon: '⚙️', color: 'var(--gold-400)',
    agents: [
      { id: 77, name: 'AI Task Manager', description: 'Quản lý công việc và deadline tự động', capabilities: ['Auto prioritize', 'Deadline track', 'Team assign', 'Progress report'], status: 'active' },
      { id: 78, name: 'AI Quality Inspector', description: 'Kiểm tra chất lượng sản phẩm tự động', capabilities: ['Image analysis', 'Defect detect', 'Grade classify', 'Report generate'], status: 'active' },
      { id: 79, name: 'AI Document Parser', description: 'Đọc và trích xuất thông tin từ chứng từ', capabilities: ['OCR extract', 'Invoice parse', 'Certificate read', 'Data validate'], status: 'active' },
      { id: 80, name: 'AI Compliance Checker', description: 'Kiểm tra tuân thủ quy định thương mại', capabilities: ['Regulation check', 'Label verify', 'Import rules', 'Tax compliance'], status: 'active' },
      { id: 81, name: 'AI Scheduling Agent', description: 'Lên lịch meetings, events, campaigns', capabilities: ['Calendar sync', 'Conflict avoid', 'Time zone', 'Reminder auto'], status: 'active' },
      { id: 82, name: 'AI Vendor Evaluator', description: 'Đánh giá và xếp hạng nhà cung cấp', capabilities: ['Score card', 'Performance history', 'Risk assessment', 'Benchmark'], status: 'active' },
      { id: 83, name: 'AI Contract Analyzer', description: 'Phân tích hợp đồng và điều khoản', capabilities: ['Clause extract', 'Risk highlight', 'Compare versions', 'Suggest edits'], status: 'beta' },
      { id: 84, name: 'AI Expense Tracker', description: 'Theo dõi chi phí và lợi nhuận', capabilities: ['Auto categorize', 'Budget alert', 'Margin calculate', 'Tax ready'], status: 'active' },
      { id: 85, name: 'AI HR Assistant', description: 'Hỗ trợ tuyển dụng và quản lý KOC team', capabilities: ['Resume screen', 'Interview schedule', 'Onboard guide', 'Performance review'], status: 'active' },
      { id: 86, name: 'AI Notification Manager', description: 'Quản lý và tối ưu push notifications', capabilities: ['Segment target', 'A/B test', 'Timing optimize', 'Frequency cap'], status: 'active' },
      { id: 87, name: 'AI Data Cleaner', description: 'Làm sạch và chuẩn hóa dữ liệu', capabilities: ['Dedup records', 'Format standard', 'Missing fill', 'Anomaly flag'], status: 'active' },
      { id: 88, name: 'AI Backup Agent', description: 'Tự động backup dữ liệu quan trọng', capabilities: ['Auto schedule', 'Incremental backup', 'Cloud sync', 'Recovery test'], status: 'active' },
    ]
  },
  {
    key: 'personalization', label: 'Cá Nhân Hóa', labelKey: 'agents.cat.personalization', icon: '🎯', color: 'var(--c6-300)',
    agents: [
      { id: 89, name: 'AI Recommendation Engine', description: 'Gợi ý sản phẩm cá nhân hóa', capabilities: ['Collaborative filter', 'Content-based', 'Hybrid model', 'Real-time update'], status: 'active' },
      { id: 90, name: 'AI Email Personalizer', description: 'Cá nhân hóa nội dung email', capabilities: ['Dynamic content', 'Send time optimize', 'Subject line AI', 'Segment adapt'], status: 'active' },
      { id: 91, name: 'AI Landing Page Builder', description: 'Tạo landing page cá nhân hóa', capabilities: ['Template select', 'Content adapt', 'CTA optimize', 'A/B test'], status: 'active' },
      { id: 92, name: 'AI Search Optimizer', description: 'Tối ưu tìm kiếm trên platform', capabilities: ['Query understand', 'Result rank', 'Spell correct', 'Suggest complete'], status: 'active' },
      { id: 93, name: 'AI Journey Mapper', description: 'Vẽ customer journey map tự động', capabilities: ['Touchpoint track', 'Path analysis', 'Drop-off detect', 'Experience optimize'], status: 'beta' },
      { id: 94, name: 'AI Segment Builder', description: 'Tạo phân khúc khách hàng thông minh', capabilities: ['Auto segment', 'Behavior-based', 'Predictive', 'Dynamic update'], status: 'active' },
      { id: 95, name: 'AI A/B Test Manager', description: 'Quản lý A/B testing toàn diện', capabilities: ['Test design', 'Traffic split', 'Stat significance', 'Auto winner'], status: 'active' },
      { id: 96, name: 'AI Preference Learner', description: 'Học và dự đoán sở thích người dùng', capabilities: ['Implicit signals', 'Explicit feedback', 'Preference model', 'Context-aware'], status: 'active' },
      { id: 97, name: 'AI Notification Personalizer', description: 'Cá nhân hóa thông báo cho từng user', capabilities: ['Content adapt', 'Timing personal', 'Channel prefer', 'Frequency learn'], status: 'active' },
      { id: 98, name: 'AI Homepage Curator', description: 'Cá nhân hóa trang chủ cho từng người dùng', capabilities: ['Layout adapt', 'Content rank', 'Widget select', 'Real-time'], status: 'beta' },
      { id: 99, name: 'AI Wishlist Analyzer', description: 'Phân tích wishlist để gợi ý mua hàng', capabilities: ['Price track', 'Stock alert', 'Similar suggest', 'Bundle idea'], status: 'active' },
    ]
  },
  {
    key: 'security', label: 'Bảo Mật & An Toàn', labelKey: 'agents.cat.security', icon: '🔒', color: 'var(--c5-300)',
    agents: [
      { id: 100, name: 'AI Fraud Detector', description: 'Phát hiện gian lận đơn hàng', capabilities: ['Pattern detect', 'Risk scoring', 'Real-time block', 'False positive reduce'], status: 'active' },
      { id: 101, name: 'AI Review Authenticator', description: 'Xác minh tính xác thực của review', capabilities: ['Fake review detect', 'Bot detection', 'Verified purchase', 'Quality score'], status: 'active' },
      { id: 102, name: 'AI KYC Verifier', description: 'Xác minh danh tính KOC/Vendor', capabilities: ['ID verification', 'Face match', 'Document check', 'Risk level'], status: 'active' },
      { id: 103, name: 'AI Content Moderator', description: 'Kiểm duyệt nội dung vi phạm', capabilities: ['Text filter', 'Image check', 'Policy enforce', 'Appeal process'], status: 'active' },
      { id: 104, name: 'AI Anti-Bot', description: 'Chống bot và abuse trên platform', capabilities: ['Bot detect', 'Rate limit', 'CAPTCHA smart', 'Behavior analysis'], status: 'active' },
      { id: 105, name: 'AI Privacy Guard', description: 'Bảo vệ quyền riêng tư dữ liệu', capabilities: ['PII detect', 'Data mask', 'Consent manage', 'Compliance check'], status: 'active' },
      { id: 106, name: 'AI Counterfeit Detector', description: 'Phát hiện sản phẩm giả, nhái', capabilities: ['Image analysis', 'Label verify', 'Origin check', 'DPP validate'], status: 'active' },
      { id: 107, name: 'AI Access Controller', description: 'Quản lý quyền truy cập platform', capabilities: ['Role-based', 'Permission audit', 'Session manage', 'Anomaly alert'], status: 'active' },
      { id: 108, name: 'AI Vulnerability Scanner', description: 'Quét lỗ hổng bảo mật hệ thống', capabilities: ['Auto scan', 'Severity rank', 'Patch suggest', 'Compliance audit'], status: 'active' },
      { id: 109, name: 'AI Dispute Resolver', description: 'Hỗ trợ giải quyết tranh chấp', capabilities: ['Evidence collect', 'Rule apply', 'Fair decision', 'Escalation manage'], status: 'active' },
      { id: 110, name: 'AI Refund Protector', description: 'Bảo vệ khỏi refund abuse', capabilities: ['Pattern detect', 'History check', 'Policy enforce', 'Score system'], status: 'active' },
      { id: 111, name: 'AI System Health Monitor', description: 'Giám sát sức khỏe toàn hệ thống', capabilities: ['Uptime monitor', 'Performance alert', 'Auto scale', 'Incident respond'], status: 'active' },
    ]
  },
];

const statusConfig: Record<string, { labelKey: string; badge: string }> = {
  active: { labelKey: 'agents.statusActive', badge: 'badge-c4' },
  beta: { labelKey: 'agents.statusBeta', badge: 'badge-gold' },
  coming: { labelKey: 'agents.statusComing', badge: 'badge-c5' },
};

export default function Agents() {
  const { t } = useI18n();
  const [search, setSearch] = useState('');
  const [expandedCategory, setExpandedCategory] = useState<string | null>('content');
  const [expandedAgent, setExpandedAgent] = useState<number | null>(null);

  const totalAgents = agentCategories.reduce((s, c) => s + c.agents.length, 0);
  const activeCount = agentCategories.reduce((s, c) => s + c.agents.filter(a => a.status === 'active').length, 0);

  const filteredCategories = search
    ? agentCategories.map(cat => ({
        ...cat,
        agents: cat.agents.filter(a =>
          a.name.toLowerCase().includes(search.toLowerCase()) ||
          a.description.toLowerCase().includes(search.toLowerCase())
        ),
      })).filter(cat => cat.agents.length > 0)
    : agentCategories;

  return (
    <div style={{ paddingTop: 'var(--topbar-height)', minHeight: '100vh', background: 'var(--bg-0)' }}>
      {/* Header */}
      <div style={{
        padding: '60px 0 40px',
        background: 'radial-gradient(ellipse 80% 60% at 50% 0%, rgba(168,85,247,.1) 0%, transparent 60%)',
      }}>
        <div className="container" style={{ textAlign: 'center' }}>
          <div className="section-badge" style={{ background: 'rgba(168,85,247,.1)', color: 'var(--c7-300)', borderColor: 'rgba(168,85,247,.2)' }}>
            🤖 AI AGENTS
          </div>
          <h1 className="display-lg gradient-text" style={{ marginBottom: 12 }}>
            {t('agents.title')}
          </h1>
          <p style={{ color: 'var(--text-3)', maxWidth: 580, margin: '0 auto', fontSize: '.88rem' }}>
            {t('agents.subtitle')}
          </p>
          <div className="flex gap-16" style={{ justifyContent: 'center', marginTop: 24 }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontFamily: 'var(--ff-display)', fontWeight: 800, fontSize: '1.4rem', color: 'var(--c7-300)' }}>{totalAgents}</div>
              <div className="label">{t('agents.totalAgents')}</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontFamily: 'var(--ff-display)', fontWeight: 800, fontSize: '1.4rem', color: 'var(--c4-500)' }}>{activeCount}</div>
              <div className="label">{t('agents.activeAgents')}</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontFamily: 'var(--ff-display)', fontWeight: 800, fontSize: '1.4rem', color: 'var(--c5-500)' }}>{agentCategories.length}</div>
              <div className="label">{t('agents.categories')}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="container" style={{ paddingTop: 32, paddingBottom: 80, maxWidth: 900 }}>
        {/* Search */}
        <div className="card" style={{ padding: '12px 20px', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: '1.1rem' }}>🔍</span>
          <input
            type="text"
            placeholder={t('agents.searchPlaceholder')}
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              flex: 1, background: 'transparent', border: 'none', outline: 'none',
              color: 'var(--text-1)', fontSize: '.88rem', fontFamily: 'var(--ff-body)',
            }}
          />
          {search && (
            <button className="btn btn-ghost btn-sm" onClick={() => setSearch('')}>{t('agents.clear')}</button>
          )}
        </div>

        {/* Categories */}
        <div className="flex-col gap-12">
          {filteredCategories.map(cat => (
            <div key={cat.key} className="card" style={{ overflow: 'hidden', borderColor: expandedCategory === cat.key ? 'var(--border-glow)' : undefined }}>
              {/* Category Header */}
              <div
                style={{
                  padding: '18px 24px', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 14,
                  borderBottom: expandedCategory === cat.key ? '1px solid var(--border)' : 'none',
                }}
                onClick={() => setExpandedCategory(expandedCategory === cat.key ? null : cat.key)}
              >
                <span style={{ fontSize: '1.4rem' }}>{cat.icon}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: '.92rem' }}>{t(cat.labelKey)}</div>
                  <div style={{ fontSize: '.7rem', color: 'var(--text-3)' }}>{cat.agents.length} agents</div>
                </div>
                <div className="flex gap-8">
                  <span className="badge badge-c4">{cat.agents.filter(a => a.status === 'active').length} active</span>
                  <span style={{ fontSize: '1.1rem', transform: expandedCategory === cat.key ? 'rotate(180deg)' : 'rotate(0)', transition: 'var(--t-base)' }}>▾</span>
                </div>
              </div>

              {/* Agents List */}
              {expandedCategory === cat.key && (
                <div style={{ padding: '12px 20px 16px' }}>
                  <div className="grid-2" style={{ gap: 10 }}>
                    {cat.agents.map(agent => {
                      const isExpanded = expandedAgent === agent.id;
                      const sc = statusConfig[agent.status];
                      return (
                        <div
                          key={agent.id}
                          className="card"
                          style={{
                            padding: '14px 16px', cursor: 'pointer', background: 'var(--bg-2)',
                            borderColor: isExpanded ? 'var(--border-glow)' : undefined,
                            gridColumn: isExpanded ? '1 / -1' : undefined,
                          }}
                          onClick={() => setExpandedAgent(isExpanded ? null : agent.id)}
                        >
                          <div className="flex" style={{ justifyContent: 'space-between', gap: 8 }}>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div className="flex gap-8" style={{ marginBottom: 4 }}>
                                <span className="mono" style={{ fontSize: '.62rem', color: 'var(--text-4)' }}>#{agent.id.toString().padStart(3, '0')}</span>
                                <span className={`badge ${sc.badge}`}>{t(sc.labelKey)}</span>
                              </div>
                              <div style={{ fontWeight: 600, fontSize: '.82rem' }}>{agent.name}</div>
                              <div style={{ fontSize: '.7rem', color: 'var(--text-3)', marginTop: 2, wordBreak: 'keep-all' }}>{agent.description}</div>
                            </div>
                          </div>

                          {isExpanded && (
                            <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
                              <div className="label" style={{ marginBottom: 8 }}>{t('agents.capabilities')}</div>
                              <div className="flex gap-8" style={{ flexWrap: 'wrap' }}>
                                {agent.capabilities.map((cap, ci) => (
                                  <span key={ci} className="badge badge-c6">{cap}</span>
                                ))}
                              </div>
                              {agent.status === 'active' && (
                                <button className="btn btn-primary btn-sm" style={{ marginTop: 12 }}>{t('agents.useAgent')}</button>
                              )}
                              {agent.status === 'beta' && (
                                <button className="btn btn-secondary btn-sm" style={{ marginTop: 12 }}>{t('agents.joinBeta')}</button>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
