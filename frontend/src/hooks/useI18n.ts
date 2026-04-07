import { useCallback, useSyncExternalStore } from 'react';
import { commerceTranslations } from '../i18n/commerce';
import { userTranslations } from '../i18n/user';
import { adminTranslations } from '../i18n/admin';
import { kocTranslations } from '../i18n/koc';
import { vendorTranslations } from '../i18n/vendor';

export type Locale = 'vi' | 'en' | 'zh' | 'th' | 'hi' | 'ko';

export interface LanguageOption {
  code: Locale;
  label: string;
  flag: string;
}

export const LANGUAGES: LanguageOption[] = [
  { code: 'vi', label: 'Tiếng Việt', flag: '🇻🇳' },
  { code: 'en', label: 'English', flag: '🇬🇧' },
  { code: 'zh', label: '中文', flag: '🇨🇳' },
  { code: 'th', label: 'ไทย', flag: '🇹🇭' },
  { code: 'hi', label: 'हिन्दी', flag: '🇮🇳' },
  { code: 'ko', label: '한국어', flag: '🇰🇷' },
];

type TranslationMap = Record<string, Record<Locale, string>>;

const translations: TranslationMap = {
  // Nav links
  'nav.home': { vi: 'Trang chủ', en: 'Home', zh: '首页', th: 'หน้าแรก', hi: 'होम', ko: '홈'  },
  'nav.marketplace': { vi: 'Marketplace', en: 'Marketplace', zh: '市场', th: 'ตลาด', hi: 'बाज़ार', ko: '마켓플레이스'  },
  'nav.promo': { vi: 'Khuyến mại', en: 'Promotions', zh: '促销', th: 'โปรโมชั่น', hi: 'प्रोमो', ko: '프로모션'  },
  'nav.live': { vi: 'Đang Live', en: 'Live Now', zh: '直播中', th: 'ถ่ายทอดสด', hi: 'लाइव', ko: '라이브 중'  },
  'nav.feed': { vi: 'Video Feed', en: 'Video Feed', zh: '视频流', th: 'วิดีโอฟีด', hi: 'वीडियो फीड', ko: '비디오 피드'  },
  'nav.hot': { vi: 'Sản phẩm Hot', en: 'Hot Products', zh: '热门产品', th: 'สินค้าฮอต', hi: 'हॉट प्रोडक्ट', ko: '인기 상품'  },
  'nav.academy': { vi: 'KOC Academy', en: 'KOC Academy', zh: 'KOC 学院', th: 'KOC อะคาเดมี', hi: 'KOC अकादमी', ko: 'KOC 아카데미'  },

  // Drawer sections
  'drawer.platform': { vi: 'NỀN TẢNG', en: 'PLATFORM', zh: '平台', th: 'แพลตฟอร์ม', hi: 'प्लेटफ़ॉर्म', ko: '플랫폼'  },
  'drawer.community': { vi: 'CỘNG ĐỒNG', en: 'COMMUNITY', zh: '社区', th: 'ชุมชน', hi: 'समुदाय', ko: '커뮤니티'  },
  'drawer.web3': { vi: 'WEB3 & BLOCKCHAIN', en: 'WEB3 & BLOCKCHAIN', zh: 'WEB3 & 区块链', th: 'WEB3 & บล็อกเชน', hi: 'WEB3 और ब्लॉकचेन', ko: 'WEB3 & 블록체인'  },
  'drawer.ai': { vi: 'AI & SOCIAL', en: 'AI & SOCIAL', zh: 'AI & 社交', th: 'AI & โซเชียล', hi: 'AI और सोशल', ko: 'AI & 소셜'  },
  'drawer.account': { vi: 'TÀI KHOẢN', en: 'ACCOUNT', zh: '账户', th: 'บัญชี', hi: 'खाता', ko: '계정'  },
  'drawer.gamification': { vi: 'Gamification', en: 'Gamification', zh: '游戏化', th: 'เกมมิฟิเคชัน', hi: 'गेมิफิकेशन', ko: '게임화'  },

  // Drawer items - Platform
  'drawer.marketplace': { vi: 'Marketplace', en: 'Marketplace', zh: '市场', th: 'ตลาด', hi: 'बाज़ार', ko: '마켓플레이스'  },
  'drawer.dashboard': { vi: 'Dashboard', en: 'Dashboard', zh: '仪表盘', th: 'แดชบอร์ด', hi: 'डैशबोर्ड', ko: '대시보드'  },
  'drawer.kocHub': { vi: 'KOC Hub', en: 'KOC Hub', zh: 'KOC 中心', th: 'KOC ฮับ', hi: 'KOC हब', ko: 'KOC 허브'  },
  'drawer.vendorHub': { vi: 'Vendor Hub', en: 'Vendor Hub', zh: '供应商中心', th: 'ศูนย์ผู้ขาย', hi: 'वेंडर हब', ko: '벤더 허브'  },
  'drawer.academy': { vi: 'KOC Academy', en: 'KOC Academy', zh: 'KOC 学院', th: 'KOC อะคาเดมี', hi: 'KOC अकादमी', ko: 'KOC 아카데미'  },

  // Drawer items - Web3
  'drawer.dpp': { vi: 'Blockchain DPP', en: 'Blockchain DPP', zh: '区块链 DPP', th: 'บล็อกเชน DPP', hi: 'ब्लॉकचेन DPP', ko: '블록체인 DPP'  },
  'drawer.commission': { vi: 'Hoa hồng On-chain', en: 'On-chain Commission', zh: '链上佣金', th: 'ค่าคอมมิชชั่นออนเชน', hi: 'ऑन-चेन कमीशन', ko: '온체인 수수료'  },
  'drawer.creatorToken': { vi: 'Creator Token', en: 'Creator Token', zh: '创作者代币', th: 'โทเค็นผู้สร้าง', hi: 'क्रिएटर टोकन', ko: '크리에이터 토큰'  },
  'drawer.reputationNft': { vi: 'Reputation NFT', en: 'Reputation NFT', zh: '声誉 NFT', th: 'NFT ชื่อเสียง', hi: 'रेपुटेशन NFT', ko: '평판 NFT'  },
  'drawer.wallet': { vi: 'Ví · Wallet', en: 'Wallet', zh: '钱包', th: 'กระเป๋าเงิน', hi: 'वॉलेट', ko: '지갑'  },
  'drawer.pricing': { vi: 'Bảng giá', en: 'Pricing', zh: '定价', th: 'ราคา', hi: 'मूल्य निर्धारण', ko: '가격'  },

  // Drawer items - AI
  'drawer.agents': { vi: '333 AI Agents', en: '333 AI Agents', zh: '333 AI 代理', th: '333 เอไอเอเจนท์', hi: '333 AI एजेंट', ko: '333 AI 에이전트'  },
  'drawer.groupBuy': { vi: 'Mua nhóm AI', en: 'AI Group Buy', zh: 'AI 团购', th: 'AI ซื้อกลุ่ม', hi: 'AI ग्रุป बाय', ko: 'AI 공동구매'  },
  'drawer.liveCommerce': { vi: 'AI Live Commerce', en: 'AI Live Commerce', zh: 'AI 直播电商', th: 'AI ไลฟ์คอมเมิร์ซ', hi: 'AI लाइव कॉमर्स', ko: 'AI 라이브 커머스'  },
  'drawer.socialGraph': { vi: 'Social Graph', en: 'Social Graph', zh: '社交图谱', th: 'โซเชียลกราฟ', hi: 'सोशल ग्राफ', ko: '소셜 그래프'  },
  'drawer.videoFeed': { vi: 'Video Feed', en: 'Video Feed', zh: '视频流', th: 'วิดีโอฟีด', hi: 'वीडियो फीड', ko: '비디오 피드'  },

  // Drawer items - Account
  'drawer.profile': { vi: 'Hồ sơ cá nhân', en: 'Profile', zh: '个人资料', th: 'โปรไฟล์', hi: 'प्रोफ़ाइल', ko: '프로필'  },
  'drawer.notifications': { vi: 'Thông báo', en: 'Notifications', zh: '通知', th: 'การแจ้งเตือน', hi: 'सूचนาएँ', ko: '알림'  },
  'drawer.settings': { vi: 'Cài đặt', en: 'Settings', zh: '设置', th: 'การตั้งค่า', hi: 'सेटिंग्स', ko: '설정'  },
  'drawer.language': { vi: 'Ngôn ngữ', en: 'Language', zh: '语言', th: 'ภาษา', hi: 'भाषा', ko: '언어'  },

  // Buttons
  'btn.join': { vi: 'Tham gia', en: 'Join', zh: '加入', th: 'เข้าร่วม', hi: 'जुड़ें', ko: '참여'  },
  'btn.joinFree': { vi: '🚀 Tham gia miễn phí', en: '🚀 Join for Free', zh: '🚀 免费加入', th: '🚀 เข้าร่วมฟรี', hi: '🚀 मुफ़्त जुड़ें', ko: '🚀 무료 참여'  },
  'btn.tryDemo': { vi: 'Trải nghiệm Demo', en: 'Try Demo', zh: '体验演示', th: 'ทดลองใช้เดโม', hi: 'डेमो आज़माएँ', ko: '데모 체험'  },
  'btn.login': { vi: 'Đăng nhập', en: 'Login', zh: '登录', th: 'เข้าสู่ระบบ', hi: 'लॉगिन', ko: '로그인'  },
  'btn.register': { vi: 'Đăng ký', en: 'Register', zh: '注册', th: 'สมัครสมาชิก', hi: 'रजिस्टर', ko: '회원가입'  },

  // Footer
  'footer.brand': { vi: 'WellKOC', en: 'WellKOC', zh: 'WellKOC', th: 'WellKOC', hi: 'WellKOC', ko: 'WellKOC'  },
  'footer.tagline': { vi: 'Nền tảng Social Commerce Web3 hàng đầu Đông Nam Á', en: 'Southeast Asia\'s leading Web3 Social Commerce platform', zh: '东南亚领先的Web3社交电商平台', th: 'แพลตฟอร์ม Web3 Social Commerce ชั้นนำของเอเชียตะวันออกเฉียงใต้', hi: 'दक्षिण पूर्व एशिया का प्रमुख Web3 सोशल कॉमर्स प्लेटफ़ॉर्म', ko: '동남아시아 최고의 Web3 소셜 커머스 플랫폼' },
  'footer.product': { vi: 'Sản phẩm', en: 'Product', zh: '产品', th: 'ผลิตภัณฑ์', hi: 'उत्पाद', ko: '제품'  },
  'footer.community': { vi: 'Cộng đồng', en: 'Community', zh: '社区', th: 'ชุมชน', hi: 'समुदाय', ko: '커뮤니티'  },
  'footer.legal': { vi: 'Pháp lý', en: 'Legal', zh: '法律', th: 'กฎหมาย', hi: 'कानूनी', ko: '법률'  },

  // Misc
  'ticker.welcome': { vi: 'Chào mừng đến WellKOC', en: 'Welcome to WellKOC', zh: '欢迎来到WellKOC', th: 'ยินดีต้อนรับสู่ WellKOC', hi: 'WellKOC में आपका स्वागत है', ko: 'WellKOC에 오신 것을 환영합니다'  },

  // Merge all page translations
  ...commerceTranslations,
  ...userTranslations as TranslationMap,
  ...adminTranslations,
  ...kocTranslations,
  ...vendorTranslations,
};

