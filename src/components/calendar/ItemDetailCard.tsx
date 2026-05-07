// src/components/calendar/ItemDetailCard.tsx
import { useState, useEffect } from 'react'
import { X } from 'lucide-react'

interface Item {
  kind: 'task' | 'promise'
  id: string
  title: string
  madeTo: string | null
  dueDate: string | null
}

interface Changes {
  title?: string
  due_date?: string | null
  made_to?: string | null
}

interface Props {
  item: Item
  onSave: (changes: Changes) => Promise<string | null>
  onComplete: () => void
  onClose: () => void
}

export default function ItemDetailCard({ item, onSave, onComplete, onClose }: Props) {
  const [title, setTitle] = useState(item.title)
  const [dueDate, setDueDate] = useState(item.dueDate ?? '')
  const [madeTo, setMadeTo] = useState(item.madeTo ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
    }
  }, [onClose])

  async function handleSave() {
    setSaving(true)
    setError(null)
    const changes: Changes = {}
    if (title !== item.title) changes.title = title
    if (dueDate !== (item.dueDate ?? '')) changes.due_date = dueDate || null
    if (item.kind === 'promise' && madeTo !== (item.madeTo ?? '')) changes.made_to = madeTo || null
    const err = await onSave(changes)
    setSaving(false)
    if (err) setError(err)
    else onClose()
  }

  return (
    <>
      <div
        className="fixed inset-0 bg-black/50 z-40"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Edit item"
        className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t border-border rounded-t-2xl p-6 space-y-4 max-h-[85dvh] overflow-y-auto md:bottom-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-full md:max-w-md md:rounded-2xl md:border md:max-h-[85vh]"
        style={{ paddingBottom: 'max(1.5rem, calc(env(safe-area-inset-bottom, 0px) + 1rem))' }}
      >
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-base">Edit item</h3>
          <button
            onClick={onClose}
            aria-label="Close"
            className="text-muted-foreground hover:text-foreground cursor-pointer min-h-[44px] min-w-[44px] -mr-2 flex items-center justify-center transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <input
          type="text"
          value={title}
          onChange={e => setTitle(e.target.value)}
          className="w-full px-3 py-3 rounded-lg bg-secondary border border-border text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          placeholder="Title"
        />
        <input
          type="date"
          value={dueDate}
          onChange={e => setDueDate(e.target.value)}
          className="w-full px-3 py-3 rounded-lg bg-secondary border border-border text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
        {item.kind === 'promise' && (
          <input
            type="text"
            value={madeTo}
            onChange={e => setMadeTo(e.target.value)}
            className="w-full px-3 py-3 rounded-lg bg-secondary border border-border text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            placeholder="To whom?"
          />
        )}
        {error && <p className="text-sm text-destructive">{error}</p>}
        <div className="flex gap-2 pt-2">
          <button
            onClick={() => { onComplete(); onClose() }}
            className="flex-1 py-3 rounded-lg bg-secondary border border-border text-sm font-medium cursor-pointer hover:bg-secondary/70 transition-colors"
          >
            Mark done
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !title.trim()}
            className="flex-1 py-3 rounded-lg bg-primary text-primary-foreground text-sm font-semibold cursor-pointer disabled:opacity-40 hover:bg-primary/90 transition-colors"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </>
  )
}
