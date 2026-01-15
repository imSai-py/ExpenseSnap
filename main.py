"""
ExpenseSnap Application Entry Point.

This module serves as the single entry point for the application,
handling environment loading and app creation.
"""
from dotenv import load_dotenv

# Load environment variables FIRST, before any other imports
load_dotenv()

from website import create_app

app = create_app()

if __name__ == '__main__':
    app.run(debug=True)
