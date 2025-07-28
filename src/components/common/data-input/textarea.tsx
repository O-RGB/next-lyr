import React, { forwardRef } from "react";
import {
  BaseInputProps,
  useInputFocus,
  getInputBaseClass,
  BaseInputWrapper,
} from "./base";

interface TextareaCommonProps
  extends BaseInputProps,
    Omit<
      React.DetailedHTMLProps<
        React.TextareaHTMLAttributes<HTMLTextAreaElement>,
        HTMLTextAreaElement
      >,
      "size"
    > {
  rows?: number;
  resize?: "none" | "vertical" | "horizontal" | "both";
}

const TextareaCommon = forwardRef<HTMLTextAreaElement, TextareaCommonProps>(
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
      id,
      rows = 3,
      resize = "vertical",
      ...props
    },
    ref
  ) => {
    const { isFocused, handleFocus, handleBlur } = useInputFocus();

    const textareaClassName = getInputBaseClass(
      isFocused,
      error,
      inputSize,
      `placeholder:text-gray-400 resize-${resize} min-h-[${
        rows * 1.5
      }rem] ${className}`
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
          <textarea
            {...props}
            ref={ref}
            id={id}
            rows={rows}
            placeholder={placeholder}
            className={textareaClassName}
            onFocus={handleFocus(onFocus)}
            onBlur={handleBlur(onBlur)}
          />
        </div>
      </BaseInputWrapper>
    );
  }
);

TextareaCommon.displayName = "TextareaCommon";

export default TextareaCommon;
