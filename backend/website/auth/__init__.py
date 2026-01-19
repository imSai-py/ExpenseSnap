"""
Authentication module.

Provides user authentication including:
- Traditional username/password login
- Google OAuth integration
- User registration
"""
from .routes import auth

__all__ = ['auth']
