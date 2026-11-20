/**
 * TipsCard Component
 *
 * Displays plain-language business insight tips for shopkeepers on the Home screen:
 * - Best/worst selling weekdays
 * - Weekend vs weekday comparisons
 * - First week of month salary days boost
 * - Upcoming rent warning (keep Rs X ready)
 * - Tight cash warning (worst day risk)
 * - Overdue udhaar recovery impact
 * - Expense trend changes (>10%)
 *
 * Each tip shows its icon, a severity badge (Info / Watch / Danger), and the translated sentence.
 */

import React, { useState, useEffect } from 'react';
import { getShopTips } from '../api';
import { TRANSLATIONS, renderTipSentence } from '../i18n';
import {
  Lightbulb,
  Calendar,
  Sun,
  Briefcase,
  Award,
  CalendarCheck,
  Home,
  AlertTriangle,
  BookOpen,
  TrendingUp,
  TrendingDown,
  Info,
  AlertOctagon,
  Sparkles,
} from 'lucide-react';

/**
 * Return matching Lucide icon component based on backend icon identifier.
 */
function getTipIcon(iconName) {
  switch (iconName) {
    case 'calendar':
      return Calendar;
    case 'sun':
      return Sun;
    case 'briefcase':
      return Briefcase;
    case 'award':
      return Award;
    case 'calendar-check':
      return CalendarCheck;
    case 'home':
      return Home;
    case 'alert-triangle':
      return AlertTriangle;
    case 'book-open':
      return BookOpen;
    case 'trending-up':
      return TrendingUp;
    case 'trending-down':
      return TrendingDown;
    default:
      return Lightbulb;
  }
}

/**
 * Return badge visual cues (colors, label, icon) based on severity level.
 */
function getSeverityBadge(severity, t) {
  const sev = (severity || 'info').toLowerCase();
  if (sev === 'danger') {
    return {
      label: t.severityDanger || 'Danger',
      containerClass: 'bg-rose-100 text-rose-800 border-rose-300',
      icon: AlertOctagon,
    };
  }
  if (sev === 'watch') {
    return {
      label: t.severityWatch || 'Watch',
      containerClass: 'bg-amber-100 text-amber-900 border-amber-300',
      icon: AlertTriangle,
    };
  }
  return {
    label: t.severityInfo || 'Info',
    containerClass: 'bg-sky-100 text-sky-800 border-sky-300',
    icon: Info,
  };
}

export default function TipsCard({ shopId, language = 'en', isRefreshing }) {
  const t = TRANSLATIONS[language] || TRANSLATIONS.en;
  const [tips, setTips] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchTips = async (id) => {
    if (!id) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await getShopTips(id);
      setTips(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || 'Could not load tips');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTips(shopId);
  }, [shopId, isRefreshing]);

  // If there's an error and no tips, render nothing to stay non-intrusive
  if (error && tips.length === 0) {
    return null;
  }

  // If loading for the first time without any tips
  if (isLoading && tips.length === 0) {
    return (
      <div className="bg-white rounded-3xl p-5 border-2 border-slate-200 shadow-sm animate-pulse">
        <div className="h-4 bg-slate-200 rounded w-1/3 mb-3"></div>
        <div className="h-12 bg-slate-100 rounded-2xl"></div>
      </div>
    );
  }

  if (tips.length === 0) {
    return null;
  }

  return (
    <div className="bg-white rounded-3xl p-5 border-2 border-slate-200 shadow-sm space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <div className="p-2 bg-emerald-100 text-emerald-800 rounded-xl">
          <Lightbulb className="w-5 h-5" strokeWidth={2.5} />
        </div>
        <div>
          <h3 className="font-extrabold text-slate-900 text-base leading-tight">
            {t.tipsTitle}
          </h3>
          <p className="text-xs text-slate-500 font-medium">
            {t.tipsSubtitle}
          </p>
        </div>
      </div>

      {/* List of Tips */}
      <div className="space-y-3">
        {tips.map((tip, idx) => {
          const IconComp = getTipIcon(tip.icon);
          const badge = getSeverityBadge(tip.severity, t);
          const BadgeIcon = badge.icon;
          const sentence = renderTipSentence(tip, language);

          return (
            <div
              key={tip.id || idx}
              className="p-3.5 bg-slate-50 border-2 border-slate-200 rounded-2xl flex items-start gap-3 transition-all"
            >
              {/* Tip Icon */}
              <div className="p-2 bg-white border border-slate-200 rounded-xl text-slate-700 shadow-xs flex-shrink-0 mt-0.5">
                <IconComp className="w-4 h-4 text-slate-700" strokeWidth={2.5} />
              </div>

              {/* Tip Content */}
              <div className="flex-1 space-y-1.5 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={`inline-flex items-center gap-1 text-[11px] font-black px-2 py-0.5 rounded-md border uppercase tracking-wider ${badge.containerClass}`}
                  >
                    <BadgeIcon className="w-3 h-3 flex-shrink-0" strokeWidth={2.5} />
                    <span>{badge.label}</span>
                  </span>
                </div>

                <p className="text-xs sm:text-sm font-bold text-slate-800 leading-snug">
                  {sentence}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
