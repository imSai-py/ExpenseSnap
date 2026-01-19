"""
Migration script to add 'type' column to the expense table.
Run this script once to add the missing column.
"""
import os
import psycopg2
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.environ.get('DATABASE_URL', 'postgresql://postgres:12345678@localhost:5432/expensesnap_db')

def add_type_column():
    """Add 'type' column to expense table if it doesn't exist."""
    conn = None
    try:
        conn = psycopg2.connect(DATABASE_URL)
        cur = conn.cursor()

        # Check if column exists
        cur.execute("""
            SELECT column_name
            FROM information_schema.columns
            WHERE table_name = 'expense' AND column_name = 'type'
        """)

        if cur.fetchone() is None:
            print("Adding 'type' column to expense table...")
            # Add the type column with default value 'expense'
            cur.execute("""
                ALTER TABLE expense
                ADD COLUMN type VARCHAR(10) NOT NULL DEFAULT 'expense'
            """)

            # Create index for the new column
            cur.execute("""
                CREATE INDEX IF NOT EXISTS idx_user_type ON expense (user_id, type)
            """)

            conn.commit()
            print("Successfully added 'type' column and index!")
        else:
            print("'type' column already exists.")

        cur.close()
    except Exception as e:
        print(f"Error: {e}")
        if conn:
            conn.rollback()
    finally:
        if conn:
            conn.close()

if __name__ == '__main__':
    add_type_column()
