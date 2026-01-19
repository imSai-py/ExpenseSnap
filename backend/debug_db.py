import sqlite3
import os

print(f"CWD: {os.getcwd()}")
db_path = os.path.join('instance', 'expenses.db')

conn = sqlite3.connect(db_path)
c = conn.cursor()

print("--- USERS (id, username) ---")
c.execute("SELECT id, username FROM user")
for r in c.fetchall():
    print(r)

print("\n--- EXPENSES (id, item_name, user_id) ---")
c.execute("SELECT id, item_name, user_id FROM expense")
for r in c.fetchall():
    print(r)
conn.close()
