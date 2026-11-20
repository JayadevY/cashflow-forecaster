/**
 * LoadingSpinner Component
 *
 * Friendly, high-contrast animated spinner displayed while data is being fetched.
 */

import React from 'react';
import { Loader2 } from 'lucide-react';
import { TRANSLATIONS } from '../i18n';

export default function LoadingSpinner({ language = 'en', message }) {
  const t = TRANSLATIONS[language] || TRANSLATIONS.en;
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center space-y-4">
      <div className="w-16 h-16 rounded-2xl bg-emerald-100 flex items-center justify-center text-emerald-600 shadow-inner">
        <Loader2 className="w-9 h-9 animate-spin" strokeWidth={2.5} />
      </div>
      <p className="text-base font-semibold text-slate-700">
        {message || t.loadingText}
      </p>
    </div>
  );
}
