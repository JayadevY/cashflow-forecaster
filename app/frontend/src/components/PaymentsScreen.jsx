/**
 * PaymentsScreen Component (Live Transactions & Cash Register)
 *
 * This screen provides a real-time till and payment tracker for small shop owners:
 * 1. Summary Cards: Shows today's totals for Cash Drawer, UPI, Card/Netbanking, and Total.
 * 2. Relative time subtitle: "Last payment X min ago".
 * 3. Quick Cash Keypad: Large numeric keypad with +₹10, +₹50, +₹100 chips for 1-tap saving.
 * 4. Demo Simulation: Creates realistic simulated digital payments for testing.
 * 5. Live Feed: Polls every 5s for new transactions, pauses when tab is hidden,
 *    flashes green on new arrivals, and displays live/reconnecting indicators.
 * 6. Undo Feature: Allows shop owners to undo mistaken cash entries within 10 minutes.
 * 7. Close the Day: Reconciles cash into the physical till drawer and digital to bank.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Banknote,
  Smartphone,
  CreditCard,
  Landmark,
  Plus,
  Sparkles,
  RotateCcw,
  Clock,
  CheckCircle2,
  AlertCircle,
  X,
  Calendar,
  ArrowDownLeft,
} from 'lucide-react';
import {
  getTransactions,
  getTransactionSummary,
  addTransaction,
  simulateTransaction,
  deleteTransaction,
  closeDay,
} from '../api';
import { formatRupees } from '../utils/formatters';
import { TRANSLATIONS } from '../i18n';

export default function PaymentsScreen({ shopId, language = 'en', onDayClosed }) {
  const t = TRANSLATIONS[language] || TRANSLATIONS.en;

  // Transactions list and summary state
  const [transactions, setTransactions] = useState([]);
  const [summary, setSummary] = useState({
    cash_total: 0,
    digital_total: 0,
    by_mode: { cash: 0, upi: 0, card: 0, netbanking: 0 },
    total_count: 0,
    last_transaction_time: null,
  });

  // UI state
  const [isLiveConnected, setIsLiveConnected] = useState(true);
  const [isSimulating, setIsSimulating] = useState(false);
  const [showKeypad, setShowKeypad] = useState(false);
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [isClosingDay, setIsClosingDay] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);

  // Newly arrived transaction IDs to trigger flash highlight
  const [newArrivalIds, setNewArrivalIds] = useState(new Set());

  // Keypad form state
  const [keypadAmount, setKeypadAmount] = useState('');
  const [keypadNote, setKeypadNote] = useState('');
  const [isSavingCash, setIsSavingCash] = useState(false);

  // Highest created_at timestamp seen so far (for cheap polling)
  const lastTimestampRef = useRef(null);
  const pollingTimerRef = useRef(null);

  // Helper to clear notifications after 4 seconds
  const showFeedback = (msg, isError = false) => {
    if (isError) {
      setErrorMessage(msg);
      setTimeout(() => setErrorMessage(null), 5000);
    } else {
      setFeedbackMessage(msg);
      setTimeout(() => setFeedbackMessage(null), 4000);
    }
  };

  // 1. Initial Load: Fetch full recent list + summary
  const loadInitialData = useCallback(async () => {
    if (!shopId) return;
    try {
      const [summaryData, txList] = await Promise.all([
        getTransactionSummary(shopId, 'today'),
        getTransactions(shopId, { limit: 50 }),
      ]);
      setSummary(summaryData);
      setTransactions(txList);
      setIsLiveConnected(true);

      if (txList && txList.length > 0) {
        lastTimestampRef.current = txList[0].created_at;
      }
    } catch (err) {
      setIsLiveConnected(false);
      console.error('Failed to load initial payments data:', err);
    }
  }, [shopId]);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  // 2. Poll for New Transactions every 5s with ?since=
  const pollNewTransactions = useCallback(async () => {
    if (!shopId) return;
    // Pause polling when browser tab is hidden or backgrounded
    if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
      return;
    }

    try {
      const since = lastTimestampRef.current;
      const newItems = await getTransactions(shopId, { since, limit: 20 });
      setIsLiveConnected(true);

      if (newItems && newItems.length > 0) {
        // Mark new items for flash animation
        const newIds = new Set(newItems.map((item) => item.id));
        setNewArrivalIds((prev) => new Set([...prev, ...newIds]));

        // Clear highlight after 3 seconds
        setTimeout(() => {
          setNewArrivalIds((prev) => {
            const next = new Set(prev);
            newIds.forEach((id) => next.delete(id));
            return next;
          });
        }, 3000);

        // Update list: prepend new items, avoid duplicate IDs
        setTransactions((prev) => {
          const existingIds = new Set(prev.map((p) => p.id));
          const filteredNew = newItems.filter((item) => !existingIds.has(item.id));
          return [...filteredNew, ...prev];
        });

        // Update highest timestamp
        lastTimestampRef.current = newItems[0].created_at;

        // Refresh today's summary
        const updatedSummary = await getTransactionSummary(shopId, 'today');
        setSummary(updatedSummary);
      }
    } catch (err) {
      setIsLiveConnected(false);
    }
  }, [shopId]);

  // Manage 5s interval with visibility awareness
  useEffect(() => {
    if (!shopId) return;

    pollingTimerRef.current = setInterval(pollNewTransactions, 5000);

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        pollNewTransactions();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(pollingTimerRef.current);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [shopId, pollNewTransactions]);

  // 3. Handle Keypad Cash Save
  const handleSaveCash = async () => {
    const numericAmount = parseFloat(keypadAmount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      showFeedback('Please enter an amount greater than ₹0.', true);
      return;
    }

    setIsSavingCash(true);
    try {
      const newTx = await addTransaction(shopId, {
        amount: numericAmount,
        mode: 'cash',
        customer_note: keypadNote.trim() || undefined,
      });

      // Close keypad and reset inputs
      setShowKeypad(false);
      setKeypadAmount('');
      setKeypadNote('');

      // Add to list with flash highlight
      setTransactions((prev) => [newTx, ...prev]);
      setNewArrivalIds((prev) => new Set([...prev, newTx.id]));
      setTimeout(() => {
        setNewArrivalIds((prev) => {
          const next = new Set(prev);
          next.delete(newTx.id);
          return next;
        });
      }, 3000);

      lastTimestampRef.current = newTx.created_at;
      showFeedback(`₹${formatRupees(numericAmount)} cash received and recorded!`);

      // Refresh summary
      const updatedSummary = await getTransactionSummary(shopId, 'today');
      setSummary(updatedSummary);
    } catch (err) {
      showFeedback(err.message || 'Failed to record cash transaction.', true);
    } finally {
      setIsSavingCash(false);
    }
  };

  // 4. Handle Demo Simulation
  const handleSimulate = async () => {
    setIsSimulating(true);
    try {
      const simTx = await simulateTransaction(shopId);
      setTransactions((prev) => [simTx, ...prev]);
      setNewArrivalIds((prev) => new Set([...prev, simTx.id]));
      setTimeout(() => {
        setNewArrivalIds((prev) => {
          const next = new Set(prev);
          next.delete(simTx.id);
          return next;
        });
      }, 3000);

      lastTimestampRef.current = simTx.created_at;
      showFeedback(`Simulated ₹${formatRupees(simTx.amount)} ${simTx.mode.toUpperCase()} payment!`);

      // Refresh summary
      const updatedSummary = await getTransactionSummary(shopId, 'today');
      setSummary(updatedSummary);
    } catch (err) {
      showFeedback(err.message || 'Failed to simulate payment.', true);
    } finally {
      setIsSimulating(false);
    }
  };

  // 5. Handle Undo Cash Entry
  const handleUndo = async (tid) => {
    try {
      await deleteTransaction(shopId, tid);
      setTransactions((prev) => prev.filter((item) => item.id !== tid));
      showFeedback(t.undoSuccess || 'Cash entry undone successfully.');

      const updatedSummary = await getTransactionSummary(shopId, 'today');
      setSummary(updatedSummary);
    } catch (err) {
      showFeedback(err.message || 'Could not undo transaction.', true);
    }
  };

  // 6. Handle Close Business Day
  const handleConfirmCloseDay = async () => {
    setIsClosingDay(true);
    try {
      const res = await closeDay(shopId, 'today');
      setShowCloseModal(false);
      showFeedback(
        res.message || t.closeDaySuccess || 'Day closed successfully! Cash drawer updated.'
      );

      // Re-fetch summary
      const updatedSummary = await getTransactionSummary(shopId, 'today');
      setSummary(updatedSummary);

      // Notify parent to refresh drawer cash / forecast
      if (onDayClosed) {
        onDayClosed();
      }
    } catch (err) {
      showFeedback(err.message || 'Failed to close day.', true);
    } finally {
      setIsClosingDay(false);
    }
  };

  // Helper to format relative time
  const getRelativeTimeText = () => {
    if (!summary.last_transaction_time) {
      return t.noPaymentsToday || 'No payments recorded today yet.';
    }
    try {
      const txTime = new Date(summary.last_transaction_time).getTime();
      const now = Date.now();
      const diffSec = Math.max(0, Math.floor((now - txTime) / 1000));
      if (diffSec < 60) return `${t.lastPaymentAgo || 'Last payment'} ${t.justNow || 'just now'}`;
      const diffMin = Math.floor(diffSec / 60);
      if (diffMin < 60)
        return `${t.lastPaymentAgo || 'Last payment'} ${diffMin} ${t.minutesAgo || 'min ago'}`;
      const diffHr = Math.floor(diffMin / 60);
      return `${t.lastPaymentAgo || 'Last payment'} ${diffHr} hr ago`;
    } catch (_) {
      return '';
    }
  };

  // Check if a transaction is eligible for undo
  const canUndo = (tx) => {
    if (tx.mode !== 'cash' || tx.source !== 'manual') return false;
    try {
      const txTime = new Date(tx.created_at).getTime();
      const now = Date.now();
      const diffMin = (now - txTime) / 60000;
      return diffMin >= 0 && diffMin <= 10;
    } catch (_) {
      return false;
    }
  };

  // Format mode icons and colors
  const getModeDetails = (mode) => {
    switch (mode) {
      case 'cash':
        return {
          label: t.modeCash || 'Cash',
          icon: Banknote,
          bg: 'bg-emerald-50 text-emerald-800 border-emerald-200',
          badgeBg: 'bg-emerald-100 text-emerald-900',
        };
      case 'upi':
        return {
          label: t.modeUpi || 'UPI',
          icon: Smartphone,
          bg: 'bg-blue-50 text-blue-800 border-blue-200',
          badgeBg: 'bg-blue-100 text-blue-900',
        };
      case 'card':
        return {
          label: t.modeCard || 'Card',
          icon: CreditCard,
          bg: 'bg-purple-50 text-purple-800 border-purple-200',
          badgeBg: 'bg-purple-100 text-purple-900',
        };
      case 'netbanking':
        return {
          label: t.modeNetbanking || 'Netbanking',
          icon: Landmark,
          bg: 'bg-amber-50 text-amber-800 border-amber-200',
          badgeBg: 'bg-amber-100 text-amber-900',
        };
      default:
        return {
          label: mode,
          icon: Banknote,
          bg: 'bg-slate-50 text-slate-800 border-slate-200',
          badgeBg: 'bg-slate-100 text-slate-800',
        };
    }
  };

  return (
    <div className="space-y-6 pb-20 md:pb-8">
      {/* Notifications / Toast */}
      {feedbackMessage && (
        <div className="p-3.5 bg-emerald-600 text-white rounded-2xl shadow-lg flex items-center gap-3 animate-fadeIn">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
          <span className="font-bold text-sm">{feedbackMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-3.5 bg-rose-600 text-white rounded-2xl shadow-lg flex items-center gap-3 animate-fadeIn">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span className="font-bold text-sm">{errorMessage}</span>
        </div>
      )}

      {/* Header & Subtitle */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            {t.paymentsTitle || 'Live Payments & Billing'}
          </h1>
          <p className="text-xs sm:text-sm font-semibold text-slate-500 mt-0.5">
            {getRelativeTimeText()}
          </p>
        </div>

        {/* Live / Reconnecting Pill */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <div
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-black border shadow-sm ${
              isLiveConnected
                ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                : 'bg-amber-50 text-amber-800 border-amber-300'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                isLiveConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
              }`}
            />
            <span>{isLiveConnected ? t.liveIndicator || 'Live' : t.reconnecting || 'Reconnecting...'}</span>
          </div>
        </div>
      </div>

      {/* 4 Summary Cards for Today */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Card 1: Cash Drawer */}
        <div className="bg-white p-4 rounded-3xl border border-emerald-100 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-emerald-800 mb-2">
            <span className="text-xs font-black uppercase tracking-wider">
              {t.cardCash || 'Cash Drawer'}
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-100 flex items-center justify-center">
              <Banknote className="w-4 h-4 text-emerald-700" />
            </div>
          </div>
          <div>
            <span className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight block">
              ₹{formatRupees(summary.cash_total || 0)}
            </span>
            <span className="text-[11px] font-bold text-emerald-700">Physical drawer cash</span>
          </div>
        </div>

        {/* Card 2: UPI */}
        <div className="bg-white p-4 rounded-3xl border border-blue-100 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-blue-800 mb-2">
            <span className="text-xs font-black uppercase tracking-wider">{t.cardUpi || 'UPI'}</span>
            <div className="w-8 h-8 rounded-xl bg-blue-100 flex items-center justify-center">
              <Smartphone className="w-4 h-4 text-blue-700" />
            </div>
          </div>
          <div>
            <span className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight block">
              ₹{formatRupees(summary.by_mode?.upi || 0)}
            </span>
            <span className="text-[11px] font-bold text-blue-700">Bank transfer QR/App</span>
          </div>
        </div>

        {/* Card 3: Card / Netbanking */}
        <div className="bg-white p-4 rounded-3xl border border-purple-100 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-purple-800 mb-2">
            <span className="text-xs font-black uppercase tracking-wider">
              {t.cardCardNet || 'Card / Netbanking'}
            </span>
            <div className="w-8 h-8 rounded-xl bg-purple-100 flex items-center justify-center">
              <CreditCard className="w-4 h-4 text-purple-700" />
            </div>
          </div>
          <div>
            <span className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight block">
              ₹{formatRupees((summary.by_mode?.card || 0) + (summary.by_mode?.netbanking || 0))}
            </span>
            <span className="text-[11px] font-bold text-purple-700">Direct digital settlement</span>
          </div>
        </div>

        {/* Card 4: Total Received */}
        <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between bg-gradient-to-br from-white to-slate-50">
          <div className="flex items-center justify-between text-slate-700 mb-2">
            <span className="text-xs font-black uppercase tracking-wider">
              {t.cardTotal || 'Total Today'}
            </span>
            <span className="text-xs font-black px-2 py-0.5 rounded-lg bg-slate-200 text-slate-800">
              {summary.total_count || 0} bills
            </span>
          </div>
          <div>
            <span className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight block">
              ₹{formatRupees((summary.cash_total || 0) + (summary.digital_total || 0))}
            </span>
            <span className="text-[11px] font-bold text-slate-500">All modes combined</span>
          </div>
        </div>
      </div>

      {/* Desktop & Mobile Responsive Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column (Desktop 5/12): Action Buttons & End of Day Card */}
        <div className="lg:col-span-5 space-y-4">
          {/* Action Button 1: + Cash Received */}
          <button
            onClick={() => setShowKeypad(true)}
            className="w-full min-h-[56px] md:min-h-[52px] bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white rounded-3xl font-black text-base shadow-lg shadow-emerald-600/25 flex items-center justify-center gap-3 transition-all cursor-pointer"
          >
            <Plus className="w-6 h-6 stroke-[3]" />
            <span>{t.btnAddCash || '+ Cash received'}</span>
          </button>

          {/* Action Button 2: Simulate Payment (Demo) */}
          <button
            onClick={handleSimulate}
            disabled={isSimulating}
            className="w-full min-h-[56px] md:min-h-[50px] bg-slate-100 hover:bg-slate-200 active:scale-[0.98] text-slate-800 border border-slate-300 rounded-3xl font-extrabold text-sm flex items-center justify-center gap-2.5 transition-all cursor-pointer disabled:opacity-50"
          >
            <Sparkles className="w-5 h-5 text-amber-500" />
            <span>{isSimulating ? t.btnSimulating || 'Simulating...' : t.btnSimulate || 'Simulate payment (Demo)'}</span>
          </button>

          {/* Close the Day Card */}
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white p-5 rounded-3xl shadow-md space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-black uppercase tracking-wider text-slate-400 block">
                  End of Day Reconciliation
                </span>
                <span className="text-base font-black text-white">
                  {t.btnCloseDay || 'Close the day'}
                </span>
              </div>
              <Calendar className="w-5 h-5 text-emerald-400" />
            </div>

            <p className="text-xs text-slate-300 leading-relaxed font-medium">
              Sum today's physical cash into your drawer balance. Digital payments (UPI/Card) are recorded separately for your bank account.
            </p>

            <button
              onClick={() => setShowCloseModal(true)}
              className="w-full min-h-[48px] bg-emerald-500 hover:bg-emerald-400 active:scale-[0.98] text-slate-950 rounded-2xl font-black text-sm transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4 text-slate-950 stroke-[2.5]" />
              <span>{t.btnCloseDay || 'Close the day'}</span>
            </button>
          </div>
        </div>

        {/* Right Column (Desktop 7/12): Live Transaction Stream */}
        <div className="lg:col-span-7 bg-white rounded-3xl border border-slate-200 p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-slate-400" />
              <h2 className="text-base font-black text-slate-900">
                {t.recentTransactions || 'Live Stream'}
              </h2>
            </div>
            <span className="text-xs font-bold text-slate-500">
              {transactions.length} recorded
            </span>
          </div>

          {/* Transaction List */}
          {transactions.length === 0 ? (
            <div className="py-12 text-center text-slate-400 font-bold text-sm">
              {t.noPaymentsToday || 'No transactions recorded today yet.'}
            </div>
          ) : (
            <div className="space-y-2.5 max-h-[520px] overflow-y-auto pr-1">
              {transactions.map((tx) => {
                const details = getModeDetails(tx.mode);
                const Icon = details.icon;
                const isNew = newArrivalIds.has(tx.id);
                const showUndo = canUndo(tx);

                // Format time e.g. 02:45 PM
                let timeStr = '';
                try {
                  const d = new Date(tx.created_at);
                  timeStr = d.toLocaleTimeString('en-IN', {
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: true,
                  });
                } catch (_) {
                  timeStr = tx.created_at;
                }

                return (
                  <div
                    key={tx.id}
                    className={`flex items-center justify-between p-3.5 rounded-2xl border transition-all ${
                      isNew
                        ? 'bg-emerald-100 border-emerald-400 shadow-md scale-[1.01]'
                        : 'bg-slate-50/70 hover:bg-slate-100/70 border-slate-100'
                    }`}
                  >
                    {/* Left: Mode icon + Details */}
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 border ${details.bg}`}
                      >
                        <Icon className="w-5 h-5 stroke-[2.25]" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md ${details.badgeBg}`}
                          >
                            {details.label}
                          </span>
                          <span className="text-xs font-semibold text-slate-400">{timeStr}</span>
                        </div>
                        {tx.customer_note && (
                          <span className="text-xs text-slate-600 font-medium block truncate max-w-[180px] sm:max-w-[280px]">
                            {tx.customer_note}
                          </span>
                        )}
                        {tx.reference && (
                          <span className="text-[10px] text-slate-400 font-mono block">
                            {tx.reference}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Right: Amount & Undo Button */}
                    <div className="text-right flex items-center gap-3">
                      <div>
                        <span className="text-base sm:text-lg font-black text-slate-900 block tracking-tight">
                          ₹{formatRupees(tx.amount)}
                        </span>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                          {tx.status}
                        </span>
                      </div>

                      {showUndo && (
                        <button
                          onClick={() => handleUndo(tx.id)}
                          className="px-2.5 py-1.5 rounded-xl bg-slate-200 hover:bg-rose-100 hover:text-rose-700 text-slate-700 text-xs font-black transition-colors flex items-center gap-1 cursor-pointer"
                          title="Undo within 10 minutes"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>{t.btnUndo || 'Undo'}</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Numeric Keypad Modal / Sheet */}
      {showKeypad && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fadeIn">
          <div className="bg-white w-full max-w-[420px] rounded-t-3xl sm:rounded-3xl p-5 shadow-2xl space-y-4 animate-slideUp">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-black">
                  ₹
                </div>
                <h3 className="font-black text-lg text-slate-900">
                  {t.keypadTitle || 'Cash Received'}
                </h3>
              </div>
              <button
                onClick={() => {
                  setShowKeypad(false);
                  setKeypadAmount('');
                }}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Big Amount Display */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-center">
              <span className="text-xs font-bold text-slate-400 uppercase block mb-1">
                {t.keypadAmount || 'Amount in Rupees'}
              </span>
              <div className="text-4xl font-black text-slate-900 tracking-tight flex items-center justify-center">
                <span className="text-emerald-700 mr-1">₹</span>
                <span>{keypadAmount || '0'}</span>
              </div>
            </div>

            {/* Quick Add Chips */}
            <div className="grid grid-cols-4 gap-1.5">
              {[10, 50, 100, 500].map((add) => (
                <button
                  key={add}
                  type="button"
                  onClick={() => {
                    const current = parseInt(keypadAmount || '0', 10);
                    setKeypadAmount(String(current + add));
                  }}
                  className="py-2 bg-emerald-50 hover:bg-emerald-100 active:scale-95 text-emerald-800 font-black text-xs rounded-xl border border-emerald-200 transition-all cursor-pointer"
                >
                  +{add}
                </button>
              ))}
            </div>

            {/* Numeric Keypad Grid (1-9, C, 0, Backspace) */}
            <div className="grid grid-cols-3 gap-2">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((digit) => (
                <button
                  key={digit}
                  type="button"
                  onClick={() => setKeypadAmount((prev) => (prev === '0' ? String(digit) : prev + digit))}
                  className="min-h-[52px] bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-900 font-black text-xl rounded-2xl transition-all cursor-pointer"
                >
                  {digit}
                </button>
              ))}

              {/* Clear */}
              <button
                type="button"
                onClick={() => setKeypadAmount('')}
                className="min-h-[52px] bg-rose-50 hover:bg-rose-100 active:scale-95 text-rose-700 font-black text-base rounded-2xl transition-all cursor-pointer"
              >
                C
              </button>

              {/* Zero */}
              <button
                type="button"
                onClick={() => setKeypadAmount((prev) => (prev === '' || prev === '0' ? '0' : prev + '0'))}
                className="min-h-[52px] bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-900 font-black text-xl rounded-2xl transition-all cursor-pointer"
              >
                0
              </button>

              {/* Backspace */}
              <button
                type="button"
                onClick={() => setKeypadAmount((prev) => prev.slice(0, -1))}
                className="min-h-[52px] bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-700 font-black text-base rounded-2xl transition-all flex items-center justify-center cursor-pointer"
              >
                ⌫
              </button>
            </div>

            {/* Optional Customer Note */}
            <div>
              <input
                type="text"
                placeholder={t.keypadNote || 'Note / Bill No. (optional)'}
                value={keypadNote}
                onChange={(e) => setKeypadNote(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            {/* Save Button */}
            <button
              onClick={handleSaveCash}
              disabled={isSavingCash || !keypadAmount || parseFloat(keypadAmount) <= 0}
              className="w-full min-h-[56px] md:min-h-[50px] bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white rounded-2xl font-black text-base shadow-lg shadow-emerald-600/25 transition-all cursor-pointer disabled:opacity-50"
            >
              {isSavingCash ? 'Saving...' : t.btnSaveCash || 'Save Cash'}
            </button>
          </div>
        </div>
      )}

      {/* Close the Day Confirmation Modal */}
      {showCloseModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white w-full max-w-[440px] rounded-3xl p-6 shadow-2xl space-y-5 animate-slideUp">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-slate-900 text-emerald-400 flex items-center justify-center font-black">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-lg text-slate-900">
                    {t.closeDayTitle || "Close Today's Register"}
                  </h3>
                  <span className="text-xs font-bold text-slate-400">
                    {new Date().toLocaleDateString('en-IN', {
                      weekday: 'short',
                      day: 'numeric',
                      month: 'short',
                    })}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setShowCloseModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Summary Breakdown Cards */}
            <div className="space-y-3">
              <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-emerald-800 uppercase block">
                    {t.closeDayCashDrawer || 'Cash to Drawer'}
                  </span>
                  <span className="text-xl font-black text-emerald-950">
                    ₹{formatRupees(summary.cash_total || 0)}
                  </span>
                </div>
                <Banknote className="w-6 h-6 text-emerald-700" />
              </div>

              <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-2xl flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-blue-800 uppercase block">
                    {t.closeDayBankDeposit || 'Digital to Bank'}
                  </span>
                  <span className="text-xl font-black text-blue-950">
                    ₹{formatRupees(summary.digital_total || 0)}
                  </span>
                </div>
                <Smartphone className="w-6 h-6 text-blue-700" />
              </div>
            </div>

            {/* Plain-Language Accounting Rule Notice */}
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-1.5 text-xs text-slate-600 font-medium">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                <span>
                  {t.closeDayDrawerNotice
                    ? t.closeDayDrawerNotice.replace('{amount}', formatRupees(summary.cash_total || 0))
                    : `Only physical cash (₹${formatRupees(summary.cash_total || 0)}) will be added to your cash drawer closing balance.`}
                </span>
              </div>
              <div className="flex items-start gap-2">
                <ArrowDownLeft className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                <span>
                  {t.closeDayBankNotice
                    ? t.closeDayBankNotice.replace('{amount}', formatRupees(summary.digital_total || 0))
                    : `Digital payments (₹${formatRupees(summary.digital_total || 0)}) are deposited directly into your bank account.`}
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="space-y-2">
              <button
                onClick={handleConfirmCloseDay}
                disabled={isClosingDay}
                className="w-full min-h-[52px] bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white rounded-2xl font-black text-sm shadow-md transition-all cursor-pointer disabled:opacity-50"
              >
                {isClosingDay ? 'Closing day...' : t.btnConfirmCloseDay || 'Confirm & Close Day'}
              </button>

              <button
                onClick={() => setShowCloseModal(false)}
                className="w-full py-2.5 text-slate-500 hover:text-slate-800 font-bold text-xs transition-colors cursor-pointer"
              >
                {t.btnCancel || 'Cancel'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
