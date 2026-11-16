"use client"

import { useTheme } from "next-themes"
import { Toaster as Sonner, type ToasterProps } from "sonner"
import { TOASTER_SELECTOR, TOAST_DURATION_MS } from "@/lib/constants/toast"
import { useEffect } from "react"
import { IconCircleCheck, IconInfoCircle, IconAlertTriangle, IconAlertOctagon, IconLoader } from "@tabler/icons-react"
import { useTranslation } from "react-i18next"

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()
  const { t } = useTranslation("common")

  useEffect(() => {
    const toasterOf = (target: EventTarget | null) =>
      target instanceof Element ? target.closest(TOASTER_SELECTOR) : null
    const pauseToastTimers = (event: FocusEvent) => {
      toasterOf(event.target)?.dispatchEvent(
        new MouseEvent("mouseover", { bubbles: true })
      )
    }
    const resumeToastTimers = (event: FocusEvent) => {
      const toaster = toasterOf(event.target)
      if (!toaster) return
      if (event.relatedTarget instanceof Node && toaster.contains(event.relatedTarget)) return
      toaster.dispatchEvent(new MouseEvent("mouseout", { bubbles: true }))
    }
    document.addEventListener("focusin", pauseToastTimers)
    document.addEventListener("focusout", resumeToastTimers)
    return () => {
      document.removeEventListener("focusin", pauseToastTimers)
      document.removeEventListener("focusout", resumeToastTimers)
    }
  }, [])

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster app-toaster group"
      richColors
      closeButton
      containerAriaLabel={t("a11y.notifications")}
      duration={TOAST_DURATION_MS}
      icons={{
        success: (
          <IconCircleCheck className="size-4" />
        ),
        info: (
          <IconInfoCircle className="size-4" />
        ),
        warning: (
          <IconAlertTriangle className="size-4" />
        ),
        error: (
          <IconAlertOctagon className="size-4" />
        ),
        loading: (
          <IconLoader className="size-4 animate-spin" />
        ),
      }}
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
          "--border-radius": "var(--radius)",
          "--success-bg": "var(--toast-success-bg)",
          "--success-border": "var(--toast-success-border)",
          "--success-text": "var(--toast-success-text)",
          "--info-bg": "var(--toast-info-bg)",
          "--info-border": "var(--toast-info-border)",
          "--info-text": "var(--toast-info-text)",
          "--warning-bg": "var(--toast-warning-bg)",
          "--warning-border": "var(--toast-warning-border)",
          "--warning-text": "var(--toast-warning-text)",
          "--error-bg": "var(--toast-error-bg)",
          "--error-border": "var(--toast-error-border)",
          "--error-text": "var(--toast-error-text)",
        } as React.CSSProperties
      }
      toastOptions={{
        classNames: {
          toast: "cn-toast",
        },
        closeButtonAriaLabel: t("a11y.closeNotification"),
      }}
      {...props}
    />
  )
}

export { Toaster }
