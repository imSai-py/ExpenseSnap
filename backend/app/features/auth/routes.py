"""
Authentication routes.

Handles user login, registration, logout, and OAuth flows
with proper form validation and error handling.
"""
import os
from flask import Blueprint, render_template, redirect, url_for, flash, current_app, jsonify, request
from flask_login import login_user, logout_user, current_user, login_required

# Changed imports for new structure
from app.core.extensions import db, oauth
from app.features.users.models import User
from .forms import LoginForm, RegistrationForm

auth = Blueprint('auth', __name__)


def _get_redirect_uri():
    """Get the Google OAuth redirect URI based on environment."""
    env_redirect_uri = os.environ.get('GOOGLE_REDIRECT_URI')
    if env_redirect_uri:
        return env_redirect_uri

    # Use FRONTEND_URL or hosting URL if available to build redirect URI.
    # This keeps OAuth cookies as first-party cookies on the hosting domain.
    frontend_url = _get_frontend_url()
    if frontend_url:
        return f"{frontend_url.rstrip('/')}/auth/callback"

    # Fallback to Flask url_for
    return url_for('auth.google_auth', _external=True)


@auth.route('/login/google')
def google_login():
    """Initiate Google OAuth flow."""
    frontend_url = _get_frontend_url()
    client_id = current_app.config.get('GOOGLE_CLIENT_ID')
    client_secret = current_app.config.get('GOOGLE_CLIENT_SECRET')

    if not client_id or not client_secret:
        current_app.logger.error("Google OAuth login attempted but GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET is missing.")
        return redirect(f"{frontend_url}?auth_error=google_not_configured")

    try:
        google = oauth.create_client('google')
        redirect_uri = _get_redirect_uri()

        current_app.logger.info(f"Google OAuth redirect URI: {redirect_uri}")
        return google.authorize_redirect(redirect_uri)
    except Exception as e:
        current_app.logger.error(f"Google login error: {e}")
        import traceback
        current_app.logger.error(traceback.format_exc())
        return redirect(f"{frontend_url}?auth_error=google_unavailable")


@auth.route('/auth/callback')
def google_auth():
    """Handle Google OAuth callback."""
    frontend_url = _get_frontend_url()

    try:
        google = oauth.create_client('google')
        redirect_uri = _get_redirect_uri()
        token = google.authorize_access_token(redirect_uri=redirect_uri)
        user_info = token.get('userinfo')

        if not user_info:
            current_app.logger.error("No userinfo in Google token")
            return redirect(f"{frontend_url}?auth_error=no_user_info")

        email = user_info['email']
        google_id = user_info['sub']
        name = user_info.get('name', email.split('@')[0])
        picture = user_info.get('picture')

        # 1. Check if user exists by google_id
        user = User.query.filter_by(google_id=google_id).first()

        if not user:
            # 2. Check if user exists by email (link accounts)
            user = User.query.filter_by(email=email).first()
            if user:
                user.google_id = google_id
                current_app.logger.info(f"Linked Google account to existing user: {email}")
            else:
                # 3. Create new user with unique username
                base_username = name.replace(' ', '_').lower()
                username = base_username
                counter = 1
                while User.query.filter_by(username=username).first():
                    username = f"{base_username}_{counter}"
                    counter += 1

                user = User(
                    username=username,
                    email=email,
                    google_id=google_id,
                    preferred_currency='USD'
                )
                if picture:
                    user.profile_photo = picture
                db.session.add(user)
                current_app.logger.info(f"New Google OAuth user registered: {email}")

        db.session.commit()
        login_user(user)
        current_app.logger.info(f"Google OAuth login successful: {email}")

        return redirect(f"{frontend_url}?auth_success=true")

    except Exception as e:
        error_type = type(e).__name__
        error_msg = str(e)
        current_app.logger.error(f"Google auth callback error [{error_type}]: {error_msg}")
        import traceback
        import urllib.parse
        current_app.logger.error(traceback.format_exc())
        db.session.rollback()
        safe_msg = urllib.parse.quote(f"{error_type}: {error_msg}")
        return redirect(f"{frontend_url}?auth_error=callback_failed&details={safe_msg}")


