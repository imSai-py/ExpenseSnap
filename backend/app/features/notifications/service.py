"""
Notification Service for sending push notifications.

Handles the actual sending of push notifications using pywebpush,
including logic for daily reminders and budget alerts.
"""
import json
import logging
from datetime import datetime
from decimal import Decimal
from typing import List, Optional, Dict, Any

from flask import current_app
from pywebpush import webpush, WebPushException

from app.core.extensions import db
from app.features.users.models import User
from app.features.expenses.models import Expense
from app.features.notifications.models import PushSubscription

logger = logging.getLogger(__name__)


class NotificationService:
    """
    Service class for managing and sending push notifications.

    Provides methods for sending daily reminders, budget alerts,
    and test notifications to users.
    """

    @staticmethod
    def _get_vapid_config() -> Dict[str, str]:
        """Get VAPID configuration from app config."""
        return {
            'private_key': current_app.config.get('VAPID_PRIVATE_KEY'),
            'claims': {
                'sub': f"mailto:{current_app.config.get('VAPID_CONTACT_EMAIL', 'admin@expensesnap.com')}"
            }
        }

    @staticmethod
    def send_notification(
        subscription: PushSubscription,
        title: str,
        body: str,
        icon: str = '/static/icons/icon-192x192.png',
        badge: str = '/static/icons/icon-72x72.png',
        tag: Optional[str] = None,
        data: Optional[Dict[str, Any]] = None,
        actions: Optional[List[Dict[str, str]]] = None
    ) -> bool:
        """
        Send a push notification to a specific subscription.

        Args:
            subscription: PushSubscription object to send to
            title: Notification title
            body: Notification body text
            icon: URL to notification icon
            badge: URL to badge icon for mobile
            tag: Optional tag for grouping notifications
            data: Optional data payload
            actions: Optional list of action buttons

        Returns:
            True if sent successfully, False otherwise
        """
        vapid_config = NotificationService._get_vapid_config()

        if not vapid_config['private_key']:
            logger.error('VAPID private key not configured')
            return False

        notification_payload = {
            'title': title,
            'body': body,
            'icon': icon,
            'badge': badge,
            'timestamp': int(datetime.utcnow().timestamp() * 1000),
            'requireInteraction': True,
            'data': data or {}
        }

        if tag:
            notification_payload['tag'] = tag
            notification_payload['renotify'] = True

        if actions:
            notification_payload['actions'] = actions

        try:
            webpush(
                subscription_info=subscription.get_subscription_info(),
                data=json.dumps(notification_payload),
                vapid_private_key=vapid_config['private_key'],
                vapid_claims=vapid_config['claims']
            )

            # Update last_used_at timestamp
            subscription.last_used_at = datetime.utcnow()
            db.session.commit()

            logger.info(f'Notification sent to subscription {subscription.id}')
            return True

        except WebPushException as e:
            logger.error(f'WebPush error for subscription {subscription.id}: {e}')

            # Handle expired subscriptions (410 Gone)
            if e.response and e.response.status_code == 410:
                logger.info(f'Removing expired subscription {subscription.id}')
                db.session.delete(subscription)
                db.session.commit()

            return False
        except Exception as e:
            logger.error(f'Unexpected error sending notification: {e}')
            return False

    @classmethod
    def send_to_user(
        cls,
        user: User,
        title: str,
        body: str,
        **kwargs
    ) -> int:
        """
        Send a notification to all of a user's subscribed devices.

        Args:
            user: User to send notification to
            title: Notification title
            body: Notification body
            **kwargs: Additional arguments passed to send_notification

        Returns:
            Number of successfully sent notifications
        """
        subscriptions = PushSubscription.query.filter_by(user_id=user.id).all()
        sent_count = 0

        for subscription in subscriptions:
            if cls.send_notification(subscription, title, body, **kwargs):
                sent_count += 1

        return sent_count

    @classmethod
    def check_and_send_daily_reminder(cls, user: User) -> bool:
        """
        Check if user needs a daily reminder and send it.

        Sends a reminder if:
        - User has daily_reminders enabled
        - User hasn't logged any expense today
        - User has at least one push subscription

        Args:
            user: User to check and potentially notify

        Returns:
            True if notification was sent, False otherwise
        """
        if not user.notify_daily_reminders:
            return False

        # Check if user has logged any expense today
        today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)

        today_expense = Expense.query.filter(
            Expense.user_id == user.id,
            Expense.date_added >= today_start
        ).first()

        if today_expense:
            # User has logged an expense today, no reminder needed
            return False

        # Check if user has any push subscriptions
        subscription_count = PushSubscription.query.filter_by(user_id=user.id).count()
        if subscription_count == 0:
            return False

        # Send the reminder
        sent_count = cls.send_to_user(
            user,
            title="Don't forget to log your expenses! 📝",
            body="Track your spending today to stay on top of your budget.",
            tag='daily-reminder',
            data={
                'type': 'daily_reminder',
                'url': '/add-expense'
            },
            actions=[
                {'action': 'add', 'title': 'Add Expense'},
                {'action': 'dismiss', 'title': 'Dismiss'}
            ]
        )

        logger.info(f'Daily reminder sent to user {user.id} ({sent_count} devices)')
        return sent_count > 0

    @classmethod
    def check_and_send_budget_alert(cls, user: User) -> bool:
        """
        Check if user's expenses exceed threshold and send alert.

        Sends an alert if:
        - User has budget_alerts enabled
        - User's total expenses exceed threshold % of income this month
        - User has at least one push subscription

        Args:
            user: User to check and potentially alert

        Returns:
            True if alert was sent, False otherwise
        """
        if not user.notify_budget_alerts:
            return False

        # Check if user has any push subscriptions
        subscription_count = PushSubscription.query.filter_by(user_id=user.id).count()
        if subscription_count == 0:
            return False

        # Get current month's start
        today = datetime.utcnow()
        month_start = today.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

        # Calculate total income and expenses for this month
        month_expenses = Expense.query.filter(
            Expense.user_id == user.id,
            Expense.date_added >= month_start
        ).all()

        total_income = sum(
            exp.amount for exp in month_expenses
            if exp.type == 'income'
        ) or Decimal('0')

        total_expense = sum(
            exp.amount for exp in month_expenses
            if exp.type == 'expense'
        ) or Decimal('0')

        # Skip if no income recorded
        if total_income <= 0:
            return False

        # Get threshold from config (default 80%)
        threshold = current_app.config.get('BUDGET_ALERT_THRESHOLD', 0.8)
        expense_ratio = float(total_expense) / float(total_income)

        if expense_ratio < threshold:
            return False

        # Calculate percentage
        percentage = int(expense_ratio * 100)

        # Determine alert severity
        if expense_ratio >= 1.0:
            title = "⚠️ Budget Exceeded!"
            body = f"You've spent {percentage}% of your income this month. Consider reviewing your expenses."
        else:
            title = "📊 Budget Alert"
            body = f"You've spent {percentage}% of your income this month. Approaching your limit!"

        sent_count = cls.send_to_user(
            user,
            title=title,
            body=body,
            tag='budget-alert',
            data={
                'type': 'budget_alert',
                'url': '/statistics',
                'percentage': percentage
            },
            actions=[
                {'action': 'view', 'title': 'View Stats'},
                {'action': 'dismiss', 'title': 'Dismiss'}
            ]
        )

        logger.info(f'Budget alert sent to user {user.id} ({percentage}% spent, {sent_count} devices)')
        return sent_count > 0

    @classmethod
    def process_daily_reminders(cls) -> Dict[str, int]:
        """
        Process daily reminders for all eligible users.

        Should be called by the scheduler at the configured reminder time.

        Returns:
            Dictionary with statistics about sent notifications
        """
        logger.info('Processing daily reminders...')

        # Get all users with daily reminders enabled
        users = User.query.filter_by(notify_daily_reminders=True).all()

        sent = 0
        skipped = 0
        errors = 0

        for user in users:
            try:
                if cls.check_and_send_daily_reminder(user):
                    sent += 1
                else:
                    skipped += 1
            except Exception as e:
                logger.error(f'Error processing daily reminder for user {user.id}: {e}')
                errors += 1

        result = {'sent': sent, 'skipped': skipped, 'errors': errors}
        logger.info(f'Daily reminders processed: {result}')
        return result

    @classmethod
    def process_budget_alerts(cls) -> Dict[str, int]:
        """
        Process budget alerts for all eligible users.

        Should be called by the scheduler periodically (e.g., daily).

        Returns:
            Dictionary with statistics about sent alerts
        """
        logger.info('Processing budget alerts...')

        # Get all users with budget alerts enabled
        users = User.query.filter_by(notify_budget_alerts=True).all()

        sent = 0
        skipped = 0
        errors = 0

        for user in users:
            try:
                if cls.check_and_send_budget_alert(user):
                    sent += 1
                else:
                    skipped += 1
            except Exception as e:
                logger.error(f'Error processing budget alert for user {user.id}: {e}')
                errors += 1

        result = {'sent': sent, 'skipped': skipped, 'errors': errors}
        logger.info(f'Budget alerts processed: {result}')
        return result


