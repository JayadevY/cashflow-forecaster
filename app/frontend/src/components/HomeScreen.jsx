/**
 * HomeScreen Component (Tab 1)
 *
 * Primary dashboard view displaying:
 * 1. CashMeterCard with current till balance and worst-day alert
 * 2. 7-Day ForecastChart with uncertainty band and threshold line
 * 3. Day-by-day risk breakdown list with accessible status cues
 */

import React from 'react';
import CashMeterCard from './CashMeterCard';
import ForecastChart from './ForecastChart';
import DayRiskList from './DayRiskList';
import TipsCard from './TipsCard';
import { RefreshCw } from 'lucide-react';

export default function HomeScreen({
  forecastData,
  language = 'en',
  onRefresh,
  isRefreshing,
}) {
  return (
    <div className="space-y-4 pb-20">
      {/* Top action row */}
      <div className="flex items-center justify-between px-1">
        <span className="text-xs font-black text-slate-400 tracking-wider uppercase">
          {forecastData?.shop_name || 'Daily Dashboard'}
        </span>
        <button
          onClick={onRefresh}
          disabled={isRefreshing}
          className="flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-emerald-700 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-sm transition-all active:scale-95 disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-emerald-600' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* 1. Cash Meter Card */}
      <CashMeterCard forecastData={forecastData} language={language} />

      {/* 2. 7-Day Interactive Forecast Chart */}
      <ForecastChart forecastData={forecastData} language={language} />

      {/* 3. Day-by-Day List */}
      <DayRiskList forecast={forecastData?.forecast} language={language} />

      {/* 4. Plain-Language Insight Tips */}
      <TipsCard
        shopId={forecastData?.shop_id}
        language={language}
        isRefreshing={isRefreshing}
      />
    </div>
  );
}
