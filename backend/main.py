"""
ExpenseSnap Entry Point.

This script imports the application factory from the new modular structure
and runs the Flask server.
"""
import os
from app import create_app

app = create_app(os.getenv('FLASK_ENV', 'development'))

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
