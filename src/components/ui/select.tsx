import * as React from "react";

import { cn } from "@/lib/utils";

type SelectProps = Omit<
  React.SelectHTMLAttributes<HTMLSelectElement>,
  "onChange"
> & {
  onValueChange?: (value: string) => void;
};

/**
 * Native select primitive.
 *
 * The compound exports are kept as a compatibility layer for screens that use
 * the shadcn-style Select API. They resolve to native `<select>/<option>`
 * elements, so forms keep normal keyboard, focus and browser accessibility.
 */
const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, onValueChange, ...props }, ref) => (
    <select
      {...props}
      ref={ref}
      data-slot="select"
      className={cn(
        "h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30",
        className
      )}
      onChange={(event) => onValueChange?.(event.target.value)}
    />
  )
);

Select.displayName = "Select";

const SelectGroup: React.FC<
  React.OptgroupHTMLAttributes<HTMLOptGroupElement>
> = ({ className, ...props }) => <optgroup {...props} className={className} />;

const SelectValue: React.FC<{ placeholder?: string }> = () => null;

const SelectTrigger: React.FC<React.HTMLAttributes<HTMLDivElement>> = () => null;

const SelectContent: React.FC<{ children?: React.ReactNode }> = ({ children }) => (
  <>{children}</>
);

const SelectLabel: React.FC<React.OptionHTMLAttributes<HTMLOptionElement>> = ({
  children,
  ...props
}) => (
  <option {...props} disabled>
    {children}
  </option>
);

type SelectItemProps = React.OptionHTMLAttributes<HTMLOptionElement> & {
  value: string;
};

const SelectItem: React.FC<SelectItemProps> = ({ children, ...props }) => (
  <option {...props}>{children}</option>
);

const SelectSeparator: React.FC = () => null;
const SelectScrollUpButton: React.FC = () => null;
const SelectScrollDownButton: React.FC = () => null;

export {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectScrollDownButton,
  SelectScrollUpButton,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
};
