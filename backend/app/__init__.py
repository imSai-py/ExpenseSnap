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
        # Production origins - Render backend
        "https://expensesnap-crp6.onrender.com",
        "https://expensesnap.onrender.com",
        # Production origins - Vercel frontend
        "https://expensesnap.vercel.app",
        "https://expense-snap.vercel.app",
    ]

    # Also allow custom Vercel URLs from environment variable
    vercel_url = os.environ.get('VERCEL_FRONTEND_URL')
    if vercel_url:
        allowed_origins.append(vercel_url)

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

    # Create database tables
    with app.app_context():
        db.create_all()

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
            app.logger.info("✅ Database connection successful!")
            
        except OperationalError as e:
            app.logger.error("=" * 60)
            app.logger.error("❌ DATABASE CONNECTION FAILED!")
            app.logger.error("=" * 60)
            app.logger.error(str(e))
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
        if is_api_request():
            return jsonify({'success': False, 'error': 'Not found'}), 404
        return render_template('errors/404.html'), 404

    @app.errorhandler(500)
    def internal_error(error):
        """Handle 500 Internal Server errors."""
        db.session.rollback()
        app.logger.error(f"500 error: {error}")
        if is_api_request():
            return jsonify({'success': False, 'error': 'Internal server error'}), 500
        return render_template('errors/500.html'), 500

    @app.errorhandler(403)
    def forbidden_error(error):
        """Handle 403 Forbidden errors."""
        app.logger.warning(f"403 error: {error}")
        if is_api_request():
            return jsonify({'success': False, 'error': 'Forbidden'}), 403
        return render_template('errors/403.html'), 403

    @app.errorhandler(400)
    def bad_request_error(error):
        """Handle 400 Bad Request errors."""
        app.logger.warning(f"400 error: {error}")
        if is_api_request():
            return jsonify({'success': False, 'error': 'Bad request'}), 400
        return jsonify({'success': False, 'error': 'Bad request'}), 400
