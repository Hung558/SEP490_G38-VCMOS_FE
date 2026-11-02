import os
import sys
import json
import time

if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8")

from playwright.sync_api import sync_playwright

ADMIN_USER = {
    "_id": "6ae08782e8d80a9c29e52096",
    "code": "USR-7QSHFB",
    "fullName": "Hà Duy Hưng",
    "phone": "0999999999",
    "email": "hungminh19952005@gmail.com",
    "isEmailVerified": True,
    "role": "Admin",
    "status": "Active"
}

PET_OWNER_USER = {
    "_id": "6724628d39f4000000000002",
    "code": "USR-PETOWNER",
    "fullName": "Khách hàng Test",
    "phone": "0911222333",
    "email": "petowner@vcmos.vn",
    "isEmailVerified": True,
    "role": "PetOwner",
    "status": "Active"
}

screenshot_dir = r"C:\Users\Asus\.gemini\antigravity\brain\2b391f3f-33be-4539-96e0-85cb3445bf25"
os.makedirs(screenshot_dir, exist_ok=True)

console_errors = []

def on_console(msg):
    if msg.type in ["error"]:
        if "favicon" not in msg.text.lower():
            console_errors.append(msg.text)
            print(f"[BROWSER ERROR]: {msg.text}")

def on_page_error(err):
    console_errors.append(str(err))
    print(f"[PAGE UNCAUGHT ERROR]: {err}")

