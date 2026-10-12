"use client";

import { forwardRef, useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type InputHTMLAttributes } from "react";
import { BaseInputWrapper, getInputBaseClass, type BaseInputProps } from "./base";
import styles from "./visible-space-input.module.css";

interface VisibleSpaceInputProps extends BaseInputProps, Omit<InputHTMLAttributes<HTMLInputElement>, "size" | "value"> {
  value: string;
}
interface InputViewport { scrollLeft: number; start: number; end: number; focused: boolean }
const SPACE_SPACING = "0.65em";

/** Native input handles editing; a presentation layer reveals each real space. */
const VisibleSpaceInput = forwardRef<HTMLInputElement, VisibleSpaceInputProps>(({
  label, error, helperText, inputSize = "md", labelPosition = "top", className = "", value,
  id, style, onChange, onSelect, onScroll, onFocus, onBlur, ...props
}, ref) => {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const inputRef = useRef<HTMLInputElement | null>(null);
  const mirrorRef = useRef<HTMLDivElement | null>(null);
  const syncTypography = useCallback(() => {
    const input = inputRef.current, mirror = mirrorRef.current;
    if (!input || !mirror) return;
    // Mobile input rules and custom fonts can override the shared field class.
    const computed = getComputedStyle(input);
    for (const key of ["fontFamily", "fontSize", "fontWeight", "fontStyle", "fontStretch", "fontVariant",
      "fontKerning", "fontFeatureSettings", "fontVariationSettings", "lineHeight", "letterSpacing", "wordSpacing",
      "textIndent", "textAlign", "textTransform", "direction", "paddingLeft", "paddingRight", "paddingTop", "paddingBottom",
      "borderLeftWidth", "borderRightWidth", "borderTopWidth", "borderBottomWidth"] as const) {
      mirror.style[key] = computed[key];
    }
  }, []);
  useLayoutEffect(() => {
    syncTypography();
    const input = inputRef.current;
    if (!input) return;
    const observer = new ResizeObserver(syncTypography);
    observer.observe(input);
    const view = input.ownerDocument.defaultView;
    view?.addEventListener("resize", syncTypography);
    return () => { observer.disconnect(); view?.removeEventListener("resize", syncTypography); };
  }, [inputSize, className, style, syncTypography]);
  const [viewport, setViewport] = useState<InputViewport>({ scrollLeft: 0, start: 0, end: 0, focused: false });
  const syncViewport = useCallback((input: HTMLInputElement) => {
    const next = { scrollLeft: input.scrollLeft, start: input.selectionStart ?? 0, end: input.selectionEnd ?? 0,
      focused: input.ownerDocument.activeElement === input };
    setViewport(previous => previous.scrollLeft === next.scrollLeft && previous.start === next.start &&
      previous.end === next.end && previous.focused === next.focused ? previous : next);
  }, []);
  const syncSelection = useCallback(() => { if (inputRef.current) syncViewport(inputRef.current); }, [syncViewport]);
  useLayoutEffect(() => { syncSelection(); }, [value, inputSize, syncSelection]);
  useEffect(() => {
    const owner = inputRef.current?.ownerDocument;
    return () => owner?.removeEventListener("selectionchange", syncSelection);
  }, [syncSelection]);
  const setInputRef = useCallback((input: HTMLInputElement | null) => {
    inputRef.current = input;
    if (typeof ref === "function") ref(input);
    else if (ref) ref.current = input;
  }, [ref]);
  const segments = useMemo(() => Array.from(value.matchAll(/ |[^ ]+/gu), match => ({ text: match[0], offset: match.index ?? 0 })), [value]);
  const fieldClass = getInputBaseClass(error, inputSize, className);

  return <BaseInputWrapper label={label} error={error} helperText={helperText} inputSize={inputSize}
    labelPosition={labelPosition} htmlFor={inputId}>
    <div className="relative">
      <input {...props} data-visible-space-input id={inputId} ref={setInputRef} value={value} className={fieldClass}
        style={{ ...style, wordSpacing: SPACE_SPACING }}
        onChange={event => { syncViewport(event.currentTarget); onChange?.(event); }}
        onSelect={event => { syncViewport(event.currentTarget); onSelect?.(event); }}
        onScroll={event => { syncViewport(event.currentTarget); onScroll?.(event); }}
        onFocus={event => {
          event.currentTarget.ownerDocument.addEventListener("selectionchange", syncSelection);
          syncViewport(event.currentTarget); onFocus?.(event);
        }}
        onBlur={event => {
          event.currentTarget.ownerDocument.removeEventListener("selectionchange", syncSelection);
          syncViewport(event.currentTarget); onBlur?.(event);
        }} />
      <div ref={mirrorRef} aria-hidden="true" data-space-mirror
        className={`${getInputBaseClass(undefined, inputSize, className)} ${styles.mirror}`}
        style={{ ...style, wordSpacing: SPACE_SPACING, background: "transparent", borderColor: "transparent", opacity: props.disabled ? .5 : undefined }}>
        <span className={styles.content} style={{ transform: `translateX(${-viewport.scrollLeft}px)` }}>
          {segments.map(segment => segment.text === " " ? <span key={segment.offset}
            className={styles.space} data-space-offset={segment.offset}
            data-selected={viewport.focused && segment.offset >= viewport.start && segment.offset < viewport.end || undefined}>{" "}</span>
            : segment.text)}
        </span>
      </div>
    </div>
  </BaseInputWrapper>;
});
VisibleSpaceInput.displayName = "VisibleSpaceInput";
export default VisibleSpaceInput;
