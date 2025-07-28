import React from "react";

interface RadioOption {
  label: string;
  value: string;
}

interface RadioGroupProps {
  options: RadioOption[];
  value?: string;
  onChange?: (value: string) => void;
  name: string;
  disabled?: boolean;
  className?: string;
}

interface SingleRadioProps {
  label: string;
  checked: boolean;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  disabled?: boolean;
  name: string;
  value: string;
}

const SingleRadio: React.FC<SingleRadioProps> = ({
  label,
  checked,
  onChange,
  disabled,
  name,
  value,
}) => {
  return (
    <label className="flex items-center gap-2 cursor-pointer select-none">
      <div className="relative">
        <input
          type="radio"
          name={name}
          value={value}
          className="peer sr-only"
          checked={checked}
          onChange={onChange}
          disabled={disabled}
        />
        <div
          className={`
          w-5 h-5 border-2 rounded-full
          flex items-center justify-center
          transition-all duration-200
          ${checked ? "border-blue-500" : "border-gray-300"}
          ${
            disabled
              ? "opacity-50 cursor-not-allowed"
              : "peer-hover:border-blue-500"
          }
        `}
        >
          <div
            className={`
            w-2.5 h-2.5 rounded-full
            transition-all duration-200
            ${checked ? "bg-blue-500" : "bg-transparent"}
          `}
          />
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

const RadioGroup: React.FC<RadioGroupProps> = ({
  options,
  value,
  onChange,
  name,
  disabled = false,
  className = "",
}) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange?.(e.target.value);
  };

  return (
    <div className={`flex flex-col gap-3 ${className}`}>
      {options.map((option) => (
        <SingleRadio
          key={option.value}
          name={name}
          value={option.value}
          label={option.label}
          checked={value === option.value}
          onChange={handleChange}
          disabled={disabled}
        />
      ))}
    </div>
  );
};

export default RadioGroup;
