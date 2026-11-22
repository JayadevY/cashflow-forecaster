/**
 * Main App Component
 *
 * Coordinates the entire application:
 * 1. Loads registered shops from /shops
 * 2. Fetches 7-day risk forecast from /shops/{id}/forecast
 * 3. Handles tab switching (Home, Add Today, Plan Payment)
 * 4. Manages multi-language selection (EN / தமிழ் / हिंदी)
 * 5. Displays a friendly offline error screen if backend is unreachable
 */

import React, { useState, useEffect, useRef } from 'react';
import Navbar from './components/Navbar';
import BottomNav from './components/BottomNav';
import Sidebar from './components/Sidebar';
import DesktopTopBar from './components/DesktopTopBar';
import HomeScreen from './components/HomeScreen';
import EntryFormScreen from './components/EntryFormScreen';
import WhatIfScreen from './components/WhatIfScreen';
import UdhaarScreen from './components/UdhaarScreen';
import PaymentsScreen from './components/PaymentsScreen';
import LoadingSpinner from './components/LoadingSpinner';
import ErrorScreen from './components/ErrorScreen';
import ServerWakeUpScreen from './components/ServerWakeUpScreen';
import { getShops, getForecast } from './api';
import { TRANSLATIONS } from './i18n';
import { WifiOff } from 'lucide-react';

