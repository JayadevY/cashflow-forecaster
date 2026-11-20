/**
 * EntryFormScreen Component (Tab 2: Add Today)
 *
 * Daily bookkeeping form for shop owners:
 * - Big numeric inputs with rupee symbol
 * - Tracks cash sales, credit given, udhaar collected, expenses, and personal draw
 * - Clear validation with plain-language error reporting
 * - Success view displaying newly calculated closing cash
 */

import React, { useState } from 'react';
import { addDailyEntry } from '../api';
import { formatRupees } from '../utils/formatters';
import { TRANSLATIONS } from '../i18n';
import { CheckCircle2, AlertCircle, ArrowLeft, Send } from 'lucide-react';

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
      <div className="bg-white rounded-3xl p-6 border-2 border-emerald-300 shadow-sm space-y-6 text-center pb-24">
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
          className="w-full min-h-[56px] px-6 py-4 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-black text-lg rounded-2xl shadow-lg flex items-center justify-center gap-3 transition-all"
        >
          <ArrowLeft className="w-6 h-6" strokeWidth={2.5} />
          <span>{t.backToHome}</span>
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-3xl p-5 border-2 border-slate-200 shadow-sm space-y-5 pb-24">
      {/* Title */}
      <div>
        <h2 className="text-xl font-black text-slate-900">
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

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Date picker */}
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
            {t.fieldDate}
          </label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full min-h-[52px] font-bold text-base text-slate-900 bg-slate-50 border-2 border-slate-300 rounded-2xl px-4 py-3 focus:border-emerald-500 focus:bg-white outline-none transition-colors"
            required
          />
        </div>

        {/* Cash Sales */}
        <div>
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
              className="w-full min-h-[52px] font-black text-xl text-slate-900 bg-slate-50 border-2 border-slate-300 rounded-2xl pl-10 pr-4 py-3 focus:border-emerald-500 focus:bg-white outline-none transition-colors"
              required
            />
          </div>
        </div>

        {/* Expenses */}
        <div>
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
              className="w-full min-h-[52px] font-black text-xl text-slate-900 bg-slate-50 border-2 border-slate-300 rounded-2xl pl-10 pr-4 py-3 focus:border-emerald-500 focus:bg-white outline-none transition-colors"
              required
            />
          </div>
        </div>

        {/* Udhaar Given (Credit Given) */}
        <div>
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
              className="w-full min-h-[52px] font-bold text-lg text-slate-900 bg-slate-50 border-2 border-slate-300 rounded-2xl pl-10 pr-4 py-3 focus:border-emerald-500 focus:bg-white outline-none transition-colors"
            />
          </div>
        </div>

        {/* Udhaar Collected */}
        <div>
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
              className="w-full min-h-[52px] font-bold text-lg text-slate-900 bg-slate-50 border-2 border-slate-300 rounded-2xl pl-10 pr-4 py-3 focus:border-emerald-500 focus:bg-white outline-none transition-colors"
            />
          </div>
        </div>

        {/* Owner Withdrawal (Optional) */}
        <div>
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
              className="w-full min-h-[52px] font-bold text-lg text-slate-900 bg-slate-50 border-2 border-slate-300 rounded-2xl pl-10 pr-4 py-3 focus:border-emerald-500 focus:bg-white outline-none transition-colors"
            />
          </div>
        </div>

        {/* Submit Button (min 56px height) */}
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full min-h-[56px] mt-4 px-6 py-4 bg-emerald-600 hover:bg-emerald-700 active:scale-95 disabled:opacity-50 text-white font-black text-lg rounded-2xl shadow-lg flex items-center justify-center gap-3 transition-all"
        >
          <Send className="w-5 h-5" strokeWidth={2.5} />
          <span>{isSubmitting ? t.btnSaving : t.btnSaveEntry}</span>
        </button>
      </form>
    </div>
  );
}
