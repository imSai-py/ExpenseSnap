#!/usr/bin/env python3
"""
VAPID Key Verification Script for ExpenseSnap

This script verifies that VAPID keys are correctly configured
across Vercel (frontend) and Render (backend).

Usage:
    python verify_vapid.py
"""

import requests
import sys

# Configuration
RENDER_BACKEND_URL = "https://expensesnap-crp6.onrender.com"
VERCEL_FRONTEND_URL = "https://expense-snap-chi.vercel.app"

def get_backend_vapid_key():
    """Fetch VAPID public key from Render backend."""
    print("🔍 Fetching VAPID key from Render backend...")
    try:
        # We need to be logged in, but the VAPID endpoint should work
        response = requests.get(
            f"{RENDER_BACKEND_URL}/api/push/vapid-public-key",
            headers={"Accept": "application/json"},
            timeout=10
        )

        if response.status_code == 200:
            data = response.json()
            if data.get("success") and data.get("vapid_public_key"):
                key = data["vapid_public_key"]
                print(f"   ✅ Backend VAPID key: {key[:40]}...")
                return key
            else:
                print(f"   ❌ Backend error: {data.get('error', 'Unknown')}")
                return None
        else:
            print(f"   ❌ HTTP {response.status_code}: {response.text[:100]}")
            return None
    except Exception as e:
        print(f"   ❌ Error: {e}")
        return None

def check_frontend_config():
    """Check if frontend is accessible and configured."""
    print("\n🔍 Checking Vercel frontend...")
    try:
        response = requests.get(VERCEL_FRONTEND_URL, timeout=10)
        if response.status_code == 200:
            print(f"   ✅ Frontend is accessible")
            return True
        else:
            print(f"   ❌ HTTP {response.status_code}")
            return False
    except Exception as e:
        print(f"   ❌ Error: {e}")
        return False

def check_service_worker():
    """Check if service worker is accessible."""
    print("\n🔍 Checking service worker...")
    try:
        response = requests.get(f"{VERCEL_FRONTEND_URL}/sw.js", timeout=10)
        if response.status_code == 200:
            content = response.text
            if "expensesnap-crp6.onrender.com" in content:
                print("   ✅ Service worker has production API URL")
            elif "getApiBaseUrl" in content:
                print("   ✅ Service worker has dynamic API URL detection")
            else:
                print("   ⚠️  Service worker may be using relative URLs")
            return True
        else:
            print(f"   ❌ HTTP {response.status_code}")
            return False
    except Exception as e:
        print(f"   ❌ Error: {e}")
        return False

def check_cors():
    """Check CORS configuration for push endpoints."""
    print("\n🔍 Checking CORS configuration...")
    try:
        response = requests.options(
            f"{RENDER_BACKEND_URL}/api/push/subscribe",
            headers={
                "Origin": VERCEL_FRONTEND_URL,
                "Access-Control-Request-Method": "POST",
                "Access-Control-Request-Headers": "Content-Type"
            },
            timeout=10
        )

        cors_origin = response.headers.get("Access-Control-Allow-Origin", "")
        cors_credentials = response.headers.get("Access-Control-Allow-Credentials", "")

        if VERCEL_FRONTEND_URL in cors_origin or cors_origin == "*":
            print(f"   ✅ CORS allows origin: {cors_origin}")
        else:
            print(f"   ❌ CORS origin mismatch: {cors_origin}")

        if cors_credentials.lower() == "true":
            print("   ✅ CORS allows credentials")
        else:
            print("   ⚠️  CORS credentials not explicitly allowed")

        return True
    except Exception as e:
        print(f"   ❌ Error: {e}")
        return False

def main():
    print("=" * 60)
    print("VAPID & Push Notification Verification")
    print("=" * 60)
    print(f"\nBackend:  {RENDER_BACKEND_URL}")
    print(f"Frontend: {VERCEL_FRONTEND_URL}")
    print()

    # Check backend VAPID key
    backend_key = get_backend_vapid_key()

    # Check frontend
    check_frontend_config()

    # Check service worker
    check_service_worker()

    # Check CORS
    check_cors()

    # Summary
    print("\n" + "=" * 60)
    print("SUMMARY")
    print("=" * 60)

    if backend_key:
        print("\n✅ Backend VAPID key is configured")
        print(f"\nVAPID_PUBLIC_KEY (for Vercel):")
        print(backend_key)
        print("\nMake sure this EXACT key is set as VITE_VAPID_PUBLIC_KEY in Vercel!")
    else:
        print("\n❌ Backend VAPID key is NOT configured")
        print("   Add VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY to Render environment variables")

    print()

if __name__ == "__main__":
    main()
