"use client"

import React from "react"
import { toast as sonnerToast } from "sonner"
import { CheckCircle2, Info, AlertTriangle, XCircle, X } from "lucide-react"

export type ToastType = "default" | "success" | "info" | "warning" | "error"

export interface AddToastOptions {
  type?: ToastType
  description?: React.ReactNode
  title?: React.ReactNode
  priority?: "low" | "normal" | "high"
  action?: React.ReactNode
  duration?: number
  variant?: "default" | "destructive"
}

function getIconForType(type?: ToastType) {
  switch (type) {
    case "success":
      return React.createElement(CheckCircle2, { size: 16, style: { color: "#10b981", flexShrink: 0 } })
    case "info":
      return React.createElement(Info, { size: 16, style: { color: "#38bdf8", flexShrink: 0 } })
    case "warning":
      return React.createElement(AlertTriangle, { size: 16, style: { color: "#f59e0b", flexShrink: 0 } })
    case "error":
      return React.createElement(XCircle, { size: 16, style: { color: "#f43f5e", flexShrink: 0 } })
    default:
      return React.createElement(Info, { size: 16, style: { color: "var(--text-tertiary, #94a3b8)", flexShrink: 0 } })
  }
}

function CustomToastItem({
  id,
  message,
  type,
}: {
  id: string | number
  message: React.ReactNode
  type: ToastType
}) {
  const icon = getIconForType(type)
  const closeIcon = React.createElement(X, { size: 14 })

  return React.createElement(
    "div",
    {
      style: {
        width: "100%",
        maxWidth: "380px",
        minWidth: "280px",
        background: "var(--bg-card, #18181b)",
        border: "1px solid var(--border-subtle, rgba(255, 255, 255, 0.12))",
        borderRadius: "16px",
        padding: "12px 16px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "12px",
        boxShadow: "0 10px 30px rgba(0, 0, 0, 0.4)",
        color: "var(--text-primary, #f4f4f5)",
        fontFamily: "var(--font-body, system-ui, sans-serif)",
        fontSize: "0.88rem",
        fontWeight: 500,
      },
    },
    React.createElement(
      "div",
      { style: { display: "flex", alignItems: "center", gap: "10px", flex: 1, minWidth: 0 } },
      icon,
      React.createElement(
        "span",
        { style: { flex: 1, wordBreak: "break-word", lineHeight: 1.4 } },
        message
      )
    ),
    React.createElement(
      "button",
      {
        type: "button",
        onClick: () => sonnerToast.dismiss(id),
        style: {
          background: "none",
          border: "none",
          padding: "2px",
          color: "var(--text-tertiary, #a1a1aa)",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          opacity: 0.7,
          transition: "opacity 0.2s ease",
          flexShrink: 0,
        },
        "aria-label": "Close notification",
      },
      closeIcon
    )
  )
}

function triggerToast(opts: AddToastOptions | React.ReactNode) {
  let message: React.ReactNode = ""
  let type: ToastType = "default"
  let duration = 4500

  if (typeof opts === "string" || React.isValidElement(opts)) {
    message = opts
  } else if (opts instanceof Error) {
    message = opts.message && opts.message !== '[object Object]' ? opts.message : 'Please enter correct email format'
    type = 'error'
  } else {
    const options = (opts || {}) as any
    type = options.type || (options.variant === "destructive" ? "error" : "default")
    message = options.description || options.title || options.message || options.detail || ""
    if (typeof message === 'object' && !React.isValidElement(message)) {
      try {
        message = JSON.stringify(message)
      } catch {
        message = 'Please enter correct email format'
      }
    }
    if (options.duration) duration = options.duration
  }

  if (typeof message === 'string' && (message === '[object Object]' || message.includes('[object Object]'))) {
    message = 'Please enter correct email format'
  }

  return sonnerToast.custom(
    (t) => React.createElement(CustomToastItem, { id: t, message, type }),
    { duration }
  )
}

const toastObject = Object.assign(
  function (opts: AddToastOptions | React.ReactNode) {
    return triggerToast(opts)
  },
  {
    add: function (options: AddToastOptions) {
      return triggerToast(options)
    },
    success: function (description: React.ReactNode, title?: React.ReactNode) {
      return triggerToast({ type: "success", description, title })
    },
    error: function (description: React.ReactNode, title?: React.ReactNode) {
      return triggerToast({ type: "error", description, title, variant: "destructive" })
    },
    danger: function (description: React.ReactNode, title?: React.ReactNode) {
      return triggerToast({ type: "error", description, title, variant: "destructive" })
    },
    warning: function (description: React.ReactNode, title?: React.ReactNode) {
      return triggerToast({ type: "warning", description, title })
    },
    info: function (description: React.ReactNode, title?: React.ReactNode) {
      return triggerToast({ type: "info", description, title })
    },
    dismiss: function (id?: string | number) {
      return sonnerToast.dismiss(id)
    },
  }
)

export function useToast() {
  return {
    toast: toastObject,
    dismiss: (id?: string | number) => sonnerToast.dismiss(id),
  }
}

export { toastObject as toast }
