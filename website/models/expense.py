"""
Expense model for tracking user expenses.

This module defines the Expense model with proper data types,
indexes for performance, and utility methods.
"""
from datetime import datetime
from decimal import Decimal
from typing import Dict, Any

from ..extensions import db


class Expense(db.Model):
    """
    Represents a single expense entry.

    Attributes:
        id: Primary key
        item_name: Description of the expense
        amount: Expense amount (stored as Numeric for precision)
        currency: Currency code (e.g., 'USD', 'EUR')
        category: Expense category
        date_added: Timestamp when expense was created
        user_id: Foreign key to User
    """
    __tablename__ = 'expense'

    id = db.Column(db.Integer, primary_key=True)
    item_name = db.Column(db.String(100), nullable=False)
    # Use Numeric for monetary values to avoid floating-point issues
    amount = db.Column(db.Numeric(10, 2), nullable=False)
    currency = db.Column(db.String(10), nullable=False, default='USD')
    category = db.Column(db.String(50), nullable=False)
    date_added = db.Column(db.DateTime, default=datetime.utcnow, index=True)
    user_id = db.Column(
        db.Integer,
        db.ForeignKey('user.id'),
        nullable=False,
        index=True
    )

    # Add composite indexes for common queries
    __table_args__ = (
        db.Index('idx_user_date', 'user_id', 'date_added'),
        db.Index('idx_user_category', 'user_id', 'category'),
    )

    def __repr__(self) -> str:
        """Return string representation of expense."""
        return f'<Expense {self.item_name}: {self.currency} {self.amount}>'

    def to_dict(self) -> Dict[str, Any]:
        """
        Convert expense to dictionary.

        Returns:
            Dictionary representation of the expense
        """
        return {
            'id': self.id,
            'item_name': self.item_name,
            'amount': float(self.amount),
            'currency': self.currency,
            'category': self.category,
            'date_added': self.date_added.isoformat() if self.date_added else None,
            'user_id': self.user_id
        }

    @classmethod
    def validate_amount(cls, amount: Decimal) -> bool:
        """
        Validate that amount is positive.

        Args:
            amount: The amount to validate

        Returns:
            True if amount is positive, False otherwise
        """
        return amount > 0
