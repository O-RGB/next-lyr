import React, { useState } from "react";

export interface BaseInputProps {
  label?: string;
  error?: string;
  helperText?: string;
  inputSize?: "sm" | "md" | "lg";
  labelPosition?: "top" | "left";
  className?: string;
}

interface BaseInputWrapperProps extends BaseInputProps {
  children: React.ReactNode;
  htmlFor?: string;
}

export const BaseInputWrapper: React.FC<BaseInputWrapperProps> = ({
  label,
  error,
  helperText,
  inputSize = "md",
  labelPosition = "top",
  children,
  htmlFor,
}) => {
  const labelSizeClass = {
    sm: "text-[9px]",
    md: "text-sm",
    lg: "text-base",
  }[inputSize];

  return (
    <div
      className={`flex w-full ${
        labelPosition === "left" ? "flex-row items-center gap-2" : "flex-col"
      }`}
    >
      {label && (
        <label
          htmlFor={htmlFor}
          className={`${labelSizeClass} font-medium text-gray-700 whitespace-nowrap`}
        >
          {label}
        </label>
      )}

      <div className="flex-1">
        {children}

        {error && <span className="text-sm text-red-500">{error}</span>}
        {helperText && !error && (
          <span className="text-sm text-gray-500">{helperText}</span>
        )}
      </div>
    </div>
  );
};

export const useInputFocus = () => {
  const [isFocused, setIsFocused] = useState(false);

  const handleFocus =
    (callback?: (e: React.FocusEvent<any>) => void) =>
    (e: React.FocusEvent<any>) => {
      setIsFocused(true);
      callback?.(e);
    };

  const handleBlur =
    (callback?: (e: React.FocusEvent<any>) => void) =>
    (e: React.FocusEvent<any>) => {
      setIsFocused(false);
      callback?.(e);
    };

  return { isFocused, handleFocus, handleBlur };
};

export const getInputSizeClass = (inputSize: "sm" | "md" | "lg") => {
  return {
    sm: "text-[10px] px-2.5 py-1.5 h-7",
    md: "text-base px-4 py-3 h-[42px]",
    lg: "text-lg px-5 py-3.5 h-[48px]",
  }[inputSize];
};

export const getInputBaseClass = (
  isFocused: boolean,
  error?: string,
  inputSize: "sm" | "md" | "lg" = "md",
  additionalClasses = ""
) => {
  const sizeClass = getInputSizeClass(inputSize);

  return `
    w-full
    bg-white
    border
    rounded-lg
    outline-none
    ${sizeClass}
    ${
      isFocused
        ? "border-blue-500 ring-2 ring-blue-100"
        : "border-gray-200 hover:border-gray-300"
    }
    ${error ? "border-red-500 ring-2 ring-red-100" : ""}
    transition-all
    duration-200
    text-gray-700
    disabled:bg-gray-50
    disabled:text-gray-500
    disabled:cursor-not-allowed
    ${additionalClasses}
  `.trim();
};
