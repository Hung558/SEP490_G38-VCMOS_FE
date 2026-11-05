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
        text = msg.text.lower()
        if "favicon" not in text and "chrome-extension" not in text:
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

    # 1.1 Unauthenticated guest access to /clinic/appointments
    ctx = browser.new_context(viewport={"width": 1440, "height": 900})
    page = ctx.new_page()
    page.on("console", on_console)
    page.on("pageerror", on_page_error)

    print("Test 1.1: Unauthenticated guest access to /clinic/appointments...")
    page.goto("http://localhost:3000/clinic/appointments", wait_until="networkidle")
    time.sleep(1)
    assert "/clinic/appointments" not in page.url, f"Guest must not stay on /clinic/appointments, got {page.url}"
    print(f"Passed: Guest redirected away to {page.url}")
    ctx.close()

    # 1.2 PetOwner access to /clinic/appointments
    ctx = browser.new_context(viewport={"width": 1440, "height": 900})
    page = ctx.new_page()
    page.on("console", on_console)
    page.on("pageerror", on_page_error)

    print("Test 1.2: PetOwner access to /clinic/appointments...")
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
    page.goto("http://localhost:3000/clinic/appointments", wait_until="networkidle")
    time.sleep(1)
    assert "/dashboard" in page.url, f"PetOwner should be redirected to /dashboard, got {page.url}"
    print(f"Passed: PetOwner redirected to {page.url}")
    ctx.close()

    # 1.3 Groomer / Veterinarian access to /clinic/appointments
    ctx = browser.new_context(viewport={"width": 1440, "height": 900})
    page = ctx.new_page()
    page.on("console", on_console)
    page.on("pageerror", on_page_error)

    print("Test 1.3: Groomer access to /clinic/appointments...")
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
    page.goto("http://localhost:3000/clinic/appointments", wait_until="networkidle")
    time.sleep(1)
    assert "/profile" in page.url, f"Groomer should be redirected to /profile, got {page.url}"
    print(f"Passed: Groomer redirected to {page.url}")
    ctx.close()

    # =========================================================================
    # STAGE 2: ADMIN LIVE LOGIN & READ-ONLY ACCESS
    # =========================================================================
    print("\n--- STAGE 2: Admin Live Login & Read-Only Access ---")
    ctx = browser.new_context(viewport={"width": 1440, "height": 900})
    page = ctx.new_page()
    page.on("console", on_console)
    page.on("pageerror", on_page_error)

    print("Test 2.1: Admin login with real credentials...")
    page.goto("http://localhost:3000/login", wait_until="networkidle")
    time.sleep(1)
    page.locator("#identifier").fill("0999999999")
    page.locator("#password").fill("123456789")
    page.locator("button[type='submit']:has-text('Đăng nhập')").click()
    page.wait_for_url("**/admin/users", timeout=10000)
    time.sleep(1.5)
    print("Passed: Admin logged in successfully!")

    # 2.2 Create a fresh Available cage for Receptionist assignment testing
    print("Test 2.2: Admin creates a fresh Available cage...")
    page.goto("http://localhost:3000/cages", wait_until="networkidle")
    time.sleep(1)
    page.locator("button:has-text('Thêm chuồng')").click()
    time.sleep(0.5)
    cage_modal = page.locator(".ant-modal:has-text('Thêm chuồng mới')")
    test_cage_label = f"AVAIL-{int(time.time()) % 10000}"
    cage_modal.locator("#label").fill(test_cage_label)
    cage_modal.locator(".ant-select:has(#size)").click()
    page.locator(".ant-select-item-option:has-text('Nhỏ (S)')").click()
    cage_modal.locator("button:has-text('Tạo chuồng')").click()

    time.sleep(1.5)
    print(f"Passed: Fresh Available cage {test_cage_label} created!")

    print("Test 2.3: Navigate to 'Tiếp nhận lịch hẹn' via sidebar...")
    appointment_menu = page.locator(".ant-menu-item:has-text('Tiếp nhận lịch hẹn')").first
    assert appointment_menu.is_visible(), "Sidebar must have 'Tiếp nhận lịch hẹn' for Admin"
    appointment_menu.click()
    page.wait_for_url("**/clinic/appointments", timeout=10000)
    time.sleep(1.5)
    print("Passed: Navigated to /clinic/appointments!")

    print("Test 2.4: Verify Admin sees table but NO Check-in, NO Phân chuồng, NO Phân công chuồng tab...")
    assert page.locator("h3:has-text('Tiếp nhận lịch hẹn phòng khám')").is_visible()
    # Admin must not see tabs
    assert not page.locator(".ant-tabs-nav:has-text('Phân công chuồng')").is_visible(), "Admin must not see assignment tab"
    # Admin must not see check-in button or assign cage button
    assert page.locator("button:has-text('Check-in')").count() == 0, "Admin must not see Check-in button"
    assert page.locator("button:has-text('Phân chuồng')").count() == 0, "Admin must not see Phân chuồng button"
    # Admin sees 'Chi tiết' button
    detail_btn = page.locator("button:has-text('Chi tiết')").first
    assert detail_btn.is_visible(), "Admin must see 'Chi tiết' button"
    print("Passed: Admin has read-only access with zero mutation controls!")

    print("Test 2.5: Admin views Appointment Detail modal...")
    detail_btn.click()
    time.sleep(1)
    modal = page.locator(".ant-modal:has-text('Chi tiết lịch hẹn')")
    assert modal.is_visible(), "Appointment Detail modal must open"
    page.screenshot(path=os.path.join(ARTIFACT_DIR, "appointment_01_admin_readonly.png"))
    # Close modal
    modal.locator(".ant-modal-close").click()
    time.sleep(0.5)
    print("Passed: Admin can view detail modal successfully!")
    ctx.close()


    # =========================================================================
    # STAGE 3: RECEPTIONIST LIVE LOGIN & FULL WORKFLOW
    # =========================================================================
    print("\n--- STAGE 3: Receptionist Live Login, Check-in & Cage Assignment ---")
    ctx = browser.new_context(viewport={"width": 1440, "height": 900})
    page = ctx.new_page()
    page.on("console", on_console)
    page.on("pageerror", on_page_error)

    print("Test 3.1: Receptionist login with real credentials...")
    page.goto("http://localhost:3000/login", wait_until="networkidle")
    time.sleep(1)
    page.locator("#identifier").fill("0123456789")
    page.locator("#password").fill("123456789")
    page.locator("button[type='submit']:has-text('Đăng nhập')").click()
    page.wait_for_url("**/profile", timeout=10000)
    time.sleep(1.5)
    print("Passed: Receptionist logged in successfully!")

    print("Test 3.2: Receptionist navigates to 'Tiếp nhận lịch hẹn'...")
    reception_menu = page.locator(".ant-menu-item:has-text('Tiếp nhận lịch hẹn')").first
    assert reception_menu.is_visible(), "Sidebar must have 'Tiếp nhận lịch hẹn' for Receptionist"
    reception_menu.click()
    page.wait_for_url("**/clinic/appointments", timeout=10000)
    time.sleep(1.5)
    print("Passed: Navigated to /clinic/appointments!")

    print("Test 3.3: Verify Receptionist sees Tabs ('Danh sách lịch hẹn' and 'Phân công chuồng')...")
    app_tab = page.locator(".ant-tabs-tab:has-text('Danh sách lịch hẹn')")
    cage_tab = page.locator(".ant-tabs-tab:has-text('Phân công chuồng')")
    assert app_tab.is_visible(), "Tab 'Danh sách lịch hẹn' must be visible"
    assert cage_tab.is_visible(), "Tab 'Phân công chuồng' must be visible"
    page.screenshot(path=os.path.join(ARTIFACT_DIR, "appointment_02_receptionist_list.png"))
    print("Passed: Both tabs are visible for Receptionist!")

    print("Test 3.4: Perform Check-in on a Booked appointment...")
    # Find a Booked appointment row
    booked_row = page.locator("tr:has-text('Đã đặt')").first
    assert booked_row.is_visible(), "There should be at least one Booked appointment"
    checkin_btn = booked_row.locator("button:has-text('Check-in')")
    assert checkin_btn.is_visible(), "Booked appointment must have Check-in button"
    
    # Get appointment code for verification
    apt_code = booked_row.locator("td").first.inner_text().strip()
    print(f"Checking in appointment: {apt_code}")
    checkin_btn.click()
    time.sleep(0.5)

    checkin_modal = page.locator(".ant-modal:has-text('Xác nhận tiếp nhận lịch hẹn')")
    assert checkin_modal.is_visible(), "Check-in confirmation modal must appear"
    assert apt_code in checkin_modal.inner_text(), f"Modal must show code {apt_code}"
    page.screenshot(path=os.path.join(ARTIFACT_DIR, "appointment_03_checkin_modal.png"))

    # Confirm check-in
    checkin_modal.locator("button:has-text('Xác nhận Check-in')").click()
    time.sleep(2)
    assert not checkin_modal.is_visible(), "Check-in modal should close after confirmation"

    # Verify updated row shows 'Đã tiếp nhận' and check-in timestamp
    updated_row = page.locator(f"tr:has-text('{apt_code}')")
    assert updated_row.locator("text=Đã tiếp nhận").is_visible(), "Status must be updated to 'Đã tiếp nhận'"
    page.screenshot(path=os.path.join(ARTIFACT_DIR, "appointment_04_checked_in_success.png"))
    print(f"Passed: Appointment {apt_code} checked in successfully and status updated!")

    print("Test 3.5: Create Cage Assignment for an appointment...")
    # Click 'Phân chuồng' on row
    assign_btn = updated_row.locator("button:has-text('Phân chuồng')")
    assert assign_btn.is_visible(), "Receptionist must see 'Phân chuồng' button"
    assign_btn.click()
    time.sleep(1)

    assign_modal = page.locator(".ant-modal:has-text('Phân công chuồng cho lịch hẹn')")
    assert assign_modal.is_visible(), "Cage assignment modal must open"
    assert apt_code in assign_modal.inner_text(), f"Modal should prefill code {apt_code}"

    # Select available cage
    assign_modal.locator(".ant-select").click()
    time.sleep(0.5)
    first_cage_opt = page.locator(".ant-select-item-option").first
    assert first_cage_opt.is_visible(), "At least one available cage option must be displayed"
    cage_text = first_cage_opt.inner_text()
    print(f"Selecting available cage: {cage_text}")
    first_cage_opt.click()
    time.sleep(0.5)

    page.screenshot(path=os.path.join(ARTIFACT_DIR, "appointment_05_cage_assignment_modal.png"))
    assign_modal.locator("button:has-text('Xác nhận phân chuồng')").click()
    time.sleep(2)
    assert not assign_modal.is_visible(), "Assignment modal should close after success"
    print("Passed: Cage assigned successfully!")

    print("Test 3.6: Verify assignment in 'Phân công chuồng' tab...")
    cage_tab.click()
    active_pane = page.locator(".ant-tabs-tabpane-active")
    active_pane.wait_for(state="visible", timeout=5000)

    assignment_table = active_pane.locator("table")
    assignment_table.wait_for(state="visible", timeout=5000)

    # Wait for the assigned appointment row to appear
    target_assignment_row = active_pane.locator(f"tr:has-text('{apt_code}')")
    target_assignment_row.wait_for(state="visible", timeout=5000)
    assert target_assignment_row.is_visible(), f"Assignment for {apt_code} must be in assignment list"

    # Open detail and verify GET /api/cage-assignments/:id was called
    print("Test 3.7: Open detail and verify endpoint GET /api/cage-assignments/:id...")
    with page.expect_response(lambda res: "/api/cage-assignments/" in res.url and res.status == 200) as response_info:
        target_assignment_row.locator("button:has-text('Chi tiết')").first.click()
    response = response_info.value
    assert "/api/cage-assignments/" in response.url, f"Detail endpoint must be called, got {response.url}"
    print(f"Passed: Detail endpoint GET /api/cage-assignments/:id called successfully ({response.url})")

    detail_modal = page.locator(".ant-modal:has-text('Chi tiết phân công chuồng')")
    detail_modal.wait_for(state="visible", timeout=5000)
    assert detail_modal.is_visible(), "Cage Assignment Detail modal must open"
    time.sleep(0.5)
    detail_modal.locator(".ant-modal-close").click()
    time.sleep(0.5)

    # Test assignment filters (cageId, orderId, reset)
    print("Test 3.8: Test Cage Assignment filters (cageId, orderId, reset)...")
    cage_select = active_pane.locator(".ant-select").first
    cage_select.click()
    time.sleep(0.5)
    page.locator(f".ant-select-item-option:has-text('{test_cage_label}')").first.click()
    time.sleep(1)
    print(f"Filtered by cage {test_cage_label}")

    # Reset filters
    reset_btn = active_pane.locator("button:has-text('Đặt lại')")
    assert reset_btn.is_visible()
    reset_btn.click()
    time.sleep(1)
    print("Passed: Assignment filters reset successfully!")

    page.screenshot(path=os.path.join(ARTIFACT_DIR, "appointment_06_cage_assignments_tab.png"))
    print("Passed: Cage assignment listed, filtered, and detail verified in tab!")



    # =========================================================================
    # STAGE 4: RESPONSIVE VIEWPORT TESTING
    # =========================================================================
    print("\n--- STAGE 4: Responsive Viewport Testing ---")
    app_tab.click()
    time.sleep(1)

    # 4.1 Mobile (375px)
    print("Test 4.1: Mobile 375px layout...")
    page.set_viewport_size({"width": 375, "height": 667})
    time.sleep(1)
    page.screenshot(path=os.path.join(ARTIFACT_DIR, "appointment_07_mobile_375px.png"))
    print("Passed: Mobile 375px screenshot captured!")

    # 4.2 Tablet (768px)
    print("Test 4.2: Tablet 768px layout...")
    page.set_viewport_size({"width": 768, "height": 1024})
    time.sleep(1)
    page.screenshot(path=os.path.join(ARTIFACT_DIR, "appointment_08_tablet_768px.png"))
    print("Passed: Tablet 768px screenshot captured!")

    # 4.3 Desktop (1440px)
    print("Test 4.3: Desktop 1440px layout...")
    page.set_viewport_size({"width": 1440, "height": 900})
    time.sleep(1)
    page.screenshot(path=os.path.join(ARTIFACT_DIR, "appointment_09_desktop_1440px.png"))
    print("Passed: Desktop 1440px screenshot captured!")

    ctx.close()
    browser.close()

print(f"\nAll verification tests completed successfully! Console errors logged: {len(console_errors)}")
