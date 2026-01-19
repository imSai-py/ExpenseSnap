"""
PDF Report Generator for ExpenseSnap.

Generates professional, modern PDF expense reports using ReportLab.
Features:
- Unicode-compliant fonts for currency symbols (₹, €, £, ¥)
- Matplotlib pie charts for category visualization
- Financial highlights with key metrics
- Conditional styling for income/expense amounts
- Pagination with page numbers and consistent headers
"""
import os
import io
import matplotlib
matplotlib.use('Agg')  # Use non-interactive backend
import matplotlib.pyplot as plt
import matplotlib.patheffects as path_effects
from io import BytesIO
from datetime import datetime
from decimal import Decimal
from typing import List, Dict, Any, Optional, Callable

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch, mm
from reportlab.platypus import (
    BaseDocTemplate, PageTemplate, Frame, Paragraph, Spacer, Table, TableStyle,
    HRFlowable, KeepTogether, Image, PageBreak, NextPageTemplate
)
from reportlab.lib.enums import TA_CENTER, TA_RIGHT, TA_LEFT
from reportlab.graphics.shapes import Drawing, Rect, String
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

from .utils import CURRENCY_SYMBOLS


# ============================================================
# FONT REGISTRATION - Unicode Support for ₹, €, £, ¥ symbols
# ============================================================

def get_fonts_dir() -> str:
    """Get the fonts directory path."""
    # Adjusted for new structure: app/features/expenses/report_generator.py
    # We want app/static/fonts
    current_dir = os.path.dirname(os.path.abspath(__file__)) # expenses
    features_dir = os.path.dirname(current_dir) # features
    app_dir = os.path.dirname(features_dir) # app
    return os.path.join(app_dir, 'static', 'fonts')


def register_unicode_fonts() -> str:
    """
    Register Unicode-compliant fonts with ReportLab.
    Returns the font family name to use in styles.
    Falls back to Helvetica if custom fonts are not available.
    """
    fonts_dir = get_fonts_dir()
    regular_font = os.path.join(fonts_dir, 'NotoSans-Regular.ttf')
    bold_font = os.path.join(fonts_dir, 'NotoSans-Bold.ttf')

    if os.path.exists(regular_font) and os.path.exists(bold_font):
        try:
            if 'NotoSans' not in pdfmetrics.getRegisteredFontNames():
                pdfmetrics.registerFont(TTFont('NotoSans', regular_font))
            if 'NotoSans-Bold' not in pdfmetrics.getRegisteredFontNames():
                pdfmetrics.registerFont(TTFont('NotoSans-Bold', bold_font))

            from reportlab.pdfbase.pdfmetrics import registerFontFamily
            registerFontFamily(
                'NotoSans',
                normal='NotoSans',
                bold='NotoSans-Bold',
                italic='NotoSans',
                boldItalic='NotoSans-Bold'
            )
            return 'NotoSans'
        except Exception as e:
            print(f"Warning: Could not register Noto Sans fonts: {e}")
            return 'Helvetica'
    else:
        # print(f"Warning: Font files not found in {fonts_dir}. Using Helvetica.") # Suppress spam
        return 'Helvetica'


# Register fonts at module load time
FONT_REGULAR = register_unicode_fonts()
FONT_BOLD = f'{FONT_REGULAR}-Bold' if FONT_REGULAR == 'NotoSans' else 'Helvetica-Bold'


# ============================================================
# BRAND COLORS
# ============================================================
PRIMARY_COLOR = colors.HexColor('#4F46E5')  # Indigo
PRIMARY_LIGHT = colors.HexColor('#EEF2FF')  # Light Indigo
SECONDARY_COLOR = colors.HexColor('#6B7280')  # Gray
SUCCESS_COLOR = colors.HexColor('#16A34A')  # Green
SUCCESS_LIGHT = colors.HexColor('#F0FDF4')  # Light Green
DANGER_COLOR = colors.HexColor('#DC2626')  # Red
DANGER_LIGHT = colors.HexColor('#FEF2F2')  # Light Red
WARNING_COLOR = colors.HexColor('#F59E0B')  # Amber
WARNING_LIGHT = colors.HexColor('#FFFBEB')  # Light Amber
LIGHT_BG = colors.HexColor('#F9FAFB')
BORDER_COLOR = colors.HexColor('#E5E7EB')
TEXT_PRIMARY = colors.HexColor('#111827')
TEXT_SECONDARY = colors.HexColor('#6B7280')

