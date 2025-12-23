from flask_sqlalchemy import SQLAlchemy
from flask_login import LoginManager
from authlib.integrations.flask_client import OAuth
import os
from dotenv import load_dotenv

load_dotenv()

db = SQLAlchemy()
login_manager = LoginManager()
oauth = OAuth()

# Define google client here so it can be imported by blueprints
google = oauth.register(
    name='google',
    client_id=os.getenv('GCLOUD_CLIENT_ID'),
    client_secret=os.getenv('GCLOUD_CLIENT_SECRET'),
    server_metadata_url='https://accounts.google.com/.well-known/openid-configuration',
    client_kwargs={'scope': 'openid email profile'}
)
