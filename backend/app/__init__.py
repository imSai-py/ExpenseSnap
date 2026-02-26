"""
ExpenseSnap Application Factory.

This module implements the Flask application factory pattern,
providing centralized app creation, configuration, and extension initialization.
"""
import os
import logging
from logging.handlers import RotatingFileHandler
from typing import Optional

from flask import Flask, render_template, send_from_directory, jsonify, redirect, url_for
from flask_cors import CORS

from app.core.extensions import db, login_manager, oauth, csrf, init_oauth, migrate
from app.core.config import config


def create_app(config_name: Optional[str] = None) -> Flask:
    """
    Create and configure the Flask application.

    Args:
        config_name: Configuration environment ('development', 'production', 'testing')
                    Defaults to FLASK_ENV environment variable or 'development'

    Returns:
        Configured Flask application instance
    """
    if config_name is None:
        config_name = os.environ.get('FLASK_ENV', 'development')

    app = Flask(
        __name__,
        template_folder='templates',  # Relative to app package
        static_folder='static'       # Relative to app package
    )

    # Load configuration
    app.config.from_object(config[config_name])
    app.config['SQLALCHEMY_DATABASE_URI'] = config[config_name].get_database_uri()
    config[config_name].init_app(app)

    # CORS configuration - allow both development and production origins
    allowed_origins = [
        # Development origins
        "http://localhost:5000",
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:5175",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5000",
        # Production origins - Firebase
        "https://expensesnap-a1995.web.app",
        "https://expensesnap-a1995.firebaseapp.com",
        # Legacy origins - Render/Vercel (keep for transition)
        "https://expensesnap-crp6.onrender.com",
        "https://expense-snap-chi.vercel.app",
    ]

    # Also allow custom frontend URL from environment variable
    frontend_url = os.environ.get('FRONTEND_URL')
    if frontend_url:
        allowed_origins.append(frontend_url)

    CORS(app, resources={
        r"/*": {
            "origins": allowed_origins,
            "supports_credentials": True,
            "allow_headers": ["Content-Type", "Authorization", "Accept"],
            "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"]
        }
    })

    # Initialize extensions
    db.init_app(app)
    migrate.init_app(app, db)
    login_manager.init_app(app)
    login_manager.login_view = 'auth.login'
    login_manager.login_message_category = 'info'
    csrf.init_app(app)
    oauth.init_app(app)
    init_oauth(app)

    # Configure logging
    _configure_logging(app)

    # Test database connection early and log detailed errors
    _test_database_connection(app)

    # Register user loader
    from app.features.users.models import User

    @login_manager.user_loader
    def load_user(user_id: str) -> Optional[User]:
        """Load user by ID for Flask-Login."""
        return User.query.get(int(user_id))
    
    # Handle unauthorized API requests
    @login_manager.unauthorized_handler
    def unauthorized():
        from flask import request
        # Return JSON for API routes and auth endpoints
        if (request.path.startswith('/api/') or
            request.path in ['/login', '/register', '/logout', '/check-auth'] or
            request.headers.get('Content-Type') == 'application/json' or
            request.headers.get('Accept') == 'application/json'):
            return jsonify({'success': False, 'error': 'Unauthorized'}), 401
        return redirect(url_for('auth.login'))

    # Register blueprints
    from app.features.auth.routes import auth
    from app.features.expenses.routes import expenses
    from app.features.expenses.api import api

    app.register_blueprint(auth, url_prefix='/')
    app.register_blueprint(expenses, url_prefix='/')
    app.register_blueprint(api, url_prefix='/api')
    
    # Exempt API routes from CSRF
    csrf.exempt(api)
    csrf.exempt(auth)

    # Register error handlers
    _register_error_handlers(app)

    # Service worker route
    @app.route('/sw.js')
    def service_worker():
        """Serve the service worker for PWA support."""
        return send_from_directory(
            app.static_folder,
            'sw.js',
            mimetype='application/javascript'
        )

    # Create database tables - import all models first to ensure they're registered
    with app.app_context():
        # Import models to ensure they're registered with SQLAlchemy
        from app.features.users.models import User
        from app.features.expenses.models import Expense
        from app.features.notifications.models import PushSubscription, NotificationHistory

        # Run migrations for missing columns (for existing databases)
        _run_schema_migrations(app, db)

        db.create_all()
        app.logger.info("Database tables created/verified")

    # Start notification scheduler (optional - for production with APScheduler)
    if os.environ.get('ENABLE_NOTIFICATION_SCHEDULER', '').lower() == 'true':
        try:
            from app.features.notifications import start_notification_scheduler
            start_notification_scheduler(app)
            app.logger.info("Notification scheduler started")
        except ImportError as e:
            app.logger.warning(f"Could not start notification scheduler: {e}")

    app.logger.info(f"ExpenseSnap started in {config_name} mode")
    return app