# Page dimensions
PAGE_WIDTH, PAGE_HEIGHT = A4
MARGIN = 40


# ============================================================
# CHART COLORS - Modern palette for pie charts
# ============================================================
CHART_COLORS = [
    '#4F46E5',  # Indigo
    '#EC4899',  # Pink
    '#F59E0B',  # Amber
    '#10B981',  # Emerald
    '#6366F1',  # Purple
    '#EF4444',  # Red
    '#8B5CF6',  # Violet
    '#14B8A6',  # Teal
    '#F97316',  # Orange
    '#6B7280',  # Gray
]


# ============================================================
# STYLES
# ============================================================

def create_styles() -> Dict[str, ParagraphStyle]:
    """Create custom paragraph styles for the report using Unicode fonts."""
    styles = getSampleStyleSheet()

    custom_styles = {
        'Title': ParagraphStyle(
            'CustomTitle',
            parent=styles['Heading1'],
            fontSize=24,
            textColor=PRIMARY_COLOR,
            spaceAfter=4,
            fontName=FONT_BOLD
        ),
        'Subtitle': ParagraphStyle(
            'CustomSubtitle',
            parent=styles['Normal'],
            fontSize=11,
            textColor=TEXT_SECONDARY,
            spaceAfter=15,
            fontName=FONT_REGULAR
        ),
        'SectionHeader': ParagraphStyle(
            'SectionHeader',
            parent=styles['Heading2'],
            fontSize=14,
            textColor=TEXT_PRIMARY,
            spaceBefore=15,
            spaceAfter=10,
            fontName=FONT_BOLD
        ),
        'Normal': ParagraphStyle(
            'CustomNormal',
            parent=styles['Normal'],
            fontSize=10,
            textColor=TEXT_PRIMARY,
            leading=14,
            fontName=FONT_REGULAR
        ),
        'Small': ParagraphStyle(
            'Small',
            parent=styles['Normal'],
            fontSize=8,
            textColor=TEXT_SECONDARY,
            fontName=FONT_REGULAR
        ),
        'Footer': ParagraphStyle(
            'Footer',
            parent=styles['Normal'],
            fontSize=8,
            textColor=TEXT_SECONDARY,
            alignment=TA_CENTER,
            fontName=FONT_REGULAR
        ),
        'CardValue': ParagraphStyle(
            'CardValue',
            parent=styles['Normal'],
            fontSize=18,
            textColor=TEXT_PRIMARY,
            alignment=TA_CENTER,
            fontName=FONT_BOLD
        ),
        'CardLabel': ParagraphStyle(
            'CardLabel',
            parent=styles['Normal'],
            fontSize=9,
            textColor=TEXT_SECONDARY,
            alignment=TA_CENTER,
            fontName=FONT_REGULAR
        ),
    }

    return custom_styles


# ============================================================
# UTILITY FUNCTIONS
# ============================================================

def format_currency(amount: float, currency: str) -> str:
    """Format amount with currency symbol."""
    symbol = CURRENCY_SYMBOLS.get(currency, '$')
    return f"{symbol}{amount:,.2f}"


def format_currency_with_sign(amount: float, currency: str, is_income: bool) -> str:
    """Format amount with currency symbol and sign."""
    symbol = CURRENCY_SYMBOLS.get(currency, '$')
    sign = '+' if is_income else '-'
    return f"{sign}{symbol}{abs(amount):,.2f}"


# ============================================================
# PAGE TEMPLATE WITH HEADER/FOOTER
# ============================================================

class NumberedPageCanvas:
    """Canvas wrapper to add page numbers and consistent headers."""

    def __init__(self, canvas, doc, user_name: str, period: str):
        self.canvas = canvas
        self.doc = doc
        self.user_name = user_name
        self.period = period
        self.pages = []

    def afterPage(self):
        """Called after each page is completed."""
        self.pages.append(dict(self.canvas.__dict__))

    def beforePage(self):
        """Called before each page starts."""
        pass


