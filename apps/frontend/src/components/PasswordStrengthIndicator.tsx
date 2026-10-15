import { useMemo } from "react";
import { Check, X } from "lucide-react";
import { PASSWORD_RULES, getPasswordStrength } from "@/lib/password-rules";

interface PasswordStrengthIndicatorProps {
  password: string;
}

export function PasswordStrengthIndicator({ password }: PasswordStrengthIndicatorProps) {
  const strength = useMemo(() => getPasswordStrength(password), [password]);
  const ruleResults = useMemo(
    () => PASSWORD_RULES.map((rule) => ({ ...rule, passed: rule.test(password) })),
    [password]
  );

  if (!password) return null;

  return (
    <div className="space-y-3">
      {/* Strength bar */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-muted-foreground">Password strength</span>
          <span className={`text-xs font-semibold ${strength.color}`}>{strength.label}</span>
        </div>
        <div className="flex gap-1">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className={`h-1.5 flex-1 rounded-full transition-colors duration-200 ${
                i < strength.score ? strength.bgColor : "bg-muted"
              }`}
            />
          ))}
        </div>
      </div>

      {/* Rule checklist */}
      <ul className="space-y-1">
        {ruleResults.map((rule) => (
          <li key={rule.label} className="flex items-center gap-2 text-xs">
            {rule.passed ? (
              <Check className="h-3.5 w-3.5 text-green-500 shrink-0" />
            ) : (
              <X className="h-3.5 w-3.5 text-muted-foreground/50 shrink-0" />
            )}
            <span className={rule.passed ? "text-green-600 dark:text-green-400" : "text-muted-foreground"}>
              {rule.label}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
