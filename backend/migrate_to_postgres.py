import os
import traceback
from website import create_app
from website.extensions import db
from website.models.user import User
from website.models.expense import Expense
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv

load_dotenv()

def migrate_data():
    # 1. Setup SQLite engine (Source)
    sqlite_uri = 'sqlite:///instance/expenses.db'
    sqlite_engine = create_engine(sqlite_uri)
    SQLiteSession = sessionmaker(bind=sqlite_engine)
    sqlite_session = SQLiteSession()

    # 2. Setup PostgreSQL engine (Destination) via Flask-SQLAlchemy
    app = create_app()
    
    postgres_uri = os.getenv('DATABASE_URL')
    if not postgres_uri:
        print("Error: DATABASE_URL not found in .env file.")
        return

    if postgres_uri.startswith("postgres://"):
        postgres_uri = postgres_uri.replace("postgres://", "postgresql://", 1)

    print(f"DEBUG: postgres_uri='{postgres_uri}'")
    print(f"Migrating from SQLite to {postgres_uri.split('@')[-1]}...")

    with app.app_context():
        # Clean slate: Drop all tables in PostgreSQL
        print("Dropping existing tables in PostgreSQL...")
        db.drop_all()

        # Create tables in PostgreSQL
        print("Creating tables in PostgreSQL...")
        db.create_all()

        try:
            # Migrate Users
            print("Migrating Users...")
            sqlite_users = sqlite_session.query(User).all()
            for user in sqlite_users:
                print(f"Migrating User ID: {user.id}, Username: {user.username}")
                new_user = User(
                    id=user.id,
                    username=user.username,
                    email=user.email,
                    password_hash=user.password_hash,
                    preferred_currency=user.preferred_currency
                )
                db.session.add(new_user)
            
            db.session.commit()
            print(f"Successfully migrated {len(sqlite_users)} users.")

            # Migrate Expenses
            print("Migrating Expenses...")
            sqlite_expenses = sqlite_session.query(Expense).all()
            for exp in sqlite_expenses:
                print(f"Migrating Expense ID: {exp.id}, User ID: {exp.user_id}")
                new_expense = Expense(
                    id=exp.id,
                    item_name=exp.item_name,
                    amount=exp.amount,
                    currency=exp.currency,
                    category=exp.category,
                    date_added=exp.date_added,
                    user_id=exp.user_id
                )
                db.session.add(new_expense)
            
            db.session.commit()
            print(f"Successfully migrated {len(sqlite_expenses)} expenses.")

            # Reset sequences for PostgreSQL
            print("Resetting sequences...")
            db.session.execute(text("SELECT setval(pg_get_serial_sequence('user', 'id'), coalesce(max(id), 1), max(id) IS NOT NULL) FROM \"user\";"))
            db.session.execute(text("SELECT setval(pg_get_serial_sequence('expense', 'id'), coalesce(max(id), 1), max(id) IS NOT NULL) FROM expense;"))
            db.session.commit()
            print("Sequences reset.")

        except Exception as e:
            db.session.rollback()
            print(f"An error occurred during migration: {e}")
            with open('error_log.txt', 'w', encoding='utf-8') as f:
                f.write(str(e))
                f.write('\n')
                traceback.print_exc(file=f)

    sqlite_session.close()
    print("Migration finished.")

if __name__ == "__main__":
    migrate_data()
