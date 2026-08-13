import React from "react";

import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

/**
 * Shared chrome for the editor's form controls: the label/error/helper frame
 * and the field class string. Every data-input component funnels through here,
 * so the design tokens only have to be applied once.
 */

export interface BaseInputProps {
  label?: string;
  error?: string;
  helperText?: string;
  inputSize?: "sm" | "md" | "lg";
  labelPosition?: "top" | "left";
  className?: string;
}

interface BaseInputWrapperProps extends BaseInputProps {
  children: React.ReactNode;
  htmlFor?: string;
}

const LABEL_SIZE = {
  sm: "text-[10px]",
  md: "text-xs",
  lg: "text-sm",
} as const;

export const BaseInputWrapper: React.FC<BaseInputWrapperProps> = ({
  label,
  error,
  helperText,
  inputSize = "md",
  labelPosition = "top",
  children,
  htmlFor,
}) => (
  <div
    className={cn(
      "flex w-full",
      labelPosition === "left" ? "flex-row items-center gap-2" : "flex-col gap-1"
    )}
  >
    {label ? (
      <Label
        htmlFor={htmlFor}
        className={cn(
          LABEL_SIZE[inputSize],
          "font-medium whitespace-nowrap text-muted-foreground"
        )}
      >
        {label}
      </Label>
    ) : null}

    <div className="min-w-0 flex-1">
      {children}
      {error ? (
        <span className="mt-1 block text-xs text-destructive">{error}</span>
      ) : null}
      {helperText && !error ? (
        <span className="mt-1 block text-xs text-muted-foreground">
          {helperText}
        </span>
      ) : null}
    </div>
  </div>
);

const SIZE_CLASS = {
  sm: "h-7 px-2 text-xs",
  md: "h-8 px-2.5 text-sm",
  lg: "h-10 px-3 text-base",
} as const;

/**
 * Field styling. Focus is expressed with `:focus-visible` rather than tracked
 * React state, so a field styled through this helper stays correct even when
 * something else moves focus.
 */
export const getInputBaseClass = (
  error?: string,
  inputSize: "sm" | "md" | "lg" = "md",
  additionalClasses = ""
) =>
  cn(
    "w-full min-w-0 border border-input bg-transparent text-foreground outline-none transition-colors",
    "placeholder:text-muted-foreground",
    "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
    "disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-input/50",
    "dark:bg-input/30",
    SIZE_CLASS[inputSize],
    error && "border-destructive ring-3 ring-destructive/20",
    additionalClasses
  );
