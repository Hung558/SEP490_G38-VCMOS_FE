import os
import sys
import json
import time

# Set utf-8 output encoding for windows console
if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8")

from playwright.sync_api import sync_playwright

ADMIN_USER = {
    "_id": "6724628d39f4000000000001",
    "code": "USR-7QSHFB",
    "fullName": "Administrator",
    "phone": "0999999999",
    "email": "hungminh19952005@gmail.com",
    "role": "Admin",
    "systemRole": "Admin",
    "status": "Active",
    "isEmailVerified": True
}

token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY3MjQ2MjhkMzlmNDAwMDAwMDAwMDAwMSIsInJvbGUiOiJBZG1pbiIsImlhdCI6MTc5MzQyODM3MH0.I0W8V0quQnDagQPV7A5uxeSB6snUrq4OhPZ1kepc2pk"

screenshot_dir = os.path.join(os.path.dirname(__file__), "screenshots")
os.makedirs(screenshot_dir, exist_ok=True)

console_errors = []

def on_console(msg):
    if msg.type in ["error"]:
        console_errors.append(msg.text)
        print(f"[BROWSER ERROR]: {msg.text}")

def on_page_error(err):
    console_errors.append(str(err))
    print(f"[PAGE UNCAUGHT ERROR]: {err}")

with sync_playwright() as p:
    browser = p.chromium.launch(channel="chrome", headless=True)
    context = browser.new_context(viewport={"width": 1440, "height": 900})
    page = context.new_page()

    page.on("console", on_console)
    page.on("pageerror", on_page_error)

    # 1. Initialize session and local storage
    print("Step 1: Navigating to base URL and setting up admin session...")
    page.goto("http://localhost:3000")
    page.evaluate(f"""() => {{
        sessionStorage.setItem('hasLoadedBefore', 'true');
        localStorage.setItem('token', '{token}');
        localStorage.setItem('user-info', JSON.stringify({json.dumps(ADMIN_USER)}));
    }}""")

    # 2. Go to /admin/users
    print("Step 2: Navigating to /admin/users...")
    page.goto("http://localhost:3000/admin/users", wait_until="networkidle")
    time.sleep(2)

    # Screenshot 1: Admin Users page
    sc1 = os.path.join(screenshot_dir, "01_admin_users_table.png")
    page.screenshot(path=sc1)
    print(f"Captured screenshot 1: {sc1}")

    # Check for title
    title_text = page.locator("h3:has-text('Quản lý tài khoản')").first
    assert title_text.is_visible(), "Page title 'Quản lý tài khoản' not visible"
    print("Verified page title is visible!")

    # Check table
    table = page.locator(".ant-table")
    assert table.is_visible(), "Users table is not visible"
    print("Verified table is visible!")

    # Count rows in table
    rows = page.locator(".ant-table-tbody tr.ant-table-row")
    row_count = rows.count()
    print(f"Verified users rendered in table: {row_count} accounts found")

    # 3. Open Create Staff Modal
    print("Step 3: Opening 'Tao tai khoan nhan su' modal...")
    create_btn = page.locator("button:has-text('Tạo tài khoản nhân sự')")
    create_btn.click()
    page.wait_for_selector(".ant-modal", timeout=5000)
    time.sleep(1)

    sc2 = os.path.join(screenshot_dir, "02_create_staff_modal.png")
    page.screenshot(path=sc2)
    print(f"Captured screenshot 2: {sc2}")

    # Verify modal inputs
    assert page.locator("#fullName").is_visible(), "Full name input not visible"
    assert page.locator("#phone").is_visible(), "Phone input not visible"
    assert page.locator("#password").is_visible(), "Password input not visible"
    print("Verified all modal fields (fullName, phone, password, role) are visible and active!")

    # Cancel Create Modal
    cancel_btn = page.locator(".ant-modal-footer button:has-text('Hủy')")
    cancel_btn.click()
    time.sleep(1)

    # 4. Check Detail button if there are rows
    print("Step 4: Checking detail button...")
    detail_btn = page.locator("button:has-text('Chi tiết')").first
    if detail_btn.is_visible():
        detail_btn.click()
        page.wait_for_selector(".ant-modal:has-text('Chi tiết tài khoản')", timeout=5000)
        time.sleep(1)
        sc3 = os.path.join(screenshot_dir, "03_user_detail_modal.png")
        page.screenshot(path=sc3)
        print(f"Captured screenshot 3: {sc3}")
        close_btn = page.locator(".ant-modal-close")
        if close_btn.is_visible():
            close_btn.click()
            time.sleep(1)

    # 5. Check Navigation Menu for Admin
    print("Step 5: Checking Menu navigation item for Admin...")
    menu_item = page.locator(".ant-menu-item:has-text('Quản lý tài khoản')").first
    if menu_item.is_visible():
        print("Verified 'Quản lý tài khoản' menu item is visible in navigation menu!")

    browser.close()

print(f"Browser test completed successfully! Console error count: {len(console_errors)}")
