"use client";

import React from "react";

export function RootProvider({ children }: { children: React.ReactNode }) {
  return (
    <>
      {/* Add your providers here (Context, Theme, etc.) */}
      {children}
    </>
  );
}