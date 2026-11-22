/**
 * ServerWakeUpScreen Component
 *
 * Friendly, high-contrast screen shown when the backend is waking up from sleep
 * (common on free-tier platforms like Render):
 * 1. Animated spinner with warm visual container.
 * 2. Clear friendly heading: "Waking up the server, this can take up to a minute...".
 * 3. Subtitle explaining that the free server sleeps when inactive.
 * 4. Active retry pill with live second ticker and progress bar (up to 90s).
 */

import React from 'react';
import { Loader2, Server, Sparkles } from 'lucide-react';
import { TRANSLATIONS } from '../i18n';

export default function ServerWakeUpScreen({ language = 'en', elapsedSeconds = 0 }) {
  const t = TRANSLATIONS[language] || TRANSLATIONS.en;
  const progressPct = Math.min(100, Math.round((elapsedSeconds / 90) * 100));

  return (
    <div className="flex flex-col items-center justify-center p-8 text-center space-y-6 my-auto min-h-[60vh] animate-fadeIn">
      {/* Icon with smooth spinner */}
      <div className="relative">
        <div className="w-20 h-20 rounded-3xl bg-emerald-50 border-2 border-emerald-300 flex items-center justify-center text-emerald-600 shadow-lg shadow-emerald-600/10">
          <Loader2 className="w-10 h-10 animate-spin text-emerald-600" strokeWidth={2.75} />
        </div>
        <div className="absolute -top-1.5 -right-1.5 w-7 h-7 rounded-full bg-amber-400 text-slate-950 flex items-center justify-center shadow-sm animate-bounce">
          <Sparkles className="w-4 h-4 fill-current" />
        </div>
      </div>

      {/* Main Friendly Heading & Subtitle */}
      <div className="space-y-2.5 max-w-md">
        <h2 className="text-xl sm:text-2xl font-black text-slate-900 leading-snug tracking-tight">
          {t.wakingUpTitle || 'Waking up the server, this can take up to a minute...'}
        </h2>
        <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-medium">
          {t.wakingUpSubtitle ||
            'The free-tier server sleeps when inactive. Connecting and starting it up automatically...'}
        </p>
      </div>

      {/* Retrying Status Pill with Pulsing Dot */}
      <div className="inline-flex items-center gap-2.5 px-4 py-2.5 rounded-2xl bg-emerald-100/80 border border-emerald-300 text-emerald-950 text-xs sm:text-sm font-black shadow-xs">
        <span className="relative flex h-2.5 w-2.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-600"></span>
        </span>
        <span>{t.wakingUpRetrying || 'Retrying automatically every 5 seconds...'}</span>
        {elapsedSeconds > 0 && (
          <span className="text-emerald-800 font-extrabold ml-1 bg-white/70 px-2 py-0.5 rounded-lg text-xs">
            {elapsedSeconds}s / 90s
          </span>
        )}
      </div>

      {/* Progress Bar (0 to 90s) */}
      <div className="w-full max-w-xs space-y-1.5">
        <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden p-0.5 border border-slate-300">
          <div
            className="bg-emerald-500 h-full rounded-full transition-all duration-1000 ease-linear shadow-xs"
            style={{ width: `${Math.max(5, progressPct)}%` }}
          />
        </div>
        <div className="flex justify-between text-[11px] font-bold text-slate-400 px-1">
          <span>0s</span>
          <span>Max 90s</span>
        </div>
      </div>
    </div>
  );
}
