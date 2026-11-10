// Since BE a1e9760 `protect` reads the account from the DB on every request and
// answers 403 when Admin has locked or deactivated it (UC-62): the session is
// over just like with an expired token. The BE spells "khoá"; "khóa" is accepted
// too, and both Unicode forms.
const BLOCKED_ACCOUNT = /^Tài khoản đã (bị kh(oá|óa)|ngừng hoạt động)/;

export const isBlockedAccountError = (
  status?: number,
  message?: unknown
): boolean =>
  status === 403 &&
  typeof message === 'string' &&
  BLOCKED_ACCOUNT.test(message.normalize('NFC'));
