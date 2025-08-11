import React, { forwardRef, useEffect } from "react";

export type ButtonSize = "sm" | "md" | "lg";
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
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
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

const ButtonCommon = forwardRef<HTMLButtonElement, ButtonCommonProps>(
  (
    {
      children,
      color = "primary",
      variant = "solid",
      size = "md",
      isRounded = false,
      isFullWidth = false,
      circle = false,
      outline = false,
      icon,
      iconPosition = "left",
      isLoading = false,
      disabled,
      className = "",
      childrenClassName,
      ...props
    },
    ref
  ) => {
    const finalVariant = outline ? "outline" : variant;

    const colorStyles: Record<ButtonColor, Record<ButtonVariant, string>> = {
      primary: {
        solid:
          "bg-blue-500 text-white hover:bg-blue-600 active:bg-blue-700 shadow-sm",
        outline:
          "border-2 border-blue-500 text-blue-500 hover:bg-blue-50 active:bg-blue-100",
        ghost: "text-blue-500 hover:bg-blue-50 active:bg-blue-100",
      },
      secondary: {
        solid:
          "bg-purple-500 text-white hover:bg-purple-600 active:bg-purple-700 shadow-sm",
        outline:
          "border-2 border-purple-500 text-purple-500 hover:bg-purple-50 active:bg-purple-100",
        ghost: "text-purple-500 hover:bg-purple-50 active:bg-purple-100",
      },
      danger: {
        solid:
          "bg-red-500 text-white hover:bg-red-600 active:bg-red-700 shadow-sm",
        outline:
          "border-2 border-red-500 text-red-500 hover:bg-red-50 active:bg-red-100",
        ghost: "text-red-500 hover:bg-red-50 active:bg-red-100",
      },
      warning: {
        solid:
          "bg-yellow-500 text-white hover:bg-yellow-600 active:bg-yellow-700 shadow-sm",
        outline:
          "border-2 border-yellow-500 text-yellow-500 hover:bg-yellow-50 active:bg-yellow-100",
        ghost: "text-yellow-500 hover:bg-yellow-50 active:bg-yellow-100",
      },
      success: {
        solid:
          "bg-green-500 text-white hover:bg-green-600 active:bg-green-700 shadow-sm",
        outline:
          "border-2 border-green-500 text-green-500 hover:bg-green-50 active:bg-green-100",
        ghost: "text-green-500 hover:bg-green-50 active:bg-green-100",
      },
      gray: {
        solid:
          "bg-gray-500 text-white hover:bg-gray-600 active:bg-gray-700 shadow-sm",
        outline:
          "border-2 border-gray-500 text-gray-500 hover:bg-gray-50 active:bg-gray-100",
        ghost: "text-gray-500 hover:bg-gray-50 active:bg-gray-100",
      },
      white: {
        solid:
          "bg-white text-gray-800 hover:text-blue-500 active:bg-blue-50 active:border-blue-600 shadow-sm",
        outline:
          "border-2 border-white text-white hover:bg-white/20 active:bg-white/30",
        ghost: "text-white hover:bg-white/20 active:bg-white/30",
      },
    };

    const sizeStyles = {
      regular: {
        sm: "px-3 py-1.5 text-sm",
        md: "px-4 py-2 text-base",
        lg: "px-6 py-3 text-lg",
      },
      circle: { sm: "p-1.5", md: "p-2", lg: "p-3" },
    };

    const cn = (...classes: (string | boolean | undefined)[]) =>
      classes.filter(Boolean).join(" ");

    const buttonClasses = cn(
      "font-medium transition-all duration-200 flex items-center justify-center gap-2",
      "disabled:opacity-50 disabled:cursor-not-allowed",

      colorStyles[color]?.[finalVariant] || colorStyles.primary.solid,

      circle
        ? `rounded-full ${sizeStyles.circle[size]}`
        : cn(
            isRounded ? "rounded-full" : "rounded-lg",
            sizeStyles.regular[size]
          ),

      !circle && isFullWidth && "w-full",

      className
    );

    const renderContent = () => (
      <>
        {isLoading && (
          <svg
            className="animate-spin h-5 w-5"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            ></circle>
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            ></path>
          </svg>
        )}
        {!isLoading && icon && iconPosition === "left" && <div>{icon}</div>}
        {children && <span className={childrenClassName}>{children}</span>}
        {!isLoading && icon && iconPosition === "right" && <div>{icon}</div>}
      </>
    );

    if (props.hidden) return null;
    return (
      <button
        ref={ref}
        {...props}
        disabled={disabled || isLoading}
        className={buttonClasses}
      >
        {renderContent()}
      </button>
    );
  }
);

ButtonCommon.displayName = "ButtonCommon";

export default ButtonCommon;