export default function App() {
  // Active screen tab: 'home' | 'add' | 'plan' | 'udhaar'
  const [activeTab, setActiveTab] = useState('home');

  // Selected language: 'en' | 'ta' | 'hi'
  const [language, setLanguage] = useState(() => {
    return localStorage.getItem('cashflow_lang') || 'en';
  });

  const t = TRANSLATIONS[language] || TRANSLATIONS.en;

  // Cached top tip for desktop top bar WhatsApp sharing
  const [topTip, setTopTip] = useState(null);

  // Shops & Selected Shop (with localStorage fallback for offline initial opening)
  const [shops, setShops] = useState(() => {
    try {
      const cached = localStorage.getItem('cached_shops');
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });

  const [selectedShopId, setSelectedShopId] = useState(() => {
    try {
      const cachedId = localStorage.getItem('cached_selected_shop_id');
      return cachedId ? Number(cachedId) : null;
    } catch {
      return null;
    }
  });

  // Forecast data for the selected shop
  const [forecastData, setForecastData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [offlineDate, setOfflineDate] = useState(null);
  const [isWakingUp, setIsWakingUp] = useState(false);
  const [wakeUpSeconds, setWakeUpSeconds] = useState(0);
  const isInitialBootRef = useRef(true);

  // Persist language selection
  const handleSelectLanguage = (lang) => {
    setLanguage(lang);
    localStorage.setItem('cashflow_lang', lang);
  };

  // Fetch shops list on initial mount with cold-start wake-up and automatic 5s retries up to 90s
  const loadShops = async () => {
    const startTime = Date.now();
    const maxRetryMs = 90000; // 90 seconds
    const retryIntervalMs = 5000; // 5 seconds

    setIsLoading(true);
    setError(null);
    setIsWakingUp(false);
    setWakeUpSeconds(0);

    // 4-second timeout to show waking up if request hangs
    let wakeTimer = setTimeout(() => {
      setIsWakingUp(true);
    }, 4000);

    // Track elapsed seconds ticker
    const secondTicker = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      setWakeUpSeconds(elapsed);
    }, 1000);

    while (Date.now() - startTime < maxRetryMs) {
      try {
        const data = await getShops();
        clearTimeout(wakeTimer);
        clearInterval(secondTicker);
        setIsWakingUp(false);

        setShops(data);
        if (data && data.length > 0) {
          try {
            localStorage.setItem('cached_shops', JSON.stringify(data));
          } catch (_) {}

          const savedShopId = localStorage.getItem('cached_selected_shop_id');
          const targetShop = data.find((s) => s.id === Number(savedShopId)) || data[0];
          setSelectedShopId(targetShop.id);

          isInitialBootRef.current = false;
          await loadForecast(targetShop.id);
        } else {
          isInitialBootRef.current = false;
          setIsLoading(false);
        }
        return;
      } catch (err) {
        // Request failed: immediately show waking up screen (even if under 4 seconds)
        clearTimeout(wakeTimer);
        setIsWakingUp(true);

        const elapsed = Date.now() - startTime;
        if (elapsed + retryIntervalMs <= maxRetryMs) {
          // Wait 5 seconds before next retry
          await new Promise((resolve) => setTimeout(resolve, retryIntervalMs));
        } else {
          break;
        }
      }
    }

    clearTimeout(wakeTimer);
    clearInterval(secondTicker);
    setIsWakingUp(false);
    setIsLoading(false);

    // Only show "Cannot reach the server" after retries expire (90 seconds)
    setError('Cannot reach the server. Is it running?');
  };

  // Fetch forecast whenever selected shop changes
  const loadForecast = async (shopId, isBackgroundRefresh = false) => {
    if (!shopId) return;
    if (isBackgroundRefresh) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    setError(null);

    try {
      const data = await getForecast(shopId);
      setForecastData(data);
      setOfflineDate(null);

      // Cache last forecast in localStorage for offline shell
      try {
        localStorage.setItem(`cached_forecast_${shopId}`, JSON.stringify(data));
        const saveDate = data.data_ends_on || new Date().toISOString().split('T')[0];
        localStorage.setItem(`cached_forecast_date_${shopId}`, saveDate);
        localStorage.setItem('cached_selected_shop_id', String(shopId));
      } catch (_) {}
    } catch (err) {
      // If server is unreachable, check localStorage for last saved forecast
      try {
        const cachedRaw = localStorage.getItem(`cached_forecast_${shopId}`);
        const cachedDate = localStorage.getItem(`cached_forecast_date_${shopId}`);
        if (cachedRaw) {
          const cachedData = JSON.parse(cachedRaw);
          setForecastData(cachedData);
          setOfflineDate(cachedDate || 'cached');
          setError(null); // Show the offline dashboard with banner
          return;
        }
      } catch (_) {}

      // If no cached forecast exists, show error screen with retry
      setError(err.message || 'Cannot reach the server. Is it running?');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  // Initial load
  useEffect(() => {
    loadShops();
  }, []);

  // When selected shop changes after initial boot, fetch its forecast
  useEffect(() => {
    if (selectedShopId && !isInitialBootRef.current) {
      loadForecast(selectedShopId);
    }
  }, [selectedShopId]);

  // Handler after successfully adding an entry
  const handleEntrySaved = () => {
    // Reload forecast and switch back to Home
    if (selectedShopId) {
      loadForecast(selectedShopId, true);
    }
    setActiveTab('home');
  };

  // Handler when planned payments change
  const handlePlanUpdated = () => {
    if (selectedShopId) {
      loadForecast(selectedShopId, true);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex justify-center">
      {/* Responsive layout: mobile (< 768px) centered 480px, desktop (md >= 768px) scales up to max-w-7xl */}
      <div className="w-full max-w-[480px] md:max-w-7xl min-h-screen flex flex-col md:flex-row bg-slate-50 shadow-2xl md:border-x border-slate-200 relative">
        {/* Desktop Left Sidebar (width 240px, visible on md and up) */}
        <Sidebar
          activeTab={activeTab}
          onTabChange={setActiveTab}
          language={language}
          onSelectLanguage={handleSelectLanguage}
        />

        {/* Mobile Top Navigation (visible on mobile only, < 768px) */}
        <Navbar
          shops={shops}
          selectedShopId={selectedShopId}
          onSelectShop={(id) => setSelectedShopId(id)}
          language={language}
          onSelectLanguage={handleSelectLanguage}
        />

        {/* Main Content Column across desktop and tablet */}
        <div className="flex-1 flex flex-col min-w-0 bg-slate-50">
          {/* Desktop Top Bar with Shop Picker, Refresh & WhatsApp (md and up) */}
          <DesktopTopBar
            shops={shops}
            selectedShopId={selectedShopId}
            onSelectShop={(id) => setSelectedShopId(id)}
            forecastData={forecastData}
            topTip={topTip}
            language={language}
            onRefresh={() => loadForecast(selectedShopId, true)}
            isRefreshing={isRefreshing}
          />

          {/* Main Content Area */}
          <main className="flex-1 p-4 md:p-6 lg:p-8 overflow-y-auto">
            {/* Offline Banner when showing cached forecast */}
            {offlineDate && (
              <div className="mb-4 p-3.5 bg-amber-500 text-slate-950 rounded-2xl shadow-sm flex items-center justify-between gap-3 animate-fadeIn">
                <div className="flex items-center gap-2.5 font-black text-xs sm:text-sm">
                  <WifiOff className="w-5 h-5 flex-shrink-0 text-slate-950" strokeWidth={2.5} />
                  <span>{t.offlineBanner || 'Offline - showing last saved forecast'} ({offlineDate})</span>
                </div>
                <span className="text-[10px] font-black tracking-wider bg-black/15 text-slate-950 px-2 py-0.5 rounded-md uppercase">
                  Offline
                </span>
              </div>
            )}

            {isWakingUp ? (
              <ServerWakeUpScreen
                language={language}
                elapsedSeconds={wakeUpSeconds}
              />
            ) : error ? (
              <ErrorScreen
                errorDetail={error}
                language={language}
                onRetry={() => {
                  loadShops();
                }}
              />
            ) : isLoading ? (
              <LoadingSpinner language={language} />
            ) : (
              <>
                {activeTab === 'home' && (
                  <HomeScreen
                    forecastData={forecastData}
                    language={language}
                    onRefresh={() => loadForecast(selectedShopId, true)}
                    isRefreshing={isRefreshing}
                    onTopTipLoaded={(tip) => setTopTip(tip)}
                  />
                )}

                {activeTab === 'add' && (
                  <EntryFormScreen
                    shopId={selectedShopId}
                    defaultDate={forecastData?.data_ends_on}
                    language={language}
                    onSuccessReturnHome={handleEntrySaved}
                  />
                )}

                {activeTab === 'plan' && (
                  <WhatIfScreen
                    shopId={selectedShopId}
                    forecastData={forecastData}
                    language={language}
                    onPlanUpdated={handlePlanUpdated}
                  />
                )}

                {activeTab === 'udhaar' && (
                  <UdhaarScreen
                    shopId={selectedShopId}
                    language={language}
                  />
                )}

                {activeTab === 'payments' && (
                  <PaymentsScreen
                    shopId={selectedShopId}
                    language={language}
                    onDayClosed={() => loadForecast(selectedShopId, true)}
                  />
                )}
              </>
            )}
          </main>
        </div>

        {/* Bottom Tab Bar (Mobile only, < 768px) */}
        <BottomNav
          activeTab={activeTab}
          onTabChange={setActiveTab}
          language={language}
        />
      </div>
    </div>
  );
}
