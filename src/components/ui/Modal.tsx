import { useCallback, useEffect } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
}

export default function Modal({ open, onClose, title, children }: ModalProps) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    },
    [onClose],
  )

  useEffect(() => {
    if (open) {
      document.addEventListener('keydown', handleKeyDown)
      return () => document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open, handleKeyDown])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onClick={onClose}
    >
      <div
        className={cn(
          'relative w-full max-w-md rounded bg-[#2d2d44] border-t-2 border-[#00f0ff]',
          'shadow-lg shadow-[#00f0ff]/10',
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#2d2d44]">
          <h2 className="text-sm font-medium text-[#e0e0e0]">{title}</h2>
          <button
            onClick={onClose}
            className="flex items-center justify-center w-6 h-6 rounded text-[#e0e0e0]/60 hover:text-[#00f0ff] transition-colors"
          >
            <X size={14} />
          </button>
        </div>
        <div className="px-4 py-3">{children}</div>
      </div>
    </div>
  )
}
