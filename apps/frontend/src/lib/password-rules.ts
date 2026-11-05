interface PasswordRule {
  label: string;
  test: (password: string) => boolean;
}

export const PASSWORD_RULES: PasswordRule[] = [
  { label: "At least 6 characters", test: (p: string) => p.length >= 6 },
  { label: "No more than 128 characters", test: (p: string) => p.length <= 128 },
];

interface StrengthResult {
  score: number;
  label: string;
  color: string;
  bgColor: string;
}

export function getPasswordStrength(password: string): StrengthResult {
  const passed = PASSWORD_RULES.filter((rule) => rule.test(password)).length;
  const score = passed;

  if (score < PASSWORD_RULES.length) return { score, label: "Incomplete", color: "text-amber-600", bgColor: "bg-amber-500" };
  return { score, label: "Meets requirements", color: "text-green-600", bgColor: "bg-green-600" };
}

/**
 * Returns true if the password passes all strength rules.
 * Use this in form validation before submitting.
 */
export function isPasswordStrong(password: string): boolean {
  return PASSWORD_RULES.every((rule) => rule.test(password));
}
