"""
API routes for React frontend.
Returns JSON responses for expense management.
"""
import os
import io
import uuid
from decimal import Decimal, InvalidOperation
from datetime import datetime
from flask import Blueprint, jsonify, request, current_app, send_file
from flask_login import login_required, current_user
from werkzeug.utils import secure_filename
import pandas as pd

from app.core.extensions import db
from app.features.expenses.models import Expense
from app.features.users.models import User
from app.features.notifications.models import PushSubscription
from .services import ExpenseService
from .utils import CURRENCY_SYMBOLS
from .report_generator import generate_expense_report

api = Blueprint('api', __name__)

# Allowed file extensions for profile photos
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'webp'}
MAX_FILE_SIZE = 5 * 1024 * 1024  # 5MB


def allowed_file(filename):
    """Check if file extension is allowed."""
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


def get_upload_folder():
    """Get the upload folder path, creating it if necessary."""
    # Use the app's static_folder which is correctly configured in __init__.py
    if current_app.static_folder:
        upload_folder = os.path.join(current_app.static_folder, 'uploads', 'profiles')
    else:
        # Fallback: assume app/static. root_path is backend/app
        upload_folder = os.path.join(current_app.root_path, 'static', 'uploads', 'profiles')

    # Normalize the path to resolve any '..' components
    upload_folder = os.path.normpath(upload_folder)
    os.makedirs(upload_folder, exist_ok=True)
    return upload_folder


@api.route('/expenses', methods=['GET'])
@login_required
def get_expenses():
    """Get all expenses for the current user.

    Query Parameters:
        search: Optional text to search in item_name
        year: Optional year filter (e.g., 2024)
        month: Optional month filter (1-12, requires year)
        category: Optional category filter
        type: Optional type filter ('expense' or 'income')
    """
    try:
        # Get query parameters
        search = request.args.get('search', '').strip()
        year = request.args.get('year', type=int)
        month = request.args.get('month', type=int)
        category = request.args.get('category', '').strip()
        expense_type = request.args.get('type', '').strip()

        # Start with base query
        query = Expense.query.filter_by(user_id=current_user.id)

        # Apply search filter
        if search:
            query = query.filter(Expense.item_name.ilike(f'%{search}%'))

        # Apply year filter
        if year:
            from sqlalchemy import extract
            query = query.filter(extract('year', Expense.date_added) == year)

            # Apply month filter (only if year is also specified)
            if month and 1 <= month <= 12:
                query = query.filter(extract('month', Expense.date_added) == month)

        # Apply category filter
        if category:
            query = query.filter(Expense.category.ilike(category))

        # Apply type filter
        if expense_type in ['expense', 'income']:
            query = query.filter(Expense.type == expense_type)

        # Order by date descending
        query = query.order_by(Expense.date_added.desc())

        user_expenses = query.all()

        return jsonify({
            'success': True,
            'expenses': [exp.to_dict() for exp in user_expenses],
            'total_count': len(user_expenses)
        })
    except Exception as e:
        current_app.logger.error(f'Error fetching expenses: {e}')
        return jsonify({'success': False, 'error': str(e)}), 500


@api.route('/expenses', methods=['POST'])
@login_required
def create_expense():
    """Create a new expense or income."""
    try:
        data = request.get_json()

        # Parse date_added if provided, otherwise use current time
        date_added = None
        if data.get('date_added'):
            try:
                # Parse the date string (expected format: YYYY-MM-DD)
                date_added = datetime.strptime(data['date_added'], '%Y-%m-%d')
            except ValueError:
                # Try alternative formats
                for fmt in ['%Y-%m-%d', '%d/%m/%Y', '%m/%d/%Y']:
                    try:
                        date_added = datetime.strptime(data['date_added'], fmt)
                        break
                    except ValueError:
                        continue

        new_expense = Expense(
            item_name=data.get('item_name', '').strip(),
            amount=Decimal(str(data.get('amount', 0))),
            currency=data.get('currency', 'INR'),
            category=data.get('category', 'Other'),
            type=data.get('type', 'expense'),
            user_id=current_user.id
        )

        # Set date_added if parsed successfully
        if date_added:
            new_expense.date_added = date_added

        db.session.add(new_expense)
        db.session.commit()

        # After adding an expense, check if budget threshold is exceeded
        # This runs asynchronously-ish (non-blocking for the response)
        budget_check_result = None
        if new_expense.type == 'expense':
            try:
                from app.features.notifications import check_budget_and_notify
                budget_check_result = check_budget_and_notify(current_user.id)
                current_app.logger.debug(f'Budget check result: {budget_check_result}')
            except Exception as e:
                # Don't fail the expense creation if notification fails
                current_app.logger.error(f'Budget notification check failed: {e}')

        response_data = {
            'success': True,
            'expense': new_expense.to_dict()
        }

        # Optionally include budget alert info in response
        if budget_check_result and budget_check_result.get('notification_sent'):
            response_data['budget_alert'] = {
                'sent': True,
                'percentage': budget_check_result.get('percentage')
            }

        return jsonify(response_data), 201
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f'Error creating expense: {e}')
        return jsonify({'success': False, 'error': str(e)}), 500


@api.route('/expenses/<int:id>', methods=['DELETE'])
@login_required
def delete_expense_api(id):
    """Delete an expense."""
    try:
        expense = Expense.query.filter_by(id=id, user_id=current_user.id).first()
        if not expense:
            return jsonify({'success': False, 'error': 'Expense not found'}), 404
        
        db.session.delete(expense)
        db.session.commit()
        
        return jsonify({'success': True})
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f'Error deleting expense: {e}')
        return jsonify({'success': False, 'error': str(e)}), 500


