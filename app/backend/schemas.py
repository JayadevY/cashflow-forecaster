"""
Pydantic schemas and data validation models for Daily Cash-Flow Forecaster API.

These models define the exact structure of data coming into the API from users
and data going back out in API responses. Pydantic automatically checks types,
enforces positive numbers, and rejects invalid dates.
"""

from datetime import date, datetime
from typing import List, Optional
from pydantic import BaseModel, Field, field_validator


# ============================================================================
# Shop Schemas
# ============================================================================

class ShopCreate(BaseModel):
    """Data sent by user to register a new shop."""
    name: str = Field(..., min_length=1, description="Friendly display name of the shop")
    shop_type: str = Field(..., description="Business category: tea_stall, vegetable_shop, tiffin_center, or kirana")
    opening_cash: float = Field(0.0, ge=0, description="Cash in drawer on day zero (cannot be negative)")
    low_cash_threshold: Optional[float] = Field(None, ge=0, description="Custom low-cash emergency threshold in rupees")

    @field_validator("shop_type")
    def validate_shop_type(cls, v: str) -> str:
        valid_types = {"tea_stall", "vegetable_shop", "tiffin_center", "kirana"}
        if v not in valid_types:
            raise ValueError(f"Invalid shop_type '{v}'. Must be one of: {sorted(list(valid_types))}")
        return v


class ShopOut(BaseModel):
    """Shop profile returned to the user."""
    id: int
    name: str
    shop_type: str
    low_cash_threshold: Optional[float] = None
    opening_cash: float

    class Config:
        from_attributes = True


class ShopSettingsUpdate(BaseModel):
    """Allows the shop owner to adjust their safety threshold or name."""
    low_cash_threshold: Optional[float] = Field(None, ge=0, description="New low cash threshold in rupees")
    name: Optional[str] = Field(None, min_length=1, description="Updated shop name")


# ============================================================================
# Daily Entry Schemas
# ============================================================================

class DailyEntryCreate(BaseModel):
    """
    Data entered by the owner at the end of each day.
    The owner only inputs what they saw: sales, credit, udhaar, expenses, and personal withdrawal.
    The server will calculate closing_cash automatically.
    """
    date: str = Field(..., description="Date of the business day in YYYY-MM-DD format")
    cash_sales: float = Field(..., ge=0, description="Cash collected from sales today (rupees)")
    credit_given: float = Field(0.0, ge=0, description="New udhaar/credit extended to customers today")
    udhaar_collected: float = Field(0.0, ge=0, description="Past udhaar cash paid back by customers today")
    expenses: float = Field(..., ge=0, description="Cash spent on stock, milk, vegetables, fuel, etc.")
    owner_withdrawal: float = Field(0.0, ge=0, description="Cash drawn by owner for personal/family use")

    @field_validator("date")
    def validate_date_not_future(cls, v: str) -> str:
        """Reject malformed dates and dates in the future."""
        try:
            entry_date = datetime.strptime(v, "%Y-%m-%d").date()
        except ValueError:
            raise ValueError("Date must be formatted as YYYY-MM-DD (e.g. 2026-10-31)")

        if entry_date > date.today():
            raise ValueError(f"Future dates are not allowed. Date '{v}' is after today ({date.today()}).")
        return v


class DailyEntryOut(BaseModel):
    """Complete recorded daily entry returned by the database."""
    id: int
    shop_id: int
    date: str
    cash_sales: float
    credit_given: float
    udhaar_collected: float
    expenses: float
    owner_withdrawal: float
    unplanned_outflow: float
    closing_cash: float

    class Config:
        from_attributes = True


# ============================================================================
# Planned Payment Schemas
# ============================================================================

class PlannedPaymentCreate(BaseModel):
    """A future bill or bulk purchase the shopkeeper knows is coming up."""
    date: str = Field(..., description="Future date when payment is due in YYYY-MM-DD")
    amount: float = Field(..., gt=0, description="Amount to be paid in rupees (must be positive)")
    note: Optional[str] = Field(None, description="Optional note, e.g. 'Dairy supplier bill' or 'Shop rent'")

    @field_validator("date")
    def validate_date_format(cls, v: str) -> str:
        try:
            datetime.strptime(v, "%Y-%m-%d")
        except ValueError:
            raise ValueError("Date must be formatted as YYYY-MM-DD (e.g. 2026-11-05)")
        return v


class PlannedPaymentOut(BaseModel):
    """Stored planned payment."""
    id: int
    shop_id: int
    date: str
    amount: float
    note: Optional[str] = None

    class Config:
        from_attributes = True


# ============================================================================
# Forecast & Risk Schemas
# ============================================================================