def _configure_logging(app: Flask) -> None:
    """
    Configure application logging.
    """
    if not app.debug and not app.testing:
        # Create logs directory if it doesn't exist
        if not os.path.exists('logs'):
            os.mkdir('logs')

        # Set up rotating file handler
        file_handler = RotatingFileHandler(
            'logs/expensesnap.log',
            maxBytes=10240000,  # 10MB
            backupCount=10
        )
        file_handler.setFormatter(logging.Formatter(
            '%(asctime)s %(levelname)s: %(message)s [in %(pathname)s:%(lineno)d]'
        ))
        file_handler.setLevel(logging.INFO)
        app.logger.addHandler(file_handler)
        app.logger.setLevel(logging.INFO)


def _test_database_connection(app: Flask) -> None:
    """
    Test database connection at startup and log detailed error messages.
    """
    from sqlalchemy import text
    from sqlalchemy.exc import OperationalError, ProgrammingError

    with app.app_context():
        try:
            # Attempt a simple query to test the connection
            db.session.execute(text('SELECT 1'))
            db.session.commit()
            app.logger.info("Database connection successful!")
        except OperationalError as e:
            app.logger.error(f"Database connection failed: {e}")
        except Exception as e:
            app.logger.error(f"Unexpected database error: {e}")


def _run_schema_migrations(app: Flask, db) -> None:
    """
    Run schema migrations to add missing columns to existing databases.
    This handles cases where the database was created before new columns were added.
    """
    from sqlalchemy import text, inspect

    try:
        inspector = inspect(db.engine)

        # Check if we're using PostgreSQL
        if 'postgresql' not in str(db.engine.url):
            return  # Skip for SQLite - it uses db.create_all() which works fine

        # Get existing columns in user table
        existing_columns = [col['name'] for col in inspector.get_columns('user')]
        app.logger.info(f"Existing user columns: {existing_columns}")

        # Add profile_photo if missing, or alter to TEXT if it exists as VARCHAR
        if 'profile_photo' not in existing_columns:
            app.logger.info("Adding missing column: user.profile_photo")
            db.session.execute(text('ALTER TABLE "user" ADD COLUMN profile_photo TEXT'))
            db.session.commit()
            app.logger.info("Added profile_photo column successfully")
        else:
            # Alter column type to TEXT to support base64 data URLs
            app.logger.info("Altering profile_photo column to TEXT type")
            db.session.execute(text('ALTER TABLE "user" ALTER COLUMN profile_photo TYPE TEXT'))
            db.session.commit()
            app.logger.info("Altered profile_photo to TEXT successfully")

        # Add notify_daily_reminders if missing
        if 'notify_daily_reminders' not in existing_columns:
            app.logger.info("Adding missing column: user.notify_daily_reminders")
            db.session.execute(text('ALTER TABLE "user" ADD COLUMN notify_daily_reminders BOOLEAN NOT NULL DEFAULT TRUE'))
            db.session.commit()
            app.logger.info("Added notify_daily_reminders column successfully")

        # Add notify_budget_alerts if missing
        if 'notify_budget_alerts' not in existing_columns:
            app.logger.info("Adding missing column: user.notify_budget_alerts")
            db.session.execute(text('ALTER TABLE "user" ADD COLUMN notify_budget_alerts BOOLEAN NOT NULL DEFAULT TRUE'))
            db.session.commit()
            app.logger.info("Added notify_budget_alerts column successfully")

        # Add budget_alert_sent_month if missing
        if 'budget_alert_sent_month' not in existing_columns:
            app.logger.info("Adding missing column: user.budget_alert_sent_month")
            db.session.execute(text('ALTER TABLE "user" ADD COLUMN budget_alert_sent_month VARCHAR(7)'))
            db.session.commit()
            app.logger.info("Added budget_alert_sent_month column successfully")

        # Add monthly_limit if missing (for custom budget alerts)
        if 'monthly_limit' not in existing_columns:
            app.logger.info("Adding missing column: user.monthly_limit")
            db.session.execute(text('ALTER TABLE "user" ADD COLUMN monthly_limit NUMERIC(10,2) NOT NULL DEFAULT 0'))
            db.session.commit()
            app.logger.info("Added monthly_limit column successfully")

        # Add google_id if missing (for Google OAuth)
        if 'google_id' not in existing_columns:
            app.logger.info("Adding missing column: user.google_id")
            db.session.execute(text('ALTER TABLE "user" ADD COLUMN google_id VARCHAR(255) UNIQUE'))
            db.session.commit()
            app.logger.info("Added google_id column successfully")

        # ---- EXPENSE TABLE MIGRATIONS ----
        expense_columns = [col['name'] for col in inspector.get_columns('expense')]
        app.logger.info(f"Existing expense columns: {expense_columns}")

        # Add type column if missing (for income/expense differentiation)
        if 'type' not in expense_columns:
            app.logger.info("Adding missing column: expense.type")
            db.session.execute(text("ALTER TABLE expense ADD COLUMN type VARCHAR(10) NOT NULL DEFAULT 'expense'"))
            db.session.commit()
            app.logger.info("Added expense.type column successfully")

        # Check if notification_history table exists
        existing_tables = inspector.get_table_names()
        if 'notification_history' not in existing_tables:
            app.logger.info("Creating notification_history table")
            db.session.execute(text('''
                CREATE TABLE IF NOT EXISTS notification_history (
                    id SERIAL PRIMARY KEY,
                    user_id INTEGER NOT NULL REFERENCES "user"(id),
                    notification_type VARCHAR(50) NOT NULL,
                    title VARCHAR(200) NOT NULL,
                    message TEXT NOT NULL,
                    data JSON,
                    is_read BOOLEAN NOT NULL DEFAULT FALSE,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    read_at TIMESTAMP
                )
            '''))
            db.session.execute(text('CREATE INDEX IF NOT EXISTS idx_nh_user_id ON notification_history(user_id)'))
            db.session.execute(text('CREATE INDEX IF NOT EXISTS idx_nh_user_unread ON notification_history(user_id, is_read)'))
            db.session.commit()
            app.logger.info("Created notification_history table successfully")

    except Exception as e:
        app.logger.warning(f"Schema migration check failed (may be OK for new databases): {e}")
        db.session.rollback()
        try:
            # Attempt a simple query to test the connection
            db.session.execute(text('SELECT 1'))
            db.session.commit()
            app.logger.info("✅ Database connection successful!")
            
        except Exception as db_fallback_error:
            app.logger.error("=" * 60)
            app.logger.error("DATABASE CONNECTION FAILED!")
            app.logger.error("=" * 60)
            app.logger.error(str(db_fallback_error))
            # ... (truncated detailed error handling for brevity, keeping essential logging)

        except Exception as e:
            app.logger.error(f"❌ Unexpected database error: {e}")


