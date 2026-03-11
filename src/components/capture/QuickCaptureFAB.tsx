// src/components/capture/QuickCaptureFAB.tsx
import { useState, useRef, useEffect } from 'react'

interface Props {
  onCapture: (title: string, madeTo: string | null, dueDate: string | null) => Promise<string | null>
  showMadeTo?: boolean
  placeholder?: string
  inline?: boolean
}

export default function QuickCaptureFAB({ onCapture, showMadeTo, placeholder = 'Add a task', inline }: Props) {
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [madeTo, setMadeTo] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [showDate, setShowDate] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const titleRef = useRef<HTMLInputElement>(null)
  const savedTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (open) {
      setTimeout(() => titleRef.current?.focus(), 50)
    } else {
      setTitle('')
      setMadeTo('')
      setDueDate('')
      setShowDate(false)
      setError(null)
    }
  }, [open])

  useEffect(() => {
    return () => { if (savedTimer.current) clearTimeout(savedTimer.current) }
  }, [])

  async function handleSave() {
    if (!title.trim()) return
    setSaving(true)
    setError(null)
    const err = await onCapture(title.trim(), madeTo.trim() || null, dueDate || null)
    setSaving(false)
    if (err) {
      setError(err)
      return
    }
    setTitle('')
    setMadeTo('')
    setDueDate('')
    setShowDate(false)
    setSaved(true)
    if (savedTimer.current) clearTimeout(savedTimer.current)
    savedTimer.current = setTimeout(() => {
      setSaved(false)
      setOpen(false)
    }, 1200)
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') handleSave()
    if (e.key === 'Escape') setOpen(false)
  }

  return (
    <>
      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Sheet */}
      {open && (
        <div className="fixed bottom-[200px] md:bottom-20 right-4 z-[70] w-80 rounded-2xl bg-background border border-border shadow-xl p-4 space-y-3">
          {saved ? (
            <p className="text-sm text-center text-muted-foreground py-2">Saved ✓</p>
          ) : (
            <>
              <input
                ref={titleRef}
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={placeholder}
                className="w-full px-3 py-2 rounded-lg bg-secondary border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring text-sm"
              />
              {showMadeTo && (
                <input
                  type="text"
                  value={madeTo}
                  onChange={e => setMadeTo(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="To whom? (makes it a promise)"
                  className="w-full px-3 py-2 rounded-lg bg-secondary border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring text-sm"
                />
              )}
              {showDate ? (
                <input
                  type="date"
                  value={dueDate}
                  onChange={e => setDueDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-secondary border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-ring text-sm"
                />
              ) : (
                <button
                  onClick={() => setShowDate(true)}
                  className="text-xs text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  + add date
                </button>
              )}
              {error && <p className="text-xs text-destructive">{error}</p>}
              <button
                onClick={handleSave}
                disabled={saving || !title.trim()}
                className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground font-semibold text-sm disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer motion-safe:active:scale-95 motion-safe:transition-transform"
              >
                {saving ? 'Saving…' : 'Save'}
              </button>
            </>
          )}
        </div>
      )}

      {/* Trigger button */}
      {inline ? (
        <button
          onClick={() => setOpen(o => !o)}
          className="w-9 h-9 rounded-full bg-secondary border border-border flex items-center justify-center text-xl font-light text-muted-foreground hover:text-foreground hover:border-primary cursor-pointer transition-colors shrink-0"
          aria-label="Quick capture"
        >
          {open ? '×' : '+'}
        </button>
      ) : (
        <button
          onClick={() => setOpen(o => !o)}
          className="fixed bottom-[120px] md:bottom-6 right-4 z-[70] w-12 h-12 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center text-2xl font-light cursor-pointer motion-safe:active:scale-95 motion-safe:transition-transform"
          aria-label="Quick capture"
        >
          {open ? '×' : '+'}
        </button>
      )}
    </>
  )
}
