import React, { forwardRef } from "react";
import {
  BaseInputProps,
  getInputBaseClass,
  BaseInputWrapper,
} from "./base";

interface InputCommonProps
  extends BaseInputProps,
    Omit<
      React.DetailedHTMLProps<
        React.InputHTMLAttributes<HTMLInputElement>,
        HTMLInputElement
      >,
      "size"
    > {}

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
      ...props
    },
    ref
  ) => {
    const inputClassName = getInputBaseClass(
      error,
      inputSize,
      `placeholder:text-muted-foreground ${className}`
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