def create_header_footer(canvas, doc, user_name: str, period: str, total_pages: int = None):
    """Draw consistent header and footer on each page."""
    canvas.saveState()

    # Header - only on pages after the first
    if doc.page > 1:
        # Header line
        canvas.setStrokeColor(PRIMARY_COLOR)
        canvas.setLineWidth(2)
        canvas.line(MARGIN, PAGE_HEIGHT - 30, PAGE_WIDTH - MARGIN, PAGE_HEIGHT - 30)

        # Logo/Brand name in header
        canvas.setFont(FONT_BOLD, 12)
        canvas.setFillColor(PRIMARY_COLOR)
        canvas.drawString(MARGIN, PAGE_HEIGHT - 25, "ExpenseSnap")

        # Period in header (right side)
        canvas.setFont(FONT_REGULAR, 9)
        canvas.setFillColor(TEXT_SECONDARY)
        canvas.drawRightString(PAGE_WIDTH - MARGIN, PAGE_HEIGHT - 25, f"{period} Report")

    # Footer
    canvas.setStrokeColor(BORDER_COLOR)
    canvas.setLineWidth(0.5)
    canvas.line(MARGIN, 35, PAGE_WIDTH - MARGIN, 35)

    # Page number
    canvas.setFont(FONT_REGULAR, 8)
    canvas.setFillColor(TEXT_SECONDARY)

    if total_pages:
        page_text = f"Page {doc.page} of {total_pages}"
    else:
        page_text = f"Page {doc.page}"

    canvas.drawCentredString(PAGE_WIDTH / 2, 20, page_text)

    # Footer text
    canvas.drawString(MARGIN, 20, "© ExpenseSnap")
    canvas.drawRightString(PAGE_WIDTH - MARGIN, 20, "support@expensesnap.com")

    canvas.restoreState()


# ============================================================
# PIE CHART GENERATION WITH AUTO-ADJUSTING LABELS
# ============================================================

def get_text_color_for_background(hex_color: str) -> str:
    """
    Determine if text should be white or black based on background color.
    Uses luminance calculation for optimal contrast.
    """
    # Remove # if present
    hex_color = hex_color.lstrip('#')

    # Convert hex to RGB
    r = int(hex_color[0:2], 16)
    g = int(hex_color[2:4], 16)
    b = int(hex_color[4:6], 16)

    # Calculate relative luminance using sRGB formula
    luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255

    # Return white for dark backgrounds, black for light backgrounds
    return 'white' if luminance < 0.5 else '#333333'


def create_pie_chart(category_totals: Dict[str, float], currency: str) -> Optional[BytesIO]:
    """
    Create a professional pie chart using matplotlib with auto-adjusting label colors.

    Features:
    - High DPI (200) for sharp text
    - Auto-adjusting label colors based on slice brightness
    - Labels positioned outside for better visibility
    - Modern donut style with legend
    """
    if not category_totals or len(category_totals) == 0:
        return None

    # Sort by amount and take top 8 categories, group rest as "Other"
    sorted_cats = sorted(category_totals.items(), key=lambda x: x[1], reverse=True)

    if len(sorted_cats) > 8:
        top_cats = sorted_cats[:7]
        other_total = sum(amt for _, amt in sorted_cats[7:])
        top_cats.append(('Other', other_total))
        sorted_cats = top_cats

    labels = [cat for cat, _ in sorted_cats]
    sizes = [amt for _, amt in sorted_cats]
    colors_list = CHART_COLORS[:len(labels)]

    # Create figure with higher resolution
    fig, ax = plt.subplots(figsize=(4.5, 4), facecolor='white', dpi=100)

    # Create pie chart with labels outside for better visibility
    wedges, texts, autotexts = ax.pie(
        sizes,
        labels=None,
        autopct=lambda pct: f'{pct:.1f}%' if pct > 5 else '',  # Only show labels > 5%
        colors=colors_list,
        startangle=90,
        pctdistance=0.78,  # Position percentage labels
        wedgeprops=dict(width=0.45, edgecolor='white', linewidth=2.5),
        explode=[0.02] * len(sizes)  # Slight separation between slices
    )

    # Auto-adjust label colors based on slice background
    for i, autotext in enumerate(autotexts):
        bg_color = colors_list[i]
        text_color = get_text_color_for_background(bg_color)
        autotext.set_color(text_color)
        autotext.set_fontsize(9)
        autotext.set_fontweight('bold')
        # Add white outline for better readability on dark backgrounds
        if text_color == 'white':
            autotext.set_path_effects([
                path_effects.withStroke(linewidth=3, foreground='#333333')
            ])

    # Add center circle for donut effect
    centre_circle = plt.Circle((0, 0), 0.35, fc='white', ec='#E5E7EB', linewidth=1)
    ax.add_patch(centre_circle)

    # Add center text
    ax.text(0, 0, 'Spending\nBreakdown', ha='center', va='center',
            fontsize=8, fontweight='bold', color='#6B7280')

    # Add legend with better styling
    legend = ax.legend(
        wedges, labels,
        title="Categories",
        loc="center left",
        bbox_to_anchor=(1.05, 0.5),
        fontsize=8,
        title_fontsize=9,
        frameon=True,
        fancybox=True,
        shadow=False,
        edgecolor='#E5E7EB'
    )
    legend.get_title().set_fontweight('bold')

    ax.set_aspect('equal')
    plt.tight_layout()

    # Save to buffer with higher DPI for sharp text
    buf = BytesIO()
    plt.savefig(buf, format='png', dpi=200, bbox_inches='tight',
                facecolor='white', edgecolor='none', pad_inches=0.1)
    plt.close(fig)
    buf.seek(0)

    return buf


