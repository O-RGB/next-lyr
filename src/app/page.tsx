"use client";
import NavBar from "@/components/navbar";
import LyrEditerPanel from "@/pages/update/pages";
import React from "react";

export default function Home() {
  return (
    <div className="pt-2 pb-2 lg:pb-0 relative h-screen">
      <div className="fixed top-0 w-full bg-gradient-to-r from-violet-500 to-purple-500 z-50">
        <NavBar></NavBar>
      </div>
      <div className="py-2 pt-8 h-full overflow-auto">
        <LyrEditerPanel></LyrEditerPanel>
      </div>
    </div>
  );
}
