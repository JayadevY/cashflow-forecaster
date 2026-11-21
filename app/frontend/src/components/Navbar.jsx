/**
 * Navbar Component
 *
 * Sits at the top of the mobile screen.
 * Includes:
 * 1. App logo and title
 * 2. Shop selection dropdown (loads shops from /shops)
 * 3. 3-way language toggle buttons: EN / தமிழ் / हिंदी
 */

import React from 'react';
import { Store, Globe, ChevronDown } from 'lucide-react';
import { TRANSLATIONS } from '../i18n';

export default function Navbar({
  shops = [],
  selectedShopId,
  onSelectShop,
  language = 'en',
  onSelectLanguage,
}) {
  const t = TRANSLATIONS[language] || TRANSLATIONS.en;

  const languages = [
    { code: 'en', label: 'EN' },
    { code: 'ta', label: 'தமிழ்' },
    { code: 'hi', label: 'हिंदी' },
  ];

  return (
    <header className="md:hidden bg-white border-b border-slate-200 px-4 py-3 sticky top-0 z-30 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        {/* App Title with Icon */}
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-emerald-600 flex items-center justify-center text-white font-black text-lg shadow-sm">
            ₹
          </div>
          <span className="font-black text-base tracking-tight text-slate-900 hidden sm:inline">
            {t.appTitle}
          </span>
        </div>

        {/* Language Toggle: EN / தமிழ் / हिंदी */}
        <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
          {languages.map((lang) => {
            const isActive = language === lang.code;
            return (
              <button
                key={lang.code}
                onClick={() => onSelectLanguage(lang.code)}
                className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all ${
                  isActive
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                aria-label={`Switch to ${lang.label}`}
              >
                {lang.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Shop Selector Dropdown */}
      <div className="mt-3 relative">
        <label htmlFor="shop-picker" className="sr-only">
          {t.selectShop}
        </label>
        <div className="flex items-center bg-slate-50 border-2 border-slate-300 hover:border-emerald-500 rounded-2xl px-3 py-2 shadow-inner transition-colors">
          <Store className="w-5 h-5 text-emerald-700 flex-shrink-0 mr-2" strokeWidth={2.5} />
          <select
            id="shop-picker"
            value={selectedShopId || ''}
            onChange={(e) => onSelectShop(Number(e.target.value))}
            className="w-full bg-transparent font-bold text-slate-900 text-base focus:outline-none cursor-pointer appearance-none pr-8 py-0.5"
          >
            {shops.map((shop) => (
              <option key={shop.id} value={shop.id}>
                {shop.name} ({shop.shop_type.replace('_', ' ')})
              </option>
            ))}
          </select>
          <ChevronDown className="w-5 h-5 text-slate-500 pointer-events-none absolute right-3" />
        </div>
      </div>
    </header>
  );
}
