import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

test('user-facing source text does not expose internal requirement codes', () => {
  const root = fileURLToPath(new URL('../src/', import.meta.url));
  const violations = [];
  function inspect(directory) {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) {
        inspect(path);
      } else if (/\.tsx?$/.test(path)) {
        const text = readFileSync(path, 'utf8');
        const source = ts.createSourceFile(path, text, ts.ScriptTarget.Latest, true);
        function visit(node) {
          // Inspect text nodes only: implementation identifiers and comments
          // intentionally retain traceability to the specification.
          if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)
            || ts.isTemplateHead(node) || ts.isTemplateMiddle(node)
            || ts.isTemplateTail(node) || ts.isJsxText(node)) {
            const start = node.getStart(source);
            const raw = text.slice(start, node.end);
            if (/\((?:(?:BR|SCR|UC)-\d+|MSG\d+)(?:\s*,\s*(?:(?:BR|SCR|UC)-\d+|MSG\d+))*\)/.test(raw)) {
              const { line } = source.getLineAndCharacterOfPosition(start);
              violations.push(`${relative(root, path)}:${line + 1}: ${raw.trim()}`);
            }
          }
          ts.forEachChild(node, visit);
        }
        visit(source);
      }
    }
  }
  inspect(root);
  assert.deepEqual(violations, []);
});

test('clinic header omits account summary and email badge without removing sidebar actions', () => {
  const source = readFileSync(new URL('../src/components/layout/MainLayout/index.tsx', import.meta.url), 'utf8');
  assert.doesNotMatch(source, /EmailVerifyBadge|MenuUser|<Popover|top-user/);
  assert.match(source, /<Breadcrumb\s*\/>/);
  assert.match(source, /styles\.userInfoRow/);
  assert.match(source, /onClick=\{handleLogout\}/);
  assert.match(source, /showHomeLinks &&/);
});

test('owner dashboard navigation tabs use plain text labels', () => {
  const source = readFileSync(new URL('../src/pages/Dashboard/index.tsx', import.meta.url), 'utf8');
  for (const [key, label] of [['pets', 'Quản lí thú cưng'], ['appointments', 'Quản lí lịch đặt'], ['journey', 'Hành trình của bé']]) {
    assert.ok(source.includes(`{ key: '${key}', label: '${label}' }`));
  }
});

test('booking card title has no decorative emoji', () => {
  const source = readFileSync(new URL('../src/pages/Dashboard/index.tsx', import.meta.url), 'utf8');
  assert.match(source, /title="Đặt lịch khám mới"/);
  assert.doesNotMatch(source, /📝 Đặt lịch khám mới/);
});

test('dashboard section headings have no decorative emoji', () => {
  const source = readFileSync(new URL('../src/pages/Dashboard/index.tsx', import.meta.url), 'utf8');
  assert.ok(source.includes('<span>Danh Sách Lịch Hẹn Khám Trực Tuyến</span>'));
  assert.ok(source.includes('<span>Hồ Sơ Thú Cưng Của Tôi</span>'));
});
