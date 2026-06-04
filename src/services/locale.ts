'use server';

import { cookies } from 'next/headers';

// In this simple example, we store the locale in a cookie
const COOKIE_NAME = 'NEXT_LOCALE';
export const locales = ['en', 'es', 'fr', 'de', 'ja', 'zh', 'pt', 'hi'];
export const defaultLocale = 'en';

export async function getUserLocale() {
  return cookies().get(COOKIE_NAME)?.value || defaultLocale;
}

export async function setUserLocale(locale: string) {
  cookies().set(COOKIE_NAME, locale, { maxAge: 60 * 60 * 24 * 365 }); // 1 year
}
