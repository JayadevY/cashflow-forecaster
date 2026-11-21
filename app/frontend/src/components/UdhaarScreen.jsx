/**
 * UdhaarScreen Component (Tab 4: Udhaar / Customer Credit Tracker)
 *
 * Helps small shopkeepers track and recover money owed to them:
 * 1. Summary Card:
 *    - Total outstanding balance (huge high-contrast rupee number)
 *    - Overdue amount in red with warning icon and the word 'Overdue'
 *    - Number of active customers with outstanding balance
 * 2. 'Collect Today' List:
 *    - Customers whose repayment is due today or overdue
 *    - Shows customer name, balance, and days overdue
 *    - 'Got Payment' button that opens a small amount input (defaults to full balance)
 * 3. 'Add Credit' Form:
 *    - Customer name, amount, optional due date and note
 * 4. Multi-language support (English, தமிழ், हिंदी)
 *
 * Responsive on lg and up:
 * - Left column (5/12): Summary card, and Add credit form below it
 * - Right column (7/12): Collect today and All customers list
 */

import React, { useState, useEffect } from 'react';
import {
  getUdhaarSummary,
  getUdhaarEntries,
  addUdhaar,
  recordUdhaarPayment,
} from '../api';
import { formatRupees, formatFriendlyDate } from '../utils/formatters';
import { TRANSLATIONS } from '../i18n';
import {
  Users,
  AlertOctagon,
  Clock,
  Plus,
  CheckCircle2,
  AlertCircle,
  Check,
  ChevronDown,
  ChevronUp,
  CreditCard,
  Send,
  Loader2,
} from 'lucide-react';

