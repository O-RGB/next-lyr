import React, { forwardRef } from "react";
import { ChevronDown } from "lucide-react";
import { text } from "@/features/settings/locale";
import { useSettingsStore } from "@/features/settings/settings-store";
import {
  BaseInputProps,
  BaseInputWrapper,
  getInputBaseClass,
  InputPrefix,
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
  prefixIcon?: React.ReactNode;
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
      placeholder,
      options,
      onFocus,
      onBlur,
      id,
      prefixIcon,
      ...props
    },
    ref
  ) => {
    const locale = useSettingsStore((state) => state.uiLocale);
    const resolvedPlaceholder = placeholder ?? text(locale, "เลือกตัวเลือก", "Select an option");
    const selectClassName = getInputBaseClass(
      error,
      inputSize,
      `appearance-none cursor-pointer pr-6 ${prefixIcon ? "pl-7" : ""} ${className}`
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
          <InputPrefix icon={prefixIcon} />
          <select
            {...props}
            ref={ref}
            id={id}
            className={selectClassName}
            onFocus={onFocus}
            onBlur={onBlur}
          >
            {resolvedPlaceholder && (
              <option value="" disabled>
                {resolvedPlaceholder}
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

          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
            <ChevronDown aria-hidden="true" className="size-3.5 text-muted-foreground" />
          </div>
        </div>
      </BaseInputWrapper>
    );
  }
);

SelectCommon.displayName = "SelectCommon";

export default SelectCommon;
