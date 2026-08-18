"use client";

import React from "react";

import MidiNotesPreview from "@/components/panel/midi-notes-preview";

type ChordOverviewPreviewProps = {
  compact?: boolean;
};

/**
 * The Chords page uses the same MIDI canvas as the editor. `overview` only
 * changes the renderer's density and viewport; it does not create a second
 * note renderer with different measurements or colours.
 */
const ChordOverviewPreview: React.FC<ChordOverviewPreviewProps> = () => (
  <MidiNotesPreview overview onClose={() => undefined} />
);

export default React.memo(ChordOverviewPreview);
