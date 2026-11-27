import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = path =>
  readFileSync(new URL(`../src/${path}`, import.meta.url), 'utf8');

test('compact layout uses a labelled off-canvas menu without reserving sidebar width', () => {
  const layout = source('components/layout/MainLayout/index.tsx');
  assert.match(layout, /const isCompact = !screens\.lg/);
  assert.match(layout, /!isCompact && \(\s*<Sider/);
  assert.match(layout, /isCompact && \(\s*<Drawer/);
  assert.match(layout, /aria-label="Điều hướng"/);
  assert.match(
    layout,
    /aria-expanded=\{isCompact \? mobileMenuOpen : !collapseMenu\}/
  );
  assert.match(layout, /const onClickMenu[\s\S]*?setMobileMenuOpen\(false\)/);
});

test('owner pet table scrolls inside its card and filters use concise labels', () => {
  const dashboard = source('pages/Dashboard/index.tsx');
  assert.match(dashboard, /scroll=\{\{ x: 1000 \}\}\s*columns=\{petsColumns\}/);
  assert.match(dashboard, /ant-card-head-wrapper \{\s*flex-wrap: wrap/);
  assert.doesNotMatch(
    dashboard,
    /label: '(?:Đang nuôi \(Active\)|Đã xóa \(Deleted\)|Tất cả \(All\))'/
  );
});

test('phone calendar panels and presets stack instead of clipping the first month', () => {
  const layout = source('components/layout/MainLayout/index.tsx');
  assert.match(
    layout,
    /ant-picker-panel-layout,[\s\S]*?ant-picker-panels \{\s*flex-direction: column/
  );
  assert.match(layout, /max-height: 70vh;\s*overflow: auto/);
});

test('clinical filters constrain their flex items and scroll long option sets internally', () => {
  const styles = source('pages/AppointmentReception/components/styles.ts');
  assert.match(
    styles,
    /\.ant-space,\s*\.ant-space-item \{\s*min-width: 0;\s*max-width: 100%/
  );
  assert.match(
    styles,
    /\.ant-segmented \{\s*max-width: 100%;\s*overflow-x: auto/
  );
  assert.match(styles, /\.ant-segmented-group \{\s*width: max-content/);
});

test('staff inpatient and admin account tables preserve columns with internal scrolling', () => {
  assert.match(
    source('pages/InpatientCare/index.tsx'),
    /scroll=\{\{ x: 1000 \}\}/
  );
  assert.match(
    source('pages/AdminUsers/index.tsx'),
    /scroll=\{\{ x: 1100 \}\}/
  );
  assert.match(
    source('pages/AdminUsers/components/styles.ts'),
    /account-filters > \.ant-space-item \{\s*width: 100%/
  );
});

test('report period controls remain bounded on small screens', () => {
  for (const file of [
    'pages/AdminReports/components/styles.ts',
    'pages/FrontDeskDashboard/components/styles.ts',
  ]) {
    assert.match(
      source(file),
      /\.ant-segmented \{\s*max-width: 100%;\s*overflow-x: auto/
    );
  }
});

test('embedded booking grids can shrink below the selected pet label width', () => {
  const booking = source('pages/Home/components/QuickBookingSection.tsx');
  assert.match(
    booking,
    /grid-template-columns: minmax\(0, 1fr\) minmax\(0, 1\.35fr\)/
  );
  assert.match(
    booking,
    /const EmbeddedBookingCard[\s\S]*?grid-template-columns: minmax\(0, 1fr\)/
  );
  assert.match(booking, /const FormWrap = styled\.div`\s*min-width: 0/);
  assert.match(booking, /min-width: min\(100%, 280px\)/);
});
