import * as React from "react";

import { cn } from "@/lib/utils";

type SwitchProps = Omit<
  React.ButtonHTMLAttributes<HTMLButtonElement>,
  "onChange"
> & {
  checked?: boolean;
  defaultChecked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  size?: "sm" | "default";
};

/** Native button switch. It keeps the existing checked/onCheckedChange API. */
const Switch = React.forwardRef<HTMLButtonElement, SwitchProps>(
  (
    {
      className,
      checked,
      defaultChecked = false,
      onCheckedChange,
      size = "default",
      disabled,
      onClick,
      ...props
    },
    ref
  ) => {
    const [internalChecked, setInternalChecked] =
      React.useState(defaultChecked);
    const isChecked = checked ?? internalChecked;

    const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
      const nextChecked = !isChecked;
      if (checked === undefined) setInternalChecked(nextChecked);
      onCheckedChange?.(nextChecked);
      onClick?.(event);
    };

    return (
      <button
        {...props}
        ref={ref}
        type="button"
        role="switch"
        aria-checked={isChecked}
        disabled={disabled}
        data-slot="switch"
        data-size={size}
        data-checked={isChecked ? "true" : "false"}
        className={cn(
          "relative inline-flex shrink-0 items-center rounded-full border border-transparent outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50",
          size === "sm" ? "h-3.5 w-6" : "h-[18.4px] w-8",
          isChecked ? "bg-primary" : "bg-input dark:bg-input/80",
          className
        )}
      >
        <span
          data-slot="switch-thumb"
          className={cn(
            "pointer-events-none block rounded-full bg-background transition-transform",
            size === "sm" ? "size-3" : "size-4",
            isChecked
              ? size === "sm"
                ? "translate-x-[calc(100%-2px)]"
                : "translate-x-[calc(100%-2px)]"
              : "translate-x-0",
            isChecked && "dark:bg-primary-foreground"
          )}
        />
      </button>
    );
  }
);

Switch.displayName = "Switch";

export { Switch };
