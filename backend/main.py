"""
ExpenseSnap — Firebase Cloud Functions Entry Point (2nd Gen, Python).

Wraps the existing Flask application as a serverless function
and includes a keep-warm scheduler to mitigate cold starts.

Uses lazy initialization to avoid Firebase's 10-second discovery timeout.
"""
import os
import logging

import requests as http_requests
from firebase_admin import initialize_app
from firebase_functions import https_fn, scheduler_fn, options

# ──────────────────────────────────────────────
# 1. Initialize Firebase Admin SDK (lightweight, safe at import time)
# ──────────────────────────────────────────────
initialize_app()

# ──────────────────────────────────────────────
# 2. Lazy Flask app initialization
#    Deferred to first request to avoid Firebase discovery timeout.
#    create_app() connects to DB, runs migrations, etc. which takes >10s.
# ──────────────────────────────────────────────
_flask_app = None


def _get_flask_app():
    """Lazily initialize and return the Flask app (once per instance)."""
    global _flask_app
    if _flask_app is None:
        from app import create_app
        _flask_app = create_app(os.environ.get("FLASK_ENV", "production"))

        @_flask_app.route("/ping")
        def ping():
            """Lightweight health-check endpoint for the keep-warm scheduler."""
            return "pong", 200

    return _flask_app


# ──────────────────────────────────────────────
# 3. Expose Flask as an HTTPS Cloud Function
# ──────────────────────────────────────────────
@https_fn.on_request(
    region="us-central1",
    memory=options.MemoryOption.MB_512,
    timeout_sec=120,
    min_instances=0,
    max_instances=10,
    secrets=[
        "DATABASE_URL",
        "SECRET_KEY",
        "GCLOUD_CLIENT_ID",
        "GCLOUD_CLIENT_SECRET",
        "VAPID_PRIVATE_KEY",
    ],
)
def expensesnap(req: https_fn.Request) -> https_fn.Response:
    """Main entry point — forwards every request to Flask."""
    app = _get_flask_app()
    with app.request_context(req.environ):
        rv = app.full_dispatch_request()
        return rv


# ──────────────────────────────────────────────
# 4. Keep-Warm Scheduler (runs every 5 minutes)
# ──────────────────────────────────────────────
@scheduler_fn.on_schedule(
    schedule="*/5 * * * *",
    region="us-central1",
    memory=options.MemoryOption.MB_256,
    timeout_sec=30,
)
def keep_warm(event: scheduler_fn.ScheduledEvent) -> None:
    """
    Pings the Flask function's /ping endpoint every 5 minutes
    to keep at least one instance warm and avoid cold starts.

    Set the FUNCTION_URL env var in Firebase/Google Cloud Console.
    """
    function_url = os.environ.get("FUNCTION_URL")

    if not function_url:
        logging.warning("FUNCTION_URL not set — skipping keep-warm ping")
        return

    ping_url = f"{function_url.rstrip('/')}/ping"

    try:
        response = http_requests.get(ping_url, timeout=10)
        logging.info(f"Keep-warm ping: {response.status_code}")
    except http_requests.exceptions.Timeout:
        logging.warning(f"Keep-warm ping timed out for {ping_url}")
    except http_requests.exceptions.RequestException as e:
        logging.error(f"Keep-warm ping failed: {e}")
