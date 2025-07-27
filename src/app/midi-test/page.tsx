"use client";
import MidiEditorComponent from "@/modules/midi-klyr-parser";
import React from "react";

interface MidiTestProps {}

const MidiTest: React.FC<MidiTestProps> = ({}) => {
  return (
    <>
      <MidiEditorComponent></MidiEditorComponent>
    </>
  );
};

export default MidiTest;
