"""
Expense business logic services.

This module separates business logic from route handlers,
improving testability and maintainability.
"""
from decimal import Decimal
from typing import Dict, List
from dataclasses import dataclass

from ..models.expense import Expense
from .utils import convert_currency, EXCHANGE_RATES, CURRENCY_SYMBOLS


@dataclass
class ExpenseSummary:
    """
    Summary of user expenses with totals and category breakdown.

    Attributes:
        total: Total expenses in preferred currency
        category_totals: Dictionary mapping categories to totals
        currency: The currency code for all amounts
    """
    total: Decimal
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
        total = Decimal('0')
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
            total += converted_amount

            if expense.category in category_totals:
                category_totals[expense.category] += converted_amount
            else:
                category_totals[expense.category] = converted_amount

        return ExpenseSummary(
            total=total,
            category_totals=category_totals,
            currency=preferred_currency
        )

    @staticmethod
    def get_user_expenses(user_id: int) -> List[Expense]:
        """
        Get all expenses for a user, ordered by date descending.

        Args:
            user_id: The user's ID

        Returns:
            List of Expense objects ordered by most recent first
        """
        return Expense.query.filter(
            Expense.user_id == user_id
        ).order_by(Expense.date_added.desc()).all()

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