class ForecastDayOut(BaseModel):
    """Detailed forecast for a single calendar day in the 7-day forecast horizon."""
    date: str
    sales_p10: float = Field(..., description="10th percentile pessimistic sales forecast")
    sales_p50: float = Field(..., description="50th percentile median sales forecast")
    sales_p90: float = Field(..., description="90th percentile optimistic sales forecast")
    cash_p10: float = Field(..., description="Pessimistic till cash balance at end of day")
    cash_p50: float = Field(..., description="Expected till cash balance at end of day")
    cash_p90: float = Field(..., description="Optimistic till cash balance at end of day")
    risk_pct: float = Field(..., ge=0.0, le=100.0, description="Chance (0-100%) that cash falls below threshold")
    alert_level: str = Field(..., description="'green' (<20%), 'amber' (20-50%), or 'red' (>50%)")
    alert_message: str = Field(..., description="Plain language explanation of risk for this day")


class ForecastResponse(BaseModel):
    """Complete 7-day cash forecast response."""
    shop_id: int
    shop_name: str
    shop_type: str
    mode: str = Field(..., description="'full' (AI model with residual simulations) or 'basic' (moving-average)")
    message: str = Field(..., description="Status or guidance note for the shop owner")
    start_cash: float = Field(..., description="Current closing cash balance starting the forecast")
    threshold: float = Field(..., description="Safety line used to detect low cash alerts (rupees)")
    forecast: List[ForecastDayOut]


# ============================================================================
# What-If Scenario Schemas
# ============================================================================

class WhatIfResponse(BaseModel):
    """Results from evaluating a hypothetical future expense."""
    shop_id: int
    target_date: str = Field(..., description="The planned date requested by the owner")
    amount: float = Field(..., description="Proposed payment amount")
    verdict: str = Field(..., description="'ok', 'better_day_exists', or 'too_large'")
    max_safe_amount: int = Field(..., ge=0, description="Largest payment (steps of Rs 1,000) on target_date keeping peak risk under 20%")
    current_date_peak_risk: float = Field(..., description="Highest risk percentage during the week if paid on target_date")
    safest_day: str = Field(..., description="The day within the 7-day window that produces the lowest max risk")
    safest_day_peak_risk: float = Field(..., description="Peak risk percentage if paid on the safest day")
    recommendation: str = Field(..., description="Clear advice on when it is safest to pay")
    forecast: List[ForecastDayOut] = Field(..., description="7-day forecast if paid on target_date")


# ============================================================================
# Udhaar (Credit Tracker) Schemas
# ============================================================================

class UdhaarCreate(BaseModel):
    """Data sent by shop owner to record credit (udhaar) given to a customer."""
    customer_name: str = Field(..., min_length=1, description="Customer name (cannot be blank)")
    amount_given: float = Field(..., gt=0, description="Rupee amount of credit given (must be > 0)")
    given_date: Optional[str] = Field(None, description="Date credit was given in YYYY-MM-DD (defaults to today)")
    due_date: Optional[str] = Field(None, description="Optional repayment due date in YYYY-MM-DD")
    note: Optional[str] = Field(None, description="Optional items or reason, e.g. 'Rice and oil'")

    @field_validator("customer_name")
    def validate_customer_name(cls, v: str) -> str:
        trimmed = v.strip()
        if not trimmed:
            raise ValueError("customer_name cannot be blank")
        return trimmed

    @field_validator("given_date")
    def validate_given_date(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            try:
                d = datetime.strptime(v, "%Y-%m-%d").date()
                if v != d.strftime("%Y-%m-%d"):
                    raise ValueError
            except ValueError:
                raise ValueError("given_date must be formatted as YYYY-MM-DD")
        return v

    @field_validator("due_date")
    def validate_due_date(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            try:
                d = datetime.strptime(v, "%Y-%m-%d").date()
                if v != d.strftime("%Y-%m-%d"):
                    raise ValueError
            except ValueError:
                raise ValueError("due_date must be formatted as YYYY-MM-DD")
        return v


class UdhaarPaymentCreate(BaseModel):
    """Payment recorded against an open udhaar credit entry."""
    amount: float = Field(..., ge=1.0, description="Amount collected from customer (must be >= 1)")
    note: Optional[str] = Field(None, description="Optional note, e.g. 'Cash payment'")


class UdhaarOut(BaseModel):
    """Customer credit record returned to user."""
    id: int
    shop_id: int
    customer_name: str
    amount_given: float
    amount_paid: float
    balance: float
    given_date: str
    due_date: Optional[str] = None
    days_overdue: int = 0
    note: Optional[str] = None
    status: str

    class Config:
        from_attributes = True


class UdhaarTopCustomer(BaseModel):
    """Aggregated top customer balance."""
    customer_name: str
    balance: float


class UdhaarSummaryResponse(BaseModel):
    """Overall credit summary for the shop."""
    shop_id: int
    total_outstanding: float
    customer_count: int
    overdue_amount: float
    collect_today: List[UdhaarOut]
    top_customers: List[UdhaarTopCustomer]


# ============================================================================
# System Health Schema
# ============================================================================

class HealthResponse(BaseModel):
    status: str
    app: str
