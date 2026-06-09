import { useEffect } from 'react'
import { AlertCircle, CheckCircle, Info } from 'lucide-react'
import { useEditorStore } from '@/store/useEditorStore'

export default function Toast() {
  const toast = useEditorStore((s) => s.toast)
  const clearToast = useEditorStore((s) => s.clearToast)

  useEffect(() => {
    if (!toast) return
    const timer = setTimeout(() => {
      clearToast()
    }, 3000)
    return () => clearTimeout(timer)
  }, [toast, clearToast])

  if (!toast) return null

  const bgColor =
    toast.type === 'success'
      ? 'bg-emerald-900/90 border-emerald-600'
      : toast.type === 'error'
        ? 'bg-red-900/90 border-red-600'
        : 'bg-[#2d2d44]/95 border-[#3a3a55]'

  const Icon =
    toast.type === 'success'
      ? CheckCircle
      : toast.type === 'error'
        ? AlertCircle
        : Info
  const iconColor =
    toast.type === 'success'
      ? 'text-emerald-400'
      : toast.type === 'error'
        ? 'text-red-400'
        : 'text-[#00f0ff]'

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[1000]">
      <div
        className={`flex items-center gap-2 px-4 py-2.5 rounded-md border backdrop-blur-sm shadow-xl ${bgColor}`}
      >
        <Icon size={16} className={iconColor} />
        <span className="text-xs text-gray-200 font-medium">{toast.message}</span>
      </div>
    </div>
  )
}