@api.route('/expenses/<int:id>', methods=['PUT'])
@login_required
def update_expense_api(id):
    """Update an expense."""
    try:
        expense = Expense.query.filter_by(id=id, user_id=current_user.id).first()
        if not expense:
            return jsonify({'success': False, 'error': 'Expense not found'}), 404

        data = request.get_json()
        expense.item_name = data.get('item_name', expense.item_name).strip()
        expense.amount = Decimal(str(data.get('amount', expense.amount)))
        expense.currency = data.get('currency', expense.currency)
        expense.category = data.get('category', expense.category)
        expense.type = data.get('type', expense.type)

        # Parse and update date_added if provided
        if data.get('date_added'):
            try:
                # Parse the date string (expected format: YYYY-MM-DD)
                parsed_date = datetime.strptime(data['date_added'], '%Y-%m-%d')
                expense.date_added = parsed_date
            except ValueError:
                # Try alternative formats
                for fmt in ['%Y-%m-%d', '%d/%m/%Y', '%m/%d/%Y']:
                    try:
                        parsed_date = datetime.strptime(data['date_added'], fmt)
                        expense.date_added = parsed_date
                        break
                    except ValueError:
                        continue

        db.session.commit()
        
        return jsonify({
            'success': True,
            'expense': expense.to_dict()
        })
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f'Error updating expense: {e}')
        return jsonify({'success': False, 'error': str(e)}), 500


# ============================================================================
# Bulk Import Endpoints
# ============================================================================

# Valid categories for import
VALID_CATEGORIES = ['Food', 'Shopping', 'Transport', 'Entertainment', 'Bills', 'Health', 'Housing', 'Other', 'Income']

# Allowed file extensions for import
ALLOWED_IMPORT_EXTENSIONS = {'csv', 'xlsx', 'xls'}


def allowed_import_file(filename):
    """Check if file extension is allowed for import."""
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_IMPORT_EXTENSIONS


def parse_date(date_str):
    """Parse date string in various formats.

    Supported formats:
    - YYYY-MM-DD
    - DD/MM/YYYY
    - MM/DD/YYYY
    - DD-MM-YYYY
    """
    if not date_str or str(date_str).strip() == '':
        return None

    date_str = str(date_str).strip()

    # Try various date formats
    formats = [
        '%Y-%m-%d',      # 2024-01-15
        '%d/%m/%Y',      # 15/01/2024
        '%m/%d/%Y',      # 01/15/2024
        '%d-%m-%Y',      # 15-01-2024
        '%Y/%m/%d',      # 2024/01/15
        '%d.%m.%Y',      # 15.01.2024
    ]

    for fmt in formats:
        try:
            return datetime.strptime(date_str, fmt)
        except ValueError:
            continue

    return None


def validate_import_row(row, row_num):
    """Validate a single row from import file.

    Returns (is_valid, error_message, parsed_data)
    """
    errors = []

    # Check required fields
    description = row.get('description') or row.get('item_name') or row.get('title') or row.get('name')
    amount = row.get('amount')
    category = row.get('category')
    date_str = row.get('date') or row.get('date_added')
    expense_type = row.get('type', 'expense').lower() if row.get('type') else 'expense'

    # Validate description
    if not description or str(description).strip() == '':
        errors.append(f"Row {row_num}: Description is required")
    else:
        description = str(description).strip()[:100]  # Limit to 100 chars

    # Validate amount
    parsed_amount = None
    if amount is None or str(amount).strip() == '':
        errors.append(f"Row {row_num}: Amount is required")
    else:
        try:
            # Handle currency symbols and commas
            amount_str = str(amount).strip()
            amount_str = amount_str.replace('₹', '').replace('$', '').replace('€', '').replace('£', '')
            amount_str = amount_str.replace(',', '')
            parsed_amount = Decimal(amount_str)
            if parsed_amount <= 0:
                errors.append(f"Row {row_num}: Amount must be greater than 0")
        except (InvalidOperation, ValueError):
            errors.append(f"Row {row_num}: Invalid amount format '{amount}'")

    # Validate category
    if not category or str(category).strip() == '':
        category = 'Other'  # Default category
    else:
        category = str(category).strip().title()  # Capitalize first letter
        if category not in VALID_CATEGORIES:
            # Try to find a close match
            category_lower = category.lower()
            matched = False
            for valid_cat in VALID_CATEGORIES:
                if valid_cat.lower() == category_lower:
                    category = valid_cat
                    matched = True
                    break
            if not matched:
                errors.append(f"Row {row_num}: Invalid category '{category}'. Valid: {', '.join(VALID_CATEGORIES)}")

    # Validate date
    parsed_date = None
    if date_str:
        parsed_date = parse_date(date_str)
        if parsed_date is None:
            errors.append(f"Row {row_num}: Invalid date format '{date_str}'. Use YYYY-MM-DD or DD/MM/YYYY")
    else:
        parsed_date = datetime.utcnow()  # Default to now

    # Validate type
    if expense_type not in ['expense', 'income']:
        expense_type = 'expense'

    # If category is Income, set type to income
    if category == 'Income':
        expense_type = 'income'

    if errors:
        return False, errors, None

    return True, [], {
        'item_name': description,
        'amount': parsed_amount,
        'category': category,
        'date_added': parsed_date,
        'type': expense_type
    }


