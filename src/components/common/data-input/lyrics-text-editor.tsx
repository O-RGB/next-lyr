"use client";

import {
  CornerDownLeft,
  Delete,
  GripHorizontal,
  GripVertical,
  Keyboard as KeyboardIcon,
  Redo2,
  Undo2,
} from "lucide-react";
import {
  type KeyboardEvent,
  type FormEvent,
  type PointerEvent,
  useLayoutEffect,
  useRef,
  useState,
} from "react";

import ButtonCommon from "@/components/common/button";
import { cn } from "@/lib/utils";

interface LyricsTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: React.ReactNode;
  deleteLabel?: React.ReactNode;
  className?: string;
  resetKey?: string | number | boolean;
  fitToContainer?: boolean;
}

const isTextNode = (node: Node) => node.nodeType === Node.TEXT_NODE;

const clipboardBlockTags = new Set([
  "ADDRESS",
  "ARTICLE",
  "ASIDE",
  "BLOCKQUOTE",
  "DIV",
  "DL",
  "DT",
  "DD",
  "FIGCAPTION",
  "FIGURE",
  "FOOTER",
  "H1",
  "H2",
  "H3",
  "H4",
  "H5",
  "H6",
  "HEADER",
  "HR",
  "LI",
  "MAIN",
  "NAV",
  "OL",
  "P",
  "PRE",
  "SECTION",
  "TABLE",
  "TR",
  "UL",
]);

function normalizeLineBreaks(text: string) {
  return text.replace(/\r\n?/g, "\n").replace(/[\u2028\u2029]/g, "\n");
}

function readClipboardHtml(node: Node): string {
  if (isTextNode(node)) return node.textContent ?? "";
  if (node.nodeType !== Node.ELEMENT_NODE) return "";

  const element = node as HTMLElement;
  if (element.tagName === "BR") return "\n";
  if (element.tagName === "SCRIPT" || element.tagName === "STYLE") return "";

  const content = Array.from(element.childNodes)
    .map(readClipboardHtml)
    .join("");
  return clipboardBlockTags.has(element.tagName) ? `${content}\n` : content;
}

function readClipboardText(data: DataTransfer) {
  const plainText = normalizeLineBreaks(data.getData("text/plain"));
  if (plainText.includes("\n")) return plainText;

  const html = data.getData("text/html");
  if (!html) return plainText;

  const documentFragment = new DOMParser().parseFromString(html, "text/html");
  const richText = normalizeLineBreaks(
    readClipboardHtml(documentFragment.body)
  ).replace(/\n$/, "");

  return richText.includes("\n") ? richText : plainText;
}

function getNodeLength(node: Node): number {
  if (isTextNode(node)) return node.textContent?.length ?? 0;
  if (node.nodeType !== Node.ELEMENT_NODE) return 0;

  const element = node as HTMLElement;
  if (element.dataset.editorPlaceholder === "true") return 0;
  if (element.dataset.editorCaret === "true") return 0;
  if (element.dataset.editorPipe === "true") return 1;
  if (element.dataset.editorNewline === "true") {
    return 1;
  }

  return Array.from(node.childNodes).reduce(
    (length, child) => length + getNodeLength(child),
    0
  );
}

function readEditorValue(root: HTMLElement): string {
  const readNode = (node: Node): string => {
    if (isTextNode(node)) return node.textContent ?? "";
    if (node.nodeType !== Node.ELEMENT_NODE) return "";

    const element = node as HTMLElement;
    if (element.dataset.editorPlaceholder === "true") return "";
    if (element.dataset.editorCaret === "true") {
      return (element.textContent ?? "").replaceAll("\u200B", "");
    }
    if (element.dataset.editorPipe === "true") return "|";
    if (element.dataset.editorNewline === "true") {
      return "\n";
    }

    return Array.from(node.childNodes).map(readNode).join("");
  };

  return Array.from(root.childNodes).map(readNode).join("");
}

function getOffsetInTree(
  node: Node,
  target: Node,
  targetOffset: number
): number | null {
  if (node === target) {
    if (isTextNode(node)) {
      const parent = node.parentElement;
      if (parent?.dataset.editorCaret === "true") {
        return (node.textContent ?? "")
          .slice(0, targetOffset)
          .replaceAll("\u200B", "").length;
      }
      if (parent?.dataset.editorPipe === "true") {
        return targetOffset > 0 ? 1 : 0;
      }
      return Math.min(targetOffset, node.textContent?.length ?? 0);
    }

    return Array.from(node.childNodes)
      .slice(0, targetOffset)
      .reduce((length, child) => length + getNodeLength(child), 0);
  }

  let offset = 0;
  for (const child of Array.from(node.childNodes)) {
    const nestedOffset = getOffsetInTree(child, target, targetOffset);
    if (nestedOffset !== null) return offset + nestedOffset;
    offset += getNodeLength(child);
  }

  return null;
}

function getSelectionRange(root: HTMLElement): {
  start: number;
  end: number;
} | null {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return null;

  const range = selection.getRangeAt(0);
  if (!root.contains(range.startContainer) || !root.contains(range.endContainer)) {
    return null;
  }

  const start = getOffsetInTree(
    root,
    range.startContainer,
    range.startOffset
  );
  const end = getOffsetInTree(root, range.endContainer, range.endOffset);
  if (start === null || end === null) return null;

  return { start: Math.min(start, end), end: Math.max(start, end) };
}

function getRawSelectionEndpoints(root: HTMLElement): {
  anchor: number;
  focus: number;
} | null {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return null;
  if (
    !root.contains(selection.anchorNode) ||
    !root.contains(selection.focusNode)
  ) {
    return null;
  }

  const anchor = getOffsetInTree(
    root,
    selection.anchorNode as Node,
    selection.anchorOffset
  );
  const focus = getOffsetInTree(
    root,
    selection.focusNode as Node,
    selection.focusOffset
  );
  if (anchor === null || focus === null) return null;

  return { anchor, focus };
}

function createRawCaretRange(root: HTMLElement, rawOffset: number) {
  const offset = Math.max(0, Math.min(rawOffset, readEditorValue(root).length));
  const range = document.createRange();

  let consumed = 0;
  const children = Array.from(root.childNodes);

  const placeInCaretSentinel = (sentinel: HTMLElement) => {
    const textNode = sentinel.firstChild;
    if (!textNode || !isTextNode(textNode)) return false;

    range.setStart(textNode, textNode.textContent?.length ?? 0);
    range.collapse(true);
    return true;
  };

  for (let index = 0; index < children.length; index += 1) {
    const child = children[index];
    const length = getNodeLength(child);

    if (child.nodeType === Node.TEXT_NODE) {
      if (offset <= consumed + length) {
        range.setStart(
          child,
          Math.max(0, Math.min(offset - consumed, length))
        );
        range.collapse(true);
        return range;
      }
    } else if (child.nodeType === Node.ELEMENT_NODE) {
      const element = child as HTMLElement;
      const textNode = element.firstChild;
      const isPipeOrNewline =
        element.dataset.editorPipe === "true" ||
        element.dataset.editorNewline === "true";

      if (!isPipeOrNewline && textNode && isTextNode(textNode)) {
        if (offset <= consumed + length) {
          range.setStart(
            textNode,
            Math.max(0, Math.min(offset - consumed, length))
          );
          range.collapse(true);
          return range;
        }
      } else if (offset <= consumed + length) {
        const nextChild = children[index + 1];
        if (
          offset > consumed &&
          nextChild?.nodeType === Node.ELEMENT_NODE &&
          (nextChild as HTMLElement).dataset.editorCaret === "true" &&
          placeInCaretSentinel(nextChild as HTMLElement)
        ) {
          return range;
        }

        range.setStart(root, index + (offset > consumed ? 1 : 0));
        range.collapse(true);
        return range;
      }
    }

    consumed += length;
  }

  range.setStart(root, root.childNodes.length);
  range.collapse(true);
  return range;
}

