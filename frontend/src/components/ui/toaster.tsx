"use client"

import React from "react"
import { Toaster as SonnerToaster } from "sonner"

export function Toaster() {
  return (
    <SonnerToaster
      position="top-right"
      visibleToasts={5}
      expand={false}
      toastOptions={{
        style: {
          background: "transparent",
          border: "none",
          padding: 0,
          boxShadow: "none",
        },
      }}
    />
  )
}
