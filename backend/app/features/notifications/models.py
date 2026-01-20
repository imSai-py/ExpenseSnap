"""
Notification models for Web Push Notifications and Notification History.

This module stores browser push subscription data for sending
notifications to users even when they're not actively using the app,
as well as notification history for users to view past alerts.
"""
from datetime import datetime
from typing import Optional, Dict, Any

from app.core.extensions import db


class NotificationHistory(db.Model):
    """
    Stores notification history for users to view past alerts.

    This allows users to see budget alerts and other notifications
    they might have missed, even if they weren't online when the
    push notification was sent.

    Attributes:
        id: Primary key
        user_id: Foreign key to User
        notification_type: Type of notification (budget_alert, daily_reminder, etc.)
        title: Notification title
        message: Notification body/message
        data: Additional JSON data (percentage, url, etc.)
        is_read: Whether the notification has been read
        created_at: When the notification was created
        read_at: When the notification was read (if read)
    """
    __tablename__ = 'notification_history'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False, index=True)

    # Notification content
    notification_type = db.Column(db.String(50), nullable=False, index=True)  # 'budget_alert', 'daily_reminder', etc.
    title = db.Column(db.String(200), nullable=False)
    message = db.Column(db.Text, nullable=False)
    data = db.Column(db.JSON, nullable=True)  # Additional metadata like percentage, url, etc.

    # Read status
    is_read = db.Column(db.Boolean, nullable=False, default=False, index=True)

    # Timestamps
    created_at = db.Column(db.DateTime, default=datetime.utcnow, index=True)
    read_at = db.Column(db.DateTime, nullable=True)

    # Relationship to user
    user = db.relationship('User', backref=db.backref('notifications', lazy='dynamic', order_by='NotificationHistory.created_at.desc()'))

    # Indexes for common queries
    __table_args__ = (
        db.Index('idx_user_unread', 'user_id', 'is_read'),
        db.Index('idx_user_created', 'user_id', 'created_at'),
    )

    def __repr__(self) -> str:
        """Return string representation."""
        return f'<NotificationHistory {self.id} - {self.notification_type} for User {self.user_id}>'

    def to_dict(self) -> Dict[str, Any]:
        """Return dict representation for API responses."""
        return {
            'id': self.id,
            'type': self.notification_type,
            'title': self.title,
            'message': self.message,
            'data': self.data,
            'is_read': self.is_read,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'read_at': self.read_at.isoformat() if self.read_at else None
        }

    def mark_as_read(self) -> None:
        """Mark the notification as read."""
        if not self.is_read:
            self.is_read = True
            self.read_at = datetime.utcnow()

    @classmethod
    def create_notification(
        cls,
        user_id: int,
        notification_type: str,
        title: str,
        message: str,
        data: Optional[Dict[str, Any]] = None
    ) -> 'NotificationHistory':
        """
        Create and save a new notification record.

        Args:
            user_id: The user's ID
            notification_type: Type of notification (e.g., 'budget_alert')
            title: Notification title
            message: Notification body
            data: Optional additional data

        Returns:
            The created NotificationHistory instance
        """
        notification = cls(
            user_id=user_id,
            notification_type=notification_type,
            title=title,
            message=message,
            data=data
        )
        db.session.add(notification)
        db.session.commit()
        return notification

    @classmethod
    def get_unread_count(cls, user_id: int) -> int:
        """Get count of unread notifications for a user."""
        return cls.query.filter_by(user_id=user_id, is_read=False).count()

    @classmethod
    def get_user_notifications(
        cls,
        user_id: int,
        unread_only: bool = False,
        limit: int = 50
    ) -> list:
        """
        Get notifications for a user.

        Args:
            user_id: The user's ID
            unread_only: If True, only return unread notifications
            limit: Maximum number of notifications to return

        Returns:
            List of NotificationHistory instances
        """
        query = cls.query.filter_by(user_id=user_id)
        if unread_only:
            query = query.filter_by(is_read=False)
        return query.order_by(cls.created_at.desc()).limit(limit).all()


class PushSubscription(db.Model):
    """
    Stores Web Push API subscription data for a user's browser.

    Each user can have multiple subscriptions (one per browser/device).
    The subscription contains the endpoint URL and encryption keys
    needed to send push notifications.

    Attributes:
        id: Primary key
        user_id: Foreign key to User
        endpoint: Push service endpoint URL
        p256dh_key: Public key for message encryption
        auth_key: Authentication secret
        created_at: When the subscription was created
        last_used_at: When a notification was last sent
    """
    __tablename__ = 'push_subscription'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False, index=True)

    # Push subscription data from the browser
    endpoint = db.Column(db.Text, nullable=False, unique=True)
    p256dh_key = db.Column(db.String(255), nullable=False)
    auth_key = db.Column(db.String(255), nullable=False)

    # Metadata
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    last_used_at = db.Column(db.DateTime, nullable=True)

    # Browser/device info for user reference
    user_agent = db.Column(db.String(500), nullable=True)

    # Relationship to user
    user = db.relationship('User', backref=db.backref('push_subscriptions', lazy='dynamic'))

    def __repr__(self) -> str:
        """Return string representation."""
        return f'<PushSubscription {self.id} for User {self.user_id}>'

    def to_dict(self):
        """Return dict representation for API responses."""
        return {
            'id': self.id,
            'endpoint': self.endpoint[:50] + '...' if len(self.endpoint) > 50 else self.endpoint,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'last_used_at': self.last_used_at.isoformat() if self.last_used_at else None
        }

    def get_subscription_info(self):
        """Return subscription data in format required by pywebpush."""
        return {
            'endpoint': self.endpoint,
            'keys': {
                'p256dh': self.p256dh_key,
                'auth': self.auth_key
            }
        }
