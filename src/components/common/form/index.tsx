import React, { isValidElement, cloneElement, ReactNode } from "react";
import {
  FormProvider,
  Controller,
  UseFormReturn,
  UseFormProps,
  useFormContext,
  useForm,
  FieldValues,
  ControllerRenderProps,
  Path,
  RegisterOptions,
} from "react-hook-form";
import { MdError, MdCheckCircle, MdHelpOutline } from "react-icons/md";

export interface Rule {
  required?: boolean;
  min?: number;
  max?: number;
  pattern?: RegExp;
  type?: "email" | "url";
  validator?: (value: any) => boolean | string;
  message?: string;
}

export interface FormProps<T extends FieldValues> {
  form: UseFormReturn<T>;
  onFinish: (values: T) => void;
  children: ReactNode;
  layout?: "vertical" | "horizontal";
  [key: string]: any;
}

export interface FormItemProps<T extends FieldValues> {
  name: Path<T>;
  label?: string;

  children: (field: ControllerRenderProps<T, Path<T>>) => ReactNode;
  className?: string;
  rules?: Rule[];
  tooltip?: string;
  required?: boolean;
  help?: string;
  validateStatus?: "success" | "error";
  hasFeedback?: boolean;
}

function convertRulesToRHF<T extends FieldValues>(
  rules: Rule[] = []
): RegisterOptions<T> {
  const rhfRules: RegisterOptions<T> = {};

  for (const rule of rules) {
    if (rule.required) {
      rhfRules.required = rule.message || "This field is required";
    }
    if (rule.min !== undefined) {
      rhfRules.minLength = {
        value: rule.min,
        message: rule.message || `Minimum length is ${rule.min}`,
      };
    }
    if (rule.max !== undefined) {
      rhfRules.maxLength = {
        value: rule.max,
        message: rule.message || `Maximum length is ${rule.max}`,
      };
    }
    if (rule.pattern) {
      rhfRules.pattern = {
        value: rule.pattern,
        message: rule.message || "Invalid format",
      };
    }
    if (rule.type === "email") {
      rhfRules.pattern = {
        value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
        message: rule.message || "Please enter a valid email address",
      };
    }
    if (rule.type === "url") {
      rhfRules.pattern = {
        value: /^https?:\/\/.+/i,
        message: rule.message || "Please enter a valid URL",
      };
    }
    if (rule.validator) {
      rhfRules.validate = (value: any) => {
        const result = rule.validator!(value);
        return result === true
          ? true
          : typeof result === "string"
          ? result
          : rule.message || "Validation failed";
      };
    }
  }

  return rhfRules;
}

function FormItem<T extends FieldValues>({
  name,
  label,
  children,
  className,
  rules = [],
  tooltip,
  required,
  help,
  validateStatus,
  hasFeedback = true,
}: FormItemProps<T>) {
  const {
    control,
    formState: { errors },
  } = useFormContext<T>();
  const error = errors[name];
  const hasError = !!error;
  const errorMessage = error?.message as string;

  const rhfRules = convertRulesToRHF<T>(rules);

  if (required && !rhfRules.required) {
    rhfRules.required = "This field is required";
  }

  return (
    <div className={`relative flex flex-col space-y-2 z-[50] ${className}`}>
      {label && (
        <label
          htmlFor={name as string}
          className={`select-none font-medium ${
            hasError ? "text-red-500" : "text-white/80"
          } ${
            required ? "after:content-['*'] after:text-red-500 after:ml-1" : ""
          }`}
        >
          {label}
          {tooltip && (
            <span className="ml-1 text-xs text-gray-400" title={tooltip}>
              <MdHelpOutline className="inline w-4 h-4" />
            </span>
          )}
        </label>
      )}

      <Controller
        name={name}
        control={control}
        rules={rhfRules}
        render={({ field }) => {
          const inputElement = children(field);

          const styledInputElement = isValidElement(inputElement)
            ? cloneElement(inputElement, {
                className: `${
                  (inputElement.props as { className?: string }).className || ""
                } ${
                  hasError
                    ? "border-red-500 focus:border-red-500 focus:ring-red-500"
                    : ""
                }`.trim(),
              } as any)
            : inputElement;

          return (
            <div className="relative">
              {styledInputElement}
              {hasFeedback && hasError && (
                <div className="absolute right-2 top-1/2 transform -translate-y-1/2 text-red-500">
                  <MdError className="w-4 h-4" />
                </div>
              )}
            </div>
          );
        }}
      />

      {/* ส่วนแสดง Error, Help, Success ยังคงเหมือนเดิม */}
      {hasError && errorMessage && (
        <div className="text-red-500 text-sm mt-1 flex items-center">
          <MdError className="w-4 h-4 mr-1" />
          {errorMessage}
        </div>
      )}

      {help && !hasError && (
        <div className="text-gray-400 text-sm mt-1">{help}</div>
      )}

      {validateStatus === "success" && hasFeedback && !hasError && (
        <div className="text-green-500 text-sm mt-1 flex items-center">
          <MdCheckCircle className="w-4 h-4 mr-1" />
          Validation passed
        </div>
      )}
    </div>
  );
}

interface FormComponent extends React.FC<FormProps<any>> {
  Item: typeof FormItem;
  useForm: <T extends FieldValues>(props?: UseFormProps<T>) => UseFormReturn<T>;
}

const Form: FormComponent = <T extends FieldValues>({
  form,
  onFinish,
  children,
  layout = "vertical",
  ...rest
}: FormProps<T>) => {
  return (
    <FormProvider {...form}>
      <form
        onSubmit={form.handleSubmit(onFinish)}
        className={layout === "horizontal" ? "space-y-4" : "space-y-6"}
        {...rest}
      >
        {children}
      </form>
    </FormProvider>
  );
};

Form.Item = FormItem;
Form.useForm = useForm;

export default Form;