# ============================================================
# FINANCIAL HIGHLIGHTS SECTION
# ============================================================

def create_icon_cell(icon_text: str, bg_color: colors.HexColor, text_color: colors.HexColor) -> Table:
    """Create a styled icon cell for highlight cards."""
    icon_style = ParagraphStyle(
        'IconStyle',
        fontName=FONT_BOLD,
        fontSize=16,
        alignment=TA_CENTER,
        textColor=text_color
    )
    icon_table = Table([[Paragraph(icon_text, icon_style)]], colWidths=[36], rowHeights=[36])
    icon_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (0, 0), bg_color),
        ('ALIGN', (0, 0), (0, 0), 'CENTER'),
        ('VALIGN', (0, 0), (0, 0), 'MIDDLE'),
        ('LEFTPADDING', (0, 0), (0, 0), 0),
        ('RIGHTPADDING', (0, 0), (0, 0), 0),
        ('TOPPADDING', (0, 0), (0, 0), 8),
        ('BOTTOMPADDING', (0, 0), (0, 0), 8),
    ]))
    return icon_table


def create_financial_highlights(
    styles: Dict,
    expenses: List[Dict[str, Any]],
    total_income: float,
    total_expense: float,
    total_balance: float,
    currency: str,
    num_days: int = 30
) -> List:
    """
    Create the financial highlights section with key metrics.

    Uses Unicode symbols that are supported by NotoSans font
    instead of emojis which may not render correctly.
    """
    elements = []

    elements.append(Paragraph("Financial Highlights", styles['SectionHeader']))

    # Calculate metrics
    # Highest Expense
    expense_items = [e for e in expenses if e.get('type', 'expense') == 'expense']
    if expense_items:
        highest = max(expense_items, key=lambda x: x.get('amount', 0))
        highest_expense = highest.get('amount', 0)
        highest_category = highest.get('category', 'N/A')
    else:
        highest_expense = 0
        highest_category = 'N/A'

    # Total Savings (balance)
    savings = total_balance
    savings_rate = (savings / total_income * 100) if total_income > 0 else 0

    # Daily Average Spend
    daily_avg = total_expense / num_days if num_days > 0 else 0

    # Create highlight cards with Unicode symbols (supported by NotoSans)
    # Using simple text-based icons instead of emojis
    cards_data = [
        [
            # Highest Expense Card
            Table([
                [create_icon_cell("$", WARNING_COLOR, colors.white)],
                [Paragraph(format_currency(highest_expense, currency), styles['CardValue'])],
                [Paragraph("Highest Expense", styles['CardLabel'])],
                [Paragraph(f"({highest_category})", styles['Small'])],
            ], colWidths=[125]),
            # Total Savings Card
            Table([
                [create_icon_cell("+" if savings >= 0 else "-", SUCCESS_COLOR if savings >= 0 else DANGER_COLOR, colors.white)],
                [Paragraph(format_currency(abs(savings), currency), styles['CardValue'])],
                [Paragraph("Total Savings" if savings >= 0 else "Net Loss", styles['CardLabel'])],
                [Paragraph(f"({savings_rate:.1f}% of income)", styles['Small'])],
            ], colWidths=[125]),
            # Daily Average Card
            Table([
                [create_icon_cell("~", PRIMARY_COLOR, colors.white)],
                [Paragraph(format_currency(daily_avg, currency), styles['CardValue'])],
                [Paragraph("Daily Avg Spend", styles['CardLabel'])],
                [Paragraph(f"(over {num_days} days)", styles['Small'])],
            ], colWidths=[125]),
            # Transaction Count Card
            Table([
                [create_icon_cell("#", SECONDARY_COLOR, colors.white)],
                [Paragraph(str(len(expenses)), styles['CardValue'])],
                [Paragraph("Transactions", styles['CardLabel'])],
                [Paragraph(f"({len(expense_items)} expenses)", styles['Small'])],
            ], colWidths=[125]),
        ]
    ]

    # Style each inner card table
    card_style = TableStyle([
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
    ])

    for card in cards_data[0]:
        card.setStyle(card_style)

    # Create outer container table
    highlights_table = Table(cards_data, colWidths=[128, 128, 128, 128])
    highlights_table.setStyle(TableStyle([
        # Card 1 - Amber (Highest Expense)
        ('BACKGROUND', (0, 0), (0, 0), WARNING_LIGHT),
        ('BOX', (0, 0), (0, 0), 1, colors.HexColor('#FCD34D')),
        # Card 2 - Green/Red (Savings)
        ('BACKGROUND', (1, 0), (1, 0), SUCCESS_LIGHT if savings >= 0 else DANGER_LIGHT),
        ('BOX', (1, 0), (1, 0), 1, colors.HexColor('#BBF7D0') if savings >= 0 else colors.HexColor('#FECACA')),
        # Card 3 - Indigo (Daily Average)
        ('BACKGROUND', (2, 0), (2, 0), PRIMARY_LIGHT),
        ('BOX', (2, 0), (2, 0), 1, colors.HexColor('#C7D2FE')),
        # Card 4 - Gray (Transactions)
        ('BACKGROUND', (3, 0), (3, 0), LIGHT_BG),
        ('BOX', (3, 0), (3, 0), 1, BORDER_COLOR),
        # Padding between cards
        ('LEFTPADDING', (0, 0), (-1, -1), 4),
        ('RIGHTPADDING', (0, 0), (-1, -1), 4),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
    ]))

    elements.append(highlights_table)
    elements.append(Spacer(1, 20))

    return elements


