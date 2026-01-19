"""
Authentication forms with CSRF protection and validation.

This module provides Flask-WTF forms for user authentication
with built-in validation and security features.
"""
from flask_wtf import FlaskForm
from wtforms import StringField, PasswordField
from wtforms.validators import (
    DataRequired, Length, Regexp, ValidationError
)


class LoginForm(FlaskForm):
    """
    User login form with validation.

    Attributes:
        username: Username field (3-80 characters)
        password: Password field (required)
    """

    username = StringField('Username', validators=[
        DataRequired(message="Username is required"),
        Length(min=3, max=80, message="Username must be 3-80 characters")
    ])
    password = PasswordField('Password', validators=[
        DataRequired(message="Password is required")
    ])


class RegistrationForm(FlaskForm):
    """
    User registration form with password validation.

    Enforces password complexity requirements:
    - Minimum 8 characters
    - At least one uppercase letter
    - At least one lowercase letter
    - At least one digit

    Attributes:
        username: Username field with character restrictions
        password: Password field with complexity validation
    """

    username = StringField('Username', validators=[
        DataRequired(message="Username is required"),
        Length(min=3, max=80, message="Username must be 3-80 characters"),
        Regexp(
            r'^[\w.]+$',
            message="Username can only contain letters, numbers, dots, and underscores"
        )
    ])
    password = PasswordField('Password', validators=[
        DataRequired(message="Password is required"),
        Length(min=8, message="Password must be at least 8 characters")
    ])

    def validate_password(self, field) -> None:
        """
        Custom password complexity validation.

        Args:
            field: The password field to validate

        Raises:
            ValidationError: If password doesn't meet complexity requirements
        """
        password = field.data
        errors = []

        if not any(c.isupper() for c in password):
            errors.append("one uppercase letter")
        if not any(c.islower() for c in password):
            errors.append("one lowercase letter")
        if not any(c.isdigit() for c in password):
            errors.append("one digit")

        if errors:
            raise ValidationError(
                f"Password must contain at least: {', '.join(errors)}"
            )
