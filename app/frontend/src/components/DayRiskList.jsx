/**
 * DayRiskList Component
 *
 * Renders the day-by-day 7-day breakdown:
 * - Weekday name & date (e.g. "Tuesday, 3 Nov")
 * - Expected cash (₹)
 * - Risk percentage (0-100%)
 * - Color-blind friendly status badge (Safe / Watch / Danger)
 */

import React from 'react';
import StatusBadge from './StatusBadge';
import { formatRupees, formatFriendlyDate } from '../utils/formatters';
import { TRANSLATIONS } from '../i18n';

export default function DayRiskList({ forecast = [], language = 'en' }) {
  const t = TRANSLATIONS[language] || TRANSLATIONS.en;

  if (!forecast || forecast.length === 0) return null;

  return (
    <div className="bg-white rounded-3xl p-4 border-2 border-slate-200 shadow-sm space-y-3">
      <h3 className="font-extrabold text-slate-900 text-base">
        {t.dayByDay}
      </h3>

      <div className="divide-y divide-slate-100">
        {forecast.map((day) => {
          return (
            <div
              key={day.date}
              className="py-3 flex items-center justify-between gap-2 first:pt-1 last:pb-1"
            >
              {/* Day & Date */}
              <div>
                <div className="font-bold text-slate-900 text-sm">
                  {formatFriendlyDate(day.date)}
                </div>
                <div className="text-xs text-slate-500 font-semibold">
                  Est. Cash: ₹{formatRupees(day.cash_p50)}
                </div>
              </div>

              {/* Risk % & Status Badge */}
              <div className="flex items-center gap-2.5">
                <div className="text-right">
                  <div className="text-xs font-bold text-slate-600">Risk</div>
                  <div
                    className={`font-black text-sm ${
                      day.alert_level === 'red'
                        ? 'text-rose-600'
                        : day.alert_level === 'amber'
                        ? 'text-amber-600'
                        : 'text-emerald-700'
                    }`}
                  >
                    {Math.round(day.risk_pct)}%
                  </div>
                </div>

                <StatusBadge alertLevel={day.alert_level} language={language} size="normal" />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
