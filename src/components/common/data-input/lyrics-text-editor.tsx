"use client";

import {
  CornerDownLeft,
  Delete,
  GripHorizontal,
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
import { Switch } from "@/components/ui/switch";
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
  if (element.dataset.editorSpace) {
    const count = Number(element.dataset.editorSpace);
    return Number.isFinite(count) && count > 0 ? count : 0;
  }
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
    if (element.dataset.editorSpace) {
      const count = Number(element.dataset.editorSpace);
      return Number.isFinite(count) && count > 0 ? " ".repeat(count) : "";
    }
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
      if (parent?.dataset.editorSpace) {
        const count = Number(parent.dataset.editorSpace);
        return targetOffset > 0 && Number.isFinite(count) ? count : 0;
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
        element.dataset.editorNewline === "true" ||
        element.dataset.editorSpace !== undefined;

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

interface RawTokenRange {
  element: HTMLElement;
  start: number;
  end: number;
}

function getRawTokenRanges(root: HTMLElement): RawTokenRange[] {
  const ranges: RawTokenRange[] = [];
  let offset = 0;

  for (const child of Array.from(root.childNodes)) {
    const length = getNodeLength(child);
    if (child.nodeType === Node.ELEMENT_NODE) {
      const element = child as HTMLElement;
      if (
        element.dataset.editorPipe === "true" ||
        element.dataset.editorSpace !== undefined
      ) {
        ranges.push({
          element,
          start: offset,
          end: offset + length,
        });
      }
    }
    offset += length;
  }

  return ranges;
}

function expandSelectionToTokenElements(
  root: HTMLElement,
  showTokenElements: boolean
) {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
    return getSelectionRange(root);
  }

  const current = getSelectionRange(root);
  if (!current) return null;

  let start = current.start;
  let end = current.end;

  if (!showTokenElements) {
    return current;
  }

  const tokens = getRawTokenRanges(root);

  tokens.forEach((token) => {
    const endpointInsideToken =
      token.element.contains(selection.anchorNode) ||
      token.element.contains(selection.focusNode);
    const overlapsSelection =
      current.start < token.end && current.end > token.start;
    if (!overlapsSelection && !endpointInsideToken) return;

    start = Math.min(start, token.start);
    end = Math.max(end, token.end);
  });

  if (start !== current.start || end !== current.end) {
    setRawSelection(root, start, end);
  }

  return { start, end };
}

function updateTokenSelectionHighlight(
  root: HTMLElement,
  showTokenElements: boolean
) {
  const selection = getSelectionRange(root);
  const selectedTokens = root.querySelectorAll<HTMLElement>(
    ".lyrics-token-selected"
  );

  if (!showTokenElements || !selection || selection.start === selection.end) {
    selectedTokens.forEach((token) =>
      token.classList.remove("lyrics-token-selected")
    );
    return;
  }

  selectedTokens.forEach((token) =>
    token.classList.remove("lyrics-token-selected")
  );
  getRawTokenRanges(root).forEach((token) => {
    const tokenSelected =
      selection.start < token.end && selection.end > token.start;
    if (tokenSelected) token.element.classList.add("lyrics-token-selected");
  });
}

function getTextSpaceArrowOffset(
  value: string,
  offset: number,
  direction: "left" | "right"
) {
  const pivot = direction === "left" ? offset - 1 : offset;
  if (value[pivot] !== " ") return null;
  return direction === "left" ? offset - 1 : offset + 1;
}

function getTokenBoundaryArrowOffset(
  value: string,
  offset: number,
  direction: "left" | "right",
  showTokenElements: boolean
) {
  if (!showTokenElements) {
    return getTextSpaceArrowOffset(value, offset, direction);
  }

  if (direction === "left") {
    const previousCharacter = value[offset - 1];
    if (previousCharacter === "|") return offset - 1;
    if (previousCharacter !== " ") return null;

    let nextOffset = offset - 1;
    while (nextOffset > 0 && value[nextOffset - 1] === " ") {
      nextOffset -= 1;
    }
    return nextOffset;
  }

  const nextCharacter = value[offset];
  if (nextCharacter === "|") return offset + 1;
  if (nextCharacter !== " ") return null;

  let nextOffset = offset + 1;
  while (nextOffset < value.length && value[nextOffset] === " ") {
    nextOffset += 1;
  }
  return nextOffset;
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

function renderEditorDom(
  root: HTMLElement,
  value: string,
  showTokenElements = true
) {
  root.replaceChildren();

  if (!showTokenElements) {
    const lines = value.split("\n");
    lines.forEach((line, index) => {
      let lineOffset = 0;
      while (lineOffset < line.length) {
        if (line[lineOffset] !== " ") {
          let textEnd = lineOffset + 1;
          while (textEnd < line.length && line[textEnd] !== " ") {
            textEnd += 1;
          }

          const textSpan = document.createElement("span");
          textSpan.textContent = line.slice(lineOffset, textEnd);
          root.append(textSpan);
          lineOffset = textEnd;
          continue;
        }

        let spaceEnd = lineOffset + 1;
        while (spaceEnd < line.length && line[spaceEnd] === " ") {
          spaceEnd += 1;
        }

        while (lineOffset < spaceEnd) {
          const count = 1;
          const space = document.createElement("span");
          space.contentEditable = "false";
          space.dataset.editorSpace = String(count);
          space.className = "inline select-text whitespace-pre";
          space.setAttribute(
            "aria-label",
            `${count} ${count === 1 ? "space" : "spaces"}`
          );
          space.textContent = "\u00a0";
          root.append(space);
          appendCaretSentinel(root);
          lineOffset += count;
        }
      }

      if (index < lines.length - 1) {
        const newline = document.createElement("br");
        newline.dataset.editorNewline = "true";
        root.append(newline);
        appendCaretSentinel(root);
      }
    });
    return;
  }

  for (let index = 0; index < value.length; index += 1) {
    const character = value[index];

    if (character === " ") {
      let end = index + 1;
      while (end < value.length && value[end] === " ") end += 1;

      const count = end - index;
      const displayCount = count;

      const space = document.createElement("span");
      space.contentEditable = "false";
      space.dataset.editorSpace = String(count);
      space.className =
        "mx-0.5 inline-flex select-text items-center rounded border border-line bg-panel-2 px-1 text-[10px] font-semibold leading-5 text-muted-foreground";
      space.setAttribute(
        "aria-label",
        `${count} ${count === 1 ? "space" : "spaces"}`
      );
      space.textContent = `${displayCount}x`;
      root.append(space);
      appendCaretSentinel(root);
      index = end - 1;
      continue;
    }

    if (character === "|") {
      const separator = document.createElement("span");
      separator.contentEditable = "false";
      separator.dataset.editorPipe = "true";
      separator.className =
        "mx-0.5 inline-flex min-w-3 items-center justify-center rounded border border-brand-2/50 bg-brand-2/15 px-px font-semibold leading-5 text-brand-2";
      separator.setAttribute("aria-label", "Lyric separator");
      separator.textContent = "|";
      root.append(separator);
      appendCaretSentinel(root);
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
    while (
      end < value.length &&
      value[end] !== " " &&
      value[end] !== "|" &&
      value[end] !== "\n"
    ) {
      end += 1;
    }

    const textSpan = document.createElement("span");
    textSpan.textContent = value.slice(index, end);
    root.append(textSpan);
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

interface EditorHistoryEntry {
  value: string;
  cursor: number;
}

interface EditorHistory {
  past: EditorHistoryEntry[];
  future: EditorHistoryEntry[];
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
  const [showTokenElements, setShowTokenElements] = useState(true);
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
    previousCursor = cursorOffsetRef.current
  ) => {
    if (nextValue === valueRef.current) return;

    updateHistory({
      past: [
        ...historyRef.current.past,
        { value: valueRef.current, cursor: previousCursor },
      ],
      future: [],
    });
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
    valueRef.current = value;
    cursorOffsetRef.current = value.length;
    pendingCursorRef.current = null;
    domSyncRequiredRef.current = true;
  }, [resetKey, value, showTokenElements]);

  useLayoutEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;

    let externalValueChanged = false;
    if (value !== valueRef.current) {
      updateHistory({
        past: [
          ...historyRef.current.past,
          { value: valueRef.current, cursor: cursorOffsetRef.current },
        ],
        future: [],
      });
      valueRef.current = value;
      cursorOffsetRef.current = value.length;
      externalValueChanged = true;
      domSyncRequiredRef.current = true;
    }

    if (domSyncRequiredRef.current || readEditorValue(editor) !== value) {
      renderEditorDom(editor, value, showTokenElements);
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

  useLayoutEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;

    renderEditorDom(editor, valueRef.current, showTokenElements);
    domSyncRequiredRef.current = false;

    const pendingCursor = pendingCursorRef.current;
    if (pendingCursor !== null) {
      setRawCaret(editor, pendingCursor);
      cursorOffsetRef.current = pendingCursor;
      pendingCursorRef.current = null;
    } else if (document.activeElement === editor) {
      setRawCaret(editor, cursorOffsetRef.current);
    }
  }, [showTokenElements]);

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
    commitValue(nextValue, nextOffset, start);
  };

  const deleteBackward = () => {
    const { start, end } = getCursor();
    let deleteStart = start;
    if (start === end) {
      deleteStart = Math.max(0, start - 1);
    }
    if (deleteStart === end) return;

    commitValue(
      `${value.slice(0, deleteStart)}${value.slice(end)}`,
      deleteStart,
      start
    );
  };

  const handleInput = () => {
    const editor = editorRef.current;
    if (!editor) return;

    const nextValue = readEditorValue(editor);
    const selection = getSelectionRange(editor);
    const nextOffset = selection?.end ?? nextValue.length;

    if (nextValue === valueRef.current) {
      renderEditorDom(editor, valueRef.current, showTokenElements);
      setRawCaret(editor, nextOffset);
      return;
    }

    commitValue(nextValue, nextOffset);
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
      const nextOffset = getTokenBoundaryArrowOffset(
        value,
        focus,
        event.key === "ArrowLeft" ? "left" : "right",
        showTokenElements
      );

      if (nextOffset !== null) {
        event.preventDefault();
        hideFloatingCursor();
        editorRef.current.focus({ preventScroll: true });
        setRawSelection(editorRef.current, anchor, nextOffset);
        updateTokenSelectionHighlight(editorRef.current, showTokenElements);
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
        updateTokenSelectionHighlight(editorRef.current, showTokenElements);
        cursorOffsetRef.current = nextOffset;
        return;
      }

      if (start === end) {
        const nextOffset = getTokenBoundaryArrowOffset(
          value,
          start,
          event.key === "ArrowLeft" ? "left" : "right",
          showTokenElements
        );

        if (nextOffset !== null && editorRef.current) {
          event.preventDefault();
          hideFloatingCursor();
          editorRef.current.focus({ preventScroll: true });
          setRawCaret(editorRef.current, nextOffset);
          updateTokenSelectionHighlight(editorRef.current, showTokenElements);
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
    commitValue(
      `${value.slice(0, deleteStart)}${value.slice(deleteEnd)}`,
      deleteStart,
      start
    );
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
        },
        ...historyRef.current.future,
      ],
    };
    updateHistory(nextHistory);
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
        },
      ],
      future: historyRef.current.future.slice(1),
    };
    updateHistory(nextHistory);
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

  const lineCount = Math.max(1, value.split("\n").length);

  const handleTokenElementsChange = (checked: boolean) => {
    const { end } = getCursor();
    cursorOffsetRef.current = end;
    pendingCursorRef.current = end;
    domSyncRequiredRef.current = true;
    hideFloatingCursor();
    setShowTokenElements(checked);
  };

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
        <div className="flex shrink-0 items-center gap-2">
          <Switch
            size="sm"
            checked={showTokenElements}
            onCheckedChange={handleTokenElementsChange}
            aria-label="Show lyric markers"
            title="Show lyric markers"
            onPointerDown={(event) => event.preventDefault()}
            className="!h-[22px] !w-auto"
          >
            <span className="invisible whitespace-nowrap px-3 text-[8px] font-bold leading-none">
              TEXT
            </span>
            <span
              className={cn(
                "absolute inset-y-0 right-1 items-center text-[8px] font-bold leading-none text-foreground/70",
                showTokenElements ? "hidden" : "flex"
              )}
            >
              TXT
            </span>
            <span
              className={cn(
                "absolute inset-y-0 left-1 items-center text-[8px] font-bold leading-none text-primary-foreground",
                showTokenElements ? "flex" : "hidden"
              )}
            >
              BOX
            </span>
          </Switch>
        </div>
      </div>
      <div
        className={cn(
          "flex h-full min-w-0 flex-1 overflow-hidden rounded-md border border-input bg-base",
          fitToContainer
            ? "min-h-0"
            : "min-h-[280px] max-h-[calc(100dvh-18rem)] sm:min-h-[360px] sm:max-h-[min(62dvh,560px)]"
        )}
      >
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
              if (editorRef.current) {
                updateTokenSelectionHighlight(
                  editorRef.current,
                  showTokenElements
                );
              }
              const selection = editorRef.current
                ? getSelectionRange(editorRef.current)
                : null;
              if (selection) cursorOffsetRef.current = selection.end;
            }}
            onMouseUp={() => {
              const selection = editorRef.current
                ? expandSelectionToTokenElements(
                    editorRef.current,
                    showTokenElements
                  )
                : null;
              if (editorRef.current) {
                updateTokenSelectionHighlight(
                  editorRef.current,
                  showTokenElements
                );
              }
              if (selection) cursorOffsetRef.current = selection.end;
            }}
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

      <div className="flex justify-center">
        <div className="grid min-h-28 w-full grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)] grid-rows-2 gap-2 rounded-lg border border-line bg-panel-2">
          <div
            role="slider"
            tabIndex={0}
            aria-label="Touch cursor control"
            aria-valuemin={0}
            aria-valuemax={value.length}
            aria-valuenow={cursorOffsetRef.current}
            aria-pressed={touchBarLocked}
            className={cn(
              "row-span-2 flex h-full min-h-0 min-w-0 touch-none select-none items-center justify-center rounded-md border bg-gradient-to-b from-panel to-panel-2 px-2 shadow-inner",
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
          <div className="flex min-w-0 items-center gap-1">
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
          <div className="flex min-w-0 items-center gap-1">
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
