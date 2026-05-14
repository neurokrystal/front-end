import * as React from "react"
import { cn } from "@/lib/utils"

export interface SeparatorProps extends React.HTMLAttributes<HTMLHRElement> {
  orientation?: 'horizontal' | 'vertical'
}

export function Separator({ className, orientation = 'horizontal', ...props }: SeparatorProps) {
  return (
    <hr
      aria-orientation={orientation}
      className={cn(
        orientation === 'vertical' ? 'h-full w-px shrink-0 bg-slate-200' : 'w-full h-px bg-slate-200',
        className
      )}
      {...props}
    />
  )
}
