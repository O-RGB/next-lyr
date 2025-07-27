import React, { useState } from "react";

interface CheckboxOption {
  label: string;
  value: string;
}

interface CheckboxGroupProps {
  options: CheckboxOption[];
  onChange?: (values: string[]) => void;
  defaultValue?: string[];
  disabled?: boolean;
  className?: string;
}

interface SingleCheckboxProps {
  label: string;
  checked: boolean;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  disabled?: boolean;
}

const SingleCheckbox: React.FC<SingleCheckboxProps> = ({
  label,
  checked,
  onChange,
  disabled,
}) => {
  return (
    <label className="flex items-center gap-2 cursor-pointer select-none">
      <div className="relative">
        <input
          type="checkbox"
          className="peer sr-only"
          checked={checked}
          onChange={onChange}
          disabled={disabled}
        />
        <div
          className={`
          w-5 h-5 border-2 rounded
          flex items-center justify-center
          transition-all duration-200
          ${
            checked ? "bg-blue-500 border-blue-500" : "bg-white border-gray-300"
          }
          ${
            disabled
              ? "opacity-50 cursor-not-allowed"
              : "peer-hover:border-blue-500"
          }
        `}
        >
          {checked && (
            <svg
              className="w-3 h-3 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={3}
                d="M5 13l4 4L19 7"
              />
            </svg>
          )}
        </div>
      </div>
      <span
        className={`
        text-gray-700
        ${disabled ? "opacity-50 cursor-not-allowed" : ""}
      `}
      >
        {label}
      </span>
    </label>
  );
};

const CheckboxGroup: React.FC<CheckboxGroupProps> = ({
  options,
  onChange,
  defaultValue = [],
  disabled = false,
  className = "",
}) => {
  const [selectedValues, setSelectedValues] = useState<string[]>(defaultValue);

  const handleCheckboxChange = (value: string) => {
    const newValues = selectedValues.includes(value)
      ? selectedValues.filter((v) => v !== value)
      : [...selectedValues, value];

    setSelectedValues(newValues);
    onChange?.(newValues);
  };

  return (
    <div className={`flex flex-col gap-3 ${className}`}>
      {options.map((option) => (
        <SingleCheckbox
          key={option.value}
          label={option.label}
          checked={selectedValues.includes(option.value)}
          onChange={() => handleCheckboxChange(option.value)}
          disabled={disabled}
        />
      ))}
    </div>
  );
};

export default CheckboxGroup;
