src/
└── styles/
├── abstracts/ # SCSS variables, functions, mixins
│ ├── \_variables.scss
│ ├── \_colors.scss
│ ├── \_typography.scss
│ └── \_mixins.scss
│
base/
├── \_reset.scss // Reset CSS chuẩn hóa
├── \_base.scss // HTML body tag + normalize cơ bản
├── \_typography.scss // Các định nghĩa heading, paragraph, text link
├── \_scrollbar.scss // Scrollbar tùy biến
├── \_utilities.scss // Class tiện ích như .pointer, .text-center, ...
└── \_index.scss // Import lại tất cả file base
│
├── layout/ # Layout system: grid, container, spacing rules
│ ├── \_grid.scss
│ ├── \_spacing.scss
│ └── \_breakpoints.scss
│
├── components/ # Styles cho từng component riêng (nếu không dùng CSS Module)
│ ├── \_button.scss
│ ├── \_checkbox.scss
│ └── \_breadcrumb.scss
│
├── pages/ # Styles scoped cho page-level (nếu cần)
│ └── \_home.scss
│
├── vendors/ # Overrides / customizations cho thư viện ngoài
│ └── \_custom-antd.scss
│
├── themes/ # Nếu bạn có multi-theme (light/dark…)
│ ├── \_light.scss
│ └── \_dark.scss
│
├── index.scss # Entry point gom tất cả partials bằng @use / @forward
└── globals.css # (tuỳ chọn) nhập Tailwind, normalize, hoặc CSS libraries khác
