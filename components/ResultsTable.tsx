'use client'

import { useState, useMemo } from 'react'
import { ArrowUp, ArrowDown, ArrowUpDown, Copy, Check } from 'lucide-react'

interface ResultsTableProps {
  columns: string[]
  rows: Record<string, unknown>[]
}

// Columns that should be right-aligned (numeric stats)
const NUMERIC_HINT = new Set([
  'runs','avg','batting_avg','sr','batting_sr','matches','innings','wickets',
  'balls','economy','bowling_avg','bowling_sr','hundreds','fifties','fours',
  'sixes','ducks','high_score','five_wkts','balls_faced','dismissals',
  'runs_conceded','balls_faced','rank','dismissed','runs_scored',
])

function isNumericCol(col: string): boolean {
  const lower = col.toLowerCase()
  return NUMERIC_HINT.has(lower) || /(_avg|_sr|_rate|_pct|_count|balls|runs|wickets)$/.test(lower)
}

function colorValue(col: string, val: unknown): string {
  if (typeof val !== 'number') return ''
  const c = col.toLowerCase()
  if (c.includes('avg') && c.includes('batting')) {
    if (val >= 50) return 'text-emerald-600 font-bold'
    if (val >= 40) return 'text-emerald-700'
    if (val < 20)  return 'text-red-500'
  }
  if (c === 'economy') {
    if (val <= 2.5) return 'text-emerald-600 font-bold'
    if (val <= 3.0) return 'text-emerald-700'
    if (val >= 4.0) return 'text-red-500'
  }
  if (c.includes('bowling_avg')) {
    if (val <= 22) return 'text-emerald-600 font-bold'
    if (val <= 28) return 'text-emerald-700'
    if (val >= 45) return 'text-red-500'
  }
  return ''
}

function fmtCol(col: string): string {
  return col
    .replace(/_/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase())
}

function fmtVal(val: unknown): string {
  if (val === null || val === undefined) return '—'
  if (typeof val === 'number') {
    return Number.isInteger(val) ? val.toLocaleString() : val.toFixed(2)
  }
  return String(val)
}

export default function ResultsTable({ columns, rows }: ResultsTableProps) {
  const [sortCol, setSortCol]     = useState<string | null>(null)
  const [sortDir, setSortDir]     = useState<'asc' | 'desc'>('desc')
  const [copied, setCopied]       = useState(false)

  const sorted = useMemo(() => {
    if (!sortCol) return rows
    return [...rows].sort((a, b) => {
      const va = a[sortCol], vb = b[sortCol]
      if (typeof va === 'number' && typeof vb === 'number')
        return sortDir === 'asc' ? va - vb : vb - va
      return sortDir === 'asc'
        ? String(va).localeCompare(String(vb))
        : String(vb).localeCompare(String(va))
    })
  }, [rows, sortCol, sortDir])

  const handleSort = (col: string) => {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortCol(col); setSortDir('desc') }
  }

  const copyCSV = () => {
    const header = columns.join(',')
    const body   = sorted.map(r => columns.map(c => r[c] ?? '').join(',')).join('\n')
    navigator.clipboard.writeText(`${header}\n${body}`)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (rows.length === 0) {
    return (
      <div className="text-center py-12 text-slate-400 text-sm">
        No results returned for this query.
      </div>
    )
  }

  return (
    <div>
      {/* Table toolbar */}
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs text-slate-500 font-medium">
          {rows.length} row{rows.length !== 1 ? 's' : ''} returned
        </p>
        <button
          onClick={copyCSV}
          className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-emerald-600
                     border border-slate-200 hover:border-emerald-300 rounded-lg px-3 py-1.5
                     transition-colors bg-white"
        >
          {copied ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
          {copied ? 'Copied!' : 'Copy CSV'}
        </button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-2xl border border-slate-200 shadow-sm bg-white">
        <table className="w-full text-left border-collapse text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest w-10">
                #
              </th>
              {columns.map(col => (
                <th
                  key={col}
                  onClick={() => handleSort(col)}
                  className={`
                    px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest
                    cursor-pointer hover:bg-slate-100 transition-colors select-none group
                    ${isNumericCol(col) ? 'text-right' : ''}
                  `}
                >
                  <div className={`flex items-center gap-1 ${isNumericCol(col) ? 'justify-end' : ''}`}>
                    {fmtCol(col)}
                    {sortCol === col
                      ? sortDir === 'asc'
                        ? <ArrowUp size={11} className="text-emerald-600" />
                        : <ArrowDown size={11} className="text-emerald-600" />
                      : <ArrowUpDown size={11} className="opacity-0 group-hover:opacity-60 transition-opacity" />
                    }
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {sorted.map((row, idx) => (
              <tr
                key={idx}
                className={`
                  hover:bg-slate-50 transition-colors
                  ${idx === 0 ? 'rank-1' : idx === 1 ? 'rank-2' : idx === 2 ? 'rank-3' : ''}
                `}
              >
                {/* Rank */}
                <td className="px-4 py-3 text-slate-400 text-xs font-bold">{idx + 1}</td>

                {columns.map(col => {
                  const raw = row[col]
                  const colorCls = colorValue(col, raw)
                  return (
                    <td
                      key={col}
                      className={`
                        px-4 py-3
                        ${isNumericCol(col) ? 'text-right font-mono' : ''}
                        ${colorCls || 'text-slate-700'}
                      `}
                    >
                      {fmtVal(raw)}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