function setRawCaret(root: HTMLElement, rawOffset: number) {
  const selection = window.getSelection();
  if (!selection) return;

  const range = createRawCaretRange(root, rawOffset);
  selection.removeAllRanges();
  selection.addRange(range);
}

function setRawSelection(root: HTMLElement, rawStart: number, rawEnd: number) {
  const selection = window.getSelection();
  if (!selection) return;

  const length = readEditorValue(root).length;
  const start = Math.max(0, Math.min(rawStart, length));
  const end = Math.max(0, Math.min(rawEnd, length));
  const rangeStart = createRawCaretRange(root, Math.min(start, end));
  const rangeEnd = createRawCaretRange(root, Math.max(start, end));
  const range = document.createRange();

  range.setStart(rangeStart.startContainer, rangeStart.startOffset);
  range.setEnd(rangeEnd.startContainer, rangeEnd.startOffset);
  selection.removeAllRanges();
  selection.addRange(range);
}

function getPipeArrowOffset(
  value: string,
  offset: number,
  direction: "left" | "right"
) {
  if (direction === "left") {
    return value[offset - 1] === "|" ? offset - 1 : null;
  }

  return value[offset] === "|" ? offset + 1 : null;
}

function getRawCaretClientRect(root: HTMLElement, rawOffset: number) {
  const range = createRawCaretRange(root, rawOffset);
  const rect = range.getBoundingClientRect();
  if (rect.width > 0 || rect.height > 0) return rect;

  return root.getBoundingClientRect();
}

function getRawOffsetAtPoint(
  root: HTMLElement,
  clientX: number,
  clientY: number
) {
  const rootRect = root.getBoundingClientRect();
  const safeClientX =
    rootRect.width > 2
      ? Math.max(rootRect.left + 1, Math.min(clientX, rootRect.right - 1))
      : clientX;
  const safeClientY =
    rootRect.height > 2
      ? Math.max(rootRect.top + 1, Math.min(clientY, rootRect.bottom - 1))
      : clientY;
  const documentWithCaret = document as Document & {
    caretRangeFromPoint?: (x: number, y: number) => Range | null;
    caretPositionFromPoint?: (
      x: number,
      y: number
    ) => { offsetNode: Node; offset: number } | null;
  };

  const browserRange = documentWithCaret.caretRangeFromPoint?.(
    safeClientX,
    safeClientY
  );
  if (browserRange && root.contains(browserRange.startContainer)) {
    const offset = getOffsetInTree(
      root,
      browserRange.startContainer,
      browserRange.startOffset
    );
    if (offset !== null) return offset;
  }

  const browserPosition = documentWithCaret.caretPositionFromPoint?.(
    safeClientX,
    safeClientY
  );
  if (browserPosition && root.contains(browserPosition.offsetNode)) {
    const offset = getOffsetInTree(
      root,
      browserPosition.offsetNode,
      browserPosition.offset
    );
    if (offset !== null) return offset;
  }

  const value = readEditorValue(root);
  const lineHeight =
    Number.parseFloat(window.getComputedStyle(root).lineHeight) || 24;
  let closestOffset = 0;
  let closestDistance = Number.POSITIVE_INFINITY;

  for (let offset = 0; offset <= value.length; offset += 1) {
    const rect = getRawCaretClientRect(root, offset);
    const pointY = rect.top + (rect.height || lineHeight) / 2;
    const verticalDistance = Math.abs(clientY - pointY);
    const horizontalDistance = Math.abs(clientX - rect.left);
    const distance = verticalDistance * 100 + horizontalDistance;

    if (distance < closestDistance) {
      closestDistance = distance;
      closestOffset = offset;
    }
  }

  if (clientY < rootRect.top) return 0;
  if (clientY > rootRect.bottom) return value.length;
  return closestOffset;
}

function appendCaretSentinel(root: HTMLElement) {
  const sentinel = document.createElement("span");
  sentinel.contentEditable = "true";
  sentinel.dataset.editorCaret = "true";
  sentinel.setAttribute("aria-hidden", "true");
  sentinel.className = "inline-block min-w-px";
  sentinel.textContent = "\u200B";
  root.append(sentinel);
}

function renderEditorDom(root: HTMLElement, value: string) {
  root.replaceChildren();
  for (let index = 0; index < value.length; index += 1) {
    const character = value[index];

    if (character === "|") {
      const separator = document.createElement("span");
      separator.contentEditable = "false";
      separator.dataset.editorPipe = "true";
      separator.className = "font-semibold text-brand-2";
      separator.textContent = "|";
      root.append(separator);
      continue;
    }

    if (character === "\n") {
      const newline = document.createElement("br");
      newline.dataset.editorNewline = "true";
      root.append(newline);
      appendCaretSentinel(root);
      continue;
    }

    let end = index + 1;
    while (end < value.length && value[end] !== "|" && value[end] !== "\n") {
      end += 1;
    }

    root.append(document.createTextNode(value.slice(index, end)));
    index = end - 1;
  }
}

interface TouchCursorDrag {
  pointerId: number;
  lastX: number;
  lastY: number;
  positionX: number;
  positionY: number;
  anchorOffset: number;
  currentOffset: number;
  selecting: boolean;
  moved: boolean;
}

interface RulerDrag {
  pointerId: number;
  startX: number;
  startPosition: number;
}

interface WrappedLine {
  value: string;
  breaks: number[];
}

interface TextUnit {
  breakAfter: boolean;
  breakBefore: boolean;
  end: number;
  index: number;
  segment: string;
}

function getGraphemeUnits(text: string, offset = 0): TextUnit[] {
  if (typeof Intl !== "undefined" && "Segmenter" in Intl) {
    const segmenter = new Intl.Segmenter(undefined, {
      granularity: "grapheme",
    });

    return Array.from(segmenter.segment(text), ({ segment, index }) => ({
      breakAfter: /\s/.test(segment),
      breakBefore: false,
      end: offset + index + segment.length,
      index: offset + index,
      segment,
    }));
  }

  return Array.from(text).reduce<TextUnit[]>((units, segment) => {
    const index = offset + (units.at(-1)?.end ?? offset) - offset;
    units.push({
      breakAfter: /\s/.test(segment),
      breakBefore: false,
      end: index + segment.length,
      index,
      segment,
    });
    return units;
  }, []);
}

function getTextUnits(
  text: string,
  maxWidth: number,
  measure: (value: string) => number
): TextUnit[] {
  if (typeof Intl === "undefined" || !("Segmenter" in Intl)) {
    return getGraphemeUnits(text);
  }

  const segmenter = new Intl.Segmenter(undefined, { granularity: "word" });
  const units: TextUnit[] = [];

  for (const word of segmenter.segment(text)) {
    const segment = word.segment;
    const isWhitespace = /^\s+$/.test(segment);
    const isLongWord = word.isWordLike && measure(segment) > maxWidth;

    if (isLongWord) {
      units.push(...getGraphemeUnits(segment, word.index));
      continue;
    }

    units.push({
      breakAfter: Boolean(word.isWordLike) || isWhitespace,
      breakBefore: false,
      end: word.index + segment.length,
      index: word.index,
      segment,
    });
  }

  return units;
}