export default function UdhaarScreen({ shopId, language = 'en' }) {
  const t = TRANSLATIONS[language] || TRANSLATIONS.en;

  const [summary, setSummary] = useState(null);
  const [allEntries, setAllEntries] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState(null);
  const [successNote, setSuccessNote] = useState(null);

  // Add credit form state
  const [customerName, setCustomerName] = useState('');
  const [amountGiven, setAmountGiven] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [note, setNote] = useState('');
  const [isAddingCredit, setIsAddingCredit] = useState(false);

  // Active payment dialog state: { id, customer_name, balance, amount }
  const [activePaymentItem, setActivePaymentItem] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentError, setPaymentError] = useState(null);
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);

  // Toggle to view all open customer records
  const [showAllList, setShowAllList] = useState(false);

  // Load summary and open entries from backend
  const loadData = async () => {
    if (!shopId) return;
    setIsLoading(true);
    try {
      setErrorMessage(null);
      const [sumData, entriesData] = await Promise.all([
        getUdhaarSummary(shopId),
        getUdhaarEntries(shopId, 'open'),
      ]);
      setSummary(sumData);
      setAllEntries(entriesData || []);
    } catch (err) {
      setErrorMessage(err.message || 'Could not load udhaar credit data.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    setActivePaymentItem(null);
    setPaymentError(null);
    setSuccessNote(null);
  }, [shopId]);

  // Handle Add Credit Form Submission
  const handleAddCredit = async (e) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessNote(null);

    const numAmount = parseFloat(amountGiven);
    if (!customerName.trim()) {
      setErrorMessage('Please enter the customer name.');
      return;
    }
    if (!numAmount || numAmount <= 0) {
      setErrorMessage('Credit amount must be greater than 0.');
      return;
    }

    setIsAddingCredit(true);
    try {
      const payload = {
        customer_name: customerName.trim(),
        amount_given: numAmount,
        given_date: new Date().toISOString().split('T')[0],
        due_date: dueDate || null,
        note: note.trim() || null,
      };

      const result = await addUdhaar(shopId, payload);
      setSuccessNote(`${t.creditSavedSuccess} ${result.customer_name} (₹${formatRupees(result.amount_given)})`);

      // Reset form
      setCustomerName('');
      setAmountGiven('');
      setDueDate('');
      setNote('');

      // Reload list and summary
      await loadData();
    } catch (err) {
      setErrorMessage(err.message || 'Could not add udhaar record.');
    } finally {
      setIsAddingCredit(false);
    }
  };

  // Open inline payment box for a customer
  const handleOpenPaymentBox = (item) => {
    setActivePaymentItem(item);
    setPaymentAmount(String(Math.round(item.balance)));
    setPaymentError(null);
    setSuccessNote(null);
  };

  // Cancel inline payment box
  const handleClosePaymentBox = () => {
    setActivePaymentItem(null);
    setPaymentAmount('');
    setPaymentError(null);
  };

  // Submit recorded payment
  const handleConfirmPayment = async (e) => {
    e.preventDefault();
    if (!activePaymentItem) return;

    const numPay = parseFloat(paymentAmount);
    if (!numPay || numPay < 1) {
      setPaymentError('Payment must be at least ₹1.');
      return;
    }
    if (numPay > activePaymentItem.balance) {
      setPaymentError(`Cannot pay more than balance (₹${formatRupees(activePaymentItem.balance)}).`);
      return;
    }

    setIsSubmittingPayment(true);
    setPaymentError(null);
    setErrorMessage(null);

    const targetCustomerName = activePaymentItem.customer_name;
    const targetItemId = activePaymentItem.id;

    try {
      await recordUdhaarPayment(shopId, targetItemId, {
        amount: numPay,
      });

      setActivePaymentItem(null);
      setPaymentAmount('');
      setPaymentError(null);

      const formattedPaid = Number(numPay).toLocaleString('en-IN');
      setSuccessNote(`Rs ${formattedPaid} received from ${targetCustomerName}`);

      const [sumData, entriesData] = await Promise.all([
        getUdhaarSummary(shopId),
        getUdhaarEntries(shopId, 'open'),
      ]);
      setSummary(sumData);
      setAllEntries(entriesData || []);
    } catch (err) {
      setPaymentError(err.message || 'Could not record payment.');
    } finally {
      setIsSubmittingPayment(false);
    }
  };

  if (isLoading && !summary) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center text-slate-500">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600 mb-2" />
        <span className="text-sm font-semibold">Loading udhaar records...</span>
      </div>
    );
  }

  const collectTodayList = summary?.collect_today || [];
  const topCustomers = summary?.top_customers || [];

  // Sub-section 1: Summary Card
  const summaryCard = (
    <div className="bg-white rounded-3xl p-5 border-2 border-slate-200 shadow-sm space-y-4">
      <div>
        <h2 className="text-xl font-black text-slate-900">
          {t.udhaarTitle}
        </h2>
        <p className="text-xs text-slate-500 font-medium mt-0.5">
          {t.udhaarSubtitle}
        </p>
      </div>

      {/* Success Banner */}
      {successNote && (
        <div className="p-4 bg-emerald-50 border-2 border-emerald-300 rounded-2xl flex items-start gap-3 text-emerald-900 text-sm">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-emerald-600 mt-0.5" strokeWidth={2.5} />
          <div className="font-bold leading-snug">{successNote}</div>
        </div>
      )}

      {/* Error Banner */}
      {errorMessage && (
        <div className="p-4 bg-rose-50 border-2 border-rose-300 rounded-2xl flex items-start gap-3 text-rose-900 text-sm">
          <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-600 mt-0.5" strokeWidth={2.5} />
          <div className="font-semibold leading-snug">{errorMessage}</div>
        </div>
      )}

      {/* Total Outstanding Balance */}
      <div className="space-y-1 pt-1">
        <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">
          {t.totalOutstanding}
        </div>
        <div className="text-4xl sm:text-5xl font-black text-slate-900 tracking-tight">
          ₹{formatRupees(summary?.total_outstanding || 0)}
        </div>
      </div>

      {/* Overdue Amount & Active Customer Count */}
      <div className="grid grid-cols-2 gap-2.5 pt-1">
        {/* Overdue Amount in RED with Icon and Word "Overdue" */}
        <div className="p-3.5 bg-rose-50 border-2 border-rose-300 rounded-2xl">
          <div className="flex items-center gap-1.5 text-rose-800 font-extrabold text-xs uppercase tracking-wide">
            <AlertOctagon className="w-4 h-4 flex-shrink-0 text-rose-600" strokeWidth={2.5} />
            <span>{t.overdueWord}</span>
          </div>
          <div className="text-2xl font-black text-rose-900 mt-1">
            ₹{formatRupees(summary?.overdue_amount || 0)}
          </div>
        </div>

        {/* Customer Count */}
        <div className="p-3.5 bg-slate-50 border-2 border-slate-200 rounded-2xl">
          <div className="flex items-center gap-1.5 text-slate-600 font-bold text-xs uppercase tracking-wide">
            <Users className="w-4 h-4 flex-shrink-0 text-slate-500" strokeWidth={2.5} />
            <span>{t.activeCustomers}</span>
          </div>
          <div className="text-2xl font-black text-slate-900 mt-1">
            {summary?.customer_count || 0}
          </div>
        </div>
      </div>
    </div>
  );

  // Sub-section 2: Add Credit Form
  const addCreditCard = (
    <div className="bg-white rounded-3xl p-5 border-2 border-slate-200 shadow-sm space-y-4">
      <div className="flex items-center gap-2">
        <CreditCard className="w-5 h-5 text-emerald-700" strokeWidth={2.5} />
        <h3 className="font-extrabold text-slate-900 text-base">
          {t.addCreditTitle}
        </h3>
      </div>

      <form onSubmit={handleAddCredit} className="space-y-4">
        {/* Customer Name */}
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
            {t.customerNameLabel} <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            placeholder="e.g. Ramesh Kumar"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            className="w-full min-h-[52px] md:min-h-[44px] font-bold text-base md:text-sm text-slate-900 bg-slate-50 border-2 border-slate-300 rounded-2xl px-4 py-3 md:py-2 focus:border-emerald-500 focus:bg-white outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all"
            required
          />
        </div>

        {/* Amount */}
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
            {t.creditAmountLabel} <span className="text-rose-500">*</span>
          </label>
          <div className="relative flex items-center">
            <span className="absolute left-4 text-xl font-black text-slate-400">₹</span>
            <input
              type="number"
              inputMode="numeric"
              placeholder="e.g. 2500"
              value={amountGiven}
              onChange={(e) => setAmountGiven(e.target.value)}
              className="w-full min-h-[52px] md:min-h-[44px] font-black text-xl md:text-base text-slate-900 bg-slate-50 border-2 border-slate-300 rounded-2xl pl-10 pr-4 py-3 md:py-2 focus:border-emerald-500 focus:bg-white outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all"
              required
            />
          </div>
        </div>

        {/* Due date (Optional) */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              {t.dueDateLabel}
            </label>
            <span className="text-[11px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
              {t.optionalTag}
            </span>
          </div>
          <input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="w-full min-h-[52px] md:min-h-[44px] font-bold text-base md:text-sm text-slate-900 bg-slate-50 border-2 border-slate-300 rounded-2xl px-4 py-3 md:py-2 focus:border-emerald-500 focus:bg-white outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all"
          />
        </div>

        {/* Note (Optional) */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Note / Items
            </label>
            <span className="text-[11px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
              {t.optionalTag}
            </span>
          </div>
          <input
            type="text"
            placeholder="e.g. Monthly rice & oil sack"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="w-full min-h-[52px] md:min-h-[44px] font-medium text-base md:text-sm text-slate-900 bg-slate-50 border-2 border-slate-300 rounded-2xl px-4 py-3 md:py-2 focus:border-emerald-500 focus:bg-white outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all"
          />
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isAddingCredit}
          className="w-full min-h-[56px] md:min-h-[44px] px-6 py-4 md:py-2.5 bg-slate-900 hover:bg-black active:scale-95 disabled:opacity-50 text-white font-black text-lg md:text-base rounded-2xl shadow-md flex items-center justify-center gap-3 transition-all focus:ring-2 focus:ring-emerald-500 cursor-pointer"
        >
          {isAddingCredit ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" strokeWidth={2.5} />
              <span>{t.btnAddingCredit}</span>
            </>
          ) : (
            <>
              <Plus className="w-5 h-5" strokeWidth={2.5} />
              <span>{t.btnAddCredit}</span>
            </>
          )}
        </button>
      </form>
    </div>
  );

  // Sub-section 3: Collect Today List
  const collectTodayCard = (
    <div className="bg-white rounded-3xl p-5 border-2 border-slate-200 shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock className="w-5 h-5 text-amber-600" strokeWidth={2.5} />
          <h3 className="font-extrabold text-slate-900 text-base">
            {t.collectTodayTitle}
          </h3>
        </div>
        <span className="text-xs font-black bg-amber-100 text-amber-900 px-2.5 py-0.5 rounded-full border border-amber-300">
          {collectTodayList.length}
        </span>
      </div>

      {collectTodayList.length === 0 ? (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-center text-xs text-emerald-800 font-bold">
          {t.noCollectToday}
        </div>
      ) : (
        <div className="divide-y divide-slate-100">
          {collectTodayList.map((item) => {
            const isSelected = activePaymentItem?.id === item.id;

            return (
              <div key={item.id} className="py-3.5 first:pt-1 last:pb-1 space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-black text-base text-slate-900 leading-tight">
                      {item.customer_name}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      {item.days_overdue > 0 ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-extrabold text-rose-700 bg-rose-100 border border-rose-200 px-2 py-0.5 rounded-md">
                          <AlertOctagon className="w-3 h-3" />
                          {item.days_overdue} {t.daysOverdueLabel}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-extrabold text-amber-700 bg-amber-100 border border-amber-200 px-2 py-0.5 rounded-md">
                          <Clock className="w-3 h-3" />
                          {t.dueTodayLabel}
                        </span>
                      )}
                      {item.note && (
                        <span className="text-xs text-slate-400 font-medium truncate max-w-[140px]">
                          {item.note}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Balance */}
                  <div className="text-right">
                    <span className="text-xs font-bold text-slate-400 block">{t.balanceDue}</span>
                    <span className="text-xl font-black text-slate-900">
                      ₹{formatRupees(item.balance)}
                    </span>
                  </div>
                </div>

                {/* Got Payment Button */}
                {!isSelected ? (
                  <button
                    onClick={() => handleOpenPaymentBox(item)}
                    className="w-full min-h-[52px] md:min-h-[44px] bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-extrabold text-sm rounded-2xl shadow-sm flex items-center justify-center gap-2 transition-all focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                  >
                    <Check className="w-5 h-5" strokeWidth={3} />
                    <span>{t.btnGotPayment}</span>
                  </button>
                ) : (
                  /* Inline payment amount box */
                  <form
                    onSubmit={handleConfirmPayment}
                    className="p-3.5 bg-slate-50 border-2 border-emerald-500 rounded-2xl space-y-3 animate-fadeIn"
                  >
                    <div className="text-xs font-bold text-slate-700">
                      {t.recordPaymentTitle} <strong className="text-slate-900">{item.customer_name}</strong>
                    </div>

                    <div className="relative flex items-center">
                      <span className="absolute left-3.5 text-lg font-black text-slate-400">₹</span>
                      <input
                        type="number"
                        inputMode="numeric"
                        value={paymentAmount}
                        onChange={(e) => {
                          setPaymentAmount(e.target.value);
                          if (paymentError) setPaymentError(null);
                        }}
                        max={item.balance}
                        min={1}
                        className="w-full min-h-[48px] md:min-h-[40px] font-black text-lg md:text-base text-slate-900 bg-white border-2 border-slate-300 rounded-xl pl-9 pr-3 py-2 focus:border-emerald-500 outline-none"
                        placeholder={String(Math.round(item.balance))}
                        required
                        autoFocus
                      />
                    </div>

                    {paymentError && (
                      <div className="p-3 bg-rose-50 border border-rose-300 rounded-xl flex items-start gap-2 text-rose-800 text-xs font-bold animate-fadeIn">
                        <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-600 mt-0.5" />
                        <span className="leading-snug">{paymentError}</span>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={handleClosePaymentBox}
                        className="min-h-[44px] px-3 py-2 bg-slate-200 hover:bg-slate-300 active:scale-95 text-slate-700 font-bold text-xs rounded-xl cursor-pointer"
                      >
                        {t.btnCancelling}
                      </button>
                      <button
                        type="submit"
                        disabled={isSubmittingPayment}
                        className="min-h-[44px] px-3 py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 disabled:opacity-50 text-white font-black text-xs rounded-xl shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        {isSubmittingPayment ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Check className="w-4 h-4" strokeWidth={3} />
                        )}
                        <span>{t.btnConfirmPayment}</span>
                      </button>
                    </div>
                  </form>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  // Sub-section 4: Top Customers & All Customers List
  const customersCard = (
    <div className="bg-white rounded-3xl p-5 border-2 border-slate-200 shadow-sm space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-extrabold text-slate-900 text-sm">
          {t.topCustomersTitle}
        </h3>
        <button
          onClick={() => setShowAllList(!showAllList)}
          className="flex items-center gap-1 text-xs font-bold text-emerald-700 hover:text-emerald-900 cursor-pointer focus:outline-none"
        >
          <span>{showAllList ? 'Hide' : `View All (${allEntries.length})`}</span>
          {showAllList ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      {!showAllList ? (
        <div className="divide-y divide-slate-100">
          {topCustomers.map((cust, idx) => (
            <div key={idx} className="py-2.5 flex items-center justify-between text-sm">
              <span className="font-bold text-slate-800">{cust.customer_name}</span>
              <span className="font-black text-slate-900">₹{formatRupees(cust.balance)}</span>
            </div>
          ))}
        </div>
      ) : (
        <div className="divide-y divide-slate-100 max-h-80 overflow-y-auto pr-1">
          {allEntries.map((entry) => (
            <div key={entry.id} className="py-2.5">
              <div className="flex items-center justify-between text-sm">
                <div>
                  <div className="font-bold text-slate-800">{entry.customer_name}</div>
                  <div className="text-xs text-slate-400">
                    Given: {formatFriendlyDate(entry.given_date)}
                    {entry.due_date && ` • Due: ${formatFriendlyDate(entry.due_date)}`}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-black text-slate-900">₹{formatRupees(entry.balance)}</div>
                  <div className="text-[11px] font-bold text-slate-400">
                    Paid: ₹{formatRupees(entry.amount_paid)}
                  </div>
                </div>
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
        {/* Left Column (5/12 on lg): Summary Card + Add Credit Form */}
        <div className="lg:col-span-5 space-y-6">
          {summaryCard}

          {/* Add Credit Form (Desktop placement: below summary on lg+) */}
          <div className="hidden lg:block">
            {addCreditCard}
          </div>
        </div>

        {/* Right Column (7/12 on lg): Collect Today + Customers List */}
        <div className="lg:col-span-7 space-y-6">
          {collectTodayCard}

          {/* Add Credit Form (Mobile placement: between Collect Today and Customers) */}
          <div className="lg:hidden">
            {addCreditCard}
          </div>

          {customersCard}
        </div>
      </div>
    </div>
  );
}
