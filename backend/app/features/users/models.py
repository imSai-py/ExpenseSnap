"""
User model for authentication and preferences.

This module defines the User model with support for both
traditional password authentication and OAuth.
"""
from datetime import datetime
from typing import Optional

from flask_login import UserMixin
from werkzeug.security import generate_password_hash, check_password_hash

# Changed import to point to new core location
from app.core.extensions import db


class User(UserMixin, db.Model):
    """
    Represents an application user.

    Supports both traditional password authentication
    and OAuth (Google) authentication.

    Attributes:
        id: Primary key
        username: Unique username
        email: User's email (required for OAuth users)
        password_hash: Hashed password (None for OAuth-only users)
        preferred_currency: User's display currency preference
        profile_photo: URL/path to user's profile photo
        expenses: Relationship to user's expenses
    """
    __tablename__ = 'user'

    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False, index=True)
    email = db.Column(db.String(120), unique=True, nullable=True, index=True)
    google_id = db.Column(db.String(255), unique=True, nullable=True, index=True)
    password_hash = db.Column(db.String(255), nullable=True)
    preferred_currency = db.Column(db.String(10), nullable=False, default='USD')
    profile_photo = db.Column(db.Text, nullable=True)  # Stores base64 data URL

    # Notification preferences
    notify_daily_reminders = db.Column(db.Boolean, nullable=False, default=True)
    notify_budget_alerts = db.Column(db.Boolean, nullable=False, default=True)

    # Budget alert spam prevention
    # Stores the month (YYYY-MM) when the last budget alert was sent
    # Resets each month so user gets notified once per month when exceeding threshold
    budget_alert_sent_month = db.Column(db.String(7), nullable=True)  # Format: "2024-01"

    # Monthly budget limit set by user (0 means not set, will fall back to income-based alerts)
    monthly_limit = db.Column(db.Numeric(10, 2), nullable=False, default=0)

    expenses = db.relationship('Expense', backref='owner', lazy='dynamic')

    def __repr__(self) -> str:
        """Return string representation of user."""
        return f'<User {self.username}>'

    def set_password(self, password: str) -> None:
        """
        Hash and store user password.

        Args:
            password: Plain text password to hash
        """
        self.password_hash = generate_password_hash(password)

    def check_password(self, password: str) -> bool:
        """
        Verify password against stored hash.

        Args:
            password: Plain text password to verify

        Returns:
            True if password matches, False otherwise
        """
        if self.password_hash is None:
            return False
        return check_password_hash(self.password_hash, password)

    @property
    def is_oauth_user(self) -> bool:
        """
        Check if user authenticated via OAuth.

        Returns:
            True if user is OAuth-only (no password), False otherwise
        """
        return self.password_hash is None and self.email is not None

    def to_dict(self):
        """Return dict representation of user."""
        return {
            'id': self.id,
            'username': self.username,
            'email': self.email,
            'preferred_currency': self.preferred_currency,
            'profile_photo': self.profile_photo,
            'notify_daily_reminders': self.notify_daily_reminders,
            'notify_budget_alerts': self.notify_budget_alerts,
            'monthly_limit': float(self.monthly_limit) if self.monthly_limit else 0,
            'is_oauth_user': self.is_oauth_user,
            'google_id': self.google_id is not None,
        }