function wrapLineToWidth(
  line: string,
  maxWidth: number,
  measure: (text: string) => number
): WrappedLine {
  if (!line || maxWidth <= 0 || measure(line) <= maxWidth) {
    return { value: line, breaks: [] };
  }

  const units = getTextUnits(line, maxWidth, measure);
  const breaks: number[] = [];
  let start = 0;

  while (start < line.length) {
    let didWrap = false;
    let lastSoftBreak = -1;

    for (const unit of units) {
      if (unit.index < start) continue;

      if (unit.breakBefore) {
        lastSoftBreak = unit.index;
      }

      const candidate = line.slice(start, unit.end);
      if (measure(candidate) > maxWidth && unit.index > start) {
        const breakAt = lastSoftBreak > start ? lastSoftBreak : unit.index;
        breaks.push(breakAt);
        start = breakAt;
        didWrap = true;
        break;
      }

      if (unit.breakAfter) {
        lastSoftBreak = unit.end;
      }
    }

    if (!didWrap) break;
  }

  if (breaks.length === 0) return { value: line, breaks };

  let value = "";
  let sourceStart = 0;
  for (const breakAt of breaks) {
    value += `${line.slice(sourceStart, breakAt)}\n`;
    sourceStart = breakAt;
  }
  value += line.slice(sourceStart);

  return { value, breaks };
}

function wrapValueToWidth(
  value: string,
  maxWidth: number,
  cursor: number,
  measure: (text: string) => number
) {
  if (!value || maxWidth <= 0) {
    return { autoBreaks: [], value, cursor };
  }

  const sourceLines = value.split("\n");
  const insertedBreaks: number[] = [];
  let sourceOffset = 0;
  let wrappedValue = "";

  sourceLines.forEach((line, lineIndex) => {
    const wrappedLine = wrapLineToWidth(line, maxWidth, measure);
    wrappedValue += wrappedLine.value;
    insertedBreaks.push(
      ...wrappedLine.breaks.map((breakAt) => sourceOffset + breakAt)
    );

    if (lineIndex < sourceLines.length - 1) {
      wrappedValue += "\n";
    }
    sourceOffset += line.length + 1;
  });

  return {
    autoBreaks: insertedBreaks.map((breakAt, index) => breakAt + index),
    value: wrappedValue,
    cursor: cursor + insertedBreaks.filter((breakAt) => breakAt <= cursor).length,
  };
}

interface EditorHistoryEntry {
  value: string;
  cursor: number;
  autoWrapBreaks: number[];
}

interface EditorHistory {
  past: EditorHistoryEntry[];
  future: EditorHistoryEntry[];
}

interface AutoWrapState {
  value: string;
  breaks: number[];
}

