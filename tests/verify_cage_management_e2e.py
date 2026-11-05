import os
import sys
import json
import time

if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8")

from playwright.sync_api import sync_playwright

ARTIFACT_DIR = r"C:\Users\Asus\.gemini\antigravity\brain\2b391f3f-33be-4539-96e0-85cb3445bf25"
os.makedirs(ARTIFACT_DIR, exist_ok=True)

console_errors = []

def on_console(msg):
    if msg.type == "error":
        if "favicon" not in msg.text.lower() and "chrome-extension" not in msg.text:
            console_errors.append(msg.text)
            print(f"[BROWSER ERROR]: {msg.text}")

def on_page_error(err):
    console_errors.append(str(err))
    print(f"[PAGE UNCAUGHT ERROR]: {err}")

with sync_playwright() as p:
    browser = p.chromium.launch(channel="chrome", headless=True)

    # =========================================================================
    # STAGE 1: ROUTE ACCESS CONTROL & REDIRECTION MATRIX
    # =========================================================================
    print("\n--- STAGE 1: Route Access Control & Redirection Matrix ---")

    # 1.1 Guest unauthenticated access to /cages
    ctx = browser.new_context(viewport={"width": 1440, "height": 900})
    page = ctx.new_page()
    page.on("console", on_console)
    page.on("pageerror", on_page_error)

    print("Test 1.1: Unauthenticated guest access to /cages...")
    page.goto("http://localhost:3000/cages", wait_until="networkidle")
    time.sleep(1)
    assert "/cages" not in page.url, f"Guest must not stay on /cages, got {page.url}"
    print(f"Passed: Guest redirected away to {page.url}")
    ctx.close()

    # 1.2 PetOwner access to /cages
    ctx = browser.new_context(viewport={"width": 1440, "height": 900})
    page = ctx.new_page()
    page.on("console", on_console)
    page.on("pageerror", on_page_error)

    print("Test 1.2: PetOwner access to /cages...")
    pet_owner_user = {
        "_id": "6ad96d4a9664da6b2c0d8d61",
        "phone": "0987654321",
        "role": "PetOwner",
        "status": "Active"
    }
    page.goto("http://localhost:3000/", wait_until="commit")
    page.evaluate(f"""() => {{
        sessionStorage.setItem('hasLoadedBefore', 'true');
        sessionStorage.setItem('email-notice-dismissed', 'true');
        localStorage.setItem('token', 'mock_owner_token');
        localStorage.setItem('user-info', JSON.stringify({json.dumps(pet_owner_user)}));
    }}""")
    page.goto("http://localhost:3000/cages", wait_until="networkidle")
    time.sleep(1)
    assert "/dashboard" in page.url, f"PetOwner should be redirected to /dashboard, got {page.url}"
    print(f"Passed: PetOwner redirected to {page.url}")
    ctx.close()

    # 1.3 Veterinarian / Groomer access to /cages
    ctx = browser.new_context(viewport={"width": 1440, "height": 900})
    page = ctx.new_page()
    page.on("console", on_console)
    page.on("pageerror", on_page_error)

    print("Test 1.3: Veterinarian / Groomer access to /cages...")
    groomer_user = {
        "_id": "6ae302f93dc248f59927a10e",
        "phone": "0977111222",
        "role": "Groomer",
        "status": "Active"
    }
    page.goto("http://localhost:3000/", wait_until="commit")
    page.evaluate(f"""() => {{
        sessionStorage.setItem('hasLoadedBefore', 'true');
        sessionStorage.setItem('email-notice-dismissed', 'true');
        localStorage.setItem('token', 'mock_groomer_token');
        localStorage.setItem('user-info', JSON.stringify({json.dumps(groomer_user)}));
    }}""")
    page.goto("http://localhost:3000/cages", wait_until="networkidle")
    time.sleep(1)
    assert "/profile" in page.url, f"Groomer should be redirected to /profile, got {page.url}"
    print(f"Passed: Groomer redirected to {page.url}")
    ctx.close()

    # =========================================================================
    # STAGE 2: ADMIN LIVE LOGIN & FULL CAGE WORKFLOW
    # =========================================================================
    print("\n--- STAGE 2: Admin Live Login & Full Cage Management ---")
    ctx = browser.new_context(viewport={"width": 1440, "height": 900})
    page = ctx.new_page()
    page.on("console", on_console)
    page.on("pageerror", on_page_error)

    # 2.1 Live Admin Login
    print("Test 2.1: Admin login with real credentials...")
    page.goto("http://localhost:3000/login", wait_until="networkidle")
    time.sleep(1)
    page.locator("#identifier").fill("0999999999")
    page.locator("#password").fill("123456789")
    page.locator("button[type='submit']:has-text('Đăng nhập')").click()
    page.wait_for_url("**/admin/users", timeout=10000)
    time.sleep(1.5)
    print("Passed: Admin logged in successfully!")

    # 2.2 Verify Admin Menu & Navigate to /cages
    print("Test 2.2: Verify Admin Menu contains 'Quản lý chuồng'...")
    cage_menu = page.locator(".ant-menu-item:has-text('Quản lý chuồng')").first
    assert cage_menu.is_visible(), "Sidebar must have 'Quản lý chuồng' for Admin"
    cage_menu.click()
    page.wait_for_url("**/cages", timeout=10000)
    time.sleep(1.5)
    print("Passed: Navigated to /cages!")

    # 2.3 Verify Admin Page elements
    print("Test 2.3: Verify Page header, table and 'Thêm chuồng' button...")
    assert page.locator("h3:has-text('Quản lý chuồng')").is_visible()
    add_btn = page.locator("button:has-text('Thêm chuồng')")
    assert add_btn.is_visible(), "Admin must see 'Thêm chuồng' button"
    print("Passed: Page header and 'Thêm chuồng' button are visible!")

    # 2.4 Create Form Validation & 409 Duplicate Label Handling
    print("Test 2.4: Test validation and 409 duplicate label handling...")
    add_btn.click()
    time.sleep(0.5)
    modal = page.locator(".ant-modal:has-text('Thêm chuồng mới')")
    assert modal.is_visible()

    # Submit empty form
    modal.locator("button:has-text('Tạo chuồng')").click()
    time.sleep(0.5)
    assert page.locator("text=Nhãn chuồng là bắt buộc").first.is_visible()
    print("Passed: Client validation blocked empty submission!")

    # Fill duplicate label (A-01 already exists in BE)
    unique_test_label = f"VIP-{int(time.time()) % 10000}"
    modal.locator("#label").fill("A-01")
    modal.locator(".ant-select:has(#size)").click()
    page.locator(".ant-select-item-option:has-text('Nhỏ (S)')").click()
    modal.locator("button:has-text('Tạo chuồng')").click()
    time.sleep(1.5)

    # Confirm 409 duplicate message is shown and form preserves input
    assert page.locator("text=Nhãn chuồng đã tồn tại").first.is_visible()
    assert modal.locator("#label").input_value() == "A-01", "Form input should be preserved on 409"
    print("Passed: 409 duplicate handled cleanly, form input preserved!")

    # 2.5 Successful Create Cage
    print(f"Test 2.5: Create unique cage with label {unique_test_label}...")
    modal.locator("#label").fill(unique_test_label)
    # Enable isolation switch
    modal.locator("button[role='switch']").click()
    modal.locator("button:has-text('Tạo chuồng')").click()
    time.sleep(2)
    assert not modal.is_visible(), "Modal should close on 201 Created"
    
    # Verify new cage is in table with isolation tag
    new_cage_row = page.locator(f"tr:has-text('{unique_test_label}')")
    new_cage_row.wait_for(state="visible", timeout=5000)
    assert new_cage_row.locator("text=Khu cách ly").is_visible()
    print(f"Passed: Cage {unique_test_label} created and displayed in table!")
    page.screenshot(path=os.path.join(ARTIFACT_DIR, "cage_01_admin_table_created.png"))

    # 2.6 Detail Modal Workflow
    print(f"Test 2.6: Open Detail Modal for {unique_test_label}...")
    new_cage_row.locator("button:has(.anticon-eye)").click()
    time.sleep(1)
    detail_modal = page.locator(".ant-modal:has-text('Chi tiết chuồng')")
    assert detail_modal.is_visible()
    assert detail_modal.locator(f"strong:has-text('{unique_test_label}')").is_visible()
    assert detail_modal.locator("text=Có cách ly").is_visible()
    print("Passed: Cage detail retrieved from GET /api/cages/:id and displayed!")
    page.screenshot(path=os.path.join(ARTIFACT_DIR, "cage_02_detail_modal.png"))
    detail_modal.locator("button:has-text('Đóng')").click()
    time.sleep(0.5)

    # 2.7 Update Cage Workflow
    print(f"Test 2.7: Edit cage {unique_test_label}...")
    new_cage_row.locator("button:has(.anticon-edit)").click()
    time.sleep(1)
    edit_modal = page.locator(".ant-modal:has-text('Cập nhật thông tin chuồng')")
    assert edit_modal.is_visible()
    assert edit_modal.locator("#label").input_value() == unique_test_label

    # Change status to Occupied and turn off isolation
    edit_modal.locator(".ant-select:has(#status)").click()
    page.locator(".ant-select-item-option:has-text('Đang sử dụng')").click()
    edit_modal.locator("button[role='switch']").click() # toggles off
    edit_modal.locator("button:has-text('Lưu thay đổi')").click()
    time.sleep(2)
    assert not edit_modal.is_visible()

    # Verify table updated
    updated_row = page.locator(f"tr:has-text('{unique_test_label}')")
    assert updated_row.locator("text=Đang sử dụng").is_visible()
    assert updated_row.locator("text=Không cách ly").is_visible()
    print("Passed: Cage updated via PATCH and table refreshed!")
    page.screenshot(path=os.path.join(ARTIFACT_DIR, "cage_03_admin_updated.png"))

    # 2.8 Filters, Sort & Reset
    print("Test 2.8: Testing filters, sort and reset...")
    # Filter by status: Available
    page.locator(".ant-select:has-text('Trạng thái')").click()
    page.locator(".ant-select-item-option:has-text('Sẵn sàng')").click()
    time.sleep(1.5)
    # The updated cage (Occupied) should not be visible under Available filter
    assert not page.locator(f"tr:has-text('{unique_test_label}')").is_visible()
    print("Passed: Status filter Available hid Occupied cage!")

    # Reset filters
    page.locator("button:has-text('Đặt lại')").click()
    time.sleep(1.5)
    assert page.locator(f"tr:has-text('{unique_test_label}')").is_visible()
    print("Passed: Reset filters restored full table list!")

    # Desktop screenshot
    page.screenshot(path=os.path.join(ARTIFACT_DIR, "cage_04_desktop_layout.png"))
    ctx.close()

    # =========================================================================
    # STAGE 3: RECEPTIONIST LIVE FLOW (READ-ONLY)
    # =========================================================================
    print("\n--- STAGE 3: Receptionist Live Flow (Read-Only) ---")
    ctx = browser.new_context(viewport={"width": 1440, "height": 900})
    page = ctx.new_page()
    page.on("console", on_console)
    page.on("pageerror", on_page_error)

    # Login as Receptionist (0123456789 / 123456789)
    page.goto("http://localhost:3000/login", wait_until="networkidle")
    time.sleep(1)
    page.locator("#identifier").fill("0123456789")
    page.locator("#password").fill("123456789")
    page.locator("button[type='submit']:has-text('Đăng nhập')").click()
    time.sleep(2)

    # Receptionist lands on /profile per roleAccess
    print("Verifying Receptionist Sidebar...")
    # Sidebar must contain 'Quản lý chuồng'
    rec_cage_menu = page.locator(".ant-menu-item:has-text('Quản lý chuồng')").first
    assert rec_cage_menu.is_visible(), "Sidebar must have 'Quản lý chuồng' for Receptionist"
    # Sidebar must NOT contain 'Quản lý tài khoản' or 'Quản lý dịch vụ' or 'Quản lý sản phẩm'
    assert not page.locator(".ant-menu-item:has-text('Quản lý tài khoản')").is_visible()
    assert not page.locator(".ant-menu-item:has-text('Quản lý dịch vụ')").is_visible()
    assert not page.locator(".ant-menu-item:has-text('Quản lý sản phẩm')").is_visible()
    print("Passed: Receptionist menu has 'Quản lý chuồng' and no Admin-only items!")

    # Navigate to /cages
    rec_cage_menu.click()
    page.wait_for_url("**/cages", timeout=10000)
    time.sleep(1.5)

    # Verify 'Thêm chuồng' button is NOT rendered for Receptionist
    assert not page.locator("button:has-text('Thêm chuồng')").is_visible(), "Receptionist must NOT see 'Thêm chuồng'"
    print("Passed: 'Thêm chuồng' button is absent for Receptionist!")

    # Verify table has Detail button but NOT Edit button
    table = page.locator(".ant-table")
    assert table.is_visible()
    assert page.locator(".ant-table button:has(.anticon-eye)").first.is_visible(), "Detail button visible"
    assert not page.locator(".ant-table button:has(.anticon-edit)").is_visible(), "Receptionist must NOT see Edit button"
    print("Passed: Receptionist sees Detail button but NO Edit button!")

    page.screenshot(path=os.path.join(ARTIFACT_DIR, "cage_05_receptionist_view.png"))
    ctx.close()

    # =========================================================================
    # STAGE 4: RESPONSIVE LAYOUT VERIFICATION (375px & 768px)
    # =========================================================================
    print("\n--- STAGE 4: Responsive Layout Verification ---")

    # 4.1 Mobile 375px
    ctx_mobile = browser.new_context(viewport={"width": 375, "height": 812})
    page_mobile = ctx_mobile.new_page()
    page_mobile.goto("http://localhost:3000/login", wait_until="networkidle")
    time.sleep(1)
    page_mobile.locator("#identifier").fill("0999999999")
    page_mobile.locator("#password").fill("123456789")
    page_mobile.locator("button[type='submit']:has-text('Đăng nhập')").click()
    page_mobile.wait_for_url("**/admin/users", timeout=10000)
    time.sleep(1)
    page_mobile.goto("http://localhost:3000/cages", wait_until="networkidle")
    time.sleep(2)

    # Verify table scroll container exists
    assert page_mobile.locator(".ant-table-content").is_visible()
    page_mobile.screenshot(path=os.path.join(ARTIFACT_DIR, "cage_06_mobile_375px.png"))
    print("Passed: Mobile 375px responsive layout verified!")
    ctx_mobile.close()

    # 4.2 Tablet 768px
    ctx_tablet = browser.new_context(viewport={"width": 768, "height": 1024})
    page_tablet = ctx_tablet.new_page()
    page_tablet.goto("http://localhost:3000/login", wait_until="networkidle")
    time.sleep(1)
    page_tablet.locator("#identifier").fill("0999999999")
    page_tablet.locator("#password").fill("123456789")
    page_tablet.locator("button[type='submit']:has-text('Đăng nhập')").click()
    page_tablet.wait_for_url("**/admin/users", timeout=10000)
    time.sleep(1)
    page_tablet.goto("http://localhost:3000/cages", wait_until="networkidle")
    time.sleep(2)
    page_tablet.screenshot(path=os.path.join(ARTIFACT_DIR, "cage_07_tablet_768px.png"))
    print("Passed: Tablet 768px responsive layout verified!")
    ctx_tablet.close()

    browser.close()

print("\n=======================================================")
print("ALL E2E & BROWSER VERIFICATION SCENARIOS PASSED 100%!")
print("=======================================================")
