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

export default function App() {
  // Active screen tab: 'home' | 'add' | 'plan'
  const [activeTab, setActiveTab] = useState('home');

  // Selected language: 'en' | 'ta' | 'hi'
  const [language, setLanguage] = useState(() => {
    return localStorage.getItem('cashflow_lang') || 'en';
  });

  // Shops & Selected Shop
  const [shops, setShops] = useState([]);
  const [selectedShopId, setSelectedShopId] = useState(null);

  // Forecast data for the selected shop
  const [forecastData, setForecastData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState(null);

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
        // Default to first shop if none selected
        setSelectedShopId((prev) => prev || data[0].id);
      }
    } catch (err) {
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
    } catch (err) {
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
