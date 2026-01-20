"""
Manual migration script to add missing columns to PostgreSQL database.

Run this script once on the production server to sync the database schema.
Usage: python -c "from add_missing_columns import run_migration; run_migration()"
"""
import os
import sys

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


def run_migration():
    """Add missing columns to the database."""
    from app import create_app
    from app.core.extensions import db
    from sqlalchemy import text

    app = create_app(os.getenv('FLASK_ENV', 'production'))

    with app.app_context():
        # List of ALTER TABLE statements to add missing columns
        migrations = [
            # User table - profile_photo column
            """
            DO $$
            BEGIN
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                               WHERE table_name='user' AND column_name='profile_photo') THEN
                    ALTER TABLE "user" ADD COLUMN profile_photo VARCHAR(500);
                END IF;
            END $$;
            """,

            # NotificationHistory table - create if not exists
            """
            CREATE TABLE IF NOT EXISTS notification_history (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL REFERENCES "user"(id),
                notification_type VARCHAR(50) NOT NULL,
                title VARCHAR(200) NOT NULL,
                message TEXT NOT NULL,
                data JSON,
                is_read BOOLEAN NOT NULL DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                read_at TIMESTAMP
            );
            """,

            # Create indexes for notification_history
            """
            CREATE INDEX IF NOT EXISTS idx_notification_history_user_id
            ON notification_history(user_id);
            """,
            """
            CREATE INDEX IF NOT EXISTS idx_notification_history_user_unread
            ON notification_history(user_id, is_read);
            """,
            """
            CREATE INDEX IF NOT EXISTS idx_notification_history_created
            ON notification_history(created_at);
            """,
        ]

        for i, migration in enumerate(migrations, 1):
            try:
                db.session.execute(text(migration))
                db.session.commit()
                print(f"Migration {i} completed successfully")
            except Exception as e:
                db.session.rollback()
                print(f"Migration {i} failed: {e}")

        print("All migrations completed!")


if __name__ == "__main__":
    run_migration()
