import React, { useState } from "react";

interface InputCommonProps
  extends Omit<
    React.DetailedHTMLProps<
      React.InputHTMLAttributes<HTMLInputElement>,
      HTMLInputElement
    >,
    "size"
  > {
  label?: string;
  error?: string;
  helperText?: string;
  inputSize?: "sm" | "md" | "lg";
  labelPosition?: "top" | "left"; // new prop
}

const InputCommon: React.FC<InputCommonProps> = ({
  label,
  error,
  helperText,
  inputSize = "md",
  labelPosition = "top",
  className = "",
  type = "text",
  placeholder,
  ...props
}) => {
  const [isFocused, setIsFocused] = useState(false);

  const sizeClass = {
    sm: "text-[10px] px-2.5 py-1.5 h-8",
    md: "text-base px-4 py-3 h-[42px]",
    lg: "text-lg px-5 py-3.5 h-[48px]",
  }[inputSize];

  const labelSizeClass = {
    sm: "text-[10px]",
    md: "text-sm",
    lg: "text-base",
  }[inputSize];

  return (
    <div
      className={`flex w-full ${
        labelPosition === "left"
          ? "flex-row items-center gap-2"
          : "flex-col"
      }`}
    >
      {label && (
        <label
          className={`${labelSizeClass} font-medium text-gray-700 whitespace-nowrap`}
        >
          {label}
        </label>
      )}

      <div className="flex-1">
        <div className="relative  ">
          <input
            {...props}
            type={type}
            placeholder={placeholder}
            className={`
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
              placeholder:text-gray-400
              text-gray-700
              disabled:bg-gray-50
              disabled:text-gray-500
              disabled:cursor-not-allowed
              ${className}
            `}
            onFocus={(e) => {
              setIsFocused(true);
              props.onFocus?.(e);
            }}
            onBlur={(e) => {
              setIsFocused(false);
              props.onBlur?.(e);
            }}
          />
        </div>

        {error && <span className="text-sm text-red-500">{error}</span>}
        {helperText && !error && (
          <span className="text-sm text-gray-500">{helperText}</span>
        )}
      </div>
    </div>
  );
};

export default InputCommon;
