export const LANGS = ['en', 'fr'] as const;
export type Lang = (typeof LANGS)[number];

export const DEFAULT_LANG: Lang = 'en';
export const LANG_STORAGE_KEY = 'app.lang';

const isLang = (value: unknown): value is Lang => LANGS.includes(value as Lang);

/** Stored choice, else the browser language, else the default. */
export function initialLang(): Lang {
  try {
    const stored = localStorage.getItem(LANG_STORAGE_KEY);
    if (isLang(stored)) return stored;
  } catch {
    // storage unavailable (privacy mode): fall through
  }
  const browser = globalThis.navigator?.language?.slice(0, 2);
  return isLang(browser) ? browser : DEFAULT_LANG;
}

export function persistLang(lang: Lang): void {
  try {
    localStorage.setItem(LANG_STORAGE_KEY, lang);
  } catch {
    // storage unavailable: the choice just won't survive a reload
  }
}
