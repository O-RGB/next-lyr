"use client";

import React, { useEffect, useRef, useState } from "react";
import MidiPlayer, { MidiPlayerRef } from "./update/modules/js-synth";
import Home from "./update/pages";
interface HomePageProps {}

const HomePage: React.FC<HomePageProps> = ({}) => {
  return (
    <div>
      {/* <h1>My MIDI Controller</h1>
      <MidiPlayer ref={playerRef} />

      <div className="controls mt-4">
        <button onClick={playFile}>Play</button>
        <button onClick={() => playerRef.current?.pause()}>Pause</button>
        <button onClick={() => playerRef.current?.stop()}>Stop</button>
        <button onClick={seekTo5000}>Seek to Tick 5000</button>
        <button onClick={getInfo}>Get Current Info</button>
      </div> */}

      <Home></Home>
    </div>
  );
};

export default HomePage;
