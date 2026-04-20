'use client'

import { Target, Zap, Database, Users, TrendingUp, Settings } from 'lucide-react'

interface SidebarProps {
  activeTab: string
  onTabChange: (tab: string) => void
}

const NAV = [
  { id: 'query',    icon: Zap,        label: 'Query AI',     badge: 'LIVE' },
  { id: 'vault',    icon: Database,   label: 'Player Vault', badge: 'SOON' },
  { id: 'squad',    icon: Users,      label: 'Squad Scout',  badge: 'SOON' },
  { id: 'trends',   icon: TrendingUp, label: 'Trends',       badge: 'SOON' },
]

export default function Sidebar({ activeTab, onTabChange }: SidebarProps) {
  return (
    <aside className="w-60 bg-slate-900 flex flex-col h-full shrink-0">

      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-6 border-b border-slate-700/60">
        <div className="bg-emerald-500 p-2 rounded-xl shadow-lg shadow-emerald-900/40">
          <Target className="text-white" size={20} />
        </div>
        <div>
          <h1 className="text-white text-lg font-black tracking-tight leading-none">CRICLENS</h1>
          <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">Test Analytics</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {NAV.map(({ id, icon: Icon, label, badge }) => {
          const active  = activeTab === id
          const isSoon  = badge === 'SOON'
          return (
            <button
              key={id}
              onClick={() => !isSoon && onTabChange(id)}
              disabled={isSoon}
              className={`
                w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold
                transition-all duration-150 text-left
                ${active
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-900/40'
                  : isSoon
                  ? 'text-slate-600 cursor-not-allowed'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                }
              `}
            >
              <Icon size={17} />
              <span className="flex-1">{label}</span>
              {badge === 'LIVE' && (
                <span className="text-[9px] font-black bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-1.5 py-0.5 rounded-md tracking-widest">
                  LIVE
                </span>
              )}
              {badge === 'SOON' && (
                <span className="text-[9px] font-black bg-slate-700 text-slate-500 px-1.5 py-0.5 rounded-md tracking-widest">
                  SOON
                </span>
              )}
            </button>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="px-4 py-4 border-t border-slate-700/60 space-y-3">
        <div className="bg-slate-800 rounded-xl p-3">
          <p className="text-[9px] text-slate-500 uppercase font-bold tracking-widest mb-0.5">Data Source</p>
          <p className="text-slate-300 text-xs font-semibold">Cricsheet.org</p>
          <p className="text-slate-500 text-[10px]">Test matches only</p>
        </div>
        <button className="w-full flex items-center gap-2 text-slate-500 hover:text-slate-300 text-xs px-1 transition-colors">
          <Settings size={13} />
          <span>Settings</span>
        </button>
      </div>
    </aside>
  )
}
