# ExpenseSnap

<p align="center">
  <img src="frontend/public/logo.png" alt="ExpenseSnap logo" width="120" />
</p>

<p align="center">
  <strong>AI-assisted personal finance tracker with receipt scanning, bulk import, analytics, budget alerts, and PWA support.</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Frontend-React%2019%20%2B%20TypeScript-61DAFB?style=for-the-badge&logo=react&logoColor=000" alt="React badge" />
  <img src="https://img.shields.io/badge/Backend-Flask%20%2B%20SQLAlchemy-000000?style=for-the-badge&logo=flask&logoColor=white" alt="Flask badge" />
  <img src="https://img.shields.io/badge/Database-SQLite%20%2F%20PostgreSQL-336791?style=for-the-badge&logo=postgresql&logoColor=white" alt="Database badge" />
  <img src="https://img.shields.io/badge/PWA-Installable-5A0FC8?style=for-the-badge&logo=pwa&logoColor=white" alt="PWA badge" />
  <img src="https://img.shields.io/badge/AI-Gemini%20Vision%20%2B%20Chat-4285F4?style=for-the-badge&logo=google&logoColor=white" alt="Gemini badge" />
</p>

## 1. Project Title

**ExpenseSnap** - Intelligent Expense Tracking and Personal Finance Management Platform

## 2. Project Description

ExpenseSnap is a full-stack expense tracking application built for users who want more than a basic ledger. It combines a modern React frontend with a modular Flask backend to support daily expense logging, income tracking, category-based analytics, monthly budgeting, PDF reports, AI-powered receipt scanning, and conversational finance assistance through SnapBot.

The current codebase is structured as a production-oriented app:

- A **React + TypeScript + Vite** frontend provides the mobile-friendly dashboard, statistics, profile, and onboarding experience.
- A **Flask application-factory backend** exposes authentication, expense management, analytics, import/export, OCR, AI, and push-notification APIs.
- The app is prepared for **local development**, **Firebase Hosting + Cloud Functions deployment**, and also includes **Render/PostgreSQL deployment artifacts** from an earlier hosting workflow.

## 3. Features

- User registration, login, logout, and persistent session-based authentication
- Google OAuth login flow
- Add, edit, delete, and browse income/expense transactions
- Smart dashboard with balance, income, expense, and recent transaction overview
- Search and filter transactions by keyword, year, month, category, and type
- Bulk import expenses from **CSV / XLS / XLSX** with preview, validation, and skip-invalid flow
- AI receipt scanner using **Google Gemini Vision** to extract merchant, date, amount, category, and line items
- AI finance assistant (**SnapBot**) for natural-language expense entry and spending Q&A
- Statistics screen with time-based summaries, category breakdown, and savings rate
- Monthly budget limit configuration with alert threshold tracking
- Push notification subscription flow with VAPID keys, service worker registration, and notification history
- Profile editing, profile photo upload, preferred currency selection, and notification preferences
- PDF report generation for expense summaries
- Progressive Web App support with install prompt, manifest, and service worker
- Responsive UI for mobile and desktop layouts

## 4. Tech Stack

### Frontend

- React 19
- TypeScript
- Vite
- Tailwind CSS v4
- Framer Motion
- Lucide React
- Context API for app state

### Backend

- Python
- Flask
- Flask-SQLAlchemy
- Flask-Login
- Flask-WTF
- Flask-Migrate
- Flask-CORS
- Authlib (Google OAuth)

### Database & Storage

- SQLite for local development fallback
- PostgreSQL for production deployment
- SQLAlchemy ORM

### AI / Data Processing

- Google Gemini API for chat + receipt OCR
- Pandas / OpenPyXL for import workflows
- ReportLab / Matplotlib for reports

### Notifications / Hosting

- Web Push (`pywebpush`, `py-vapid`)
- Firebase Hosting
- Firebase Cloud Functions for Python
- Optional Render deployment config

## 5. System Architecture / Workflow

```text
React PWA (frontend/)
    |
    |  fetch with credentials
    v
Flask App Factory (backend/app/)
    |
    +-- Auth module
    |     - register/login/logout/check-auth
    |     - Google OAuth callback flow
    |
    +-- Expense API
    |     - CRUD
    |     - summary/statistics
    |     - bulk import preview/import
    |     - PDF report generation
    |     - profile/currency/budget/preferences
    |
    +-- AI module
    |     - SnapBot chat
    |     - spending insights
    |     - receipt OCR with Gemini Vision
    |
    +-- Notification module
    |     - push subscription management
    |     - unread history / mark-as-read
    |     - daily reminder + budget alert processing
    |
    v
SQLAlchemy Models
    |
    v
SQLite (local) / PostgreSQL (production)
```

### Typical user flow

