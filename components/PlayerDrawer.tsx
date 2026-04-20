'use client'

import { useEffect, useState, useCallback } from 'react'
import { X, Search, Copy, Check, Users, RefreshCw } from 'lucide-react'

interface Player {
  player_name:  string
  matches:      number | null
  runs:         number | null
  batting_avg:  number | null
  batting_sr:   number | null
  hundreds:     number | null
  wickets:      number | null
  bowling_avg:  number | null
  economy:      number | null
  role:         string
}

interface PlayerDrawerProps {
  open:    boolean
  onClose: () => void
  /** Optional: clicking a player name triggers this (e.g., insert into query) */
  onSelect?: (name: string) => void
}

export default function PlayerDrawer({ open, onClose, onSelect }: PlayerDrawerProps) {
  const [players,  setPlayers]  = useState<Player[]>([])
  const [search,   setSearch]   = useState('')
  const [loading,  setLoading]  = useState(false)
  const [copied,   setCopied]   = useState<string | null>(null)
  const [warning,  setWarning]  = useState('')

  const fetchPlayers = useCallback(async (q: string) => {
    setLoading(true)
    try {
      const res  = await fetch(`/api/players?search=${encodeURIComponent(q)}&limit=300`)
      const data = await res.json()
      setPlayers(data.players ?? [])
      setWarning(data.warning ?? '')
    } catch {
      setWarning('Could not load players — is the server running?')
    } finally {
      setLoading(false)
    }
  }, [])

  // Initial load when drawer opens
  useEffect(() => {
    if (open && players.length === 0) fetchPlayers('')
  }, [open, players.length, fetchPlayers])

  // Debounced search
  useEffect(() => {
    const t = setTimeout(() => fetchPlayers(search), 280)
    return () => clearTimeout(t)
  }, [search, fetchPlayers])

  const handleCopy = (name: string) => {
    navigator.clipboard.writeText(name)
    setCopied(name)
    setTimeout(() => setCopied(null), 1600)
    onSelect?.(name)
  }

  const roleColor = (role: string) => {
    switch (role) {
      case 'Batter':      return 'bg-blue-50  text-blue-700  border-blue-200'
      case 'Bowler':      return 'bg-rose-50  text-rose-700  border-rose-200'
      case 'All-Rounder': return 'bg-purple-50 text-purple-700 border-purple-200'
      default:            return 'bg-slate-100 text-slate-500 border-slate-200'
    }
  }

  return (
    <>
      {/* Overlay */}
      <div
        className={`fixed inset-0 bg-black/30 backdrop-blur-sm z-40 transition-opacity duration-200
                    ${open ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
      />

      {/* Drawer */}
      <aside
        className={`
          fixed right-0 top-0 h-full w-80 bg-white shadow-2xl z-50
          flex flex-col transition-transform duration-250 ease-in-out
          ${open ? 'translate-x-0' : 'translate-x-full'}
        `}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Users size={18} className="text-emerald-600" />
            <div>
              <h2 className="text-sm font-black text-slate-900">Player Names</h2>
              <p className="text-[10px] text-slate-400">Click to copy exact spelling</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => fetchPlayers(search)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-slate-100 transition-colors"
              title="Refresh"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="px-4 py-3 border-b border-slate-100">
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
            <Search size={14} className="text-slate-400 shrink-0" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by name…"
              className="bg-transparent text-sm outline-none w-full placeholder:text-slate-400"
            />
          </div>
          <p className="text-[10px] text-slate-400 mt-1.5 px-1">
            {players.length} player{players.length !== 1 ? 's' : ''} shown
          </p>
        </div>

        {/* Warning */}
        {warning && (
          <div className="mx-4 mt-3 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-700">
            {warning}
          </div>
        )}

        {/* Player list */}
        <div className="flex-1 overflow-y-auto">
          {loading && players.length === 0 ? (
            <div className="flex items-center justify-center h-32">
              <div className="flex gap-1.5">
                <div className="typing-dot" />
                <div className="typing-dot" />
                <div className="typing-dot" />
              </div>
            </div>
          ) : (
            <ul className="divide-y divide-slate-50">
              {players.map(p => (
                <li key={p.player_name}>
                  <button
                    onClick={() => handleCopy(p.player_name)}
                    className="w-full text-left px-4 py-3 hover:bg-slate-50 transition-colors group"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-slate-800 truncate">
                            {p.player_name}
                          </span>
                          {copied === p.player_name
                            ? <Check size={12} className="text-emerald-600 shrink-0" />
                            : <Copy size={11} className="text-slate-300 group-hover:text-emerald-500 shrink-0 transition-colors" />
                          }
                        </div>

                        {/* Stats row */}
                        <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                          {p.matches && (
                            <span className="text-[10px] text-slate-400">
                              {p.matches} matches
                            </span>
                          )}
                          {p.batting_avg && (
                            <span className="text-[10px] text-blue-600 font-semibold">
                              Bat avg {p.batting_avg}
                            </span>
                          )}
                          {p.bowling_avg && (
                            <span className="text-[10px] text-rose-600 font-semibold">
                              Bowl avg {p.bowling_avg}
                            </span>
                          )}
                          {p.hundreds ? (
                            <span className="text-[10px] text-amber-600">{p.hundreds}×100s</span>
                          ) : null}
                          {p.wickets ? (
                            <span className="text-[10px] text-rose-500">{p.wickets} wkts</span>
                          ) : null}
                        </div>
                      </div>

                      {/* Role badge */}
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded-md border shrink-0 ${roleColor(p.role)}`}>
                        {p.role}
                      </span>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Footer tip */}
        <div className="px-4 py-3 border-t border-slate-100 bg-slate-50">
          <p className="text-[10px] text-slate-400 text-center">
            Exact spellings from Cricsheet · click to copy into query
          </p>
        </div>
      </aside>
    </>
  )
}
