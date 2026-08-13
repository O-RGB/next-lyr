import * as React from "react";

import { cn } from "@/lib/utils";

type SliderProps = Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "type" | "value" | "defaultValue" | "onChange"
> & {
  value?: number[];
  defaultValue?: number[];
  onValueChange?: (value: number[]) => void;
};

/** Native range input with the small array-shaped API used by settings. */
const Slider = React.forwardRef<HTMLInputElement, SliderProps>(
  (
    {
      className,
      defaultValue,
      value,
      min = 0,
      max = 100,
      step = 1,
      onValueChange,
      ...props
    },
    ref
  ) => {
    const [internalValue, setInternalValue] = React.useState(
      defaultValue?.[0] ?? min
    );
    const currentValue = value?.[0] ?? internalValue;

    const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
      const nextValue = Number(event.target.value);
      if (value === undefined) setInternalValue(nextValue);
      onValueChange?.([nextValue]);
    };

    return (
      <input
        {...props}
        ref={ref}
        type="range"
        data-slot="slider"
        min={min}
        max={max}
        step={step}
        value={currentValue}
        onChange={handleChange}
        className={cn(
          "h-1.5 w-full cursor-pointer appearance-none rounded-full bg-muted accent-primary disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
      />
    );
  }
);

Slider.displayName = "Slider";

export { Slider };
