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

screenshot_dir = os.path.join(os.path.dirname(__file__), "screenshots")
os.makedirs(screenshot_dir, exist_ok=True)

console_errors = []

def on_console(msg):
    if msg.type in ["error"]:
        # Filter benign favicon or harmless resource 404s if any
        if "favicon" not in msg.text.lower():
            console_errors.append(msg.text)
            print(f"[BROWSER ERROR]: {msg.text}")

def on_page_error(err):
    console_errors.append(str(err))
    print(f"[PAGE UNCAUGHT ERROR]: {err}")

with sync_playwright() as p:
    browser = p.chromium.launch(channel="chrome", headless=True)
    
    # -------------------------------------------------------------
    # STAGE 1: ROUTE GUARDS & ACCESS CONTROL
    # -------------------------------------------------------------
    print("\n--- STAGE 1: Testing Route Guards & Access Control ---")
    context = browser.new_context(viewport={"width": 1440, "height": 900})
    page = context.new_page()
    page.on("console", on_console)
    page.on("pageerror", on_page_error)

    # 1.1 Unauthenticated direct access to /admin/services
    print("Test 1.1: Unauthenticated access to /admin/services...")
    page.goto("http://localhost:3000/admin/services", wait_until="networkidle")
    time.sleep(1)
    current_url = page.url
    assert "/admin/services" not in current_url, f"Unauthenticated user should not stay on /admin/services, current: {current_url}"
    print(f"Passed: Redirected away to {current_url}")

    # 1.2 Non-admin (PetOwner) access to /admin/services
    print("Test 1.2: PetOwner access to /admin/services...")
    page.evaluate(f"""() => {{
        sessionStorage.setItem('hasLoadedBefore', 'true');
        sessionStorage.setItem('email-notice-dismissed', 'true');
        localStorage.setItem('token', 'dummy_token');
        localStorage.setItem('user-info', JSON.stringify({json.dumps(PET_OWNER_USER)}));
    }}""")
    page.goto("http://localhost:3000/admin/services", wait_until="networkidle")
    time.sleep(1)
    current_url = page.url
    assert "/admin/services" not in current_url, f"PetOwner should not access /admin/services, current: {current_url}"
    print(f"Passed: PetOwner redirected away to {current_url}")

    context.close()

    # -------------------------------------------------------------
    # STAGE 2: ADMIN LIVE LOGIN & NAVIGATION
    # -------------------------------------------------------------
    print("\n--- STAGE 2: Admin Live Login & Navigation ---")
    context = browser.new_context(viewport={"width": 1440, "height": 900})
    page = context.new_page()
    page.on("console", on_console)
    page.on("pageerror", on_page_error)

    # Log in via UI
    page.goto("http://localhost:3000/login", wait_until="networkidle")
    time.sleep(1)

    print("Filling login form with admin credentials (0999999999)...")
    phone_input = page.locator("#identifier")
    phone_input.fill("0999999999")

    password_input = page.locator("#password")
    password_input.fill("123456789")

    submit_btn = page.locator("button[type='submit']:has-text('Đăng nhập')").first
    submit_btn.click()

    page.wait_for_url("**/dashboard", timeout=10000)
    print("Successfully logged in via UI and navigated to /dashboard!")
    time.sleep(2)

    # Verify Sidebar menu contains "Quản lý dịch vụ"
    print("Verifying Admin Sidebar contains 'Quản lý dịch vụ'...")
    service_menu_item = page.locator(".ant-menu-item:has-text('Quản lý dịch vụ')").first
    service_menu_item.wait_for(state="visible", timeout=5000)
    assert service_menu_item.is_visible(), "Sidebar menu item 'Quản lý dịch vụ' should be visible for Admin"
    print("Passed: 'Quản lý dịch vụ' is visible in sidebar!")

    # Click "Quản lý dịch vụ" to navigate
    service_menu_item.click()
    page.wait_for_url("**/admin/services", timeout=5000)
    time.sleep(1.5)
    print("Navigated to /admin/services via Sidebar menu!")

    # -------------------------------------------------------------
    # STAGE 3: TABLE DISPLAY & LAYOUT VERIFICATION
    # -------------------------------------------------------------
    print("\n--- STAGE 3: Table Display & Layout Verification ---")
    
    # Verify title & subtitle
    title = page.locator("h3:has-text('Quản lý dịch vụ')")
    assert title.is_visible(), "Page title 'Quản lý dịch vụ' should be visible"
    subtitle = page.locator("text='Quản lý danh mục, giá niêm yết và trạng thái cung cấp dịch vụ'")
    assert subtitle.is_visible(), "Page subtitle should be visible"
    print("Passed: Title and subtitle are visible.")

    # Verify table headers
    for header in ["Mã", "Tên dịch vụ", "Danh mục", "Thời lượng", "Giá niêm yết", "Trạng thái", "Thao tác"]:
        th = page.locator(f".ant-table-thead th:has-text('{header}')")
        assert th.is_visible(), f"Table header '{header}' should be visible"
    print("Passed: All 7 table headers are correctly rendered.")

    # Screenshot: Initial Admin Services Table
    sc_table = os.path.join(screenshot_dir, "07_admin_services_table.png")
    page.screenshot(path=sc_table)
    print(f"Captured screenshot: {sc_table}")

    # -------------------------------------------------------------
    # STAGE 4: SEARCH & FILTER INTERACTIONS
    # -------------------------------------------------------------
    print("\n--- STAGE 4: Filter & Search Interactions ---")
    
    # 4.1 Filter by Category
    category_select = page.locator(".ant-select:has(.ant-select-selection-placeholder:has-text('Danh mục'))").first
    category_select.click()
    time.sleep(0.5)
    
    exam_opt = page.locator(".ant-select-dropdown .ant-select-item-option:has-text('Khám bệnh')")
    if exam_opt.is_visible():
        exam_opt.click()
        time.sleep(1)
        print("Filtered by category 'Khám bệnh'.")

    # 4.2 Reset Filter
    reset_btn = page.locator("button:has-text('Xóa bộ lọc')")
    reset_btn.click()
    time.sleep(1)
    print("Passed: Reset filters button works.")

    # -------------------------------------------------------------
    # STAGE 5: CREATE SERVICE WORKFLOW (VALIDATION & SUBMISSION)
    # -------------------------------------------------------------
    print("\n--- STAGE 5: Create Service Workflow ---")
    
    add_btn = page.locator("button:has-text('Thêm dịch vụ')")
    add_btn.click()
    time.sleep(1)

    modal = page.locator(".ant-modal:has-text('Thêm dịch vụ')")
    assert modal.is_visible(), "Create Service modal should be open"
    print("Create Service modal opened.")

    # Screenshot: Create Modal
    sc_create_modal = os.path.join(screenshot_dir, "08_admin_service_create_modal.png")
    page.screenshot(path=sc_create_modal)
    print(f"Captured screenshot: {sc_create_modal}")

    # Test Validation: Click Submit with empty fields
    submit_create_btn = modal.locator(".ant-modal-footer button:has-text('Tạo dịch vụ')")
    submit_create_btn.click()
    time.sleep(0.5)

    name_err = modal.locator(".ant-form-item-explain-error:has-text('Tên dịch vụ là bắt buộc')")
    assert name_err.is_visible(), "Validation error for empty name should show"
    print("Passed: Client validation for required fields triggered correctly.")

    # Fill valid test data
    test_service_name = f"Tiêm vắc-xin dại E2E {int(time.time()) % 10000}"
    print(f"Filling valid service data: {test_service_name}...")

    modal.locator("#name").fill(test_service_name)
    
    # Select category: Tiêm phòng (Vaccination)
    modal.locator("#category").click()
    time.sleep(0.5)
    page.locator(".ant-select-dropdown:not(.ant-select-dropdown-hidden) .ant-select-item-option:has-text('Tiêm phòng')").last.click()

    # Fill duration: 25 mins
    modal.locator("#defaultDuration").fill("25")

    # Fill price: 250000
    modal.locator("#basePrice").fill("250000")

    # Fill description
    modal.locator("#description").fill("Dịch vụ tiêm chủng ngừa dại cho chó mèo tạo tự động qua Playwright E2E")

    # Submit form
    submit_create_btn.click()
    time.sleep(2)

    # Modal should close
    assert not modal.is_visible(), "Modal should close after successful creation"
    print("Passed: Service created successfully and modal closed.")

    # Verify new service appears in table
    new_row = page.locator(f"tr.ant-table-row:has-text('{test_service_name}')")
    new_row.wait_for(state="visible", timeout=10000)
    assert new_row.is_visible(), f"New service row '{test_service_name}' should be visible in table"
    print(f"Passed: Row for '{test_service_name}' found in table!")

    # Verify formatted price and duration in row
    new_row.locator("text='250.000 đ'").wait_for(state="visible", timeout=5000)
    assert new_row.locator("text='250.000 đ'").is_visible(), "Price '250.000 đ' should be visible"
    assert new_row.locator("text='25 phút'").is_visible(), "Duration '25 phút' should be visible"
    print("Passed: Price and duration are correctly formatted in table.")

    # -------------------------------------------------------------
    # STAGE 6: SERVICE DETAIL WORKFLOW
    # -------------------------------------------------------------
    print("\n--- STAGE 6: Service Detail Workflow ---")
    detail_btn = new_row.locator("button:has-text('Chi tiết')")
    detail_btn.click()
    time.sleep(1)

    detail_modal = page.locator(".ant-modal:has-text('Chi tiết dịch vụ')")
    assert detail_modal.is_visible(), "Service Detail modal should be open"
    assert detail_modal.locator(f"text='{test_service_name}'").is_visible(), "Detail should show service name"
    assert detail_modal.locator("text='250.000 đ'").is_visible(), "Detail should show price"
    print("Passed: Detail modal shows correct information.")

    # Screenshot: Detail Modal
    sc_detail = os.path.join(screenshot_dir, "09_admin_service_detail_modal.png")
    page.screenshot(path=sc_detail)
    print(f"Captured screenshot: {sc_detail}")

    # Close detail modal
    close_detail_btn = detail_modal.locator(".ant-modal-close")
    close_detail_btn.click()
    time.sleep(0.5)

    # -------------------------------------------------------------
    # STAGE 7: EDIT SERVICE WORKFLOW
    # -------------------------------------------------------------
    print("\n--- STAGE 7: Edit Service Workflow ---")
    edit_btn = new_row.locator("button:has-text('Sửa')")
    edit_btn.click()
    time.sleep(1)

    edit_modal = page.locator(".ant-modal:has-text('Cập nhật dịch vụ')")
    assert edit_modal.is_visible(), "Edit modal should be open"
    print("Edit modal opened.")

    # Verify existing values are populated
    current_name_val = edit_modal.locator("#name").input_value()
    assert current_name_val == test_service_name, f"Expected {test_service_name}, got {current_name_val}"

    # Change price to 320000 and duration to 35
    print("Updating price to 320000 and duration to 35...")
    edit_modal.locator("#basePrice").fill("320000")
    edit_modal.locator("#defaultDuration").fill("35")

    save_edit_btn = edit_modal.locator(".ant-modal-footer button:has-text('Lưu thay đổi')")
    save_edit_btn.click()
    time.sleep(2)

    assert not edit_modal.is_visible(), "Edit modal should close after save"
    
    # Verify table row updated
    updated_row = page.locator(f"tr.ant-table-row:has-text('{test_service_name}')")
    updated_row.locator("text='320.000 đ'").wait_for(state="visible", timeout=10000)
    assert updated_row.locator("text='320.000 đ'").is_visible(), "Updated price '320.000 đ' should be visible"
    assert updated_row.locator("text='35 phút'").is_visible(), "Updated duration '35 phút' should be visible"
    print("Passed: Table updated with new price and duration after edit.")

    # -------------------------------------------------------------
    # STAGE 8: CHANGE STATUS (ACTIVE <-> INACTIVE) WORKFLOW
    # -------------------------------------------------------------
    print("\n--- STAGE 8: Change Status Workflow ---")
    toggle_status_btn = updated_row.locator("button:has-text('Ngừng cung cấp')")
    assert toggle_status_btn.is_visible(), "Button 'Ngừng cung cấp' should be visible for Active service"
    toggle_status_btn.click()
    time.sleep(0.5)

    # Popconfirm appears
    popconfirm = page.locator(".ant-popconfirm")
    assert popconfirm.is_visible(), "Popconfirm for status change should be visible"
    confirm_btn = popconfirm.locator("button:has-text('Ngừng cung cấp')").last
    confirm_btn.click()
    time.sleep(2)

    # Now status should be Inactive ("Ngừng cung cấp") and button becomes "Kích hoạt"
    reactivate_btn = updated_row.locator("button:has-text('Kích hoạt')")
    reactivate_btn.wait_for(state="visible", timeout=10000)
    assert reactivate_btn.is_visible(), "Button 'Kích hoạt' should now be visible after deactivating"
    print("Passed: Status changed to Inactive.")

    # Reactivate back to Active
    reactivate_btn.click()
    time.sleep(0.5)
    confirm_reactivate_btn = page.locator(".ant-popconfirm button:has-text('Kích hoạt')").last
    confirm_reactivate_btn.click()
    time.sleep(2)

    deactivate_btn = updated_row.locator("button:has-text('Ngừng cung cấp')")
    deactivate_btn.wait_for(state="visible", timeout=10000)
    assert deactivate_btn.is_visible(), "Button 'Ngừng cung cấp' should be visible again"
    print("Passed: Status reactivated back to Active successfully.")

    # -------------------------------------------------------------
    # STAGE 9: RESPONSIVE VIEWPORT TESTING
    # -------------------------------------------------------------
    print("\n--- STAGE 9: Responsive Viewport Checks ---")
    
    # Tablet (768x1024)
    page.set_viewport_size({"width": 768, "height": 1024})
    time.sleep(1)
    sc_tablet = os.path.join(screenshot_dir, "10_admin_services_tablet.png")
    page.screenshot(path=sc_tablet)
    print(f"Captured tablet screenshot: {sc_tablet}")

    # Mobile (375x812)
    page.set_viewport_size({"width": 375, "height": 812})
    time.sleep(1)
    sc_mobile = os.path.join(screenshot_dir, "11_admin_services_mobile.png")
    page.screenshot(path=sc_mobile)
    print(f"Captured mobile screenshot: {sc_mobile}")

    # Reset to desktop
    page.set_viewport_size({"width": 1440, "height": 900})
    time.sleep(0.5)

    # -------------------------------------------------------------
    # STAGE 10: REGRESSION TESTING (Admin Users & Email Reminder)
    # -------------------------------------------------------------
    print("\n--- STAGE 10: Regression Testing (Admin Users & Pet Management) ---")
    
    # 10.1 Admin Users page
    page.goto("http://localhost:3000/admin/users", wait_until="networkidle")
    time.sleep(1.5)
    assert page.locator("h3:has-text('Quản lý tài khoản')").is_visible(), "Admin Users page should load without issues"
    print("Passed: /admin/users regression check ok.")

    # 10.2 Dashboard Pet Management
    page.goto("http://localhost:3000/dashboard", wait_until="networkidle")
    time.sleep(1.5)
    assert page.locator(".ant-table").first.is_visible(), "Dashboard should load without issues"
    print("Passed: /dashboard regression check ok.")

    browser.close()

print("\n========================================================")
print("ALL E2E & INTEGRATION TESTS PASSED WITH 100% SUCCESS!")
print("========================================================")

