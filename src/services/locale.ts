'use server';

import { cookies } from 'next/headers';
import { defaultLocale, COOKIE_NAME } from '@/i18n/config';

export async function getUserLocale() {
  return cookies().get(COOKIE_NAME)?.value || defaultLocale;
}

export async function setUserLocale(locale: string) {
  cookies().set(COOKIE_NAME, locale, { 
    maxAge: 60 * 60 * 24 * 365, 
    path: '/',
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production'
  });
}