@api.route('/import-expenses/template', methods=['GET'])
@login_required
def download_import_template():
    """Download a sample CSV template for bulk import.

    Returns a CSV file with example data and proper headers.
    """
    try:
        # Create sample template
        template_content = """date,description,category,amount,type
2024-01-15,Grocery Shopping,Food,1500.00,expense
2024-01-16,Monthly Salary,Income,50000.00,income
2024-01-17,Uber Ride,Transport,350.00,expense
2024-01-18,Netflix Subscription,Entertainment,199.00,expense
2024-01-19,Electricity Bill,Bills,2500.00,expense
2024-01-20,Gym Membership,Health,1000.00,expense
"""

        # Create file-like buffer
        buffer = io.BytesIO()
        buffer.write(template_content.encode('utf-8'))
        buffer.seek(0)

        return send_file(
            buffer,
            mimetype='text/csv',
            as_attachment=True,
            download_name='ExpenseSnap_Import_Template.csv'
        )
    except Exception as e:
        current_app.logger.error(f'Error generating template: {e}')
        return jsonify({'success': False, 'error': str(e)}), 500


@api.route('/import-expenses/preview', methods=['POST'])
@login_required
def preview_import():
    """Preview expenses from uploaded file before importing.

    Accepts multipart/form-data with:
        - file: CSV or XLSX file

    Returns parsed data with validation results for user confirmation.
    """
    try:
        if 'file' not in request.files:
            return jsonify({
                'success': False,
                'error': 'No file uploaded'
            }), 400

        file = request.files['file']

        if file.filename == '':
            return jsonify({
                'success': False,
                'error': 'No file selected'
            }), 400

        if not allowed_import_file(file.filename):
            return jsonify({
                'success': False,
                'error': 'Invalid file type. Allowed: CSV, XLSX'
            }), 400

        # Read file into pandas DataFrame
        file_ext = file.filename.rsplit('.', 1)[1].lower()

        try:
            if file_ext == 'csv':
                df = pd.read_csv(file, dtype=str)
            else:
                df = pd.read_excel(file, dtype=str)
        except Exception as e:
            return jsonify({
                'success': False,
                'error': f'Error reading file: {str(e)}'
            }), 400

        if df.empty:
            return jsonify({
                'success': False,
                'error': 'File is empty'
            }), 400

        # Normalize column names
        df.columns = df.columns.str.lower().str.strip()

        # Limit to 500 rows
        if len(df) > 500:
            return jsonify({
                'success': False,
                'error': 'Maximum 500 rows allowed per import'
            }), 400

        # Parse and validate each row
        preview_data = []
        all_errors = []
        valid_count = 0

        for idx, row in df.iterrows():
            row_num = idx + 2  # +2 because idx starts at 0 and we skip header
            row_dict = row.to_dict()

            is_valid, errors, parsed_data = validate_import_row(row_dict, row_num)

            if is_valid:
                valid_count += 1
                preview_data.append({
                    'row': row_num,
                    'valid': True,
                    'data': {
                        'item_name': parsed_data['item_name'],
                        'amount': float(parsed_data['amount']),
                        'category': parsed_data['category'],
                        'date': parsed_data['date_added'].strftime('%Y-%m-%d'),
                        'type': parsed_data['type']
                    }
                })
            else:
                all_errors.extend(errors)
                preview_data.append({
                    'row': row_num,
                    'valid': False,
                    'errors': errors,
                    'data': row_dict
                })

        return jsonify({
            'success': True,
            'total_rows': len(df),
            'valid_count': valid_count,
            'invalid_count': len(df) - valid_count,
            'preview': preview_data,
            'errors': all_errors[:20],  # Limit error messages
            'can_import': valid_count > 0
        })

    except Exception as e:
        current_app.logger.error(f'Error previewing import: {e}')
        return jsonify({'success': False, 'error': str(e)}), 500


@api.route('/import-expenses', methods=['POST'])
@login_required
def import_expenses():
    """Bulk import expenses from uploaded file.

    Accepts multipart/form-data with:
        - file: CSV or XLSX file
        - skip_invalid: Optional, if 'true' skips invalid rows (default: false)

    Returns import results with success/failure counts.
    """
    try:
        if 'file' not in request.files:
            return jsonify({
                'success': False,
                'error': 'No file uploaded'
            }), 400

        file = request.files['file']
        skip_invalid = request.form.get('skip_invalid', 'false').lower() == 'true'

        if file.filename == '':
            return jsonify({
                'success': False,
                'error': 'No file selected'
            }), 400

        if not allowed_import_file(file.filename):
            return jsonify({
                'success': False,
                'error': 'Invalid file type. Allowed: CSV, XLSX'
            }), 400

        # Read file into pandas DataFrame
        file_ext = file.filename.rsplit('.', 1)[1].lower()

        try:
            if file_ext == 'csv':
                df = pd.read_csv(file, dtype=str)
            else:
                df = pd.read_excel(file, dtype=str)
        except Exception as e:
            return jsonify({
                'success': False,
                'error': f'Error reading file: {str(e)}'
            }), 400

        if df.empty:
            return jsonify({
                'success': False,
                'error': 'File is empty'
            }), 400

        # Normalize column names
        df.columns = df.columns.str.lower().str.strip()

        # Limit to 500 rows
        if len(df) > 500:
            return jsonify({
                'success': False,
                'error': 'Maximum 500 rows allowed per import'
            }), 400

        # Get user's preferred currency
        user_currency = current_user.preferred_currency or 'INR'

        # Parse and validate all rows first
        valid_expenses = []
        all_errors = []

        for idx, row in df.iterrows():
            row_num = idx + 2
            row_dict = row.to_dict()

            is_valid, errors, parsed_data = validate_import_row(row_dict, row_num)

            if is_valid:
                valid_expenses.append(parsed_data)
            else:
                all_errors.extend(errors)
                if not skip_invalid:
                    # If not skipping invalid, fail the entire import
                    db.session.rollback()
                    return jsonify({
                        'success': False,
                        'error': f'Validation failed. First error: {errors[0]}',
                        'errors': all_errors[:20],
                        'valid_count': len(valid_expenses),
                        'invalid_count': len(all_errors)
                    }), 400

        if not valid_expenses:
            return jsonify({
                'success': False,
                'error': 'No valid expenses to import',
                'errors': all_errors[:20]
            }), 400

        # Bulk insert all valid expenses in a single transaction
        try:
            expense_objects = []
            for data in valid_expenses:
                expense = Expense(
                    item_name=data['item_name'],
                    amount=data['amount'],
                    currency=user_currency,
                    category=data['category'],
                    type=data['type'],
                    date_added=data['date_added'],
                    user_id=current_user.id
                )
                expense_objects.append(expense)

            # Bulk insert for efficiency
            db.session.bulk_save_objects(expense_objects)
            db.session.commit()

            current_app.logger.info(
                f'User {current_user.id} imported {len(expense_objects)} expenses'
            )

            return jsonify({
                'success': True,
                'message': f'Successfully imported {len(expense_objects)} expense(s)',
                'imported_count': len(expense_objects),
                'skipped_count': len(df) - len(expense_objects),
                'errors': all_errors[:10] if all_errors else []
            })

        except Exception as e:
            db.session.rollback()
            current_app.logger.error(f'Error during bulk insert: {e}')
            return jsonify({
                'success': False,
                'error': f'Database error during import: {str(e)}'
            }), 500

    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f'Error importing expenses: {e}')
        return jsonify({'success': False, 'error': str(e)}), 500


