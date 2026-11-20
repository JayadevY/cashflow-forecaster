/**
 * StatusBadge Component
 *
 * Provides high-contrast, color-blind friendly indicators combining:
 * 1. An unambiguous icon (Check, Triangle, or Octagon)
 * 2. A plain word (Safe, Watch, Danger) translated into the active language
 * 3. Distinct background and border colors
 */

import React from 'react';
import { ShieldCheck, AlertTriangle, AlertOctagon } from 'lucide-react';
import { getStatusCue } from '../utils/formatters';
import { TRANSLATIONS } from '../i18n';

export default function StatusBadge({ alertLevel, language = 'en', size = 'normal' }) {
  const cue = getStatusCue(alertLevel);
  const t = TRANSLATIONS[language] || TRANSLATIONS.en;
  const word = t[cue.wordKey] || cue.type;

  // Icon selector
  let Icon = ShieldCheck;
  if (cue.type === 'watch') Icon = AlertTriangle;
  if (cue.type === 'danger') Icon = AlertOctagon;

  if (size === 'large') {
    return (
      <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl border-2 font-bold shadow-sm ${cue.bgClass}`}>
        <Icon className="w-6 h-6 flex-shrink-0" strokeWidth={2.5} />
        <span className="text-lg tracking-wide uppercase">{word}</span>
      </div>
    );
  }

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-bold ${cue.badgeClass}`}>
      <Icon className="w-4 h-4 flex-shrink-0" strokeWidth={2.5} />
      <span>{word}</span>
    </span>
  );
}
