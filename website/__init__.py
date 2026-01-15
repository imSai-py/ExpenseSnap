"""
ExpenseSnap Application Factory.

This module implements the Flask application factory pattern,
providing centralized app creation, configuration, and extension initialization.
"""
import os
import logging
from logging.handlers import RotatingFileHandler
from typing import Optional

from flask import Flask, render_template, send_from_directory

from .extensions import db, login_manager, oauth, csrf, init_oauth
from .config import config


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
        template_folder='../templates',
        static_folder='../static'
    )

    # Load configuration
    app.config.from_object(config[config_name])
    app.config['SQLALCHEMY_DATABASE_URI'] = config[config_name].get_database_uri()
    config[config_name].init_app(app)

    # Initialize extensions
    db.init_app(app)
    login_manager.init_app(app)
    login_manager.login_view = 'auth.login'
    login_manager.login_message_category = 'info'
    csrf.init_app(app)
    oauth.init_app(app)
    init_oauth(app)

    # Configure logging
    _configure_logging(app)

    # Register user loader
    from .models.user import User

    @login_manager.user_loader
    def load_user(user_id: str) -> Optional[User]:
        """Load user by ID for Flask-Login."""
        return User.query.get(int(user_id))

    # Register blueprints
    from .auth.routes import auth
    from .expenses.routes import expenses

    app.register_blueprint(auth, url_prefix='/')
    app.register_blueprint(expenses, url_prefix='/')

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

    app.logger.info(f"ExpenseSnap started in {config_name} mode")
    return app


def _configure_logging(app: Flask) -> None:
    """
    Configure application logging.

    Sets up rotating file handler for production environments.

    Args:
        app: Flask application instance
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


def _register_error_handlers(app: Flask) -> None:
    """
    Register custom error handlers.

    Args:
        app: Flask application instance
    """

    @app.errorhandler(404)
    def not_found_error(error):
        """Handle 404 Not Found errors."""
        app.logger.warning(f"404 error: {error}")
        return render_template('errors/404.html'), 404

    @app.errorhandler(500)
    def internal_error(error):
        """Handle 500 Internal Server errors."""
        db.session.rollback()
        app.logger.error(f"500 error: {error}")
        return render_template('errors/500.html'), 500

    @app.errorhandler(403)
    def forbidden_error(error):
        """Handle 403 Forbidden errors."""
        app.logger.warning(f"403 error: {error}")
        return render_template('errors/403.html'), 403
