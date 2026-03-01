"""
Local development server for ExpenseSnap.

Run this instead of main.py when developing locally.
Usage: python run_local.py
"""
import os

# Load .env file manually
env_path = os.path.join(os.path.dirname(__file__), '.env')
if os.path.exists(env_path):
    with open(env_path) as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith('#') and '=' in line:
                key, _, value = line.partition('=')
                os.environ.setdefault(key.strip(), value.strip())

# Override to development mode
os.environ['FLASK_ENV'] = 'development'

from app import create_app

app = create_app('development')

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5001))
    print(f"\n🚀 ExpenseSnap backend running at http://127.0.0.1:{port}")
    print(f"🤖 SnapBot AI endpoint: http://127.0.0.1:{port}/api/ai/chat\n")
    app.run(
        host='127.0.0.1',
        port=port,
        debug=True
    )
