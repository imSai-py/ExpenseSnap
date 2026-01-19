"""
Expense business logic services.

This module separates business logic from route handlers,
improving testability and maintainability.
"""
from decimal import Decimal
from typing import Dict, List, Optional
from dataclasses import dataclass
from datetime import datetime, timedelta

from ..models.expense import Expense
from .utils import convert_currency, EXCHANGE_RATES, CURRENCY_SYMBOLS


@dataclass
class ExpenseSummary:
    """
    Summary of user expenses with totals and category breakdown.

    Attributes:
        total_balance: Net balance (income - expense)
        total_income: Total income
        total_expense: Total expenses
        category_totals: Dictionary mapping categories to totals
        currency: The currency code for all amounts
    """
    total_balance: Decimal
    total_income: Decimal
    total_expense: Decimal
    category_totals: Dict[str, Decimal]
    currency: str

    @property
    def chart_labels(self) -> List[str]:
        """Get category labels for charting."""
        return list(self.category_totals.keys())

    @property
    def chart_values(self) -> List[float]:
        """Get category values for charting."""
        return [float(v) for v in self.category_totals.values()]


class ExpenseService:
    """Service class for expense-related business logic."""

    @staticmethod
    def calculate_summary(
        expenses: List[Expense],
        preferred_currency: str
    ) -> ExpenseSummary:
        """
        Calculate expense totals and category breakdown in a single pass.

        This is optimized to iterate over expenses only once,
        calculating both total and per-category amounts.

        Args:
            expenses: List of user expenses
            preferred_currency: Currency code for conversion

        Returns:
            ExpenseSummary with totals and category breakdown
        """
        total_income = Decimal('0')
        total_expense = Decimal('0')
        category_totals: Dict[str, Decimal] = {}

        # Single loop for efficiency
        for expense in expenses:
            converted_amount = Decimal(str(
                convert_currency(
                    float(expense.amount),
                    expense.currency,
                    preferred_currency
                )
            ))
            
            # Handle standard expense type (default if not set)
            # We treat 'expense' as the default for backward compatibility
            expense_type = getattr(expense, 'type', 'expense')
            
            if expense_type == 'income':
                total_income += converted_amount
            else:
                total_expense += converted_amount
                # Only track categories for expenses
                if expense.category in category_totals:
                    category_totals[expense.category] += converted_amount
                else:
                    category_totals[expense.category] = converted_amount

        return ExpenseSummary(
            total_balance=total_income - total_expense,
            total_income=total_income,
            total_expense=total_expense,
            category_totals=category_totals,
            currency=preferred_currency
        )

    @staticmethod
    def get_user_expenses(user_id: int, period: Optional[str] = None) -> List[Expense]:
        """
        Get all expenses for a user, ordered by date descending.
        Optionally filter by time period.

        Args:
            user_id: The user's ID
            period: Optional filter - 'this_week', 'this_month', 'last_month',
                    'this_year', or None for all time

        Returns:
            List of Expense objects ordered by most recent first
        """
        query = Expense.query.filter(Expense.user_id == user_id)

        if period:
            now = datetime.now()
            start_date = None
            end_date = None

            if period == 'this_week':
                # Start of current week (Monday)
                start_date = now - timedelta(days=now.weekday())
                start_date = start_date.replace(hour=0, minute=0, second=0, microsecond=0)
            elif period == 'this_month':
                # Start of current month
                start_date = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
            elif period == 'last_month':
                # Start and end of last month
                first_of_this_month = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
                end_date = first_of_this_month - timedelta(seconds=1)
                if now.month == 1:
                    start_date = now.replace(year=now.year - 1, month=12, day=1,
                                            hour=0, minute=0, second=0, microsecond=0)
                else:
                    start_date = now.replace(month=now.month - 1, day=1,
                                            hour=0, minute=0, second=0, microsecond=0)
            elif period == 'this_year':
                # Start of current year
                start_date = now.replace(month=1, day=1, hour=0, minute=0, second=0, microsecond=0)

            if start_date:
                query = query.filter(Expense.date_added >= start_date)
            if end_date:
                query = query.filter(Expense.date_added <= end_date)

        return query.order_by(Expense.date_added.desc()).all()

    @staticmethod
    def get_currency_symbols() -> Dict[str, str]:
        """
        Get currency code to symbol mapping.

        Returns:
            Dictionary mapping currency codes to display symbols
        """
        return CURRENCY_SYMBOLS.copy()

    @staticmethod
    def validate_currency(currency: str) -> bool:
        """
        Check if currency code is supported.

        Args:
            currency: Currency code to validate

        Returns:
            True if currency is supported, False otherwise
        """
        return currency in EXCHANGE_RATES
