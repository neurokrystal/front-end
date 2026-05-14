"use client"

import * as React from "react"
import * as ReactDOM from "react-dom"
import { cn } from "@/lib/utils"

type DialogContextType = {
  open: boolean
  setOpen: (o: boolean) => void
}

const DialogContext = React.createContext<DialogContextType | null>(null)

export interface DialogProps {
  open?: boolean
  defaultOpen?: boolean
  onOpenChange?: (open: boolean) => void
  children: React.ReactNode
}

export function Dialog({ open, defaultOpen, onOpenChange, children }: DialogProps) {
  const [internal, setInternal] = React.useState(!!defaultOpen)
  const isOpen = open !== undefined ? open : internal
  const setOpen = (o: boolean) => {
    onOpenChange?.(o)
    setInternal(o)
  }

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false)
    }
    if (isOpen) document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [isOpen])

  return (
    <DialogContext.Provider value={{ open: isOpen, setOpen }}>
      {children}
    </DialogContext.Provider>
  )
}

export interface DialogTriggerProps {
  asChild?: boolean
  children: React.ReactElement
}
export function DialogTrigger({ asChild, children }: DialogTriggerProps) {
  const ctx = React.useContext(DialogContext)!
  const props = {
    onClick: (e: any) => {
      children.props.onClick?.(e)
      ctx.setOpen(true)
    }
  }
  return asChild ? React.cloneElement(children, props) : (
    <button type="button" {...props}>{children}</button>
  )
}

function Portal({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = React.useState(false)
  const [el] = React.useState(() => {
    if (typeof document === 'undefined') return null as any
    const div = document.createElement('div')
    div.setAttribute('id', 'dialog-portal')
    return div
  })

  React.useEffect(() => {
    if (!el || typeof document === 'undefined') return
    document.body.appendChild(el)
    setMounted(true)
    return () => {
      document.body.removeChild(el)
    }
  }, [el])

  if (!mounted || !el) return null
  return ReactDOM.createPortal(children, el)
}

export interface DialogContentProps extends React.HTMLAttributes<HTMLDivElement> {}
export function DialogContent({ className, children, ...props }: DialogContentProps) {
  const ctx = React.useContext(DialogContext)!
  if (!ctx.open) return null
  return (
    <Portal>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center"
        aria-modal="true"
        role="dialog"
      >
        <div className="fixed inset-0 bg-black/50" onClick={() => ctx.setOpen(false)} />
        <div
          className={cn(
            // Light admin theme modal container
            "relative z-10 w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl",
            className
          )}
          {...props}
        >
          {children}
        </div>
      </div>
    </Portal>
  )
}

export function DialogHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("mb-4", className)} {...props} />
}

export function DialogTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={cn("text-lg font-semibold text-slate-900 mb-4", className)} {...props} />
}

export function DialogFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("mt-6 flex items-center justify-end gap-2", className)} {...props} />
}
