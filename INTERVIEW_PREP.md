# ExpenseSnap - Complete Interview Preparation Guide

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Tech Stack & Why Each Choice](#2-tech-stack--why-each-choice)
3. [Architecture & Folder Structure](#3-architecture--folder-structure)
4. [Database Design](#4-database-design)
5. [Authentication System](#5-authentication-system)
6. [Google OAuth 2.0 Implementation](#6-google-oauth-20-implementation)
7. [Backend API Design](#7-backend-api-design)
8. [Frontend State Management](#8-frontend-state-management)
9. [Frontend Components Deep Dive](#9-frontend-components-deep-dive)
10. [CORS & Cross-Domain Cookies](#10-cors--cross-domain-cookies)
11. [Push Notifications (Web Push / VAPID)](#11-push-notifications-web-push--vapid)
12. [PDF Report Generation](#12-pdf-report-generation)
13. [Bulk Import (CSV/XLSX)](#13-bulk-import-csvxlsx)
14. [Currency Conversion](#14-currency-conversion)
15. [Database Migrations Strategy](#15-database-migrations-strategy)
16. [Firebase Deployment](#16-firebase-deployment)
17. [Cold Start Mitigation (Keep-Warm)](#17-cold-start-mitigation-keep-warm)
18. [Secret Management](#18-secret-management)
19. [Error Handling Patterns](#19-error-handling-patterns)
20. [PWA Features](#20-pwa-features)
21. [Security Measures](#21-security-measures)
22. [Performance Considerations](#22-performance-considerations)
23. [AI Chatbot (SnapBot)](#23-ai-chatbot-snapbot)
24. [Common Interview Q&A](#24-common-interview-qa)

---

## 1. Project Overview

**ExpenseSnap** is a full-stack personal finance tracker that allows users to track income and expenses, set budgets, generate PDF reports, receive push notifications for budget alerts, and sign in via Google OAuth.

### What problem does it solve?

People need a simple, mobile-friendly way to track daily expenses across multiple currencies, get alerted when they exceed budgets, and generate reports for financial review.

### Key Features

- User registration and login (email/password + Google OAuth)
- Add, edit, delete expenses and income
- Categorized spending (Food, Shopping, Transport, Health, Bills, Entertainment, Housing, Other)
- Multi-currency support with real-time conversion (10 currencies)
- Monthly budget limits with push notification alerts at 80% threshold
- PDF report generation with pie charts and financial summaries
- Bulk import expenses from CSV/XLSX files
- Profile management with photo upload
- AI chatbot (SnapBot) powered by Google Gemini for natural language expense entry and financial insights
- Mobile-first responsive design with swipe gestures
- Progressive Web App (PWA) with push notifications

---

## 2. Tech Stack & Why Each Choice

### Frontend

| Technology | Version | Why I Chose It |
|---|---|---|
| **React** | 19 | Component-based UI library with hooks for state management. React 19 offers improved performance and concurrent features. |
| **TypeScript** | 5.9 | Type safety catches bugs at compile time. Interfaces for API responses prevent runtime errors. |
| **Vite** | 7 | Blazing fast HMR (Hot Module Replacement) during development. Near-instant cold starts compared to Webpack. Native ESM support. |
| **Tailwind CSS** | 4 | Utility-first CSS framework. No context switching between CSS and JSX files. Consistent design system via utility classes. |
| **framer-motion** | 12 | Declarative animations for React. Used for swipe gestures on mobile expense items. |
| **lucide-react** | 0.562 | Lightweight icon library with consistent design. Tree-shakeable (only imports icons used). |

### Backend

| Technology | Version | Why I Chose It |
|---|---|---|
| **Flask** | 3.1 | Lightweight and flexible Python web framework. Perfect for REST APIs without the overhead of Django. Application Factory pattern allows clean separation of concerns. |
| **SQLAlchemy** | 2.0 | Industry-standard Python ORM. Supports both SQLite (dev) and PostgreSQL (prod) without code changes. |
| **Flask-Login** | 0.6 | Session-based authentication with `login_user()`, `logout_user()`, `current_user`. Simpler than JWT for same-domain cookie-based auth. |
| **Authlib** | 1.6 | Standards-compliant OAuth/OIDC library. Handles Google's OpenID Connect flow including token exchange, userinfo retrieval, and PKCE. |
| **ReportLab** | 4.4 | Python PDF generation library. Supports custom fonts, tables, images, and complex layouts. |
| **matplotlib** | 3.10 | Used server-side to generate pie/donut charts embedded in PDF reports. |
| **pywebpush** | 2.3 | Sends Web Push notifications using the VAPID protocol. |
| **pandas** | 3.0 | Parses CSV/XLSX files for bulk expense import. Handles data validation and type coercion. |
| **psycopg2-binary** | 2.9 | PostgreSQL adapter for Python. The `-binary` variant includes pre-compiled C extensions. |
| **flask-cors** | 6.0 | Handles Cross-Origin Resource Sharing headers for cross-domain requests between frontend and backend. |
| **flask-migrate** | 4.1 | Alembic wrapper for Flask. Manages database schema version control. |
| **google-generativeai** | 0.8+ | Official Google Gemini SDK for Python. Powers SnapBot's expense parsing and conversational AI. |

### Database

| Technology | Why |
|---|---|
| **PostgreSQL (Supabase)** | ACID-compliant relational database. Supabase provides a managed PostgreSQL instance with connection pooling. Numeric precision for financial data (NUMERIC(10,2)). |
| **SQLite (Development)** | Zero-configuration local database for development. No server process needed. |

### Deployment

| Service | Role | Why |
|---|---|---|
| **Firebase Cloud Functions (2nd Gen)** | Backend hosting | Serverless, auto-scaling, pay-per-invocation. Python 3.12 runtime. Integrated with Google Secret Manager. |
| **Firebase Hosting** | Frontend hosting | Global CDN, automatic SSL, URL rewrites for SPA routing. |
| **Google Secret Manager** | Secrets storage | Secure, versioned secret storage. Injected as environment variables at runtime. |

---

## 3. Architecture & Folder Structure

### High-Level Architecture

```
Browser (React SPA)
    |
    | HTTPS (credentials: 'include')
    |
Firebase Hosting (CDN)
    |
    | /api/** rewrite
    |
Firebase Cloud Functions (Flask)
    |
    | SQLAlchemy ORM
    |
Supabase PostgreSQL
```

### Backend Structure (Flask Application Factory Pattern)

```
backend/
  main.py                          -- Firebase Cloud Functions entry point
  requirements.txt                 -- Python dependencies
  .env                             -- Non-secret env vars (FLASK_ENV, VAPID_PUBLIC_KEY)
  app/
    __init__.py                    -- create_app() factory, CORS, extensions, migrations
    core/
      config.py                    -- Config classes (Dev/Prod/Test)
      extensions.py                -- SQLAlchemy, LoginManager, OAuth, CSRF, Migrate
    features/
      auth/
        routes.py                  -- /login, /register, /logout, /check-auth, Google OAuth
        forms.py                   -- WTForms (LoginForm, RegistrationForm)
      users/
        models.py                  -- User model (SQLAlchemy)
      expenses/
        models.py                  -- Expense model
        api.py                     -- REST API blueprint (/api/*)
        routes.py                  -- Legacy HTML routes
        services.py                -- Business logic (summary calculation, currency conversion)
        report_generator.py        -- PDF generation with ReportLab + matplotlib
        utils.py                   -- Exchange rates, currency symbols
      notifications/
        models.py                  -- PushSubscription, NotificationHistory models
        service.py                 -- Push notification sending logic
        worker.py                  -- Background scheduler
      ai/
        __init__.py                -- Package init
        routes.py                  -- /api/ai/chat, /api/ai/insights endpoints
        services.py                -- AIService class (Gemini integration, expense parsing)
        prompts.py                 -- System prompts for chat, parsing, and insights
  migrations/                      -- Alembic migration versions
```

### Frontend Structure

```
frontend/
  vite.config.ts                   -- Vite config with proxy
  .env.development                 -- VITE_API_URL (empty, uses proxy)
  .env.production                  -- VITE_API_URL (Firebase function URL)
  public/
    sw.js                          -- Service worker for push notifications
  src/
    main.tsx                       -- Entry point, SW registration, ErrorBoundary
    App.tsx                        -- Root component, screen routing, auth gating
    features/
      auth/components/             -- Login.tsx, Register.tsx
      expenses/components/         -- Dashboard, AddExpense, EditExpenseModal,
                                      ExpenseListItem, SwipeableExpenseItem, BulkImport
      profile/components/          -- Profile.tsx, EditProfileModal.tsx
      settings/components/         -- NotificationsSettings, PrivacySecuritySettings
      statistics/components/       -- Statistics.tsx
      ai/                          -- SnapBot AI chatbot
        ChatBot.tsx                -- Floating chat panel with animations
        chatService.ts             -- API client for AI endpoints
    shared/
      context/ExpenseContext.tsx    -- Global state (auth + data)
      services/api.ts              -- All API calls
      types/index.ts               -- TypeScript interfaces
      hooks/                       -- usePushNotifications, useIsMobile
      components/                  -- Sidebar, BottomNavigation, BottomSheet, etc.
```

### Why Application Factory Pattern?

```python
def create_app(config_name):
    app = Flask(__name__)
    app.config.from_object(config[config_name])
    db.init_app(app)
    login_manager.init_app(app)
    # ... register blueprints
    return app
```

1. **Testability** -- Create separate app instances with `TestingConfig` for unit tests.
2. **Multiple configurations** -- Same codebase runs in dev (SQLite, DEBUG=True) and prod (PostgreSQL, DEBUG=False).
3. **Circular import prevention** -- Extensions are instantiated in `extensions.py` without the app, then initialized with `init_app()`.
4. **Blueprint isolation** -- Each feature is a self-contained blueprint with its own routes, models, and services.

---

## 4. Database Design

### Entity Relationship Diagram

```
User (1) ──────< (N) Expense
  |
  |──────< (N) PushSubscription
  |
  |──────< (N) NotificationHistory
```

### User Table

```sql
CREATE TABLE "user" (
    id              SERIAL PRIMARY KEY,
    username        VARCHAR(80)  UNIQUE NOT NULL,
    email           VARCHAR(120) UNIQUE,
    google_id       VARCHAR(255) UNIQUE,          -- Google OAuth subject ID
    password_hash   VARCHAR(255),                  -- NULL for OAuth-only users
    preferred_currency VARCHAR(10) NOT NULL DEFAULT 'USD',
    profile_photo   TEXT,                          -- Base64 data URL or Google picture URL
    notify_daily_reminders  BOOLEAN NOT NULL DEFAULT TRUE,
    notify_budget_alerts    BOOLEAN NOT NULL DEFAULT TRUE,
    budget_alert_sent_month VARCHAR(7),            -- "YYYY-MM" prevents duplicate alerts
    monthly_limit   NUMERIC(10,2) NOT NULL DEFAULT 0
);
```

**Q: Why is `password_hash` nullable?**
A: OAuth users authenticate via Google and never set a password. Making it nullable allows the same User model to support both password-based and OAuth-based authentication. The `is_oauth_user` property checks: `password_hash is None and email is not None`.

**Q: Why NUMERIC(10,2) for monetary values?**
A: `NUMERIC(10,2)` stores exact decimal values with 2 decimal places, avoiding floating-point rounding errors. For financial data, precision is critical -- `0.1 + 0.2 == 0.3` must always be true.

**Q: Why TEXT for profile_photo instead of VARCHAR?**
A: Profile photos are stored as base64 data URLs (e.g., `data:image/jpeg;base64,/9j/4AAQ...`), which can be very large (megabytes). TEXT has no length limit in PostgreSQL, while VARCHAR would truncate.

### Expense Table

```sql
CREATE TABLE expense (
    id          SERIAL PRIMARY KEY,
    item_name   VARCHAR(100) NOT NULL,
    amount      NUMERIC(10,2) NOT NULL,
    currency    VARCHAR(10) NOT NULL DEFAULT 'USD',
    category    VARCHAR(50) NOT NULL,
    type        VARCHAR(10) NOT NULL DEFAULT 'expense',  -- 'income' or 'expense'
    date_added  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    user_id     INTEGER NOT NULL REFERENCES "user"(id)
);

-- Composite indexes for common query patterns
CREATE INDEX idx_user_date     ON expense(user_id, date_added);
CREATE INDEX idx_user_category ON expense(user_id, category);
CREATE INDEX idx_user_type     ON expense(user_id, type);
```

**Q: Why composite indexes?**
A: Most queries filter by `user_id` first (users can only see their own expenses), then sort/filter by `date_added`, `category`, or `type`. Composite indexes cover these query patterns efficiently without needing separate index seeks.

### PushSubscription Table

```sql
CREATE TABLE push_subscription (
    id          SERIAL PRIMARY KEY,
    user_id     INTEGER NOT NULL REFERENCES "user"(id),
    endpoint    TEXT UNIQUE NOT NULL,   -- Push service URL
    p256dh_key  VARCHAR(255),          -- Public encryption key
    auth_key    VARCHAR(255),          -- Authentication secret
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_used_at TIMESTAMP,
    user_agent  VARCHAR(500)
);
```

### NotificationHistory Table

```sql
CREATE TABLE notification_history (
    id                SERIAL PRIMARY KEY,
    user_id           INTEGER NOT NULL REFERENCES "user"(id),
    notification_type VARCHAR(50) NOT NULL,  -- 'budget_alert', 'daily_reminder', 'system'
    title             VARCHAR(200) NOT NULL,
    message           TEXT NOT NULL,
    data              JSON,                  -- Additional metadata
    is_read           BOOLEAN NOT NULL DEFAULT FALSE,
    created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    read_at           TIMESTAMP
);
```

---

## 5. Authentication System

### Why Session-Based Auth (Not JWT)?

| Aspect | Session Cookies | JWT |
|---|---|---|
| Storage | Server-side session store | Client-side token |
| Revocation | Instant (delete session) | Hard (wait for expiry or maintain blocklist) |
| Size | Small cookie (~50 bytes) | Large token (~800 bytes per request) |
| Security | HttpOnly cookie (no JS access) | Stored in localStorage (XSS vulnerable) |
| Complexity | Flask-Login handles everything | Need token refresh logic, interceptors |

For a traditional web app with same-origin or controlled cross-origin requests, session cookies with `SameSite=None; Secure; HttpOnly` provide better security with simpler implementation.

### Session Cookie Configuration

```python
# config.py
SESSION_COOKIE_SECURE = True       # Only sent over HTTPS
SESSION_COOKIE_HTTPONLY = True      # Not accessible via JavaScript
SESSION_COOKIE_SAMESITE = 'None'   # Allow cross-domain cookies
```

**Why SameSite=None?** Because the frontend (Firebase Hosting: `expensesnap-a1995.web.app`) and backend (Firebase Functions: `us-central1-expensesnap-a1995.cloudfunctions.net`) are on different domains. The browser needs `SameSite=None` to send cookies cross-origin.

### Login Flow (Code Walkthrough)

```
Frontend                              Backend
   |                                     |
   |  POST /login                        |
   |  {username, password}               |
   | ----------------------------------> |
   |                                     | User.query.filter_by(username=...)
   |                                     | user.check_password(password)
   |                                     | login_user(user)  -- creates session
   |                                     |
   | <---------------------------------- |
   |  Set-Cookie: session=xxx            |
   |  {success: true, user: {...}}       |
   |                                     |
   |  GET /api/expenses                  |
   |  Cookie: session=xxx                |
   | ----------------------------------> |
   |                                     | @login_required
   |                                     | current_user.id -> filtered query
```

### Flask-Login Integration

```python
# extensions.py
login_manager = LoginManager()

# __init__.py
@login_manager.user_loader
def load_user(user_id):
    return User.query.get(int(user_id))

@login_manager.unauthorized_handler
def unauthorized():
    if is_api_request():
        return jsonify({'success': False, 'error': 'Unauthorized'}), 401
    return redirect(url_for('auth.login'))
```

The `user_loader` is called on every request to deserialize the user from the session cookie. Flask-Login stores only the user ID in the session, then loads the full User object via this callback.

---

## 6. Google OAuth 2.0 Implementation

### Why OAuth 2.0 with OIDC?

- Users don't need to create/remember another password
- Google handles email verification
- Access to profile photo and display name
- Industry-standard security (no password storage liability)

### Complete OAuth Flow

```
1. User clicks "Continue with Google"
   Browser -> GET {BACKEND_URL}/login/google

2. Flask redirects to Google
   302 -> https://accounts.google.com/o/oauth2/v2/auth
          ?client_id=152590561789-xxx.apps.googleusercontent.com
          &redirect_uri=https://us-central1-expensesnap-a1995.cloudfunctions.net/expensesnap/auth/callback
          &scope=openid+email+profile
          &response_type=code
          &state=random_csrf_token

3. User authenticates with Google, grants consent

4. Google redirects to callback with auth code
   302 -> /auth/callback?code=4/0AfJohXn...&state=random_csrf_token

5. Flask exchanges code for tokens (server-to-server)
   POST https://oauth2.googleapis.com/token
   {code, client_id, client_secret, redirect_uri, grant_type=authorization_code}

6. Flask extracts userinfo from ID token
   {sub: "google_id", email, name, picture}

7. Flask creates/finds user, sets session cookie
   login_user(user)

8. Flask redirects to frontend
   302 -> https://expensesnap-a1995.web.app?auth_success=true

9. Frontend detects ?auth_success=true, calls refreshData()
   GET /check-auth (with session cookie) -> {authenticated: true, user: {...}}
```

### Account Linking Logic

```python
# 1. Check if user exists by google_id (returning Google user)
user = User.query.filter_by(google_id=google_id).first()

if not user:
    # 2. Check if user exists by email (link existing account to Google)
    user = User.query.filter_by(email=email).first()
    if user:
        user.google_id = google_id  # Link accounts
    else:
        # 3. Create brand new user
        user = User(username=unique_username, email=email, google_id=google_id)
```

**Why check google_id first, then email?**
- `google_id` (the `sub` claim) is a stable, immutable identifier from Google
- `email` can change (user changes Gmail address), so it's a fallback
- This prevents duplicate accounts when an existing password user signs in with Google

### Redirect URI Fix for Firebase

```python
# url_for() generates wrong URL inside Firebase Cloud Functions:
#   http://us-central1-xxx.cloudfunctions.net/auth/callback  (WRONG)
#
# Issues: http instead of https, missing /expensesnap prefix
#
# Fix: use FUNCTION_URL env var in production

function_url = os.environ.get('FUNCTION_URL')
if function_url:
    redirect_uri = f"{function_url.rstrip('/')}/auth/callback"
else:
    redirect_uri = url_for('auth.google_auth', _external=True)
```

### Google Cloud Console Configuration

**Authorized JavaScript Origins:**
- `https://expensesnap-a1995.web.app`
- `http://localhost:5001`

**Authorized Redirect URIs:**
- `https://us-central1-expensesnap-a1995.cloudfunctions.net/expensesnap/auth/callback`
- `http://localhost:5001/auth/callback`

### Authlib Registration

```python
oauth.register(
    name='google',
    client_id=app.config.get('GOOGLE_CLIENT_ID'),
    client_secret=app.config.get('GOOGLE_CLIENT_SECRET'),
    server_metadata_url='https://accounts.google.com/.well-known/openid-configuration',
    client_kwargs={'scope': 'openid email profile'}
)
```

**Why `server_metadata_url`?** This is Google's OIDC discovery endpoint. Authlib automatically fetches the authorization endpoint, token endpoint, and JWKS URI from this URL, so we don't hardcode them.

---

## 7. Backend API Design

### RESTful Conventions

| Operation | Method | Path | Example |
|---|---|---|---|
| List all | GET | `/api/expenses` | Get all user expenses |
| Create | POST | `/api/expenses` | Create new expense |
| Update | PUT | `/api/expenses/<id>` | Update specific expense |
| Delete | DELETE | `/api/expenses/<id>` | Delete specific expense |

### All API Endpoints

#### Auth Routes (Blueprint at `/`)

| Method | Path | Description | Auth |
|---|---|---|---|
| POST | `/login` | Login with `{username, password}` | No |
| POST | `/register` | Register with `{username, password, email}` | No |
| POST | `/logout` | Logout | Yes |
| GET | `/check-auth` | Check session status | No |
| GET | `/login/google` | Initiate Google OAuth | No |
| GET | `/auth/callback` | Google OAuth callback | No |

#### Expense Routes (Blueprint at `/api`)

| Method | Path | Description | Auth |
|---|---|---|---|
| GET | `/api/expenses` | Get expenses with optional filters (`search`, `year`, `month`, `category`, `type`) | Yes |
| POST | `/api/expenses` | Create expense `{item_name, amount, currency, category, type, date_added}` | Yes |
| PUT | `/api/expenses/<id>` | Update expense | Yes |
| DELETE | `/api/expenses/<id>` | Delete expense | Yes |
| GET | `/api/summary` | Get financial summary by period | Yes |
| GET | `/api/generate-report` | Download PDF report | Yes |

#### User Routes (Blueprint at `/api`)

| Method | Path | Description | Auth |
|---|---|---|---|
| GET | `/api/user/profile` | Get user profile | Yes |
| POST | `/api/user/profile` | Update profile (multipart FormData) | Yes |
| PUT | `/api/user/currency` | Update preferred currency | Yes |
| POST | `/api/user/change-password` | Change password | Yes |
| GET | `/api/user/budget` | Get monthly limit | Yes |
| PUT | `/api/update-budget` | Set monthly limit | Yes |

#### Notification Routes (Blueprint at `/api`)

| Method | Path | Description | Auth |
|---|---|---|---|
| GET | `/api/user/notifications` | Get notification preferences | Yes |
| PUT | `/api/user/notifications` | Update preferences | Yes |
| POST | `/api/push/subscribe` | Subscribe to push notifications | Yes |
| DELETE | `/api/push/unsubscribe` | Unsubscribe | Yes |
| GET | `/api/push/vapid-key` | Get VAPID public key | Yes |
| POST | `/api/push/test` | Send test notification | Yes |
| GET | `/api/notifications/history` | Get notification history | Yes |
| GET | `/api/notifications/unread-count` | Get unread count | Yes |
| PUT | `/api/notifications/<id>/read` | Mark as read | Yes |
| POST | `/api/notifications/mark-all-read` | Mark all as read | Yes |

#### Import Routes (Blueprint at `/api`)

| Method | Path | Description | Auth |
|---|---|---|---|
| GET | `/api/import-expenses/template` | Download CSV template | Yes |
| POST | `/api/import-expenses/preview` | Preview import file | Yes |
| POST | `/api/import-expenses` | Execute import | Yes |

---

## 8. Frontend State Management

### Why React Context (Not Redux)?

| Factor | React Context | Redux |
|---|---|---|
| Boilerplate | Minimal (1 file) | Significant (actions, reducers, store, selectors) |
| App complexity | Small-medium apps | Large apps with complex state interactions |
| Learning curve | Low | High |
| Dev tools | React DevTools | Redux DevTools |
| Bundle size | 0 KB (built into React) | ~7 KB (+ middleware) |

For ExpenseSnap, the state is straightforward: user, expenses, summary, loading, error, isAuthenticated. A single Context with `useCallback`-wrapped actions is sufficient.

### ExpenseContext Structure

```typescript
interface ExpenseContextType {
  // State
  expenses: Expense[];
  summary: ExpenseSummary | null;
  user: User | null;
  loading: boolean;
  error: string | null;
  isAuthenticated: boolean;

  // Actions
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, password: string, email?: string) => Promise<void>;
  logout: () => Promise<void>;
  addExpense: (data: Partial<Expense>) => Promise<void>;
  deleteExpense: (id: number) => Promise<void>;
  updateExpense: (id: number, data: Partial<Expense>) => Promise<void>;
  updateCurrency: (currency: string) => Promise<void>;
  updateProfile: (data: ProfileUpdateData) => Promise<void>;
  refreshData: () => Promise<void>;
}
```

### Data Fetching Pattern

```typescript
const refreshData = useCallback(async () => {
  try {
    // Parallel fetch for performance
    const [expensesRes, summaryRes, profileRes] = await Promise.all([
      api.getExpenses(),
      api.getSummary(),
      api.getProfile()
    ]);
    setExpenses(expensesRes.expenses);
    setSummary(summaryRes.summary);
    setUser(profileRes.user);
    setIsAuthenticated(true);
  } catch (err) {
    if (is401Error(err)) {
      setIsAuthenticated(false);  // Session expired
    }
  }
}, []);
```

**Q: Why `Promise.all` instead of sequential fetches?**
A: Three independent API calls that don't depend on each other. Running them in parallel reduces total loading time from ~900ms (3 x 300ms) to ~300ms (max of the three).

---

## 9. Frontend Components Deep Dive

### Screen Navigation (No React Router)

```typescript
// App.tsx -- state-based navigation
type Screen = 'dashboard' | 'add-expense' | 'statistics' | 'profile';
const [currentScreen, setCurrentScreen] = useState<Screen>('dashboard');
```

**Q: Why no React Router?**
A: ExpenseSnap is a single-page app where all views share the same URL. There's no need for deep linking or browser back button navigation between screens. State-based screen switching is simpler and avoids the React Router dependency.

### Swipe Gestures (Mobile)

```typescript
// SwipeableExpenseItem.tsx -- framer-motion
const x = useMotionValue(0);
const SWIPE_THRESHOLD = 80;

// Swipe right = Edit (blue pencil icon revealed on left)
// Swipe left = Delete (red trash icon revealed on right)

const bgColor = useTransform(x, [-100, 0, 100], [
  'rgb(239, 68, 68)',   // Red (delete)
  'rgb(255,255,255)',   // White (neutral)
  'rgb(59, 130, 246)'   // Blue (edit)
]);
```

### Responsive Design

```typescript
// useIsMobile hook
const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);
  return isMobile;
};
```

- **Desktop**: Sidebar navigation, 3-dot menu on expense items, modal dialogs
- **Mobile**: Bottom tab navigation, swipe gestures, bottom sheet dialogs

### Category-to-Icon Mapping

```typescript
const categoryIcons: Record<string, LucideIcon> = {
  Shopping: ShoppingBag,
  Food: UtensilsCrossed,
  Transport: Car,
  Housing: Home,
  Bills: Receipt,
  Health: Heart,
  Entertainment: Tv,
  Income: TrendingUp,
  Other: MoreHorizontal
};
```

---

## 10. CORS & Cross-Domain Cookies

### The Problem

Frontend (`expensesnap-a1995.web.app`) and Backend (`us-central1-xxx.cloudfunctions.net`) are on different domains. By default, browsers block:
1. Cross-origin requests (CORS)
2. Cross-origin cookies (SameSite policy)

### The Solution

**Backend (Flask CORS):**

```python
CORS(app, resources={
    r"/*": {
        "origins": [
            "https://expensesnap-a1995.web.app",
            "https://expensesnap-a1995.firebaseapp.com",
            "http://localhost:5173",
        ],
        "supports_credentials": True,  # Allow cookies
        "allow_headers": ["Content-Type", "Authorization", "Accept"],
        "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"]
    }
})
```

**Backend (Session Cookies):**

```python
SESSION_COOKIE_SECURE = True       # HTTPS only
SESSION_COOKIE_HTTPONLY = True      # No JS access
SESSION_COOKIE_SAMESITE = 'None'   # Allow cross-domain
```

**Frontend (Every Fetch Request):**

```typescript
fetch(url, {
  credentials: 'include',  // Send cookies cross-origin
  headers: { 'Content-Type': 'application/json' }
});
```

### Why This Works

1. `supports_credentials: True` tells the browser it's OK to send cookies
2. `SameSite=None` tells the browser to include the cookie on cross-origin requests
3. `Secure=True` is required when `SameSite=None` (browser security requirement)
4. `credentials: 'include'` on the frontend tells `fetch()` to actually send the cookie
5. The CORS origin whitelist restricts which domains can make credentialed requests

---

## 11. Push Notifications (Web Push / VAPID)

### Architecture

```
1. Frontend requests permission
   Notification.requestPermission() -> 'granted'

2. Frontend subscribes via Service Worker
   registration.pushManager.subscribe({
     userVisibleOnly: true,
     applicationServerKey: VAPID_PUBLIC_KEY  // from GET /api/push/vapid-key
   })

3. Frontend sends subscription to backend
   POST /api/push/subscribe
   {endpoint, keys: {p256dh, auth}}

4. Backend stores subscription in PushSubscription table

5. Backend sends push (e.g., budget alert)
   pywebpush.webpush(
     subscription_info={endpoint, keys: {p256dh, auth}},
     data=json.dumps({title, body, url}),
     vapid_private_key=VAPID_PRIVATE_KEY,
     vapid_claims={sub: "mailto:admin@expensesnap.com"}
   )

6. Push service delivers to browser

7. Service Worker receives push event
   self.addEventListener('push', (event) => {
     const data = event.data.json();
     self.registration.showNotification(data.title, {body, icon, data});
   });
```

### What are VAPID Keys?

VAPID (Voluntary Application Server Identification) keys are an asymmetric key pair:
- **Public key**: Shared with the browser to identify this application server
- **Private key**: Used server-side to sign push messages, proving they came from this server

### Budget Alert Logic

```python
def check_budget_alert(user):
    if user.monthly_limit <= 0 or not user.notify_budget_alerts:
        return

    current_month = datetime.now().strftime('%Y-%m')
    if user.budget_alert_sent_month == current_month:
        return  # Already sent this month

    total_spent = calculate_monthly_spending(user)
    threshold = user.monthly_limit * BUDGET_ALERT_THRESHOLD  # 80%

    if total_spent >= threshold:
        send_push_notification(user, f"You've spent {percentage}% of your budget!")
        user.budget_alert_sent_month = current_month
        db.session.commit()
```

---

## 12. PDF Report Generation

### Libraries Used

- **ReportLab**: Python PDF generation (tables, text, layouts, custom fonts)
- **matplotlib**: Server-side pie/donut chart generation (rendered as image, embedded in PDF)

### Report Sections

1. **Header**: App logo/title, report period, generation date, account holder
2. **Financial Highlights**: 4 cards (highest expense, total savings, daily average, transaction count)
3. **Financial Summary**: 3 colored boxes (total income green, total expenses red, net balance indigo)
4. **Category Breakdown**: Donut pie chart + category table with percentages
5. **Transaction Details**: Full table with date, description, category, type, amount (color-coded)

### How the Chart is Generated

```python
# Server-side matplotlib (no browser needed)
fig, ax = plt.subplots(figsize=(4, 4))
wedges, texts, autotexts = ax.pie(
    values, labels=labels, autopct='%1.1f%%',
    pctdistance=0.75, startangle=90
)
centre_circle = plt.Circle((0, 0), 0.5, fc='white')  # Donut hole
ax.add_artist(centre_circle)

# Save to BytesIO buffer, embed in PDF
buf = BytesIO()
fig.savefig(buf, format='png', dpi=150, bbox_inches='tight')
```

### Font Support for Currency Symbols

```python
# Register NotoSans for Unicode currency symbols (₹, €, £, ¥)
pdfmetrics.registerFont(TTFont('NotoSans', 'NotoSans-Regular.ttf'))
```

---

## 13. Bulk Import (CSV/XLSX)

### Flow

```
1. User downloads CSV template
   GET /api/import-expenses/template

2. User fills in data, uploads file
   POST /api/import-expenses/preview (FormData: file)

3. Backend validates with pandas
   df = pd.read_csv(file) or pd.read_excel(file)
   - Validates: required columns, amount > 0, valid categories, valid types
   - Returns: {valid_count, invalid_count, preview (first 20 rows), errors}

4. User reviews preview, clicks "Import"
   POST /api/import-expenses (FormData: file, skip_invalid)

5. Backend creates Expense records for valid rows
   Returns: {imported_count, skipped_count, errors}
```

### Validation Rules

- Required columns: `date`, `description`, `category`, `amount`
- Amount must be positive number
- Category must be in allowed list
- Type defaults to 'expense' if not provided
- Date parsed with flexible format support
- Maximum 500 rows per import, 5MB file size limit

---

## 14. Currency Conversion

### Static Exchange Rates

```python
EXCHANGE_RATES = {
    'USD': 1.0, 'EUR': 0.92, 'GBP': 0.78, 'INR': 83.3,
    'JPY': 150.5, 'CNY': 7.2, 'AUD': 1.5, 'CAD': 1.35,
    'SGD': 1.34, 'AED': 3.67
}
```

### Conversion Logic

```python
def convert_currency(amount, from_currency, to_currency):
    if from_currency == to_currency:
        return amount
    # Convert to USD first (base), then to target
    amount_in_usd = amount / EXCHANGE_RATES[from_currency]
    return amount_in_usd * EXCHANGE_RATES[to_currency]
```

**Q: Why not use a live exchange rate API?**
A: For an expense tracker, static rates are acceptable because:
1. Expenses are recorded in their original currency
2. Conversion is only for display/summary purposes
3. Avoids external API dependency, rate limiting, and costs
4. Can be upgraded to live rates later without schema changes

---

## 15. Database Migrations Strategy

### Dual Strategy

ExpenseSnap uses two migration approaches simultaneously:

**1. Alembic (Flask-Migrate) -- Formal migrations:**

```bash
flask db migrate -m "add_profile_photo"
flask db upgrade
```

Creates versioned migration files in `migrations/versions/`. Used for local development and planned schema changes.

**2. Inline Schema Migrations -- Runtime safety net:**

```python
def _run_schema_migrations(app, db):
    inspector = inspect(db.engine)
    existing_columns = [col['name'] for col in inspector.get_columns('user')]

    if 'google_id' not in existing_columns:
        db.session.execute(text(
            'ALTER TABLE "user" ADD COLUMN google_id VARCHAR(255) UNIQUE'
        ))
        db.session.commit()
```

Runs on every app startup. Checks for missing columns and adds them. This handles cases where the production database was created before new columns were added (e.g., deploying to a new environment without running Alembic).

**Q: Why both?**
A: Alembic is the proper approach for development. But in production (especially serverless), you can't always run `flask db upgrade` before deployment. The inline migrations ensure the schema is always correct, regardless of deployment order.

---

## 16. Firebase Deployment

### Why Firebase (Not Render + Vercel)?

| Aspect | Render + Vercel | Firebase |
|---|---|---|
| Domains | 2 separate domains (CORS complexity) | Same domain via Hosting rewrites |
| Cold starts | Render free tier: ~30s cold start | Cloud Functions: ~5-10s (mitigated with keep-warm) |
| Scaling | Manual plan selection | Auto-scaling (0 to N instances) |
| Cost | Free tier limits | Pay-per-invocation (generous free tier) |
| SSL | Automatic on both | Automatic |
| Secrets | Render env vars (plaintext) | Google Secret Manager (encrypted, versioned) |

### Firebase Architecture

```
firebase.json
├── hosting
│   ├── public: "frontend/dist"
│   └── rewrites:
│       ├── /api/**      -> Cloud Function "expensesnap"
│       ├── /login/**    -> Cloud Function "expensesnap"
│       ├── /auth/**     -> Cloud Function "expensesnap"
│       └── **           -> /index.html (SPA fallback)
└── functions
    ├── source: "backend"
    ├── runtime: "python312"
    └── ignore: ["venv", "__pycache__", ".env", "logs"]
```

### Lazy Initialization (Critical for Firebase)

Firebase's discovery phase has a **10-second timeout**. If your module-level code takes longer, deployment fails.

**Problem**: `create_app()` connects to PostgreSQL, runs schema migrations, and creates tables -- exceeding 10 seconds.

**Solution**: Defer initialization to the first actual request:

```python
_flask_app = None

def _get_flask_app():
    global _flask_app
    if _flask_app is None:
        from app import create_app
        _flask_app = create_app(os.environ.get("FLASK_ENV", "production"))
    return _flask_app

@https_fn.on_request(...)
def expensesnap(req):
    app = _get_flask_app()  # Initialized on first request, cached after
    with app.request_context(req.environ):
        return app.full_dispatch_request()
```

### Hosting Rewrites

```json
{
  "source": "/api/**",
  "function": "expensesnap"
}
```

**Q: Why do auth routes need separate rewrites?**
A: Auth routes (`/login`, `/register`, `/logout`, `/check-auth`, `/auth/callback`) live at the root path, not under `/api`. Without explicit rewrites, Firebase Hosting would serve `index.html` for these paths instead of forwarding to Flask.

---

## 17. Cold Start Mitigation (Keep-Warm)

### The Problem

Serverless functions are shut down after idle time. The next request triggers a "cold start" -- loading the runtime, installing dependencies, and initializing the app. For Flask with SQLAlchemy, this can take 5-10 seconds.

### The Solution

A separate scheduler function pings the main function every 5 minutes:

```python
@scheduler_fn.on_schedule(
    schedule="*/5 * * * *",   # Every 5 minutes
    region="us-central1",
    memory=options.MemoryOption.MB_256,
    timeout_sec=30,
)
def keep_warm(event):
    function_url = os.environ.get("FUNCTION_URL")
    ping_url = f"{function_url}/ping"

    try:
        response = requests.get(ping_url, timeout=10)
        logging.info(f"Keep-warm ping: {response.status_code}")
    except requests.exceptions.Timeout:
        logging.warning("Keep-warm ping timed out")
```

The `/ping` endpoint is a lightweight route that returns immediately:

```python
@flask_app.route("/ping")
def ping():
    return "pong", 200
```

### Cost Impact

- Cloud Scheduler: Free for up to 3 jobs
- Function invocations: ~8,640/month (288/day x 30 days) -- well within free tier
- Memory: 256MB for scheduler (minimal)

---

## 18. Secret Management

### Google Secret Manager vs Environment Variables

| Approach | Security | Versioning | Access Control |
|---|---|---|---|
| `.env` file | Plaintext, deployed with code | None | Anyone with code access |
| Render env vars | Encrypted at rest | None | Dashboard access |
| **Google Secret Manager** | **Encrypted, IAM-controlled** | **Version history** | **Per-secret IAM policies** |

### How Secrets are Injected

```python
@https_fn.on_request(
    secrets=[
        "DATABASE_URL",
        "SECRET_KEY",
        "GCLOUD_CLIENT_ID",
        "GCLOUD_CLIENT_SECRET",
        "VAPID_PRIVATE_KEY",
    ],
)
def expensesnap(req):
    # These are now available as os.environ.get("DATABASE_URL"), etc.
```

Firebase automatically:
1. Fetches the latest version of each secret from Secret Manager
2. Injects them as environment variables into the function's runtime
3. Grants the function's service account `secretAccessor` role

### What Goes Where

| Variable | Storage | Reason |
|---|---|---|
| `DATABASE_URL` | Secret Manager | Contains database password |
| `SECRET_KEY` | Secret Manager | Flask session signing key |
| `GCLOUD_CLIENT_ID` | Secret Manager | OAuth credential |
| `GCLOUD_CLIENT_SECRET` | Secret Manager | OAuth secret |
| `VAPID_PRIVATE_KEY` | Secret Manager | Signing key for push notifications |
| `FLASK_ENV` | `.env` file | Not sensitive |
| `VAPID_PUBLIC_KEY` | `.env` file | Public by design |
| `FUNCTION_URL` | `.env` file | Publicly accessible URL |

---

## 19. Error Handling Patterns

### Backend Error Handling

**Consistent JSON error responses:**

```python
@app.errorhandler(404)
def not_found(error):
    return jsonify({'success': False, 'error': 'Not found'}), 404

@app.errorhandler(500)
def internal_error(error):
    db.session.rollback()  # Prevent dangling transactions
    return jsonify({'success': False, 'error': 'Internal server error'}), 500
```

**Database error recovery:**

```python
try:
    db.session.add(expense)
    db.session.commit()
except Exception as e:
    db.session.rollback()  # Always rollback on failure
    return jsonify({'success': False, 'error': str(e)}), 500
```

**Non-critical service isolation:**

```python
# Notification failures never block login
try:
    _safe_initialize_notifications(user)
except Exception as notif_error:
    current_app.logger.warning(f"Notification init failed: {notif_error}")
    # Continue with login -- notifications are non-critical
```

### Frontend Error Handling

**Central error parser:**

```typescript
async function parseJsonResponse(response: Response) {
  if (response.status === 401) {
    throw new Error('Invalid username or password');
  }
  const data = await response.json();
  if (!data.success) {
    throw new Error(data.error || 'Request failed');
  }
  return data;
}
```

**Auth error detection (silent logout):**

```typescript
catch (err) {
  if (is401Error(err) || err.message.includes('Unauthorized')) {
    setIsAuthenticated(false);  // Silent redirect to login
  } else {
    setError(err.message);  // Show error to user
  }
}
```

**ErrorBoundary (catch-all):**

```typescript
class ErrorBoundary extends React.Component {
  componentDidCatch(error, errorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return <ErrorPage error={this.state.error} />;
    }
    return this.props.children;
  }
}
```

---

## 20. PWA Features

### Service Worker

```javascript
// sw.js - Handles push notifications
self.addEventListener('push', (event) => {
  const data = event.data.json();
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/icon-192.png',
      data: { url: data.url }
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow(event.notification.data.url || '/')
  );
});
```

### Registration

```typescript
// main.tsx
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js', { scope: '/' })
    .then(registration => {
      registration.addEventListener('updatefound', () => {
        // Handle SW updates
      });
    });
}
```

---

## 21. Security Measures

| Measure | Implementation |
|---|---|
| **Password hashing** | Werkzeug `generate_password_hash` (PBKDF2 with salt) |
| **Session cookies** | `HttpOnly` (no JS access), `Secure` (HTTPS only), `SameSite=None` |
| **CSRF protection** | Flask-WTF CSRFProtect (exempted for API blueprints using JSON) |
| **CORS whitelist** | Only specific origins allowed, `supports_credentials: True` |
| **SQL injection** | SQLAlchemy ORM parameterizes all queries |
| **XSS prevention** | React auto-escapes JSX output |
| **Secret management** | Google Secret Manager (encrypted, IAM-controlled) |
| **Input validation** | Server-side validation for all API inputs |
| **File upload limits** | 5MB max, type checking (CSV/XLSX/image) |
| **OAuth state parameter** | Authlib handles CSRF state token in OAuth flow |

---

## 22. Performance Considerations

| Technique | Where | Impact |
|---|---|---|
| **Parallel API calls** | `Promise.all([expenses, summary, profile])` | 3x faster initial load |
| **Debounced search** | Dashboard search (300ms debounce) | Reduces API calls while typing |
| **Lazy initialization** | Flask app in Cloud Functions | Passes Firebase's 10s discovery timeout |
| **Keep-warm scheduler** | Pings every 5 minutes | Eliminates cold starts for active users |
| **Composite DB indexes** | `(user_id, date_added)`, `(user_id, category)` | Fast filtered queries |
| **Connection pooling** | SQLAlchemy pool_size=5, max_overflow=10 | Reuses database connections |
| **pool_pre_ping** | SQLAlchemy config | Validates connections before use |
| **Dynamic imports** | `from app import create_app` inside function | Deferred module loading |
| **Tree shaking** | Vite + ES modules | Only ships used code to browser |

---

## 23. AI Chatbot (SnapBot)

### Overview

SnapBot is an AI-powered financial assistant built into ExpenseSnap. It uses **Google Gemini 2.5 Flash** to provide two core capabilities:
1. **Natural language expense entry** -- users type "spent 200 on uber" and the expense is parsed and saved automatically.
2. **Conversational financial analysis** -- users ask questions about their spending and get personalized, data-driven insights.

### Architecture: Two-Model Pipeline

```
User Message
    |
    v
[Parse Model] -- "Is this an expense?"
    |                    |
    YES                  NO
    |                    |
    v                    v
Create Expense     [Chat Model] -- Answer with financial context
in Database             |
    |                    v
    v              AI Response
Confirmation
```

**Why two models?** Each model has a different system prompt optimized for its task:
- **Parse Model** (`EXPENSE_PARSE_PROMPT`): Returns strict JSON (`{is_expense, item_name, amount, currency, category, type}`). No conversational text.
- **Chat Model** (`SYSTEM_PROMPT`): Full financial advisor persona with context injection. Generates natural language responses.

Both use the same underlying model (`gemini-2.5-flash`) but with different `system_instruction` parameters.

### Backend Implementation

**File: `backend/app/features/ai/services.py`**

```python
class AIService:
    def __init__(self):
        self._model = None        # Chat model (lazy)
        self._parse_model = None  # Parse model (lazy)

    def _get_model(self):
        """Lazy-initialize Gemini -- only loads on first AI request."""
        if self._model is None:
            import google.generativeai as genai
            genai.configure(api_key=os.environ.get('GEMINI_API_KEY'))
            self._model = genai.GenerativeModel('gemini-2.5-flash', system_instruction=SYSTEM_PROMPT)
            self._parse_model = genai.GenerativeModel('gemini-2.5-flash', system_instruction=EXPENSE_PARSE_PROMPT)
        return self._model, self._parse_model

    def parse_expense(self, message) -> Optional[Dict]:
        """Extract structured expense data from natural language."""
        # Returns {"item_name": "Uber", "amount": 200, "currency": "INR", "category": "Transport", "type": "expense"}
        # or None if not an expense

    def chat(self, message, expense_context) -> str:
        """Answer questions with injected financial context."""

    def get_insights(self, expense_context) -> str:
        """Generate structured financial analysis report."""

# Singleton instance -- shared across all requests
ai_service = AIService()
```

**Key Design Decisions:**

| Decision | Why |
|---|---|
| **Lazy initialization** | Gemini SDK import + API key config only happen on first AI request, not at app startup. Prevents slowing down Flask initialization in Cloud Functions. |
| **Singleton pattern** | `ai_service = AIService()` at module level. All requests share one instance, avoiding redundant model initialization. |
| **JSON-only parse model** | The parse prompt instructs: "Respond ONLY with valid JSON, no markdown, no explanation." This makes parsing deterministic and reliable. |
| **Markdown cleanup** | `parse_expense()` strips ` ```json ``` ` code fences the model sometimes adds despite instructions. Defensive parsing. |
| **Context injection** | User's financial data is built fresh per request via `build_expense_context()` and injected into the prompt, not stored in model memory. |

### Context Building

```python
def build_expense_context(user_id: int) -> str:
    """Build a text summary of user's finances for AI context."""
    # Returns a formatted string containing:
    # - All-time totals (income, expenses, balance)
    # - This month's totals
    # - Category breakdown with percentages
    # - Last 10 transactions with dates
```

This function queries the database for the user's expenses, calculates summaries using `ExpenseService`, and formats everything into a plain-text string that fits the model's context window. The AI never accesses the database directly -- all data flows through this function.

### API Endpoints

**`POST /api/ai/chat`** -- Main chat endpoint (two-step pipeline)

```
Request:  { "message": "spent 200 on uber" }
Response: {
    "success": true,
    "reply": "✅ Got it! I've added your expense:\n📝 **Uber Ride** — ₹200.00 (Transport)",
    "expense_added": { "id": 42, "item_name": "Uber Ride", "amount": 200, "currency": "INR", "category": "Transport", "type": "expense" }
}
```

```
Request:  { "message": "how much did I spend on food?" }
Response: {
    "success": true,
    "reply": "This month you've spent ₹4,200 on Food, which is 35% of your total spending...",
    "expense_added": null
}
```

**`GET /api/ai/insights`** -- AI-generated financial analysis report

```
Response: {
    "success": true,
    "insights": "### 📊 Financial Analysis Report\n\n**1. 💰 Income Summary:** ..."
}
```

### Prompt Engineering

Three specialized prompts in `backend/app/features/ai/prompts.py`:

| Prompt | Purpose | Key Instructions |
|---|---|---|
| `SYSTEM_PROMPT` | Chat model persona | "You are SnapBot, an expert AI financial advisor." Includes structured report format, valid categories/currencies, and rules for data-driven analysis. |
| `EXPENSE_PARSE_PROMPT` | Expense extraction | "Respond ONLY with valid JSON." Detects currency from symbols (₹→INR, $→USD). Defaults to INR. Distinguishes income vs expense. |
| `INSIGHT_PROMPT` | Financial report | 7-section structured format: Income Summary, Expense Summary, Savings/Deficit, Spending Patterns, Risk Analysis, Smart Suggestions, Budget Health Score (1-10). |

**Valid categories** (shared with expense model): Food, Shopping, Transport, Entertainment, Bills, Health, Housing, Other.

**Valid currencies**: USD, EUR, GBP, INR, JPY, CNY, AUD, CAD, SGD, AED.

### Frontend Implementation

**File: `frontend/src/features/ai/ChatBot.tsx`**

The chatbot renders as a floating button (bottom-right corner) that opens a slide-up chat panel:

```
+-----------------------------------+
| SnapBot - AI Financial Assistant  |
+-----------------------------------+
| 🤖 Hey! I'm SnapBot...           |
|                                   |
| [💰 This week's spending]        |
| [🏆 Top expenses]                |
| [📊 Spending insights]           |
+-----------------------------------+
| Try "spent 200 on uber"...  [>]  |
+-----------------------------------+
```

**Key UI features:**

- **Floating toggle button** with framer-motion scale animation (indigo gradient → red when open)
- **AnimatePresence** for smooth panel open/close transitions (opacity + translateY + scale)
- **Quick action chips** shown before first user message -- disappear after interaction
- **Expense confirmation cards** inline in chat when an expense is successfully added
- **Auto-scroll** to latest message via `useRef` + `scrollIntoView`
- **Auto-focus** input field when panel opens (300ms delay for animation)
- **Welcome message** injected on first open (explains capabilities)
- **Loading indicator** with spinning `Loader2` icon during API calls
- **Dashboard sync** -- when an expense is added via chat, `refreshData()` is called to update the Dashboard in real-time
- **Simple markdown rendering** -- bold (`**text**`) and italic (`*text*`) via regex replacement with `dangerouslySetInnerHTML`
- **Safe area support** -- CSS `env(safe-area-inset-bottom)` for iOS notch devices

**File: `frontend/src/features/ai/chatService.ts`**

```typescript
const AI_BASE_URL = `${import.meta.env.VITE_API_URL}/api/ai`;

async function fetchAI(url: string, options = {}): Promise<Response> {
    return fetch(url, { ...options, credentials: 'include', headers: { 'Content-Type': 'application/json' } });
}

export const chatApi = {
    sendMessage(message: string): Promise<ChatResponse>,
    getInsights(): Promise<InsightsResponse>,
};
```

**`credentials: 'include'`** ensures session cookies are sent with AI requests, so the backend can authenticate the user via `@login_required` and query their expenses.

### Security

- All AI endpoints require `@login_required` -- unauthenticated users get 401
- AI blueprint is CSRF-exempted (JSON API, not form submission)
- User data is scoped: `build_expense_context(current_user.id)` only queries the authenticated user's expenses
- Gemini API key is stored in `.env` (non-secret for free-tier keys) -- can be moved to Secret Manager for production
- Input validation: empty messages return 400, item names truncated to 100 chars, amounts must be positive
- Database rollback on errors: `db.session.rollback()` in the catch block prevents partial writes

---

## 24. Common Interview Q&A

### Architecture & Design

**Q: Why did you separate frontend and backend into different deployments?**
A: Separation of concerns. The frontend is static files served from a CDN (Firebase Hosting) for fast global delivery. The backend is a serverless function that scales independently based on API load. This also allows independent deployment cycles -- I can update the UI without redeploying the backend.

**Q: Why Flask instead of Django or FastAPI?**
A: Flask is lightweight and gives me control over which components to include. Django's batteries-included approach would add unused overhead (admin panel, template engine, middleware). FastAPI would require async throughout, and my database library (SQLAlchemy with psycopg2) is synchronous. Flask + Blueprints gives me the modular structure I need without the boilerplate.

**Q: How would you scale this application?**
A: Firebase Cloud Functions auto-scale horizontally (up to `max_instances=10`). For the database, I'd add read replicas for read-heavy queries, implement caching (Redis) for frequently accessed summaries, and consider connection pooling via PgBouncer. For the frontend, Firebase Hosting already uses a global CDN.

### Authentication

**Q: Why session-based auth instead of JWT?**
A: For this application, session cookies are simpler and more secure. They can be revoked instantly (server-side session deletion), are automatically managed by the browser, and `HttpOnly` prevents JavaScript access (XSS protection). JWTs would require implementing token refresh logic, storing tokens client-side (localStorage is XSS-vulnerable), and maintaining a token blocklist for revocation.

**Q: How do you handle session expiry?**
A: When any API call returns 401, the frontend catches it in the `parseJsonResponse()` function and sets `isAuthenticated = false`, which renders the Login screen. The `refreshData()` function (called on app mount) acts as the initial session check via `GET /check-auth`.

**Q: What happens if a user signs up with email/password, then later tries Google OAuth with the same email?**
A: The OAuth callback checks by `google_id` first, then by `email`. If a user exists with the same email but no `google_id`, it links the Google account to the existing user by setting `user.google_id = google_id`. The user can then sign in with either method.

### Database

**Q: How do you handle database migrations in a serverless environment?**
A: I use a dual strategy. Alembic (Flask-Migrate) for formal, version-controlled migrations during development. Plus inline schema migrations that run on every app startup -- they inspect the existing schema and add any missing columns. This handles cases where the production database exists but hasn't had the latest migrations applied.

**Q: Why PostgreSQL over MongoDB?**
A: Financial data is inherently relational (users have expenses, expenses belong to categories). PostgreSQL provides ACID transactions (critical for financial accuracy), NUMERIC type for precise decimal arithmetic, and powerful indexing for date-range queries. MongoDB's flexible schema would be a disadvantage here -- I want strict type enforcement for monetary values.

### Frontend

**Q: Why no React Router?**
A: ExpenseSnap doesn't need URL-based navigation. All screens share the same URL `/`. State-based screen switching (`currentScreen`) is simpler, avoids the React Router dependency, and is appropriate for a mobile-first app where users navigate via bottom tabs, not URL changes.

**Q: How do you handle mobile vs desktop UX?**
A: A custom `useIsMobile()` hook detects viewport width. Mobile gets: swipe gestures (framer-motion), bottom sheet dialogs, bottom tab navigation. Desktop gets: sidebar navigation, dropdown menus, modal dialogs. The same components render different UIs based on this hook.

**Q: Why Tailwind CSS instead of styled-components or CSS Modules?**
A: Tailwind eliminates context switching between CSS and JSX files. Utility classes are colocated with markup, making the visual output predictable. The JIT compiler in Tailwind v4 only generates CSS for classes actually used, keeping the bundle small (7.3KB gzipped for this entire app).

### Deployment

**Q: What was the biggest challenge deploying Flask on Firebase?**
A: Firebase's discovery phase has a 10-second timeout for analyzing function source code. My `create_app()` factory connects to PostgreSQL and runs schema migrations, which exceeded this limit. The solution was lazy initialization -- deferring `create_app()` to the first actual HTTP request instead of running it at import time. This passes discovery quickly, and the first request handles the one-time setup.

**Q: How do you handle cold starts?**
A: A separate Cloud Scheduler function (`keep_warm`) pings the main function's `/ping` endpoint every 5 minutes. This keeps at least one instance warm, so real user requests never hit a cold start. The cost is negligible -- ~8,640 invocations/month, well within the free tier.

**Q: Why Google Secret Manager instead of environment variables?**
A: Environment variables in `.env` files are deployed as plaintext with the function code. Secret Manager provides encryption at rest, version history (can roll back to previous values), IAM access control (only the function's service account can read them), and audit logging. For secrets like database passwords and OAuth credentials, this level of security is essential.

### Security

**Q: How do you prevent CSRF attacks without CSRF tokens on your API?**
A: The API and auth blueprints are exempted from Flask-WTF's CSRF protection because they use JSON requests (not HTML form submissions). CSRF attacks work by submitting HTML forms cross-origin, but they can't set custom headers like `Content-Type: application/json`. The combination of JSON-only API + CORS origin whitelist + SameSite cookies provides equivalent protection.

**Q: How do you prevent SQL injection?**
A: SQLAlchemy's ORM parameterizes all queries automatically. I never use raw SQL string concatenation. For example, `User.query.filter_by(username=username)` generates a parameterized query: `SELECT * FROM user WHERE username = $1`. For the few raw SQL statements (inline migrations), I use SQLAlchemy's `text()` with no user input.

### Push Notifications

**Q: How does Web Push work end-to-end?**
A: The browser's Push API creates a subscription with the push service (FCM for Chrome, Mozilla Push for Firefox). This subscription has a unique endpoint URL and encryption keys. My backend stores this subscription and uses the `pywebpush` library with VAPID keys to send encrypted payloads to the push service. The push service delivers the message to the browser, which wakes up the Service Worker to display the notification -- even if the app tab is closed.

**Q: How do you handle duplicate push subscriptions?**
A: The `endpoint` column in `PushSubscription` has a UNIQUE constraint. Before subscribing, the frontend unsubscribes any existing subscription to prevent conflicts. If a subscription already exists for a different user (e.g., after logout/login), it's updated rather than duplicated.

### AI Chatbot (SnapBot)

**Q: Why did you use a two-model pipeline instead of a single model?**
A: Each task needs a different output format. The parse model must return strict JSON for database insertion -- any conversational text mixed in would break `json.loads()`. The chat model needs to be conversational and analytical. By separating them with different `system_instruction` parameters, each model is optimized for its specific task. Both use the same underlying Gemini 2.5 Flash model, so there's no additional cost.

**Q: Why lazy initialization for the Gemini client?**
A: The `AIService` class uses lazy initialization (`_get_model()` only runs on the first AI request). This prevents the Gemini SDK from being imported and configured during Flask's `create_app()`, which would add to the Cloud Functions discovery timeout. Most users may never use the chatbot in a given session, so eager initialization would waste resources.

**Q: How do you inject user financial context into the AI?**
A: Each request calls `build_expense_context(current_user.id)`, which queries the database for the user's all-time totals, this month's breakdown, category percentages, and last 10 transactions. This is formatted as plain text and injected into the prompt. The AI never accesses the database directly -- it only sees the pre-built context string. This ensures data isolation between users and gives me full control over what information the model receives.

**Q: How do you handle the case where the AI's JSON response is malformed?**
A: The `parse_expense()` method has multiple fallbacks: (1) Strip markdown code fences (` ```json ``` `) that the model sometimes adds despite instructions. (2) `json.loads()` wrapped in try/except -- if parsing fails, return `None` (treat as non-expense). (3) Validate required fields (`item_name`, `amount`, `currency`, `category`, `type`) and check amount is positive. If any validation fails, it falls through to the conversational chat model instead of erroring.

**Q: How does the chatbot keep the dashboard in sync?**
A: When `POST /api/ai/chat` successfully creates an expense, the response includes `expense_added` with the full expense object. The frontend's `ChatBot` component checks this field -- if present, it calls `refreshData()` from the `ExpenseContext`, which re-fetches all expenses and summaries. The dashboard updates in real-time without a page reload.

**Q: Why did you choose Gemini 2.5 Flash over GPT-4 or Claude?**
A: Three reasons: (1) **Free tier** -- Gemini offers generous free API usage, ideal for a personal project. (2) **Speed** -- Flash models are optimized for low latency, important for a chat interface where users expect fast responses. (3) **Native integration** -- Since the backend is already deployed on Google Cloud (Firebase), using Gemini avoids cross-cloud API calls and simplifies authentication.

**Q: How do you prevent one user from seeing another user's data through the AI?**
A: Every AI endpoint is decorated with `@login_required`. The `build_expense_context()` function takes `current_user.id` as a parameter and queries only that user's expenses via `ExpenseService.get_user_expenses(user_id)`. The AI model receives a text summary scoped to the authenticated user -- there's no way to query another user's data through the chat interface.