@auth.route('/login', methods=['GET', 'POST'])
def login():
    """
    User login via API.
    GET: Returns login status
    POST: Expects JSON data: { "username": "...", "password": "..." }
    """
    import traceback

    # Handle GET request
    if request.method == 'GET':
        # Check if request accepts HTML (browser)
        if 'text/html' in request.headers.get('Accept', ''):
            if current_user.is_authenticated:
                return redirect(url_for('expenses.index'))
            form = LoginForm()
            return render_template('login.html', form=form)
            
        # API/JSON request
        if current_user.is_authenticated:
            return jsonify({'success': True, 'authenticated': True, 'user': current_user.to_dict()})
        return jsonify({'success': False, 'authenticated': False, 'error': 'Not logged in'}), 401

    # Handle POST request - login
    is_api_request = request.is_json or 'application/json' in request.headers.get('Content-Type', '')

    if current_user.is_authenticated:
        if is_api_request:
            return jsonify({'success': True, 'message': 'Already logged in', 'user': current_user.to_dict()})
        return redirect(url_for('expenses.index'))

    try:
        username = None
        password = None

        if is_api_request:
            data = request.get_json(silent=True)
            if data:
                username = data.get('username', '').strip()
                password = data.get('password', '')
        else:
            username = request.form.get('username', '').strip()
            password = request.form.get('password', '')

        if not username or not password:
            if is_api_request:
                return jsonify({'success': False, 'error': 'Username and password are required'}), 400
            flash('Username and password are required', 'error')
            return redirect(url_for('auth.login'))

        # Database query for user
        try:
            user = User.query.filter_by(username=username).first()
        except Exception as db_error:
            current_app.logger.error(f"Database error during login lookup: {db_error}")
            current_app.logger.error(f"Traceback: {traceback.format_exc()}")
            if is_api_request:
                return jsonify({'success': False, 'error': 'Database connection error. Please try again.'}), 500
            flash('Database error. Please try again later.', 'error')
            return redirect(url_for('auth.login'))

        # Verify password
        if user and user.check_password(password):
            # Login the user
            try:
                login_user(user)
            except Exception as login_error:
                current_app.logger.error(f"Flask-Login error: {login_error}")
                current_app.logger.error(f"Traceback: {traceback.format_exc()}")
                if is_api_request:
                    return jsonify({'success': False, 'error': 'Session creation failed. Please try again.'}), 500
                flash('Login failed. Please try again.', 'error')
                return redirect(url_for('auth.login'))

            current_app.logger.info(f"User logged in successfully: {user.username}")

            # Initialize notification preferences (wrapped in try-except to prevent login failure)
            try:
                # Any notification-related initialization can go here
                # This ensures push service failures don't block login
                _safe_initialize_notifications(user)
            except Exception as notif_error:
                # Log the error but don't fail the login
                current_app.logger.warning(f"Notification initialization failed for user {user.username}: {notif_error}")
                current_app.logger.warning(f"Notification error traceback: {traceback.format_exc()}")
                # Continue with login - notifications are non-critical

            if is_api_request:
                return jsonify({'success': True, 'user': user.to_dict()}), 200
            
            flash(f'Welcome back, {user.username}!', 'success')
            next_page = request.args.get('next')
            return redirect(next_page or url_for('expenses.index'))
        else:
            current_app.logger.warning(f"Failed login attempt for username: {username}")
            if is_api_request:
                return jsonify({'success': False, 'error': 'Invalid username or password'}), 401
            flash('Invalid username or password', 'error')
            return redirect(url_for('auth.login'))

    except Exception as e:
        # Catch-all for any unexpected errors
        current_app.logger.error(f"Unexpected login error: {e}")
        current_app.logger.error(f"Full traceback: {traceback.format_exc()}")
        if is_api_request:
            return jsonify({'success': False, 'error': 'Login failed. Please try again.'}), 500
        flash('An unexpected error occurred. Please try again.', 'error')
        return redirect(url_for('auth.login'))


