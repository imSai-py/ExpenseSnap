# 🚀 Deployment Guide for ExpenseSnap (Render)

This guide walks you through deploying the upgraded **ExpenseSnap** application (React + Flask) to Render.

Since you are upgrading from a simple project to a full-stack application, we will deploy two separate services:
1.  **Backend Web Service** (Flask API)
2.  **Frontend Static Site** (React App)

---

## 🛑 Step 0: Pre-deployment Check

Before we begin, ensure you have pushed all recent changes to your GitHub branch (`ExpenseSnap-React-Upgrade`).

I have already updated your `backend/requirements.txt` to include `gunicorn`, which is required for the production server.

---

## 1️⃣ Deploy the Backend (Flask)

1.  Log in to your [Render Dashboard](https://dashboard.render.com/).
2.  Click **New +** and select **Web Service**.
3.  Connect your GitHub repository.
4.  Configure the service:
    *   **Name**: `expensesnap-backend` (or similar)
    *   **Region**: Closest to you (e.g., Singapore, Oregon)
    *   **Branch**: `ExpenseSnap-React-Upgrade`
    *   **Root Directory**: `backend` (Important!)
    *   **Runtime**: **Python 3**
    *   **Build Command**: `pip install -r requirements.txt`
    *   **Start Command**: `gunicorn main:app`
5.  **Environment Variables**:
    *   Scroll down to "Environment Variables" and add:
        *   `FLASK_ENV`: `production`
        *   `SECRET_KEY`: (Generate a random string)
        *   `DATABASE_URL`: (See Step 1.1 below)
        *   `PYTHON_VERSION`: `3.9.0` (Optional, ensures compatibility)

### 1.1 Setup Database (PostgreSQL)
Since SQLite files are deleted every time you deploy on Render, we should use a managed PostgreSQL database.

1.  On Render Dashboard, click **New +** > **PostgreSQL**.
2.  Name it `expensesnap-db`.
3.  Click **Create Database**.
4.  Once created, copy the **Internal Connection String**.
5.  Go back to your **Backend Web Service** > **Environment**.
6.  Add/Update the `DATABASE_URL` variable with this connection string.
    *   *Note: If your code uses `sqlite:///` by default, ensure it reads `os.getenv('DATABASE_URL')`.*

**Click "Create Web Service"**. Wait for it to deploy. Once live, copy its URL (e.g., `https://expensesnap-backend.onrender.com`).

---

## 2️⃣ Deploy the Frontend (React)

1.  On Render Dashboard, click **New +** > **Static Site**.
2.  Connect the same GitHub repository.
3.  Configure the service:
    *   **Name**: `expensesnap-frontend`
    *   **Branch**: `ExpenseSnap-React-Upgrade`
    *   **Root Directory**: `frontend` (Important!)
    *   **Build Command**: `npm install && npm run build`
    *   **Publish Directory**: `dist`
4.  **Click "Create Static Site"**.

---

## 3️⃣ Connect Frontend to Backend (Crucial!)

Your frontend tries to call `/api/...`. Since it's now on a different domain than the backend, we need to tell Render to redirect those calls.

1.  Go to your **Frontend Static Site** settings on Render.
2.  Find the **Redirects / Rewrites** tab.
3.  Add the following **Rewrite Rules** (Not Redirects!):

    | Source Path | Destination | Action |
    | :--- | :--- | :--- |
    | `/api/*` | `https://YOUR-BACKEND-URL.onrender.com/api/*` | Rewrite |
    | `/login` | `https://YOUR-BACKEND-URL.onrender.com/login` | Rewrite |
    | `/register` | `https://YOUR-BACKEND-URL.onrender.com/register` | Rewrite |
    | `/logout` | `https://YOUR-BACKEND-URL.onrender.com/logout` | Rewrite |
    | `/check-auth` | `https://YOUR-BACKEND-URL.onrender.com/check-auth` | Rewrite |

    *Replace `YOUR-BACKEND-URL` with the actual URL from Step 1.*

4.  **Save Changes**.

---

## 4️⃣ Fix "Page Not Found" on Refresh

Since this is a Single Page App (SPA), refreshing a page like `/profile` might cause a 404 error because that file doesn't exist on the server.

1.  In the **Redirects / Rewrites** tab of your Frontend.
2.  Add one final **Rewrite Rule**:
    *   **Source**: `/*`
    *   **Destination**: `/index.html`
    *   **Action**: Rewrite

**Make sure this rule is the LAST one in the list!**

---

## 5️⃣ Disable Old Deployments

To stop the errors from your old deployment:
1.  Find the old service in your Render Dashboard.
2.  Go to **Settings** > **Build & Deploy**.
3.  Set **Auto-Deploy** to **No**.
4.  Alternatively, scroll to the bottom and click **Delete Service** if you no longer need the old version.
