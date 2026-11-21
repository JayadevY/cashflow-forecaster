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

import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import BottomNav from './components/BottomNav';
import HomeScreen from './components/HomeScreen';
import EntryFormScreen from './components/EntryFormScreen';
import WhatIfScreen from './components/WhatIfScreen';
import UdhaarScreen from './components/UdhaarScreen';
import LoadingSpinner from './components/LoadingSpinner';
import ErrorScreen from './components/ErrorScreen';
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

  // Persist language selection
  const handleSelectLanguage = (lang) => {
    setLanguage(lang);
    localStorage.setItem('cashflow_lang', lang);
  };

  // Fetch shops list on initial mount
  const loadShops = async () => {
    try {
      setError(null);
      const data = await getShops();
      setShops(data);
      if (data && data.length > 0) {
        // Cache shops for offline use
        try {
          localStorage.setItem('cached_shops', JSON.stringify(data));
        } catch (_) {}

        setSelectedShopId((prev) => prev || data[0].id);
      }
    } catch (err) {
      // If offline, check if we have cached shops
      try {
        const cachedRaw = localStorage.getItem('cached_shops');
        if (cachedRaw) {
          const cachedShops = JSON.parse(cachedRaw);
          if (cachedShops.length > 0) {
            setShops(cachedShops);
            setSelectedShopId((prev) => prev || cachedShops[0].id);
            return;
          }
        }
      } catch (_) {}
      setError(err.message || 'Cannot reach the server.');
    }
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

  // When selected shop changes, fetch its forecast
  useEffect(() => {
    if (selectedShopId) {
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
    <div className="min-h-screen bg-slate-200 flex justify-center">
      {/* Mobile-first container: max 480px centered on desktop */}
      <div className="w-full max-w-[480px] min-h-screen bg-slate-50 flex flex-col shadow-2xl border-x border-slate-200 relative">
        {/* Top Navigation */}
        <Navbar
          shops={shops}
          selectedShopId={selectedShopId}
          onSelectShop={(id) => setSelectedShopId(id)}
          language={language}
          onSelectLanguage={handleSelectLanguage}
        />

        {/* Main Content Area */}
        <main className="flex-1 p-4 overflow-y-auto">
          {/* Offline Banner when showing cached forecast */}
          {offlineDate && (
            <div className="mb-3.5 p-3.5 bg-amber-500 text-slate-950 rounded-2xl shadow-md flex items-center justify-between gap-3 animate-fadeIn">
              <div className="flex items-center gap-2.5 font-black text-xs sm:text-sm">
                <WifiOff className="w-5 h-5 flex-shrink-0 text-slate-950" strokeWidth={2.5} />
                <span>{t.offlineBanner || 'Offline - showing last saved forecast'} ({offlineDate})</span>
              </div>
              <span className="text-[10px] font-black tracking-wider bg-black/15 text-slate-950 px-2 py-0.5 rounded-md uppercase">
                Offline
              </span>
            </div>
          )}

          {error ? (
            <ErrorScreen
              errorDetail={error}
              language={language}
              onRetry={() => {
                if (!shops.length) {
                  loadShops();
                } else if (selectedShopId) {
                  loadForecast(selectedShopId);
                }
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
            </>
          )}
        </main>

        {/* Bottom Tab Bar */}
        <BottomNav
          activeTab={activeTab}
          onTabChange={setActiveTab}
          language={language}
        />
      </div>
    </div>
  );
}