# ============================================================
# SUMMARY SECTION
# ============================================================

def create_summary_section(
    styles: Dict,
    total_income: float,
    total_expense: float,
    total_balance: float,
    currency: str
) -> List:
    """Create the financial summary section with styled boxes."""
    elements = []

    elements.append(Paragraph("Financial Summary", styles['SectionHeader']))

    summary_data = [
        ['Total Income', 'Total Expenses', 'Net Balance'],
        [
            format_currency(total_income, currency),
            format_currency(total_expense, currency),
            format_currency(total_balance, currency)
        ]
    ]

    summary_table = Table(summary_data, colWidths=[160, 160, 160])
    summary_table.setStyle(TableStyle([
        # Header row
        ('FONTNAME', (0, 0), (-1, 0), FONT_BOLD),
        ('FONTSIZE', (0, 0), (-1, 0), 10),
        ('TEXTCOLOR', (0, 0), (-1, 0), TEXT_SECONDARY),
        ('ALIGN', (0, 0), (-1, 0), 'CENTER'),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 8),

        # Value row
        ('FONTNAME', (0, 1), (-1, 1), FONT_BOLD),
        ('FONTSIZE', (0, 1), (-1, 1), 18),
        ('ALIGN', (0, 1), (-1, 1), 'CENTER'),
        ('TOPPADDING', (0, 1), (-1, 1), 10),
        ('BOTTOMPADDING', (0, 1), (-1, 1), 12),

        # Colors
        ('TEXTCOLOR', (0, 1), (0, 1), SUCCESS_COLOR),
        ('TEXTCOLOR', (1, 1), (1, 1), DANGER_COLOR),
        ('TEXTCOLOR', (2, 1), (2, 1), SUCCESS_COLOR if total_balance >= 0 else DANGER_COLOR),

        # Backgrounds
        ('BACKGROUND', (0, 0), (0, 1), SUCCESS_LIGHT),
        ('BACKGROUND', (1, 0), (1, 1), DANGER_LIGHT),
        ('BACKGROUND', (2, 0), (2, 1), PRIMARY_LIGHT),

        # Borders
        ('BOX', (0, 0), (0, 1), 1.5, colors.HexColor('#BBF7D0')),
        ('BOX', (1, 0), (1, 1), 1.5, colors.HexColor('#FECACA')),
        ('BOX', (2, 0), (2, 1), 1.5, colors.HexColor('#C7D2FE')),

        # Padding
        ('LEFTPADDING', (0, 0), (-1, -1), 15),
        ('RIGHTPADDING', (0, 0), (-1, -1), 15),
    ]))

    elements.append(summary_table)
    elements.append(Spacer(1, 20))

    return elements


