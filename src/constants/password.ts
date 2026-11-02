// Password rule from the SRS (MSG06): at least 8 characters, 1 uppercase
// letter and 1 digit. The BE only checks the length (8–72), so every form
// that sets a new password has to check the rest.
export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 72;

export const MSG06 = 'Mật khẩu cần ít nhất 8 ký tự, 1 chữ hoa và 1 chữ số.';
export const MSG_PASSWORD_TOO_LONG = `Mật khẩu tối đa ${PASSWORD_MAX_LENGTH} ký tự.`;

export interface PasswordRuleResult {
  minLength: boolean;
  uppercase: boolean;
  digit: boolean;
}

export const checkPasswordRules = (value = ''): PasswordRuleResult => ({
  minLength: value.length >= PASSWORD_MIN_LENGTH,
  // \p{Lu} also counts Vietnamese capitals such as Đ, Ă, Ơ
  uppercase: /\p{Lu}/u.test(value),
  digit: /\d/.test(value),
});

export const isStrongPassword = (value = ''): boolean => {
  const rules = checkPasswordRules(value);
  return rules.minLength && rules.uppercase && rules.digit;
};

/** antd Form rule validator for new-password fields (empty is left to `required`) */
export const passwordPolicyValidator = (_rule: unknown, value?: string) =>
  !value || isStrongPassword(value)
    ? Promise.resolve()
    : Promise.reject(new Error(MSG06));