/* ═══════════════════════════════════════════════════════════
   GLOBAL LOCALE STORE — all components share the same locale
   useSyncExternalStore ensures instant re-render everywhere
   when language is changed from any component.
   ═══════════════════════════════════════════════════════════ */
const STORAGE_KEY = 'wellkoc-locale';

const VALID_LOCALES: Locale[] = ['vi', 'en', 'zh', 'th', 'hi', 'ko'];

function readLocale(): Locale {
  if (typeof window === 'undefined') return 'vi';
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored && VALID_LOCALES.includes(stored as Locale)) return stored as Locale;
  return 'vi';
}

// Global mutable locale + listener set
let _locale: Locale = readLocale();
const _listeners = new Set<() => void>();

function getSnapshot(): Locale {
  return _locale;
}

function subscribe(listener: () => void): () => void {
  _listeners.add(listener);
  return () => _listeners.delete(listener);
}

function setGlobalLocale(l: Locale) {
  if (l === _locale) return;
  _locale = l;
  localStorage.setItem(STORAGE_KEY, l);
  document.documentElement.setAttribute('lang', l);
  // Notify ALL subscribers — every useI18n() re-renders instantly
  _listeners.forEach(fn => fn());
}

/* ═══ HOOK ═══ */
export function useI18n() {
  const locale = useSyncExternalStore(subscribe, getSnapshot, () => 'vi' as Locale);

  const setLocale = useCallback((l: Locale) => {
    setGlobalLocale(l);
  }, []);

  const t = useCallback(
    (key: string, fallback?: string): string => {
      const entry = translations[key];
      if (!entry) return fallback ?? key;
      return entry[locale] ?? entry['vi'] ?? fallback ?? key;
    },
    [locale],
  );

  const currentLanguage = LANGUAGES.find((l) => l.code === locale) ?? LANGUAGES[0];

  return { locale, setLocale, t, currentLanguage, languages: LANGUAGES };
}