# ============================================================
# CATEGORY BREAKDOWN WITH PIE CHART
# ============================================================

def create_category_breakdown(
    styles: Dict,
    category_totals: Dict[str, float],
    currency: str
) -> List:
    """Create the category breakdown section with pie chart."""
    elements = []

    if not category_totals:
        return elements

    elements.append(Paragraph("Spending by Category", styles['SectionHeader']))

    # Create pie chart
    chart_buffer = create_pie_chart(category_totals, currency)

    # Sort categories by amount
    sorted_categories = sorted(
        category_totals.items(),
        key=lambda x: x[1],
        reverse=True
    )
    total_spent = sum(category_totals.values())

    # Build table data
    table_data = [['Category', 'Amount', '%']]
    for category, amount in sorted_categories:
        percentage = (amount / total_spent * 100) if total_spent > 0 else 0
        table_data.append([
            category,
            format_currency(amount, currency),
            f"{percentage:.1f}%"
        ])
    table_data.append(['Total', format_currency(total_spent, currency), '100%'])

    category_table = Table(table_data, colWidths=[120, 100, 50])
    category_table.setStyle(TableStyle([
        # Header
        ('FONTNAME', (0, 0), (-1, 0), FONT_BOLD),
        ('FONTSIZE', (0, 0), (-1, 0), 9),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('BACKGROUND', (0, 0), (-1, 0), PRIMARY_COLOR),
        ('ALIGN', (0, 0), (-1, 0), 'CENTER'),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 8),
        ('TOPPADDING', (0, 0), (-1, 0), 8),

        # Data rows
        ('FONTNAME', (0, 1), (-1, -2), FONT_REGULAR),
        ('FONTSIZE', (0, 1), (-1, -2), 9),
        ('TEXTCOLOR', (0, 1), (-1, -2), TEXT_PRIMARY),
        ('ALIGN', (1, 1), (-1, -1), 'RIGHT'),
        ('ALIGN', (0, 1), (0, -1), 'LEFT'),
        ('BOTTOMPADDING', (0, 1), (-1, -1), 6),
        ('TOPPADDING', (0, 1), (-1, -1), 6),

        # Total row
        ('FONTNAME', (0, -1), (-1, -1), FONT_BOLD),
        ('BACKGROUND', (0, -1), (-1, -1), LIGHT_BG),
        ('LINEABOVE', (0, -1), (-1, -1), 1, BORDER_COLOR),

        # Alternating colors
        ('ROWBACKGROUNDS', (0, 1), (-1, -2), [colors.white, LIGHT_BG]),

        # Grid
        ('GRID', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
        ('BOX', (0, 0), (-1, -1), 1, PRIMARY_COLOR),

        # Padding
        ('LEFTPADDING', (0, 0), (-1, -1), 10),
        ('RIGHTPADDING', (0, 0), (-1, -1), 10),
    ]))

    # Create side-by-side layout with chart and table
    if chart_buffer:
        chart_image = Image(chart_buffer, width=220, height=180)
        layout_data = [[chart_image, category_table]]
        layout_table = Table(layout_data, colWidths=[240, 280])
        layout_table.setStyle(TableStyle([
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('ALIGN', (0, 0), (0, 0), 'CENTER'),
            ('LEFTPADDING', (0, 0), (-1, -1), 5),
            ('RIGHTPADDING', (0, 0), (-1, -1), 5),
        ]))
        elements.append(layout_table)
    else:
        elements.append(category_table)

    elements.append(Spacer(1, 20))

    return elements


