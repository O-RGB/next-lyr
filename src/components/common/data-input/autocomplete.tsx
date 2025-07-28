import React, {
  useState,
  useRef,
  useEffect,
  forwardRef,
  useCallback,
} from "react";
import {
  BaseInputProps,
  BaseInputWrapper,
  getInputBaseClass,
  useInputFocus,
} from "./base";

export interface AutocompleteOption {
  value: string;
  label: string;
}

interface AutocompleteProps
  extends Omit<BaseInputProps, "onChange">,
    Omit<
      React.DetailedHTMLProps<
        React.InputHTMLAttributes<HTMLInputElement>,
        HTMLInputElement
      >,
      "size" | "onChange" | "onSelect"
    > {
  options: AutocompleteOption[];
  onSelect?: (option: AutocompleteOption) => void;
  onChange?: (value: string) => void;
  value?: string;
}

const Autocomplete = forwardRef<HTMLInputElement, AutocompleteProps>(
  (
    {
      label,
      error,
      helperText,
      inputSize = "sm",
      labelPosition = "top",
      className = "",
      placeholder,
      onFocus,
      onBlur,
      id,
      options,
      onSelect,
      onChange,
      value: controlledValue,
      ...props
    },
    ref
  ) => {
    const { isFocused, handleFocus, handleBlur } = useInputFocus();
    const [inputValue, setInputValue] = useState(controlledValue || "");
    const [filteredOptions, setFilteredOptions] = useState<
      AutocompleteOption[]
    >([]);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [activeIndex, setActiveIndex] = useState(-1);
    const wrapperRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
      setInputValue(controlledValue || "");
    }, [controlledValue]);

    useEffect(() => {
      if (inputValue) {
        const newFilteredOptions = options.filter((option) =>
          option.label.toLowerCase().includes(inputValue.toLowerCase())
        );
        setFilteredOptions(newFilteredOptions);
        setIsDropdownOpen(newFilteredOptions.length > 0 && isFocused);
      } else {
        setFilteredOptions([]);
        setIsDropdownOpen(false);
      }
    }, [inputValue, options, isFocused]);

    const handleOptionClick = (option: AutocompleteOption) => {
      setInputValue(option.label);
      setIsDropdownOpen(false);
      onSelect?.(option);
      onChange?.(option.value);
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const { value } = e.target;
      setInputValue(value);
      onChange?.(value);
      setActiveIndex(-1); // Reset active index on text change
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (!isDropdownOpen) return;

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setActiveIndex((prevIndex) =>
            prevIndex < filteredOptions.length - 1 ? prevIndex + 1 : prevIndex
          );
          break;
        case "ArrowUp":
          e.preventDefault();
          setActiveIndex((prevIndex) => (prevIndex > 0 ? prevIndex - 1 : 0));
          break;
        case "Enter":
          if (activeIndex >= 0 && filteredOptions[activeIndex]) {
            e.preventDefault();
            handleOptionClick(filteredOptions[activeIndex]);
          }
          break;
        case "Escape":
          setIsDropdownOpen(false);
          break;
      }
    };

    const onInputFocus = useCallback(
      (e: React.FocusEvent<HTMLInputElement>) => {
        handleFocus(onFocus)(e);
        if (inputValue && filteredOptions.length > 0) {
          setIsDropdownOpen(true);
        }
      },
      [handleFocus, onFocus, inputValue, filteredOptions.length]
    );

    const onInputBlur = useCallback(
      (e: React.FocusEvent<HTMLInputElement>) => {
        handleBlur(onBlur)(e);
        setTimeout(() => {
          if (!wrapperRef.current?.contains(document.activeElement)) {
            setIsDropdownOpen(false);
          }
        }, 150);
      },
      [handleBlur, onBlur]
    );

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
        <div className="relative" ref={wrapperRef}>
          <input
            {...props}
            ref={ref}
            id={id}
            type="text"
            placeholder={placeholder}
            className={inputClassName}
            value={inputValue}
            onChange={handleChange}
            onFocus={onInputFocus}
            onBlur={onInputBlur}
            onKeyDown={handleKeyDown}
            autoComplete="off"
          />

          {isDropdownOpen && (
            <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
              <ul>
                {filteredOptions.map((option, index) => (
                  <li
                    key={option.value}
                    className={`px-4 py-2 cursor-pointer hover:bg-blue-50 ${
                      index === activeIndex ? "bg-blue-100" : ""
                    }`}
                    onMouseDown={(e) => {
                      // use onMouseDown to prevent blur event from firing before click
                      e.preventDefault();
                      handleOptionClick(option);
                    }}
                  >
                    {option.label}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </BaseInputWrapper>
    );
  }
);

Autocomplete.displayName = "Autocomplete";

export default Autocomplete;
