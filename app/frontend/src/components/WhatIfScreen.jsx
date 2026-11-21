/**
 * WhatIfScreen Component (Tab 3: Plan Payment)
 *
 * Helps the shop owner test a future payment before paying:
 * 1. Date picker limited to the 7-day forecast window
 * 2. Amount input with Indian rupee formatting
 * 3. "Check" button to evaluate cash risk
 * 4. Verdict card: ok / better_day_exists / too_large with recommendation
 * 5. max_safe_amount: "You can safely pay up to Rs X on this day"
 * 6. "Add to my plan" button that POSTs to /shops/{id}/planned-payments
 * 7. List of existing planned payments with delete button
 *
 * Responsive on lg and up:
 * - Left column (5/12): Form + Planned payments list
 * - Right column (7/12): Verdict result card (or helpful guidance placeholder)
 */

import React, { useState, useEffect } from 'react';
import { checkWhatIf, getPlannedPayments, addPlannedPayment, deletePlannedPayment } from '../api';
import { formatRupees, formatFriendlyDate } from '../utils/formatters';
import { TRANSLATIONS } from '../i18n';
import {
  Calculator,
  Search,
  CheckCircle2,
  AlertTriangle,
  AlertOctagon,
  Plus,
  Trash2,
  Calendar,
  AlertCircle,
  Loader2,
} from 'lucide-react';

