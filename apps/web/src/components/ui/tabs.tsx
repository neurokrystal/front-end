"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

type TabsContextType = {
  value: string | undefined
  setValue: (v: string) => void
}

const TabsContext = React.createContext<TabsContextType | null>(null)

export interface TabsProps {
  value?: string
  defaultValue?: string
  onValueChange?: (value: string) => void
  className?: string
  children: React.ReactNode
}

export function Tabs({ value, defaultValue, onValueChange, className, children }: TabsProps) {
  const [internal, setInternal] = React.useState<string | undefined>(defaultValue)
  const current = value !== undefined ? value : internal

  const setValue = React.useCallback((v: string) => {
    onValueChange?.(v)
    setInternal(v)
  }, [onValueChange])

  return (
    <TabsContext.Provider value={{ value: current, setValue }}>
      <div className={cn("w-full", className)}>
        {children}
      </div>
    </TabsContext.Provider>
  )
}

export interface TabsListProps extends React.HTMLAttributes<HTMLDivElement> {}
export const TabsList = React.forwardRef<HTMLDivElement, TabsListProps>(
  ({ className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        role="tablist"
        className={cn(
          "inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white p-1 shadow-sm",
          className
        )}
        {...props}
      />
    )
  }
)
TabsList.displayName = "TabsList"

export interface TabsTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  value: string
}

export const TabsTrigger = React.forwardRef<HTMLButtonElement, TabsTriggerProps>(
  ({ className, value, onClick, ...props }, ref) => {
    const ctx = React.useContext(TabsContext)
    const selected = ctx?.value === value

    const handleClick = (e: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
      onClick?.(e)
      ctx?.setValue(value)
    }

    return (
      <button
        type="button"
        role="tab"
        aria-selected={selected}
        data-state={selected ? "active" : "inactive"}
        ref={ref}
        className={cn(
          "px-3 py-1.5 text-sm rounded-md transition-colors",
          selected
            ? "bg-[#4A90D9] text-white shadow"
            : "bg-transparent text-slate-700 hover:bg-slate-100",
          className
        )}
        onClick={handleClick}
        {...props}
      />)
  }
)
TabsTrigger.displayName = "TabsTrigger"

export { }
