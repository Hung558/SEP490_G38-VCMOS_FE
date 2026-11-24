import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

const source = readFileSync(
  new URL('../src/pages/Profile/index.tsx', import.meta.url),
  'utf8'
);
const page = ts.createSourceFile(
  'Profile.tsx',
  source,
  ts.ScriptTarget.Latest,
  true,
  ts.ScriptKind.TSX
);
const nodes = [];
const visit = node => {
  nodes.push(node);
  ts.forEachChild(node, visit);
};
visit(page);

// 24/11: every page title is the shared PageTitle, an <h1>
test('profile has one primary account heading before its information card', () => {
  const titles = nodes.filter(
    node =>
      ts.isJsxElement(node) &&
      node.openingElement.tagName.getText(page) === 'PageTitle'
  );
  assert.equal(titles.length, 1);
  const title = titles[0];
  assert.match(title.getText(page), /Thông tin tài khoản/);
  assert.ok(title.getStart(page) < source.indexOf('<ProfileCard>'));
});

test('profile does not render the redundant role-based profile subtitle', () => {
  assert.ok(
    !nodes.some(
      node =>
        ts.isCallExpression(node) &&
        node.expression.getText(page) === 'getProfileSubtitle'
    )
  );
  // Role information remains in the identity badge and account details.
  assert.equal(
    nodes.filter(
      node =>
        ts.isCallExpression(node) &&
        node.expression.getText(page) === 'getRoleLabel'
    ).length,
    2
  );
});
