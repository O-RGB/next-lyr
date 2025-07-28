import React, { forwardRef } from "react";
import {
  BaseInputProps,
  useInputFocus,
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
      onFocus,
      onBlur,
      id,
      ...props
    },
    ref
  ) => {
    const { isFocused, handleFocus, handleBlur } = useInputFocus();

    const inputClassName = getInputBaseClass(
      isFocused,
      error,
      inputSize,
      `placeholder:text-gray-400 ${className}`
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
            onFocus={handleFocus(onFocus)}
            onBlur={handleBlur(onBlur)}
          />
        </div>
      </BaseInputWrapper>
    );
  }
);

InputCommon.displayName = "InputCommon";

export default InputCommon;