@api.route('/summary', methods=['GET'])
@login_required
def get_summary():
    """Get expense summary with totals and category breakdown.

    Query Parameters:
        period: Optional filter - 'this_week', 'this_month', 'last_month',
                'this_year', or omit for all time
    """
    try:
        period = request.args.get('period', None)

        # Validate period parameter
        valid_periods = ['this_week', 'this_month', 'last_month', 'this_year', None]
        if period and period not in valid_periods:
            return jsonify({
                'success': False,
                'error': f'Invalid period. Must be one of: {", ".join(p for p in valid_periods if p)}'
            }), 400

        user_expenses = ExpenseService.get_user_expenses(current_user.id, period)
        summary = ExpenseService.calculate_summary(
            user_expenses,
            current_user.preferred_currency
        )

        return jsonify({
            'success': True,
            'summary': {
                'total_balance': float(summary.total_balance),
                'total_income': float(summary.total_income),
                'total_expense': float(summary.total_expense),
                'category_breakdown': [
                    {'category': cat, 'amount': float(amt), 'percentage': round(float(amt) / float(summary.total_expense) * 100, 1) if summary.total_expense > 0 else 0}
                    for cat, amt in summary.category_totals.items()
                ],
                'currency': current_user.preferred_currency,
                'currency_symbol': CURRENCY_SYMBOLS.get(current_user.preferred_currency, '$'),
                'period': period or 'all_time'
            }
        })
    except Exception as e:
        current_app.logger.error(f'Error fetching summary: {e}')
        return jsonify({'success': False, 'error': str(e)}), 500


@api.route('/user/profile', methods=['GET'])
@login_required
def get_profile():
    """Get current user profile."""
    try:
        expense_count = Expense.query.filter_by(user_id=current_user.id).count()

        return jsonify({
            'success': True,
            'user': {
                'id': current_user.id,
                'username': current_user.username,
                'email': current_user.email or '',
                'preferred_currency': current_user.preferred_currency,
                'profile_photo': current_user.profile_photo,
                'total_expenses': expense_count
            }
        })
    except Exception as e:
        current_app.logger.error(f'Error fetching profile: {e}')
        return jsonify({'success': False, 'error': str(e)}), 500


@api.route('/user/profile', methods=['POST'])
@login_required
def update_profile():
    """Update user profile including username and profile photo.

    Accepts multipart/form-data with:
        - username: Optional new username
        - email: Optional new email
        - profile_photo: Optional image file (jpg, png, gif, webp)
    """
    try:
        # Get form data
        new_username = request.form.get('username', '').strip()
        new_email = request.form.get('email', '').strip()

        current_app.logger.info(f"Profile update request - username: {new_username}, email: {new_email}, has_photo: {'profile_photo' in request.files}")

        # Validate username if provided and different
        if new_username and new_username != current_user.username:
            # Check if username is already taken
            existing_user = User.query.filter_by(username=new_username).first()
            if existing_user:
                return jsonify({
                    'success': False,
                    'error': 'Username is already taken'
                }), 400

            if len(new_username) < 3:
                return jsonify({
                    'success': False,
                    'error': 'Username must be at least 3 characters'
                }), 400

            current_user.username = new_username

        # Validate email if provided and different
        if new_email and new_email != current_user.email:
            existing_email = User.query.filter_by(email=new_email).first()
            if existing_email:
                return jsonify({
                    'success': False,
                    'error': 'Email is already in use'
                }), 400
            current_user.email = new_email

        # Handle profile photo upload
        if 'profile_photo' in request.files:
            file = request.files['profile_photo']
            current_app.logger.info(f"Received file: {file.filename}, content_type: {file.content_type}")

            if file and file.filename:
                # Validate file type
                if not allowed_file(file.filename):
                    return jsonify({
                        'success': False,
                        'error': 'Invalid file type. Allowed: jpg, jpeg, png, gif, webp'
                    }), 400

                # Check file size
                file.seek(0, 2)  # Seek to end
                file_size = file.tell()
                file.seek(0)  # Seek back to start

                if file_size > MAX_FILE_SIZE:
                    return jsonify({
                        'success': False,
                        'error': 'File too large. Maximum size is 5MB'
                    }), 400

                # Generate unique filename
                file_ext = file.filename.rsplit('.', 1)[1].lower()
                unique_filename = f"{current_user.id}_{uuid.uuid4().hex}.{file_ext}"
                secure_name = secure_filename(unique_filename)

                # Save file
                upload_folder = get_upload_folder()
                file_path = os.path.join(upload_folder, secure_name)

                current_app.logger.info(f"Upload folder: {upload_folder}")
                current_app.logger.info(f"File path: {file_path}")

                # Delete old profile photo if exists
                if current_user.profile_photo:
                    # Build path relative to the static folder
                    old_filename = current_user.profile_photo.replace('/static/', '')
                    old_photo_path = os.path.join(current_app.static_folder, old_filename)
                    old_photo_path = os.path.normpath(old_photo_path)
                    if os.path.exists(old_photo_path):
                        try:
                            os.remove(old_photo_path)
                            current_app.logger.info(f"Deleted old photo: {old_photo_path}")
                        except OSError as e:
                            current_app.logger.warning(f"Failed to delete old photo: {e}")

                file.save(file_path)
                current_app.logger.info(f"File saved to: {file_path}")

                # Store relative URL path
                current_user.profile_photo = f"/static/uploads/profiles/{secure_name}"
                current_app.logger.info(f"Profile photo URL set to: {current_user.profile_photo}")

        db.session.commit()

        # Return updated user data
        expense_count = Expense.query.filter_by(user_id=current_user.id).count()

        return jsonify({
            'success': True,
            'user': {
                'id': current_user.id,
                'username': current_user.username,
                'email': current_user.email or '',
                'preferred_currency': current_user.preferred_currency,
                'profile_photo': current_user.profile_photo,
                'total_expenses': expense_count
            }
        })
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f'Error updating profile: {e}')
        return jsonify({'success': False, 'error': str(e)}), 500


