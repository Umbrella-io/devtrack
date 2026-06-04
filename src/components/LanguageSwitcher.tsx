'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';
import { locales } from '@/i18n/config';
import { setUserLocale } from '@/services/locale';

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
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function onChange(event: React.ChangeEvent<HTMLSelectElement>) {
    const nextLocale = event.target.value;
    startTransition(() => {
      setUserLocale(nextLocale).then(() => {
        router.refresh();
      });
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
