/**
 * BottomNav Component
 *
 * Fixed bottom navigation bar with 4 tabs:
 * 1. Home
 * 2. Add Today
 * 3. Plan Payment
 * 4. Udhaar (Customer Credit Tracker)
 *
 * Features large touch targets (min 56px height) and bold icons with clear labels.
 */

import React from 'react';
import { Home, PlusCircle, CalendarClock, BookOpen } from 'lucide-react';
import { TRANSLATIONS } from '../i18n';

export default function BottomNav({ activeTab, onTabChange, language = 'en' }) {
  const t = TRANSLATIONS[language] || TRANSLATIONS.en;

  const tabs = [
    { id: 'home', label: t.tabHome, icon: Home },
    { id: 'add', label: t.tabAddToday, icon: PlusCircle },
    { id: 'plan', label: t.tabPlanPayment, icon: CalendarClock },
    { id: 'udhaar', label: t.tabUdhaar, icon: BookOpen },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-slate-200 shadow-[0_-4px_12px_rgba(0,0,0,0.06)]">
      <div className="max-w-[480px] mx-auto grid grid-cols-4 gap-1 px-1 py-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`min-h-[56px] flex flex-col items-center justify-center rounded-2xl py-1 px-1 transition-all active:scale-95 ${
                isActive
                  ? 'bg-emerald-50 text-emerald-800 font-extrabold shadow-sm'
                  : 'text-slate-500 hover:text-slate-800 font-semibold'
              }`}
            >
              <Icon
                className={`w-5 h-5 mb-1 ${isActive ? 'text-emerald-700 stroke-[2.75]' : 'stroke-[2]'}`}
              />
              <span className={`text-[11px] leading-tight tracking-tight text-center truncate w-full ${isActive ? 'text-emerald-900 font-bold' : ''}`}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