@api.route('/user/currency', methods=['PUT'])
@login_required
def update_currency():
    """Update user's preferred currency."""
    try:
        data = request.get_json()
        new_currency = data.get('currency')

        if ExpenseService.validate_currency(new_currency):
            current_user.preferred_currency = new_currency
            db.session.commit()
            return jsonify({'success': True})
        else:
            return jsonify({'success': False, 'error': 'Invalid currency'}), 400
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f'Error updating currency: {e}')
        return jsonify({'success': False, 'error': str(e)}), 500


@api.route('/user/notifications', methods=['GET'])
@login_required
def get_notifications():
    """Get user's notification preferences."""
    try:
        return jsonify({
            'success': True,
            'notifications': {
                'daily_reminders': current_user.notify_daily_reminders,
                'budget_alerts': current_user.notify_budget_alerts
            }
        })
    except Exception as e:
        current_app.logger.error(f'Error fetching notifications: {e}')
        return jsonify({'success': False, 'error': str(e)}), 500


@api.route('/user/notifications', methods=['PUT'])
@login_required
def update_notifications():
    """Update user's notification preferences."""
    try:
        data = request.get_json()

        if 'daily_reminders' in data:
            current_user.notify_daily_reminders = bool(data['daily_reminders'])
        if 'budget_alerts' in data:
            current_user.notify_budget_alerts = bool(data['budget_alerts'])

        db.session.commit()

        return jsonify({
            'success': True,
            'notifications': {
                'daily_reminders': current_user.notify_daily_reminders,
                'budget_alerts': current_user.notify_budget_alerts
            }
        })
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f'Error updating notifications: {e}')
        return jsonify({'success': False, 'error': str(e)}), 500


@api.route('/user/change-password', methods=['POST'])
@login_required
def change_password():
    """Change user's password after verifying old password.

    Accepts JSON with:
        - old_password: Current password for verification
        - new_password: New password to set
    """
    try:
        data = request.get_json()
        old_password = data.get('old_password', '')
        new_password = data.get('new_password', '')

        # Check if user is OAuth-only (no password set)
        if current_user.is_oauth_user:
            return jsonify({
                'success': False,
                'error': 'OAuth users cannot change password. Please use your OAuth provider.'
            }), 400

        # Verify old password
        if not current_user.check_password(old_password):
            return jsonify({
                'success': False,
                'error': 'Current password is incorrect'
            }), 400

        # Validate new password
        if len(new_password) < 8:
            return jsonify({
                'success': False,
                'error': 'New password must be at least 8 characters'
            }), 400

        # Check for at least one uppercase, lowercase, and digit
        if not any(c.isupper() for c in new_password):
            return jsonify({
                'success': False,
                'error': 'Password must contain at least one uppercase letter'
            }), 400

        if not any(c.islower() for c in new_password):
            return jsonify({
                'success': False,
                'error': 'Password must contain at least one lowercase letter'
            }), 400

        if not any(c.isdigit() for c in new_password):
            return jsonify({
                'success': False,
                'error': 'Password must contain at least one digit'
            }), 400

        # Update password
        current_user.set_password(new_password)
        db.session.commit()

        return jsonify({
            'success': True,
            'message': 'Password updated successfully'
        })
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f'Error changing password: {e}')
        return jsonify({'success': False, 'error': str(e)}), 500


