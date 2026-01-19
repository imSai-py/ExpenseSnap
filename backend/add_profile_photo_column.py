"""
Migration script to add profile_photo column to user table.

Run this script once to update the database schema:
    python add_profile_photo_column.py
"""
import os
import sys

# Add the parent directory to the path so we can import the app
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from website import create_app
from website.extensions import db
from sqlalchemy import text

def add_profile_photo_column():
    """Add profile_photo column to user table if it doesn't exist."""
    app = create_app()

    with app.app_context():
        # Check if column already exists
        try:
            result = db.session.execute(text(
                "SELECT column_name FROM information_schema.columns "
                "WHERE table_name = 'user' AND column_name = 'profile_photo'"
            ))
            column_exists = result.fetchone() is not None
        except Exception:
            # For SQLite, use a different approach
            try:
                result = db.session.execute(text("PRAGMA table_info(user)"))
                columns = [row[1] for row in result.fetchall()]
                column_exists = 'profile_photo' in columns
            except Exception as e:
                print(f"Error checking column existence: {e}")
                column_exists = False

        if column_exists:
            print("Column 'profile_photo' already exists in user table.")
            return

        # Add the column
        try:
            db.session.execute(text(
                "ALTER TABLE user ADD COLUMN profile_photo VARCHAR(500)"
            ))
            db.session.commit()
            print("Successfully added 'profile_photo' column to user table.")
        except Exception as e:
            db.session.rollback()
            print(f"Error adding column: {e}")

            # Try alternative syntax for PostgreSQL
            try:
                db.session.execute(text(
                    'ALTER TABLE "user" ADD COLUMN profile_photo VARCHAR(500)'
                ))
                db.session.commit()
                print("Successfully added 'profile_photo' column to user table (PostgreSQL).")
            except Exception as e2:
                db.session.rollback()
                print(f"Error with PostgreSQL syntax: {e2}")


if __name__ == '__main__':
    add_profile_photo_column()
