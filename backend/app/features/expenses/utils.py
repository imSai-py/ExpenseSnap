"""
Currency conversion utilities.

Provides exchange rate data and conversion functions for
multi-currency expense tracking.
"""
from decimal import Decimal
from typing import Union

# Static Exchange Rates (base: USD)
EXCHANGE_RATES: dict[str, float] = {
    'USD': 1.0,
    'EUR': 0.92,
    'GBP': 0.78,
    'INR': 83.3,
    'JPY': 150.5,
    'CNY': 7.2,
    'AUD': 1.5,
    'CAD': 1.35,
    'SGD': 1.34,
    'AED': 3.67
}

# Currency symbols for display
CURRENCY_SYMBOLS: dict[str, str] = {
    'USD': '$',
    'EUR': '€',
    'GBP': '£',
    'INR': '₹',
    'JPY': '¥',
    'CNY': '¥',
    'AUD': 'A$',
    'CAD': 'C$',
    'SGD': 'S$',
    'AED': 'د.إ'
}


def convert_currency(
    amount: Union[float, Decimal],
    from_curr: str,
    to_curr: str
) -> float:
    """
    Convert amount from one currency to another.

    Uses USD as the base currency for conversion.
    Unknown currency codes default to USD rate (1.0).

    Args:
        amount: The amount to convert
        from_curr: Source currency code (e.g., 'USD', 'EUR')
        to_curr: Target currency code

    Returns:
        Converted amount as float

    Example:
        >>> convert_currency(100, 'EUR', 'USD')
        108.69565217391305
        >>> convert_currency(100, 'USD', 'USD')
        100.0
    """
    if from_curr == to_curr:
        return float(amount)

    # Convert to USD first (base), then to target
    from_rate = EXCHANGE_RATES.get(from_curr, 1.0)
    to_rate = EXCHANGE_RATES.get(to_curr, 1.0)

    amount_in_usd = float(amount) / from_rate
    return amount_in_usd * to_rate