@api.route('/generate-report', methods=['GET'])
@login_required
def generate_report():
    """Generate a PDF expense report for the current month.

    Query Parameters:
        period: Optional filter - 'this_week', 'this_month', 'last_month',
                'this_year', or omit for 'this_month' (default)

    Returns:
        PDF file download
    """
    try:
        period = request.args.get('period', 'this_month')

        # Validate period parameter
        valid_periods = ['this_week', 'this_month', 'last_month', 'this_year']
        if period not in valid_periods:
            period = 'this_month'

        # Get period display name
        period_names = {
            'this_week': 'This Week',
            'this_month': 'This Month',
            'last_month': 'Last Month',
            'this_year': 'This Year'
        }
        period_display = period_names.get(period, 'This Month')

        # Fetch expenses for the period
        user_expenses = ExpenseService.get_user_expenses(current_user.id, period)

        # Calculate summary
        summary = ExpenseService.calculate_summary(
            user_expenses,
            current_user.preferred_currency
        )

        # Convert expenses to dict format
        expenses_data = [exp.to_dict() for exp in user_expenses]

        # Convert category totals to float
        category_totals = {
            cat: float(amt) for cat, amt in summary.category_totals.items()
        }

        # Generate PDF
        pdf_buffer = generate_expense_report(
            user_name=current_user.username,
            expenses=expenses_data,
            total_income=float(summary.total_income),
            total_expense=float(summary.total_expense),
            total_balance=float(summary.total_balance),
            category_totals=category_totals,
            currency=current_user.preferred_currency,
            period=period_display
        )

        # Generate filename with date
        now = datetime.now()
        filename = f"ExpenseSnap_Report_{now.strftime('%Y%m%d_%H%M%S')}.pdf"

        return send_file(
            pdf_buffer,
            mimetype='application/pdf',
            as_attachment=True,
            download_name=filename
        )

    except Exception as e:
        current_app.logger.error(f'Error generating report: {e}')
        return jsonify({'success': False, 'error': str(e)}), 500


# ============================================================================
# Push Subscription Endpoints
# ============================================================================

@api.route('/push/vapid-public-key', methods=['GET'])
@login_required
def get_vapid_public_key():
    """Get the VAPID public key for push subscription.

    The frontend needs this key to subscribe to push notifications.
    """
    try:
        vapid_public_key = current_app.config.get('VAPID_PUBLIC_KEY')
        if not vapid_public_key:
            current_app.logger.warning('VAPID_PUBLIC_KEY not configured')
            return jsonify({
                'success': False,
                'error': 'Push notifications not configured on server'
            }), 503

        # Trim any whitespace from the key
        vapid_public_key = vapid_public_key.strip()

        return jsonify({
            'success': True,
            'vapid_public_key': vapid_public_key
        })
    except Exception as e:
        current_app.logger.error(f'Error getting VAPID key: {e}')
        return jsonify({'success': False, 'error': str(e)}), 500


@api.route('/push/subscribe', methods=['POST'])
@login_required
def subscribe_push():
    """Save a push subscription for the current user.

    Accepts JSON with the PushSubscription object from the browser:
        - endpoint: Push service URL
        - keys.p256dh: Public key
        - keys.auth: Auth secret
    """
    try:
        data = request.get_json(force=True, silent=True)

        if not data:
            return jsonify({
                'success': False,
                'error': 'Invalid or missing JSON body'
            }), 400

        endpoint = data.get('endpoint')
        keys = data.get('keys', {})
        p256dh_key = keys.get('p256dh')
        auth_key = keys.get('auth')

        if not all([endpoint, p256dh_key, auth_key]):
            return jsonify({
                'success': False,
                'error': 'Invalid subscription data'
            }), 400

        # Check if this subscription already exists
        existing = PushSubscription.query.filter_by(endpoint=endpoint).first()

        if existing:
            # Update existing subscription (may be for a different user)
            existing.user_id = current_user.id
            existing.p256dh_key = p256dh_key
            existing.auth_key = auth_key
            existing.user_agent = request.headers.get('User-Agent', '')[:500]
        else:
            # Create new subscription
            subscription = PushSubscription(
                user_id=current_user.id,
                endpoint=endpoint,
                p256dh_key=p256dh_key,
                auth_key=auth_key,
                user_agent=request.headers.get('User-Agent', '')[:500]
            )
            db.session.add(subscription)

        db.session.commit()

        current_app.logger.info(f'Push subscription saved for user {current_user.id}')

        return jsonify({
            'success': True,
            'message': 'Subscription saved successfully'
        })

    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f'Error saving push subscription: {e}')
        return jsonify({'success': False, 'error': str(e)}), 500


@api.route('/push/unsubscribe', methods=['POST'])
@login_required
def unsubscribe_push():
    """Remove a push subscription for the current user.

    Accepts JSON with:
        - endpoint: The subscription endpoint to remove
    """
    try:
        data = request.get_json()
        endpoint = data.get('endpoint')

        if not endpoint:
            return jsonify({
                'success': False,
                'error': 'Endpoint required'
            }), 400

        subscription = PushSubscription.query.filter_by(
            user_id=current_user.id,
            endpoint=endpoint
        ).first()

        if subscription:
            db.session.delete(subscription)
            db.session.commit()
            current_app.logger.info(f'Push subscription removed for user {current_user.id}')

        return jsonify({
            'success': True,
            'message': 'Subscription removed'
        })

    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f'Error removing push subscription: {e}')
        return jsonify({'success': False, 'error': str(e)}), 500


@api.route('/push/subscriptions', methods=['GET'])
@login_required
def get_push_subscriptions():
    """Get all push subscriptions for the current user."""
    try:
        subscriptions = PushSubscription.query.filter_by(
            user_id=current_user.id
        ).all()

        return jsonify({
            'success': True,
            'subscriptions': [sub.to_dict() for sub in subscriptions]
        })

    except Exception as e:
        current_app.logger.error(f'Error fetching push subscriptions: {e}')
        return jsonify({'success': False, 'error': str(e)}), 500


