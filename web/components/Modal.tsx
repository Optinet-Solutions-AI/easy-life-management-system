'use client'

import { X } from 'lucide-react'
import { useEffect } from 'react'

interface ModalProps {
  title: string
  onClose: () => void
  children: React.ReactNode
}

export default function Modal({ title, onClose, children }: ModalProps) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-black/40">
      {/* Full-screen sheet on mobile, centered dialog on sm+ */}
      <div className="bg-white w-full sm:rounded-xl shadow-2xl sm:max-w-2xl max-h-[92dvh] sm:max-h-[90vh] overflow-y-auto rounded-t-2xl">
        <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-slate-200 sticky top-0 bg-white z-10">
          <h2 className="text-base sm:text-lg font-semibold text-slate-900">{title}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 p-1">
            <X size={20} />
          </button>
        </div>
        <div className="px-4 sm:px-6 py-5">{children}</div>
      </div>
    </div>
  )
}