def _safe_initialize_notifications(user):
    """
    Safely initialize notification-related settings for a user.
    This function is wrapped in a try-except in the login route,
    so any failures here won't prevent login.
    """
    try:
        # Check if VAPID keys are configured (optional, for debugging)
        vapid_private_key = current_app.config.get('VAPID_PRIVATE_KEY')
        if not vapid_private_key:
            current_app.logger.debug("VAPID_PRIVATE_KEY not configured - push notifications disabled")

        # Any other notification initialization can go here
        # For example, checking push subscriptions, etc.

    except Exception as e:
        # Re-raise to let the caller handle it
        raise e


@auth.route('/register', methods=['GET', 'POST'])
def register():
    """
    User registration via API.
    GET: Returns registration status info
    POST: Expects JSON data: { "username": "...", "password": "...", "email": "..." }
    """
    # Handle GET request
    if request.method == 'GET':
        # Check if request accepts HTML (browser)
        if 'text/html' in request.headers.get('Accept', ''):
            if current_user.is_authenticated:
                return redirect(url_for('expenses.index'))
            form = RegistrationForm()
            return render_template('register.html', form=form)

        # API/JSON request
        if current_user.is_authenticated:
            return jsonify({'success': True, 'authenticated': True})
        return jsonify({'success': True, 'authenticated': False, 'message': 'Ready for registration'})

    # Handle POST request - register
    is_api_request = request.is_json or 'application/json' in request.headers.get('Content-Type', '')

    if current_user.is_authenticated:
        if is_api_request:
            return jsonify({'success': True, 'message': 'Already logged in'})
        return redirect(url_for('expenses.index'))

    try:
        username = None
        password = None
        email = None

        if is_api_request:
            data = request.get_json(silent=True)
            if data:
                username = data.get('username', '').strip()
                password = data.get('password', '')
                email = data.get('email', '').strip()
        else:
            username = request.form.get('username', '').strip()
            password = request.form.get('password', '')
            email = request.form.get('email', '').strip()

        if not username or not password:
            if is_api_request:
                return jsonify({'success': False, 'error': 'Username and password are required'}), 400
            flash('Username and password are required', 'error')
            return redirect(url_for('auth.register'))

        if User.query.filter_by(username=username).first():
            if is_api_request:
                return jsonify({'success': False, 'error': 'Username already exists'}), 409
            flash('Username already exists. Please choose a different one.', 'error')
            return redirect(url_for('auth.register'))

        new_user = User(
            username=username,
            email=email if email else None,
            preferred_currency='USD'
        )
        new_user.set_password(password)
        db.session.add(new_user)
        db.session.commit()

        current_app.logger.info(f"New user registered: {username}")

        # Auto login after register
        login_user(new_user)

        if is_api_request:
            return jsonify({'success': True, 'user': new_user.to_dict()}), 201
        
        flash('Registration successful! Welcome to ExpenseSnap.', 'success')
        return redirect(url_for('expenses.index'))

    except Exception as e:
        current_app.logger.error(f"Registration error: {e}")
        import traceback
        current_app.logger.error(f"Traceback: {traceback.format_exc()}")
        db.session.rollback()
        if is_api_request:
            # Temporarily show actual error for debugging
            return jsonify({'success': False, 'error': f'Registration failed: {str(e)}'}), 500
        flash('Registration failed. Please try again.', 'error')
        return redirect(url_for('auth.register'))


@auth.route('/logout', methods=['POST'])
@login_required
def logout():
    """Log out current user via API."""
    current_app.logger.info(f"User logged out: {current_user.username}")
    logout_user()
    return jsonify({'success': True})


@auth.route('/check-auth', methods=['GET'])
def check_auth():
    """Check if user is authenticated and return user data."""
    if current_user.is_authenticated:
        return jsonify({'authenticated': True, 'user': current_user.to_dict()})
    else:
        return jsonify({'authenticated': False}), 401


def _get_frontend_url():
    """Get the frontend URL based on environment."""
    frontend_url = os.environ.get('FRONTEND_URL')
    if frontend_url:
        return frontend_url

    if os.environ.get('FLASK_ENV') == 'production':
        return 'https://expensesnap-a1995.web.app'

    return 'http://localhost:5000'