@api.route('/push/test', methods=['POST'])
@login_required
def test_push():
    """Send a test notification to the user's devices.

    This endpoint is for testing purposes to verify push notifications work.
    """
    try:
        from pywebpush import webpush, WebPushException
        import json

        subscriptions = PushSubscription.query.filter_by(
            user_id=current_user.id
        ).all()

        if not subscriptions:
            return jsonify({
                'success': False,
                'error': 'No push subscriptions found. Please enable notifications first.'
            }), 400

        vapid_private_key = current_app.config.get('VAPID_PRIVATE_KEY')
        vapid_claims = {
            'sub': f"mailto:{current_app.config.get('VAPID_CONTACT_EMAIL', 'admin@expensesnap.com')}"
        }

        if not vapid_private_key:
            return jsonify({
                'success': False,
                'error': 'Push notifications not configured'
            }), 503

        notification_data = json.dumps({
            'title': 'ExpenseSnap Test',
            'body': 'Push notifications are working! 🎉',
            'icon': '/static/icons/icon-192x192.png',
            'badge': '/static/icons/icon-72x72.png',
            'tag': 'test-notification',
            'data': {
                'type': 'test',
                'url': '/'
            }
        })

        sent_count = 0
        failed_endpoints = []

        for subscription in subscriptions:
            try:
                webpush(
                    subscription_info=subscription.get_subscription_info(),
                    data=notification_data,
                    vapid_private_key=vapid_private_key,
                    vapid_claims=vapid_claims
                )
                subscription.last_used_at = datetime.utcnow()
                sent_count += 1
            except WebPushException as e:
                current_app.logger.error(f'WebPush error: {e}')
                # If subscription is invalid (410 Gone), remove it
                if e.response and e.response.status_code == 410:
                    db.session.delete(subscription)
                    failed_endpoints.append(subscription.endpoint[:50])

        db.session.commit()

        return jsonify({
            'success': True,
            'message': f'Test notification sent to {sent_count} device(s)',
            'sent_count': sent_count
        })

    except ImportError:
        return jsonify({
            'success': False,
            'error': 'pywebpush not installed. Run: pip install pywebpush'
        }), 503
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f'Error sending test notification: {e}')
        return jsonify({'success': False, 'error': str(e)}), 500


# ============================================================================
# Test/Debug Endpoints (Remove in Production)
# ============================================================================

