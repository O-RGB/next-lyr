"use client";

import React, { useCallback, useEffect, useRef } from "react";
import { useTimerStore } from "@/timer-worker/store";

/** Small Canvas beat meter; the clock only repaints the pixels, not N DOM nodes. */
const BeatIndicator: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const draw = useCallback(
    (currentBeat: number, timeSignatureNumerator: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const width = Math.max(1, timeSignatureNumerator * 11);
      const height = 10;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, width, height);
      const computed = getComputedStyle(document.documentElement);
      const activeColor =
        computed.getPropertyValue("--brand-2").trim() || "#0a9b78";
      const inactiveColor =
        computed.getPropertyValue("--line-strong").trim() || "#bcc6d4";
      for (let beat = 0; beat < timeSignatureNumerator; beat += 1) {
        ctx.beginPath();
        ctx.arc(
          4 + beat * 11,
          height / 2,
          beat === currentBeat ? 3 : 2.5,
          0,
          Math.PI * 2
        );
        ctx.globalAlpha = beat === currentBeat ? 1 : 0.6;
        ctx.fillStyle = beat === currentBeat ? activeColor : inactiveColor;
        ctx.shadowBlur = beat === currentBeat ? 5 : 0;
        ctx.shadowColor = activeColor;
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      ctx.shadowBlur = 0;
    },
    []
  );

  useEffect(() => {
    const render = () => {
      const beatInfo = useTimerStore.getState().beatInfo;
      draw(beatInfo.beat - 1, beatInfo.numerator);
    };

    render();
    return useTimerStore.subscribe((next, previous) => {
      if (
        next.beatInfo.beat !== previous.beatInfo.beat ||
        next.beatInfo.numerator !== previous.beatInfo.numerator
      ) {
        render();
      }
    });
  }, [draw]);

  return <canvas ref={canvasRef} aria-label="Beat indicator" />;
};

export default BeatIndicator;
