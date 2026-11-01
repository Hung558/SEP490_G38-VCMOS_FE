import os
import sys
import time

if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8")

from playwright.sync_api import sync_playwright

ARTIFACT_DIR = "C:/Users/Asus/.gemini/antigravity/brain/2b391f3f-33be-4539-96e0-85cb3445bf25"
os.makedirs(ARTIFACT_DIR, exist_ok=True)

with sync_playwright() as p:
    browser = p.chromium.launch(channel="chrome", headless=True)
    page = browser.new_page(viewport={"width": 1440, "height": 900})

    print("1. Opening Homepage http://localhost:3000/ ...")
    page.goto("http://localhost:3000/")
    time.sleep(2)

    # Scroll to Services section
    print("2. Checking Services Section (#services)...")
    page.locator("#services").scroll_into_view_if_needed()
    time.sleep(1)

    h3_elements = page.locator("#services h3")
    service_count = h3_elements.count()
    print(f"Total services loaded from API: {service_count}")

    for i in range(service_count):
        title = h3_elements.nth(i).inner_text()
        print(f"  Service {i + 1}: {title}")

    page.screenshot(path=f"{ARTIFACT_DIR}/verify_homepage_real_services.png")
    print("Saved screenshot: verify_homepage_real_services.png")

    # Scroll to QuickBooking section
    print("3. Checking Quick Booking Section (#quick-booking)...")
    page.locator("#quick-booking").scroll_into_view_if_needed()
    time.sleep(1)

    qb_names = page.locator("#quick-booking .srv-item .name")
    qb_count = qb_names.count()
    print(f"Total quick booking services rendered: {qb_count}")
    for i in range(qb_count):
        title = qb_names.nth(i).inner_text()
        print(f"  QB Service {i + 1}: {title}")

    page.screenshot(path=f"{ARTIFACT_DIR}/verify_homepage_quick_booking_services.png")
    print("Saved screenshot: verify_homepage_quick_booking_services.png")

    assert service_count == 4, f"Expected 4 active services from API, got {service_count}"
    assert qb_count == 4, f"Expected 4 active services in QuickBooking, got {qb_count}"

    print("=== HOMEPAGE API SERVICES VERIFIED SUCCESSFULLY ===")
    browser.close()
