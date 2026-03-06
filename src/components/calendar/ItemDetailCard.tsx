// src/components/calendar/ItemDetailCard.tsx
import { useState } from 'react'

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
      <div className="fixed inset-0 bg-black/40 z-40" onClick={onClose} />
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t border-border rounded-t-2xl p-6 space-y-4 md:bottom-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-full md:max-w-md md:rounded-2xl md:border">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">Edit item</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground cursor-pointer text-lg">✕</button>
        </div>
        <input type="text" value={title} onChange={e => setTitle(e.target.value)}
          className="w-full px-3 py-2 rounded-lg bg-secondary border border-border text-sm focus:outline-none focus:ring-2 focus:ring-ring" placeholder="Title" />
        <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)}
          className="w-full px-3 py-2 rounded-lg bg-secondary border border-border text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
        {item.kind === 'promise' && (
          <input type="text" value={madeTo} onChange={e => setMadeTo(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-secondary border border-border text-sm focus:outline-none focus:ring-2 focus:ring-ring" placeholder="To whom?" />
        )}
        {error && <p className="text-sm text-destructive">{error}</p>}
        <div className="flex gap-2">
          <button onClick={() => { onComplete(); onClose() }}
            className="flex-1 py-2 rounded-lg bg-secondary border border-border text-sm font-medium cursor-pointer">
            Mark done
          </button>
          <button onClick={handleSave} disabled={saving || !title.trim()}
            className="flex-1 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold cursor-pointer disabled:opacity-40">
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </>
  )
}
