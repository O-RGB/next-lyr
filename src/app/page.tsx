"use client";
import NavBar from "@/components/navbar";
import React from "react";
import { deleteAllProjects } from "@/lib/database/db";

export default function Home() {
  const handleReset = () => {
    const is = confirm(
      "All data will be reset. Please refresh the page after resetting."
    );
    if (is) deleteAllProjects();
  };

  return (
    <div className="relative h-screen">
      <div className="top-0 w-full bg-gradient-to-r from-violet-500 to-purple-500 z-50">
        <NavBar />
      </div>
      <div className="flex-grow flex items-center justify-center bg-gray-100 h-full">
        <div className="text-center text-gray-500">
          <h2 className="text-2xl font-semibold mb-2">
            Welcome to Lyrics Editor
          </h2>
          <p>Please open a project or create a new one to get started.</p>

          <div className="mt-6">
            <p className="text-sm text-gray-400 italic mb-3">
              If the application is not working properly, please reset your data
              before continuing.
            </p>
            <button
              onClick={handleReset}
              className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white text-sm font-medium rounded-lg shadow transition-all duration-200"
            >
              Reset Data
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
