'use client';

import { useEffect } from 'react';

export default function KeyboardShortcuts() {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;

      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return;
      }

      if (e.key.toLowerCase() === 'd') {
        window.dispatchEvent(new Event('toggle-theme'));
      }

      if (e.key.toLowerCase() === 'b') {
        window.dispatchEvent(new Event('toggle-chart'));
      }

      if (e.key.toLowerCase() === 'r') {
        window.location.reload();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  return null;
}