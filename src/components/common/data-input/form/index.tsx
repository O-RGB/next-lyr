import { CircleCheck, CircleHelp } from "lucide-react";
import React, {
  isValidElement,
  cloneElement,
  ReactNode,
  useEffect,
  useRef,
} from "react";
import {
  FormProvider,
  Control,
  UseFormReturn,
  UseFormProps,
  useFormContext,
  useForm,
  FieldValues,
  ControllerRenderProps,
  Path,
  RegisterOptions,
} from "react-hook-form";

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

interface RegisteredFormFieldProps<T extends FieldValues> {
  control: Control<T>;
  getValues: UseFormReturn<T>["getValues"];
  register: UseFormReturn<T>["register"];
  name: Path<T>;
  rules: RegisterOptions<T>;
  children: (field: ControllerRenderProps<T, Path<T>>) => ReactNode;
  help?: string;
  validateStatus?: "success" | "error";
  hasFeedback: boolean;
}

function FieldLabel<T extends FieldValues>({
  name,
  label,
  required,
  tooltip,
}: Pick<FormItemProps<T>, "name" | "label" | "required" | "tooltip">) {
  if (!label) return null;

  return (
    <label
      htmlFor={name as string}
      className={`select-none font-medium text-muted-foreground ${
        required ? "after:content-['*'] after:text-destructive after:ml-1" : ""
      }`}
    >
      <span className="text-xs">{label}</span>
      {tooltip && (
        <span className="ml-1 text-xs text-muted-foreground" title={tooltip}>
          <CircleHelp className="inline w-4 h-4" />
        </span>
      )}
    </label>
  );
}

function RegisteredFormField<T extends FieldValues>({
  control,
  getValues,
  register,
  name,
  rules,
  children,
  help,
  validateStatus,
  hasFeedback,
}: RegisteredFormFieldProps<T>) {
  const registered = register(name, rules);
  const currentValue = getValues(name);

  const isEvent = (value: unknown): value is React.SyntheticEvent =>
    !!value && typeof value === "object" && "target" in value;

  const handleChange = (value: unknown, event?: React.SyntheticEvent) => {
    if (event) {
      // InputNumber supplies the parsed number as the first argument and the
      // native event as the second. Preserve the parsed value for RHF.
      registered.onChange({
        target: { name, value },
        type: "change",
      });
    } else if (isEvent(value)) {
      registered.onChange(value);
    } else {
      registered.onChange({
        target: { name, value },
        type: "change",
      });
    }
    setTimeout(() => {
      const formContext = control._formState;
      if (formContext && (window as any).__formChangeCallback) {
        (window as any).__formChangeCallback(getValues());
      }
    }, 0);
  };

  const field = {
    name,
    // Leave the native field uncontrolled. Form.Item still exposes the same
    // Controller-shaped API, while register() keeps typing/focus out of React.
    value: undefined,
    onChange: handleChange,
    onBlur: (event?: React.FocusEvent) =>
      registered.onBlur(
        event ?? {
          target: { name, value: getValues(name) },
          type: "blur",
        }
      ),
    ref: registered.ref,
    defaultValue: currentValue,
  } as unknown as ControllerRenderProps<T, Path<T>> & {
    defaultValue?: unknown;
  };
  const inputElement = children(field);

  const styledInputElement = isValidElement(inputElement)
    ? cloneElement(inputElement, {
        className: `${
          (inputElement.props as { className?: string }).className || ""
        } ${
          ""
        }`.trim(),
      } as any)
    : inputElement;

  return (
    <>
      <div className="relative">{styledInputElement}</div>
      {help && (
        <div className="text-muted-foreground text-[10px] line-clamp-1">
          {help}
        </div>
      )}
      {validateStatus === "success" && hasFeedback && (
        <div className="text-brand-2 text-[10px] flex items-center line-clamp-1">
          <CircleCheck className="w-3 h-3 mr-1" />
          Validation passed
        </div>
      )}
    </>
  );
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
  const { control, getValues, register } = useFormContext<T>();

  const rhfRules = convertRulesToRHF<T>(rules);

  if (required && !rhfRules.required) {
    rhfRules.required = "This field is required";
  }

  return (
    <div className={`relative flex flex-col ${className}`}>
      <FieldLabel
        name={name}
        label={label}
        required={required}
        tooltip={tooltip}
      />
      <RegisteredFormField
        control={control}
        getValues={getValues}
        register={register}
        name={name}
        rules={rhfRules}
        help={help}
        validateStatus={validateStatus}
        hasFeedback={hasFeedback}
      >
        {children}
      </RegisteredFormField>
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
