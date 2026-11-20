/**
 * CashMeterCard Component
 *
 * The primary status card on the Home screen.
 * Displays:
 * 1. Current cash in till (huge, high-contrast Indian rupee numbers).
 * 2. The safety line (threshold).
 * 3. Color-blind friendly status badge (Safe / Watch / Danger) evaluated from the WORST day in the next 7 days.
 * 4. One plain warning/safety sentence (using alert_message from that worst day).
 * 5. Notice: "Based on data up to <data_ends_on>".
 */

import React from 'react';
import { ShieldCheck, AlertTriangle, AlertOctagon, Info, Wallet, Shield } from 'lucide-react';
import StatusBadge from './StatusBadge';
import { formatRupees } from '../utils/formatters';
import { TRANSLATIONS } from '../i18n';

export default function CashMeterCard({ forecastData, language = 'en' }) {
  const t = TRANSLATIONS[language] || TRANSLATIONS.en;

  if (!forecastData) return null;

  const { start_cash, threshold, forecast = [], data_ends_on, mode } = forecastData;

  // Identify the WORST day in the next 7 days
  const rankMap = { red: 3, amber: 2, green: 1 };
  let worstDay = forecast[0] || null;

  for (const day of forecast) {
    const rCurrent = rankMap[day.alert_level] || 0;
    const rWorst = rankMap[worstDay.alert_level] || 0;
    if (rCurrent > rWorst || (rCurrent === rWorst && day.risk_pct > worstDay.risk_pct)) {
      worstDay = day;
    }
  }

  const worstLevel = worstDay ? worstDay.alert_level : 'green';
  const worstMessage = worstDay ? worstDay.alert_message : 'Cash is safe for the week.';

  return (
    <div className="bg-white rounded-3xl p-5 border-2 border-slate-200 shadow-sm space-y-4">
      {/* Top row: Status Badge & Mode pill */}
      <div className="flex items-center justify-between gap-2">
        <StatusBadge alertLevel={worstLevel} language={language} size="large" />
        {mode === 'basic' && (
          <span className="text-[11px] font-bold bg-amber-100 text-amber-900 px-2.5 py-1 rounded-full border border-amber-300">
            {t.modeBasicNotice}
          </span>
        )}
      </div>

      {/* Main Cash Display */}
      <div className="space-y-1">
        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500 uppercase tracking-wider">
          <Wallet className="w-4 h-4 text-emerald-600" />
          <span>{t.currentCash}</span>
        </div>
        <div className="text-4xl sm:text-5xl font-black text-slate-900 tracking-tight">
          ₹{formatRupees(start_cash)}
        </div>
      </div>

      {/* Safety Threshold Line */}
      <div className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl border border-slate-200 text-sm">
        <div className="flex items-center gap-2 text-slate-700 font-bold">
          <Shield className="w-4 h-4 text-slate-500" />
          <span>{t.safetyThreshold}</span>
        </div>
        <div className="font-extrabold text-slate-900 text-base">
          ₹{formatRupees(threshold)}
        </div>
      </div>

      {/* Plain Language Alert Sentence from Worst Day */}
      <div className="p-3.5 rounded-2xl bg-slate-100 border border-slate-200 text-slate-800 font-medium text-sm leading-relaxed">
        {worstMessage}
      </div>

      {/* Notice: Based on data up to <data_ends_on> */}
      {data_ends_on && (
        <div className="flex items-center gap-1.5 text-xs text-slate-500 font-semibold pt-1">
          <Info className="w-3.5 h-3.5 flex-shrink-0 text-slate-400" />
          <span>
            {t.dataUpTo} <strong className="text-slate-700">{data_ends_on}</strong>
          </span>
        </div>
      )}
    </div>
  );
}
