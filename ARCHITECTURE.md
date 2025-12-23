# ExpenseSnap Architecture & Implementation Guide

ExpenseSnap is a modern, premium expense tracking application built with Flask. The project has been refactored from a monolithic script into a modular, blueprint-based architecture to ensure scalability, maintainability, and clean separation of concerns.

## 🏗️ High-Level Architecture

The application follows the **Flask Application Factory Pattern** and uses **Blueprints** to organize features into distinct modules.

### Folder Structure

```text
ExpenseSnap/
├── main.py                 # Application entry point
├── .env                    # Environment variables (Sensitive)
├── requirements.txt        # Python dependencies
├── instance/               # Local database storage
│   └── expenses.db
├── website/                # Core application package
│   ├── __init__.py         # App factory & Blueprint registration
│   ├── extensions.py       # Shared service instances
│   ├── auth/               # Authentication Module
│   │   ├── __init__.py
│   │   └── routes.py       # Login, Register, Google OAuth
│   ├── expenses/           # Financial Management Module
│   │   ├── __init__.py
│   │   ├── routes.py       # Dashboard & Expense CRUD
│   │   └── utils.py        # Currency conversion engine
│   └── models/             # Database Models
│       ├── __init__.py
│       ├── user.py         # User & Preference schema
│       └── expense.py      # Expense & Currency schema
├── static/                 # CSS, JS, and Media assets
└── templates/              # Jinja2 HTML templates
```

---

## 🧩 Modules & Implementation

### 1. `website/__init__.py` (The Factory)
This is the heart of the application. It implements `create_app()`, which:
- Loads configuration from environment variables.
- Initializes extensions (`db`, `login_manager`, `oauth`).
- Registers Blueprints (`auth`, `expenses`).
- Automatically creates database tables within the application context.

### 2. `website/extensions.py` (Service Layer)
To prevent **circular imports**, all shared instances are defined here. This allows blueprints to import `db` or `oauth` without needing to import the `app` object directly.
- **SQLAlchemy (db)**: Manages ORM.
- **LoginManager**: Handles session-based authentication.
- **OAuth**: Configured for Google Cloud authentication.

### 3. `website/auth/` (Authentication Module)
Encapsulates all logic related to user identity.
- **Blueprints**: Defined as `auth`.
- **Google OAuth**: Implementation of the OpenID Connect flow using `Authlib`.
- **Traditional Auth**: Password hashing via `werkzeug.security`.

### 4. `website/expenses/` (Core Logic Module)
Handles the primary functionality of the app.
- **Blueprints**: Defined as `expenses`.
- **Currency Engine (`utils.py`)**: Contains a centralized `EXCHANGE_RATES` map and a `convert_currency` helper. This allows the dashboard to reflect totals in the user's preferred currency regardless of the transaction currency.

### 5. `website/models/` (Data Layer)
- **User**: Stores profile info and `preferred_currency`.
- **Expense**: Stores transaction details, including individual currency codes to support multi-currency entry.

---

## 🧭 Design Decisions

### Blueprint Namespacing
All internal links use Blueprint namespaces (e.g., `url_for('auth.login')` instead of just `url_for('login')`). This allows for cleaner routing and avoids naming collisions as the app grows.

### Multi-Currency Strategy
- **Entry Level**: Users can log expenses in any supported currency (USD, EUR, INR, etc.).
- **Global Level**: A "Primary Currency" control in the UI allows users to view their entire portfolio total in a single unified currency, calculated using the baseline rates in `expenses/utils.py`.

### Security
- **OAuth 2.0**: Secure authentication via Google.
- **CSRF Protection**: Handled by Flask-WTF (where applicable) and secure session cookies.
- **Password Safety**: High-entropy hashing for non-OAuth users.

---

## 🚀 Getting Started
1. Install dependencies: `pip install -r requirements.txt`
2. Configure `.env` with your `GCLOUD_CLIENT_ID` and `SECRET_KEY`.
3. Run the application: `python main.py`
