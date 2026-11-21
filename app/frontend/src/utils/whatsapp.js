/**
 * WhatsApp message builder utility for CashFlow Forecaster.
 * Builds localized, formatted text summaries constrained to under 400 characters.
 */

import { formatRupees, formatFriendlyDate, getStatusCue } from './formatters.js';
import { TRANSLATIONS, renderTipSentence } from '../i18n.js';

export function buildWhatsAppMessage({ forecastData, topTip, language = 'en' }) {
  if (!forecastData) return '';
  const t = TRANSLATIONS[language] || TRANSLATIONS.en;

  const shopName = forecastData.shop_name || 'My Shop';
  const cash = formatRupees(forecastData.start_cash);
  const safety = formatRupees(forecastData.threshold);

  // Find worst day in the forecast
  const forecastList = forecastData.forecast || [];
  let worstDay = null;
  if (forecastList.length > 0) {
    worstDay = forecastList.reduce(
      (max, d) => (d.risk_pct > max.risk_pct ? d : max),
      forecastList[0]
    );
  }

  const worstRisk = worstDay ? Math.round(worstDay.risk_pct) : 0;
  const worstLevel = worstDay ? worstDay.alert_level : 'green';
  const statusCue = getStatusCue(worstLevel);
  const statusWord = t[statusCue.wordKey] || 'Safe';

  const worstDate = worstDay ? formatFriendlyDate(worstDay.date, language) : '';

  // Base message lines
  const lines = [
    `*${shopName}* - ${t.waCashUpdate || 'Cash Update'}`,
    `• ${t.waCash || 'Cash'}: ₹${cash}`,
    `• ${t.waSafetyLine || 'Safety Line'}: ₹${safety}`,
    `• ${t.waStatus || 'Status'}: ${statusWord}`,
  ];

  if (worstDay) {
    lines.push(
      `• ${t.waWorstDay || 'Worst Day'}: ${worstDate} (${worstRisk}% ${t.waRisk || 'risk'})`
    );
  }

  const baseMsg = lines.join('\n');

  // Top tip sentence as last line (taken from /tips response and translated with renderTipSentence)
  const tipObj = Array.isArray(topTip) ? topTip[0] : topTip;
  let tipLine = '';
  if (tipObj) {
    const tipSentence = renderTipSentence(tipObj, language);
    if (tipSentence && tipSentence.trim()) {
      const tipPrefix = t.waTip ? `• ${t.waTip}: ` : '• Tip: ';
      tipLine = `${tipPrefix}${tipSentence.trim()}`;
    }
  }

  // Full message with tip sentence as the last line
  let fullMsg = tipLine ? `${baseMsg}\n${tipLine}` : baseMsg;

  // Keep the whole message under 400 characters; if it is too long, drop the tip last
  if (fullMsg.length > 400) {
    fullMsg = baseMsg;
  }

  // Final length safety check
  if (fullMsg.length > 400) {
    fullMsg = fullMsg.substring(0, 397) + '...';
  }

  return fullMsg.trim();
}

/**
 * Open WhatsApp sharing link in a new tab.
 */
export function openWhatsAppShare(params) {
  const message = buildWhatsAppMessage(params);
  const url = `https://wa.me/?text=${encodeURIComponent(message)}`;
  window.open(url, '_blank', 'noopener,noreferrer');
}
