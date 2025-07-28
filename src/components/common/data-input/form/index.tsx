import React, {
  isValidElement,
  cloneElement,
  ReactNode,
  useEffect,
  useRef,
} from "react";
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
  onFormChange?: (values: T) => void;
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
    trigger,
    getValues,
  } = useFormContext<T>();

  const error = errors[name];
  const hasError = !!error;
  const errorMessage = error?.message as string;

  const rhfRules = convertRulesToRHF<T>(rules);

  if (required && !rhfRules.required) {
    rhfRules.required = "This field is required";
  }

  return (
    <div className={`relative flex flex-col z-[50] ${className}`}>
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
          const inputElement = children({
            ...field,
            onChange: (value: any) => {
              field.onChange(value);
              setTimeout(() => {
                const formContext = control._formState;
                if (formContext && (window as any).__formChangeCallback) {
                  (window as any).__formChangeCallback(getValues());
                }
              }, 0);
            },
          });

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
            <div className="relative line-clamp-1">{styledInputElement}</div>
          );
        }}
      />

      {hasError && errorMessage && (
        <div className="text-red-500 text-[10px] flex items-center line-clamp-1">
          <MdError className="w-3 h-3 mr-1" />
          {errorMessage}
        </div>
      )}

      {help && !hasError && (
        <div className="text-gray-400 text-[10px] line-clamp-1">{help}</div>
      )}

      {validateStatus === "success" && hasFeedback && !hasError && (
        <div className="text-green-500 text-[10px] flex items-center line-clamp-1">
          <MdCheckCircle className="w-3 h-3 mr-1" />
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
  onFormChange,
  ...rest
}: FormProps<T>) => {
  const onFormChangeRef = useRef(onFormChange);

  useEffect(() => {
    onFormChangeRef.current = onFormChange;
  }, [onFormChange]);

  useEffect(() => {
    if (onFormChangeRef.current) {
      (window as any).__formChangeCallback = onFormChangeRef.current;
    }

    return () => {
      delete (window as any).__formChangeCallback;
    };
  }, []);

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
