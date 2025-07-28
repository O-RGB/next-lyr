import React, { forwardRef } from "react";
import {
  BaseInputProps,
  BaseInputWrapper,
  getInputBaseClass,
  useInputFocus,
} from "./base";

interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

interface SelectCommonProps
  extends BaseInputProps,
    Omit<
      React.DetailedHTMLProps<
        React.SelectHTMLAttributes<HTMLSelectElement>,
        HTMLSelectElement
      >,
      "size"
    > {
  options: SelectOption[];
  placeholder?: string;
}

const SelectCommon = forwardRef<HTMLSelectElement, SelectCommonProps>(
  (
    {
      label,
      error,
      helperText,
      inputSize = "md",
      labelPosition = "top",
      className = "",
      placeholder = "เลือกตัวเลือก",
      options,
      onFocus,
      onBlur,
      id,
      ...props
    },
    ref
  ) => {
    const { isFocused, handleFocus, handleBlur } = useInputFocus();

    const selectClassName = getInputBaseClass(
      isFocused,
      error,
      inputSize,
      `appearance-none cursor-pointer ${className}`
    );

    return (
      <BaseInputWrapper
        label={label}
        error={error}
        helperText={helperText}
        inputSize={inputSize}
        labelPosition={labelPosition}
        htmlFor={id}
      >
        <div className="relative">
          <select
            {...props}
            ref={ref}
            id={id}
            className={selectClassName}
            onFocus={handleFocus(onFocus)}
            onBlur={handleBlur(onBlur)}
          >
            {placeholder && (
              <option value="" disabled>
                {placeholder}
              </option>
            )}
            {options.map((option) => (
              <option
                key={option.value}
                value={option.value}
                disabled={option.disabled}
              >
                {option.label}
              </option>
            ))}
          </select>

          {/* Custom dropdown arrow */}
          <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
            <svg
              className="w-4 h-4 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </div>
        </div>
      </BaseInputWrapper>
    );
  }
);

SelectCommon.displayName = "SelectCommon";

export default SelectCommon;
