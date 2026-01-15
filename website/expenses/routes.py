"""
Expense management routes.

Handles CRUD operations for expenses and user preferences
with proper form validation and error handling.
"""
from decimal import Decimal

from flask import Blueprint, render_template, redirect, url_for, flash, request, current_app
from flask_login import login_required, current_user

from ..extensions import db
from ..models.expense import Expense
from .forms import ExpenseForm, CurrencyPreferenceForm
from .services import ExpenseService

expenses = Blueprint('expenses', __name__)


@expenses.route('/')
@login_required
def index():
    """
    Display expense dashboard with summary and charts.

    Optimized to calculate totals in a single pass using ExpenseService.
    """
    # Get expenses (removed db.session.expire_all() for performance)
    user_expenses = ExpenseService.get_user_expenses(current_user.id)

    # Calculate summary in single pass
    summary = ExpenseService.calculate_summary(
        user_expenses,
        current_user.preferred_currency
    )

    # Create forms for the page
    expense_form = ExpenseForm()
    currency_form = CurrencyPreferenceForm()

    return render_template(
        'index.html',
        expenses=user_expenses,
        total=summary.total,
        chart_labels=summary.chart_labels,
        chart_values=summary.chart_values,
        username=current_user.username,
        user_currency=current_user.preferred_currency,
        currency_symbols=ExpenseService.get_currency_symbols(),
        expense_form=expense_form,
        currency_form=currency_form
    )


@expenses.route('/add', methods=['POST'])
@login_required
def add_expense():
    """Add a new expense with form validation."""
    form = ExpenseForm()

    if form.validate_on_submit():
        try:
            new_expense = Expense(
                item_name=form.item_name.data.strip(),
                amount=form.amount.data,
                currency=form.currency.data,
                category=form.category.data,
                user_id=current_user.id
            )

            db.session.add(new_expense)
            db.session.commit()

            current_app.logger.info(
                f"Expense added: {new_expense.item_name} by user {current_user.id}"
            )
            flash('Expense added successfully.', 'success')

        except Exception as e:
            current_app.logger.error(f"Error adding expense: {e}")
            db.session.rollback()
            flash('Failed to add expense. Please try again.', 'error')
    else:
        for field, errors in form.errors.items():
            for error in errors:
                flash(f'{field}: {error}', 'error')

    return redirect(url_for('expenses.index'))


@expenses.route('/delete/<int:id>', methods=['POST'])
@login_required
def delete_expense(id: int):
    """
    Delete an expense (POST method for security).

    Args:
        id: Expense ID to delete
    """
    expense = Expense.query.filter_by(
        id=id,
        user_id=current_user.id
    ).first_or_404()

    try:
        item_name = expense.item_name
        db.session.delete(expense)
        db.session.commit()

        current_app.logger.info(
            f"Expense deleted: {item_name} by user {current_user.id}"
        )
        flash('Expense deleted successfully.', 'success')

    except Exception as e:
        current_app.logger.error(f"Error deleting expense {id}: {e}")
        db.session.rollback()
        flash('Failed to delete expense.', 'error')

    return redirect(url_for('expenses.index'))


@expenses.route('/update/<int:id>', methods=['POST'])
@login_required
def update_expense(id: int):
    """
    Update an existing expense.

    Args:
        id: Expense ID to update
    """
    expense = Expense.query.filter_by(
        id=id,
        user_id=current_user.id
    ).first_or_404()

    form = ExpenseForm()

    if form.validate_on_submit():
        try:
            expense.item_name = form.item_name.data.strip()
            expense.amount = form.amount.data
            expense.currency = form.currency.data
            expense.category = form.category.data

            db.session.commit()

            current_app.logger.info(
                f"Expense updated: {expense.item_name} by user {current_user.id}"
            )
            flash('Expense updated successfully.', 'success')

        except Exception as e:
            current_app.logger.error(f"Error updating expense {id}: {e}")
            db.session.rollback()
            flash('Failed to update expense.', 'error')
    else:
        for field, errors in form.errors.items():
            for error in errors:
                flash(f'{field}: {error}', 'error')

    return redirect(url_for('expenses.index'))


@expenses.route('/set_currency', methods=['POST'])
@login_required
def set_currency():
    """Update user's preferred display currency."""
    form = CurrencyPreferenceForm()

    if form.validate_on_submit():
        new_currency = form.preferred_currency.data

        if ExpenseService.validate_currency(new_currency):
            try:
                current_user.preferred_currency = new_currency
                db.session.commit()

                current_app.logger.info(
                    f"Currency preference updated to {new_currency} for user {current_user.id}"
                )
                flash(f'Primary currency updated to {new_currency}', 'success')

            except Exception as e:
                current_app.logger.error(f"Error updating currency: {e}")
                db.session.rollback()
                flash('Failed to update currency preference.', 'error')
        else:
            flash('Invalid currency selected.', 'error')

    return redirect(url_for('expenses.index'))
