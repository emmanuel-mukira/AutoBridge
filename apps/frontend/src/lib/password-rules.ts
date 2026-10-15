interface PasswordRule {
  label: string;
  test: (password: string) => boolean;
}

export const PASSWORD_RULES: PasswordRule[] = [
  { label: "At least 6 characters", test: (p: string) => p.length >= 6 },
  { label: "At least 1 uppercase letter", test: (p: string) => /[A-Z]/.test(p) },
  { label: "At least 1 lowercase letter", test: (p: string) => /[a-z]/.test(p) },
  { label: "At least 1 number", test: (p: string) => /[0-9]/.test(p) },
  { label: "At least 1 special character", test: (p: string) => /[^a-zA-Z0-9]/.test(p) },
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

  if (score <= 1) return { score, label: "Weak", color: "text-red-500", bgColor: "bg-red-500" };
  if (score <= 2) return { score, label: "Fair", color: "text-orange-500", bgColor: "bg-orange-500" };
  if (score <= 3) return { score, label: "Good", color: "text-yellow-500", bgColor: "bg-yellow-500" };
  if (score <= 4) return { score, label: "Strong", color: "text-emerald-500", bgColor: "bg-emerald-500" };
  return { score, label: "Very Strong", color: "text-green-600", bgColor: "bg-green-600" };
}

/**
 * Returns true if the password passes all strength rules.
 * Use this in form validation before submitting.
 */
export function isPasswordStrong(password: string): boolean {
  return PASSWORD_RULES.every((rule) => rule.test(password));
}
