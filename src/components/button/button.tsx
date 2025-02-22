import React from "react";

type ButtonSize = "sm" | "md" | "lg";
type ButtonVariant = "solid" | "outline" | "ghost";
type ButtonColor =
  | "primary"
  | "secondary"
  | "danger"
  | "warning"
  | "success"
  | "gray";

interface ButtonCommonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children?: React.ReactNode;
  color?: ButtonColor;
  variant?: ButtonVariant;
  size?: ButtonSize;
  isRounded?: boolean;
  isFullWidth?: boolean;
  icon?: React.ReactNode;
  iconPosition?: "left" | "right";
  isLoading?: boolean;
}

const ButtonCommon: React.FC<ButtonCommonProps> = ({
  children,
  color = "primary",
  variant = "solid",
  size = "md",
  isRounded = false,
  isFullWidth = false,
  icon,
  iconPosition = "left",
  isLoading = false,
  disabled,
  className = "",
  ...props
}) => {
  const baseStyles =
    "font-medium transition-all duration-200 flex items-center justify-center gap-2";
  const disabledStyles = "disabled:opacity-50 disabled:cursor-not-allowed";

  const sizeStyles = {
    sm: "px-3 py-1.5 text-sm",
    md: "px-4 py-2 text-base",
    lg: "px-6 py-3 text-lg",
  };

  const roundedStyles = isRounded ? "rounded-full" : "rounded-lg";
  const widthStyles = isFullWidth ? "w-full" : "";

  const getVariantStyles = () => {
    const styles = {
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
    };

    return styles[color]?.[variant] || styles.primary.solid;
  };

  const renderContent = () => {
    return (
      <>
        {isLoading && (
          <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
              fill="none"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
        )}
        {!isLoading && icon && iconPosition === "left" && icon}
        {children && <span>{children}</span>}
        {!isLoading && icon && iconPosition === "right" && icon}
      </>
    );
  };

  return (
    <button
      {...props}
      disabled={disabled || isLoading}
      className={`
        ${baseStyles}
        ${sizeStyles[size]}
        ${roundedStyles}
        ${widthStyles}
        ${getVariantStyles()}
        ${disabledStyles}
        ${className}
      `}
    >
      {renderContent()}
    </button>
  );
};

export default ButtonCommon;
