// commitlint.config.js
/* eslint-env node */
// eslint-disable-next-line no-undef
module.exports = {
  extends: ['@commitlint/config-conventional'],
};

// 🧪 Một số ví dụ commit hợp lệ:
// Kiểu	Mô tả
// feat:	Tính năng mới
// fix:	Sửa lỗi
// chore:	Việc phụ trợ (CI, deps...)
// refactor:	Tối ưu/viết lại logic
// docs:	Thay đổi tài liệu
// test:	Thêm/chỉnh sửa test

// Ví dụ đúng:

// bash
// Sao chép
// Chỉnh sửa
// git commit -m "feat: thêm chức năng chọn chủ đề"
// git commit -m "fix: sửa lỗi overflow trên Firefox"