# ============================================================
# TRANSACTIONS TABLE WITH CONDITIONAL STYLING
# ============================================================

def create_transactions_table(
    styles: Dict,
    expenses: List[Dict[str, Any]],
    currency: str
) -> List:
    """Create the detailed transactions table with conditional coloring."""
    elements = []

    elements.append(Paragraph("Transaction Details", styles['SectionHeader']))

    if not expenses:
        elements.append(Paragraph(
            "No transactions found for this period.",
            styles['Normal']
        ))
        return elements

    # Table header
    table_data = [['Date', 'Description', 'Category', 'Type', 'Amount']]

    for expense in expenses:
        date_str = expense.get('date_added', '')
        if date_str:
            try:
                date_obj = datetime.fromisoformat(date_str.replace('Z', '+00:00'))
                date_str = date_obj.strftime('%b %d, %Y')
            except:
                date_str = date_str[:10]

        exp_type = expense.get('type', 'expense')
        amount = expense.get('amount', 0)
        is_income = exp_type == 'income'

        # Format amount with color coding via Paragraph
        amount_str = format_currency_with_sign(amount, currency, is_income)
        amount_color = SUCCESS_COLOR if is_income else DANGER_COLOR
        amount_para = Paragraph(
            f'<font color="{amount_color.hexval()}">{amount_str}</font>',
            ParagraphStyle('Amount', fontName=FONT_BOLD, fontSize=9, alignment=TA_RIGHT)
        )

        # Type with color
        type_color = SUCCESS_COLOR if is_income else DANGER_COLOR
        type_para = Paragraph(
            f'<font color="{type_color.hexval()}">{exp_type.capitalize()}</font>',
            ParagraphStyle('Type', fontName=FONT_REGULAR, fontSize=9, alignment=TA_CENTER)
        )

        table_data.append([
            date_str,
            expense.get('item_name', '')[:28],
            expense.get('category', ''),
            type_para,
            amount_para
        ])

    # Create table
    transactions_table = Table(
        table_data,
        colWidths=[65, 150, 85, 55, 95],
        repeatRows=1
    )

    transactions_table.setStyle(TableStyle([
        # Header
        ('FONTNAME', (0, 0), (-1, 0), FONT_BOLD),
        ('FONTSIZE', (0, 0), (-1, 0), 9),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('BACKGROUND', (0, 0), (-1, 0), PRIMARY_COLOR),
        ('ALIGN', (0, 0), (-1, 0), 'CENTER'),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 8),
        ('TOPPADDING', (0, 0), (-1, 0), 8),

        # Data rows
        ('FONTNAME', (0, 1), (2, -1), FONT_REGULAR),
        ('FONTSIZE', (0, 1), (2, -1), 9),
        ('TEXTCOLOR', (0, 1), (2, -1), TEXT_PRIMARY),
        ('ALIGN', (0, 1), (0, -1), 'LEFT'),
        ('ALIGN', (1, 1), (1, -1), 'LEFT'),
        ('ALIGN', (2, 1), (2, -1), 'CENTER'),
        ('BOTTOMPADDING', (0, 1), (-1, -1), 6),
        ('TOPPADDING', (0, 1), (-1, -1), 6),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),

        # Alternating colors
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, LIGHT_BG]),

        # Grid
        ('GRID', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
        ('BOX', (0, 0), (-1, -1), 1, PRIMARY_COLOR),

        # Padding
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ('RIGHTPADDING', (0, 0), (-1, -1), 6),
    ]))

    elements.append(transactions_table)
    elements.append(Spacer(1, 15))

    return elements


# ============================================================
# REPORT HEADER
# ============================================================

