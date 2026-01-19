"""
Push Subscription model for Web Push Notifications.

This module stores browser push subscription data for sending
notifications to users even when they're not actively using the app.
"""
from datetime import datetime

from ..extensions import db


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
