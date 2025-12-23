from flask import Blueprint, render_template, redirect, url_for, request, flash
from flask_login import login_user, logout_user, current_user, login_required
from ..extensions import db, google, login_manager
from ..models.user import User

auth = Blueprint('auth', __name__)

@login_manager.user_loader
def load_user(user_id):
    return User.query.get(int(user_id))

@auth.route('/login/google')
def google_login():
    redirect_uri = url_for('auth.google_auth', _external=True)
    return google.authorize_redirect(redirect_uri)

@auth.route('/auth/callback')
def google_auth():
    token = google.authorize_access_token()
    user_info = token.get('userinfo')
    if user_info:
        email = user_info['email']
        username = user_info['name']
        
        user = User.query.filter_by(email=email).first()
        if not user:
            user = User(username=username, email=email, preferred_currency='USD')
            db.session.add(user)
            db.session.commit()
        
        login_user(user)
        return redirect(url_for('expenses.index'))
    return redirect(url_for('auth.login'))

@auth.route('/register', methods=['GET', 'POST'])
def register():
    if current_user.is_authenticated:
        return redirect(url_for('expenses.index'))
    if request.method == 'POST':
        username = request.form.get('username')
        password = request.form.get('password')
        
        user_exists = User.query.filter_by(username=username).first()
        if user_exists:
            flash('Username already exists.', 'error')
            return redirect(url_for('auth.register'))
        
        new_user = User(username=username, preferred_currency='USD')
        new_user.set_password(password)
        db.session.add(new_user)
        db.session.commit()
        flash('Registration successful! Please login.', 'success')
        return redirect(url_for('auth.login'))
    return render_template('register.html')

@auth.route('/login', methods=['GET', 'POST'])
def login():
    if current_user.is_authenticated:
        return redirect(url_for('expenses.index'))
    if request.method == 'POST':
        username = request.form.get('username')
        password = request.form.get('password')
        user = User.query.filter_by(username=username).first()
        
        if user and user.check_password(password):
            login_user(user)
            return redirect(url_for('expenses.index'))
        else:
            flash('Invalid username or password.', 'error')
    return render_template('login.html')

@auth.route('/logout')
@login_required
def logout():
    logout_user()
    return redirect(url_for('auth.login'))
