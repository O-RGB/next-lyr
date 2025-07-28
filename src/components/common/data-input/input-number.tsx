import React, { useState, useCallback, forwardRef } from "react";
import {
  BaseInputProps,
  useInputFocus,
  getInputBaseClass,
  BaseInputWrapper,
} from "./base";

interface InputNumberCommonProps
  extends BaseInputProps,
    Omit<
      React.DetailedHTMLProps<
        React.InputHTMLAttributes<HTMLInputElement>,
        HTMLInputElement
      >,
      "size" | "type" | "onChange" | "value" | "defaultValue"
    > {
  value?: number | string;
  defaultValue?: number | string;
  onChange?: (
    value: number | undefined,
    event: React.ChangeEvent<HTMLInputElement>
  ) => void;
  min?: number;
  max?: number;
  step?: number;
  precision?: number;
  showControls?: boolean;
  allowNegative?: boolean;
  thousandSeparator?: boolean;
  prefix?: string;
  suffix?: string;
  formatOnBlur?: boolean;
}

const InputNumberCommon = forwardRef<HTMLInputElement, InputNumberCommonProps>(
  (
    {
      label,
      error,
      helperText,
      inputSize = "md",
      labelPosition = "top",
      className = "",
      placeholder,
      onFocus,
      onBlur,
      onChange,
      value,
      defaultValue,
      min,
      max,
      step = 1,
      precision,
      showControls = false,
      allowNegative = true,
      thousandSeparator = false,
      prefix = "",
      suffix = "",
      formatOnBlur = true,
      disabled,
      id,
      ...props
    },
    ref
  ) => {
    const { isFocused, handleFocus, handleBlur } = useInputFocus();
    const [displayValue, setDisplayValue] = useState(() => {
      const initialValue = value !== undefined ? value : defaultValue;
      return initialValue !== undefined ? String(initialValue) : "";
    });

    const formatNumber = useCallback(
      (num: number): string => {
        if (!thousandSeparator) return num.toString();
        return num.toLocaleString("th-TH");
      },
      [thousandSeparator]
    );

    const parseNumber = useCallback(
      (str: string): number | undefined => {
        if (!str || str.trim() === "") return undefined;

        let cleanStr = str
          .replace(new RegExp(`^${prefix}`), "")
          .replace(new RegExp(`${suffix}$`), "")
          .replace(/,/g, "");

        const num = parseFloat(cleanStr);
        return isNaN(num) ? undefined : num;
      },
      [prefix, suffix]
    );

    const validateNumber = useCallback(
      (num: number): number => {
        if (!allowNegative && num < 0) num = 0;
        if (min !== undefined && num < min) num = min;
        if (max !== undefined && num > max) num = max;
        if (precision !== undefined) num = parseFloat(num.toFixed(precision));
        return num;
      },
      [allowNegative, min, max, precision]
    );

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const inputValue = e.target.value;

      const allowedChars = /^-?\d*\.?\d*$/;
      const cleanValue = inputValue
        .replace(new RegExp(`^${prefix}`), "")
        .replace(new RegExp(`${suffix}$`), "")
        .replace(/,/g, "");

      if (allowedChars.test(cleanValue) || cleanValue === "") {
        setDisplayValue(inputValue);

        const numericValue = parseNumber(inputValue);
        if (numericValue !== undefined) {
          const validatedValue = validateNumber(numericValue);
          onChange?.(validatedValue, e);
        } else {
          onChange?.(undefined, e);
        }
      }
    };

    const handleInputBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      const numericValue = parseNumber(displayValue);

      if (numericValue !== undefined && formatOnBlur) {
        const validatedValue = validateNumber(numericValue);
        const formattedValue = `${prefix}${formatNumber(
          validatedValue
        )}${suffix}`;
        setDisplayValue(formattedValue);

        onChange?.(validatedValue, e as any);
      }

      handleBlur(onBlur)(e);
    };

    const handleInputFocus = (e: React.FocusEvent<HTMLInputElement>) => {
      if (formatOnBlur) {
        const numericValue = parseNumber(displayValue);
        if (numericValue !== undefined) {
          setDisplayValue(numericValue.toString());
        }
      }

      handleFocus(onFocus)(e);
    };

    const increment = () => {
      if (disabled) return;
      const currentValue = parseNumber(displayValue) || 0;
      const newValue = validateNumber(currentValue + step);
      const formattedValue = `${prefix}${formatNumber(newValue)}${suffix}`;
      setDisplayValue(formattedValue);
      onChange?.(newValue, {} as any);
    };

    const decrement = () => {
      if (disabled) return;
      const currentValue = parseNumber(displayValue) || 0;
      const newValue = validateNumber(currentValue - step);
      const formattedValue = `${prefix}${formatNumber(newValue)}${suffix}`;
      setDisplayValue(formattedValue);
      onChange?.(newValue, {} as any);
    };

    React.useEffect(() => {
      if (value !== undefined) {
        const formattedValue =
          formatOnBlur && !isFocused
            ? `${prefix}${formatNumber(validateNumber(Number(value)))}${suffix}`
            : String(value);
        setDisplayValue(formattedValue);
      }
    }, [
      value,
      formatOnBlur,
      isFocused,
      prefix,
      suffix,
      formatNumber,
      validateNumber,
    ]);

    const inputClassName = getInputBaseClass(
      isFocused,
      error,
      inputSize,
      `placeholder:text-gray-400 ${showControls ? "pr-12" : ""} ${className}`
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
          <input
            {...props}
            ref={ref}
            id={id}
            type="text"
            inputMode="decimal"
            placeholder={placeholder}
            value={displayValue}
            disabled={disabled}
            className={inputClassName}
            onChange={handleInputChange}
            onFocus={handleInputFocus}
            onBlur={handleInputBlur}
          />

          {/* Increment/Decrement Controls */}
          {showControls && (
            <div className="absolute inset-y-0 right-0 flex flex-col">
              <button
                type="button"
                disabled={disabled}
                onClick={increment}
                className="flex-1 px-2 text-gray-400 hover:text-gray-600 disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none"
              >
                <svg
                  className="w-3 h-3"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 15l7-7 7 7"
                  />
                </svg>
              </button>

              <div className="border-t border-gray-200"></div>

              <button
                type="button"
                disabled={disabled}
                onClick={decrement}
                className="flex-1 px-2 text-gray-400 hover:text-gray-600 disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none"
              >
                <svg
                  className="w-3 h-3"
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
              </button>
            </div>
          )}
        </div>
      </BaseInputWrapper>
    );
  }
);

InputNumberCommon.displayName = "InputNumberCommon";

export default InputNumberCommon;
