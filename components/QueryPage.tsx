'use client'

import { useState, useRef, FormEvent } from 'react'
import {
  Sparkles, MessageSquare, ChevronDown, ChevronUp,
  AlertTriangle, Clock, Database, Users, Lightbulb, RotateCcw
} from 'lucide-react'
import ResultsTable from './ResultsTable'
import PlayerDrawer from './PlayerDrawer'

// ── Types ─────────────────────────────────────────────────────────────────────

interface QueryResult {
  question:    string
  sql:         string
  columns:     string[]
  results:     Record<string, unknown>[]
  rowCount:    number
  explanation: string
  ms:          number
}

interface DbStatus {
  ok:            boolean
  matchCount:    number
  deliveryCount: number
  playerCount:   number
  error?:        string
}

// ── Suggested queries ─────────────────────────────────────────────────────────

const SUGGESTIONS = [
  'Top 10 Test run scorers of all time',
  'India batters ranked last 2 years',
  'Best bowling averages with 100+ wickets',
  'England vs Australia top performers',
  'Top wicket takers in 2024',
  'Batters with average over 50 in last 5 years',
  'Most centuries ever scored in Tests',
  'Best economy rates (min 50 wickets)',
]

// ── Component ─────────────────────────────────────────────────────────────────

interface QueryPageProps {
  dbStatus: DbStatus | null
}

