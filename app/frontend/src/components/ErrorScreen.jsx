/**
 * ErrorScreen Component
 *
 * Shows when the backend server is offline or unreachable.
 * Explains what went wrong in simple everyday language and offers a big retry button.
 */

import React from 'react';
import { WifiOff, RefreshCw } from 'lucide-react';
import { TRANSLATIONS } from '../i18n';

export default function ErrorScreen({ onRetry, language = 'en', errorDetail }) {
  const t = TRANSLATIONS[language] || TRANSLATIONS.en;

  return (
    <div className="flex flex-col items-center justify-center p-8 text-center space-y-6 my-auto">
      <div className="w-20 h-20 rounded-3xl bg-rose-100 border-2 border-rose-300 flex items-center justify-center text-rose-600 shadow-md">
        <WifiOff className="w-10 h-10" strokeWidth={2.5} />
      </div>

      <div className="space-y-2 max-w-sm">
        <h2 className="text-xl font-black text-slate-900 leading-snug">
          {t.serverErrorTitle}
        </h2>
        <p className="text-sm text-slate-600 leading-relaxed">
          {t.serverErrorDesc}
        </p>
        {errorDetail && (
          <div className="mt-3 p-3 bg-slate-100 rounded-xl text-xs font-mono text-slate-500 break-words text-left">
            {errorDetail}
          </div>
        )}
      </div>

      <button
        onClick={onRetry}
        className="w-full min-h-[56px] px-6 py-4 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold text-lg rounded-2xl shadow-lg flex items-center justify-center gap-3 transition-all"
      >
        <RefreshCw className="w-6 h-6" strokeWidth={2.5} />
        <span>{t.btnRetry}</span>
      </button>
    </div>
  );
}
