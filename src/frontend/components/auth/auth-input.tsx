import { cn } from "@/frontend/lib/utils/utils";
import { InputHTMLAttributes, forwardRef } from "react";

interface AuthInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}

export const AuthInput = forwardRef<HTMLInputElement, AuthInputProps>(
  ({ label, error, className, id, ...props }, ref) => {
    const inputId = id ?? label.toLowerCase().replace(/\s+/g, "-");
    return (
      <div className="space-y-1.5">
        <label
          htmlFor={inputId}
          className="block text-sm font-medium text-fg-secondary"
        >
          {label}
        </label>
        <input
          ref={ref}
          id={inputId}
          className={cn(
            "w-full px-4 py-3 rounded-xl bg-white/2 border text-fg-primary placeholder:text-fg-quaternary focus:outline-none transition-colors text-sm",
            error
              ? "border-status-rose focus:border-status-rose"
              : "border-border-standard focus:border-accent",
            className
          )}
          {...props}
        />
        {error && (
          <p className="text-xs text-[var(--status-rose)]">{error}</p>
        )}
      </div>
    );
  }
);

AuthInput.displayName = "AuthInput";
