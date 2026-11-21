/**
 * EntryFormScreen Component (Tab 2: Add Today)
 *
 * Daily bookkeeping form for shop owners:
 * - Big numeric inputs with rupee symbol
 * - Tracks cash sales, credit given, udhaar collected, expenses, and personal draw
 * - Clear validation with plain-language error reporting
 * - Success view displaying newly calculated closing cash
 *
 * Responsive on md and up:
 * - Centered in a card with max width 640px
 * - Form fields arranged in a 2-column grid
 * - 44px controls with hover & focus rings on desktop (56px touch targets on mobile)
 */

import React, { useState } from 'react';
import { addDailyEntry } from '../api';
import { formatRupees } from '../utils/formatters';
import { TRANSLATIONS } from '../i18n';
import { CheckCircle2, AlertCircle, ArrowLeft, Send, Loader2 } from 'lucide-react';

export default function EntryFormScreen({
  shopId,
  defaultDate,
  language = 'en',
  onSuccessReturnHome,
}) {
  const t = TRANSLATIONS[language] || TRANSLATIONS.en;

  // Initialize date default (ISO YYYY-MM-DD)
  const todayStr = new Date().toISOString().split('T')[0];
  const initialDate = defaultDate || todayStr;

  const [date, setDate] = useState(initialDate);
  const [cashSales, setCashSales] = useState('');
  const [creditGiven, setCreditGiven] = useState('');
  const [udhaarCollected, setUdhaarCollected] = useState('');
  const [expenses, setExpenses] = useState('');
  const [ownerWithdrawal, setOwnerWithdrawal] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [savedResult, setSavedResult] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage(null);

    // Basic client checks
    if (!cashSales || Number(cashSales) < 0) {
      setErrorMessage('Please enter today’s cash sales (must be 0 or more).');
      return;
    }
    if (!expenses || Number(expenses) < 0) {
      setErrorMessage('Please enter today’s expenses (must be 0 or more).');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        date: date,
        cash_sales: parseFloat(cashSales) || 0,
        credit_given: parseFloat(creditGiven) || 0,
        udhaar_collected: parseFloat(udhaarCollected) || 0,
        expenses: parseFloat(expenses) || 0,
        owner_withdrawal: parseFloat(ownerWithdrawal) || 0,
      };

      const result = await addDailyEntry(shopId, payload);
      setSavedResult(result);
    } catch (err) {
      setErrorMessage(err.message || 'Could not save today’s entry. Please check the values.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // If successfully saved, display high-contrast success screen
  if (savedResult) {
    return (
      <div className="max-w-[640px] mx-auto bg-white rounded-3xl p-6 md:p-8 border-2 border-emerald-300 shadow-sm space-y-6 text-center pb-24 md:pb-8 animate-fadeIn">
        <div className="w-20 h-20 bg-emerald-100 rounded-3xl mx-auto flex items-center justify-center text-emerald-600 shadow-inner">
          <CheckCircle2 className="w-12 h-12" strokeWidth={2.5} />
        </div>

        <div className="space-y-2">
          <h2 className="text-2xl font-black text-slate-900">
            {t.entrySuccessTitle}
          </h2>
          <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">
            {savedResult.date}
          </p>
        </div>

        <div className="bg-emerald-50 rounded-2xl p-5 border-2 border-emerald-200">
          <div className="text-xs font-bold text-emerald-800 uppercase tracking-wide">
            {t.entrySuccessClosing}
          </div>
          <div className="text-4xl font-black text-emerald-950 mt-1">
            ₹{formatRupees(savedResult.closing_cash)}
          </div>
        </div>

        <button
          onClick={onSuccessReturnHome}
          className="w-full min-h-[56px] md:min-h-[44px] px-6 py-4 md:py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-black text-lg md:text-base rounded-2xl shadow-md flex items-center justify-center gap-3 transition-all focus:ring-2 focus:ring-emerald-500 cursor-pointer"
        >
          <ArrowLeft className="w-5 h-5" strokeWidth={2.5} />
          <span>{t.backToHome}</span>
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-[640px] mx-auto bg-white rounded-3xl p-5 md:p-8 border-2 border-slate-200 shadow-sm space-y-5 pb-24 md:pb-8">
      {/* Title */}
      <div>
        <h2 className="text-xl md:text-2xl font-black text-slate-900">
          {t.addTodayTitle}
        </h2>
        <p className="text-xs text-slate-500 font-medium mt-0.5">
          {t.addTodaySubtitle}
        </p>
      </div>

      {/* Error message banner */}
      {errorMessage && (
        <div className="p-4 bg-rose-50 border-2 border-rose-300 rounded-2xl flex items-start gap-3 text-rose-900 text-sm">
          <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-600 mt-0.5" strokeWidth={2.5} />
          <div className="font-semibold leading-snug">{errorMessage}</div>
        </div>
      )}

      {/* Form (2-column grid on md and up) */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Date picker (Full width across 2 columns) */}
          <div className="col-span-1 md:col-span-2">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              {t.fieldDate}
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full min-h-[52px] md:min-h-[44px] font-bold text-base md:text-sm text-slate-900 bg-slate-50 border-2 border-slate-300 rounded-2xl px-4 py-3 md:py-2 focus:border-emerald-500 focus:bg-white outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all"
              required
            />
          </div>

          {/* Cash Sales */}
          <div className="col-span-1">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              {t.fieldCashSales} <span className="text-rose-500">*</span>
            </label>
            <div className="relative flex items-center">
              <span className="absolute left-4 text-xl font-black text-slate-400">₹</span>
              <input
                type="number"
                inputMode="numeric"
                placeholder="0"
                value={cashSales}
                onChange={(e) => setCashSales(e.target.value)}
                className="w-full min-h-[52px] md:min-h-[44px] font-black text-xl md:text-base text-slate-900 bg-slate-50 border-2 border-slate-300 rounded-2xl pl-10 pr-4 py-3 md:py-2 focus:border-emerald-500 focus:bg-white outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all"
                required
              />
            </div>
          </div>

          {/* Expenses */}
          <div className="col-span-1">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              {t.fieldExpenses} <span className="text-rose-500">*</span>
            </label>
            <div className="relative flex items-center">
              <span className="absolute left-4 text-xl font-black text-slate-400">₹</span>
              <input
                type="number"
                inputMode="numeric"
                placeholder="0"
                value={expenses}
                onChange={(e) => setExpenses(e.target.value)}
                className="w-full min-h-[52px] md:min-h-[44px] font-black text-xl md:text-base text-slate-900 bg-slate-50 border-2 border-slate-300 rounded-2xl pl-10 pr-4 py-3 md:py-2 focus:border-emerald-500 focus:bg-white outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all"
                required
              />
            </div>
          </div>

          {/* Udhaar Given (Credit Given) */}
          <div className="col-span-1">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              {t.fieldCreditGiven}
            </label>
            <div className="relative flex items-center">
              <span className="absolute left-4 text-xl font-black text-slate-400">₹</span>
              <input
                type="number"
                inputMode="numeric"
                placeholder="0"
                value={creditGiven}
                onChange={(e) => setCreditGiven(e.target.value)}
                className="w-full min-h-[52px] md:min-h-[44px] font-bold text-lg md:text-sm text-slate-900 bg-slate-50 border-2 border-slate-300 rounded-2xl pl-10 pr-4 py-3 md:py-2 focus:border-emerald-500 focus:bg-white outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all"
              />
            </div>
          </div>

          {/* Udhaar Collected */}
          <div className="col-span-1">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              {t.fieldUdhaarCollected}
            </label>
            <div className="relative flex items-center">
              <span className="absolute left-4 text-xl font-black text-slate-400">₹</span>
              <input
                type="number"
                inputMode="numeric"
                placeholder="0"
                value={udhaarCollected}
                onChange={(e) => setUdhaarCollected(e.target.value)}
                className="w-full min-h-[52px] md:min-h-[44px] font-bold text-lg md:text-sm text-slate-900 bg-slate-50 border-2 border-slate-300 rounded-2xl pl-10 pr-4 py-3 md:py-2 focus:border-emerald-500 focus:bg-white outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all"
              />
            </div>
          </div>

          {/* Owner Withdrawal (Optional) */}
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                {t.fieldOwnerWithdrawal}
              </label>
              <span className="text-[11px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                {t.optionalTag}
              </span>
            </div>
            <div className="relative flex items-center">
              <span className="absolute left-4 text-xl font-black text-slate-400">₹</span>
              <input
                type="number"
                inputMode="numeric"
                placeholder="0"
                value={ownerWithdrawal}
                onChange={(e) => setOwnerWithdrawal(e.target.value)}
                className="w-full min-h-[52px] md:min-h-[44px] font-bold text-lg md:text-sm text-slate-900 bg-slate-50 border-2 border-slate-300 rounded-2xl pl-10 pr-4 py-3 md:py-2 focus:border-emerald-500 focus:bg-white outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all"
              />
            </div>
          </div>

          {/* Submit Button */}
          <div className="col-span-1 md:col-span-2 pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full min-h-[56px] md:min-h-[44px] px-6 py-4 md:py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 disabled:opacity-50 text-white font-black text-lg md:text-base rounded-2xl shadow-md flex items-center justify-center gap-3 transition-all focus:ring-2 focus:ring-emerald-500 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" strokeWidth={2.5} />
                  <span>{t.btnSaving}</span>
                </>
              ) : (
                <>
                  <Send className="w-5 h-5" strokeWidth={2.5} />
                  <span>{t.btnSaveEntry}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
