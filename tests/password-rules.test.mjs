import test from 'node:test';
import assert from 'node:assert/strict';

const password = await import('../src/constants/password.ts');

test('MSG06: a new password needs 8+ characters, an uppercase letter and a digit', () => {
  assert.equal(password.isStrongPassword('Matkhau1'), true);
  assert.equal(password.isStrongPassword('matkhau1'), false); // no uppercase
  assert.equal(password.isStrongPassword('Matkhaumoi'), false); // no digit
  assert.equal(password.isStrongPassword('Mkhau12'), false); // 7 characters
  assert.equal(password.isStrongPassword('abcdefg1@'), false); // special char does not replace uppercase
  assert.equal(password.isStrongPassword(''), false);
  assert.equal(password.isStrongPassword(), false);
});

test('Vietnamese capital letters count as uppercase', () => {
  assert.equal(password.isStrongPassword('Đặtlại12'), true);
  assert.equal(password.checkPasswordRules('ăn12345678').uppercase, false);
});

test('checkPasswordRules reports each rule separately for the checklist', () => {
  assert.deepEqual(password.checkPasswordRules('abc'), {
    minLength: false,
    uppercase: false,
    digit: false,
  });
  assert.deepEqual(password.checkPasswordRules('ABCDEFGH'), {
    minLength: true,
    uppercase: true,
    digit: false,
  });
});

test('passwordPolicyValidator rejects weak passwords with MSG06 and leaves empty to `required`', async () => {
  await assert.doesNotReject(
    password.passwordPolicyValidator(null, 'Matkhau1')
  );
  await assert.doesNotReject(password.passwordPolicyValidator(null, ''));
  await assert.doesNotReject(password.passwordPolicyValidator(null, undefined));
  await assert.rejects(password.passwordPolicyValidator(null, 'matkhau1'), {
    message: password.MSG06,
  });
});

test('password limits and messages match the SRS and the BE', () => {
  assert.equal(password.PASSWORD_MIN_LENGTH, 8);
  assert.equal(password.PASSWORD_MAX_LENGTH, 72);
  assert.equal(
    password.MSG06,
    'Mật khẩu cần ít nhất 8 ký tự, 1 chữ hoa và 1 chữ số.'
  );
});
