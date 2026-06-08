import { useState } from 'react'
import { ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

interface FoldSectionProps {
  title: string
  defaultOpen?: boolean
  children: React.ReactNode
}

export default function FoldSection({ title, defaultOpen = false, children }: FoldSectionProps) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div className="rounded bg-[#2d2d44] overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          'flex items-center gap-1.5 w-full px-2 py-1.5 text-xs font-medium',
          'text-[#e0e0e0] hover:text-[#00f0ff] transition-colors',
        )}
      >
        <ChevronRight
          size={12}
          className={cn('transition-transform', open && 'rotate-90')}
        />
        <span>{title}</span>
      </button>
      <div
        className={cn(
          'overflow-hidden transition-[max-height] duration-200 ease-in-out',
        )}
        style={{
          maxHeight: open ? 2000 : 0,
        }}
      >
        <div className="px-2 pb-2 flex flex-col gap-2">{children}</div>
      </div>
    </div>
  )
}