def check_budget_and_notify(user_id: int) -> dict:
    """
    Check if a user's budget threshold is exceeded and send a notification.

    This is a helper function designed to be called after adding an expense.
    It includes spam prevention to avoid sending the same alert multiple times
    in the same month.

    Args:
        user_id: The ID of the user to check

    Returns:
        Dictionary with check results:
        {
            'checked': True,
            'threshold_exceeded': bool,
            'notification_sent': bool,
            'reason': str (why notification was/wasn't sent),
            'percentage': int (spending percentage, if calculated)
        }
    """
    from flask import current_app
    from datetime import datetime
    
    result = {
        'checked': True,
        'threshold_exceeded': False,
        'notification_sent': False,
        'reason': '',
        'percentage': None
    }

    try:
        # Get the user
        user = User.query.get(user_id)
        if not user:
            result['reason'] = 'User not found'
            return result

        # Check if user has budget alerts enabled
        if not user.notify_budget_alerts:
            result['reason'] = 'Budget alerts disabled by user'
            return result

        # Get current month string for spam prevention
        current_month = datetime.utcnow().strftime('%Y-%m')

        # Check if we already sent an alert this month
        if user.budget_alert_sent_month == current_month:
            result['reason'] = f'Alert already sent this month ({current_month})'
            logger.debug(f'Budget alert skipped for user {user_id}: already sent this month')
            return result

        # Check if user has any push subscriptions
        subscription_count = PushSubscription.query.filter_by(user_id=user_id).count()
        if subscription_count == 0:
            result['reason'] = 'No push subscriptions'
            return result

        # Calculate this month's income and expenses
        today = datetime.utcnow()
        month_start = today.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

        month_expenses = Expense.query.filter(
            Expense.user_id == user_id,
            Expense.date_added >= month_start
        ).all()

        total_income = sum(
            exp.amount for exp in month_expenses
            if exp.type == 'income'
        ) or Decimal('0')

        total_expense = sum(
            exp.amount for exp in month_expenses
            if exp.type == 'expense'
        ) or Decimal('0')

        # Can't calculate ratio without income
        if total_income <= 0:
            result['reason'] = 'No income recorded this month'
            return result

        # Calculate spending ratio
        threshold = current_app.config.get('BUDGET_ALERT_THRESHOLD', 0.8)
        expense_ratio = float(total_expense) / float(total_income)
        percentage = int(expense_ratio * 100)
        result['percentage'] = percentage

        # Check if threshold is exceeded
        if expense_ratio < threshold:
            result['reason'] = f'Below threshold ({percentage}% < {int(threshold * 100)}%)'
            return result

        # Threshold exceeded!
        result['threshold_exceeded'] = True
        logger.info(f'Budget threshold exceeded for user {user_id}: {percentage}% (threshold: {int(threshold * 100)}%)')

        # Prepare and send notification
        if expense_ratio >= 1.0:
            title = "⚠️ Budget Exceeded!"
            body = f"You've spent {percentage}% of your income this month. Consider reviewing your expenses."
        else:
            title = "📊 Budget Alert"
            body = f"You've spent {percentage}% of your income this month. Approaching your limit!"

        sent_count = NotificationService.send_to_user(
            user,
            title=title,
            body=body,
            tag='budget-alert',
            data={
                'type': 'budget_alert',
                'url': '/statistics',
                'percentage': percentage
            },
            actions=[
                {'action': 'view', 'title': 'View Stats'},
                {'action': 'dismiss', 'title': 'Dismiss'}
            ]
        )

        if sent_count > 0:
            # Mark that we sent the alert this month (spam prevention)
            user.budget_alert_sent_month = current_month
            db.session.commit()

            result['notification_sent'] = True
            result['reason'] = f'Alert sent to {sent_count} device(s)'
            logger.info(f'Budget alert sent to user {user_id}: {percentage}% spent, {sent_count} devices')
        else:
            result['reason'] = 'Failed to send notification'
            logger.warning(f'Budget alert failed to send for user {user_id}')

        return result

    except Exception as e:
        logger.error(f'Error in check_budget_and_notify for user {user_id}: {e}')
        result['reason'] = f'Error: {str(e)}'
        return result
