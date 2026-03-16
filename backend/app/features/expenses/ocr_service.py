"""
OCR Service for receipt scanning using Google Gemini Vision API.

Uses the multimodal capabilities of Gemini to extract expense data
from receipt/bill images without requiring Tesseract or other OCR libraries.
"""
import os
import json
import base64
import logging
from typing import Optional, Dict, Any, List

logger = logging.getLogger(__name__)

# System prompt for receipt parsing
RECEIPT_PARSE_PROMPT = """You are a receipt/bill OCR parser for an expense tracking app called ExpenseSnap.

Your job is to extract expense information from receipt or bill images.

RULES:
1. Extract ALL line items from the receipt if there are multiple items
2. If there's a clear total, also create a single summary entry with the total
3. For single-item receipts or simple bills, just extract the one item
4. Identify the merchant/store name and use it as part of the item description
5. Detect the currency from the receipt (symbols like ₹, $, €, £, or text like INR, USD, etc.)
6. Categorize each item into one of these categories: Food, Shopping, Transport, Entertainment, Bills, Health, Housing, Other
7. Try to extract the date from the receipt. Use format YYYY-MM-DD
8. If the receipt is unclear or not a valid receipt, set has_items to false

RESPONSE FORMAT (JSON only, no markdown):
{
    "has_items": true,
    "merchant": "Store/Restaurant Name",
    "date": "2024-01-15",
    "currency": "INR",
    "items": [
        {
            "item_name": "Merchant - Item description",
            "amount": 150.00,
            "category": "Food",
            "type": "expense"
        }
    ],
    "total": 150.00,
    "confidence": "high"
}

If the image is NOT a receipt or bill:
{
    "has_items": false,
    "error": "This doesn't appear to be a receipt or bill",
    "confidence": "low"
}

confidence can be: "high", "medium", "low"
- high: Clear receipt with readable text
- medium: Partially readable, some items may be inaccurate
- low: Very unclear, results may not be reliable

IMPORTANT: Return ONLY valid JSON. No markdown, no code fences, no explanations."""


class ReceiptOCRService:
    """Service for extracting expense data from receipt images using Gemini Vision."""

    def __init__(self):
        self._model = None

    def _get_model(self):
        """Lazy-initialize the Gemini Vision model."""
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
                system_instruction=RECEIPT_PARSE_PROMPT
            )

        return self._model

    def scan_receipt(self, image_data: bytes, mime_type: str = 'image/jpeg') -> Dict[str, Any]:
        """
        Scan a receipt image and extract expense data.

        Args:
            image_data: Raw image bytes
            mime_type: MIME type of the image (image/jpeg, image/png, etc.)

        Returns:
            Dictionary with parsed receipt data
        """
        try:
            import google.generativeai as genai

            model = self._get_model()

            # Create image part for Gemini
            image_part = {
                'mime_type': mime_type,
                'data': image_data
            }

            # Send image to Gemini for analysis
            response = model.generate_content(
                [
                    "Extract all expense information from this receipt/bill image. Return JSON only.",
                    image_part
                ]
            )

            text = response.text.strip()

            # Clean up markdown code fences if present
            if text.startswith('```'):
                # Remove opening fence (with optional language specifier)
                text = text.split('\n', 1)[1] if '\n' in text else text[3:]
            if text.endswith('```'):
                text = text[:-3]
            text = text.strip()

            # Parse JSON response
            parsed = json.loads(text)

            if not parsed.get('has_items', False):
                return {
                    'success': False,
                    'error': parsed.get('error', 'Could not extract expense data from this image'),
                    'confidence': parsed.get('confidence', 'low')
                }

            # Validate and clean items
            valid_categories = ['Food', 'Shopping', 'Transport', 'Entertainment', 'Bills', 'Health', 'Housing', 'Other']
            validated_items = []

            for item in parsed.get('items', []):
                # Validate required fields
                if not item.get('item_name') or not item.get('amount'):
                    continue

                # Validate amount
                try:
                    amount = float(item['amount'])
                    if amount <= 0:
                        continue
                except (ValueError, TypeError):
                    continue

                # Validate category
                category = item.get('category', 'Other')
                if category not in valid_categories:
                    category = 'Other'

                validated_items.append({
                    'item_name': str(item['item_name']).strip()[:100],
                    'amount': round(amount, 2),
                    'category': category,
                    'type': item.get('type', 'expense')
                })

            if not validated_items:
                return {
                    'success': False,
                    'error': 'No valid expense items found in receipt',
                    'confidence': parsed.get('confidence', 'low')
                }

            return {
                'success': True,
                'merchant': parsed.get('merchant', 'Unknown'),
                'date': parsed.get('date'),
                'currency': parsed.get('currency', 'INR'),
                'items': validated_items,
                'total': parsed.get('total'),
                'confidence': parsed.get('confidence', 'medium'),
                'item_count': len(validated_items)
            }

        except json.JSONDecodeError as e:
            logger.error(f"Receipt OCR JSON parse error: {e}")
            return {
                'success': False,
                'error': 'Failed to parse receipt data. Please try a clearer image.',
                'confidence': 'low'
            }
        except ValueError as e:
            # API key not configured
            return {
                'success': False,
                'error': str(e),
                'confidence': 'low'
            }
        except Exception as e:
            logger.error(f"Receipt OCR error: {e}")
            return {
                'success': False,
                'error': 'Failed to process receipt image. Please try again.',
                'confidence': 'low'
            }


# Singleton instance
receipt_ocr_service = ReceiptOCRService()
