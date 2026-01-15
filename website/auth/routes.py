"""
Authentication routes.

Handles user login, registration, logout, and OAuth flows
with proper form validation and error handling.
"""
from flask import Blueprint, render_template, redirect, url_for, flash, current_app
from flask_login import login_user, logout_user, current_user, login_required

from ..extensions import db, oauth
from ..models.user import User
from .forms import LoginForm, RegistrationForm

auth = Blueprint('auth', __name__)


@auth.route('/login/google')
def google_login():
    """Initiate Google OAuth flow."""
    try:
        google = oauth.create_client('google')
        redirect_uri = url_for('auth.google_auth', _external=True)
        return google.authorize_redirect(redirect_uri)
    except Exception as e:
        current_app.logger.error(f"Google login error: {e}")
        flash('Unable to connect to Google. Please try again.', 'error')
        return redirect(url_for('auth.login'))


@auth.route('/auth/callback')
def google_auth():
    """Handle Google OAuth callback."""
    try:
        google = oauth.create_client('google')
        token = google.authorize_access_token()
        user_info = token.get('userinfo')

        if user_info:
            email = user_info['email']
            username = user_info.get('name', email.split('@')[0])

            user = User.query.filter_by(email=email).first()
            if not user:
                user = User(
                    username=username,
                    email=email,
                    preferred_currency='USD'
                )
                db.session.add(user)
                db.session.commit()
                current_app.logger.info(f"New OAuth user registered: {email}")

            login_user(user)
            current_app.logger.info(f"OAuth login successful: {email}")
            return redirect(url_for('expenses.index'))

    except Exception as e:
        current_app.logger.error(f"Google auth callback error: {e}")
        db.session.rollback()
        flash('Authentication failed. Please try again.', 'error')

    return redirect(url_for('auth.login'))


@auth.route('/register', methods=['GET', 'POST'])
def register():
    """
    User registration with form validation.

    Enforces password complexity requirements and unique usernames.
    """
    if current_user.is_authenticated:
        return redirect(url_for('expenses.index'))

    form = RegistrationForm()

    if form.validate_on_submit():
        username = form.username.data.strip()

        if User.query.filter_by(username=username).first():
            flash('Username already exists.', 'error')
            return redirect(url_for('auth.register'))

        try:
            new_user = User(username=username, preferred_currency='USD')
            new_user.set_password(form.password.data)
            db.session.add(new_user)
            db.session.commit()

            current_app.logger.info(f"New user registered: {username}")
            flash('Registration successful! Please login.', 'success')
            return redirect(url_for('auth.login'))

        except Exception as e:
            current_app.logger.error(f"Registration error: {e}")
            db.session.rollback()
            flash('Registration failed. Please try again.', 'error')

    return render_template('register.html', form=form)


@auth.route('/login', methods=['GET', 'POST'])
def login():
    """
    User login with form validation.

    Supports both traditional password authentication.
    """
    if current_user.is_authenticated:
        return redirect(url_for('expenses.index'))

    form = LoginForm()

    if form.validate_on_submit():
        user = User.query.filter_by(username=form.username.data.strip()).first()

        if user and user.check_password(form.password.data):
            login_user(user)
            current_app.logger.info(f"User logged in: {user.username}")
            return redirect(url_for('expenses.index'))
        else:
            flash('Invalid username or password.', 'error')

    return render_template('login.html', form=form)


@auth.route('/logout')
@login_required
def logout():
    """Log out current user."""
    current_app.logger.info(f"User logged out: {current_user.username}")
    logout_user()
    return redirect(url_for('auth.login'))
