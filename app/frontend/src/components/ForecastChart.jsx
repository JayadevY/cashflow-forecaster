/**
 * ForecastChart Component
 *
 * Renders an interactive 7-day probabilistic cash flow chart using Recharts:
 * 1. Shaded band between cash_p10 and cash_p90 (cash uncertainty range)
 * 2. Solid bold line for cash_p50 (median expected cash)
 * 3. Dashed red reference line for safety threshold
 * 4. Coloured dots on each day corresponding to alert_level (green/amber/red)
 */

import React from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  ReferenceLine,
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts';
import { formatRupees, formatFriendlyDate } from '../utils/formatters';
import { TRANSLATIONS } from '../i18n';

// Custom dot rendered on the line colored by alert_level
const ColouredDot = (props) => {
  const { cx, cy, payload } = props;
  if (!cx || !cy) return null;

  let fill = '#10b981'; // Green (Safe)
  if (payload.alert_level === 'amber') fill = '#f59e0b'; // Amber (Watch)
  if (payload.alert_level === 'red') fill = '#ef4444'; // Red (Danger)

  return (
    <circle
      cx={cx}
      cy={cy}
      r={5.5}
      fill={fill}
      stroke="#ffffff"
      strokeWidth={2}
      className="drop-shadow-sm"
    />
  );
};

// Friendly custom tooltip formatted in Indian rupees
const CustomTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-slate-900 text-white p-3 rounded-2xl shadow-xl text-xs space-y-1.5 border border-slate-700">
        <div className="font-bold text-sm text-slate-200 border-b border-slate-700 pb-1">
          {formatFriendlyDate(data.date)}
        </div>
        <div>
          <span className="text-slate-400">Expected: </span>
          <span className="font-extrabold text-emerald-400 text-sm">
            ₹{formatRupees(data.cash_p50)}
          </span>
        </div>
        <div className="text-slate-300">
          <span className="text-slate-400">Range: </span>
          ₹{formatRupees(data.cash_p10)} – ₹{formatRupees(data.cash_p90)}
        </div>
        <div className="pt-1 flex items-center justify-between gap-3">
          <span className="text-slate-400">Low Cash Risk:</span>
          <span
            className={`font-bold px-1.5 py-0.5 rounded text-[11px] ${
              data.alert_level === 'red'
                ? 'bg-rose-500/30 text-rose-300'
                : data.alert_level === 'amber'
                ? 'bg-amber-500/30 text-amber-300'
                : 'bg-emerald-500/30 text-emerald-300'
            }`}
          >
            {data.risk_pct}%
          </span>
        </div>
      </div>
    );
  }
  return null;
};

export default function ForecastChart({ forecastData, language = 'en' }) {
  const t = TRANSLATIONS[language] || TRANSLATIONS.en;

  if (!forecastData || !forecastData.forecast || forecastData.forecast.length === 0) {
    return null;
  }

  const { forecast, threshold } = forecastData;

  // Format data for Recharts: create an array with short day labels and range array
  const chartData = forecast.map((d) => {
    const dt = new Date(d.date + 'T00:00:00');
    const dayLabel = dt.toLocaleDateString('en-IN', { weekday: 'narrow', day: 'numeric' });
    return {
      ...d,
      dayLabel,
      // For shaded area range [cash_p10, cash_p90]
      cashRange: [d.cash_p10, d.cash_p90],
    };
  });

  return (
    <div className="bg-white rounded-3xl p-4 border-2 border-slate-200 shadow-sm space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-extrabold text-slate-900 text-base">
          {t.sevenDayForecast}
        </h3>
        {/* Legend */}
        <div className="flex items-center gap-3 text-[11px] font-bold text-slate-500">
          <div className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block"></span>
            <span>{t.statusSafe}</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-full bg-amber-500 inline-block"></span>
            <span>{t.statusWatch}</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-full bg-rose-500 inline-block"></span>
            <span>{t.statusDanger}</span>
          </div>
        </div>
      </div>

      <div className="w-full h-56 lg:h-[360px] -ml-2">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 10, right: 12, left: -4, bottom: 0 }}>
            {/* Shaded confidence band between p10 and p90 */}
            <Area
              type="monotone"
              dataKey="cashRange"
              fill="#22c55e"
              fillOpacity={0.15}
              stroke="none"
              isAnimationActive={false}
            />

            {/* Safety Threshold Dashed Line */}
            {threshold && (
              <ReferenceLine
                y={threshold}
                stroke="#ef4444"
                strokeDasharray="4 4"
                strokeWidth={2}
              />
            )}

            {/* Expected cash line (p50) with colored dots */}
            <Line
              type="monotone"
              dataKey="cash_p50"
              stroke="#0f172a"
              strokeWidth={3}
              dot={<ColouredDot />}
              activeDot={{ r: 7 }}
              isAnimationActive={false}
            />

            <XAxis
              dataKey="dayLabel"
              tickLine={false}
              axisLine={{ stroke: '#cbd5e1' }}
              tick={{ fill: '#64748b', fontSize: 11, fontWeight: 700 }}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
              tick={{ fill: '#94a3b8', fontSize: 10 }}
              width={42}
            />
            <Tooltip content={<CustomTooltip />} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-100">
        <span className="flex items-center gap-1.5 font-medium">
          <span className="w-3.5 h-0.5 bg-rose-500 border-b border-dashed border-rose-500 inline-block"></span>
          <span>Dashed line: {t.safetyThreshold} (₹{formatRupees(threshold)})</span>
        </span>
        <span className="font-semibold text-slate-400">Shaded: 80% range</span>
      </div>
    </div>
  );
}