export default function LyricsTextEditor({
  value,
  onChange,
  placeholder,
  label,
  deleteLabel = "Delete",
  className,
  resetKey,
  fitToContainer = false,
}: LyricsTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const editorViewportRef = useRef<HTMLDivElement>(null);
  const lineNumberRef = useRef<HTMLDivElement>(null);
  const lineNumberContentRef = useRef<HTMLDivElement>(null);
  const rulerRef = useRef<HTMLDivElement>(null);
  const rulerMarkerRef = useRef<HTMLDivElement>(null);
  const rulerGuideRef = useRef<HTMLDivElement>(null);
  const rulerDragRef = useRef<RulerDrag | null>(null);
  const rulerFrameRef = useRef<number | null>(null);
  const pendingRulerPositionRef = useRef<number | null>(null);
  const rulerPositionRef = useRef(0);
  const rulerMeasureCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const autoWrapStateRef = useRef<AutoWrapState>({ value: "", breaks: [] });
  const cursorOffsetRef = useRef(0);
  const pendingCursorRef = useRef<number | null>(null);
  const valueRef = useRef(value);
  const historyRef = useRef<EditorHistory>({ past: [], future: [] });
  const resetKeyRef = useRef(resetKey);
  const domSyncRequiredRef = useRef(true);
  const skipNativeLineBreakRef = useRef(false);
  const skipNativeSpaceRef = useRef(false);
  const skipKeydownSpaceRef = useRef(false);
  const touchCursorDragRef = useRef<TouchCursorDrag | null>(null);
  const floatingCursorPositionRef = useRef<{ left: number; top: number } | null>(
    null
  );
  const floatingCursorElementRef = useRef<HTMLSpanElement>(null);
  const floatingCursorFrameRef = useRef<number | null>(null);
  const touchCursorAutoScrollFrameRef = useRef<number | null>(null);
  const pendingFloatingCursorPositionRef = useRef<{
    left: number;
    top: number;
  } | null>(null);
  const lastTouchBarTapRef = useRef<number | null>(null);
  const deleteRepeatTimeoutRef = useRef<number | null>(null);
  const deleteRepeatIntervalRef = useRef<number | null>(null);
  const [touchBarLocked, setTouchBarLocked] = useState(false);
  const [touchCursorDragging, setTouchCursorDragging] = useState(false);
  const [floatingCursorPosition, setFloatingCursorPosition] = useState<{
    left: number;
    top: number;
  } | null>(null);
  const [keyboardEnabled, setKeyboardEnabled] = useState(false);

  const [history, setHistory] = useState<EditorHistory>(() => ({
    past: [],
    future: [],
  }));

  const updateHistory = (next: EditorHistory) => {
    historyRef.current = next;
    setHistory(next);
  };

  const updateKeyboardMode = (enabled: boolean) => {
    setKeyboardEnabled(enabled);
    if (editorRef.current) {
      editorRef.current.inputMode = enabled ? "text" : "none";
    }
  };

  const commitValue = (
    nextValue: string,
    nextCursor: number,
    previousCursor = cursorOffsetRef.current,
    autoWrapBreaks?: number[]
  ) => {
    if (nextValue === valueRef.current) return;

    updateHistory({
      past: [
        ...historyRef.current.past,
        {
          value: valueRef.current,
          cursor: previousCursor,
          autoWrapBreaks: [...autoWrapStateRef.current.breaks],
        },
      ],
      future: [],
    });
    autoWrapStateRef.current = {
      value: nextValue,
      breaks: autoWrapBreaks ?? rebaseAutoWrapBreaks(nextValue),
    };
    valueRef.current = nextValue;
    domSyncRequiredRef.current = true;
    cursorOffsetRef.current = nextCursor;
    pendingCursorRef.current = nextCursor;
    onChange(nextValue);
  };

  useLayoutEffect(() => {
    if (resetKeyRef.current === resetKey) return;

    resetKeyRef.current = resetKey;
    updateHistory({ past: [], future: [] });
    autoWrapStateRef.current = { value, breaks: [] };
    valueRef.current = value;
    cursorOffsetRef.current = value.length;
    pendingCursorRef.current = null;
    domSyncRequiredRef.current = true;
  }, [resetKey, value]);

  useLayoutEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;

    let externalValueChanged = false;
    if (value !== valueRef.current) {
      updateHistory({
        past: [
          ...historyRef.current.past,
          {
            value: valueRef.current,
            cursor: cursorOffsetRef.current,
            autoWrapBreaks: [...autoWrapStateRef.current.breaks],
          },
        ],
        future: [],
      });
      autoWrapStateRef.current = { value, breaks: [] };
      valueRef.current = value;
      cursorOffsetRef.current = value.length;
      externalValueChanged = true;
      domSyncRequiredRef.current = true;
    }

    if (domSyncRequiredRef.current || readEditorValue(editor) !== value) {
      renderEditorDom(editor, value);
      domSyncRequiredRef.current = false;
    }

    const pendingCursor = pendingCursorRef.current;
    if (pendingCursor !== null) {
      setRawCaret(editor, pendingCursor);
      cursorOffsetRef.current = pendingCursor;
      pendingCursorRef.current = null;
    } else if (externalValueChanged && document.activeElement === editor) {
      setRawCaret(editor, value.length);
    }
  }, [resetKey, value]);

  const getCursor = () => {
    const editor = editorRef.current;
    if (!editor) return { start: cursorOffsetRef.current, end: cursorOffsetRef.current };

    return (
      getSelectionRange(editor) ?? {
        start: cursorOffsetRef.current,
        end: cursorOffsetRef.current,
      }
    );
  };

  const updateValueAtSelection = (insert: string) => {
    const { start, end } = getCursor();
    const nextValue = `${value.slice(0, start)}${insert}${value.slice(end)}`;
    const nextOffset = start + insert.length;
    const prepared = prepareValueForRuler(nextValue, nextOffset);
    commitValue(prepared.value, prepared.cursor, start, prepared.autoWrapBreaks);
  };

  const deleteBackward = () => {
    const { start, end } = getCursor();
    let deleteStart = start;
    if (start === end) {
      deleteStart = Math.max(0, start - 1);
    }
    if (deleteStart === end) return;

    const prepared = prepareValueForRuler(
      `${value.slice(0, deleteStart)}${value.slice(end)}`,
      deleteStart
    );
    commitValue(prepared.value, prepared.cursor, start, prepared.autoWrapBreaks);
  };

  const handleInput = () => {
    const editor = editorRef.current;
    if (!editor) return;

    const nextValue = readEditorValue(editor);
    const selection = getSelectionRange(editor);
    const nextOffset = selection?.end ?? nextValue.length;

    if (nextValue === valueRef.current) {
      renderEditorDom(editor, valueRef.current);
      setRawCaret(editor, nextOffset);
      return;
    }

    const prepared = prepareValueForRuler(nextValue, nextOffset);
    commitValue(prepared.value, prepared.cursor, cursorOffsetRef.current, prepared.autoWrapBreaks);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const hasCommandModifier = event.ctrlKey || event.metaKey;
    const key = event.key.toLowerCase();

    if (hasCommandModifier && !event.altKey && key === "z") {
      event.preventDefault();
      hideFloatingCursor();
      if (event.shiftKey) {
        handleRedo();
      } else {
        handleUndo();
      }
      return;
    }

    if (event.ctrlKey && !event.metaKey && !event.altKey && key === "y") {
      event.preventDefault();
      hideFloatingCursor();
      handleRedo();
      return;
    }

    if (
      (event.key === "ArrowLeft" || event.key === "ArrowRight") &&
      event.shiftKey &&
      !event.altKey &&
      !event.ctrlKey &&
      !event.metaKey &&
      editorRef.current
    ) {
      const endpoints = getRawSelectionEndpoints(editorRef.current);
      const anchor = endpoints?.anchor ?? cursorOffsetRef.current;
      const focus = endpoints?.focus ?? anchor;
      const nextOffset = getPipeArrowOffset(
        value,
        focus,
        event.key === "ArrowLeft" ? "left" : "right"
      );

      if (nextOffset !== null) {
        event.preventDefault();
        hideFloatingCursor();
        editorRef.current.focus({ preventScroll: true });
        setRawSelection(editorRef.current, anchor, nextOffset);
        cursorOffsetRef.current = nextOffset;
        return;
      }
    }

    if (
      (event.key === "ArrowLeft" || event.key === "ArrowRight") &&
      !event.altKey &&
      !event.ctrlKey &&
      !event.metaKey &&
      !event.shiftKey
    ) {
      const { start, end } = getCursor();
      if (start !== end && editorRef.current) {
        event.preventDefault();
        const nextOffset = event.key === "ArrowLeft" ? start : end;
        hideFloatingCursor();
        editorRef.current.focus({ preventScroll: true });
        setRawCaret(editorRef.current, nextOffset);
        cursorOffsetRef.current = nextOffset;
        return;
      }

      if (start === end) {
        const nextOffset = getPipeArrowOffset(
          value,
          start,
          event.key === "ArrowLeft" ? "left" : "right"
        );

        if (nextOffset !== null && editorRef.current) {
          event.preventDefault();
          hideFloatingCursor();
          editorRef.current.focus({ preventScroll: true });
          setRawCaret(editorRef.current, nextOffset);
          cursorOffsetRef.current = nextOffset;
          return;
        }
      }
    }

    if (event.key === "Enter") {
      event.preventDefault();
      skipNativeLineBreakRef.current = true;
      window.setTimeout(() => {
        skipNativeLineBreakRef.current = false;
      }, 0);
      updateValueAtSelection("\n");
      return;
    }

    if (event.key === " ") {
      event.preventDefault();
      if (skipKeydownSpaceRef.current) {
        skipKeydownSpaceRef.current = false;
        return;
      }
      skipNativeSpaceRef.current = true;
      window.setTimeout(() => {
        skipNativeSpaceRef.current = false;
      }, 0);
      updateValueAtSelection(" ");
      return;
    }

    if (event.key !== "Backspace" && event.key !== "Delete") return;

    const { start, end } = getCursor();
    const isCollapsed = start === end;
    let deleteStart = start;
    let deleteEnd = end;

    if (event.key === "Backspace" && isCollapsed) {
      deleteStart = Math.max(0, start - 1);
    }

    if (event.key === "Delete" && isCollapsed) {
      deleteEnd = Math.min(value.length, end + 1);
    }

    if (deleteStart === deleteEnd) return;

    event.preventDefault();
    const prepared = prepareValueForRuler(
      `${value.slice(0, deleteStart)}${value.slice(deleteEnd)}`,
      deleteStart
    );
    commitValue(prepared.value, prepared.cursor, start, prepared.autoWrapBreaks);
  };

  const handleBeforeInput = (event: FormEvent<HTMLDivElement>) => {
    const inputType = (event.nativeEvent as InputEvent).inputType;
    if (inputType === "insertFromPaste") {
      event.preventDefault();
      return;
    }

    if (
      inputType === "insertText" &&
      (event.nativeEvent as InputEvent).data === " "
    ) {
      event.preventDefault();
      if (skipNativeSpaceRef.current) {
        skipNativeSpaceRef.current = false;
        return;
      }

      skipKeydownSpaceRef.current = true;
      window.setTimeout(() => {
        skipKeydownSpaceRef.current = false;
      }, 0);
      updateValueAtSelection(" ");
      return;
    }

    if (inputType !== "insertParagraph" && inputType !== "insertLineBreak") {
      return;
    }

    event.preventDefault();
    if (skipNativeLineBreakRef.current) {
      skipNativeLineBreakRef.current = false;
      return;
    }

    updateValueAtSelection("\n");
  };

  const handleUndo = () => {
    const previous = historyRef.current.past.at(-1);
    if (previous === undefined) return;

    const nextHistory = {
      past: historyRef.current.past.slice(0, -1),
      future: [
        {
          value: valueRef.current,
          cursor: cursorOffsetRef.current,
          autoWrapBreaks: [...autoWrapStateRef.current.breaks],
        },
        ...historyRef.current.future,
      ],
    };
    updateHistory(nextHistory);
    autoWrapStateRef.current = {
      value: previous.value,
      breaks: [...previous.autoWrapBreaks],
    };
    valueRef.current = previous.value;
    domSyncRequiredRef.current = true;
    cursorOffsetRef.current = previous.cursor;
    pendingCursorRef.current = previous.cursor;
    onChange(previous.value);
  };

  const handleRedo = () => {
    const next = historyRef.current.future[0];
    if (next === undefined) return;

    const nextHistory = {
      past: [
        ...historyRef.current.past,
        {
          value: valueRef.current,
          cursor: cursorOffsetRef.current,
          autoWrapBreaks: [...autoWrapStateRef.current.breaks],
        },
      ],
      future: historyRef.current.future.slice(1),
    };
    updateHistory(nextHistory);
    autoWrapStateRef.current = {
      value: next.value,
      breaks: [...next.autoWrapBreaks],
    };
    valueRef.current = next.value;
    domSyncRequiredRef.current = true;
    cursorOffsetRef.current = next.cursor;
    pendingCursorRef.current = next.cursor;
    onChange(next.value);
  };

  const openKeyboard = () => {
    const editor = editorRef.current;
    if (!editor) return;

    hideFloatingCursor();
    updateKeyboardMode(true);
    editor.focus({ preventScroll: true });
    setRawCaret(editor, cursorOffsetRef.current);
  };

  const stopDeleteRepeat = () => {
    if (deleteRepeatTimeoutRef.current !== null) {
      window.clearTimeout(deleteRepeatTimeoutRef.current);
      deleteRepeatTimeoutRef.current = null;
    }
    if (deleteRepeatIntervalRef.current !== null) {
      window.clearInterval(deleteRepeatIntervalRef.current);
      deleteRepeatIntervalRef.current = null;
    }
  };

  const handleControlPointerDown = (
    event: PointerEvent<HTMLElement>,
    action: () => void,
    repeat = false
  ) => {
    event.preventDefault();
    stopDeleteRepeat();
    updateKeyboardMode(false);
    hideFloatingCursor();
    action();

    if (!repeat) return;

    event.currentTarget.setPointerCapture?.(event.pointerId);
    deleteRepeatTimeoutRef.current = window.setTimeout(() => {
      deleteRepeatIntervalRef.current = window.setInterval(action, 70);
    }, 350);
  };

  const clampFloatingPosition = (left: number, top: number) => {
    const viewport = editorViewportRef.current;
    if (!viewport) return { left: 0, top: 0 };

    return {
      left: Math.max(0, Math.min(left, viewport.clientWidth - 3)),
      top: Math.max(0, Math.min(top, viewport.clientHeight - 24)),
    };
  };

  const applyFloatingPosition = (left: number, top: number) => {
    const position = clampFloatingPosition(left, top);
    floatingCursorPositionRef.current = position;
    if (floatingCursorElementRef.current) {
      floatingCursorElementRef.current.style.left = `${position.left}px`;
      floatingCursorElementRef.current.style.top = `${position.top}px`;
    } else {
      setFloatingCursorPosition(position);
    }
    return position;
  };

  const setFloatingPosition = (left: number, top: number) => {
    pendingFloatingCursorPositionRef.current = null;
    if (floatingCursorFrameRef.current !== null) {
      window.cancelAnimationFrame(floatingCursorFrameRef.current);
      floatingCursorFrameRef.current = null;
    }
    return applyFloatingPosition(left, top);
  };

  const scheduleFloatingPosition = (left: number, top: number) => {
    pendingFloatingCursorPositionRef.current = clampFloatingPosition(left, top);
    if (floatingCursorFrameRef.current !== null) return;

    floatingCursorFrameRef.current = window.requestAnimationFrame(() => {
      floatingCursorFrameRef.current = null;
      const position = pendingFloatingCursorPositionRef.current;
      pendingFloatingCursorPositionRef.current = null;
      if (position) applyFloatingPosition(position.left, position.top);
    });
  };

  const flushFloatingPosition = () => {
    if (floatingCursorFrameRef.current !== null) {
      window.cancelAnimationFrame(floatingCursorFrameRef.current);
      floatingCursorFrameRef.current = null;
    }
    const position = pendingFloatingCursorPositionRef.current;
    pendingFloatingCursorPositionRef.current = null;
    if (position) applyFloatingPosition(position.left, position.top);
  };

  const stopTouchCursorAutoScroll = () => {
    if (touchCursorAutoScrollFrameRef.current !== null) {
      window.cancelAnimationFrame(touchCursorAutoScrollFrameRef.current);
      touchCursorAutoScrollFrameRef.current = null;
    }
  };

  const syncLineNumberScroll = (scrollTop: number) => {
    if (!lineNumberContentRef.current) return;
    lineNumberContentRef.current.style.transform = `translate3d(0, -${scrollTop}px, 0)`;
  };

  const updateTouchCursorOffset = (
    drag: TouchCursorDrag,
    moveFloatingCursor = true
  ) => {
    const editor = editorRef.current;
    const viewport = editorViewportRef.current;
    if (!editor || !viewport) return;

    const position = moveFloatingCursor
      ? clampFloatingPosition(drag.positionX, drag.positionY)
      : floatingCursorPositionRef.current ??
        clampFloatingPosition(drag.positionX, drag.positionY);
    if (moveFloatingCursor) {
      drag.positionX = position.left;
      drag.positionY = position.top;
      scheduleFloatingPosition(position.left, position.top);
    }

    const viewportRect = viewport.getBoundingClientRect();
    const nextOffset = getRawOffsetAtPoint(
      editor,
      viewportRect.left + position.left,
      viewportRect.top + position.top + 12
    );
    drag.currentOffset = nextOffset;

    if (drag.selecting) {
      const scrollTop = editor.scrollTop;
      const scrollLeft = editor.scrollLeft;
      editor.focus({ preventScroll: true });
      setRawSelection(editor, drag.anchorOffset, nextOffset);
      if (editor.scrollTop !== scrollTop || editor.scrollLeft !== scrollLeft) {
        editor.scrollTop = scrollTop;
        editor.scrollLeft = scrollLeft;
        syncLineNumberScroll(scrollTop);
      }
    }
  };

  const runTouchCursorAutoScroll = () => {
    touchCursorAutoScrollFrameRef.current = null;

    const drag = touchCursorDragRef.current;
    const editor = editorRef.current;
    if (!drag || !drag.moved || !editor) return;

    const maxScrollTop = Math.max(0, editor.scrollHeight - editor.clientHeight);
    const maxScrollLeft = Math.max(0, editor.scrollWidth - editor.clientWidth);
    if (maxScrollTop <= 0 && maxScrollLeft <= 0) return;

    const edgeSize = Math.min(56, Math.max(28, editor.clientHeight * 0.18));
    const horizontalEdgeSize = Math.min(
      56,
      Math.max(28, editor.clientWidth * 0.12)
    );
    let scrollTopDelta = 0;
    let scrollLeftDelta = 0;

    if (drag.positionY < edgeSize && editor.scrollTop > 0) {
      const intensity = (edgeSize - drag.positionY) / edgeSize;
      scrollTopDelta = -Math.max(2, Math.round(12 * intensity));
    } else if (
      drag.positionY > editor.clientHeight - edgeSize &&
      editor.scrollTop < maxScrollTop
    ) {
      const intensity =
        (drag.positionY - (editor.clientHeight - edgeSize)) / edgeSize;
      scrollTopDelta = Math.max(2, Math.round(12 * intensity));
    }

    if (drag.positionX < horizontalEdgeSize && editor.scrollLeft > 0) {
      const intensity =
        (horizontalEdgeSize - drag.positionX) / horizontalEdgeSize;
      scrollLeftDelta = -Math.max(2, Math.round(12 * intensity));
    } else if (
      drag.positionX > editor.clientWidth - horizontalEdgeSize &&
      editor.scrollLeft < maxScrollLeft
    ) {
      const intensity =
        (drag.positionX - (editor.clientWidth - horizontalEdgeSize)) /
        horizontalEdgeSize;
      scrollLeftDelta = Math.max(2, Math.round(12 * intensity));
    }

    if (scrollTopDelta === 0 && scrollLeftDelta === 0) return;

    const nextScrollTop = Math.max(
      0,
      Math.min(maxScrollTop, editor.scrollTop + scrollTopDelta)
    );
    const nextScrollLeft = Math.max(
      0,
      Math.min(maxScrollLeft, editor.scrollLeft + scrollLeftDelta)
    );
    if (
      nextScrollTop === editor.scrollTop &&
      nextScrollLeft === editor.scrollLeft
    ) {
      return;
    }

    editor.scrollTop = nextScrollTop;
    editor.scrollLeft = nextScrollLeft;
    syncLineNumberScroll(nextScrollTop);
    if (drag.selecting) {
      updateTouchCursorOffset(drag, false);
    } else {
      syncFloatingCursorToContent(drag.currentOffset);
    }
    touchCursorAutoScrollFrameRef.current = window.requestAnimationFrame(
      runTouchCursorAutoScroll
    );
  };

  const startTouchCursorAutoScroll = () => {
    if (touchCursorAutoScrollFrameRef.current !== null) return;
    touchCursorAutoScrollFrameRef.current = window.requestAnimationFrame(
      runTouchCursorAutoScroll
    );
  };

  useLayoutEffect(
    () => () => {
      stopDeleteRepeat();
      stopTouchCursorAutoScroll();
    },
    []
  );

  const hideFloatingCursor = () => {
    stopTouchCursorAutoScroll();
    if (floatingCursorFrameRef.current !== null) {
      window.cancelAnimationFrame(floatingCursorFrameRef.current);
      floatingCursorFrameRef.current = null;
    }
    pendingFloatingCursorPositionRef.current = null;
    floatingCursorPositionRef.current = null;
    lastTouchBarTapRef.current = null;
    setTouchBarLocked(false);
    setTouchCursorDragging(false);
    setFloatingCursorPosition(null);
  };

  const getFloatingPositionForOffset = (offset: number) => {
    const editor = editorRef.current;
    const viewport = editorViewportRef.current;
    if (!editor || !viewport) return { left: 0, top: 0 };

    const editorRect = getRawCaretClientRect(editor, offset);
    const viewportRect = viewport.getBoundingClientRect();
    return clampFloatingPosition(
      editorRect.left - viewportRect.left,
      editorRect.top - viewportRect.top
    );
  };

  const syncFloatingCursorToContent = (offset: number) => {
    if (!floatingCursorPositionRef.current) return;
    const position = getFloatingPositionForOffset(offset);
    setFloatingPosition(position.left, position.top);
  };

  const focusCursorAtOffset = (offset: number) => {
    const editor = editorRef.current;
    if (!editor) return;

    const safeOffset = Math.max(0, Math.min(offset, value.length));
    updateKeyboardMode(false);
    editor.focus({ preventScroll: true });
    setRawCaret(editor, safeOffset);
    cursorOffsetRef.current = safeOffset;
  };

  const getRulerBounds = () => {
    const width = editorViewportRef.current?.clientWidth ?? 0;
    if (width <= 0) return { min: 0, max: 0 };

    const min = Math.min(48, Math.max(18, width - 12));
    const max = Math.max(min, width - 12);
    return { min, max };
  };

  const clampRulerPosition = (position: number) => {
    const { min, max } = getRulerBounds();
    return Math.max(min, Math.min(Math.round(position), max));
  };

  const applyRulerPosition = (position: number) => {
    const next = clampRulerPosition(position);
    rulerPositionRef.current = next;
    rulerRef.current?.style.setProperty("--ruler-position", `${next}px`);
    rulerMarkerRef.current?.setAttribute("aria-valuenow", `${next}`);
    rulerMarkerRef.current?.style.setProperty(
      "left",
      `calc(2.5rem + ${next}px)`
    );
    rulerGuideRef.current?.style.setProperty("left", `${next}px`);
  };

  const scheduleRulerPosition = (position: number) => {
    pendingRulerPositionRef.current = clampRulerPosition(position);
    if (rulerFrameRef.current !== null) return;

    rulerFrameRef.current = window.requestAnimationFrame(() => {
      rulerFrameRef.current = null;
      const pending = pendingRulerPositionRef.current;
      pendingRulerPositionRef.current = null;
      if (pending !== null) applyRulerPosition(pending);
    });
  };

  const getRulerTextWidth = () => {
    const editor = editorRef.current;
    if (!editor || rulerPositionRef.current <= 0) return 0;

    const style = window.getComputedStyle(editor);
    const paddingLeft = Number.parseFloat(style.paddingLeft) || 0;
    return Math.max(32, rulerPositionRef.current - paddingLeft);
  };

  const rebaseAutoWrapBreaks = (nextValue: string) => {
    const state = autoWrapStateRef.current;
    if (state.breaks.length === 0 || state.value === nextValue) {
      return state.value === nextValue ? state.breaks : [];
    }

    let prefix = 0;
    while (
      prefix < state.value.length &&
      prefix < nextValue.length &&
      state.value[prefix] === nextValue[prefix]
    ) {
      prefix += 1;
    }

    let suffix = 0;
    while (
      suffix < state.value.length - prefix &&
      suffix < nextValue.length - prefix &&
      state.value[state.value.length - 1 - suffix] ===
        nextValue[nextValue.length - 1 - suffix]
    ) {
      suffix += 1;
    }

    const oldChangeEnd = state.value.length - suffix;
    const delta = nextValue.length - state.value.length;

    return state.breaks.flatMap((breakAt) => {
      if (breakAt < prefix) return [breakAt];
      if (breakAt >= oldChangeEnd) return [breakAt + delta];
      return [];
    });
  };

  const removeAutoWrapBreaks = (nextValue: string, cursor: number) => {
    const breaks = rebaseAutoWrapBreaks(nextValue).filter(
      (breakAt) => nextValue[breakAt] === "\n"
    );
    if (breaks.length === 0) {
      return { value: nextValue, cursor };
    }

    let valueStart = 0;
    let unwrappedValue = "";
    let unwrappedCursor = cursor;
    for (const breakAt of breaks) {
      unwrappedValue += nextValue.slice(valueStart, breakAt);
      valueStart = breakAt + 1;
      if (breakAt < cursor) unwrappedCursor -= 1;
    }
    unwrappedValue += nextValue.slice(valueStart);

    return { value: unwrappedValue, cursor: unwrappedCursor };
  };

  const measureEditorText = (text: string) => {
    const editor = editorRef.current;
    if (!editor) return text.length * 8;

    const canvas =
      rulerMeasureCanvasRef.current ?? document.createElement("canvas");
    rulerMeasureCanvasRef.current = canvas;
    const context = canvas.getContext("2d");
    if (!context) return text.length * 8;

    context.font = window.getComputedStyle(editor).font;
    return context.measureText(text).width;
  };

  const prepareValueForRuler = (nextValue: string, nextCursor: number) => {
    const unwrapped = removeAutoWrapBreaks(nextValue, nextCursor);
    const maxWidth = getRulerTextWidth();
    if (maxWidth <= 0) {
      return {
        autoWrapBreaks: rebaseAutoWrapBreaks(nextValue),
        value: nextValue,
        cursor: nextCursor,
      };
    }

    const wrapped = wrapValueToWidth(
      unwrapped.value,
      maxWidth,
      unwrapped.cursor,
      measureEditorText
    );
    return {
      autoWrapBreaks: wrapped.autoBreaks,
      value: wrapped.value,
      cursor: wrapped.cursor,
    };
  };

  const wrapCurrentValueToRuler = () => {
    const currentValue = valueRef.current;
    const prepared = prepareValueForRuler(
      currentValue,
      cursorOffsetRef.current
    );
    if (prepared.value === currentValue) {
      autoWrapStateRef.current = {
        value: currentValue,
        breaks: prepared.autoWrapBreaks,
      };
      return;
    }

    commitValue(
      prepared.value,
      prepared.cursor,
      cursorOffsetRef.current,
      prepared.autoWrapBreaks
    );
  };

  const stopRulerDrag = (event?: PointerEvent<HTMLDivElement>) => {
    const drag = rulerDragRef.current;
    if (drag && event && drag.pointerId === event.pointerId) {
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
    }

    if (rulerFrameRef.current !== null) {
      window.cancelAnimationFrame(rulerFrameRef.current);
      rulerFrameRef.current = null;
    }
    const pending = pendingRulerPositionRef.current;
    pendingRulerPositionRef.current = null;
    if (pending !== null) applyRulerPosition(pending);

    rulerDragRef.current = null;
    wrapCurrentValueToRuler();
  };

  const handleRulerPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    rulerDragRef.current = {
      pointerId: event.pointerId,
      startPosition: rulerPositionRef.current,
      startX: event.clientX,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handleRulerPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const drag = rulerDragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;

    event.preventDefault();
    scheduleRulerPosition(drag.startPosition + event.clientX - drag.startX);
  };

  const handleRulerKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const amount = event.shiftKey ? 40 : 8;
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      applyRulerPosition(rulerPositionRef.current - amount);
      wrapCurrentValueToRuler();
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      applyRulerPosition(rulerPositionRef.current + amount);
      wrapCurrentValueToRuler();
    }
  };

  const handleTouchBarPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    updateKeyboardMode(false);
    setTouchCursorDragging(true);

    const now = performance.now();
    const isDoubleTap =
      lastTouchBarTapRef.current !== null &&
      now - lastTouchBarTapRef.current < 320;
    lastTouchBarTapRef.current = now;
    setTouchBarLocked(isDoubleTap);

    const hasFloatingCursor = floatingCursorPositionRef.current !== null;
    const { start, end } = getCursor();
    const cursorOffset = hasFloatingCursor
      ? cursorOffsetRef.current
      : end >= start
        ? end
        : start;
    const offset = Math.max(0, Math.min(cursorOffset, value.length));
    const position =
      floatingCursorPositionRef.current ?? getFloatingPositionForOffset(offset);
    touchCursorDragRef.current = {
      pointerId: event.pointerId,
      lastX: event.clientX,
      lastY: event.clientY,
      positionX: position.left,
      positionY: position.top,
      anchorOffset: offset,
      currentOffset: offset,
      selecting: isDoubleTap,
      moved: false,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
    setFloatingPosition(position.left, position.top);
    cursorOffsetRef.current = offset;
  };

  const handleTouchBarPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const drag = touchCursorDragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;

    event.preventDefault();
    const deltaX = event.clientX - drag.lastX;
    const deltaY = event.clientY - drag.lastY;
    drag.lastX = event.clientX;
    drag.lastY = event.clientY;
    drag.positionX += deltaX;
    drag.positionY += deltaY;
    drag.moved = drag.moved || deltaX !== 0 || deltaY !== 0;
    updateTouchCursorOffset(drag);
    startTouchCursorAutoScroll();
  };

  const stopTouchBarDrag = (event?: PointerEvent<HTMLDivElement>) => {
    stopTouchCursorAutoScroll();
    const drag = touchCursorDragRef.current;
    if (drag && event && drag.pointerId === event.pointerId) {
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
    }

    flushFloatingPosition();

    if (drag && editorViewportRef.current && editorRef.current) {
      const viewportRect = editorViewportRef.current.getBoundingClientRect();
      const position = floatingCursorPositionRef.current ?? {
        left: drag.positionX,
        top: drag.positionY,
      };
      const nextOffset = drag.selecting
        ? drag.currentOffset
        : getRawOffsetAtPoint(
            editorRef.current,
            viewportRect.left + position.left,
            viewportRect.top + position.top + 12
          );

      if (drag.selecting) {
        editorRef.current.focus({ preventScroll: true });
        setRawSelection(editorRef.current, drag.anchorOffset, nextOffset);
        cursorOffsetRef.current = nextOffset;
      } else {
        focusCursorAtOffset(nextOffset);
      }

      const alignedPosition = getFloatingPositionForOffset(nextOffset);
      setFloatingPosition(alignedPosition.left, alignedPosition.top);
    }

    setTouchBarLocked(false);
    setTouchCursorDragging(false);
    touchCursorDragRef.current = null;
  };

  useLayoutEffect(() => {
    const viewport = editorViewportRef.current;
    if (!viewport) return;

    const updateRuler = () => {
      const { min, max } = getRulerBounds();
      if (max <= 0) return;

      const current = rulerPositionRef.current;
      applyRulerPosition(current >= min ? current : max);
    };

    updateRuler();
    const observer =
      typeof ResizeObserver === "undefined"
        ? null
        : new ResizeObserver(updateRuler);
    observer?.observe(viewport);

    return () => {
      observer?.disconnect();
      if (rulerFrameRef.current !== null) {
        window.cancelAnimationFrame(rulerFrameRef.current);
        rulerFrameRef.current = null;
      }
    };
  }, []);

  const lineCount = Math.max(1, value.split("\n").length);

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col gap-2">
      <div className="flex shrink-0 items-center justify-between gap-2">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          {label ? (
            <span className="shrink-0 text-xs font-medium text-foreground">{label}</span>
          ) : null}
          <ButtonCommon
            type="button"
            size="xs"
            circle
            color={keyboardEnabled ? "primary" : "gray"}
            variant={keyboardEnabled ? "solid" : "outline"}
            className="!size-8"
            aria-label="Open keyboard"
            title="Open keyboard"
            icon={<KeyboardIcon />}
            onPointerDown={(event) =>
              handleControlPointerDown(event, openKeyboard)
            }
          />
          <ButtonCommon
            type="button"
            size="xs"
            circle
            color="gray"
            variant="outline"
            className="!size-8"
            aria-label="Undo"
            title="Undo"
            icon={<Undo2 />}
            disabled={history.past.length === 0}
            onPointerDown={(event) =>
              handleControlPointerDown(event, handleUndo)
            }
          />
          <ButtonCommon
            type="button"
            size="xs"
            circle
            color="gray"
            variant="outline"
            className="!size-8"
            aria-label="Redo"
            title="Redo"
            icon={<Redo2 />}
            disabled={history.future.length === 0}
            onPointerDown={(event) =>
              handleControlPointerDown(event, handleRedo)
            }
          />
        </div>
      </div>
      <div
        className={cn(
          "relative flex h-full min-w-0 flex-1 flex-col overflow-hidden rounded-md border border-input bg-base",
          fitToContainer
            ? "min-h-0"
            : "min-h-[280px] max-h-[calc(100dvh-18rem)] sm:min-h-[360px] sm:max-h-[min(62dvh,560px)]"
        )}
      >
        <div
          ref={rulerRef}
          className="lyrics-ruler relative h-8 shrink-0 overflow-hidden border-b border-line select-none"
        >
          <div
            ref={rulerMarkerRef}
            role="slider"
            tabIndex={0}
            aria-label="Line wrap ruler"
            aria-valuemin={0}
            aria-valuemax={editorViewportRef.current?.clientWidth ?? 0}
            aria-valuenow={rulerPositionRef.current}
            className="absolute inset-y-0 z-20 flex w-6 -translate-x-1/2 touch-none cursor-ew-resize items-center justify-center text-brand-2"
            style={{ left: "calc(2.5rem + var(--ruler-position, 0px))" }}
            onKeyDown={handleRulerKeyDown}
            onPointerDown={handleRulerPointerDown}
            onPointerMove={handleRulerPointerMove}
            onPointerUp={stopRulerDrag}
            onPointerCancel={stopRulerDrag}
            onLostPointerCapture={stopRulerDrag}
          >
            <GripVertical aria-hidden="true" className="size-4" />
          </div>
        </div>
        <div className="relative flex min-h-0 min-w-0 flex-1 overflow-hidden">
          <div
            ref={lineNumberRef}
            aria-hidden="true"
            className="w-10 shrink-0 select-none overflow-hidden border-r border-line text-right"
          >
            <div
              ref={lineNumberContentRef}
              className="lyrics-paper-grid min-h-full w-full px-2 py-2 font-mono text-xs leading-6 text-muted-foreground"
            >
              {Array.from({ length: lineCount }, (_, index) => (
                <span key={index} className="block h-6">
                  {index + 1}
                </span>
              ))}
            </div>
          </div>
          <div
            ref={editorViewportRef}
            className="relative min-h-0 min-w-0 flex-1 overflow-hidden"
          >
            <div
              ref={editorRef}
              contentEditable
              suppressContentEditableWarning
              role="textbox"
              aria-multiline="true"
              spellCheck={false}
              data-placeholder={placeholder}
              data-empty={!value ? "true" : undefined}
              className={cn(
                "lyrics-text-editor lyrics-paper-grid h-full min-h-0 min-w-0 flex-1 overflow-auto overscroll-contain whitespace-pre rounded-r-md px-3 py-2 text-sm leading-6 text-foreground outline-none select-text selection:bg-brand selection:text-white focus-visible:ring-2 focus-visible:ring-brand/40",
                className
              )}
              style={{ caretColor: floatingCursorPosition ? "transparent" : undefined }}
              inputMode={keyboardEnabled ? "text" : "none"}
              onInput={handleInput}
              onBeforeInput={handleBeforeInput}
              onPaste={(event) => {
                event.preventDefault();
                event.stopPropagation();
                updateValueAtSelection(readClipboardText(event.clipboardData));
              }}
              onPointerDown={() => {
                updateKeyboardMode(false);
                hideFloatingCursor();
              }}
              onFocus={() => {
                if (!value && editorRef.current) setRawCaret(editorRef.current, 0);
              }}
              onScroll={() => {
                if (editorRef.current) {
                  syncLineNumberScroll(editorRef.current.scrollTop);
                  const drag = touchCursorDragRef.current;
                  if (!drag?.selecting && floatingCursorPositionRef.current) {
                    syncFloatingCursorToContent(
                      drag?.currentOffset ?? cursorOffsetRef.current
                    );
                  }
                }
              }}
              onKeyDown={handleKeyDown}
              onKeyUp={(event) => {
                if (event.key === " ") {
                  skipNativeSpaceRef.current = false;
                }
                const selection = editorRef.current
                  ? getSelectionRange(editorRef.current)
                  : null;
                if (selection) cursorOffsetRef.current = selection.end;
              }}
              onMouseUp={() => {
                const selection = editorRef.current
                  ? getSelectionRange(editorRef.current)
                  : null;
                if (selection) cursorOffsetRef.current = selection.end;
              }}
            />
            <div
              ref={rulerGuideRef}
              aria-hidden="true"
              className="pointer-events-none absolute inset-y-0 z-[5] w-px bg-brand-2/70 shadow-[0_0_0_1px_rgb(255_255_255_/_0.35)]"
              style={{ left: "0px" }}
            />
            {floatingCursorPosition ? (
              <span
                ref={floatingCursorElementRef}
                aria-hidden="true"
                className={cn(
                  "pointer-events-none absolute z-10 h-6 w-0.5 bg-brand shadow-[0_0_0_2px_rgb(255_255_255_/_0.7)]",
                  !touchCursorDragging && "lyrics-floating-caret"
                )}
                style={{
                  left: floatingCursorPosition.left,
                  top: floatingCursorPosition.top,
                }}
              />
            ) : null}
          </div>
        </div>
      </div>

      <div className="flex justify-center">
        <div className="grid min-h-28 w-full grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)] grid-rows-2 gap-2 rounded-lg border border-line bg-transparent">
          <div
            role="slider"
            tabIndex={0}
            aria-label="Touch cursor control"
            aria-valuemin={0}
            aria-valuemax={value.length}
            aria-valuenow={cursorOffsetRef.current}
            aria-pressed={touchBarLocked}
            className={cn(
              "row-span-2 flex h-full min-h-0 min-w-0 touch-none select-none items-center justify-center rounded-md border bg-transparent px-2",
              touchBarLocked
                ? "border-brand-2 bg-brand-2/10"
                : "border-brand-2/35"
            )}
            onPointerDown={handleTouchBarPointerDown}
            onPointerMove={handleTouchBarPointerMove}
            onPointerUp={stopTouchBarDrag}
            onPointerCancel={stopTouchBarDrag}
            onLostPointerCapture={stopTouchBarDrag}
          >
            <GripHorizontal aria-hidden="true" className="size-5 text-brand-2/65" />
          </div>
          <div className="flex min-w-0 items-center gap-2">
            <ButtonCommon
              type="button"
              size="xs"
              color="secondary"
              variant="outline"
              className="h-full min-h-12 min-w-0 flex-1 !p-0 text-sm font-bold"
              aria-label="Insert lyric separator"
              title="Insert lyric separator"
              onPointerDown={(event) =>
                handleControlPointerDown(event, () => updateValueAtSelection("|"))
              }
            >
              |
            </ButtonCommon>
            <ButtonCommon
              type="button"
              size="xs"
              color="danger"
              variant="outline"
              className="h-full min-h-12 min-w-0 flex-1 !px-2 text-xs font-semibold"
              aria-label={typeof deleteLabel === "string" ? deleteLabel : "Delete"}
              title={typeof deleteLabel === "string" ? deleteLabel : "Delete"}
              icon={<Delete />}
              onPointerDown={(event) =>
                handleControlPointerDown(event, deleteBackward, true)
              }
              onPointerUp={stopDeleteRepeat}
              onPointerCancel={stopDeleteRepeat}
              onLostPointerCapture={stopDeleteRepeat}
            >
              {deleteLabel}
            </ButtonCommon>
          </div>
          <div className="flex min-w-0 items-center gap-2">
            <ButtonCommon
              type="button"
              size="xs"
              color="secondary"
              variant="outline"
              className="h-full min-h-12 min-w-0 flex-1 !px-3 text-xs font-semibold"
              aria-label="Insert space"
              title="Insert space"
              onPointerDown={(event) =>
                handleControlPointerDown(event, () => updateValueAtSelection(" "))
              }
            >
              Space
            </ButtonCommon>
            <ButtonCommon
              type="button"
              size="xs"
              color="secondary"
              variant="outline"
              className="h-full min-h-12 w-fit shrink-0 !px-3 text-xs font-semibold"
              aria-label="Insert line break"
              title="Insert line break"
              icon={<CornerDownLeft />}
              onPointerDown={(event) =>
                handleControlPointerDown(event, () => updateValueAtSelection("\n"))
              }
            >
              Enter
            </ButtonCommon>
          </div>
        </div>
      </div>
    </div>
  );
}
