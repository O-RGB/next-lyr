"use client";
import NavBar from "@/components/navbar";
import HomePage from "@/pages/home";
import React from "react";

export default function Home() {
  return (
    <>
      <div className="fixed w-full bg-gradient-to-r from-violet-500 to-purple-500 z-50">
        <NavBar></NavBar>
      </div>
      <div className="py-10 h-screen">
        <HomePage></HomePage>
      </div>
      <div className="hidden lg:block fixed bottom-0 w-full bg-gradient-to-r from-violet-500 to-purple-500 z-50 px-4">
        <span className="text-white text-xs">
          {"Space Bar คน/หยุด ลูกศร เดือนตำแหน่งเนื้อร้อง"}
        </span>
      </div>
    </>
  );
}
