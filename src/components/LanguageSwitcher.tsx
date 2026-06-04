'use client';

import { useTransition } from 'react';
import { useLocale } from 'next-intl';
import { setUserLocale, locales } from '@/services/locale';

const localeNames: Record<string, string> = {
  en: 'English',
  es: 'Español',
  fr: 'Français',
  de: 'Deutsch',
  ja: '日本語',
  zh: '中文 (简体)',
  pt: 'Português',
  hi: 'हिन्दी'
};

export default function LanguageSwitcher() {
  const locale = useLocale();
  const [isPending, startTransition] = useTransition();

  function onChange(event: React.ChangeEvent<HTMLSelectElement>) {
    const nextLocale = event.target.value;
    startTransition(() => {
      setUserLocale(nextLocale);
    });
  }

  return (
    <select 
      defaultValue={locale} 
      onChange={onChange} 
      disabled={isPending}
      className="flex h-10 w-full md:w-[200px] items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {locales.map((l) => (
        <option key={l} value={l}>{localeNames[l]}</option>
      ))}
    </select>
  );
}