export default function WhatIfScreen({
  shopId,
  forecastData,
  language = 'en',
  onPlanUpdated,
}) {
  const t = TRANSLATIONS[language] || TRANSLATIONS.en;

  const forecast = forecastData?.forecast || [];
  const minDate = forecast[0]?.date || '';
  const maxDate = forecast[forecast.length - 1]?.date || '';

  const [date, setDate] = useState(forecast[1]?.date || minDate || '');
  const [amount, setAmount] = useState('');
  const [isChecking, setIsChecking] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [result, setResult] = useState(null);

  // Planned payments list
  const [plannedList, setPlannedList] = useState([]);
  const [isLoadingPlans, setIsLoadingPlans] = useState(false);
  const [isAddingPlan, setIsAddingPlan] = useState(false);
  const [planSuccessNote, setPlanSuccessNote] = useState(null);

  // Load existing planned payments for this shop
  const loadPlannedPayments = async () => {
    if (!shopId) return;
    setIsLoadingPlans(true);
    try {
      const data = await getPlannedPayments(shopId);
      setPlannedList(data || []);
    } catch (err) {
      console.error('Failed to load planned payments', err);
    } finally {
      setIsLoadingPlans(false);
    }
  };

  useEffect(() => {
    loadPlannedPayments();
    if (!date && minDate) {
      setDate(minDate);
    }
  }, [shopId, minDate]);

  // Check what-if risk
  const handleCheck = async (e) => {
    e.preventDefault();
    setErrorMessage(null);
    setPlanSuccessNote(null);

    const numAmount = parseFloat(amount);
    if (!numAmount || numAmount <= 0) {
      setErrorMessage('Please enter an amount greater than 0.');
      return;
    }
    if (!date) {
      setErrorMessage('Please select a payment date.');
      return;
    }

    setIsChecking(true);
    try {
      const res = await checkWhatIf(shopId, date, numAmount);
      setResult(res);
    } catch (err) {
      setErrorMessage(err.message || 'Could not evaluate payment risk.');
    } finally {
      setIsChecking(false);
    }
  };

  // Add checked payment to shop's planned payments
  const handleAddToPlan = async () => {
    if (!result || !date || !amount) return;
    setIsAddingPlan(true);
    setErrorMessage(null);
    try {
      await addPlannedPayment(shopId, {
        date: date,
        amount: parseFloat(amount),
        note: `Planned bill checked on ${date}`,
      });
      setPlanSuccessNote(`Added ₹${formatRupees(amount)} on ${date} to your payment plan!`);
      await loadPlannedPayments();
      if (onPlanUpdated) {
        onPlanUpdated();
      }
    } catch (err) {
      setErrorMessage(err.message || 'Could not add to planned payments.');
    } finally {
      setIsAddingPlan(false);
    }
  };

  // Delete an existing planned payment
  const handleDeletePlan = async (paymentId) => {
    try {
      await deletePlannedPayment(shopId, paymentId);
      await loadPlannedPayments();
      if (onPlanUpdated) {
        onPlanUpdated();
      }
    } catch (err) {
      setErrorMessage(err.message || 'Could not delete planned payment.');
    }
  };

  // Color mapping and title for verdicts
  const getVerdictCardStyle = (verdict) => {
    if (verdict === 'ok') {
      return {
        bg: 'bg-emerald-50 border-emerald-300 text-emerald-950',
        badge: 'bg-emerald-600 text-white',
        icon: CheckCircle2,
        title: t.verdict_ok,
      };
    }
    if (verdict === 'better_day_exists') {
      return {
        bg: 'bg-amber-50 border-amber-300 text-amber-950',
        badge: 'bg-amber-500 text-white',
        icon: AlertTriangle,
        title: t.verdict_better_day_exists,
      };
    }
    return {
      bg: 'bg-rose-50 border-rose-300 text-rose-950',
      badge: 'bg-rose-600 text-white',
      icon: AlertOctagon,
      title: t.verdict_too_large,
    };
  };

  // Sub-element 1: Form Card
  const formCard = (
    <div className="bg-white rounded-3xl p-5 border-2 border-slate-200 shadow-sm space-y-4">
      <div>
        <h2 className="text-xl font-black text-slate-900">
          {t.whatIfTitle}
        </h2>
        <p className="text-xs text-slate-500 font-medium mt-0.5">
          {t.whatIfSubtitle}
        </p>
      </div>

      {/* Error banner */}
      {errorMessage && (
        <div className="p-4 bg-rose-50 border-2 border-rose-300 rounded-2xl flex items-start gap-3 text-rose-900 text-sm">
          <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-600 mt-0.5" strokeWidth={2.5} />
          <div className="font-semibold leading-snug">{errorMessage}</div>
        </div>
      )}

      {/* Plan addition success banner */}
      {planSuccessNote && (
        <div className="p-4 bg-emerald-50 border-2 border-emerald-300 rounded-2xl flex items-start gap-3 text-emerald-900 text-sm">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-emerald-600 mt-0.5" strokeWidth={2.5} />
          <div className="font-bold leading-snug">{planSuccessNote}</div>
        </div>
      )}

      {/* Check Form */}
      <form onSubmit={handleCheck} className="space-y-4">
        {/* Amount input */}
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
            {t.whatIfAmount} <span className="text-rose-500">*</span>
          </label>
          <div className="relative flex items-center">
            <span className="absolute left-4 text-xl font-black text-slate-400">₹</span>
            <input
              type="number"
              inputMode="numeric"
              placeholder="e.g. 15000"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full min-h-[52px] md:min-h-[44px] font-black text-xl md:text-base text-slate-900 bg-slate-50 border-2 border-slate-300 rounded-2xl pl-10 pr-4 py-3 md:py-2 focus:border-emerald-500 focus:bg-white outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all"
              required
            />
          </div>
        </div>

        {/* Date picker limited to 7-day forecast window */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              {t.whatIfDate} <span className="text-rose-500">*</span>
            </label>
            {minDate && maxDate && (
              <span className="text-[11px] font-bold text-slate-400">
                {minDate} to {maxDate}
              </span>
            )}
          </div>
          <input
            type="date"
            min={minDate}
            max={maxDate}
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full min-h-[52px] md:min-h-[44px] font-bold text-base md:text-sm text-slate-900 bg-slate-50 border-2 border-slate-300 rounded-2xl px-4 py-3 md:py-2 focus:border-emerald-500 focus:bg-white outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all"
            required
          />
        </div>

        {/* Check Button */}
        <button
          type="submit"
          disabled={isChecking}
          className="w-full min-h-[56px] md:min-h-[44px] px-6 py-4 md:py-2.5 bg-slate-900 hover:bg-black active:scale-95 disabled:opacity-50 text-white font-black text-lg md:text-base rounded-2xl shadow-md flex items-center justify-center gap-3 transition-all focus:ring-2 focus:ring-emerald-500 cursor-pointer"
        >
          {isChecking ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" strokeWidth={2.5} />
              <span>{t.btnChecking}</span>
            </>
          ) : (
            <>
              <Search className="w-5 h-5" strokeWidth={2.5} />
              <span>{t.btnCheckRisk}</span>
            </>
          )}
        </button>
      </form>
    </div>
  );

  // Sub-element 2: Verdict Result Card
  const verdictCard = result ? (
    <div
      className={`rounded-3xl p-5 border-2 shadow-sm space-y-4 animate-fadeIn ${
        getVerdictCardStyle(result.verdict).bg
      }`}
    >
      {/* Verdict Badge */}
      <div className="flex items-center justify-between">
        {React.createElement(getVerdictCardStyle(result.verdict).icon, {
          className: 'w-7 h-7 flex-shrink-0',
          strokeWidth: 2.5,
        })}
        <span
          className={`px-3 py-1 rounded-xl text-xs font-black uppercase tracking-wider shadow-xs ${
            getVerdictCardStyle(result.verdict).badge
          }`}
        >
          {getVerdictCardStyle(result.verdict).title}
        </span>
      </div>

      {/* Recommendation sentence */}
      <p className="text-base font-bold leading-relaxed">
        {result.recommendation}
      </p>

      {/* Comparison Stats */}
      <div className="grid grid-cols-2 gap-2 text-xs pt-1">
        <div className="bg-white/80 p-3 rounded-2xl border border-black/5">
          <span className="text-slate-500 font-bold block">{t.currentRiskTitle}</span>
          <span className="text-lg font-black">{Math.round(result.current_date_peak_risk)}%</span>
        </div>
        <div className="bg-white/80 p-3 rounded-2xl border border-black/5">
          <span className="text-slate-500 font-bold block">{t.safestDayTitle}</span>
          <span className="text-sm font-black text-emerald-800">
            {formatFriendlyDate(result.safest_day)} ({Math.round(result.safest_day_peak_risk)}%)
          </span>
        </div>
      </div>

      {/* max_safe_amount notice */}
      {result.max_safe_amount !== undefined && (
        <div className="p-3.5 bg-white rounded-2xl border border-black/5 text-sm font-semibold text-slate-800">
          {t.maxSafeLabel}{' '}
          <strong className="text-emerald-700 font-black text-base">
            ₹{formatRupees(result.max_safe_amount)}
          </strong>{' '}
          {t.onThisDay}
        </div>
      )}

      {/* Add to my plan button */}
      <button
        onClick={handleAddToPlan}
        disabled={isAddingPlan}
        className="w-full min-h-[56px] md:min-h-[44px] px-6 py-4 md:py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 disabled:opacity-50 text-white font-black text-lg md:text-base rounded-2xl shadow-md flex items-center justify-center gap-3 transition-all focus:ring-2 focus:ring-emerald-500 cursor-pointer"
      >
        <Plus className="w-5 h-5" strokeWidth={2.5} />
        <span>{isAddingPlan ? t.btnAddingPlan : t.btnAddPlan}</span>
      </button>
    </div>
  ) : (
    // Desktop placeholder when no scenario has been checked yet
    <div className="bg-white rounded-3xl p-8 border-2 border-slate-200 shadow-sm flex flex-col items-center justify-center text-center space-y-3 min-h-[300px]">
      <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shadow-inner">
        <Calculator className="w-7 h-7" strokeWidth={2} />
      </div>
      <h3 className="font-extrabold text-slate-800 text-base">Check Before You Spend</h3>
      <p className="text-sm text-slate-500 max-w-sm leading-relaxed">
        Enter an amount and select a payment date to test if your cash drawer stays safe, or discover if another day is better.
      </p>
    </div>
  );

  // Sub-element 3: Existing Planned Payments List
  const plannedPaymentsCard = (
    <div className="bg-white rounded-3xl p-5 border-2 border-slate-200 shadow-sm space-y-3">
      <h3 className="font-extrabold text-slate-900 text-base">
        {t.plannedListTitle}
      </h3>

      {isLoadingPlans ? (
        <div className="py-6 text-center text-xs text-slate-400 font-bold">
          Loading upcoming payments...
        </div>
      ) : plannedList.length === 0 ? (
        <p className="text-xs text-slate-400 font-semibold py-3 text-center">
          {t.noPlannedPayments}
        </p>
      ) : (
        <div className="divide-y divide-slate-100">
          {plannedList.map((plan) => (
            <div key={plan.id} className="py-3 flex items-center justify-between gap-2">
              <div>
                <div className="font-bold text-slate-900 text-sm">
                  {formatFriendlyDate(plan.date)}
                </div>
                {plan.note && (
                  <div className="text-xs text-slate-500 font-medium truncate max-w-[200px]">
                    {plan.note}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-3">
                <div className="text-right font-black text-base text-slate-900">
                  ₹{formatRupees(plan.amount)}
                </div>
                <button
                  onClick={() => handleDeletePlan(plan.id)}
                  className="p-2 text-slate-400 hover:text-rose-600 rounded-xl hover:bg-rose-50 transition-colors focus:ring-2 focus:ring-rose-400 cursor-pointer"
                  aria-label={t.btnDelete}
                >
                  <Trash2 className="w-4 h-4" strokeWidth={2.2} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-6 pb-24 md:pb-8">
      {/* 2-Column Responsive Layout on lg+ */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column (5/12 on lg): Form + Planned Payments on Desktop */}
        <div className="lg:col-span-5 space-y-6">
          {formCard}

          {/* Planned payments on desktop (below form) */}
          <div className="hidden lg:block">
            {plannedPaymentsCard}
          </div>
        </div>

        {/* Right Column (7/12 on lg): Verdict Card (or Guidance Placeholder) */}
        <div className="lg:col-span-7 space-y-6">
          {verdictCard}

          {/* Planned payments on mobile (below verdict) */}
          <div className="lg:hidden">
            {plannedPaymentsCard}
          </div>
        </div>
      </div>
    </div>
  );
}
