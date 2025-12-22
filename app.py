from flask import Flask, render_template, request, redirect, url_for
from flask_sqlalchemy import SQLAlchemy
from datetime import datetime

app = Flask(__name__)

# Database Configuration
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///expenses.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db = SQLAlchemy(app)

# The Expense Model (The "Schema")
class Expense(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    item_name = db.Column(db.String(100), nullable=False)
    amount = db.Column(db.Float, nullable=False)
    category = db.Column(db.String(50), nullable=False)
    date_added = db.Column(db.DateTime, default=datetime.utcnow)

# Create the database file automatically
with app.app_context():
    db.create_all()

# --- ROUTES ---

@app.route('/')
def index():
    # READ: Get all expenses from the database
    expenses = Expense.query.order_by(Expense.date_added.desc()).all()
    total = sum(exp.amount for exp in expenses)
    
    # Calculate category data for the chart
    category_data = {}
    for exp in expenses:
        category_data[exp.category] = category_data.get(exp.category, 0) + exp.amount
    
    labels = list(category_data.keys())
    values = list(category_data.values())
    
    return render_template('index.html', 
                          expenses=expenses, 
                          total=total, 
                          chart_labels=labels, 
                          chart_values=values)

@app.route('/add', methods=['POST'])
def add_expense():
    # CREATE: Get data from the form
    name = request.form.get('item_name')
    amount = request.form.get('amount')
    category = request.form.get('category')

    new_expense = Expense(item_name=name, amount=float(amount), category=category)
    
    db.session.add(new_expense)
    db.session.commit()
    return redirect(url_for('index'))

@app.route('/delete/<int:id>')
def delete_expense(id):
    # DELETE: Remove an entry
    expense = Expense.query.get_or_404(id)
    db.session.delete(expense)
    db.session.commit()
    return redirect(url_for('index'))

@app.route('/update/<int:id>', methods=['POST'])
def update_expense(id):
    # UPDATE: Edit an existing entry
    expense = Expense.query.get_or_404(id)
    expense.item_name = request.form.get('item_name')
    expense.amount = float(request.form.get('amount'))
    expense.category = request.form.get('category')
    db.session.commit()
    return redirect(url_for('index'))

if __name__ == '__main__':
    app.run(debug=True)