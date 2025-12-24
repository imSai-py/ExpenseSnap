from flask import Flask
import os
from .extensions import db, login_manager, oauth
from dotenv import load_dotenv

load_dotenv()

def create_app():
    app = Flask(__name__, template_folder='../templates', static_folder='../static')
    
    # Configure App
    app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'dev-key-123')
    
    # Use PostgreSQL if DATABASE_URL is set, otherwise fallback to SQLite
    database_url = os.getenv('DATABASE_URL')
    if database_url and database_url.startswith("postgres://"):
        # Fix for Heroku/PostgreSQL 12+ which uses postgres:// instead of postgresql://
        database_url = database_url.replace("postgres://", "postgresql://", 1)
    
    app.config['SQLALCHEMY_DATABASE_URI'] = database_url or 'sqlite:///expenses.db'
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

    # Initialize Extensions
    db.init_app(app)
    login_manager.init_app(app)
    login_manager.login_view = 'auth.login'
    
    oauth.init_app(app)
    
    # Register Blueprints
    from .auth.routes import auth
    from .expenses.routes import expenses
    
    app.register_blueprint(auth, url_prefix='/')
    app.register_blueprint(expenses, url_prefix='/')

    # Create tables
    with app.app_context():
        db.create_all()

    return app
