/**
 * DesktopTopBar Component (for md >= 768px)
 *
 * Sits at the top of the main content column across desktop and tablet views.
 * Houses:
 * 1. The Shop Picker dropdown
 * 2. The Refresh data button
 * 3. The WhatsApp Share button
 */

import React from 'react';
import { Store, ChevronDown, RefreshCw } from 'lucide-react';
import { TRANSLATIONS } from '../i18n';
import { openWhatsAppShare } from '../utils/whatsapp';

export default function DesktopTopBar({
  shops = [],
  selectedShopId,
  onSelectShop,
  forecastData,
  topTip,
  language = 'en',
  onRefresh,
  isRefreshing,
}) {
  const t = TRANSLATIONS[language] || TRANSLATIONS.en;

  const handleShare = () => {
    openWhatsAppShare({ forecastData, topTip, language });
  };

  return (
    <header className="hidden md:flex items-center justify-between gap-4 px-6 py-3.5 bg-white border-b border-slate-200 sticky top-0 z-20 shadow-xs">
      {/* Left: Shop Selector Dropdown */}
      <div className="flex items-center gap-3 flex-1 max-w-md">
        <label htmlFor="desktop-shop-picker" className="sr-only">
          {t.selectShop}
        </label>
        <div className="relative w-full flex items-center bg-slate-50 border-2 border-slate-200 hover:border-emerald-500 rounded-2xl px-3 py-1.5 transition-all shadow-inner focus-within:border-emerald-600 focus-within:ring-2 focus-within:ring-emerald-500/20">
          <Store className="w-5 h-5 text-emerald-700 flex-shrink-0 mr-2" strokeWidth={2.5} />
          <select
            id="desktop-shop-picker"
            value={selectedShopId || ''}
            onChange={(e) => onSelectShop(Number(e.target.value))}
            className="w-full bg-transparent font-extrabold text-slate-900 text-sm focus:outline-none cursor-pointer appearance-none pr-8 py-1"
          >
            {shops.map((shop) => (
              <option key={shop.id} value={shop.id}>
                {shop.name} ({shop.shop_type.replace('_', ' ')})
              </option>
            ))}
          </select>
          <ChevronDown className="w-4 h-4 text-slate-500 pointer-events-none absolute right-3" />
        </div>
      </div>

      {/* Right: Refresh & WhatsApp Action Buttons */}
      <div className="flex items-center gap-3">
        {/* Refresh Button */}
        <button
          onClick={onRefresh}
          disabled={isRefreshing}
          className="min-h-[44px] px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 active:scale-95 text-slate-700 hover:text-emerald-800 font-bold text-sm shadow-xs flex items-center gap-2 transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer disabled:opacity-50"
          title="Refresh forecast data"
        >
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-emerald-600' : 'text-slate-500'}`} />
          <span>Refresh</span>
        </button>

        {/* WhatsApp Share Button */}
        <button
          onClick={handleShare}
          className="min-h-[44px] px-4 py-2 bg-[#25D366] hover:bg-[#20bd5a] active:scale-95 text-white font-extrabold text-sm rounded-xl shadow-xs flex items-center gap-2 transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
          aria-label={t.shareWhatsAppBtn}
        >
          <svg
            className="w-4 h-4 fill-current flex-shrink-0"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.888 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
          </svg>
          <span>{t.shareWhatsAppBtn}</span>
        </button>
      </div>
    </header>
  );
}
