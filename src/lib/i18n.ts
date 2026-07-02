export const locales = ['en', 'ko', 'ja', 'fr', 'es', 'zh'] as const;
// zh = 표준 중국어(Simplified). 구 'cn'(zh-TW)은 전 프로젝트에서 폐지(2026-06-29).
// locales/타입 모두 cn 제외. 남은 cn: 키는 무해한 죽은 데이터(렌더 안 됨).
export type Locale = (typeof locales)[number];

export const localeNames: Record<Locale, string> = {
  en: 'English',
  ko: '한국어',
  ja: '日本語',
  fr: 'Français',
  es: 'Español',
  zh: '简体中文',
};

export const localePaths: Record<Locale, string> = {
  en: '/en',
  ko: '/ko',
  ja: '/ja',
  fr: '/fr',
  es: '/es',
  zh: '/zh',
};

// 번역 함수
export async function getTranslations(locale: Locale) {
  try {
    const translations = await import(`../locales/${locale}.json`);
    return translations.default;
  } catch (error) {
    // Fallback to English
    const translations = await import('../locales/en.json');
    return translations.default;
  }
}

// URL에서 현재 locale 추출
export function getLocaleFromPath(pathname: string): Locale {
  const segments = pathname.split('/').filter(Boolean);
  const potentialLocale = segments[0] as Locale;

  if ((locales as readonly string[]).includes(potentialLocale)) {
    return potentialLocale;
  }

  return 'en'; // Default fallback
}

// 언어별 URL 생성
export function getLocalizedPath(locale: Locale, path: string): string {
  const basePath = localePaths[locale];
  return `${basePath}${path}`;
}