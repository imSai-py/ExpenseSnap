from website import create_app, db
from website.models.expense import Expense

app = create_app()

with app.app_context():
    i_count = len(Expense.query.filter_by(user_id=1).all())
    s_count = len(Expense.query.filter_by(user_id='1').all())
    print(f"Int: {i_count} | Str: {s_count}")
