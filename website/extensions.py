"""
Flask extensions initialization.

Extensions are instantiated here to avoid circular imports.
They are initialized with the app in the factory function.
"""
from flask_sqlalchemy import SQLAlchemy
from flask_login import LoginManager
from flask_wtf.csrf import CSRFProtect
from authlib.integrations.flask_client import OAuth

# Extension instances (initialized without app)
db = SQLAlchemy()
login_manager = LoginManager()
oauth = OAuth()
csrf = CSRFProtect()


def init_oauth(app) -> None:
    """
    Register OAuth providers after app initialization.

    This must be called after oauth.init_app(app) to ensure
    proper configuration loading from app.config.

    Args:
        app: Flask application instance
    """
    oauth.register(
        name='google',
        client_id=app.config.get('GOOGLE_CLIENT_ID'),
        client_secret=app.config.get('GOOGLE_CLIENT_SECRET'),
        server_metadata_url='https://accounts.google.com/.well-known/openid-configuration',
        client_kwargs={'scope': 'openid email profile'}
    )
