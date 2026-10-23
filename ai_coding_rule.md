# AI Coding Guidelines & Frontend Architecture

> **CRITICAL INSTRUCTION FOR ALL AI ASSISTANTS:**
> Đây là dự án đã được cấu trúc lại để dễ hiểu, tuân thủ các quy tắc dưới đây một cách tuyệt đối khi bạn (AI) thực hiện code hoặc thêm tính năng mới.

## 1. Nguyên Tắc về UI (Giao diện)

- **KHÔNG SỬ DỤNG LỚP BỌC (WRAPPER):** Tuyệt đối không tạo các UI wrapper phức tạp (như `InputCustom`, `ButtonCustom`).
- **SỬ DỤNG ANTD THUẦN TÚY:** Bắt buộc import và dùng trực tiếp các component gốc từ thư viện `antd` (Ví dụ: `import { Button, Input, Table } from 'antd'`).
- **STYLED-COMPONENTS LÀ TIÊU CHUẨN:** Nếu cần tùy chỉnh giao diện (custom CSS, đổi màu, kích thước) cho các component của AntD, hãy sử dụng `styled-components` trực tiếp trong file đang làm việc.
  _Ví dụ:_

  ```tsx
  import styled from 'styled-components';
  import { Button } from 'antd';

  const MyButton = styled(Button)`
    background-color: red !important;
  `;
  ```

## 2. Nguyên Tắc về Services (Gọi API)

Cấu trúc tổ chức API trong dự án bắt buộc phải tuân theo mô hình **Domain-Driven Services** (tách biệt URL và Logic).

Khi bạn cần thêm một luồng API mới (VD: `Product`), bạn **BẮT BUỘC** làm theo các bước sau:

1. Tạo thư mục tương ứng trong `src/services/` (VD: `src/services/ProductService`).
2. Tạo file `urls.ts` trong thư mục đó, chuyên chứa string URLs.
   ```typescript
   export const apiGetProducts = '/product';
   ```
3. Tạo file `index.ts` trong thư mục đó, import `01_axios` và gọi hàm tương ứng.

   ```typescript
   import api from '../01_axios';
   import { apiGetProducts } from './urls';

   const getProducts = (params?: any) => api.get(apiGetProducts, { params });

   const ProductService = { getProducts };
   export default ProductService;
   ```

4. Tại file UI (`.tsx`), tuyệt đối không viết axios call trực tiếp, mà phải import Service này vào để gọi: `await ProductService.getProducts()`.

---

_Lưu ý: Bạn có thể tham khảo trực tiếp cấu trúc file tại `src/services/AuthService/` và trang `src/pages/Dashboard/index.tsx` để lấy làm template mẫu chuẩn nhất!_

## 3. Nguyên Tắc về Cấu Trúc Thư Mục (Component Structure Rule)

Để giữ cho thư mục gốc của một Page được gọn gàng và dễ đọc:

- Thư mục gốc của một Page (Ví dụ: `src/pages/USER/homepage/`) **CHỈ ĐƯỢC CHỨA** file `index.tsx`. Tuyệt đối không để các file css/scss hay các component con lộn xộn ở đây.
- TẤT CẢ các component con, giao diện chia nhỏ, và file styling (`.scss`) **BẮT BUỘC** phải được tống hết vào thư mục `components/` nằm bên trong Page đó (Ví dụ: `src/pages/USER/homepage/components/HeroSection.tsx`, `.../components/styles.scss`).
