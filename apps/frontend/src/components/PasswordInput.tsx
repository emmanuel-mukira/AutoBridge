import { forwardRef, useState, useCallback, memo } from "react";
import { Input } from "@/components/ui/input";
import { Eye, EyeOff } from "lucide-react";

export type PasswordInputProps = React.ComponentProps<typeof Input>;

const PasswordInputComponent = forwardRef<HTMLInputElement, PasswordInputProps>(
  ({ className, ...props }, ref) => {
    const [show, setShow] = useState(false);

    const toggleShow = useCallback(() => {
      setShow((s) => !s);
    }, []);

    return (
      <div className="relative">
        <Input
          ref={ref}
          type={show ? "text" : "password"}
          className={["pr-12", className].filter(Boolean).join(" ")}
          {...props}
        />
        <button
          type="button"
          aria-label={show ? "Hide password" : "Show password"}
          onClick={toggleShow}
          className="absolute inset-y-0 right-2 my-auto grid place-items-center p-0 bg-transparent hover:bg-transparent focus:outline-none focus-visible:ring-0 text-muted-foreground hover:text-foreground transition-colors"
        >
          {show ? (
            <EyeOff className="h-5 w-5" strokeWidth={2.5} />
          ) : (
            <Eye className="h-5 w-5" strokeWidth={2.5} />
          )}
        </button>
      </div>
    );
  }
);
PasswordInputComponent.displayName = "PasswordInput";

// Memoize to prevent unnecessary re-renders
export const PasswordInput = memo(PasswordInputComponent);
