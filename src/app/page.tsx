"use client";
import NavBar from "@/components/navbar";
import React from "react";
import ButtonCommon from "@/components/common/button";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();

  // Redirect to the project list modal via the navbar component,
  // or handle project selection here.
  // For simplicity, we'll just show a welcome message.

  return (
    <div className="relative h-screen">
      <div className="top-0 w-full bg-gradient-to-r from-violet-500 to-purple-500 z-50">
        <NavBar></NavBar>
      </div>
      <div className="flex-grow flex items-center justify-center bg-gray-100 h-full">
        <div className="text-center text-gray-500">
          <h2 className="text-2xl font-semibold mb-2">
            Welcome to Lyrics Editor
          </h2>
          <p>Please open a project or create a new one to get started.</p>
        </div>
      </div>
    </div>
  );
}
