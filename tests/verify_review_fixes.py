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

    # Step 1: Login as Admin
    print("--- Step 1: Logging in as Admin ---")
    page.goto("http://localhost:3000/login")
    page.locator("#identifier").fill("0999999999")
    page.locator("#password").fill("123456789")
    page.locator("button.ant-btn-primary, button[type=submit]").first.click()
    page.wait_for_url("**/dashboard")
    time.sleep(2)

    # Step 2: Verify [k] Role Display in Header and Sidebar
    print("--- Step 2: Verifying [k] Role display in Header and Sidebar ---")
    top_role = page.locator(".top-user-role").first.inner_text()
    top_name = page.locator(".top-user-name").first.inner_text()
    print(f"TopBar: Name = '{top_name}', Role = '{top_role}'")
    assert "Quản trị viên" in top_role, f"Expected 'Quản trị viên' in TopBar role, got '{top_role}'"

    sidebar_role = page.locator("div[class*='userMeta'] span[class*='userRole']").first.inner_text()
    sidebar_name = page.locator("div[class*='userMeta'] span[class*='userName']").first.inner_text()
    print(f"Sidebar: Name = '{sidebar_name}', Role = '{sidebar_role}'")
    assert "Quản trị viên" in sidebar_role, f"Expected 'Quản trị viên' in Sidebar role, got '{sidebar_role}'"
    page.screenshot(path=f"{ARTIFACT_DIR}/verify_k_role_display.png")
    print("Saved screenshot: verify_k_role_display.png")

    # Step 3: Verify [m] No scroll jump on Dashboard when opening modals
    print("--- Step 3: Verifying [m] Scroll stability on Pet Management ---")
    page.evaluate("window.scrollTo(0, 550)")
    time.sleep(0.5)
    s_before = page.evaluate("window.scrollY")
    print(f"scrollY before clicking modal: {s_before}")

    btn_detail = page.locator(".ant-table").nth(1).locator("button:has-text('Chi tiết')").first
    btn_detail.click()
    time.sleep(0.5)
    s_modal_open = page.evaluate("window.scrollY")
    print(f"scrollY with Detail modal open: {s_modal_open}")
    assert s_modal_open == s_before, f"Scroll jumped! Expected {s_before}, got {s_modal_open}"

    page.locator(".ant-modal-close").click()
    time.sleep(0.5)
    s_modal_close = page.evaluate("window.scrollY")
    print(f"scrollY after Detail modal closed: {s_modal_close}")
    assert s_modal_close == s_before, f"Scroll changed after close! Expected {s_before}, got {s_modal_close}"

    # Also test Delete modal
    btn_delete = page.locator("button[title='Xóa thú cưng']").first
    btn_delete.click()
    time.sleep(0.5)
    s_del_open = page.evaluate("window.scrollY")
    print(f"scrollY with Delete modal open: {s_del_open}")
    assert s_del_open == s_before, f"Scroll jumped on Delete! Expected {s_before}, got {s_del_open}"
    page.locator(".ant-modal-close").click()
    time.sleep(0.5)

    # Step 4: Navigate to Admin Users page
    print("--- Step 4: Verifying [i] & [j] on Admin Users page ---")
    page.goto("http://localhost:3000/admin/users")
    time.sleep(2)

    # Check for NO "Vô hiệu hóa" button anywhere on the page
    vhh_count = page.locator("button:has-text('Vô hiệu hóa')").count()
    print(f"Total 'Vô hiệu hóa' buttons on page: {vhh_count}")
    assert vhh_count == 0, f"Found {vhh_count} 'Vô hiệu hóa' buttons, expected 0!"

    # Find rows with Admin role
    admin_rows = page.locator("tr:has-text('Quản trị viên')")
    admin_count = admin_rows.count()
    print(f"Admin rows found: {admin_count}")
    for i in range(admin_count):
        row = admin_rows.nth(i)
        # Check that there is NO "Khóa", NO "Mở khóa", NO "Sửa", NO "Vô hiệu hóa"
        lock_btn = row.locator("button:has-text('Khóa')").count()
        unlock_btn = row.locator("button:has-text('Mở khóa')").count()
        edit_btn = row.locator("button:has-text('Sửa')").count()
        detail_btn = row.locator("button:has-text('Chi tiết')").count()
        print(f"Admin row {i}: detail={detail_btn}, lock={lock_btn}, unlock={unlock_btn}, edit={edit_btn}")
        assert detail_btn >= 1, "Admin row should have 'Chi tiết' button"
        assert lock_btn == 0, "Admin row MUST NOT have 'Khóa' button"
        assert unlock_btn == 0, "Admin row MUST NOT have 'Mở khóa' button"
        assert edit_btn == 0, "Admin row MUST NOT have 'Sửa' button"

    page.screenshot(path=f"{ARTIFACT_DIR}/verify_i_j_admin_users.png")
    print("Saved screenshot: verify_i_j_admin_users.png")

    # Step 5: Verify [l] Phone and Email are disabled in Update User modal
    print("--- Step 5: Verifying [l] Phone and Email disabled on edit ---")
    # Click 'Sửa' on the first non-admin row
    non_admin_edit_btn = page.locator("tr:not(:has-text('Quản trị viên')) button:has-text('Sửa')").first
    non_admin_edit_btn.click()
    time.sleep(0.8)

    modal_title = page.locator(".ant-modal-title").inner_text()
    print(f"Modal title: '{modal_title}'")
    assert "Cập nhật tài khoản" in modal_title

    phone_input = page.locator("input#phone")
    email_input = page.locator("input#email")
    name_input = page.locator("input#fullName")

    is_phone_disabled = phone_input.is_disabled()
    is_email_disabled = email_input.is_disabled()
    is_name_disabled = name_input.is_disabled()

    print(f"Phone disabled: {is_phone_disabled}")
    print(f"Email disabled: {is_email_disabled}")
    print(f"FullName disabled: {is_name_disabled}")

    assert is_phone_disabled, "Phone input MUST be disabled when editing account"
    assert is_email_disabled, "Email input MUST be disabled when editing account"
    assert not is_name_disabled, "FullName input should be editable"

    page.screenshot(path=f"{ARTIFACT_DIR}/verify_l_edit_user_modal.png")
    print("Saved screenshot: verify_l_edit_user_modal.png")

    page.locator(".ant-modal-close").click()
    time.sleep(0.5)

    print("=== ALL 5 REVIEW ITEMS VERIFIED SUCCESSFULLY ===")
    browser.close()
