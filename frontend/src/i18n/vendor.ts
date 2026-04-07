import type { Locale } from '@hooks/useI18n';

type TranslationMap = Record<string, Record<Locale, string>>;

export const vendorTranslations: TranslationMap = {
  /* ══════════════════════════════════════════════════════
     VENDOR PAGE
     ══════════════════════════════════════════════════════ */

  // ── Sidebar groups ──
  'vendor.sidebar.shop': { vi: 'CỬA HÀNG', en: 'SHOP', zh: '店铺', th: 'ร้านค้า', hi: 'दुकान', ko: '가게'  },
  'vendor.sidebar.overview': { vi: 'Tổng quan', en: 'Overview', zh: '概览', th: 'ภาพรวม', hi: 'अवलोकन', ko: '개요'  },
  'vendor.sidebar.products': { vi: 'Sản phẩm', en: 'Products', zh: '产品', th: 'สินค้า', hi: 'उत्पाद', ko: '제품'  },
  'vendor.sidebar.orders': { vi: 'Đơn hàng', en: 'Orders', zh: '订单', th: 'คำสั่งซื้อ', hi: 'ऑर्डर', ko: '주문'  },
  'vendor.sidebar.network': { vi: 'MẠNG LƯỚI', en: 'NETWORK', zh: '网络', th: 'เครือข่าย', hi: 'नेटवर्क', ko: '네트워크'  },
  'vendor.sidebar.web3': { vi: 'WEB3 & DPP', en: 'WEB3 & DPP', zh: 'WEB3 & DPP', th: 'WEB3 & DPP', hi: 'WEB3 & DPP', ko: 'WEB3 & DPP'  },
  'vendor.sidebar.dppMgmt': { vi: 'DPP Management', en: 'DPP Management', zh: 'DPP 管理', th: 'จัดการ DPP', hi: 'DPP प्रबंधन', ko: 'DPP 관리'  },
  'vendor.sidebar.walletBlockchain': { vi: 'Ví blockchain', en: 'Blockchain Wallet', zh: '区块链钱包', th: 'กระเป๋าบล็อกเชน', hi: 'ब्लॉकचेन वॉलेट', ko: '블록체인 지갑'  },
  'vendor.sidebar.account': { vi: 'TÀI KHOẢN', en: 'ACCOUNT', zh: '账户', th: 'บัญชี', hi: 'खाता', ko: '계정'  },
  'vendor.sidebar.verifyBusiness': { vi: 'Xác minh doanh nghiệp', en: 'Business Verification', zh: '企业验证', th: 'ยืนยันธุรกิจ', hi: 'व्यवसाय सत्यापन', ko: '사업체 인증'  },
  'vendor.sidebar.settings': { vi: 'Cài đặt', en: 'Settings', zh: '设置', th: 'การตั้งค่า', hi: 'सेटिंग्स', ko: '설정'  },
  'vendor.sidebar.logout': { vi: 'Đăng xuất', en: 'Log out', zh: '退出登录', th: 'ออกจากระบบ', hi: 'लॉग आउट', ko: '로그아웃'  },
  'vendor.sidebar.inventory': { vi: 'Kho hàng', en: 'Inventory', zh: '库存', th: 'คลังสินค้า', hi: 'इन्वेंटरी', ko: '재고 관리' },
  'vendor.sidebar.returns': { vi: 'Hàng hoàn', en: 'Returns', zh: '退货', th: 'การคืนสินค้า', hi: 'रिटर्न', ko: '반품 관리' },
  'vendor.sidebar.logistics': { vi: 'Vận chuyển', en: 'Logistics', zh: '物流', th: 'โลจิสติกส์', hi: 'लॉजिस्टिक्स', ko: '배송 관리' },
  'vendor.sidebar.kocNetwork': { vi: 'Mạng lưới KOC', en: 'KOC Network', zh: 'KOC 网络', th: 'เครือข่าย KOC', hi: 'KOC नेटवर्क', ko: 'KOC 네트워크' },
  'vendor.sidebar.kocHub': { vi: 'KOC Hub', en: 'KOC Hub', zh: 'KOC 中心', th: 'KOC ฮับ', hi: 'KOC हब', ko: 'KOC 허브' },
  'vendor.sidebar.kocCollab': { vi: 'Hợp tác KOC', en: 'KOC Collab', zh: 'KOC 合作', th: 'ความร่วมมือ KOC', hi: 'KOC सहयोग', ko: 'KOC 협업' },
  'vendor.sidebar.kocAnalytics': { vi: 'Phân tích KOC', en: 'KOC Analytics', zh: 'KOC 分析', th: 'วิเคราะห์ KOC', hi: 'KOC विश्लेषण', ko: 'KOC 분석' },
  'vendor.sidebar.finance': { vi: 'Tài chính', en: 'Finance', zh: '财务', th: 'การเงิน', hi: 'वित्त', ko: '재무' },
  'vendor.sidebar.accounting': { vi: 'Kế toán AI', en: 'AI Accounting', zh: 'AI 会计', th: 'บัญชี AI', hi: 'AI अकाउंटिंग', ko: 'AI 회계' },
  'vendor.sidebar.payment': { vi: 'Thanh toán', en: 'Payments', zh: '支付', th: 'การชำระเงิน', hi: 'भुगतान', ko: '결제 관리' },
  'vendor.sidebar.reports': { vi: 'Báo cáo', en: 'Reports', zh: '报告', th: 'รายงาน', hi: 'रिपोर्ट', ko: '보고서' },
  'vendor.sidebar.growth': { vi: 'Tăng trưởng', en: 'Growth', zh: '增长', th: 'การเติบโต', hi: 'विकास', ko: '성장' },
  'vendor.sidebar.crm': { vi: 'CRM AI', en: 'AI CRM', zh: 'AI CRM', th: 'CRM AI', hi: 'AI CRM', ko: 'AI CRM' },
  'vendor.sidebar.marketing': { vi: 'Marketing', en: 'Marketing', zh: '营销', th: 'การตลาด', hi: 'मार्केटिंग', ko: '마케팅' },
  'vendor.sidebar.media': { vi: 'Media & Link', en: 'Media & Links', zh: '媒体与链接', th: 'สื่อและลิงก์', hi: 'मीडिया और लिंक', ko: '미디어 & 링크' },
  'vendor.sidebar.roleSwitch': { vi: 'Chuyển vai trò', en: 'Switch Role', zh: '切换角色', th: 'เปลี่ยนบทบาท', hi: 'भूमिका बदलें', ko: '역할 전환' },

  // ── Product status ──
  'vendor.status.active': { vi: 'Đang bán', en: 'Active', zh: '在售', th: 'ขายอยู่', hi: 'सक्रिय', ko: '활성'  },
  'vendor.status.lowStock': { vi: 'Sắp hết', en: 'Low Stock', zh: '库存不足', th: 'สินค้าใกล้หมด', hi: 'कम स्टॉक', ko: '재고 부족'  },
  'vendor.status.outOfStock': { vi: 'Hết hàng', en: 'Out of Stock', zh: '缺货', th: 'สินค้าหมด', hi: 'स्टॉक में नहीं', ko: '재고 없음'  },
  'vendor.status.hidden': { vi: 'Đã ẩn', en: 'Hidden', zh: '已隐藏', th: 'ซ่อนอยู่', hi: 'छिपा हुआ', ko: '숨김'  },
  'vendor.status.dppPending': { vi: 'Chờ Blockchain', en: 'Awaiting DPP', zh: '等待区块链', th: 'รอบล็อกเชน', hi: 'ब्लॉकचेन प्रतीक्षारत', ko: 'DPP 대기 중'  },

  // ── Order status ──
  'vendor.order.delivered': { vi: 'Đã giao', en: 'Delivered', zh: '已交付', th: 'ส่งแล้ว', hi: 'डिलीवर किया गया', ko: '배송 완료'  },
  'vendor.order.shipping': { vi: 'Đang giao', en: 'Shipping', zh: '配送中', th: 'กำลังจัดส่ง', hi: 'शिपिंग', ko: '배송'  },
  'vendor.order.processing': { vi: 'Đang xử lý', en: 'Processing', zh: '处理中', th: 'กำลังดำเนินการ', hi: 'प्रोसेसिंग', ko: '처리 중'  },
  'vendor.order.pending': { vi: 'Chờ xác nhận', en: 'Pending', zh: '待确认', th: 'รอยืนยัน', hi: 'लंबित', ko: '대기 중'  },

  // ── Order actions ──
  'vendor.order.confirm': { vi: 'Xác nhận', en: 'Confirm', zh: '确认', th: 'ยืนยัน', hi: 'पुष्टि करें', ko: '확인'  },
  'vendor.order.ship': { vi: 'Giao hàng', en: 'Ship', zh: '发货', th: 'จัดส่ง', hi: 'शिप करें', ko: '배송'  },
  'vendor.order.markDelivered': { vi: 'Đã giao', en: 'Delivered', zh: '已交付', th: 'ส่งแล้ว', hi: 'डिलीवर किया', ko: '배송 완료'  },
  'vendor.order.completed': { vi: 'Hoàn thành', en: 'Completed', zh: '已完成', th: 'เสร็จสิ้น', hi: 'पूर्ण', ko: '완료됨'  },

  // ── Wallet tx types ──
  'vendor.wallet.txOrderRevenue': { vi: 'Doanh thu đơn hàng', en: 'Order Revenue', zh: '订单收入', th: 'รายได้จากคำสั่งซื้อ', hi: 'ऑर्डर राजस्व', ko: '주문 수익'  },
  'vendor.wallet.txCommissionPayout': { vi: 'Commission payout (KOC)', en: 'Commission payout (KOC)', zh: 'KOC佣金支付', th: 'จ่ายค่าคอมมิชชั่น (KOC)', hi: 'कमीशन भुगतान (KOC)', ko: '수수료 지급 (KOC)'  },
  'vendor.wallet.txBankWithdraw': { vi: 'Rút về ngân hàng', en: 'Bank Withdrawal', zh: '提现到银行', th: 'ถอนเงินเข้าธนาคาร', hi: 'बैंक निकासी', ko: '은행 출금'  },

  // ── Commission tiers ──
  'vendor.commission.t1Desc': { vi: 'KOC bán trực tiếp', en: 'KOC direct sales', zh: 'KOC直接销售', th: 'KOC ขายโดยตรง', hi: 'KOC प्रत्यक्ष बिक्री', ko: 'KOC 직접 판매'  },
  'vendor.commission.t2Desc': { vi: 'KOC giới thiệu bởi T1', en: 'KOC referred by T1', zh: 'T1推荐的KOC', th: 'KOC แนะนำโดย T1', hi: 'T1 द्वारा रेफ़र किए गए KOC', ko: 'T1이 추천한 KOC'  },
  'vendor.commission.t3Desc': { vi: 'KOC giới thiệu bởi T2', en: 'KOC referred by T2', zh: 'T2推荐的KOC', th: 'KOC แนะนำโดย T2', hi: 'T2 द्वारा रेफ़र किए गए KOC', ko: 'T2가 추천한 KOC'  },
  'vendor.commission.noMinSales': { vi: 'Không yêu cầu', en: 'No requirement', zh: '无要求', th: 'ไม่มีข้อกำหนด', hi: 'कोई आवश्यकता नहीं', ko: '요구사항 없음'  },
  'vendor.commission.minSales': { vi: 'Min doanh số', en: 'Min sales', zh: '最低销售额', th: 'ยอดขายขั้นต่ำ', hi: 'न्यूनतम बिक्री', ko: '최소 판매'  },

  // ── Settings sections ──
  'vendor.settings.shopInfo': { vi: 'Thông tin cửa hàng', en: 'Shop Information', zh: '店铺信息', th: 'ข้อมูลร้านค้า', hi: 'दुकान की जानकारी', ko: '가게 정보'  },
  'vendor.settings.name': { vi: 'Tên', en: 'Name', zh: '名称', th: 'ชื่อ', hi: 'नाम', ko: '이름'  },
  'vendor.settings.type': { vi: 'Loại', en: 'Type', zh: '类型', th: 'ประเภท', hi: 'प्रकार', ko: '유형'  },
  'vendor.settings.rating': { vi: 'Đánh giá', en: 'Rating', zh: '评分', th: 'คะแนน', hi: 'रेटिंग', ko: '평점'  },
  'vendor.settings.blockchain': { vi: 'Blockchain', en: 'Blockchain', zh: '区块链', th: 'บล็อกเชน', hi: 'ब्लॉकचेन', ko: '블록체인'  },
  'vendor.settings.wallet': { vi: 'Ví', en: 'Wallet', zh: '钱包', th: 'กระเป๋าเงิน', hi: 'वॉलेट', ko: '지갑'  },
  'vendor.settings.payment': { vi: 'Thanh toán', en: 'Payment', zh: '支付', th: 'การชำระเงิน', hi: 'भुगतान', ko: '결제'  },
  'vendor.settings.withdrawTo': { vi: 'Rút tiền về', en: 'Withdraw to', zh: '提现到', th: 'ถอนเงินไปยัง', hi: 'निकासी', ko: '출금처'  },
  'vendor.settings.autoPayoutKOC': { vi: 'Auto payout KOC', en: 'Auto payout KOC', zh: '自动支付KOC', th: 'จ่าย KOC อัตโนมัติ', hi: 'ऑटो भुगतान KOC', ko: 'KOC 자동 지급'  },
  'vendor.settings.enabled': { vi: 'Bật', en: 'Enabled', zh: '已启用', th: 'เปิด', hi: 'सक्षम', ko: '활성화됨'  },
  'vendor.settings.commission': { vi: 'Commission', en: 'Commission', zh: '佣金', th: 'ค่าคอมมิชชั่น', hi: 'कमीशन', ko: '수수료'  },
  'vendor.settings.autoDistribute': { vi: 'Auto-distribute', en: 'Auto-distribute', zh: '自动分配', th: 'แจกจ่ายอัตโนมัติ', hi: 'ऑटो वितरण', ko: '자동 분배'  },

  // ── KPI labels ──
  'vendor.kpi.monthlyRevenue': { vi: 'Doanh thu tháng', en: 'Monthly Revenue', zh: '月收入', th: 'รายได้รายเดือน', hi: 'मासिक राजस्व', ko: '월간 수익'  },
  'vendor.kpi.orders': { vi: 'Đơn hàng', en: 'Orders', zh: '订单', th: 'คำสั่งซื้อ', hi: 'ऑर्डर', ko: '주문'  },
  'vendor.kpi.pendingProcess': { vi: 'chờ xử lý', en: 'pending', zh: '待处理', th: 'รอดำเนินการ', hi: 'लंबित', ko: '대기 중'  },
  'vendor.kpi.products': { vi: 'Sản phẩm', en: 'Products', zh: '产品', th: 'สินค้า', hi: 'उत्पाद', ko: '제품'  },
  'vendor.kpi.dppDone': { vi: 'đã DPP', en: 'DPP done', zh: '已DPP', th: 'DPP แล้ว', hi: 'DPP पूर्ण', ko: 'DPP 완료'  },
  'vendor.kpi.newKoc': { vi: 'mới', en: 'new', zh: '新', th: 'ใหม่', hi: 'नया', ko: '새로운'  },

  // ── Overview ──
  'vendor.overview.title': { vi: 'Tổng Quan Cửa Hàng', en: 'Shop Overview', zh: '店铺概览', th: 'ภาพรวมร้านค้า', hi: 'दुकान अवलोकन', ko: '가게 개요'  },
  'vendor.overview.revenue12m': { vi: 'DOANH THU 12 THÁNG', en: '12-MONTH REVENUE', zh: '12个月收入', th: 'รายได้ 12 เดือน', hi: '12 माह का राजस्व', ko: '12개월 수익'  },
  'vendor.overview.topProducts': { vi: 'TOP SẢN PHẨM', en: 'TOP PRODUCTS', zh: '热门产品', th: 'สินค้ายอดนิยม', hi: 'शीर्ष उत्पाद', ko: '인기 제품'  },
  'vendor.overview.topKoc': { vi: 'TOP KOC', en: 'TOP KOC', zh: '顶级KOC', th: 'KOC ยอดนิยม', hi: 'शीर्ष KOC', ko: '인기 KOC'  },

  // ── Products ──
  'vendor.products.title': { vi: 'Quản Lý Sản Phẩm', en: 'Product Management', zh: '产品管理', th: 'จัดการสินค้า', hi: 'उत्पाद प्रबंधन', ko: '제품 관리'  },
  'vendor.products.addBtn': { vi: '+ Thêm sản phẩm', en: '+ Add Product', zh: '+ 添加产品', th: '+ เพิ่มสินค้า', hi: '+ उत्पाद जोड़ें', ko: '+ 제품 추가'  },
  'vendor.products.searchPlaceholder': { vi: 'Tìm sản phẩm...', en: 'Search products...', zh: '搜索产品...', th: 'ค้นหาสินค้า...', hi: 'उत्पाद खोजें...', ko: '제품 검색...'  },
  'vendor.products.addFormTitle': { vi: 'THÊM SẢN PHẨM MỚI', en: 'ADD NEW PRODUCT', zh: '添加新产品', th: 'เพิ่มสินค้าใหม่', hi: 'नया उत्पाद जोड़ें', ko: '새 제품 추가'  },
  'vendor.products.labelName': { vi: 'Tên sản phẩm *', en: 'Product Name *', zh: '产品名称 *', th: 'ชื่อสินค้า *', hi: 'उत्पाद का नाम *', ko: '제품명 *'  },
  'vendor.products.labelPrice': { vi: 'Giá bán *', en: 'Price *', zh: '售价 *', th: 'ราคา *', hi: 'कीमत *', ko: '가격 *'  },
  'vendor.products.labelStock': { vi: 'Tồn kho', en: 'Stock', zh: '库存', th: 'สินค้าคงเหลือ', hi: 'स्टॉक', ko: '재고'  },
  'vendor.products.labelCommission': { vi: 'Hoa hồng KOC (%)', en: 'KOC Commission (%)', zh: 'KOC佣金 (%)', th: 'ค่าคอมมิชชั่น KOC (%)', hi: 'KOC कमीशन (%)', ko: 'KOC 수수료 (%)'  },
  'vendor.products.labelSku': { vi: 'Mã SKU', en: 'SKU Code', zh: 'SKU编码', th: 'รหัส SKU', hi: 'SKU कोड', ko: 'SKU 코드'  },
  'vendor.products.labelCategory': { vi: 'Danh mục', en: 'Category', zh: '分类', th: 'หมวดหมู่', hi: 'श्रेणी', ko: '카테고리'  },
  'vendor.products.selectCategory': { vi: '-- Chọn danh mục --', en: '-- Select category --', zh: '-- 选择分类 --', th: '-- เลือกหมวดหมู่ --', hi: '-- श्रेणी चुनें --', ko: '-- 카테고리 선택 --'  },
  'vendor.products.catFood': { vi: 'Thực phẩm & Đồ uống', en: 'Food & Beverages', zh: '食品与饮料', th: 'อาหารและเครื่องดื่ม', hi: 'खाद्य और पेय', ko: '식품 및 음료'  },
  'vendor.products.catBeauty': { vi: 'Mỹ phẩm & Skincare', en: 'Beauty & Skincare', zh: '美妆与护肤', th: 'เครื่องสำอางและสกินแคร์', hi: 'सौंदर्य और स्किनकेयर', ko: '뷰티 및 스킨케어'  },
  'vendor.products.catHealth': { vi: 'Sức khỏe & Dinh dưỡng', en: 'Health & Nutrition', zh: '健康与营养', th: 'สุขภาพและโภชนาการ', hi: 'स्वास्थ्य और पोषण', ko: '건강 및 영양'  },
  'vendor.products.catFashion': { vi: 'Thời trang & Phụ kiện', en: 'Fashion & Accessories', zh: '时尚与配饰', th: 'แฟชั่นและเครื่องประดับ', hi: 'फैशन और एक्सेसरीज', ko: '패션 및 액세서리'  },
  'vendor.products.catTech': { vi: 'Công nghệ & Điện tử', en: 'Tech & Electronics', zh: '科技与电子', th: 'เทคโนโลยีและอิเล็กทรอนิกส์', hi: 'तकनीक और इलेक्ट्रॉनिक्स', ko: '기술 및 전자'  },
  'vendor.products.catHome': { vi: 'Nhà cửa & Đời sống', en: 'Home & Living', zh: '家居生活', th: 'บ้านและการอยู่อาศัย', hi: 'घर और जीवनशैली', ko: '홈 및 리빙'  },
  'vendor.products.catPets': { vi: 'Thú cưng', en: 'Pets', zh: '宠物', th: 'สัตว์เลี้ยง', hi: 'पालतू जानवर', ko: 'Pets'  },
  'vendor.products.catOther': { vi: 'Khác', en: 'Other', zh: '其他', th: 'อื่นๆ', hi: 'अन्य', ko: 'Other'  },
  'vendor.products.labelOrigin': { vi: 'Xuất xứ', en: 'Origin', zh: '产地', th: 'แหล่งกำเนิด', hi: 'मूल', ko: 'Origin'  },
  'vendor.products.labelWeight': { vi: 'Khối lượng', en: 'Weight', zh: '重量', th: 'น้ำหนัก', hi: 'वज़न', ko: 'Weight'  },
  'vendor.products.labelDescription': { vi: 'Mô tả sản phẩm', en: 'Product Description', zh: '产品描述', th: 'รายละเอียดสินค้า', hi: 'उत्पाद विवरण', ko: 'Product Description'  },
  'vendor.products.descPlaceholder': { vi: 'Mô tả chi tiết sản phẩm, thành phần, công dụng...', en: 'Detailed description, ingredients, usage...', zh: '详细描述、成分、用途...', th: 'รายละเอียด ส่วนผสม การใช้งาน...', hi: 'विस्तृत विवरण, सामग्री, उपयोग...', ko: 'Detailed description, ingredients, usage...'  },
  'vendor.products.labelImage': { vi: 'Hình ảnh sản phẩm', en: 'Product Images', zh: '产品图片', th: 'รูปภาพสินค้า', hi: 'उत्पाद चित्र', ko: 'Product Images'  },
  'vendor.products.mainImage': { vi: 'Ảnh chính *', en: 'Main Image *', zh: '主图 *', th: 'ภาพหลัก *', hi: 'मुख्य छवि *', ko: 'Main Image *'  },
  'vendor.products.imageUploaded': { vi: 'Ảnh đã upload', en: 'Image uploaded', zh: '已上传', th: 'อัปโหลดแล้ว', hi: 'अपलोड किया गया', ko: 'Image uploaded'  },
  'vendor.products.dppOption': { vi: 'Tạo DPP (Digital Product Passport)', en: 'Create DPP (Digital Product Passport)', zh: '创建DPP (数字产品护照)', th: 'สร้าง DPP (Digital Product Passport)', hi: 'DPP बनाएं (डिजिटल प्रोडक्ट पासपोर्ट)', ko: 'Create DPP (Digital Product Passport)'  },
  'vendor.products.dppOptionDesc': { vi: 'Mint NFT xác thực nguồn gốc trên Polygon — tự động sau khi lưu sản phẩm', en: 'Mint origin-verification NFT on Polygon — auto after saving product', zh: '在Polygon上铸造溯源NFT — 保存产品后自动执行', th: 'Mint NFT ยืนยันแหล่งกำเนิดบน Polygon — อัตโนมัติหลังบันทึกสินค้า', hi: 'Polygon पर मूल-सत्यापन NFT मिंट करें — उत्पाद सहेजने के बाद ऑटो', ko: 'Mint origin-verification NFT on Polygon — auto after saving product'  },
  'vendor.products.auto': { vi: 'Tự động', en: 'Auto', zh: '自动', th: 'อัตโนมัติ', hi: 'ऑटो', ko: 'Auto'  },
  'vendor.products.saveBtn': { vi: 'Lưu sản phẩm', en: 'Save Product', zh: '保存产品', th: 'บันทึกสินค้า', hi: 'उत्पाद सहेजें', ko: 'Save Product'  },
  'vendor.products.cancelBtn': { vi: 'Hủy', en: 'Cancel', zh: '取消', th: 'ยกเลิก', hi: 'रद्द करें', ko: '취소'  },
  // Table headers
  'vendor.products.thProduct': { vi: 'Sản phẩm', en: 'Product', zh: '产品', th: 'สินค้า', hi: 'उत्पाद', ko: '제품'  },
  'vendor.products.thPrice': { vi: 'Giá', en: 'Price', zh: '价格', th: 'ราคา', hi: 'कीमत', ko: '가격'  },
  'vendor.products.thStock': { vi: 'Tồn kho', en: 'Stock', zh: '库存', th: 'คงเหลือ', hi: 'स्टॉक', ko: '재고'  },
  'vendor.products.thSold': { vi: 'Đã bán', en: 'Sold', zh: '已售', th: 'ขายแล้ว', hi: 'बेचा गया', ko: '판매됨'  },
  'vendor.products.thCommission': { vi: 'Hoa hồng', en: 'Commission', zh: '佣金', th: 'ค่าคอมมิชชั่น', hi: 'कमीशन', ko: '수수료'  },
  'vendor.products.thStatus': { vi: 'Trạng thái', en: 'Status', zh: '状态', th: 'สถานะ', hi: 'स्थिति', ko: '상태'  },
  'vendor.products.thActions': { vi: 'Thao tác', en: 'Actions', zh: '操作', th: 'การดำเนินการ', hi: 'कार्य', ko: '작업'  },
  'vendor.products.editBtn': { vi: 'Sửa', en: 'Edit', zh: '编辑', th: 'แก้ไข', hi: 'संपादित करें', ko: '편집'  },
  'vendor.products.showBtn': { vi: 'Hiện', en: 'Show', zh: '显示', th: 'แสดง', hi: 'दिखाएं', ko: '표시'  },
  'vendor.products.hideBtn': { vi: 'Ẩn', en: 'Hide', zh: '隐藏', th: 'ซ่อน', hi: 'छिपाएं', ko: '숨기기'  },
  'vendor.products.deleteBtn': { vi: 'Xóa', en: 'Delete', zh: '删除', th: 'ลบ', hi: 'हटाएं', ko: '삭제'  },
  'vendor.products.saveEditBtn': { vi: 'Lưu', en: 'Save', zh: '保存', th: 'บันทึก', hi: 'सहेजें', ko: '절약'  },

  // ── Orders ──
  'vendor.orders.title': { vi: 'Quản Lý Đơn Hàng', en: 'Order Management', zh: '订单管理', th: 'จัดการคำสั่งซื้อ', hi: 'ऑर्डर प्रबंधन', ko: 'Order Management'  },
  'vendor.orders.all': { vi: 'Tất cả', en: 'All', zh: '全部', th: 'ทั้งหมด', hi: 'सभी', ko: '전체'  },
  'vendor.orders.searchPlaceholder': { vi: 'Tìm đơn hàng (mã đơn, khách hàng, sản phẩm)...', en: 'Search orders (ID, customer, product)...', zh: '搜索订单 (编号、客户、产品)...', th: 'ค้นหาคำสั่งซื้อ (รหัส, ลูกค้า, สินค้า)...', hi: 'ऑर्डर खोजें (आईडी, ग्राहक, उत्पाद)...', ko: 'Search orders (ID, customer, product)...'  },
  'vendor.orders.thOrderId': { vi: 'Mã đơn', en: 'Order ID', zh: '订单号', th: 'รหัสคำสั่งซื้อ', hi: 'ऑर्डर आईडी', ko: '주문 ID'  },
  'vendor.orders.thCustomer': { vi: 'Khách hàng', en: 'Customer', zh: '客户', th: 'ลูกค้า', hi: 'ग्राहक', ko: 'Customer'  },
  'vendor.orders.thProduct': { vi: 'Sản phẩm', en: 'Product', zh: '产品', th: 'สินค้า', hi: 'उत्पाद', ko: '제품'  },
  'vendor.orders.thValue': { vi: 'Giá trị', en: 'Value', zh: '金额', th: 'มูลค่า', hi: 'मूल्य', ko: 'Value'  },
  'vendor.orders.thCommission': { vi: 'Hoa hồng', en: 'Commission', zh: '佣金', th: 'ค่าคอมมิชชั่น', hi: 'कमीशन', ko: '수수료'  },
  'vendor.orders.thStatus': { vi: 'Trạng thái', en: 'Status', zh: '状态', th: 'สถานะ', hi: 'स्थिति', ko: '상태'  },
  'vendor.orders.thActions': { vi: 'Thao tác', en: 'Actions', zh: '操作', th: 'การดำเนินการ', hi: 'कार्य', ko: '작업'  },

  // ── KOC Network ──
  'vendor.koc.title': { vi: 'KOC Network', en: 'KOC Network', zh: 'KOC网络', th: 'เครือข่าย KOC', hi: 'KOC नेटवर्क', ko: 'KOC Network'  },
  'vendor.koc.revenue': { vi: 'Doanh thu', en: 'Revenue', zh: '收入', th: 'รายได้', hi: 'राजस्व', ko: '수익'  },
  'vendor.koc.searchPlaceholder': { vi: 'Tìm KOC...', en: 'Search KOC...', zh: '搜索KOC...', th: 'ค้นหา KOC...', hi: 'KOC खोजें...', ko: 'Search KOC...'  },
  'vendor.koc.orders': { vi: 'đơn', en: 'orders', zh: '单', th: 'คำสั่งซื้อ', hi: 'ऑर्डर', ko: 'orders'  },
  'vendor.koc.commission': { vi: 'Hoa hồng', en: 'Commission', zh: '佣金', th: 'ค่าคอมมิชชั่น', hi: 'कमीशन', ko: '수수료'  },

  // ── DPP Management ──
  'vendor.dpp.title': { vi: 'DPP Management (Digital Product Passport)', en: 'DPP Management (Digital Product Passport)', zh: 'DPP管理 (数字产品护照)', th: 'จัดการ DPP (Digital Product Passport)', hi: 'DPP प्रबंधन (डिजिटल प्रोडक्ट पासपोर्ट)', ko: 'DPP Management (Digital Product Passport)'  },
  'vendor.dpp.minted': { vi: 'DPP đã mint', en: 'DPP Minted', zh: '已铸造DPP', th: 'DPP ที่ Mint แล้ว', hi: 'DPP मिंट किए गए', ko: 'DPP Minted'  },
  'vendor.dpp.pendingMint': { vi: 'Đang chờ mint', en: 'Pending Mint', zh: '待铸造', th: 'รอ Mint', hi: 'मिंट लंबित', ko: 'Pending Mint'  },
  'vendor.dpp.verifiedOnchain': { vi: 'Verified on-chain', en: 'Verified on-chain', zh: '链上已验证', th: 'ยืนยันแล้วบนเชน', hi: 'ऑन-चेन सत्यापित', ko: 'Verified on-chain'  },
  'vendor.dpp.gasFeesMonth': { vi: 'Gas fees tháng', en: 'Monthly gas fees', zh: '月gas费', th: 'ค่า Gas รายเดือน', hi: 'मासिक गैस फ़ीस', ko: 'Monthly gas fees'  },
  'vendor.dpp.pendingMintTitle': { vi: 'SẢN PHẨM CHỜ MINT DPP', en: 'PRODUCTS PENDING DPP MINT', zh: '待铸造DPP的产品', th: 'สินค้ารอ MINT DPP', hi: 'DPP मिंट लंबित उत्पाद', ko: 'PRODUCTS PENDING DPP MINT'  },
  'vendor.dpp.mintBtn': { vi: 'Mint DPP NFT', en: 'Mint DPP NFT', zh: '铸造DPP NFT', th: 'Mint DPP NFT', hi: 'DPP NFT मिंट करें', ko: 'Mint DPP NFT'  },
  'vendor.dpp.mintedTitle': { vi: 'DPP NFTs Đã Mint', en: 'Minted DPP NFTs', zh: '已铸造的DPP NFT', th: 'DPP NFTs ที่ Mint แล้ว', hi: 'मिंट किए गए DPP NFTs', ko: 'Minted DPP NFTs'  },
  'vendor.dpp.thTokenId': { vi: 'Token ID', en: 'Token ID', zh: 'Token ID', th: 'Token ID', hi: 'Token ID', ko: 'Token ID'  },
  'vendor.dpp.thProduct': { vi: 'Sản phẩm', en: 'Product', zh: '产品', th: 'สินค้า', hi: 'उत्पाद', ko: '제품'  },
  'vendor.dpp.thMintDate': { vi: 'Ngày mint', en: 'Mint Date', zh: '铸造日期', th: 'วันที่ Mint', hi: 'मिंट तिथि', ko: 'Mint Date'  },
  'vendor.dpp.thStatus': { vi: 'Trạng thái', en: 'Status', zh: '状态', th: 'สถานะ', hi: 'स्थिति', ko: '상태'  },
  'vendor.dpp.onchainTitle': { vi: 'Digital Product Passport trên blockchain', en: 'Digital Product Passport on blockchain', zh: '区块链上的数字产品护照', th: 'Digital Product Passport บนบล็อกเชน', hi: 'ब्लॉकचेन पर डिजिटल प्रोडक्ट पासपोर्ट', ko: 'Digital Product Passport on blockchain'  },
  'vendor.dpp.onchainDesc': { vi: 'Mỗi sản phẩm được gắn DPP NFT chứa thông tin xuất xứ, thành phần, chứng nhận. Dữ liệu lưu trữ trên IPFS, hash ghi trên Polygon.', en: 'Each product has a DPP NFT containing origin, ingredients, and certifications. Data stored on IPFS, hash recorded on Polygon.', zh: '每个产品绑定DPP NFT，包含产地、成分和认证信息。数据存储在IPFS上，哈希记录在Polygon上。', th: 'สินค้าแต่ละรายการมี DPP NFT ที่มีข้อมูลแหล่งกำเนิด ส่วนผสม และใบรับรอง ข้อมูลเก็บบน IPFS แฮชบันทึกบน Polygon', hi: 'प्रत्येक उत्पाद में मूल, सामग्री और प्रमाणन वाला DPP NFT होता है। डेटा IPFS पर संग्रहीत, हैश Polygon पर रिकॉर्ड।', ko: 'Each product has a DPP NFT containing origin, ingredients, and certifications. Data stored on IPFS, hash recorded on Polygon.'  },

  // ── Commission Rules ──
  'vendor.commissionRules.title': { vi: 'Commission Rules (Smart Contract)', en: 'Commission Rules (Smart Contract)', zh: '佣金规则 (智能合约)', th: 'กฎค่าคอมมิชชั่น (Smart Contract)', hi: 'कमीशन नियम (स्मार्ट कॉन्ट्रैक्ट)', ko: 'Commission Rules (Smart Contract)'  },
  'vendor.commissionRules.desc': { vi: 'Hoa hồng được tự động tính toán và phân phối qua smart contract trên Polygon. Tỷ lệ T1: 40%, T2: 13%, T3: 5% được hardcode trong contract, đảm bảo minh bạch tuyệt đối.', en: 'Commission is automatically calculated and distributed via smart contract on Polygon. T1: 40%, T2: 13%, T3: 5% rates are hardcoded in the contract, ensuring absolute transparency.', zh: '佣金通过Polygon上的智能合约自动计算和分配。T1: 40%、T2: 13%、T3: 5%的比例写入合约，确保绝对透明。', th: 'ค่าคอมมิชชั่นคำนวณและกระจายอัตโนมัติผ่าน smart contract บน Polygon อัตรา T1: 40%, T2: 13%, T3: 5% ถูกฝังใน contract รับประกันความโปร่งใส', hi: 'कमीशन Polygon पर स्मार्ट कॉन्ट्रैक्ट के माध्यम से स्वचालित रूप से गणना और वितरित किया जाता है। T1: 40%, T2: 13%, T3: 5% दरें कॉन्ट्रैक्ट में हार्डकोड हैं।', ko: 'Commission is automatically calculated and distributed via smart contract on Polygon. T1: 40%, T2: 13%, T3: 5% rates are hardcoded in the contract, ensuring absolute transparency.'  },

  // ── Wallet ──
  'vendor.wallet.title': { vi: 'Ví Blockchain', en: 'Blockchain Wallet', zh: '区块链钱包', th: 'กระเป๋าบล็อกเชน', hi: 'ब्लॉकचेन वॉलेट', ko: '블록체인 지갑'  },
  'vendor.wallet.addressLabel': { vi: 'Địa chỉ ví Vendor (Polygon)', en: 'Vendor Wallet Address (Polygon)', zh: '供应商钱包地址 (Polygon)', th: 'ที่อยู่กระเป๋า Vendor (Polygon)', hi: 'वेंडर वॉलेट पता (Polygon)', ko: 'Vendor Wallet Address (Polygon)'  },
  'vendor.wallet.copy': { vi: 'Sao chép', en: 'Copy', zh: '复制', th: 'คัดลอก', hi: 'कॉपी', ko: '복사'  },
  'vendor.wallet.totalValue': { vi: 'Tổng giá trị', en: 'Total Value', zh: '总价值', th: 'มูลค่ารวม', hi: 'कुल मूल्य', ko: 'Total Value'  },
  'vendor.wallet.pendingRevenue': { vi: 'Doanh thu chờ rút', en: 'Pending Revenue', zh: '待提现收入', th: 'รายได้รอถอน', hi: 'लंबित राजस्व', ko: 'Pending Revenue'  },
  'vendor.wallet.withdrawBtn': { vi: 'Rút tiền (Withdraw)', en: 'Withdraw', zh: '提现', th: 'ถอนเงิน', hi: 'निकासी', ko: '출금'  },
  'vendor.wallet.withdrawTitle': { vi: 'RÚT TIỀN VỀ NGÂN HÀNG', en: 'WITHDRAW TO BANK', zh: '提现到银行', th: 'ถอนเงินเข้าธนาคาร', hi: 'बैंक में निकासी', ko: 'WITHDRAW TO BANK'  },
  'vendor.wallet.available': { vi: 'Khả dụng', en: 'Available', zh: '可用', th: 'ใช้ได้', hi: 'उपलब्ध', ko: 'Available'  },
  'vendor.wallet.amountPlaceholder': { vi: 'Số tiền (VD: 5000000)', en: 'Amount (e.g. 5000000)', zh: '金额 (例: 5000000)', th: 'จำนวนเงิน (เช่น 5000000)', hi: 'राशि (उदा: 5000000)', ko: 'Amount (e.g. 5000000)'  },
  'vendor.wallet.confirmWithdraw': { vi: 'Xác nhận rút', en: 'Confirm Withdrawal', zh: '确认提现', th: 'ยืนยันการถอน', hi: 'निकासी की पुष्टि करें', ko: 'Confirm Withdrawal'  },
  'vendor.wallet.bankWithdraw': { vi: 'Rút về ngân hàng', en: 'Withdraw to Bank', zh: '提现到银行', th: 'ถอนเงินเข้าธนาคาร', hi: 'बैंक में निकासी', ko: 'Withdraw to Bank'  },
  'vendor.wallet.transferToken': { vi: 'Chuyển token', en: 'Transfer Token', zh: '转账代币', th: 'โอนโทเค็น', hi: 'टोकन ट्रांसफ़र', ko: 'Transfer Token'  },
  'vendor.wallet.txHistoryTitle': { vi: 'Lịch Sử Giao Dịch On-chain', en: 'On-chain Transaction History', zh: '链上交易历史', th: 'ประวัติธุรกรรม On-chain', hi: 'ऑन-चेन लेनदेन इतिहास', ko: 'On-chain Transaction History'  },
  'vendor.wallet.thTxHash': { vi: 'TX Hash', en: 'TX Hash', zh: 'TX Hash', th: 'TX Hash', hi: 'TX Hash', ko: 'TX Hash'  },
  'vendor.wallet.thType': { vi: 'Loại', en: 'Type', zh: '类型', th: 'ประเภท', hi: 'प्रकार', ko: '유형'  },
  'vendor.wallet.thAmount': { vi: 'Số tiền', en: 'Amount', zh: '金额', th: 'จำนวนเงิน', hi: 'राशि', ko: '금액'  },
  'vendor.wallet.thDate': { vi: 'Ngày', en: 'Date', zh: '日期', th: 'วันที่', hi: 'तिथि', ko: '날짜'  },
  'vendor.wallet.thStatus': { vi: 'Trạng thái', en: 'Status', zh: '状态', th: 'สถานะ', hi: 'स्थिति', ko: '상태'  },

  // ── Analytics ──
  'vendor.analytics.title': { vi: 'Analytics', en: 'Analytics', zh: '数据分析', th: 'การวิเคราะห์', hi: 'एनालिटिक्स', ko: '분석'  },
  'vendor.analytics.revenueByChannel': { vi: 'DOANH THU THEO KÊNH', en: 'REVENUE BY CHANNEL', zh: '各渠道收入', th: 'รายได้ตามช่องทาง', hi: 'चैनल अनुसार राजस्व', ko: 'REVENUE BY CHANNEL'  },
  'vendor.analytics.commissionPaid': { vi: 'COMMISSION ĐÃ TRẢ', en: 'COMMISSION PAID', zh: '已支付佣金', th: 'ค่าคอมมิชชั่นที่จ่ายแล้ว', hi: 'भुगतान किया गया कमीशन', ko: 'COMMISSION PAID'  },
  'vendor.analytics.totalCommission': { vi: 'Tổng commission', en: 'Total commission', zh: '总佣金', th: 'ค่าคอมมิชชั่นรวม', hi: 'कुल कमीशन', ko: 'Total commission'  },
  'vendor.analytics.orders7d': { vi: 'ĐƠN HÀNG 7 NGÀY', en: 'ORDERS 7 DAYS', zh: '7天订单', th: 'คำสั่งซื้อ 7 วัน', hi: '7 दिनों के ऑर्डर', ko: 'ORDERS 7 DAYS'  },

  // ── Vendor KYC ──
  'vendor.kyc.title': { vi: 'Xác Minh Doanh Nghiệp', en: 'Business Verification', zh: '企业验证', th: 'ยืนยันธุรกิจ', hi: 'व्यवसाय सत्यापन', ko: '사업체 인증'  },
  'vendor.kyc.progress': { vi: 'Tiến độ xác minh', en: 'Verification Progress', zh: '验证进度', th: 'ความคืบหน้าการยืนยัน', hi: 'सत्यापन प्रगति', ko: 'Verification Progress'  },
  'vendor.kyc.steps': { vi: 'bước', en: 'steps', zh: '步', th: 'ขั้นตอน', hi: 'चरण', ko: 'steps'  },
  'vendor.kyc.warning': { vi: 'Vendor cần hoàn tất xác minh CCCD + GPKD + MST + TK ngân hàng DN (tên khớp GPKD) để bán hàng và nhận thanh toán.', en: 'Vendor must complete ID + Business License + Tax Code + Bank Account verification (name must match license) to sell and receive payments.', zh: '供应商需完成身份证+营业执照+税号+银行账户验证（名称须匹配）方可销售和收款。', th: 'Vendor ต้องยืนยัน บัตรประชาชน + ใบอนุญาตธุรกิจ + รหัสภาษี + บัญชีธนาคาร (ชื่อต้องตรงกัน) เพื่อขายและรับชำระเงิน', hi: 'वेंडर को बेचने और भुगतान प्राप्त करने के लिए आईडी + व्यवसाय लाइसेंस + टैक्स कोड + बैंक खाता सत्यापन (नाम मेल खाना चाहिए) पूरा करना होगा।', ko: 'Vendor must complete ID + Business License + Tax Code + Bank Account verification (name must match license) to sell and receive payments.'  },
  'vendor.kyc.stepIdentity': { vi: 'CCCD chủ doanh nghiệp', en: 'Business Owner ID Card', zh: '企业主身份证', th: 'บัตรประชาชนเจ้าของธุรกิจ', hi: 'व्यवसाय स्वामी पहचान पत्र', ko: 'Business Owner ID Card'  },
  'vendor.kyc.stepIdentityDesc': { vi: 'Upload CCCD mặt trước & sau của người đại diện pháp luật', en: 'Upload front & back of legal representative\'s ID card', zh: '上传法人代表身份证正反面', th: 'อัปโหลดบัตรประชาชนด้านหน้าและด้านหลังของผู้แทนตามกฎหมาย', hi: 'कानूनी प्रतिनिधि के आईडी कार्ड के आगे और पीछे अपलोड करें', ko: '법적 대리인 신분증 앞뒤를 업로드하세요' },
  'vendor.kyc.stepBusiness': { vi: 'Giấy phép kinh doanh', en: 'Business License', zh: '营业执照', th: 'ใบอนุญาตธุรกิจ', hi: 'व्यवसाय लाइसेंस', ko: 'Business License'  },
  'vendor.kyc.stepBusinessDesc': { vi: 'Upload GPKD/Giấy CNĐKKD (tên DN phải khớp tài khoản đăng ký)', en: 'Upload Business License (company name must match registered account)', zh: '上传营业执照（公司名须与注册账户一致）', th: 'อัปโหลดใบอนุญาตธุรกิจ (ชื่อบริษัทต้องตรงกับบัญชีที่ลงทะเบียน)', hi: 'व्यवसाय लाइसेंस अपलोड करें (कंपनी का नाम पंजीकृत खाते से मेल खाना चाहिए)', ko: 'Upload Business License (company name must match registered account)'  },
  'vendor.kyc.stepTax': { vi: 'Mã số thuế', en: 'Tax Code', zh: '税号', th: 'รหัสภาษี', hi: 'टैक्स कोड', ko: 'Tax Code'  },
  'vendor.kyc.stepTaxDesc': { vi: 'Nhập MST doanh nghiệp', en: 'Enter business tax code', zh: '输入企业税号', th: 'กรอกรหัสภาษีธุรกิจ', hi: 'व्यवसाय टैक्स कोड दर्ज करें', ko: 'Enter business tax code'  },
  'vendor.kyc.stepBank': { vi: 'Tài khoản ngân hàng DN', en: 'Business Bank Account', zh: '企业银行账户', th: 'บัญชีธนาคารธุรกิจ', hi: 'व्यवसाय बैंक खाता', ko: 'Business Bank Account'  },
  'vendor.kyc.stepBankDesc': { vi: 'Tên chủ TK phải khớp với tên trên GPKD', en: 'Account holder name must match Business License', zh: '账户持有人名须与营业执照一致', th: 'ชื่อเจ้าของบัญชีต้องตรงกับใบอนุญาตธุรกิจ', hi: 'खाताधारक का नाम व्यवसाय लाइसेंस से मेल खाना चाहिए', ko: 'Account holder name must match Business License'  },
  'vendor.kyc.stepComplete': { vi: 'Xác minh hoàn tất', en: 'Verification Complete', zh: '验证完成', th: 'การยืนยันเสร็จสิ้น', hi: 'सत्यापन पूर्ण', ko: 'Verification Complete'  },
  'vendor.kyc.stepCompleteDesc': { vi: 'Đủ điều kiện bán hàng & nhận thanh toán', en: 'Eligible to sell & receive payments', zh: '可销售并接收付款', th: 'มีสิทธิ์ขายและรับชำระเงิน', hi: 'बेचने और भुगतान प्राप्त करने के योग्य', ko: 'Eligible to sell & receive payments'  },
  'vendor.kyc.completed': { vi: 'Hoàn tất', en: 'Completed', zh: '已完成', th: 'เสร็จสิ้น', hi: 'पूर्ण', ko: '완료됨'  },
  'vendor.kyc.notVerified': { vi: 'Chưa xác minh', en: 'Not verified', zh: '未验证', th: 'ยังไม่ยืนยัน', hi: 'सत्यापित नहीं', ko: '미인증'  },
  'vendor.kyc.step': { vi: 'Bước', en: 'Step', zh: '步骤', th: 'ขั้นตอน', hi: 'चरण', ko: 'Step'  },
  // KYC form labels
  'vendor.kyc.idNumber': { vi: 'Số CCCD người đại diện pháp luật', en: 'Legal Representative ID Number', zh: '法人代表身份证号', th: 'เลขบัตรประชาชนผู้แทนตามกฎหมาย', hi: 'कानूनी प्रतिनिधि आईडी नंबर', ko: 'Legal Representative ID Number'  },
  'vendor.kyc.fullName': { vi: 'Họ tên (đúng trên CCCD)', en: 'Full Name (as on ID)', zh: '姓名（与身份证一致）', th: 'ชื่อ-นามสกุล (ตรงกับบัตรประชาชน)', hi: 'पूरा नाम (आईडी के अनुसार)', ko: 'Full Name (as on ID)'  },
  'vendor.kyc.frontPhoto': { vi: 'Ảnh mặt trước CCCD', en: 'ID Card Front Photo', zh: '身份证正面照', th: 'รูปด้านหน้าบัตรประชาชน', hi: 'आईडी कार्ड सामने की फ़ोटो', ko: 'ID Card Front Photo'  },
  'vendor.kyc.backPhoto': { vi: 'Ảnh mặt sau CCCD', en: 'ID Card Back Photo', zh: '身份证反面照', th: 'รูปด้านหลังบัตรประชาชน', hi: 'आईडी कार्ड पीछे की फ़ोटो', ko: 'ID Card Back Photo'  },
  'vendor.kyc.dragOrClick': { vi: 'Kéo thả hoặc click', en: 'Drag & drop or click', zh: '拖拽或点击', th: 'ลากและวางหรือคลิก', hi: 'ड्रैग और ड्रॉप या क्लिक करें', ko: 'Drag & drop or click'  },
  'vendor.kyc.submitVerify': { vi: 'Gửi xác minh', en: 'Submit Verification', zh: '提交验证', th: 'ส่งการยืนยัน', hi: 'सत्यापन जमा करें', ko: 'Submit Verification'  },
  'vendor.kyc.businessNameOnLicense': { vi: 'Tên doanh nghiệp (trên GPKD)', en: 'Business Name (on License)', zh: '企业名称（营业执照上）', th: 'ชื่อธุรกิจ (บนใบอนุญาต)', hi: 'व्यवसाय का नाम (लाइसेंस पर)', ko: 'Business Name (on License)'  },
  'vendor.kyc.businessLicenseNo': { vi: 'Số GPKD / CNĐKKD', en: 'Business License Number', zh: '营业执照号码', th: 'เลขที่ใบอนุญาตธุรกิจ', hi: 'व्यवसाय लाइसेंस नंबर', ko: 'Business License Number'  },
  'vendor.kyc.uploadLicense': { vi: 'Upload Giấy phép kinh doanh (PDF/ảnh)', en: 'Upload Business License (PDF/image)', zh: '上传营业执照 (PDF/图片)', th: 'อัปโหลดใบอนุญาตธุรกิจ (PDF/รูปภาพ)', hi: 'व्यवसाय लाइसेंस अपलोड करें (PDF/छवि)', ko: 'Upload Business License (PDF/image)'  },
  'vendor.kyc.dragUploadLicense': { vi: 'Kéo thả hoặc click để upload GPKD', en: 'Drag & drop or click to upload license', zh: '拖拽或点击上传营业执照', th: 'ลากวางหรือคลิกเพื่ออัปโหลดใบอนุญาต', hi: 'लाइसेंस अपलोड करने के लिए ड्रैग या क्लिक करें', ko: 'Drag & drop or click to upload license'  },
  'vendor.kyc.fileFormats': { vi: 'PDF, JPG, PNG (tối đa 10MB)', en: 'PDF, JPG, PNG (max 10MB)', zh: 'PDF, JPG, PNG (最大10MB)', th: 'PDF, JPG, PNG (สูงสุด 10MB)', hi: 'PDF, JPG, PNG (अधिकतम 10MB)', ko: 'PDF, JPG, PNG (max 10MB)'  },
  'vendor.kyc.submitLicense': { vi: 'Gửi xác minh GPKD', en: 'Submit License Verification', zh: '提交营业执照验证', th: 'ส่งการยืนยันใบอนุญาต', hi: 'लाइसेंस सत्यापन जमा करें', ko: 'Submit License Verification'  },
  'vendor.kyc.businessNameMatch': { vi: 'Tên doanh nghiệp trên GPKD phải khớp với tên tài khoản đăng ký trên WellKOC.', en: 'Business name on license must match the registered account name on WellKOC.', zh: '营业执照上的企业名称须与WellKOC注册账户名一致。', th: 'ชื่อธุรกิจบนใบอนุญาตต้องตรงกับชื่อบัญชีที่ลงทะเบียนบน WellKOC', hi: 'लाइसेंस पर व्यवसाय का नाम WellKOC पर पंजीकृत खाते के नाम से मेल खाना चाहिए।', ko: 'Business name on license must match the registered account name on WellKOC.'  },
  'vendor.kyc.taxCode': { vi: 'Mã số thuế doanh nghiệp', en: 'Business Tax Code', zh: '企业税号', th: 'รหัสภาษีธุรกิจ', hi: 'व्यवसाय टैक्स कोड', ko: 'Business Tax Code'  },
  'vendor.kyc.businessAddress': { vi: 'Địa chỉ đăng ký kinh doanh', en: 'Registered Business Address', zh: '注册营业地址', th: 'ที่อยู่จดทะเบียนธุรกิจ', hi: 'पंजीकृत व्यावसायिक पता', ko: 'Registered Business Address'  },
  'vendor.kyc.verifyTax': { vi: 'Xác minh MST', en: 'Verify Tax Code', zh: '验证税号', th: 'ยืนยันรหัสภาษี', hi: 'टैक्स कोड सत्यापित करें', ko: 'Verify Tax Code'  },
  'vendor.kyc.bankNameMatch': { vi: 'Tên chủ tài khoản ngân hàng phải khớp chính xác với tên doanh nghiệp trên GPKD.', en: 'Bank account holder name must exactly match business name on license.', zh: '银行账户持有人名须与营业执照上的企业名完全一致。', th: 'ชื่อเจ้าของบัญชีธนาคารต้องตรงกับชื่อธุรกิจบนใบอนุญาตทุกประการ', hi: 'बैंक खाताधारक का नाम लाइसेंस पर व्यवसाय के नाम से बिल्कुल मेल खाना चाहिए।', ko: 'Bank account holder name must exactly match business name on license.'  },
  'vendor.kyc.bankName': { vi: 'Ngân hàng', en: 'Bank', zh: '银行', th: 'ธนาคาร', hi: 'बैंक', ko: 'Bank'  },
  'vendor.kyc.selectBank': { vi: '-- Chọn ngân hàng --', en: '-- Select bank --', zh: '-- 选择银行 --', th: '-- เลือกธนาคาร --', hi: '-- बैंक चुनें --', ko: '-- Select bank --'  },
  'vendor.kyc.bankAccountNumber': { vi: 'Số tài khoản doanh nghiệp', en: 'Business Account Number', zh: '企业账号', th: 'เลขบัญชีธุรกิจ', hi: 'व्यवसाय खाता नंबर', ko: 'Business Account Number'  },
  'vendor.kyc.bankAccountHolder': { vi: 'Tên chủ tài khoản (phải khớp tên DN trên GPKD)', en: 'Account Holder Name (must match business name on license)', zh: '账户持有人名（须与营业执照上的企业名一致）', th: 'ชื่อเจ้าของบัญชี (ต้องตรงกับชื่อธุรกิจบนใบอนุญาต)', hi: 'खाताधारक का नाम (लाइसेंस पर व्यवसाय के नाम से मेल खाना चाहिए)', ko: 'Account Holder Name (must match business name on license)'  },
  'vendor.kyc.verifyBank': { vi: 'Xác minh tài khoản', en: 'Verify Account', zh: '验证账户', th: 'ยืนยันบัญชี', hi: 'खाता सत्यापित करें', ko: 'Verify Account'  },

  // ── Settings page ──
  'vendor.settingsPage.title': { vi: 'Cài Đặt', en: 'Settings', zh: '设置', th: 'การตั้งค่า', hi: 'सेटिंग्स', ko: '설정'  },
  'vendor.settingsPage.updateBtn': { vi: 'Cập nhật', en: 'Update', zh: '更新', th: 'อัปเดต', hi: 'अपडेट', ko: '업데이트'  },

  // ── Toast messages ──
  'vendor.toast.productAdded': { vi: 'Đã thêm sản phẩm', en: 'Product added', zh: '已添加产品', th: 'เพิ่มสินค้าแล้ว', hi: 'उत्पाद जोड़ा गया', ko: 'Product added'  },
  'vendor.toast.productDeleted': { vi: 'Đã xoá sản phẩm', en: 'Product deleted', zh: '已删除产品', th: 'ลบสินค้าแล้ว', hi: 'उत्पाद हटाया गया', ko: 'Product deleted'  },
  'vendor.toast.productShown': { vi: 'Đã hiện sản phẩm', en: 'Product shown', zh: '已显示产品', th: 'แสดงสินค้าแล้ว', hi: 'उत्पाद दिखाया गया', ko: 'Product shown'  },
  'vendor.toast.productHidden': { vi: 'Đã ẩn sản phẩm', en: 'Product hidden', zh: '已隐藏产品', th: 'ซ่อนสินค้าแล้ว', hi: 'उत्पाद छिपाया गया', ko: 'Product hidden'  },
  'vendor.toast.productUpdated': { vi: 'Đã cập nhật sản phẩm', en: 'Product updated', zh: '已更新产品', th: 'อัปเดตสินค้าแล้ว', hi: 'उत्पाद अपडेट किया गया', ko: 'Product updated'  },
  'vendor.toast.enterProductName': { vi: 'Vui lòng nhập tên sản phẩm', en: 'Please enter product name', zh: '请输入产品名称', th: 'กรุณากรอกชื่อสินค้า', hi: 'कृपया उत्पाद का नाम दर्ज करें', ko: 'Please enter product name'  },
  'vendor.toast.orderUpdate': { vi: 'Cập nhật', en: 'Updated', zh: '已更新', th: 'อัปเดตแล้ว', hi: 'अपडेट किया गया', ko: '업데이트됨'  },
  'vendor.toast.dppMinted': { vi: 'Đã mint DPP cho', en: 'DPP minted for', zh: '已为以下产品铸造DPP', th: 'Mint DPP แล้วสำหรับ', hi: 'DPP मिंट किया गया', ko: 'DPP minted for'  },
  'vendor.toast.invalidAmount': { vi: 'Số tiền không hợp lệ', en: 'Invalid amount', zh: '金额无效', th: 'จำนวนเงินไม่ถูกต้อง', hi: 'अमान्य राशि', ko: 'Invalid amount'  },
  'vendor.toast.withdrawn': { vi: 'Đã rút', en: 'Withdrawn', zh: '已提现', th: 'ถอนแล้ว', hi: 'निकासी की गई', ko: 'Withdrawn'  },
  'vendor.toast.toBank': { vi: 'về ngân hàng', en: 'to bank', zh: '到银行', th: 'เข้าธนาคาร', hi: 'बैंक में', ko: 'to bank'  },
  'vendor.toast.copied': { vi: 'Đã sao chép', en: 'Copied', zh: '已复制', th: 'คัดลอกแล้ว', hi: 'कॉपी किया गया', ko: 'Copied'  },
  'vendor.toast.settingsSaved': { vi: 'Đã lưu cài đặt', en: 'Settings saved', zh: '设置已保存', th: 'บันทึกการตั้งค่าแล้ว', hi: 'सेटिंग्स सहेजी गईं', ko: 'Settings saved'  },
  'vendor.toast.imageUploaded': { vi: 'Đã upload ảnh chính', en: 'Main image uploaded', zh: '已上传主图', th: 'อัปโหลดรูปภาพหลักแล้ว', hi: 'मुख्य छवि अपलोड की गई', ko: 'Main image uploaded'  },
  'vendor.toast.imageNUploaded': { vi: 'Đã upload', en: 'Uploaded', zh: '已上传', th: 'อัปโหลดแล้ว', hi: 'अपलोड किया गया', ko: 'Uploaded'  },
  'vendor.toast.imageNSuccess': { vi: 'thành công', en: 'successfully', zh: '成功', th: 'สำเร็จ', hi: 'सफलतापूर्वक', ko: 'successfully'  },
  'vendor.toast.selectWithdrawAmount': { vi: 'Chọn số tiền để rút về ngân hàng', en: 'Select amount to withdraw to bank', zh: '选择提现金额', th: 'เลือกจำนวนเงินที่จะถอนเข้าธนาคาร', hi: 'बैंक में निकासी के लिए राशि चुनें', ko: 'Select amount to withdraw to bank'  },
  'vendor.toast.connectingBlockchain': { vi: 'Đang kết nối blockchain để chuyển token...', en: 'Connecting to blockchain to transfer token...', zh: '正在连接区块链以转移代币...', th: 'กำลังเชื่อมต่อบล็อกเชนเพื่อโอนโทเค็น...', hi: 'टोकन ट्रांसफ़र के लिए ब्लॉकचेन से कनेक्ट हो रहा है...', ko: 'Connecting to blockchain to transfer token...'  },
  'vendor.toast.cccdSubmitted': { vi: 'Đã gửi CCCD để xác minh. Chờ admin duyệt (1-2 ngày)', en: 'ID submitted for verification. Awaiting admin approval (1-2 days)', zh: '已提交身份证验证。等待管理员审核 (1-2天)', th: 'ส่งบัตรประชาชนเพื่อยืนยันแล้ว รอแอดมินอนุมัติ (1-2 วัน)', hi: 'आईडी सत्यापन के लिए जमा किया गया। एडमिन अनुमोदन की प्रतीक्षा (1-2 दिन)', ko: 'ID submitted for verification. Awaiting admin approval (1-2 days)'  },
  'vendor.toast.licenseSubmitted': { vi: 'Đã gửi GPKD/CNĐKKD để xác minh thành công', en: 'Business license submitted for verification successfully', zh: '营业执照已成功提交验证', th: 'ส่งใบอนุญาตธุรกิจเพื่อยืนยันสำเร็จแล้ว', hi: 'व्यवसाय लाइसेंस सत्यापन के लिए सफलतापूर्वक जमा किया गया', ko: 'Business license submitted for verification successfully'  },
  'vendor.toast.taxVerified': { vi: 'Đã xác minh mã số thuế thành công!', en: 'Tax code verified successfully!', zh: '税号验证成功！', th: 'ยืนยันรหัสภาษีสำเร็จแล้ว!', hi: 'टैक्स कोड सफलतापूर्वक सत्यापित!', ko: 'Tax code verified successfully!'  },
  'vendor.toast.bankSubmitted': { vi: 'Đã gửi xác minh tài khoản ngân hàng doanh nghiệp!', en: 'Business bank account verification submitted!', zh: '企业银行账户验证已提交！', th: 'ส่งการยืนยันบัญชีธนาคารธุรกิจแล้ว!', hi: 'व्यवसाय बैंक खाता सत्यापन जमा किया गया!', ko: 'Business bank account verification submitted!'  },

  /* ══════════════════════════════════════════════════════
     DPP PAGE
     ══════════════════════════════════════════════════════ */
  'dpp.header.subtitle': { vi: 'Chứng nhận nguồn gốc sản phẩm trên blockchain. Minh bạch, bất biến, xác minh bởi ZKP.', en: 'Product origin certification on blockchain. Transparent, immutable, verified by ZKP.', zh: '区块链上的产品溯源认证。透明、不可篡改、ZKP验证。', th: 'ใบรับรองแหล่งกำเนิดสินค้าบนบล็อกเชน โปร่งใส ไม่เปลี่ยนแปลง ยืนยันด้วย ZKP', hi: 'ब्लॉकचेन पर उत्पाद मूल प्रमाणन। पारदर्शी, अपरिवर्तनीय, ZKP द्वारा सत्यापित।', ko: 'Product origin certification on blockchain. Transparent, immutable, verified by ZKP.'  },

  // Product passport labels
  'dpp.passport.brand': { vi: 'Thương hiệu', en: 'Brand', zh: '品牌', th: 'แบรนด์', hi: 'ब्रांड', ko: 'Brand'  },
  'dpp.passport.origin': { vi: 'Xuất xứ', en: 'Origin', zh: '产地', th: 'แหล่งกำเนิด', hi: 'मूल', ko: 'Origin'  },
  'dpp.passport.category': { vi: 'Danh mục', en: 'Category', zh: '分类', th: 'หมวดหมู่', hi: 'श्रेणी', ko: '카테고리'  },
  'dpp.passport.categoryValue': { vi: 'Thực phẩm & Đồ uống', en: 'Food & Beverages', zh: '食品与饮料', th: 'อาหารและเครื่องดื่ม', hi: 'खाद्य और पेय', ko: '식품 및 음료'  },
  'dpp.passport.originValue': { vi: 'Đài Loan', en: 'Taiwan', zh: '台湾', th: 'ไต้หวัน', hi: 'ताइवान', ko: 'Taiwan'  },
  'dpp.passport.blockchainInfo': { vi: 'THÔNG TIN BLOCKCHAIN', en: 'BLOCKCHAIN INFO', zh: '区块链信息', th: 'ข้อมูลบล็อกเชน', hi: 'ब्लॉकचेन जानकारी', ko: 'BLOCKCHAIN INFO'  },
  'dpp.passport.mintDate': { vi: 'Ngày Mint', en: 'Mint Date', zh: '铸造日期', th: 'วันที่ Mint', hi: 'मिंट तिथि', ko: 'Mint Date'  },

  // Supply chain
  'dpp.supply.title': { vi: 'Hành Trình Sản Phẩm', en: 'Product Journey', zh: '产品旅程', th: 'เส้นทางสินค้า', hi: 'उत्पाद यात्रा', ko: 'Product Journey'  },
  'dpp.supply.step': { vi: 'BƯỚC', en: 'STEP', zh: '步骤', th: 'ขั้นตอน', hi: 'चरण', ko: 'STEP'  },

  // Supply chain step titles
  'dpp.step1.title': { vi: 'Thu hoạch', en: 'Harvest', zh: '采收', th: 'เก็บเกี่ยว', hi: 'कटाई', ko: 'Harvest'  },
  'dpp.step1.desc': { vi: 'Lá trà được thu hoạch thủ công từ vườn ở độ cao 1,200m tại Ali Shan.', en: 'Tea leaves hand-harvested from gardens at 1,200m altitude in Ali Shan.', zh: '茶叶从阿里山海拔1200米的茶园手工采摘。', th: 'ใบชาเก็บเกี่ยวด้วยมือจากสวนที่ระดับความสูง 1,200 เมตร ที่อาลีซาน', hi: 'अली शान में 1,200 मीटर की ऊंचाई पर बगीचों से हाथ से चाय की पत्तियां तोड़ी गईं।', ko: 'Tea leaves hand-harvested from gardens at 1,200m altitude in Ali Shan.'  },
  'dpp.step2.title': { vi: 'Chế biến', en: 'Processing', zh: '加工', th: 'การแปรรูป', hi: 'प्रसंस्करण', ko: '처리 중'  },
  'dpp.step2.desc': { vi: 'Ôxi hóa nhẹ 15-20%, sấy ở nhiệt độ kiểm soát. Chứng nhận HACCP.', en: 'Light oxidation 15-20%, dried at controlled temperature. HACCP certified.', zh: '轻度氧化15-20%，控温干燥。HACCP认证。', th: 'ออกซิเดชันเบา 15-20% อบแห้งที่อุณหภูมิควบคุม ได้รับ HACCP', hi: 'हल्का ऑक्सीकरण 15-20%, नियंत्रित तापमान पर सुखाया गया। HACCP प्रमाणित।', ko: 'Light oxidation 15-20%, dried at controlled temperature. HACCP certified.'  },
  'dpp.step3.title': { vi: 'Kiểm định chất lượng', en: 'Quality Inspection', zh: '质量检测', th: 'ตรวจสอบคุณภาพ', hi: 'गुणवत्ता निरीक्षण', ko: 'Quality Inspection'  },
  'dpp.step3.desc': { vi: 'Kiểm tra 127 chỉ tiêu an toàn thực phẩm. Không phát hiện dư lượng hóa chất.', en: 'Tested 127 food safety parameters. No chemical residues detected.', zh: '检测127项食品安全指标。未检出化学残留。', th: 'ตรวจสอบ 127 ตัวชี้วัดความปลอดภัยอาหาร ไม่พบสารเคมีตกค้าง', hi: '127 खाद्य सुरक्षा मापदंडों का परीक्षण। कोई रासायनिक अवशेष नहीं पाया गया।', ko: 'Tested 127 food safety parameters. No chemical residues detected.'  },
  'dpp.step4.title': { vi: 'Vận chuyển', en: 'Shipping', zh: '运输', th: 'การขนส่ง', hi: 'शिपिंग', ko: '배송'  },
  'dpp.step4.desc': { vi: 'Container lạnh 18°C, GPS tracking toàn trình. Thời gian transit: 5 ngày.', en: 'Refrigerated container 18°C, full GPS tracking. Transit time: 5 days.', zh: '18°C冷藏集装箱，全程GPS追踪。运输时间：5天。', th: 'ตู้คอนเทนเนอร์เย็น 18°C ติดตาม GPS ตลอดทาง เวลาขนส่ง: 5 วัน', hi: 'रेफ्रिजरेटेड कंटेनर 18°C, पूर्ण GPS ट्रैकिंग। ट्रांज़िट समय: 5 दिन।', ko: 'Refrigerated container 18°C, full GPS tracking. Transit time: 5 days.'  },
  'dpp.step5.title': { vi: 'Nhập kho WellKOC', en: 'WellKOC Warehouse', zh: 'WellKOC入库', th: 'เข้าคลัง WellKOC', hi: 'WellKOC वेयरहाउस', ko: 'WellKOC Warehouse'  },
  'dpp.step5.desc': { vi: 'Nhập kho với điều kiện bảo quản chuẩn. Mã lô: LOT-2025-TW-089.', en: 'Warehoused under standard storage conditions. Lot: LOT-2025-TW-089.', zh: '标准仓储条件入库。批次号：LOT-2025-TW-089。', th: 'เข้าคลังภายใต้สภาพการจัดเก็บมาตรฐาน Lot: LOT-2025-TW-089', hi: 'मानक भंडारण शर्तों में वेयरहाउस किया गया। लॉट: LOT-2025-TW-089।', ko: 'Warehoused under standard storage conditions. Lot: LOT-2025-TW-089.'  },
  'dpp.step6.title': { vi: 'Mint DPP NFT', en: 'Mint DPP NFT', zh: '铸造DPP NFT', th: 'Mint DPP NFT', hi: 'DPP NFT मिंट', ko: 'Mint DPP NFT'  },
  'dpp.step6.desc': { vi: 'Digital Product Passport được mint trên Polygon. ZKP proof được tạo.', en: 'Digital Product Passport minted on Polygon. ZKP proof generated.', zh: '数字产品护照在Polygon上铸造。已生成ZKP证明。', th: 'Digital Product Passport ถูก Mint บน Polygon สร้าง ZKP proof แล้ว', hi: 'Polygon पर Digital Product Passport मिंट किया गया। ZKP प्रूफ़ जनरेट किया गया।', ko: 'Digital Product Passport minted on Polygon. ZKP proof generated.'  },

  // ZKP section
  'dpp.zkp.title': { vi: 'Xác Minh Không Tiết Lộ', en: 'Zero-Knowledge Verification', zh: '零知识验证', th: 'การยืนยันแบบ Zero-Knowledge', hi: 'शून्य-ज्ञान सत्यापन', ko: 'Zero-Knowledge Verification'  },
  'dpp.zkp.desc': { vi: 'ZKP cho phép xác minh nguồn gốc sản phẩm mà không cần tiết lộ thông tin nhạy cảm của nhà cung cấp hay quy trình sản xuất.', en: 'ZKP allows verifying product origin without revealing sensitive supplier or manufacturing process information.', zh: 'ZKP允许在不泄露供应商或生产流程敏感信息的情况下验证产品来源。', th: 'ZKP ช่วยยืนยันแหล่งกำเนิดสินค้าโดยไม่ต้องเปิดเผยข้อมูลที่ละเอียดอ่อนของซัพพลายเออร์หรือกระบวนการผลิต', hi: 'ZKP आपूर्तिकर्ता या विनिर्माण प्रक्रिया की संवेदनशील जानकारी बताए बिना उत्पाद मूल को सत्यापित करने की अनुमति देता है।', ko: 'ZKP allows verifying product origin without revealing sensitive supplier or manufacturing process information.'  },
  'dpp.zkp.hideBtn': { vi: 'Ẩn chi tiết ZKP', en: 'Hide ZKP Details', zh: '隐藏ZKP详情', th: 'ซ่อนรายละเอียด ZKP', hi: 'ZKP विवरण छिपाएं', ko: 'Hide ZKP Details'  },
  'dpp.zkp.verifyBtn': { vi: 'Xác minh ZKP', en: 'Verify ZKP', zh: '验证ZKP', th: 'ยืนยัน ZKP', hi: 'ZKP सत्यापित करें', ko: 'Verify ZKP'  },

  // ZKP claims
  'dpp.zkp.claim1': { vi: 'Nguồn gốc hợp lệ', en: 'Valid origin', zh: '来源合法', th: 'แหล่งกำเนิดถูกต้อง', hi: 'वैध मूल', ko: 'Valid origin'  },
  'dpp.zkp.claim2': { vi: 'Chứng nhận Organic', en: 'Organic Certified', zh: '有机认证', th: 'ได้รับรองออร์แกนิก', hi: 'ऑर्गेनिक प्रमाणित', ko: 'Organic Certified'  },
  'dpp.zkp.claim3': { vi: 'Chuỗi cung ứng liên tục', en: 'Continuous supply chain', zh: '供应链连续', th: 'ห่วงโซ่อุปทานต่อเนื่อง', hi: 'निरंतर आपूर्ति श्रृंखला', ko: 'Continuous supply chain'  },
  'dpp.zkp.claim4': { vi: 'Không biến đổi gen (Non-GMO)', en: 'Non-GMO', zh: '非转基因', th: 'ไม่ดัดแปลงพันธุกรรม (Non-GMO)', hi: 'गैर-GMO', ko: 'Non-GMO'  },
  'dpp.zkp.claim5': { vi: 'Nhiệt độ bảo quản đạt chuẩn', en: 'Storage temperature meets standard', zh: '存储温度达标', th: 'อุณหภูมิจัดเก็บได้มาตรฐาน', hi: 'भंडारण तापमान मानक के अनुसार', ko: 'Storage temperature meets standard'  },

  /* ══════════════════════════════════════════════════════
     PRICING PAGE
     ══════════════════════════════════════════════════════ */
  // Hero
  'pricing.hero.title': { vi: '333 AI Agents — Workflow tự động hóa', en: '333 AI Agents — Workflow Automation', zh: '333 AI Agents — 工作流自动化', th: '333 AI Agents — เวิร์กโฟลว์อัตโนมัติ', hi: '333 AI Agents — वर्कफ़्लो ऑटोमेशन', ko: '333 AI Agents — Workflow Automation'  },
  'pricing.hero.subtitle': { vi: 'Từ miễn phí đến doanh nghiệp. Agent Workflow Automation giúp bạn tự động hóa mọi quy trình — on-chain, minh bạch.', en: 'From free to enterprise. Agent Workflow Automation helps you automate every process — on-chain, transparent.', zh: '从免费到企业版。Agent Workflow Automation帮助您自动化所有流程 — 链上、透明。', th: 'จากฟรีถึงองค์กร Agent Workflow Automation ช่วยให้คุณอัตโนมัติทุกกระบวนการ — on-chain โปร่งใส', hi: 'मुफ़्त से एंटरप्राइज़ तक। Agent Workflow Automation हर प्रक्रिया को स्वचालित करता है — ऑन-चेन, पारदर्शी।', ko: 'From free to enterprise. Agent Workflow Automation helps you automate every process — on-chain, transparent.'  },
  'pricing.billing.monthly': { vi: 'Hàng tháng', en: 'Monthly', zh: '月付', th: 'รายเดือน', hi: 'मासिक', ko: '월별'  },
  'pricing.billing.yearly': { vi: 'Hàng năm', en: 'Yearly', zh: '年付', th: 'รายปี', hi: 'वार्षिक', ko: '연별'  },

  // Tabs
  'pricing.tab.buyer': { vi: 'Người mua', en: 'Buyer', zh: '买家', th: 'ผู้ซื้อ', hi: 'खरीदार', ko: '구매자'  },
  'pricing.tab.koc': { vi: 'KOC / KOL', en: 'KOC / KOL', zh: 'KOC / KOL', th: 'KOC / KOL', hi: 'KOC / KOL', ko: 'KOC / KOL'  },
  'pricing.tab.vendor': { vi: 'Vendor', en: 'Vendor', zh: '供应商', th: 'ผู้ขาย', hi: 'वेंडर', ko: 'Vendor'  },

  // Price labels
  'pricing.contactUs': { vi: 'Liên hệ', en: 'Contact Us', zh: '联系我们', th: 'ติดต่อเรา', hi: 'संपर्क करें', ko: 'Contact Us'  },
  'pricing.designByNeed': { vi: 'Thiết kế theo nhu cầu', en: 'Designed for your needs', zh: '按需定制', th: 'ออกแบบตามความต้องการ', hi: 'आपकी ज़रूरतों के अनुसार', ko: 'Designed for your needs'  },
  'pricing.free': { vi: 'Miễn phí', en: 'Free', zh: '免费', th: 'ฟรี', hi: 'मुफ़्त', ko: '무료'  },
  'pricing.perMonth': { vi: '/tháng', en: '/month', zh: '/月', th: '/เดือน', hi: '/माह', ko: '/month'  },
  'pricing.perYear': { vi: '/năm', en: '/year', zh: '/年', th: '/ปี', hi: '/वर्ष', ko: '/year'  },
  'pricing.save': { vi: 'tiết kiệm', en: 'save', zh: '节省', th: 'ประหยัด', hi: 'बचत', ko: 'save'  },
  'pricing.popular': { vi: 'Phổ biến nhất', en: 'Most Popular', zh: '最受欢迎', th: 'นิยมมากที่สุด', hi: 'सबसे लोकप्रिय', ko: 'Most Popular'  },
  'pricing.customDesign': { vi: 'Thiết kế riêng', en: 'Custom Design', zh: '定制设计', th: 'ออกแบบเฉพาะ', hi: 'कस्टम डिज़ाइन', ko: 'Custom Design'  },

  // CTA buttons
  'pricing.cta.startFree': { vi: 'Bắt đầu miễn phí', en: 'Start for Free', zh: '免费开始', th: 'เริ่มต้นฟรี', hi: 'मुफ़्त शुरू करें', ko: 'Start for Free'  },
  'pricing.cta.upgradeVip': { vi: 'Nâng cấp VIP', en: 'Upgrade to VIP', zh: '升级VIP', th: 'อัปเกรดเป็น VIP', hi: 'VIP में अपग्रेड करें', ko: 'Upgrade to VIP'  },
  'pricing.cta.designCustom': { vi: 'Thiết kế gói riêng', en: 'Design Custom Plan', zh: '定制专属方案', th: 'ออกแบบแพ็กเกจเฉพาะ', hi: 'कस्टम प्लान डिज़ाइन करें', ko: 'Design Custom Plan'  },
  'pricing.cta.upgradePro': { vi: 'Nâng cấp Pro', en: 'Upgrade to Pro', zh: '升级Pro', th: 'อัปเกรดเป็น Pro', hi: 'Pro में अपग्रेड करें', ko: 'Upgrade to Pro'  },
  'pricing.cta.chooseBusiness': { vi: 'Chọn Business', en: 'Choose Business', zh: '选择Business', th: 'เลือก Business', hi: 'Business चुनें', ko: 'Choose Business'  },
  'pricing.cta.chooseGrowth': { vi: 'Chọn Growth', en: 'Choose Growth', zh: '选择Growth', th: 'เลือก Growth', hi: 'Growth चुनें', ko: 'Choose Growth'  },
  'pricing.cta.chooseScale': { vi: 'Chọn Scale', en: 'Choose Scale', zh: '选择Scale', th: 'เลือก Scale', hi: 'Scale चुनें', ko: 'Choose Scale'  },

  // Comparison table
  'pricing.comparison.show': { vi: 'Xem bảng so sánh chi tiết', en: 'View detailed comparison', zh: '查看详细对比', th: 'ดูตารางเปรียบเทียบโดยละเอียด', hi: 'विस्तृत तुलना देखें', ko: 'View detailed comparison'  },
  'pricing.comparison.hide': { vi: 'Ẩn bảng so sánh', en: 'Hide comparison', zh: '隐藏对比表', th: 'ซ่อนตารางเปรียบเทียบ', hi: 'तुलना छिपाएं', ko: 'Hide comparison'  },
  'pricing.comparison.feature': { vi: 'Tính năng', en: 'Feature', zh: '功能', th: 'ฟีเจอร์', hi: 'सुविधा', ko: 'Feature'  },

  // Comparison table labels (buyer)
  'pricing.compare.shopping': { vi: 'Mua sắm', en: 'Shopping', zh: '购物', th: 'ช้อปปิ้ง', hi: 'शॉपिंग', ko: 'Shopping'  },
  'pricing.compare.xpPerOrder': { vi: 'XP mỗi đơn', en: 'XP per order', zh: '每单XP', th: 'XP ต่อคำสั่งซื้อ', hi: 'प्रति ऑर्डर XP', ko: 'XP per order'  },
  'pricing.compare.monthlyVoucher': { vi: 'Voucher hàng tháng', en: 'Monthly voucher', zh: '每月优惠券', th: 'บัตรกำนัลรายเดือน', hi: 'मासिक वाउचर', ko: 'Monthly voucher'  },
  'pricing.compare.flashSalePriority': { vi: 'Ưu tiên flash sale', en: 'Flash sale priority', zh: '闪购优先', th: 'ลำดับความสำคัญ Flash Sale', hi: 'फ्लैश सेल प्राथमिकता', ko: 'Flash sale priority'  },
  'pricing.compare.freeShip': { vi: 'Free ship', en: 'Free shipping', zh: '免运费', th: 'ส่งฟรี', hi: 'मुफ़्त शिपिंग', ko: '무료 배송'  },
  'pricing.compare.cashback': { vi: 'Hoàn xu', en: 'Cashback', zh: '返现', th: 'เงินคืน', hi: 'कैशबैक', ko: 'Cashback'  },
  'pricing.compare.support': { vi: 'Hỗ trợ', en: 'Support', zh: '支持', th: 'การสนับสนุน', hi: 'सहायता', ko: '지원'  },

  // Comparison table labels (KOC)
  'pricing.compare.contentAI': { vi: 'Content AI', en: 'Content AI', zh: '内容AI', th: 'Content AI', hi: 'Content AI', ko: 'Content AI'  },
  'pricing.compare.autoMarketing': { vi: 'Auto Marketing', en: 'Auto Marketing', zh: '自动营销', th: 'การตลาดอัตโนมัติ', hi: 'ऑटो मार्केटिंग', ko: '자동 마케팅'  },
  'pricing.compare.affiliateTiers': { vi: 'Affiliate tiers', en: 'Affiliate tiers', zh: '联盟层级', th: 'ระดับ Affiliate', hi: 'Affiliate स्तर', ko: 'Affiliate tiers'  },
  'pricing.compare.bonusCommission': { vi: 'Bonus commission', en: 'Bonus commission', zh: '奖励佣金', th: 'โบนัสค่าคอมมิชชั่น', hi: 'बोनस कमीशन', ko: 'Bonus commission'  },
  'pricing.compare.creatorToken': { vi: 'Creator Token', en: 'Creator Token', zh: '创作者代币', th: 'โทเค็นผู้สร้าง', hi: 'क्रिएटर टोकन', ko: '크리에이터 토큰'  },
  'pricing.compare.liveCommerce': { vi: 'Live Commerce', en: 'Live Commerce', zh: '直播电商', th: 'Live Commerce', hi: 'लाइव कॉमर्स', ko: '라이브 커머스'  },

  // Comparison table labels (Vendor)
  'pricing.compare.products': { vi: 'Sản phẩm', en: 'Products', zh: '产品', th: 'สินค้า', hi: 'उत्पाद', ko: '제품'  },
  'pricing.compare.dppMint': { vi: 'DPP Mint / tháng', en: 'DPP Mint / month', zh: 'DPP铸造/月', th: 'DPP Mint / เดือน', hi: 'DPP Mint / माह', ko: 'DPP Mint / month'  },
  'pricing.compare.commissionRules': { vi: 'Commission rules', en: 'Commission rules', zh: '佣金规则', th: 'กฎค่าคอมมิชชั่น', hi: 'कमीशन नियम', ko: 'Commission rules'  },
  'pricing.compare.apiAccess': { vi: 'API access', en: 'API access', zh: 'API访问', th: 'การเข้าถึง API', hi: 'API एक्सेस', ko: 'API access'  },
  'pricing.compare.transactionFee': { vi: 'Transaction fee', en: 'Transaction fee', zh: '交易费', th: 'ค่าธรรมเนียมธุรกรรม', hi: 'लेनदेन शुल्क', ko: 'Transaction fee'  },

  // Comparison value translations
  'pricing.val.custom': { vi: 'Tùy chỉnh', en: 'Custom', zh: '自定义', th: 'กำหนดเอง', hi: 'कस्टम', ko: 'Custom'  },
  'pricing.val.customByIndustry': { vi: 'Tùy chỉnh theo ngành', en: 'Custom by industry', zh: '按行业定制', th: 'กำหนดเองตามอุตสาหกรรม', hi: 'उद्योग के अनुसार कस्टम', ko: 'Custom by industry'  },
  'pricing.val.upTo333': { vi: 'Đến 333', en: 'Up to 333', zh: '最多333', th: 'สูงสุด 333', hi: '333 तक', ko: 'Up to 333'  },
  'pricing.val.basic': { vi: 'Cơ bản', en: 'Basic', zh: '基础', th: 'พื้นฐาน', hi: 'बेसिक', ko: 'Basic'  },
  'pricing.val.noLimit': { vi: 'Không giới hạn', en: 'Unlimited', zh: '无限制', th: 'ไม่จำกัด', hi: 'असीमित', ko: 'Unlimited'  },
  'pricing.val.standard': { vi: 'Tiêu chuẩn', en: 'Standard', zh: '标准', th: 'มาตรฐาน', hi: 'मानक', ko: 'Standard'  },
  'pricing.val.priority247': { vi: 'Ưu tiên 24/7', en: 'Priority 24/7', zh: '24/7优先', th: 'ลำดับความสำคัญ 24/7', hi: 'प्राथमिकता 24/7', ko: 'Priority 24/7'  },
  'pricing.val.personalised': { vi: 'Cá nhân hóa', en: 'Personalized', zh: '个性化', th: 'ส่วนบุคคล', hi: 'व्यक्तिगत', ko: 'Personalized'  },
  'pricing.val.early30min': { vi: 'Sớm 30 phút', en: '30 min early', zh: '提前30分钟', th: 'ก่อน 30 นาที', hi: '30 मिनट पहले', ko: '30 min early'  },
  'pricing.val.allFlashSales': { vi: 'Mọi flash sale', en: 'All flash sales', zh: '所有闪购', th: 'Flash Sale ทั้งหมด', hi: 'सभी फ्लैश सेल', ko: 'All flash sales'  },
  'pricing.val.campaigns': { vi: 'chiến dịch', en: 'campaigns', zh: '活动', th: 'แคมเปญ', hi: 'अभियान', ko: 'campaigns'  },
  'pricing.val.storageCustom': { vi: 'Dung lượng tùy chỉnh', en: 'Custom storage', zh: '自定义存储', th: 'พื้นที่จัดเก็บกำหนดเอง', hi: 'कस्टम स्टोरेज', ko: 'Custom storage'  },

  // Buyer plan features
  'pricing.buyer.shopOnPlatform': { vi: 'Mua sắm trên nền tảng', en: 'Shop on platform', zh: '在平台购物', th: 'ช้อปบนแพลตฟอร์ม', hi: 'प्लेटफ़ॉर्म पर शॉपिंग', ko: 'Shop on platform'  },
  'pricing.buyer.xpPerOrder': { vi: 'XP mỗi đơn hàng', en: 'XP per order', zh: '每单XP', th: 'XP ต่อคำสั่งซื้อ', hi: 'प्रति ऑर्डर XP', ko: 'XP per order'  },
  'pricing.buyer.noFlashSale': { vi: 'Không ưu tiên flash sale', en: 'No flash sale priority', zh: '无闪购优先', th: 'ไม่มีลำดับความสำคัญ Flash Sale', hi: 'फ्लैश सेल प्राथमिकता नहीं', ko: 'No flash sale priority'  },
  'pricing.buyer.noVipBadge': { vi: 'Không có badge VIP', en: 'No VIP badge', zh: '无VIP徽章', th: 'ไม่มีป้าย VIP', hi: 'VIP बैज नहीं', ko: 'No VIP badge'  },
  'pricing.buyer.standardSupport': { vi: 'Hỗ trợ tiêu chuẩn', en: 'Standard support', zh: '标准支持', th: 'การสนับสนุนมาตรฐาน', hi: 'मानक सहायता', ko: 'Standard support'  },
  'pricing.buyer.joinGroupBuy': { vi: 'Tham gia Group Buy', en: 'Join Group Buy', zh: '参加团购', th: 'เข้าร่วม Group Buy', hi: 'Group Buy में शामिल हों', ko: '공동구매 참여'  },
  'pricing.buyer.double': { vi: 'gấp đôi', en: 'double', zh: '双倍', th: 'สองเท่า', hi: 'दोगुना', ko: 'double'  },
  'pricing.buyer.flashSaleEarly': { vi: 'Truy cập flash sale sớm 30 phút', en: 'Access flash sales 30 minutes early', zh: '提前30分钟进入闪购', th: 'เข้าถึง Flash Sale ก่อน 30 นาที', hi: 'फ्लैश सेल 30 मिनट पहले एक्सेस करें', ko: 'Access flash sales 30 minutes early'  },
  'pricing.buyer.goldBadge': { vi: 'Huy hiệu vàng VIP', en: 'VIP Gold Badge', zh: 'VIP金色徽章', th: 'ป้ายทอง VIP', hi: 'VIP गोल्ड बैज', ko: 'VIP Gold Badge'  },
  'pricing.buyer.prioritySupport': { vi: 'Hỗ trợ ưu tiên 24/7', en: 'Priority 24/7 support', zh: '24/7优先支持', th: 'การสนับสนุนลำดับความสำคัญ 24/7', hi: 'प्राथमिकता 24/7 सहायता', ko: 'Priority 24/7 support'  },
  'pricing.buyer.groupBuyVip': { vi: 'Group Buy + Giá VIP riêng', en: 'Group Buy + Exclusive VIP Price', zh: '团购 + VIP专属价', th: 'Group Buy + ราคา VIP พิเศษ', hi: 'Group Buy + विशेष VIP मूल्य', ko: 'Group Buy + Exclusive VIP Price'  },
  'pricing.buyer.customVip': { vi: 'Gói VIP tùy chỉnh cho doanh nghiệp', en: 'Custom VIP package for enterprise', zh: '企业定制VIP套餐', th: 'แพ็กเกจ VIP กำหนดเองสำหรับองค์กร', hi: 'एंटरप्राइज़ के लिए कस्टम VIP पैकेज', ko: 'Custom VIP package for enterprise'  },
  'pricing.buyer.aiShopping': { vi: 'AI Shopping Assistant cá nhân hóa', en: 'Personalized AI Shopping Assistant', zh: '个性化AI购物助手', th: 'AI Shopping Assistant ส่วนบุคคล', hi: 'व्यक्तिगत AI शॉपिंग असिस्टेंट', ko: 'Personalized AI Shopping Assistant'  },
  'pricing.buyer.customCashback': { vi: 'Hoàn xu rate tùy chỉnh', en: 'Custom cashback rate', zh: '自定义返现率', th: 'อัตราเงินคืนกำหนดเอง', hi: 'कस्टम कैशबैक दर', ko: 'Custom cashback rate'  },
  'pricing.buyer.groupBuyCustom': { vi: 'Group Buy với giá riêng', en: 'Group Buy with custom pricing', zh: '团购专属价格', th: 'Group Buy ราคาเฉพาะ', hi: 'कस्टम मूल्य के साथ Group Buy', ko: 'Group Buy with custom pricing'  },
  'pricing.buyer.freeShipAll': { vi: 'Free ship mọi đơn hàng', en: 'Free shipping on all orders', zh: '所有订单免运费', th: 'ส่งฟรีทุกคำสั่งซื้อ', hi: 'सभी ऑर्डर पर मुफ़्त शिपिंग', ko: 'Free shipping on all orders'  },
  'pricing.buyer.voucherBundle': { vi: 'Voucher bundle tùy chọn', en: 'Custom voucher bundle', zh: '自选优惠券套餐', th: 'ชุดบัตรกำนัลกำหนดเอง', hi: 'कस्टम वाउचर बंडल', ko: 'Custom voucher bundle'  },
  'pricing.buyer.dedicatedSla': { vi: 'Hỗ trợ riêng + SLA', en: 'Dedicated support + SLA', zh: '专属支持 + SLA', th: 'การสนับสนุนเฉพาะ + SLA', hi: 'समर्पित सहायता + SLA', ko: 'Dedicated support + SLA'  },
  'pricing.buyer.onchainRewards': { vi: 'On-chain loyalty rewards', en: 'On-chain loyalty rewards', zh: '链上忠诚奖励', th: 'รางวัลความภักดี On-chain', hi: 'ऑन-चेन लॉयल्टी रिवार्ड', ko: 'On-chain loyalty rewards'  },

  // KOC plan features (translatable parts)
  'pricing.koc.scriptBasic': { vi: 'Script cơ bản', en: 'Basic script', zh: '基础脚本', th: 'สคริปต์พื้นฐาน', hi: 'बेसिक स्क्रिप्ट', ko: 'Basic script'  },
  'pricing.koc.commissionBasic': { vi: 'Commission cơ bản', en: 'Basic commission', zh: '基础佣金', th: 'ค่าคอมมิชชั่นพื้นฐาน', hi: 'बेसिक कमीशन', ko: 'Basic commission'  },
  'pricing.koc.noCreatorToken': { vi: 'Không Creator Token', en: 'No Creator Token', zh: '无创作者代币', th: 'ไม่มี Creator Token', hi: 'Creator Token नहीं', ko: 'No Creator Token'  },
  'pricing.koc.communitySupport': { vi: 'Community support', en: 'Community support', zh: '社区支持', th: 'การสนับสนุนชุมชน', hi: 'सामुदायिक सहायता', ko: 'Community support'  },
  'pricing.koc.customAgents': { vi: 'Tùy chỉnh đến 333 AI Agents', en: 'Customize up to 333 AI Agents', zh: '可定制多达333个AI代理', th: 'กำหนดเองได้สูงสุด 333 AI Agents', hi: '333 AI Agents तक कस्टमाइज़ करें', ko: 'Customize up to 333 AI Agents'  },
  'pricing.koc.creditsByNeed': { vi: 'AI Credits theo nhu cầu', en: 'AI Credits as needed', zh: 'AI Credits按需', th: 'AI Credits ตามความต้องการ', hi: 'ज़रूरत के अनुसार AI Credits', ko: 'AI Credits as needed'  },
  'pricing.koc.customWorkflows': { vi: 'Workflows thiết kế riêng theo ngành', en: 'Industry-specific custom workflows', zh: '按行业定制工作流', th: 'เวิร์กโฟลว์ออกแบบเฉพาะตามอุตสาหกรรม', hi: 'उद्योग-विशिष्ट कस्टम वर्कफ़्लो', ko: 'Industry-specific custom workflows'  },
  'pricing.koc.customTraining': { vi: 'Custom AI training trên data riêng', en: 'Custom AI training on your data', zh: '基于自有数据的定制AI训练', th: 'ฝึก AI แบบกำหนดเองบนข้อมูลของคุณ', hi: 'अपने डेटा पर कस्टम AI ट्रेनिंग', ko: 'Custom AI training on your data'  },
  'pricing.koc.customAffiliateRates': { vi: 'Affiliate rates tùy chỉnh', en: 'Custom affiliate rates', zh: '自定义联盟佣金率', th: 'อัตรา Affiliate กำหนดเอง', hi: 'कस्टम Affiliate दरें', ko: 'Custom affiliate rates'  },
  'pricing.koc.whiteLabelMarketing': { vi: 'White-label marketing suite', en: 'White-label marketing suite', zh: '白标营销套件', th: 'White-label marketing suite', hi: 'White-label marketing suite', ko: 'White-label marketing suite'  },
  'pricing.koc.customStorage': { vi: 'Dung lượng tùy chỉnh', en: 'Custom storage', zh: '自定义存储', th: 'พื้นที่จัดเก็บกำหนดเอง', hi: 'कस्टम स्टोरेज', ko: 'Custom storage'  },
  'pricing.koc.dedicatedManager': { vi: 'Dedicated manager + SLA', en: 'Dedicated manager + SLA', zh: '专属经理 + SLA', th: 'ผู้จัดการเฉพาะ + SLA', hi: 'समर्पित प्रबंधक + SLA', ko: 'Dedicated manager + SLA'  },

  // Vendor plan features (translatable parts)
  'pricing.vendor.products': { vi: 'sản phẩm', en: 'products', zh: '产品', th: 'สินค้า', hi: 'उत्पाद', ko: '제품'  },
  'pricing.vendor.unlimitedProducts': { vi: 'Unlimited sản phẩm', en: 'Unlimited products', zh: '无限产品', th: 'สินค้าไม่จำกัด', hi: 'असीमित उत्पाद', ko: 'Unlimited products'  },
  'pricing.vendor.noApiAccess': { vi: 'Không API access', en: 'No API access', zh: '无API访问', th: 'ไม่มี API access', hi: 'API एक्सेस नहीं', ko: 'No API access'  },

  // FAQ
  'pricing.faq.title': { vi: 'Câu hỏi thường gặp', en: 'Frequently Asked Questions', zh: '常见问题', th: 'คำถามที่พบบ่อย', hi: 'अक्सर पूछे जाने वाले प्रश्न', ko: 'Frequently Asked Questions'  },
  'pricing.faq.q1': { vi: 'Agent Workflow Automation là gì?', en: 'What is Agent Workflow Automation?', zh: '什么是Agent Workflow Automation？', th: 'Agent Workflow Automation คืออะไร?', hi: 'Agent Workflow Automation क्या है?', ko: 'What is Agent Workflow Automation?'  },
  'pricing.faq.a1': { vi: 'Agent Workflow là quy trình tự động hóa nhiều bước do AI Agent thực hiện. Ví dụ: KOC Workflow tự động tạo content → tối ưu SEO → lên lịch đăng → phân tích hiệu suất → điều chỉnh chiến lược. Vendor Workflow tự động quản lý tồn kho → match KOC phù hợp → tối ưu giá → chăm sóc khách hàng. Mỗi bước tiêu tốn AI Credits.', en: 'Agent Workflow is a multi-step automation process executed by AI Agents. Example: KOC Workflow auto-creates content → optimizes SEO → schedules posts → analyzes performance → adjusts strategy. Vendor Workflow auto-manages inventory → matches suitable KOC → optimizes pricing → handles customer service. Each step consumes AI Credits.', zh: 'Agent Workflow是由AI Agent执行的多步骤自动化流程。例如：KOC工作流自动创建内容→优化SEO→排期发布→分析效果→调整策略。供应商工作流自动管理库存→匹配合适KOC→优化定价→客户服务。每步消耗AI Credits。', th: 'Agent Workflow คือกระบวนการอัตโนมัติหลายขั้นตอนที่ดำเนินการโดย AI Agent ตัวอย่าง: KOC Workflow สร้างเนื้อหาอัตโนมัติ → ปรับ SEO → กำหนดเวลาโพสต์ → วิเคราะห์ประสิทธิภาพ → ปรับกลยุทธ์ Vendor Workflow จัดการสต็อกอัตโนมัติ → จับคู่ KOC → ปรับราคา → ดูแลลูกค้า แต่ละขั้นตอนใช้ AI Credits', hi: 'Agent Workflow AI Agents द्वारा निष्पादित बहु-चरण स्वचालन प्रक्रिया है। उदाहरण: KOC Workflow ऑटो-कंटेंट बनाता है → SEO ऑप्टिमाइज़ करता है → पोस्ट शेड्यूल करता है → प्रदर्शन विश्लेषण करता है → रणनीति समायोजित करता है। प्रत्येक चरण AI Credits खपत करता है।', ko: 'Agent Workflow is a multi-step automation process executed by AI Agents. Example: KOC Workflow auto-creates content → optimizes SEO → schedules posts → analyzes performance → adjusts strategy. Vendor Workflow auto-manages inventory → matches suitable KOC → optimizes pricing → handles customer service. Each step consumes AI Credits.'  },
  'pricing.faq.q2': { vi: 'AI Credits hoạt động ra sao?', en: 'How do AI Credits work?', zh: 'AI Credits如何运作？', th: 'AI Credits ทำงานอย่างไร?', hi: 'AI Credits कैसे काम करते हैं?', ko: 'How do AI Credits work?'  },
  'pricing.faq.a2': { vi: 'AI Credits là đơn vị tính cho việc sử dụng các AI Agent và Workflow trên nền tảng. Mỗi thao tác AI (tạo script, phân tích, dự đoán trend, chạy workflow...) tiêu tốn một lượng credits nhất định. Credits được reset mỗi tháng. Gói cao hơn = nhiều credits hơn = chạy nhiều workflow tự động hơn.', en: 'AI Credits are units for using AI Agents and Workflows on the platform. Each AI operation (creating scripts, analysis, trend prediction, running workflows...) consumes a certain amount of credits. Credits reset monthly. Higher plan = more credits = more automated workflows.', zh: 'AI Credits是平台上使用AI Agent和工作流的计量单位。每次AI操作（创建脚本、分析、趋势预测、运行工作流等）消耗一定数量的Credits。Credits每月重置。更高级的套餐 = 更多Credits = 更多自动化工作流。', th: 'AI Credits คือหน่วยสำหรับใช้ AI Agents และ Workflows บนแพลตฟอร์ม การดำเนินการ AI แต่ละครั้ง (สร้างสคริปต์ วิเคราะห์ พยากรณ์เทรนด์ รันเวิร์กโฟลว์) ใช้ credits จำนวนหนึ่ง Credits รีเซ็ตทุกเดือน แพ็กเกจสูงกว่า = Credits มากกว่า = เวิร์กโฟลว์อัตโนมัติมากขึ้น', hi: 'AI Credits प्लेटफ़ॉर्म पर AI Agents और Workflows का उपयोग करने की इकाइयां हैं। प्रत्येक AI ऑपरेशन एक निश्चित मात्रा में credits खपत करता है। Credits मासिक रीसेट होते हैं। उच्चतर प्लान = अधिक credits = अधिक स्वचालित वर्कफ़्लो।', ko: 'AI Credits are units for using AI Agents and Workflows on the platform. Each AI operation (creating scripts, analysis, trend prediction, running workflows...) consumes a certain amount of credits. Credits reset monthly. Higher plan = more credits = more automated workflows.'  },
  'pricing.faq.q3': { vi: 'Tôi có thể thay đổi gói bất cứ lúc nào không?', en: 'Can I change plans anytime?', zh: '我可以随时更改套餐吗？', th: 'ฉันสามารถเปลี่ยนแพ็กเกจได้ตลอดเวลาหรือไม่?', hi: 'क्या मैं किसी भी समय प्लान बदल सकता हूं?', ko: 'Can I change plans anytime?'  },
  'pricing.faq.a3': { vi: 'Có! Bạn có thể nâng cấp hoặc hạ cấp gói bất cứ lúc nào. Khi nâng cấp, phần chênh lệch sẽ được tính pro-rata. Khi hạ cấp, credit còn lại sẽ được chuyển sang chu kỳ tiếp theo.', en: 'Yes! You can upgrade or downgrade anytime. When upgrading, the difference is pro-rated. When downgrading, remaining credits carry over to the next cycle.', zh: '可以！您可以随时升级或降级。升级时，差额按比例计算。降级时，剩余Credits转入下个周期。', th: 'ได้! คุณสามารถอัปเกรดหรือดาวน์เกรดได้ตลอดเวลา เมื่ออัปเกรด ส่วนต่างจะคำนวณตามสัดส่วน เมื่อดาวน์เกรด Credits ที่เหลือจะโอนไปรอบถัดไป', hi: 'हां! आप किसी भी समय अपग्रेड या डाउनग्रेड कर सकते हैं। अपग्रेड करते समय, अंतर प्रो-रेटा होता है। डाउनग्रेड करते समय, शेष credits अगले चक्र में स्थानांतरित होते हैं।', ko: 'Yes! You can upgrade or downgrade anytime. When upgrading, the difference is pro-rated. When downgrading, remaining credits carry over to the next cycle.'  },
  'pricing.faq.q4': { vi: 'Thanh toán bằng phương thức nào?', en: 'What payment methods are available?', zh: '支持哪些支付方式？', th: 'มีวิธีการชำระเงินอะไรบ้าง?', hi: 'कौन से भुगतान तरीके उपलब्ध हैं?', ko: 'What payment methods are available?'  },
  'pricing.faq.a4': { vi: 'Chúng tôi hỗ trợ thanh toán qua VISA, Mastercard, MoMo, ZaloPay, chuyển khoản ngân hàng và các loại tiền mã hóa (USDT, USDC, ETH). Tất cả giao dịch được ghi nhận on-chain.', en: 'We support VISA, Mastercard, MoMo, ZaloPay, bank transfer, and cryptocurrencies (USDT, USDC, ETH). All transactions are recorded on-chain.', zh: '我们支持VISA、Mastercard、MoMo、ZaloPay、银行转账和加密货币（USDT、USDC、ETH）。所有交易链上记录。', th: 'เรารองรับ VISA, Mastercard, MoMo, ZaloPay, โอนธนาคาร และสกุลเงินดิจิทัล (USDT, USDC, ETH) ธุรกรรมทั้งหมดบันทึกบน on-chain', hi: 'हम VISA, Mastercard, MoMo, ZaloPay, बैंक ट्रांसफ़र और क्रिप्टोकरेंसी (USDT, USDC, ETH) सपोर्ट करते हैं। सभी लेनदेन ऑन-चेन रिकॉर्ड होते हैं।', ko: 'We support VISA, Mastercard, MoMo, ZaloPay, bank transfer, and cryptocurrencies (USDT, USDC, ETH). All transactions are recorded on-chain.'  },
  'pricing.faq.q5': { vi: 'Gói Custom hoạt động như thế nào?', en: 'How does the Custom plan work?', zh: 'Custom套餐如何运作？', th: 'แพ็กเกจ Custom ทำงานอย่างไร?', hi: 'Custom प्लान कैसे काम करता है?', ko: 'How does the Custom plan work?'  },
  'pricing.faq.a5': { vi: 'Bạn liên hệ đội sales, mô tả nhu cầu cụ thể (số agents, credits, loại workflows, quy mô KOC network...). Chúng tôi sẽ thiết kế gói riêng phù hợp ngân sách và mục tiêu kinh doanh. Bao gồm onboarding cá nhân hóa, dedicated manager, SLA cam kết uptime 99.9%.', en: 'Contact our sales team with your specific needs (agents, credits, workflow types, KOC network scale...). We will design a custom plan matching your budget and business goals. Includes personalized onboarding, dedicated manager, and 99.9% uptime SLA.', zh: '联系销售团队，描述您的具体需求（代理数量、Credits、工作流类型、KOC网络规模等）。我们将根据您的预算和业务目标设计专属方案。包括个性化入门培训、专属经理和99.9%正常运行时间SLA。', th: 'ติดต่อทีมขายของเรา อธิบายความต้องการเฉพาะ (จำนวน agents, credits, ประเภทเวิร์กโฟลว์, ขนาดเครือข่าย KOC) เราจะออกแบบแพ็กเกจเฉพาะตามงบประมาณและเป้าหมายธุรกิจ รวม onboarding ส่วนบุคคล dedicated manager และ SLA uptime 99.9%', hi: 'अपनी विशिष्ट ज़रूरतों के साथ हमारी सेल्स टीम से संपर्क करें। हम आपके बजट और व्यावसायिक लक्ष्यों के अनुसार कस्टम प्लान डिज़ाइन करेंगे। व्यक्तिगत ऑनबोर्डिंग, समर्पित प्रबंधक और 99.9% अपटाइम SLA शामिल।', ko: 'Contact our sales team with your specific needs (agents, credits, workflow types, KOC network scale...). We will design a custom plan matching your budget and business goals. Includes personalized onboarding, dedicated manager, and 99.9% uptime SLA.'  },
  'pricing.faq.q6': { vi: 'Chính sách hoàn tiền như thế nào?', en: 'What is the refund policy?', zh: '退款政策是什么？', th: 'นโยบายการคืนเงินเป็นอย่างไร?', hi: 'रिफ़ंड नीति क्या है?', ko: 'What is the refund policy?'  },
  'pricing.faq.a6': { vi: 'Hoàn tiền 100% trong 7 ngày đầu nếu không hài lòng, không cần lý do. Sau 7 ngày, chúng tôi sẽ hoàn trả pro-rata cho phần thời gian chưa sử dụng.', en: '100% refund within the first 7 days if not satisfied, no questions asked. After 7 days, we refund pro-rata for unused time.', zh: '7天内不满意100%退款，无需理由。7天后，按未使用时间比例退款。', th: 'คืนเงิน 100% ภายใน 7 วันแรกหากไม่พอใจ ไม่ต้องให้เหตุผล หลัง 7 วัน คืนเงินตามสัดส่วนสำหรับเวลาที่ยังไม่ได้ใช้', hi: 'पहले 7 दिनों में संतुष्ट न होने पर 100% रिफ़ंड, कोई सवाल नहीं। 7 दिनों के बाद, अनुपयुक्त समय के लिए प्रो-रेटा रिफ़ंड।', ko: '100% refund within the first 7 days if not satisfied, no questions asked. After 7 days, we refund pro-rata for unused time.'  },
  'pricing.faq.q7': { vi: '"On-chain, minh bạch" nghĩa là gì?', en: 'What does "On-chain, transparent" mean?', zh: '"链上透明"是什么意思？', th: '"On-chain โปร่งใส" หมายความว่าอย่างไร?', hi: '"ऑन-चेन, पारदर्शी" का क्या मतलब है?', ko: 'What does "On-chain, transparent" mean?'  },
  'pricing.faq.a7': { vi: 'Mọi giao dịch subscription, commission, và token đều được ghi nhận trên blockchain (Polygon). Bạn có thể verify bất cứ lúc nào qua blockchain explorer — hoàn toàn minh bạch, không chỉnh sửa được.', en: 'All subscription, commission, and token transactions are recorded on blockchain (Polygon). You can verify anytime via blockchain explorer — fully transparent, immutable.', zh: '所有订阅、佣金和代币交易都记录在区块链（Polygon）上。您可以随时通过区块链浏览器验证 — 完全透明、不可篡改。', th: 'ธุรกรรม subscription, commission และ token ทั้งหมดถูกบันทึกบนบล็อกเชน (Polygon) คุณสามารถตรวจสอบได้ตลอดเวลาผ่าน blockchain explorer — โปร่งใสอย่างสมบูรณ์ ไม่สามารถแก้ไขได้', hi: 'सभी सब्सक्रिप्शन, कमीशन और टोकन लेनदेन ब्लॉकचेन (Polygon) पर रिकॉर्ड होते हैं। आप किसी भी समय ब्लॉकचेन एक्सप्लोरर के माध्यम से सत्यापित कर सकते हैं — पूरी तरह पारदर्शी, अपरिवर्तनीय।', ko: 'All subscription, commission, and token transactions are recorded on blockchain (Polygon). You can verify anytime via blockchain explorer — fully transparent, immutable.'  },

  // Bottom CTA
  'pricing.bottomCta.title': { vi: 'Bắt đầu với 3 AI Agents miễn phí — Tự động hóa khi sẵn sàng', en: 'Start with 3 Free AI Agents — Automate when ready', zh: '从3个免费AI Agents开始 — 准备好后自动化', th: 'เริ่มต้นด้วย 3 AI Agents ฟรี — อัตโนมัติเมื่อพร้อม', hi: '3 मुफ़्त AI Agents से शुरू करें — तैयार होने पर ऑटोमेट करें', ko: 'Start with 3 Free AI Agents — Automate when ready'  },
  'pricing.bottomCta.subtitle': { vi: 'Không cần thẻ tín dụng. Trải nghiệm Agent Workflow Automation ngay. Nâng cấp bất kỳ lúc nào.', en: 'No credit card required. Experience Agent Workflow Automation now. Upgrade anytime.', zh: '无需信用卡。立即体验Agent Workflow Automation。随时升级。', th: 'ไม่ต้องใช้บัตรเครดิต ทดลองใช้ Agent Workflow Automation ได้เลย อัปเกรดได้ทุกเมื่อ', hi: 'क्रेडिट कार्ड की ज़रूरत नहीं। अभी Agent Workflow Automation का अनुभव करें। कभी भी अपग्रेड करें।', ko: 'No credit card required. Experience Agent Workflow Automation now. Upgrade anytime.'  },
  'pricing.bottomCta.registerFree': { vi: 'Đăng ký miễn phí', en: 'Register for Free', zh: '免费注册', th: 'สมัครฟรี', hi: 'मुफ़्त रजिस्टर करें', ko: 'Register for Free'  },
  'pricing.bottomCta.designCustom': { vi: 'Thiết kế gói Custom', en: 'Design Custom Plan', zh: '定制专属方案', th: 'ออกแบบแพ็กเกจ Custom', hi: 'Custom प्लान डिज़ाइन करें', ko: 'Design Custom Plan'  },
};
