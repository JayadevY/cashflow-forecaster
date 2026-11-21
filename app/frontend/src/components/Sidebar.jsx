/**
 * Sidebar Component (Desktop Navigation for md >= 768px)
 *
 * Fixed left navigation bar (width 240px) displaying:
 * 1. App logo and localized title
 * 2. 4 main navigation tabs (Home, Add Today, Plan Payment, Udhaar) with icons & active states
 * 3. 3-way language toggle buttons (EN / தமிழ் / हिंदी) at the bottom
 */

import React from 'react';
import { Home, PlusCircle, CalendarClock, BookOpen, CreditCard, Globe } from 'lucide-react';
import { TRANSLATIONS } from '../i18n';

export default function Sidebar({
  activeTab,
  onTabChange,
  language = 'en',
  onSelectLanguage,
}) {
  const t = TRANSLATIONS[language] || TRANSLATIONS.en;

  const navItems = [
    { id: 'home', label: t.tabHome, icon: Home },
    { id: 'payments', label: t.tabPayments, icon: CreditCard },
    { id: 'add', label: t.tabAddToday, icon: PlusCircle },
    { id: 'plan', label: t.tabPlanPayment, icon: CalendarClock },
    { id: 'udhaar', label: t.tabUdhaar, icon: BookOpen },
  ];

  const languages = [
    { code: 'en', label: 'EN' },
    { code: 'ta', label: 'தமிழ்' },
    { code: 'hi', label: 'हिंदी' },
  ];

  return (
    <aside className="w-[240px] flex-shrink-0 bg-white border-r border-slate-200 hidden md:flex flex-col justify-between p-5 sticky top-0 h-screen select-none">
      {/* Top: Logo & Title + Navigation items */}
      <div className="space-y-6">
        {/* App Logo & Brand */}
        <div className="flex items-center gap-3 px-1 py-1">
          <div className="w-10 h-10 rounded-2xl bg-emerald-600 flex items-center justify-center text-white font-black text-xl shadow-md flex-shrink-0">
            ₹
          </div>
          <div>
            <span className="font-black text-base text-slate-900 tracking-tight block leading-snug">
              {t.appTitle}
            </span>
            <span className="text-[11px] font-bold text-slate-400 block tracking-wider uppercase">
              Forecaster
            </span>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="space-y-1.5" aria-label="Main Navigation">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-2xl text-sm font-extrabold transition-all min-h-[44px] focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer ${
                  isActive
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Icon
                  className={`w-5 h-5 flex-shrink-0 ${
                    isActive ? 'text-white stroke-[2.75]' : 'text-slate-500 stroke-[2]'
                  }`}
                />
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Bottom: Language Toggle */}
      <div className="pt-4 border-t border-slate-100">
        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-400 uppercase tracking-wider mb-2.5 px-1">
          <Globe className="w-3.5 h-3.5 text-slate-400" />
          <span>Language</span>
        </div>
        <div className="grid grid-cols-3 gap-1 bg-slate-100 p-1.5 rounded-2xl border border-slate-200">
          {languages.map((lang) => {
            const isActive = language === lang.code;
            return (
              <button
                key={lang.code}
                onClick={() => onSelectLanguage(lang.code)}
                className={`min-h-[38px] text-xs font-bold rounded-xl transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer ${
                  isActive
                    ? 'bg-white text-emerald-800 shadow-sm font-extrabold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                }`}
                aria-label={`Switch to ${lang.label}`}
              >
                {lang.label}
              </button>
            );
          })}
        </div>
      </div>
    </aside>
  );
}
