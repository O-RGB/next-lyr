import React from "react";
import {
  UseFormReturn,
  SubmitHandler,
  FieldValues,
  Path,
} from "react-hook-form";

export type TFormValues = Record<string, any>;

export interface FormProps<T extends FieldValues>
  extends Omit<React.FormHTMLAttributes<HTMLFormElement>, "onSelect"> {
  form: UseFormReturn<T>;
  onFinish: SubmitHandler<T>;
  children: React.ReactNode;
  layout?: "horizontal" | "vertical";
}

export interface Rule {
  required?: boolean;
  message?: string;
  min?: number;
  max?: number;
  pattern?: RegExp;
  validator?: (value: any) => boolean | string;
  type?: "email" | "number" | "url";
}

export interface FormItemProps<T extends FieldValues> {
  name: Path<T>;
  label?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  rules?: Rule[];
  tooltip?: string;
  required?: boolean;
  help?: string;
  validateStatus?: "success" | "warning" | "error" | "validating";
  hasFeedback?: boolean;
}