def _register_error_handlers(app: Flask) -> None:
    """
    Register custom error handlers.
    """
    def is_api_request():
        """Check if the request expects JSON response."""
        from flask import request
        return (
            request.path.startswith('/api/') or
            request.path in ['/login', '/register', '/logout', '/check-auth'] or
            request.headers.get('Content-Type') == 'application/json' or
            request.headers.get('Accept') == 'application/json'
        )

    @app.errorhandler(404)
    def not_found_error(error):
        """Handle 404 Not Found errors."""
        app.logger.warning(f"404 error: {error}")
        # Always return JSON since we use React frontend
        return jsonify({'success': False, 'error': 'Not found'}), 404

    @app.errorhandler(500)
    def internal_error(error):
        """Handle 500 Internal Server errors."""
        db.session.rollback()
        app.logger.error(f"500 error: {error}")
        # Always return JSON since we use React frontend
        return jsonify({'success': False, 'error': 'Internal server error'}), 500

    @app.errorhandler(403)
    def forbidden_error(error):
        """Handle 403 Forbidden errors."""
        app.logger.warning(f"403 error: {error}")
        # Always return JSON since we use React frontend
        return jsonify({'success': False, 'error': 'Forbidden'}), 403

    @app.errorhandler(400)
    def bad_request_error(error):
        """Handle 400 Bad Request errors."""
        app.logger.warning(f"400 error: {error}")
        if is_api_request():
            return jsonify({'success': False, 'error': 'Bad request'}), 400
        return jsonify({'success': False, 'error': 'Bad request'}), 400
