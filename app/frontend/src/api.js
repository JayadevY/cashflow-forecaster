/**
 * API client module for communicating with the FastAPI backend.
 * All backend routes are cleanly defined here.
 */

import { API_BASE_URL } from './config';

/**
 * Helper to handle fetch responses and extract helpful error messages.
 */
async function handleResponse(response) {
  if (!response.ok) {
    let errorDetail = 'Network request failed';
    try {
      const errJson = await response.json();
      if (errJson && errJson.detail) {
        if (Array.isArray(errJson.detail)) {
          // Pydantic validation error list
          errorDetail = errJson.detail.map((e) => e.msg || e.detail).join(', ');
        } else {
          errorDetail = String(errJson.detail);
        }
      }
    } catch (_) {
      errorDetail = response.statusText || `Error ${response.status}`;
    }
    const err = new Error(errorDetail);
    err.status = response.status;
    throw err;
  }
  return response.json();
}

/**
 * 1. Fetch all registered shops
 */
export async function getShops() {
  const res = await fetch(`${API_BASE_URL}/shops`);
  return handleResponse(res);
}

/**
 * 2. Fetch 7-day probabilistic forecast for a specific shop
 */
export async function getForecast(shopId) {
  const res = await fetch(`${API_BASE_URL}/shops/${shopId}/forecast`);
  return handleResponse(res);
}

/**
 * 3. Log a daily entry entered by the shop owner
 */
export async function addDailyEntry(shopId, entryData) {
  const res = await fetch(`${API_BASE_URL}/shops/${shopId}/entries`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(entryData),
  });
  return handleResponse(res);
}

/**
 * 4. Get recent daily transaction entries
 */
export async function getDailyEntries(shopId, days = 30) {
  const res = await fetch(`${API_BASE_URL}/shops/${shopId}/entries?days=${days}`);
  return handleResponse(res);
}

/**
 * 5. Fetch upcoming planned payments for a shop
 */
export async function getPlannedPayments(shopId) {
  const res = await fetch(`${API_BASE_URL}/shops/${shopId}/planned-payments`);
  return handleResponse(res);
}

/**
 * 6. Add a new planned bill or supplier payment
 */
export async function addPlannedPayment(shopId, paymentData) {
  const res = await fetch(`${API_BASE_URL}/shops/${shopId}/planned-payments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(paymentData),
  });
  return handleResponse(res);
}

/**
 * 7. Delete an upcoming planned payment by ID
 */
export async function deletePlannedPayment(shopId, paymentId) {
  const res = await fetch(`${API_BASE_URL}/shops/${shopId}/planned-payments/${paymentId}`, {
    method: 'DELETE',
  });
  return handleResponse(res);
}

/**
 * 8. Simulate what-if payment scenario
 */
export async function checkWhatIf(shopId, date, amount) {
  const params = new URLSearchParams({
    date: String(date),
    amount: String(amount),
  });
  const res = await fetch(`${API_BASE_URL}/shops/${shopId}/what-if?${params.toString()}`);
  return handleResponse(res);
}
