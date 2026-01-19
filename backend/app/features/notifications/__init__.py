"""
Push Notification Services for ExpenseSnap.

This module provides functionality for sending web push notifications
for daily reminders and budget alerts.
"""
from .service import NotificationService, check_budget_and_notify

# Worker/scheduler is optional - don't fail if APScheduler isn't installed
try:
    from .worker import start_notification_scheduler
except ImportError:
    start_notification_scheduler = None

__all__ = ['NotificationService', 'check_budget_and_notify', 'start_notification_scheduler']
