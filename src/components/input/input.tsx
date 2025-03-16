import React, { useState } from "react";

interface InputCommonProps
  extends React.DetailedHTMLProps<
    React.InputHTMLAttributes<HTMLInputElement>,
    HTMLInputElement
  > {
  label?: string;
  error?: string;
  helperText?: string;
}

const InputCommon: React.FC<InputCommonProps> = ({
  label,
  error,
  helperText,
  className = "",
  type = "text",
  placeholder,
  ...props
}) => {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <div className="flex flex-col gap-1.5 w-full">
      {label && (
        <label className="text-sm font-medium text-gray-700">{label}</label>
      )}
      <div className="relative">
        <input
          {...props}
          type={type}
          placeholder={placeholder}
          className={`
            w-full
            px-4 
            py-3
            h-[42px]
            bg-white
            border
            rounded-lg
            outline-none
            text-base
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
  );
};

export default InputCommon;
