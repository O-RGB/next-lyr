import React, { forwardRef } from "react";
import {
  BaseInputProps,
  getInputBaseClass,
  BaseInputWrapper,
  InputPrefix,
} from "./base";

interface InputCommonProps
  extends BaseInputProps,
    Omit<
      React.DetailedHTMLProps<
        React.InputHTMLAttributes<HTMLInputElement>,
        HTMLInputElement
      >,
      "size"
    > { prefixIcon?: React.ReactNode }

const InputCommon = forwardRef<HTMLInputElement, InputCommonProps>(
  (
    {
      label,
      error,
      helperText,
      inputSize = "md",
      labelPosition = "top",
      className = "",
      type = "text",
      placeholder,
      value,
      onFocus,
      onBlur,
      id,
      prefixIcon,
      ...props
    },
    ref
  ) => {
    const inputClassName = getInputBaseClass(
      error,
      inputSize,
      `placeholder:text-muted-foreground ${prefixIcon ? "pl-7" : ""} ${className}`
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
          <input
            {...props}
            ref={ref}
            id={id}
            type={type}
            placeholder={placeholder}
            className={inputClassName}
            onFocus={onFocus}
            onBlur={onBlur}
            {...(value !== undefined ? { value: value ?? "" } : {})}
          />
        </div>
      </BaseInputWrapper>
    );
  }
);

InputCommon.displayName = "InputCommon";

export default InputCommon;
