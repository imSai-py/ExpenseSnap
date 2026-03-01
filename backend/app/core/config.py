"""
Application configuration classes for different environments.

This module provides environment-specific configuration classes
following Flask best practices for configuration management.
"""
import os
from typing import Optional


class Config:
    """Base configuration with secure defaults."""

    # Security - MUST be set via environment variable in production
    SECRET_KEY: str = os.environ.get('SECRET_KEY') or os.urandom(32).hex()

    # Database
    SQLALCHEMY_TRACK_MODIFICATIONS: bool = False

    # SQLAlchemy Engine Options for connection pool management
    # These settings help prevent connection timeouts during development
    SQLALCHEMY_ENGINE_OPTIONS: dict = {
        'pool_pre_ping': True,           # Test connections before using them
        'pool_recycle': 300,             # Recycle connections after 5 minutes
        'pool_timeout': 20,              # Wait up to 20 seconds for a connection
        'pool_size': 5,                  # Maintain 5 connections in the pool
        'max_overflow': 10,              # Allow up to 10 additional connections
        'echo': False,                   # Set to True to log all SQL queries
    }

    # Session security - for cross-domain (Vercel frontend + Render backend)
    SESSION_COOKIE_SECURE: bool = True  # Required for SameSite=None
    SESSION_COOKIE_HTTPONLY: bool = True
    SESSION_COOKIE_SAMESITE: str = 'None'  # Allow cross-domain cookies

    # CSRF Protection
    WTF_CSRF_ENABLED: bool = True
    WTF_CSRF_TIME_LIMIT: int = 3600  # 1 hour

    # OAuth
    GOOGLE_CLIENT_ID: Optional[str] = os.environ.get('GCLOUD_CLIENT_ID')
    GOOGLE_CLIENT_SECRET: Optional[str] = os.environ.get('GCLOUD_CLIENT_SECRET')

    # Web Push Notifications (VAPID keys)
    # Generate keys with: vapid --gen --applicationServerKey
    # Or use: from py_vapid import Vapid; v = Vapid(); v.generate_keys()
    VAPID_PUBLIC_KEY: Optional[str] = os.environ.get('VAPID_PUBLIC_KEY')
    VAPID_PRIVATE_KEY: Optional[str] = os.environ.get('VAPID_PRIVATE_KEY')
    VAPID_CONTACT_EMAIL: str = os.environ.get('VAPID_CONTACT_EMAIL', 'admin@expensesnap.com')

    # Notification settings
    DAILY_REMINDER_HOUR: int = int(os.environ.get('DAILY_REMINDER_HOUR', '20'))  # 8 PM default
    BUDGET_ALERT_THRESHOLD: float = float(os.environ.get('BUDGET_ALERT_THRESHOLD', '0.8'))  # 80% default

    @staticmethod
    def init_app(app) -> None:
        """Initialize application-specific configuration."""
        pass

    @classmethod
    def get_database_uri(cls) -> str:
        """
        Get database URI with postgres:// to postgresql:// fix.

        Returns:
            Database URI string, defaults to SQLite if not configured.
        """
        database_url = os.environ.get('DATABASE_URL')
        if database_url and database_url.startswith("postgres://"):
            database_url = database_url.replace("postgres://", "postgresql://", 1)
        return database_url or 'sqlite:///expenses.db'


class DevelopmentConfig(Config):
    """Development environment configuration."""

    DEBUG: bool = True
    SESSION_COOKIE_SECURE: bool = False  # Allow HTTP in development
    SESSION_COOKIE_SAMESITE: str = 'Lax'  # Must be Lax (not None) when Secure=False

    @staticmethod
    def init_app(app) -> None:
        """Configure development-specific settings."""
        import logging
        logging.getLogger('werkzeug').setLevel(logging.DEBUG)


class ProductionConfig(Config):
    """Production environment configuration."""

    DEBUG: bool = False

    @classmethod
    def init_app(cls, app) -> None:
        """Configure production-specific settings with security checks."""
        Config.init_app(app)

        # Warn if using default secret key in production
        if app.config.get('SECRET_KEY') == 'dev-key-123':
            import logging
            logging.warning("WARNING: Using insecure SECRET_KEY in production!")


class TestingConfig(Config):
    """Testing environment configuration."""

    TESTING: bool = True
    SQLALCHEMY_DATABASE_URI: str = 'sqlite:///:memory:'
    WTF_CSRF_ENABLED: bool = False  # Disable CSRF for testing


# Configuration dictionary for easy access
config = {
    'development': DevelopmentConfig,
    'production': ProductionConfig,
    'testing': TestingConfig,
    'default': DevelopmentConfig
}
