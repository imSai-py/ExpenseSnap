from flask import Blueprint, render_template, redirect, url_for, request, flash
from flask_login import login_required, current_user
from ..extensions import db
from ..models.expense import Expense
from .utils import convert_currency, EXCHANGE_RATES

expenses = Blueprint('expenses', __name__)

@expenses.route('/')
@login_required
def index():
    # READ: Get expenses for the logged-in user
    user_expenses = Expense.query.filter_by(user_id=current_user.id).order_by(Expense.date_added.desc()).all()
    
    # Accurate total: Convert all expenses to preferred currency
    pref_curr = current_user.preferred_currency
    total_in_pref = 0
    for exp in user_expenses:
        total_in_pref += convert_currency(exp.amount, exp.currency, pref_curr)
    
    # Calculate category data for the chart (also in pref currency for consistency)
    category_data = {}
    for exp in user_expenses:
        amt_converted = convert_currency(exp.amount, exp.currency, pref_curr)
        category_data[exp.category] = category_data.get(exp.category, 0) + amt_converted
    
    labels = list(category_data.keys())
    values = list(category_data.values())

    currency_symbols = {
        'USD': '$', 'EUR': '€', 'GBP': '£', 'INR': '₹', 'JPY': '¥', 
        'CNY': '¥', 'AUD': 'A$', 'CAD': 'C$', 'SGD': 'S$', 'AED': 'د.إ'
    }
    
    return render_template('index.html', 
                          expenses=user_expenses, 
                          total=total_in_pref, 
                          chart_labels=labels, 
                          chart_values=values,
                          username=current_user.username,
                          user_currency=pref_curr,
                          currency_symbols=currency_symbols)

@expenses.route('/add', methods=['POST'])
@login_required
def add_expense():
    name = request.form.get('item_name')
    amount = request.form.get('amount')
    currency = request.form.get('currency', current_user.preferred_currency)
    category = request.form.get('category')

    new_expense = Expense(
        item_name=name, 
        amount=float(amount), 
        currency=currency,
        category=category,
        user_id=current_user.id
    )
    
    db.session.add(new_expense)
    db.session.commit()
    return redirect(url_for('expenses.index'))

@expenses.route('/delete/<int:id>')
@login_required
def delete_expense(id):
    expense = Expense.query.filter_by(id=id, user_id=current_user.id).first_or_404()
    db.session.delete(expense)
    db.session.commit()
    return redirect(url_for('expenses.index'))

@expenses.route('/update/<int:id>', methods=['POST'])
@login_required
def update_expense(id):
    expense = Expense.query.filter_by(id=id, user_id=current_user.id).first_or_404()
    expense.item_name = request.form.get('item_name')
    expense.amount = float(request.form.get('amount'))
    expense.currency = request.form.get('currency', 'USD')
    expense.category = request.form.get('category')
    db.session.commit()
    return redirect(url_for('expenses.index'))

@expenses.route('/set_currency', methods=['POST'])
@login_required
def set_currency():
    new_curr = request.form.get('preferred_currency')
    if new_curr in EXCHANGE_RATES:
        current_user.preferred_currency = new_curr
        db.session.commit()
        flash(f'Primary currency updated to {new_curr}', 'success')
    return redirect(url_for('expenses.index'))
