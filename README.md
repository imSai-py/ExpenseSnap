# 💰 ExpenseSnap — Modern Expense Tracker

ExpenseSnap is a premium expense tracking application designed to help you manage your finances with precision and style. Recently upgraded to a modern **React + TypeScript** frontend, it features a sleek UI, real-time data visualization, and a modular architecture.

## 🚀 Features

- **Expense Tracking**: Easily add, edit, and delete expenses.
- **Smart Dashboard**: View your current balance, total income, and expenses at a glance.
- **Data Visualization**: Interactive charts showing spending breakdown by category and time period (using Recharts).
- **Bulk Import**: Import expenses via CSV or Excel files.
- **Profile Management**: Manage user settings, currency preferences, and notifications.
- **Responsive Design**: Fully optimized for both desktop and mobile devices.
- **PWA Support**: Installable as a Progressive Web App (PWA).

## 🛠️ Tech Stack

### Frontend
- **Framework**: React 18 (Vite)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **State Management**: React Context API
- **Routing**: Internal screen-based routing
- **Icons**: Lucide React
- **Charts**: Recharts

### Backend
- **Framework**: Flask (Python)
- **Database**: SQLAlchemy (SQLite for Dev / PostgreSQL for Prod)
- **Authentication**: Custom session-based auth
- **API**: RESTful API structure with Blueprints

## 📂 Project Structure

The project is organized into two main directories:

- **`backend/`**: Contains the Flask application logic.
  - `app/`: Application factory and blueprints.
  - `website/`: Legacy static site templates (if applicable).
  - `migrations/`: Database migration scripts.

- **`frontend/`**: Contains the React application.
  - `src/features/`: Modular feature components (`auth`, `expenses`, `statistics`, `profile`).
  - `src/shared/`: Shared resources (components, hooks, services, types).

## 📦 Installation & Setup

### Prerequisites
- Node.js (v18+)
- Python (3.9+)

### 1. Backend Setup

Navigate to the backend directory and set up the Python environment:

```bash
cd backend
python -m venv venv

# Activate Virtual Environment
# Windows:
venv\Scripts\activate
# Mac/Linux:
# source venv/bin/activate

# Install Dependencies
pip install -r requirements.txt
```

Create a `.env` file in the `backend/` directory (see `.env.example`).

Run the backend server:
```bash
python main.py
```
The backend API will run at `http://127.0.0.1:5000`.

### 2. Frontend Setup

Open a new terminal, navigate to the frontend directory, and install dependencies:

```bash
cd frontend
npm install
```

Run the development server:
```bash
npm run dev
```
The application will launch at `http://localhost:5173`.

## 🧪 Deployment

- **Backend**: Configured for deployment on platforms like Render (includes `gunicorn` config).
- **Frontend**: Build production assets using `npm run build`.

## 📝 License
This project is open-source and available under the [MIT License](LICENSE).
