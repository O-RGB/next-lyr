"use client";
import NavBar from "@/components/navbar";
import LyrEditerPanel from "@/components/ui";
import React from "react";

export default function Home() {
  return (
    <div className="relative h-screen">
      <div className="top-0 w-full bg-gradient-to-r from-violet-500 to-purple-500 z-50">
        <NavBar></NavBar>
      </div>

      <LyrEditerPanel></LyrEditerPanel>
    </div>
  );
}