1. User signs up with username/password or Google OAuth.
2. Frontend stores authenticated state via session cookies and loads dashboard data.
3. User adds expenses manually, imports a file, or scans a receipt with AI.
4. Backend validates input, stores transactions, and recomputes summaries.
5. Statistics and dashboard views fetch updated aggregates from `/api/summary`.
6. Optional push notifications remind users daily or warn when spending approaches the monthly budget.
7. SnapBot can answer spending questions or convert natural-language messages into saved entries.

## 6. Installation & Setup Instructions

### Prerequisites

- Node.js 18+ recommended
- npm
- Python 3.11+ recommended
- Git

### Clone the repository

```bash
git clone <your-repository-url>
cd ExpenseSnap
```

### Backend setup

```bash
cd backend
python -m venv venv
```

Activate the virtual environment:

```bash
# Windows
venv\Scripts\activate

# macOS / Linux
source venv/bin/activate
```

Install Python dependencies:

```bash
pip install -r requirements.txt
```

### Frontend setup

Open a new terminal:

```bash
cd frontend
npm install
```

## 7. Environment Variables Setup

Create `backend/.env` for local development.

### Required for core app

```env
SECRET_KEY=your-secret-key
FLASK_ENV=development
DATABASE_URL=sqlite:///expenses.db
```

### Required for Google OAuth

```env
GCLOUD_CLIENT_ID=your-google-client-id
GCLOUD_CLIENT_SECRET=your-google-client-secret
```

### Required for AI features

```env
GEMINI_API_KEY=your-gemini-api-key
```

### Required for push notifications

```env
VAPID_PUBLIC_KEY=your-vapid-public-key
VAPID_PRIVATE_KEY=your-vapid-private-key
VAPID_CONTACT_EMAIL=your-email@example.com
```

### Optional / deployment-oriented variables

```env
FRONTEND_URL=http://localhost:5000
ENABLE_NOTIFICATION_SCHEDULER=false
DAILY_REMINDER_HOUR=20
BUDGET_ALERT_THRESHOLD=0.8
FUNCTION_URL=https://your-cloud-function-url
PORT=5001
```

## 8. Running the Project Locally

### Start the backend

From `backend/`:

```bash
python run_local.py
```

Expected local backend:

```text
http://127.0.0.1:5001
```

### Start the frontend

From `frontend/`:

```bash
npm run dev
```

Expected local frontend:

```text
http://localhost:5000
```

### Local development behavior

- Vite proxies `/api`, `/login`, `/register`, `/logout`, and `/static` to the Flask backend on port `5001`
- Session cookies are sent with `credentials: include`
- If `VITE_API_URL` is not set, the frontend uses relative URLs for local development

## 9. Firebase / Backend Setup

This project is currently configured for **Firebase Hosting + Firebase Cloud Functions**.

### Firebase role in this project

- `frontend/dist` is served by Firebase Hosting
- Requests such as `/api/**`, `/login`, `/register`, `/logout`, `/check-auth`, and `/auth/**` are rewritten to the Python Cloud Function named `expensesnap`
- `backend/main.py` wraps the Flask app as a 2nd-gen HTTPS function
- A scheduled Firebase function (`keep_warm`) pings the Flask app every 5 minutes to reduce cold starts

### Firebase deployment configuration

Key config lives in:

- `firebase.json`
- `backend/main.py`

### Alternative backend deployment

The repo also contains `backend/render.yaml` and `DEPLOYMENT_GUIDE.md`, showing an alternate deployment path using:

- Render web service for Flask
- Render PostgreSQL database

If you want a single README for portfolio use, it is best to present Firebase as the primary deployment path and Render as an alternate deployment option.

## 10. Usage Guide

### Authentication

- Register with username/email/password
- Or sign in using Google OAuth

### Managing transactions

- Add expenses or income manually from the app
- Edit or delete existing entries
- Filter transactions from the dashboard

### Bulk importing

- Open the bulk import modal
- Upload `.csv`, `.xls`, or `.xlsx`
- Preview valid and invalid rows
- Import all valid rows or skip invalid ones

### Receipt scanning

- Upload or capture a receipt image
- Gemini Vision extracts structured expense entries
- Select detected line items and save them into the dashboard

### Analytics and budgeting

- Switch statistics periods between week, month, year, or all time
- Review category breakdown and savings rate
- Set a monthly budget to support budget alerts

### Reports and notifications

- Download PDF reports from the dashboard or statistics view
- Enable push notifications for reminders and budget alerts
- Review unread notification history from the app

### SnapBot

- Ask questions like `How much did I spend this week?`
- Add entries naturally like `spent 200 on uber`

## 11. Folder Structure