with sync_playwright() as p:
    browser = p.chromium.launch(channel="chrome", headless=True)

    print("\n--- STAGE 1: Route Guards & Access Control ---")
    context = browser.new_context(viewport={"width": 1440, "height": 900})
    page = context.new_page()
    page.on("console", on_console)
    page.on("pageerror", on_page_error)

    # 1.1 Unauthenticated access to /admin/products
    print("Test 1.1: Unauthenticated access to /admin/products...")
    page.goto("http://localhost:3000/admin/products", wait_until="networkidle")
    time.sleep(1)
    current_url = page.url
    assert "/admin/products" not in current_url, f"Unauthenticated user should be redirected, got {current_url}"
    print(f"Passed: Redirected to {current_url}")

    # 1.2 PetOwner access to /admin/products
    print("Test 1.2: PetOwner access to /admin/products...")
    page.evaluate(f"""() => {{
        sessionStorage.setItem('hasLoadedBefore', 'true');
        sessionStorage.setItem('email-notice-dismissed', 'true');
        localStorage.setItem('token', 'dummy_token');
        localStorage.setItem('user-info', JSON.stringify({json.dumps(PET_OWNER_USER)}));
    }}""")
    page.goto("http://localhost:3000/admin/products", wait_until="networkidle")
    time.sleep(1)
    current_url = page.url
    assert "/admin/products" not in current_url, f"PetOwner should not access /admin/products, got {current_url}"
    print(f"Passed: PetOwner redirected to {current_url}")
    context.close()

    print("\n--- STAGE 2: Admin Live Login & Navigation ---")
    context = browser.new_context(viewport={"width": 1440, "height": 900})
    page = context.new_page()
    page.on("console", on_console)
    page.on("pageerror", on_page_error)

    # Log in via UI
    page.goto("http://localhost:3000/login", wait_until="networkidle")
    time.sleep(1)

    print("Logging in with Admin (0999999999)...")
    page.locator("#identifier").fill("0999999999")
    page.locator("#password").fill("123456789")
    page.locator("button[type='submit']:has-text('Đăng nhập')").first.click()

    page.wait_for_url("**/admin/**", timeout=10000)
    print(f"Logged in successfully! Current URL: {page.url}")
    time.sleep(1.5)

    # Check Sidebar menu item
    print("Verifying Sidebar menu contains 'Quản lý sản phẩm'...")
    product_menu = page.locator(".ant-menu-item:has-text('Quản lý sản phẩm')").first
    product_menu.wait_for(state="visible", timeout=5000)
    assert product_menu.is_visible(), "Sidebar menu item 'Quản lý sản phẩm' must be visible"
    print("Passed: 'Quản lý sản phẩm' menu item is visible!")

    # Click to navigate to /admin/products
    product_menu.click()
    page.wait_for_url("**/admin/products", timeout=5000)
    time.sleep(1.5)
    print("Navigated to /admin/products!")

    print("\n--- STAGE 3: Table Display & Layout Verification ---")
    title = page.locator("h3:has-text('Quản lý sản phẩm')")
    assert title.is_visible(), "Title 'Quản lý sản phẩm' must be visible"
    print("Passed: Title is visible.")

    add_btn = page.locator("button:has-text('Thêm sản phẩm')").first
    assert add_btn.is_visible(), "'Thêm sản phẩm' button must be visible"
    print("Passed: 'Thêm sản phẩm' button is visible.")

    screenshot_list_path = os.path.join(screenshot_dir, "verify_admin_products_list.png")
    page.screenshot(path=screenshot_list_path, full_page=True)
    print(f"Screenshot saved: {screenshot_list_path}")

    print("\n--- STAGE 4: Create Product Modal & Validation ---")
    add_btn.click()
    time.sleep(0.5)

    modal_title = page.locator(".ant-modal-title:has-text('Thêm sản phẩm mới')")
    assert modal_title.is_visible(), "Modal 'Thêm sản phẩm mới' must be visible"
    print("Passed: Modal opened.")

    # Test client-side validation
    ok_btn = page.locator(".ant-modal-footer button:has-text('Tạo sản phẩm')").first
    ok_btn.click()
    time.sleep(0.5)

    name_err = page.locator(".ant-form-item-explain-error:has-text('Tên sản phẩm là bắt buộc')")
    assert name_err.is_visible(), "Name validation error must be displayed"
    print("Passed: Form validation works properly.")

    # Fill in test product
    test_prod_name = f"Paracetamol Test {int(time.time())}"
    print(f"Creating product: {test_prod_name}...")
    page.locator("#name").fill(test_prod_name)
    
    # Select category Medicine inside modal
    modal = page.locator(".ant-modal")
    modal.locator(".ant-select").click()
    time.sleep(0.5)
    page.locator(".ant-select-dropdown:not(.ant-select-dropdown-hidden) .ant-select-item-option-content:has-text('Thuốc điều trị')").first.click()
    time.sleep(0.3)
    
    # Fill unit & unitPrice inside modal
    modal.locator("#unit").fill("Vỉ 10 viên")
    modal.locator("#unitPrice").fill("35000")

    screenshot_modal_path = os.path.join(screenshot_dir, "verify_admin_products_modal.png")
    page.screenshot(path=screenshot_modal_path)
    print(f"Screenshot saved: {screenshot_modal_path}")

    ok_btn.click()
    time.sleep(2)

    # Verify created product is in table
    print("Checking created product in table...")
    created_row = page.locator(f"tr:has-text('{test_prod_name}')")
    created_row.wait_for(state="visible", timeout=5000)
    assert created_row.is_visible(), f"Row for {test_prod_name} should appear in table"
    print("Passed: Product created and displayed in table!")

    print("\n--- STAGE 5: Product Detail Modal ---")
    detail_btn = created_row.locator("button:has-text('Chi tiết')")
    detail_btn.click()
    time.sleep(1)

    detail_modal = page.locator(".ant-modal-title:has-text('Chi tiết sản phẩm')")
    assert detail_modal.is_visible(), "Detail modal must be visible"
    print("Passed: Detail modal opened.")

    screenshot_detail_path = os.path.join(screenshot_dir, "verify_admin_products_detail.png")
    page.screenshot(path=screenshot_detail_path)
    print(f"Screenshot saved: {screenshot_detail_path}")

    # Close detail modal
    page.locator(".ant-modal-close").click()
    time.sleep(0.5)

    print("\n--- STAGE 6: Toggle Status ---")
    toggle_btn = created_row.locator("button:has-text('Ngừng kinh doanh')")
    assert toggle_btn.is_visible(), "'Ngừng kinh doanh' button should be visible"
    toggle_btn.click()
    time.sleep(0.5)

    confirm_popconfirm = page.locator(".ant-popconfirm button:has-text('Ngừng kinh doanh')").first
    confirm_popconfirm.click()
    time.sleep(2)

    # Now verify button says "Kích hoạt"
    activate_btn = created_row.locator("button:has-text('Kích hoạt')")
    activate_btn.wait_for(state="visible", timeout=5000)
    assert activate_btn.is_visible(), "Status button should now say 'Kích hoạt'"
    print("Passed: Inactivation toggled successfully!")

    # Reactivate
    activate_btn.click()
    time.sleep(0.5)
    page.locator(".ant-popconfirm button:has-text('Kích hoạt')").first.click()
    time.sleep(2)

    active_tag = created_row.locator(".ant-tag:has-text('Đang kinh doanh')")
    active_tag.wait_for(state="visible", timeout=5000)
    assert active_tag.is_visible(), "Product status should be 'Đang kinh doanh' again"
    print("Passed: Product reactivated successfully!")

    print("\n==========================================")
    print("ALL PRODUCT MANAGEMENT E2E TESTS PASSED!")
    print("==========================================")
    browser.close()