export default function QueryPage({ dbStatus }: QueryPageProps) {
  const [query,          setQuery]          = useState('')
  const [result,         setResult]         = useState<QueryResult | null>(null)
  const [loading,        setLoading]        = useState(false)
  const [error,          setError]          = useState<string | null>(null)
  const [showSQL,        setShowSQL]        = useState(false)
  const [drawerOpen,     setDrawerOpen]     = useState(false)
  const [history,        setHistory]        = useState<string[]>([])
  const inputRef = useRef<HTMLInputElement>(null)

  // ── Submit ──────────────────────────────────────────────────────────────────
  const submit = async (question: string) => {
    if (!question.trim() || loading) return
    setQuery(question)
    setLoading(true)
    setError(null)
    setResult(null)
    setShowSQL(false)

    try {
      const res  = await fetch('/api/query', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ question }),
      })
      const data = await res.json()

      if (data.error) {
        setError(data.error)
        if (data.generatedSQL) {
          setResult({ question, sql: data.generatedSQL, columns: [], results: [], rowCount: 0, explanation: '', ms: 0 })
          setShowSQL(true)
        }
      } else {
        setResult(data)
        setHistory(h => [question, ...h.filter(q => q !== question)].slice(0, 10))
      }
    } catch {
      setError('Network error — is the server running?')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = (e: FormEvent) => { e.preventDefault(); submit(query) }

  const handleSuggestion = (q: string) => {
    setQuery(q)
    submit(q)
  }

  const insertPlayerName = (name: string) => {
    const el = inputRef.current
    if (!el) return
    const pos  = el.selectionStart ?? query.length
    const next = query.slice(0, pos) + name + query.slice(pos)
    setQuery(next)
    setTimeout(() => {
      el.focus()
      el.setSelectionRange(pos + name.length, pos + name.length)
    }, 0)
  }

  // ── DB not ready ────────────────────────────────────────────────────────────
  if (dbStatus && !dbStatus.ok) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="max-w-md text-center p-10 bg-white rounded-3xl border border-slate-200 shadow-lg">
          <div className="w-14 h-14 bg-amber-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Database className="text-amber-600" size={28} />
          </div>
          <h2 className="text-xl font-black text-slate-900 mb-2">Database Not Ready</h2>
          <p className="text-slate-500 text-sm mb-6">
            Run the download script to populate the cricket database first.
          </p>
          <code className="block text-xs bg-slate-900 text-emerald-400 px-4 py-3 rounded-xl text-left font-mono">
            cd cricket_data<br />
            python cricket_downloader.py --mode full
          </code>
          {dbStatus.error && (
            <p className="mt-4 text-xs text-red-500 font-mono break-all">{dbStatus.error}</p>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col relative">
      {/* Player Drawer */}
      <PlayerDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onSelect={insertPlayerName}
      />

      {/* ── Page header ──────────────────────────────────────────────────────── */}
      <div className="border-b border-slate-200 bg-white px-8 py-4 flex items-center justify-between shrink-0">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <Sparkles size={16} className="text-emerald-600" />
            <span className="text-xs font-black uppercase tracking-widest text-emerald-600">
              Natural Language Analytics
            </span>
          </div>
          <h1 className="text-2xl font-black text-slate-900">Query the Database</h1>
        </div>

        <div className="flex items-center gap-3">
          {/* DB stats pill */}
          {dbStatus?.ok && (
            <div className="hidden md:flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-xs text-slate-500">
              <span className="font-bold text-slate-700">{dbStatus.matchCount.toLocaleString()}</span> matches ·
              <span className="font-bold text-slate-700">{(dbStatus.deliveryCount / 1_000_000).toFixed(1)}M</span> deliveries
            </div>
          )}

          {/* Player names drawer toggle */}
          <button
            onClick={() => setDrawerOpen(true)}
            className="flex items-center gap-2 bg-white border border-slate-200 hover:border-emerald-400
                       hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 text-sm font-semibold
                       px-4 py-2 rounded-xl transition-all shadow-sm"
          >
            <Users size={15} />
            Player Names
          </button>
        </div>
      </div>

      {/* ── Scrollable content ────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-6 py-8 space-y-8">

          {/* ── Query input ─────────────────────────────────────────────────── */}
          <form onSubmit={handleSubmit}>
            <div className="relative">
              <div className="absolute left-5 top-1/2 -translate-y-1/2 pointer-events-none">
                <MessageSquare size={20} className="text-slate-400" />
              </div>
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="e.g. Rank India batters for Test selection last 3 years…"
                disabled={loading}
                className="
                  query-input w-full bg-white border-2 border-slate-200
                  focus:border-emerald-500 rounded-2xl
                  py-4 pl-14 pr-36 text-base text-slate-800
                  placeholder:text-slate-400 outline-none
                  shadow-lg shadow-slate-200/50 transition-all duration-200
                  disabled:opacity-60
                "
              />
              <button
                type="submit"
                disabled={loading || !query.trim()}
                className="
                  absolute right-3 inset-y-2.5 px-6 rounded-xl
                  text-white font-black text-sm tracking-wide
                  transition-all duration-150 flex items-center gap-2
                  disabled:bg-slate-300 disabled:cursor-not-allowed
                  enabled:bg-slate-900 enabled:hover:bg-emerald-600 enabled:active:scale-95
                  shadow-md
                "
              >
                {loading ? (
                  <span className="flex gap-1">
                    <span className="typing-dot" />
                    <span className="typing-dot" />
                    <span className="typing-dot" />
                  </span>
                ) : (
                  <>
                    <Sparkles size={14} />
                    Analyse
                  </>
                )}
              </button>
            </div>
          </form>

          {/* ── Suggested queries ─────────────────────────────────────────────── */}
          {!result && !loading && !error && (
            <div className="space-y-3 animate-fade-in">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-widest">
                <Lightbulb size={13} />
                Try asking
              </div>
              <div className="flex flex-wrap gap-2">
                {SUGGESTIONS.map(s => (
                  <button
                    key={s}
                    onClick={() => handleSuggestion(s)}
                    className="
                      text-xs font-semibold px-4 py-2 rounded-full
                      bg-white border border-slate-200
                      text-slate-600 hover:text-emerald-700
                      hover:border-emerald-300 hover:bg-emerald-50
                      transition-all duration-150 shadow-sm
                    "
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── Query history ─────────────────────────────────────────────────── */}
          {history.length > 0 && !loading && (
            <div className="space-y-2">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Recent</p>
              <div className="flex flex-wrap gap-2">
                {history.map(h => (
                  <button
                    key={h}
                    onClick={() => handleSuggestion(h)}
                    className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800
                               px-3 py-1.5 rounded-lg border border-slate-200 hover:border-slate-300
                               bg-white transition-colors"
                  >
                    <RotateCcw size={10} />
                    {h.length > 50 ? h.slice(0, 50) + '…' : h}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── Loading state ─────────────────────────────────────────────────── */}
          {loading && (
            <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center shadow-sm animate-fade-in">
              <div className="flex justify-center gap-1.5 mb-3">
                <div className="typing-dot" />
                <div className="typing-dot" />
                <div className="typing-dot" />
              </div>
              <p className="text-sm text-slate-500">Converting your question to SQL…</p>
            </div>
          )}

          {/* ── Error state ───────────────────────────────────────────────────── */}
          {error && !loading && (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-5 animate-fade-in">
              <div className="flex items-start gap-3">
                <AlertTriangle className="text-red-500 shrink-0 mt-0.5" size={18} />
                <div>
                  <p className="text-sm font-bold text-red-700 mb-1">Query Failed</p>
                  <p className="text-xs text-red-600">{error}</p>
                  <p className="text-xs text-red-500 mt-2">
                    Tip: Use the Player Names panel to get exact spellings, or try rephrasing.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* ── Results ───────────────────────────────────────────────────────── */}
          {result && !loading && (
            <div className="space-y-4 results-enter">

              {/* AI Explanation card */}
              {result.explanation && (
                <div className="bg-gradient-to-br from-emerald-50 to-slate-50 border border-emerald-200
                                rounded-2xl p-5 shadow-sm">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-emerald-600 rounded-xl flex items-center justify-center shrink-0">
                      <Sparkles size={14} className="text-white" />
                    </div>
                    <div>
                      <p className="text-xs font-black text-emerald-700 uppercase tracking-widest mb-1.5">
                        Analyst Summary
                      </p>
                      <p className="text-sm text-slate-700 leading-relaxed">{result.explanation}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Meta row */}
              <div className="flex items-center gap-4 text-xs text-slate-400 px-1">
                <span className="flex items-center gap-1">
                  <Database size={11} />
                  {result.rowCount} row{result.rowCount !== 1 ? 's' : ''}
                </span>
                <span className="flex items-center gap-1">
                  <Clock size={11} />
                  {result.ms}ms
                </span>
                <button
                  onClick={() => setShowSQL(v => !v)}
                  className="flex items-center gap-1 hover:text-emerald-600 transition-colors ml-auto"
                >
                  {showSQL ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                  {showSQL ? 'Hide SQL' : 'Show SQL'}
                </button>
              </div>

              {/* SQL panel */}
              {showSQL && result.sql && (
                <div className="bg-slate-900 rounded-2xl p-4 overflow-x-auto shadow-inner animate-fade-in">
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">
                    Generated SQL
                  </p>
                  <pre className="text-emerald-400 text-xs font-mono whitespace-pre-wrap leading-relaxed">
                    {result.sql}
                  </pre>
                </div>
              )}

              {/* Data table */}
              {result.results.length > 0 && (
                <ResultsTable columns={result.columns} rows={result.results} />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
