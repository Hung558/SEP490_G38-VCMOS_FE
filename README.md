# Hướng Dẫn Dành Cho Người Mới (Onboarding Guide)

Chào mừng bạn đến với dự án Frontend! Dự án này được thiết kế theo hướng **đơn giản hóa tối đa** để bất kỳ ai (kể cả Intern hay AI) cũng có thể đọc hiểu và code tính năng mới ngay lập tức.

## 🛠 Tech Stack Chính

- **Framework:** React + Vite
- **UI Library:** Ant Design (Sử dụng trực tiếp)
- **Styling:** `styled-components` + CSS/SCSS căn bản
- **State:** Redux Toolkit + React Context
- **Routing:** React Router v6

---

## 📂 Cấu Trúc Thư Mục (Chỉ tập trung vào `src/`)

```text
src/
├── assets/        # Hình ảnh, icon tĩnh
├── components/    # Component dùng chung
│   ├── common/    # Component tiện ích (vd: ErrorBoundary, Spin, Layout chung)
│   └── layout/    # Header, Footer, Sidebar
├── constants/     # Chứa các biến config cố định (Systemkey, URL,...)
├── hooks/         # Custom React Hooks
├── lib/           # Tiện ích mở rộng (utils, dateUtils, storage...)
├── locales/       # Đa ngôn ngữ i18n
├── pages/         # GIAO DIỆN CHÍNH - Code trang nào vào thư mục đó
├── redux/         # Nơi cấu hình Store và các slice (state)
├── router/        # Khởi tạo React Router
├── routerMap/     # Map danh sách các Route (Thêm đường dẫn mới ở đây)
├── services/      # Nơi gọi API (axios) - Tuyệt đối không call API trong UI Component
└── styles/        # CSS global
```

---

## 📜 Quy Tắc Code (BẮT BUỘC ĐỌC)

1. **Dùng UI Component:**
   Sử dụng **TRỰC TIẾP** component của Ant Design (`import { Button, Input, Select } from 'antd'`).
   _Không tự viết lại thẻ HTML cơ bản (button, input) trừ khi bắt buộc._

2. **Custom Style (CSS):**
   Nếu component của AntD chưa đúng thiết kế, hãy dùng `styled-components` để bọc nó lại ngay trong file bạn đang làm việc.

   ```tsx
   import { Button } from 'antd';
   import styled from 'styled-components';

   const MyRedButton = styled(Button)`
     background-color: red !important;
     border-radius: 8px;
   `;
   ```

3. **Gọi API:**
   Tuyệt đối không dùng `axios.get` hay `fetch` ở file UI. Mọi hàm gọi API phải được tạo trong thư mục `src/services/` và import vào để dùng.

4. **Thêm Trang Mới:**
   - Tạo Component trang ở `src/pages/`.
   - Thêm đường dẫn vào `src/routerMap/ROUTER.ts`.
   - Đăng ký Component vào mảng routes trong `src/routerMap/AppRouter.tsx`.

---

🔥 **Chỉ cần nắm 4 quy tắc trên, bạn đã có thể bắt đầu code ngay bây giờ! Chúc may mắn!**
