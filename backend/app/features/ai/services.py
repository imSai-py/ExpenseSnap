"""
AI service layer for SnapBot.

Handles Gemini API integration, expense parsing,
and insight generation.
"""
import os
import json
import logging
from typing import Optional, Dict, Any, List
from decimal import Decimal

from .prompts import SYSTEM_PROMPT, EXPENSE_PARSE_PROMPT, INSIGHT_PROMPT

logger = logging.getLogger(__name__)


class AIService:
    """Service class for AI-powered features using Google Gemini."""

    def __init__(self):
        """Initialize the Gemini client."""
        self._model = None
        self._parse_model = None

    def _get_model(self):
        """Lazy-initialize the Gemini generative model."""
        if self._model is None:
            import google.generativeai as genai

            api_key = os.environ.get('GEMINI_API_KEY')
            if not api_key:
                raise ValueError(
                    "GEMINI_API_KEY not configured. "
                    "Get a free key at https://aistudio.google.com/apikey "
                    "and add it to your .env file."
                )

            genai.configure(api_key=api_key)
            self._model = genai.GenerativeModel(
                'gemini-2.5-flash',
                system_instruction=SYSTEM_PROMPT
            )
            self._parse_model = genai.GenerativeModel(
                'gemini-2.5-flash',
                system_instruction=EXPENSE_PARSE_PROMPT
            )

        return self._model, self._parse_model

    def chat(self, message: str, expense_context: str) -> str:
        """
        Send a chat message to the AI with expense context.

        Args:
            message: User's message
            expense_context: Formatted string of user's expense data

        Returns:
            AI's response text
        """
        try:
            model, _ = self._get_model()

            prompt = f"""User's financial data:
{expense_context}

User's message: {message}"""

            response = model.generate_content(prompt)
            return response.text.strip()

        except ValueError as e:
            # API key not configured
            return str(e)
        except Exception as e:
            logger.error(f"AI chat error: {e}")
            return "Sorry, I'm having trouble right now. Please try again in a moment. 😅"

    def parse_expense(self, message: str) -> Optional[Dict[str, Any]]:
        """
        Try to parse an expense from a natural language message.

        Args:
            message: User's message (e.g., "spent 200 on uber")

        Returns:
            Dict with expense data if parsed, None if not an expense
        """
        try:
            _, parse_model = self._get_model()

            response = parse_model.generate_content(message)
            text = response.text.strip()

            # Clean up markdown code fences if present
            if text.startswith('```'):
                text = text.split('\n', 1)[1] if '\n' in text else text[3:]
            if text.endswith('```'):
                text = text[:-3]
            text = text.strip()

            parsed = json.loads(text)

            if not parsed.get('is_expense', False):
                return None

            # Validate required fields
            required = ['item_name', 'amount', 'currency', 'category', 'type']
            if not all(parsed.get(k) for k in required):
                return None

            # Validate amount is positive
            amount = float(parsed['amount'])
            if amount <= 0:
                return None

            return {
                'item_name': str(parsed['item_name']).strip()[:100],
                'amount': amount,
                'currency': parsed['currency'],
                'category': parsed['category'],
                'type': parsed.get('type', 'expense'),
            }

        except (json.JSONDecodeError, ValueError) as e:
            logger.debug(f"Expense parse failed (not an expense): {e}")
            return None
        except Exception as e:
            logger.error(f"Expense parse error: {e}")
            return None

    def get_insights(self, expense_context: str) -> str:
        """
        Generate spending insights based on user's expense data.

        Args:
            expense_context: Formatted string of user's expense data

        Returns:
            AI-generated insights text
        """
        try:
            model, _ = self._get_model()
            prompt = INSIGHT_PROMPT.format(context=expense_context)
            response = model.generate_content(prompt)
            return response.text.strip()

        except ValueError as e:
            return str(e)
        except Exception as e:
            logger.error(f"AI insights error: {e}")
            return "Sorry, I couldn't generate insights right now. Please try again. 😅"


def build_expense_context(user_id: int) -> str:
    """
    Build a text summary of the user's expense data for AI context.

    Args:
        user_id: The user's database ID

    Returns:
        Formatted string with expense summary and recent transactions
    """
    from app.features.expenses.services import ExpenseService
    from app.features.users.models import User
    from app.features.expenses.utils import CURRENCY_SYMBOLS

    user = User.query.get(user_id)
    if not user:
        return "No user data available."

    currency = user.preferred_currency or 'INR'
    symbol = CURRENCY_SYMBOLS.get(currency, '$')

    # Get all expenses
    all_expenses = ExpenseService.get_user_expenses(user_id)
    summary = ExpenseService.calculate_summary(all_expenses, currency)

    # Get this month's expenses
    monthly_expenses = ExpenseService.get_user_expenses(user_id, 'this_month')
    monthly_summary = ExpenseService.calculate_summary(monthly_expenses, currency)

    # Build context string
    lines = [
        f"Currency: {currency} ({symbol})",
        f"",
        f"--- All Time ---",
        f"Total Income: {symbol}{float(summary.total_income):,.2f}",
        f"Total Expenses: {symbol}{float(summary.total_expense):,.2f}",
        f"Net Balance: {symbol}{float(summary.total_balance):,.2f}",
        f"Total Transactions: {len(all_expenses)}",
        f"",
        f"--- This Month ---",
        f"Monthly Income: {symbol}{float(monthly_summary.total_income):,.2f}",
        f"Monthly Expenses: {symbol}{float(monthly_summary.total_expense):,.2f}",
        f"Monthly Balance: {symbol}{float(monthly_summary.total_balance):,.2f}",
        f"Monthly Transactions: {len(monthly_expenses)}",
    ]

    # Category breakdown (this month)
    if monthly_summary.category_totals:
        lines.append("")
        lines.append("--- Monthly Category Breakdown ---")
        sorted_cats = sorted(
            monthly_summary.category_totals.items(),
            key=lambda x: float(x[1]),
            reverse=True
        )
        for cat, amt in sorted_cats:
            pct = (float(amt) / float(monthly_summary.total_expense) * 100
                   if monthly_summary.total_expense > 0 else 0)
            lines.append(f"  {cat}: {symbol}{float(amt):,.2f} ({pct:.1f}%)")

    # Recent transactions (last 10)
    recent = all_expenses[:10]
    if recent:
        lines.append("")
        lines.append("--- Recent Transactions (last 10) ---")
        for exp in recent:
            exp_type = getattr(exp, 'type', 'expense')
            prefix = "+" if exp_type == 'income' else "-"
            date_str = exp.date_added.strftime('%Y-%m-%d') if exp.date_added else 'N/A'
            lines.append(
                f"  {date_str} | {prefix}{symbol}{float(exp.amount):,.2f} | "
                f"{exp.item_name} [{exp.category}]"
            )

    return "\n".join(lines)


# Singleton instance
ai_service = AIService()
