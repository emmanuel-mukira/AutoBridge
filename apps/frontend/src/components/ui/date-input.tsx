import * as React from "react";
import { cn } from "@/lib/utils";

const DateInput = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => {
    const inputRef = React.useRef<HTMLInputElement>(null);

    React.useImperativeHandle(ref, () => inputRef.current!);

    const handleContainerClick = () => {
      if (inputRef.current) {
        inputRef.current.showPicker?.();
      }
    };

    return (
      <div
        onClick={handleContainerClick}
        className={cn(
          "flex h-9 w-full cursor-pointer rounded-md border border-input bg-transparent text-sm shadow-sm transition-colors hover:bg-accent/5 focus-within:ring-1 focus-within:ring-ring",
          className
        )}
      >
        <input
          type="date"
          className="w-full bg-transparent px-3 py-1 outline-none cursor-pointer file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50 [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-100 [&::-webkit-datetime-edit]:text-foreground"
          ref={inputRef}
          {...props}
        />
      </div>
    );
  }
);
DateInput.displayName = "DateInput";

export { DateInput };
