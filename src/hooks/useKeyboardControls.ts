// src/hooks/useKeyboardControls.ts
import { useEffect } from "react";
import { useKaraokeStore } from "../stores/karaoke-store";

export type PlayerControls = {
  play: () => void;
  pause: () => void;
  seek: (time: number) => void;
  getCurrentTime: () => number;
  isPlaying: () => boolean;
};

export const useKeyboardControls = (
  player: PlayerControls | null,
  onEditLine: (lineIndex: number) => void
) => {
  const actions = useKaraokeStore((state) => state.actions);
  const isEditModalOpen = useKaraokeStore((state) => state.isEditModalOpen);
  const selectedLineIndex = useKaraokeStore((state) => state.selectedLineIndex);
  const lyricsData = useKaraokeStore((state) => state.lyricsData);
  const isTimingActive = useKaraokeStore((state) => state.isTimingActive);
  const correctionIndex = useKaraokeStore((state) => state.correctionIndex);
  const currentIndex = useKaraokeStore((state) => state.currentIndex);
  const editingLineIndex = useKaraokeStore((state) => state.editingLineIndex);
  const playFromScrolledPosition = useKaraokeStore(
    (state) => state.playFromScrolledPosition
  );
  const chordPanelCenterTick = useKaraokeStore(
    (state) => state.chordPanelCenterTick
  );
  const isPlaying = useKaraokeStore((state) => state.isPlaying);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      console.log("includes((e.target as HTMLElement).tagName)", ["INPUT", "TEXTAREA"].includes((e.target as HTMLElement).tagName));
      console.log("player", player);
      if (
        ["INPUT", "TEXTAREA"].includes((e.target as HTMLElement).tagName) ||
        isEditModalOpen ||
        !player
      )
        return;

      // vvvvvvvvvv จุดแก้ไข vvvvvvvvvv
      // สร้างตัวแปรเช็คสถานะ "กำลังปาดเนื้อร้อง"
      console.log("isTimingActive", isTimingActive);
      console.log("editingLineIndex", editingLineIndex);
      const isStampingMode = isTimingActive || editingLineIndex !== null;
      // ^^^^^^^^^^ สิ้นสุดจุดแก้ไข ^^^^^^^^^^

      if (e.ctrlKey && e.code === "KeyZ") {
        e.preventDefault();
        actions.undo();
        return;
      }
      if (e.ctrlKey && e.code === "KeyY") {
        e.preventDefault();
        actions.redo();
        return;
      }

      const totalLines = lyricsData.length
        ? Math.max(...lyricsData.map((w) => w.lineIndex)) + 1
        : 0;

      // vvvvvvvvvv จุดแก้ไข vvvvvvvvvv
      // ถ้าไม่ได้อยู่ในโหมดปาดเนื้อร้อง ให้ทำงานตามปกติ
      if (!isStampingMode) {
        if (e.code === "ArrowUp") {
          e.preventDefault();
          actions.selectLine(
            selectedLineIndex === null
              ? totalLines > 0
                ? 0
                : null
              : Math.max(0, selectedLineIndex - 1)
          );
          actions.setPlayFromScrolledPosition(false);
          return;
        }
        if (e.code === "ArrowDown") {
          e.preventDefault();
          actions.selectLine(
            selectedLineIndex === null
              ? totalLines > 0
                ? 0
                : null
              : Math.min(totalLines - 1, selectedLineIndex + 1)
          );
          actions.setPlayFromScrolledPosition(false);
          return;
        }

        if (e.code === "Enter" && !e.ctrlKey && selectedLineIndex !== null) {
          e.preventDefault();
          actions.openEditModal();
          return;
        }

        if (e.ctrlKey && e.code === "Enter" && selectedLineIndex !== null) {
          e.preventDefault();
          onEditLine(selectedLineIndex);
          return;
        }
      }
      // ^^^^^^^^^^ สิ้นสุดจุดแก้ไข ^^^^^^^^^^

      if (e.code === "Space") {
        console.log("Space");
        e.preventDefault();
        // vvvvvvvvvv จุดแก้ไข vvvvvvvvvv
        // ถ้ากำลังปาดเนื้อร้องอยู่ ห้ามกด Spacebar เพื่อหยุดเพลง
        console.log("isStampingMode", isStampingMode);
        if (isStampingMode) {
          return;
        }
        // ^^^^^^^^^^ สิ้นสุดจุดแก้ไข ^^^^^^^^^^

        if (isPlaying) {
          player.pause();
          actions.setIsPlaying(false);
          actions.setIsChordPanelAutoScrolling(false);
          actions.setChordPanelCenterTick(player.getCurrentTime());
        } else {
          let seekTime: number;

          if (playFromScrolledPosition) {
            seekTime = chordPanelCenterTick;
            actions.setPlayFromScrolledPosition(false);
          } else if (selectedLineIndex !== null) {
            const firstWordOfLine = lyricsData.find(
              (w) => w.lineIndex === selectedLineIndex
            );
            if (firstWordOfLine && firstWordOfLine.start !== null) {
              seekTime = firstWordOfLine.start;
            } else {
              seekTime = chordPanelCenterTick;
            }
          } else {
            seekTime = chordPanelCenterTick;
          }

          actions.setIsChordPanelAutoScrolling(true);
          actions.setCurrentTime(seekTime);
          player.seek(seekTime);
          player.play();
          actions.setIsPlaying(true);
        }
        return;
      }

      if (
        isStampingMode && // vvvvvvvvvv จุดแก้ไข vvvvvvvvvv
        e.code === "ArrowLeft"
      ) {
        e.preventDefault();
        if (currentIndex <= 0) return;

        if (editingLineIndex !== null) {
          const firstWordOfEditingLine = lyricsData.find(
            (w) => w.lineIndex === editingLineIndex
          );
          if (
            firstWordOfEditingLine &&
            currentIndex === firstWordOfEditingLine.index
          ) {
            onEditLine(editingLineIndex);
            return;
          }
        }

        const prevIndex = currentIndex - 1;
        const { lineStartTime } = actions.correctTimingStep(prevIndex);
        player.seek(lineStartTime);
        if (!player.isPlaying()) player.play();
        return;
      }

      if (player.isPlaying() && e.code === "ArrowRight") {
        e.preventDefault();

        const currentTime = player.getCurrentTime();
        const currentWord = lyricsData[currentIndex];

        const isStartingFromScratch =
          !isTimingActive &&
          editingLineIndex === null &&
          currentWord &&
          currentWord.start === null;

        const isStartingEditedLine =
          !isTimingActive && editingLineIndex !== null;

        if (isTimingActive || isStartingFromScratch || isStartingEditedLine) {
          if (isStartingFromScratch) {
            actions.startTiming(currentTime);
            return;
          }

          if (isStartingEditedLine) {
            actions.startTiming(currentTime);
            return;
          }

          const { isLineEnd } = actions.recordTiming(currentTime);

          if (currentIndex + 1 >= lyricsData.length) {
            alert("All timing complete!");
            player.pause();
            actions.stopTiming();
          } else if (isLineEnd) {
            // ไม่ต้องทำอะไรพิเศษเมื่อจบ line, ปล่อยให้ stopTiming ทำงานเอง
          } else {
            actions.goToNextWord();
          }
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    actions,
    isEditModalOpen,
    player,
    selectedLineIndex,
    lyricsData,
    isTimingActive,
    correctionIndex,
    currentIndex,
    onEditLine,
    editingLineIndex,
    playFromScrolledPosition,
    chordPanelCenterTick,
    isPlaying,
  ]);
};
