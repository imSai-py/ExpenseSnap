"""
AI chatbot API routes.

Provides endpoints for SnapBot chat interactions
and spending insights.
"""
from decimal import Decimal

from flask import Blueprint, jsonify, request, current_app
from flask_login import login_required, current_user

from app.core.extensions import db
from app.features.expenses.models import Expense
from app.features.expenses.utils import CURRENCY_SYMBOLS
from .services import ai_service, build_expense_context

ai_bp = Blueprint('ai', __name__)


@ai_bp.route('/chat', methods=['POST'])
@login_required
def chat():
    """
    Main chat endpoint for SnapBot.

    Request JSON:
        { "message": "spent 200 on uber" }

    Response JSON:
        {
            "success": true,
            "reply": "✅ Got it! Added: Uber Ride — ₹200 (Transport)",
            "expense_added": { ... } | null
        }
    """
    data = request.get_json()

    if not data or not data.get('message', '').strip():
        return jsonify({
            'success': False,
            'error': 'Message is required'
        }), 400

    message = data['message'].strip()
    expense_added = None

    try:
        # Step 1: Try to parse as an expense entry
        parsed = ai_service.parse_expense(message)

        if parsed:
            # Create the expense in the database
            new_expense = Expense(
                item_name=parsed['item_name'],
                amount=Decimal(str(parsed['amount'])),
                currency=parsed['currency'],
                category=parsed['category'],
                type=parsed.get('type', 'expense'),
                user_id=current_user.id
            )

            db.session.add(new_expense)
            db.session.commit()

            expense_added = new_expense.to_dict()
            symbol = CURRENCY_SYMBOLS.get(parsed['currency'], '$')

            entry_type = 'income' if parsed.get('type') == 'income' else 'expense'
            if entry_type == 'income':
                reply = (
                    f"✅ Got it! I've recorded your income:\n"
                    f"💰 **{parsed['item_name']}** — {symbol}{parsed['amount']:,.2f} "
                    f"({parsed['category']})"
                )
            else:
                reply = (
                    f"✅ Got it! I've added your expense:\n"
                    f"📝 **{parsed['item_name']}** — {symbol}{parsed['amount']:,.2f} "
                    f"({parsed['category']})"
                )

            current_app.logger.info(
                f"SnapBot added {entry_type}: {parsed['item_name']} "
                f"for user {current_user.id}"
            )

        else:
            # Step 2: Not an expense — treat as a general question
            context = build_expense_context(current_user.id)
            reply = ai_service.chat(message, context)

        return jsonify({
            'success': True,
            'reply': reply,
            'expense_added': expense_added
        })

    except Exception as e:
        current_app.logger.error(f"SnapBot chat error: {e}")
        db.session.rollback()
        return jsonify({
            'success': False,
            'error': 'Something went wrong. Please try again.'
        }), 500


@ai_bp.route('/insights', methods=['GET'])
@login_required
def insights():
    """
    Get AI-generated spending insights.

    Response JSON:
        {
            "success": true,
            "insights": "📊 Your biggest spending category is Food at ₹4,200..."
        }
    """
    try:
        context = build_expense_context(current_user.id)
        insights_text = ai_service.get_insights(context)

        return jsonify({
            'success': True,
            'insights': insights_text
        })

    except Exception as e:
        current_app.logger.error(f"SnapBot insights error: {e}")
        return jsonify({
            'success': False,
            'error': 'Failed to generate insights.'
        }), 500
