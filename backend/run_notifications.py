#!/usr/bin/env python3
"""
Standalone Notification Worker Script.

This script can be run independently (e.g., via cron) to process
notifications without running the full Flask app.

Usage:
    python run_notifications.py daily      # Process daily reminders
    python run_notifications.py budget     # Process budget alerts
    python run_notifications.py all        # Process both
    python run_notifications.py generate-vapid  # Generate new VAPID keys

Environment Variables Required:
    DATABASE_URL: PostgreSQL connection string
    VAPID_PUBLIC_KEY: VAPID public key for push notifications
    VAPID_PRIVATE_KEY: VAPID private key for push notifications
    VAPID_CONTACT_EMAIL: Contact email for VAPID (optional)
"""
import os
import sys
import logging

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


def generate_vapid_keys():
    """Generate new VAPID keys for push notifications."""
    try:
        from py_vapid import Vapid

        vapid = Vapid()
        vapid.generate_keys()

        print("\n" + "=" * 60)
        print("VAPID Keys Generated Successfully!")
        print("=" * 60)
        print("\nAdd these to your .env file:\n")
        print(f"VAPID_PRIVATE_KEY={vapid.private_key}")
        print(f"VAPID_PUBLIC_KEY={vapid.public_key}")
        print(f"VAPID_CONTACT_EMAIL=your-email@example.com")
        print("\n" + "=" * 60)
        print("\nIMPORTANT: Keep the private key secret!")
        print("The public key is used by the frontend to subscribe to push.")
        print("=" * 60 + "\n")

    except ImportError:
        print("Error: py_vapid not installed.")
        print("Install it with: pip install py-vapid")
        sys.exit(1)


def run_notifications(notification_type: str):
    """Run notification processing."""
    # Add parent directory to path for imports
    sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

    from website import create_app
    from website.notifications.service import NotificationService

    # Create app with appropriate config
    config_name = os.environ.get('FLASK_ENV', 'production')
    app = create_app(config_name)

    with app.app_context():
        if notification_type in ('daily', 'all'):
            logger.info('Processing daily reminders...')
            result = NotificationService.process_daily_reminders()
            logger.info(f'Daily reminders result: {result}')

        if notification_type in ('budget', 'all'):
            logger.info('Processing budget alerts...')
            result = NotificationService.process_budget_alerts()
            logger.info(f'Budget alerts result: {result}')


def main():
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(1)

    command = sys.argv[1].lower()

    if command == 'generate-vapid':
        generate_vapid_keys()
    elif command in ('daily', 'budget', 'all'):
        run_notifications(command)
    else:
        print(f"Unknown command: {command}")
        print(__doc__)
        sys.exit(1)


if __name__ == '__main__':
    main()
