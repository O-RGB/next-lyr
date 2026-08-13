import { Loader2 } from "lucide-react";
import React, { forwardRef } from "react";

import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * The editor's original button API, backed by the shared base-ui button.
 *
 * The colour names predate the design tokens, so they are mapped onto the
 * palette here rather than at every call site — `success` and `warning` still
 * mean something to the code that raises them, they just no longer carry their
 * own hard-coded hex values.
 */

export type ButtonSize = "xs" | "sm" | "md" | "lg";
export type ButtonVariant = "solid" | "outline" | "ghost";
export type ButtonColor =
  | "primary"
  | "secondary"
  | "danger"
  | "warning"
  | "success"
  | "gray"
  | "white";

export interface ButtonCommonProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "color"> {
  children?: React.ReactNode;
  color?: ButtonColor;
  variant?: ButtonVariant;
  size?: ButtonSize;
  isRounded?: boolean;
  isFullWidth?: boolean;
  circle?: boolean;
  outline?: boolean;
  icon?: React.ReactNode;
  iconPosition?: "left" | "right";
  isLoading?: boolean;
  hidden?: boolean;
  childrenClassName?: string;
}

/** Colour accents applied on top of the base variant. */
const ACCENT: Record<ButtonColor, Record<ButtonVariant, string>> = {
  primary: { solid: "", outline: "", ghost: "" },
  secondary: {
    solid: "bg-brand-2 text-primary-foreground hover:bg-brand-2/85",
    outline: "border-brand-2 text-brand-2 hover:bg-brand-2/10",
    ghost: "text-brand-2 hover:bg-brand-2/10",
  },
  danger: {
    solid: "bg-destructive text-primary-foreground hover:bg-destructive/85",
    outline: "border-destructive text-destructive hover:bg-destructive/10",
    ghost: "text-destructive hover:bg-destructive/10",
  },
  warning: {
    solid: "bg-warn text-primary-foreground hover:bg-warn/85",
    outline: "border-warn text-warn hover:bg-warn/10",
    ghost: "text-warn hover:bg-warn/10",
  },
  success: {
    solid: "bg-brand-2 text-primary-foreground hover:bg-brand-2/85",
    outline: "border-brand-2 text-brand-2 hover:bg-brand-2/10",
    ghost: "text-brand-2 hover:bg-brand-2/10",
  },
  gray: { solid: "", outline: "", ghost: "" },
  white: { solid: "", outline: "", ghost: "" },
};

/** Which base variant each colour starts from. */
const BASE: Record<ButtonColor, Record<ButtonVariant, "default" | "outline" | "ghost" | "secondary">> = {
  primary: { solid: "default", outline: "outline", ghost: "ghost" },
  secondary: { solid: "default", outline: "outline", ghost: "ghost" },
  danger: { solid: "default", outline: "outline", ghost: "ghost" },
  warning: { solid: "default", outline: "outline", ghost: "ghost" },
  success: { solid: "default", outline: "outline", ghost: "ghost" },
  gray: { solid: "secondary", outline: "outline", ghost: "ghost" },
  white: { solid: "outline", outline: "outline", ghost: "ghost" },
};

const SIZE = {
  regular: { xs: "xs", sm: "sm", md: "default", lg: "lg" },
  circle: { xs: "icon-xs", sm: "icon-sm", md: "icon", lg: "icon-lg" },
} as const;

const ButtonCommon = forwardRef<HTMLButtonElement, ButtonCommonProps>(
  (
    {
      children,
      color = "primary",
      variant = "solid",
      size,
      isRounded = false,
      isFullWidth = false,
      circle = false,
      outline = false,
      icon,
      iconPosition = "left",
      isLoading = false,
      disabled,
      className,
      childrenClassName,
      hidden,
      ...props
    },
    ref
  ) => {
    if (hidden) return null;

    const resolvedVariant = outline ? "outline" : variant;
    // `md` is the sensible default now that the old responsive "auto" size,
    // which changed height at every breakpoint, is gone.
    const resolvedSize = SIZE[circle ? "circle" : "regular"][size ?? "md"];

    return (
      <Button
        ref={ref}
        disabled={disabled || isLoading}
        variant={BASE[color][resolvedVariant]}
        size={resolvedSize}
        className={cn(
          ACCENT[color][resolvedVariant],
          (isRounded || circle) && "!rounded-full",
          !circle && isFullWidth && "w-full",
          className
        )}
        {...props}
      >
        {isLoading ? <Loader2 className="animate-spin" /> : null}
        {!isLoading && icon && iconPosition === "left" ? icon : null}
        {children ? <span className={childrenClassName}>{children}</span> : null}
        {!isLoading && icon && iconPosition === "right" ? icon : null}
      </Button>
    );
  }
);

ButtonCommon.displayName = "ButtonCommon";

export { buttonVariants };
export default ButtonCommon;
