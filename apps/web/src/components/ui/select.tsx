"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

type SelectContextType = {
  value?: string
  placeholder?: string
  onValueChange?: (v: string) => void
  open: boolean
  setOpen: (o: boolean) => void
}

const SelectContext = React.createContext<SelectContextType | null>(null)

export interface SelectProps {
  value?: string
  defaultValue?: string
  placeholder?: string
  onValueChange?: (v: string) => void
  children: React.ReactNode
  className?: string
}

export function Select({ value, defaultValue, placeholder, onValueChange, children, className }: SelectProps) {
  const [internalValue, setInternalValue] = React.useState<string | undefined>(defaultValue)
  const [open, setOpen] = React.useState(false)

  const current = value !== undefined ? value : internalValue

  const ctx: SelectContextType = {
    value: current,
    placeholder,
    onValueChange: (v: string) => {
      if (onValueChange) onValueChange(v)
      setInternalValue(v)
      setOpen(false)
    },
    open,
    setOpen,
  }

  return (
    <SelectContext.Provider value={ctx}>
      <div className={cn("relative inline-block", className)}>{children}</div>
    </SelectContext.Provider>
  )
}

export interface SelectTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {}
export function SelectTrigger({ className, children, ...props }: SelectTriggerProps) {
  const ctx = React.useContext(SelectContext)!
  return (
    <button
      type="button"
      aria-haspopup="listbox"
      aria-expanded={ctx.open}
      onClick={() => ctx.setOpen(!ctx.open)}
      className={cn(
        // Light admin theme trigger
        "flex w-full items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
        className
      )}
      {...props}
    >
      <span className="truncate flex-1 text-left">
        {children ?? <SelectValue />}
      </span>
      <svg className="ml-2 size-4 opacity-70" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
        <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z" clipRule="evenodd" />
      </svg>
    </button>
  )
}

export interface SelectValueProps {
  placeholder?: string
  className?: string
}
export function SelectValue({ placeholder, className }: SelectValueProps) {
  const ctx = React.useContext(SelectContext)!
  const text = ctx.value ?? placeholder ?? ctx.placeholder ?? "Select..."
  return <span className={cn("text-slate-700", className)}>{text}</span>
}

export interface SelectContentProps extends React.HTMLAttributes<HTMLDivElement> {}
export function SelectContent({ className, children, ...props }: SelectContentProps) {
  const ctx = React.useContext(SelectContext)!
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") ctx.setOpen(false)
    }
    if (ctx.open) document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [ctx])

  if (!ctx.open) return null
  return (
    <div
      role="listbox"
      className={cn(
        // Light admin theme dropdown menu
        "absolute z-50 mt-1 w-full overflow-hidden rounded-lg border border-slate-200 bg-white py-1 shadow-lg",
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

export interface SelectItemProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  value: string
}
export function SelectItem({ value, className, children, onClick, ...props }: SelectItemProps) {
  const ctx = React.useContext(SelectContext)!
  const selected = ctx.value === value
  return (
    <button
      role="option"
      aria-selected={selected}
      onClick={(e) => {
        ctx.onValueChange?.(value)
        onClick?.(e)
      }}
      className={cn(
        // Light admin theme option
        "w-full select-none text-left px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 cursor-pointer",
        selected && "bg-blue-50 text-blue-700 font-medium",
        className
      )}
      {...props}
    >
      {children}
    </button>
  )
}
