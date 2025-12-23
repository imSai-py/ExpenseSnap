# Static Exchange Rates (Fixed for project demo)
EXCHANGE_RATES = {
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

def convert_currency(amount, from_curr, to_curr):
    if from_curr == to_curr:
        return amount
    # Convert to USD first (base), then to target
    amount_in_usd = amount / EXCHANGE_RATES.get(from_curr, 1.0)
    return amount_in_usd * EXCHANGE_RATES.get(to_curr, 1.0)