def create_header(styles: Dict, user_name: str, report_date: str, period: str) -> List:
    """Create the report header with branding."""
    elements = []

    # Title
    elements.append(Paragraph("ExpenseSnap", styles['Title']))
    elements.append(Paragraph("Monthly Expense Report", styles['Subtitle']))

    # Divider
    elements.append(HRFlowable(
        width="100%",
        thickness=2,
        color=PRIMARY_COLOR,
        spaceAfter=12
    ))

    # Metadata table
    meta_data = [
        ['Account Holder:', user_name, 'Report Period:', period],
        ['Generated On:', report_date, '', ''],
    ]

    meta_table = Table(meta_data, colWidths=[90, 150, 90, 150])
    meta_table.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (0, -1), FONT_BOLD),
        ('FONTNAME', (2, 0), (2, -1), FONT_BOLD),
        ('FONTNAME', (1, 0), (1, -1), FONT_REGULAR),
        ('FONTNAME', (3, 0), (3, -1), FONT_REGULAR),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('TEXTCOLOR', (0, 0), (0, -1), TEXT_SECONDARY),
        ('TEXTCOLOR', (2, 0), (2, -1), TEXT_SECONDARY),
        ('TEXTCOLOR', (1, 0), (1, -1), TEXT_PRIMARY),
        ('TEXTCOLOR', (3, 0), (3, -1), TEXT_PRIMARY),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
    ]))
    elements.append(meta_table)
    elements.append(Spacer(1, 15))

    return elements


# ============================================================
# MAIN REPORT GENERATOR
# ============================================================

def generate_expense_report(
    user_name: str,
    expenses: List[Dict[str, Any]],
    total_income: float,
    total_expense: float,
    total_balance: float,
    category_totals: Dict[str, float],
    currency: str,
    period: str = "This Month"
) -> BytesIO:
    """
    Generate a complete PDF expense report.

    Args:
        user_name: Name of the account holder
        expenses: List of expense dictionaries
        total_income: Total income amount
        total_expense: Total expense amount
        total_balance: Net balance
        category_totals: Dictionary of category to total amounts
        currency: Currency code
        period: Report period description

    Returns:
        BytesIO buffer containing the PDF
    """
    buffer = BytesIO()

    # Get custom styles
    styles = create_styles()

    # Build the report elements
    elements = []
    report_date = datetime.now().strftime("%B %d, %Y at %I:%M %p")

    # Header
    elements.extend(create_header(styles, user_name, report_date, period))

    # Financial Highlights (new!)
    elements.extend(create_financial_highlights(
        styles, expenses, total_income, total_expense, total_balance, currency
    ))

    # Summary section
    elements.extend(create_summary_section(
        styles, total_income, total_expense, total_balance, currency
    ))

    # Category breakdown with pie chart
    if category_totals:
        elements.extend(create_category_breakdown(styles, category_totals, currency))

    # Transactions table
    elements.extend(create_transactions_table(styles, expenses, currency))

    # Create document with custom page template
    def on_first_page(canvas, doc):
        create_header_footer(canvas, doc, user_name, period)

    def on_later_pages(canvas, doc):
        create_header_footer(canvas, doc, user_name, period)

    # Build document
    doc = BaseDocTemplate(
        buffer,
        pagesize=A4,
        rightMargin=MARGIN,
        leftMargin=MARGIN,
        topMargin=MARGIN,
        bottomMargin=50,
        title="ExpenseSnap Monthly Report",
        author="ExpenseSnap"
    )

    # Create frames
    first_frame = Frame(
        MARGIN, 50, PAGE_WIDTH - 2*MARGIN, PAGE_HEIGHT - MARGIN - 50,
        id='first'
    )
    later_frame = Frame(
        MARGIN, 50, PAGE_WIDTH - 2*MARGIN, PAGE_HEIGHT - 60 - 50,
        id='later'
    )

    # Create page templates
    first_template = PageTemplate(
        id='First',
        frames=[first_frame],
        onPage=on_first_page
    )
    later_template = PageTemplate(
        id='Later',
        frames=[later_frame],
        onPage=on_later_pages
    )

    doc.addPageTemplates([first_template, later_template])

    # Add NextPageTemplate to switch after first page
    elements.insert(0, NextPageTemplate('Later'))

    # Build PDF
    doc.build(elements)

    buffer.seek(0)
    return buffer
