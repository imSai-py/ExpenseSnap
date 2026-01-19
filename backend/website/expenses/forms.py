"""
Expense forms with CSRF protection and validation.

This module provides Flask-WTF forms for expense management
with built-in validation for amounts and currency codes.
"""
from flask_wtf import FlaskForm
from wtforms import StringField, DecimalField, SelectField
from wtforms.validators import DataRequired, Length, NumberRange
from decimal import Decimal


# Available currency choices
CURRENCY_CHOICES = [
    ('USD', 'USD ($)'),
    ('EUR', 'EUR (Euro)'),
    ('GBP', 'GBP (Pound)'),
    ('INR', 'INR (Rupee)'),
    ('JPY', 'JPY (Yen)'),
    ('CNY', 'CNY (Yuan)'),
    ('AUD', 'AUD (A$)'),
    ('CAD', 'CAD (C$)'),
    ('SGD', 'SGD (S$)'),
    ('AED', 'AED (Dirham)')
]

# Available expense categories
CATEGORY_CHOICES = [
    ('Food', 'Food'),
    ('Transport', 'Transport'),
    ('Bills', 'Bills'),
    ('Entertainment', 'Entertainment'),
    ('Shopping', 'Shopping'),
    ('Health', 'Health'),
    ('Other', 'Other')
]


class ExpenseForm(FlaskForm):
    """
    Form for adding and editing expenses.

    Validates that amount is positive and within reasonable bounds.

    Attributes:
        item_name: Description of the expense (1-100 characters)
        amount: Expense amount (positive, 2 decimal places)
        currency: Currency code from predefined list
        category: Expense category from predefined list
    """

    item_name = StringField('Item Name', validators=[
        DataRequired(message="Item name is required"),
        Length(min=1, max=100, message="Item name must be 1-100 characters")
    ])
    amount = DecimalField('Amount', validators=[
        DataRequired(message="Amount is required"),
        NumberRange(min=Decimal('0.01'), message="Amount must be positive")
    ], places=2)
    currency = SelectField('Currency', choices=CURRENCY_CHOICES, validators=[
        DataRequired()
    ])
    category = SelectField('Category', choices=CATEGORY_CHOICES, validators=[
        DataRequired()
    ])


class CurrencyPreferenceForm(FlaskForm):
    """
    Form for setting user's preferred display currency.

    Attributes:
        preferred_currency: Selected currency from predefined list
    """

    preferred_currency = SelectField(
        'Preferred Currency',
        choices=CURRENCY_CHOICES,
        validators=[DataRequired()]
    )