@api.route('/test-budget-check', methods=['GET', 'POST'])
def test_budget_check():
    """
    TEST ENDPOINT: Manually check and trigger budget alert for a specific user.

    This endpoint:
    1. Looks up user 'Urek_Mazino1'
    2. Calculates their spending-to-income ratio for the current month
    3. Force-sends a budget alert notification if ratio >= 80%
    4. Logs all details to the Flask console

    WARNING: Remove this endpoint in production!
    """
    from decimal import Decimal
    import json

    try:
        from pywebpush import webpush, WebPushException
    except ImportError:
        current_app.logger.error('pywebpush not installed!')
        return jsonify({
            'success': False,
            'error': 'pywebpush not installed. Run: pip install pywebpush'
        }), 503

    # Configuration
    TEST_USERNAME = 'Urek_Mazino1'
    BUDGET_THRESHOLD = 0.80  # 80%

    current_app.logger.info('=' * 60)
    current_app.logger.info('BUDGET CHECK TEST - Starting')
    current_app.logger.info('=' * 60)

    try:
        # Step 1: Find the user
        user = User.query.filter_by(username=TEST_USERNAME).first()

        if not user:
            current_app.logger.error(f'User "{TEST_USERNAME}" not found!')
            return jsonify({
                'success': False,
                'error': f'User "{TEST_USERNAME}" not found'
            }), 404

        current_app.logger.info(f'Found user: {user.username} (ID: {user.id})')
        current_app.logger.info(f'  - notify_budget_alerts: {user.notify_budget_alerts}')

        # Step 2: Get current month's expenses and income
        today = datetime.utcnow()
        month_start = today.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

        current_app.logger.info(f'Checking expenses from {month_start} to {today}')

        month_transactions = Expense.query.filter(
            Expense.user_id == user.id,
            Expense.date_added >= month_start
        ).all()

        current_app.logger.info(f'Found {len(month_transactions)} transactions this month')

        # Calculate totals
        total_income = Decimal('0')
        total_expense = Decimal('0')

        for txn in month_transactions:
            if txn.type == 'income':
                total_income += txn.amount
                current_app.logger.info(f'  + INCOME: {txn.item_name} = {txn.amount}')
            else:
                total_expense += txn.amount
                current_app.logger.info(f'  - EXPENSE: {txn.item_name} = {txn.amount}')

        current_app.logger.info('-' * 40)
        current_app.logger.info(f'Total Income:  {total_income}')
        current_app.logger.info(f'Total Expense: {total_expense}')

        # Step 3: Calculate spending ratio
        if total_income <= 0:
            current_app.logger.warning('No income recorded this month - cannot calculate ratio')
            return jsonify({
                'success': True,
                'message': 'No income recorded this month',
                'total_income': float(total_income),
                'total_expense': float(total_expense),
                'ratio': None,
                'threshold': BUDGET_THRESHOLD,
                'notification_sent': False
            })

        spending_ratio = float(total_expense) / float(total_income)
        percentage = int(spending_ratio * 100)

        current_app.logger.info(f'Spending Ratio: {spending_ratio:.2%} ({percentage}%)')
        current_app.logger.info(f'Threshold: {BUDGET_THRESHOLD:.0%}')

        # Step 4: Check if we should send notification
        if spending_ratio < BUDGET_THRESHOLD:
            current_app.logger.info(f'Ratio {spending_ratio:.2%} is BELOW threshold {BUDGET_THRESHOLD:.0%} - No notification needed')
            return jsonify({
                'success': True,
                'message': f'Spending ratio {percentage}% is below threshold {int(BUDGET_THRESHOLD * 100)}%',
                'total_income': float(total_income),
                'total_expense': float(total_expense),
                'ratio': spending_ratio,
                'percentage': percentage,
                'threshold': BUDGET_THRESHOLD,
                'notification_sent': False
            })

        current_app.logger.info(f'Ratio {spending_ratio:.2%} EXCEEDS threshold {BUDGET_THRESHOLD:.0%} - Sending notification!')

        # Step 5: Get user's push subscriptions
        subscriptions = PushSubscription.query.filter_by(user_id=user.id).all()

        if not subscriptions:
            current_app.logger.warning(f'No push subscriptions found for user {user.username}')
            return jsonify({
                'success': True,
                'message': 'Budget exceeded but no push subscriptions found',
                'total_income': float(total_income),
                'total_expense': float(total_expense),
                'ratio': spending_ratio,
                'percentage': percentage,
                'threshold': BUDGET_THRESHOLD,
                'notification_sent': False,
                'reason': 'No push subscriptions'
            })

        current_app.logger.info(f'Found {len(subscriptions)} push subscription(s)')

        # Step 6: Prepare notification payload
        if spending_ratio >= 1.0:
            title = '⚠️ Budget Exceeded!'
            body = f"You've spent {percentage}% of your income this month. Time to review your expenses!"
        else:
            title = '📊 Budget Alert'
            body = f"You've spent {percentage}% of your income this month. Approaching your limit!"

        notification_payload = json.dumps({
            'title': title,
            'body': body,
            'icon': '/vite.svg',
            'badge': '/vite.svg',
            'tag': f'budget-alert-test-{datetime.utcnow().timestamp()}',  # Unique tag to force show
            'renotify': True,
            'requireInteraction': True,
            'data': {
                'type': 'budget_alert',
                'url': '/?screen=statistics',
                'percentage': percentage,
                'test': True
            },
            'actions': [
                {'action': 'view', 'title': 'View Stats'},
                {'action': 'dismiss', 'title': 'Dismiss'}
            ]
        })

        current_app.logger.info(f'Notification payload: {notification_payload}')

        # Step 7: Send push notifications
        vapid_private_key = current_app.config.get('VAPID_PRIVATE_KEY', '').strip()
        vapid_claims = {
            'sub': f"mailto:{current_app.config.get('VAPID_CONTACT_EMAIL', 'admin@expensesnap.com')}"
        }

        if not vapid_private_key:
            current_app.logger.error('VAPID_PRIVATE_KEY not configured!')
            return jsonify({
                'success': False,
                'error': 'VAPID_PRIVATE_KEY not configured'
            }), 503

        sent_count = 0
        failed_count = 0
        results = []

        for i, subscription in enumerate(subscriptions):
            current_app.logger.info(f'Sending to subscription {i + 1}/{len(subscriptions)}...')
            current_app.logger.info(f'  Endpoint: {subscription.endpoint[:80]}...')

            try:
                response = webpush(
                    subscription_info=subscription.get_subscription_info(),
                    data=notification_payload,
                    vapid_private_key=vapid_private_key,
                    vapid_claims=vapid_claims
                )

                # Update last_used timestamp
                subscription.last_used_at = datetime.utcnow()

                current_app.logger.info(f'  ✅ SUCCESS! Response status: {response.status_code if hasattr(response, "status_code") else "OK"}')
                sent_count += 1
                results.append({
                    'subscription_id': subscription.id,
                    'status': 'sent',
                    'endpoint_preview': subscription.endpoint[:50] + '...'
                })

            except WebPushException as e:
                current_app.logger.error(f'  ❌ FAILED! WebPush error: {e}')

                if e.response:
                    current_app.logger.error(f'     Response status: {e.response.status_code}')
                    current_app.logger.error(f'     Response body: {e.response.text[:200] if e.response.text else "empty"}')

                    # Remove expired subscriptions
                    if e.response.status_code == 410:
                        current_app.logger.warning(f'     Subscription expired (410 Gone) - removing from database')
                        db.session.delete(subscription)

                failed_count += 1
                results.append({
                    'subscription_id': subscription.id,
                    'status': 'failed',
                    'error': str(e)[:100]
                })

        db.session.commit()

        current_app.logger.info('=' * 60)
        current_app.logger.info(f'BUDGET CHECK TEST - Complete')
        current_app.logger.info(f'  Sent: {sent_count}, Failed: {failed_count}')
        current_app.logger.info('=' * 60)

        return jsonify({
            'success': True,
            'message': f'Budget alert sent to {sent_count} device(s)',
            'user': user.username,
            'total_income': float(total_income),
            'total_expense': float(total_expense),
            'ratio': spending_ratio,
            'percentage': percentage,
            'threshold': BUDGET_THRESHOLD,
            'exceeded': spending_ratio >= BUDGET_THRESHOLD,
            'notification_sent': sent_count > 0,
            'sent_count': sent_count,
            'failed_count': failed_count,
            'results': results
        })

    except Exception as e:
        current_app.logger.error(f'Budget check test error: {e}')
        import traceback
        current_app.logger.error(traceback.format_exc())
        db.session.rollback()
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@api.route('/test-reset-budget-alert', methods=['POST'])
def test_reset_budget_alert():
    """
    TEST ENDPOINT: Reset the budget alert flag for a user.

    This allows testing the budget alert notification multiple times
    without waiting for a new month.

    POST JSON body:
        - username: The username to reset (default: 'Urek_Mazino1')

    WARNING: Remove this endpoint in production!
    """
    TEST_USERNAME = 'Urek_Mazino1'

    try:
        data = request.get_json(force=True, silent=True) or {}
        username = data.get('username', TEST_USERNAME)

        user = User.query.filter_by(username=username).first()
        if not user:
            return jsonify({
                'success': False,
                'error': f'User "{username}" not found'
            }), 404

        old_value = user.budget_alert_sent_month
        user.budget_alert_sent_month = None
        db.session.commit()

        current_app.logger.info(f'Reset budget alert flag for user {username}: {old_value} -> None')

        return jsonify({
            'success': True,
            'message': f'Budget alert flag reset for {username}',
            'old_value': old_value,
            'new_value': None
        })

    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f'Error resetting budget alert: {e}')
        return jsonify({'success': False, 'error': str(e)}), 500
