import sqlite3
import os

db_path = os.path.join('instance', 'expenses.db')

if not os.path.exists(db_path):
    print(f"Database not found at {db_path}")
else:
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    try:
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
        tables = cursor.fetchall()
        print(f"Tables in database: {[t[0] for t in tables]}")
        
        for table in tables:
            table_name = table[0]
            print(f"\n--- Content of table: {table_name} ---")
            cursor.execute(f"SELECT * FROM {table_name}")
            rows = cursor.fetchall()
            
            # Get column names
            column_names = [description[0] for description in cursor.description]
            print(f"{' | '.join(column_names)}")
            print("-" * 50)
            
            for row in rows:
                print(f"{' | '.join(map(str, row))}")
                
    except Exception as e:
        print(f"Error: {e}")
    finally:
        conn.close()
