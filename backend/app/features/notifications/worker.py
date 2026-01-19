"""
Notification Worker/Scheduler for ExpenseSnap.

This module provides a background scheduler that runs notification
jobs at configured intervals for daily reminders and budget alerts.
"""
import logging
from typing import Optional

from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger
from flask import Flask

logger = logging.getLogger(__name__)

# Global scheduler instance
_scheduler: Optional[BackgroundScheduler] = None


def _run_daily_reminders(app: Flask):
    """
    Job function to process daily reminders.

    Runs within Flask app context to access database and config.
    """
    with app.app_context():
        from .service import NotificationService
        try:
            result = NotificationService.process_daily_reminders()
            logger.info(f'Daily reminders job completed: {result}')
        except Exception as e:
            logger.error(f'Daily reminders job failed: {e}')


def _run_budget_alerts(app: Flask):
    """
    Job function to process budget alerts.

    Runs within Flask app context to access database and config.
    """
    with app.app_context():
        from .service import NotificationService
        try:
            result = NotificationService.process_budget_alerts()
            logger.info(f'Budget alerts job completed: {result}')
        except Exception as e:
            logger.error(f'Budget alerts job failed: {e}')


def start_notification_scheduler(app: Flask) -> BackgroundScheduler:
    """
    Start the background scheduler for notification jobs.

    Configures and starts APScheduler with jobs for:
    - Daily reminders: Runs at configured hour (default 8 PM)
    - Budget alerts: Runs daily at 9 AM

    Args:
        app: Flask application instance

    Returns:
        The configured BackgroundScheduler instance
    """
    global _scheduler

    if _scheduler is not None and _scheduler.running:
        logger.warning('Scheduler already running')
        return _scheduler

    _scheduler = BackgroundScheduler(
        daemon=True,
        job_defaults={
            'coalesce': True,  # Combine missed executions
            'max_instances': 1,
            'misfire_grace_time': 3600  # 1 hour grace period
        }
    )

    # Get reminder hour from config (default 20 = 8 PM)
    reminder_hour = app.config.get('DAILY_REMINDER_HOUR', 20)

    # Daily Reminders - runs at configured hour every day
    _scheduler.add_job(
        func=lambda: _run_daily_reminders(app),
        trigger=CronTrigger(hour=reminder_hour, minute=0),
        id='daily_reminders',
        name='Process Daily Reminders',
        replace_existing=True
    )

    # Budget Alerts - runs at 9 AM every day
    _scheduler.add_job(
        func=lambda: _run_budget_alerts(app),
        trigger=CronTrigger(hour=9, minute=0),
        id='budget_alerts',
        name='Process Budget Alerts',
        replace_existing=True
    )

    _scheduler.start()
    logger.info(f'Notification scheduler started (daily reminders at {reminder_hour}:00)')

    return _scheduler


def stop_notification_scheduler():
    """Stop the background scheduler if running."""
    global _scheduler

    if _scheduler is not None and _scheduler.running:
        _scheduler.shutdown(wait=False)
        logger.info('Notification scheduler stopped')
        _scheduler = None


def get_scheduler() -> Optional[BackgroundScheduler]:
    """Get the current scheduler instance."""
    return _scheduler


def trigger_daily_reminders_now(app: Flask):
    """
    Manually trigger daily reminders immediately.

    Useful for testing or admin-triggered notifications.
    """
    _run_daily_reminders(app)


def trigger_budget_alerts_now(app: Flask):
    """
    Manually trigger budget alerts immediately.

    Useful for testing or admin-triggered notifications.
    """
    _run_budget_alerts(app)