```text
ExpenseSnap/
├── backend/
│   ├── app/
│   │   ├── core/                    # App config, extensions, app factory helpers
│   │   ├── features/
│   │   │   ├── ai/                  # SnapBot chat + AI insights
│   │   │   ├── auth/                # Login, register, Google OAuth
│   │   │   ├── expenses/            # Expense CRUD, import, reports, OCR, APIs
│   │   │   ├── notifications/       # Push notification services and history
│   │   │   └── users/               # User model and preferences
│   │   ├── static/                  # PWA assets, icons, uploads
│   │   └── templates/               # Legacy Flask-rendered auth/templates
│   ├── migrations/                  # Alembic migrations
│   ├── main.py                      # Firebase Cloud Function entry point
│   ├── run_local.py                 # Local Flask dev server
│   ├── run_notifications.py         # Standalone notification worker
│   └── requirements.txt
├── frontend/
│   ├── public/                      # Manifest, service worker, icons, logo
│   ├── src/
│   │   ├── features/
│   │   │   ├── ai/                  # SnapBot UI
│   │   │   ├── auth/                # Login/register screens
│   │   │   ├── expenses/            # Dashboard, add/edit, import, receipt scanner
│   │   │   ├── profile/             # Profile management
│   │   │   ├── settings/            # Notification/privacy/help settings
│   │   │   └── statistics/          # Analytics UI
│   │   └── shared/                  # API client, hooks, context, shared components
│   ├── vite.config.ts               # Dev proxy to Flask backend
│   └── package.json
├── firebase.json                    # Firebase hosting + function rewrites
├── ARCHITECTURE.md
└── DEPLOYMENT_GUIDE.md
```

## 12. Screenshots / Demo Section

The repository currently includes branding assets (`frontend/public/logo.png`) but no dedicated app screenshots folder yet.

For GitHub/portfolio presentation, add screenshots under a folder such as:

```text
docs/screenshots/
```

Then update this section with images like:

```md
## Screenshots

![Dashboard](docs/screenshots/dashboard.png)
![Statistics](docs/screenshots/statistics.png)
![Receipt Scanner](docs/screenshots/receipt-scanner.png)
![SnapBot](docs/screenshots/snapbot.png)
```

If you already have a deployed build, also add:

- Live demo URL
- Demo video / GIF
- Mobile install screenshot for the PWA flow

## 13. API / Authentication Details

### Authentication approach

- Session-based auth using **Flask-Login**
- Frontend requests include cookies with `credentials: include`
- Supports:
  - Username/password login
  - Google OAuth login

### Main auth endpoints

- `POST /login`
- `POST /register`
- `POST /logout`
- `GET /check-auth`
- `GET /login/google`
- `GET /auth/callback`

### Main API groups

#### Expense + profile APIs

- `GET /api/expenses`
- `POST /api/expenses`
- `PUT /api/expenses/:id`
- `DELETE /api/expenses/:id`
- `GET /api/summary`
- `GET /api/user/profile`
- `POST /api/user/profile`
- `PUT /api/user/currency`
- `GET /api/user/budget`
- `PUT /api/update-budget`

#### Import / report APIs

- `GET /api/import-expenses/template`
- `POST /api/import-expenses/preview`
- `POST /api/import-expenses`
- `GET /api/generate-report`

#### Push notification APIs

- `GET /api/push/vapid-public-key`
- `POST /api/push/subscribe`
- `POST /api/push/unsubscribe`
- `POST /api/push/test`
- `GET /api/notifications/history`

#### AI APIs

- `POST /api/ai/chat`
- `GET /api/ai/insights`
- `POST /api/scan-receipt`

## 14. Future Enhancements

- Add dedicated charts/visualizations beyond the current statistics cards and category bars
- Split the frontend bundle to reduce the current large production chunk size
- Add automated backend/frontend tests and CI workflows
- Add recurring expenses and savings goals
- Add export to CSV/Excel in addition to PDF reports
- Add role-based admin/analytics tooling
- Add richer notification scheduling controls in the UI
- Add Docker support for one-command local startup
- Add a dedicated screenshots/demo assets folder for portfolio presentation

## 15. Contributors / Author Information

**Author**

- `imSai-py`  
- Email: `sai.lak.2004920@gmail.com`

If you want this README to be portfolio-ready, you can also extend this section with:

- LinkedIn profile
- GitHub profile
- Portfolio website

## 16. License

No license file is currently present in the repository.

If you want this project to be open-source friendly, add a `LICENSE` file and update this section, for example:

```md
This project is licensed under the MIT License.
```

---

## Quick Start

```bash
# Terminal 1
cd backend
venv\Scripts\activate
python run_local.py

# Terminal 2
cd frontend
npm install
npm run dev
```

## Verification Notes

- Verified backend app startup locally through `backend/run_local.py` imports and app creation
- Verified frontend production build with `npm.cmd run build`
- Observed a Vite warning about a large bundled chunk, which is a performance optimization opportunity rather than a build failure
