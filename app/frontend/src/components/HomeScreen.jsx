/**
 * HomeScreen Component (Tab 1)
 *
 * Primary dashboard view displaying:
 * 1. CashMeterCard with current till balance and worst-day alert
 * 2. 7-Day ForecastChart with uncertainty band and threshold line
 * 3. Day-by-day risk breakdown list with accessible status cues
 * 4. Plain-language business insight tips and WhatsApp sharing
 */

import React, { useState, useEffect } from 'react';
import CashMeterCard from './CashMeterCard';
import ForecastChart from './ForecastChart';
import DayRiskList from './DayRiskList';
import TipsCard from './TipsCard';
import { RefreshCw } from 'lucide-react';
import { TRANSLATIONS } from '../i18n';
import { openWhatsAppShare } from '../utils/whatsapp';
import { getShopTips } from '../api';

export default function HomeScreen({
  forecastData,
  language = 'en',
  onRefresh,
  isRefreshing,
}) {
  const t = TRANSLATIONS[language] || TRANSLATIONS.en;
  const [topTip, setTopTip] = useState(null);

  // Fetch top tip from /tips whenever the shop changes or upon refresh
  useEffect(() => {
    let isMounted = true;
    if (forecastData?.shop_id) {
      getShopTips(forecastData.shop_id)
        .then((tips) => {
          if (isMounted && Array.isArray(tips) && tips.length > 0) {
            setTopTip(tips[0]);
          }
        })
        .catch(() => {});
    }
    return () => {
      isMounted = false;
    };
  }, [forecastData?.shop_id, isRefreshing]);

  // Handle WhatsApp button click: ensures top tip from /tips is included
  const handleShareWhatsApp = async () => {
    let tipToUse = topTip;
    if (!tipToUse && forecastData?.shop_id) {
      try {
        const tips = await getShopTips(forecastData.shop_id);
        if (Array.isArray(tips) && tips.length > 0) {
          tipToUse = tips[0];
          setTopTip(tipToUse);
        }
      } catch (_) {}
    }
    openWhatsAppShare({ forecastData, topTip: tipToUse, language });
  };

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

      {/* WhatsApp Share Button (Under the cash meter) */}
      <button
        onClick={handleShareWhatsApp}
        className="w-full min-h-[54px] bg-[#25D366] hover:bg-[#20bd5a] active:scale-98 text-white font-black text-base rounded-2xl shadow-md flex items-center justify-center gap-2.5 transition-all cursor-pointer"
        aria-label={t.shareWhatsAppBtn}
      >
        {/* WhatsApp Brand SVG Icon */}
        <svg
          className="w-6 h-6 fill-current"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.888 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
        </svg>
        <span>{t.shareWhatsAppBtn}</span>
      </button>

      {/* 2. 7-Day Interactive Forecast Chart */}
      <ForecastChart forecastData={forecastData} language={language} />

      {/* 3. Day-by-Day List */}
      <DayRiskList forecast={forecastData?.forecast} language={language} />

      {/* 4. Plain-Language Insight Tips */}
      <TipsCard
        shopId={forecastData?.shop_id}
        language={language}
        isRefreshing={isRefreshing}
        onTopTipLoaded={(tip) => setTopTip(tip)}
      />
    </div>
  );
}
