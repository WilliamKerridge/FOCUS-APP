import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { User } from '@supabase/supabase-js'
import SessionPanel from '@/components/focus/SessionPanel'
import TaskList from '@/components/tasks/TaskList'

interface Props {
  user: User
}

export default function HomeMode({ user }: Props) {
  const [capture, setCapture] = useState('')
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)

  async function handleCapture(e: React.FormEvent) {
    e.preventDefault()
    if (!capture.trim()) return
    setSaving(true)
    try {
      await supabase.from('tasks').insert({
        user_id: user.id,
        title: capture.trim(),
        context: 'home',
        source: 'quick_capture',
      })
      setCapture('')
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold">Home</h2>
        <p className="text-sm text-muted-foreground mt-1">You're in home mode. Focus on what matters here.</p>
      </div>

      <form onSubmit={handleCapture} className="space-y-3">
        <label className="text-xs text-muted-foreground uppercase tracking-wider font-medium block">
          Quick capture
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={capture}
            onChange={e => setCapture(e.target.value)}
            placeholder="Something to remember…"
            className="flex-1 px-4 py-3 rounded-lg bg-secondary border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <button
            type="submit"
            disabled={saving || !capture.trim()}
            className="px-4 py-3 rounded-lg bg-primary text-primary-foreground font-medium disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer motion-safe:active:scale-95 motion-safe:transition-transform"
          >
            {saved ? '✓' : 'Save'}
          </button>
        </div>
      </form>

      <TaskList user={user} contexts={['home']} title="Home tasks" />

      <div className="pt-4 border-t border-border mt-4">
        <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium mb-3">Focus session</p>
        <SessionPanel user={user} />
      </div>
    </div>
  )
}
