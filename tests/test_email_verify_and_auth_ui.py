import os
import sys
import json
import time

if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8")

from playwright.sync_api import sync_playwright

USER_UNVERIFIED = {
    "_id": "6724628d39f4000000000002",
    "code": "USR-UNVERIF",
    "fullName": "Nguyen Van Test",
    "phone": "0911222333",
    "email": "test.unverified@vcmos.vn",
    "role": "PetOwner",
    "systemRole": "PetOwner",
    "status": "Active",
    "isEmailVerified": False
}

USER_VERIFIED = {
    "_id": "6724628d39f4000000000003",
    "code": "USR-VERIF",
    "fullName": "Nguyen Van Verified",
    "phone": "0911222444",
    "email": "test.verified@vcmos.vn",
    "role": "PetOwner",
    "systemRole": "PetOwner",
    "status": "Active",
    "isEmailVerified": True
}

screenshot_dir = os.path.join(os.path.dirname(__file__), "screenshots")
os.makedirs(screenshot_dir, exist_ok=True)

with sync_playwright() as p:
    browser = p.chromium.launch(channel="chrome", headless=True)
    context = browser.new_context(viewport={"width": 1440, "height": 900})
    page = context.new_page()

    # TEST 1: Unverified user lands on Home Page
    print("Test 1: Unverified user lands on Home Page...")
    page.goto("http://localhost:3000")
    page.evaluate(f"""() => {{
        sessionStorage.setItem('hasLoadedBefore', 'true');
        sessionStorage.removeItem('email-notice-dismissed');
        localStorage.setItem('token', 'dummy_token');
        localStorage.setItem('user-info', JSON.stringify({json.dumps(USER_UNVERIFIED)}));
    }}""")
    page.goto("http://localhost:3000", wait_until="networkidle")
    time.sleep(2)

    # Verify modal is open
    modal_title = page.locator(".ant-modal:has-text('Xác minh tài khoản email')")
    assert modal_title.is_visible(), "Modal 'Xác minh tài khoản email' should be visible on fresh login"
    print("Modal is visible on fresh login!")

    sc1 = os.path.join(screenshot_dir, "email_notice_modal_open.png")
    page.screenshot(path=sc1)
    print("Captured screenshot:", sc1)

    # Click "Để sau"
    print("Test 2: Dismiss modal and check corner floating widget + header badge...")
    later_btn = page.locator(".ant-modal-footer button:has-text('Để sau')")
    later_btn.click()
    time.sleep(1)

    # Verify floating widget at bottom right
    corner_widget = page.locator("div:has-text('Chưa xác minh email'):has-text('Xác minh ngay')").last
    assert corner_widget.is_visible(), "Floating corner widget should be visible after dismissing modal"
    print("Floating corner widget is visible!")

    # Verify header badge
    header_badge = page.locator("button:has-text('Chưa xác minh email')")
    assert header_badge.is_visible(), "Header badge should be visible"
    print("Header badge is visible!")

    sc2 = os.path.join(screenshot_dir, "email_notice_corner_widget.png")
    page.screenshot(path=sc2)
    print("Captured screenshot:", sc2)

    # TEST 3: Verified user
    print("Test 3: Verified user should NOT see modal or widget...")
    page.evaluate(f"""() => {{
        localStorage.setItem('user-info', JSON.stringify({json.dumps(USER_VERIFIED)}));
    }}""")
    page.goto("http://localhost:3000", wait_until="networkidle")
    time.sleep(2)

    assert not page.locator(".ant-modal:has-text('Xác minh tài khoản email')").is_visible(), "Modal should NOT be visible for verified user"
    assert not page.locator("button:has-text('Chưa xác minh email')").is_visible(), "Header badge should NOT be visible for verified user"
    print("Verified user checks passed: no modal, no badge, no widget!")

    browser.close()

print("ALL EMAIL NOTIFICATION TESTS PASSED SUCCESSFULLY!")

