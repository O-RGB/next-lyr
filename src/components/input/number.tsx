import React, { useState, useEffect } from "react";

interface InputNumberCommonProps
  extends Omit<
    React.DetailedHTMLProps<
      React.InputHTMLAttributes<HTMLInputElement>,
      HTMLInputElement
    >,
    "type" | "onChange"
  > {
  label?: string;
  error?: string;
  helperText?: string;
  min?: number;
  max?: number;
  value?: number | string;
  onChange?: (value: number | null) => void;
}

const InputNumberCommon: React.FC<InputNumberCommonProps> = ({
  label,
  error,
  helperText,
  className = "",
  placeholder,
  min,
  max,
  value: propValue = "",
  onChange,
  ...props
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [inputValue, setInputValue] = useState(propValue.toString());

  useEffect(() => {
    setInputValue(propValue !== undefined ? propValue.toString() : "");
  }, [propValue]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;

    setInputValue(val);

    if (val === "") {
      onChange?.(null);
      return;
    }

    const num = parseInt(val, 10);
    if (!isNaN(num)) onChange?.(num);
  };

  const clampValue = (val: string) => {
    if (val === "") return "";
    let num = parseInt(val, 10);
    if (isNaN(num)) return "";

    if (min !== undefined && num < min) num = min;
    if (max !== undefined && num > max) num = max;
    return num.toString();
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    setIsFocused(false);
    const clamped = clampValue(inputValue);
    setInputValue(clamped);
    if (clamped === "") onChange?.(null);
    else onChange?.(parseInt(clamped, 10));
    props.onBlur?.(e);
  };

  return (
    <div className="flex flex-col gap-1.5 w-full">
      {label && (
        <label className="text-sm font-medium text-gray-700">{label}</label>
      )}
      <div className="relative p-[1px]">
        <input
          {...props}
          type="number"
          placeholder={placeholder}
          value={inputValue}
          min={min}
          max={max}
          onChange={handleChange}
          onFocus={(e) => {
            setIsFocused(true);
            props.onFocus?.(e);
          }}
          onBlur={handleBlur}
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
        />
      </div>
      {error && <span className="text-sm text-red-500">{error}</span>}
      {helperText && !error && (
        <span className="text-sm text-gray-500">{helperText}</span>
      )}
    </div>
  );
};

export default InputNumberCommon;
