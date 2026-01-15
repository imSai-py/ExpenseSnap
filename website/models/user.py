"""
User model for authentication and preferences.

This module defines the User model with support for both
traditional password authentication and OAuth.
"""
from typing import Optional

from flask_login import UserMixin
from werkzeug.security import generate_password_hash, check_password_hash

from ..extensions import db


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
        expenses: Relationship to user's expenses
    """
    __tablename__ = 'user'

    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False, index=True)
    email = db.Column(db.String(120), unique=True, nullable=True, index=True)
    password_hash = db.Column(db.String(255), nullable=True)
    preferred_currency = db.Column(db.String(10), nullable=False, default='USD')
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
