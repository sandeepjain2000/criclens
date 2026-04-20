"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Shield, ArrowUp, ArrowDown, Minus, RefreshCw,
  Info, ChevronDown, ChevronUp, Globe, BarChart2, Grid
} from 'lucide-react';

// ── Team colour palette ───────────────────────────────────────────────────────
const TEAM_META = {
  'India':        { color: '#1d4ed8', flag: '🇮🇳', abbr: 'IND' },
  'Australia':    { color: '#15803d', flag: '🇦🇺', abbr: 'AUS' },
  'England':      { color: '#1e3a5f', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', abbr: 'ENG' },
  'Pakistan':     { color: '#166534', flag: '🇵🇰', abbr: 'PAK' },
  'West Indies':  { color: '#dc2626', flag: '🏏',  abbr: 'WI'  },
  'South Africa': { color: '#b45309', flag: '🇿🇦', abbr: 'SA'  },
  'New Zealand':  { color: '#0e7490', flag: '🇳🇿', abbr: 'NZ'  },
  'Sri Lanka':    { color: '#7c3aed', flag: '🇱🇰', abbr: 'SL'  },
  'Bangladesh':   { color: '#065f46', flag: '🇧🇩', abbr: 'BAN' },
  'Zimbabwe':     { color: '#b91c1c', flag: '🇿🇼', abbr: 'ZIM' },
  'Afghanistan':  { color: '#2563eb', flag: '🇦🇫', abbr: 'AFG' },
  'Ireland':      { color: '#16a34a', flag: '🇮🇪', abbr: 'IRE' },
  'Netherlands':  { color: '#ea580c', flag: '🇳🇱', abbr: 'NED' },
  'Scotland':     { color: '#4338ca', flag: '🏴󠁧󠁢󠁳󠁣󠁴󠁿', abbr: 'SCO' },
  'Kenya':        { color: '#92400e', flag: '🇰🇪', abbr: 'KEN' },
};

const teamColor = (t) => TEAM_META[t]?.color  ?? '#64748b';
const teamFlag  = (t) => TEAM_META[t]?.flag   ?? '🏏';
const teamAbbr  = (t) => TEAM_META[t]?.abbr   ?? (t || '?').slice(0, 3).toUpperCase();

// ── Sub-components ────────────────────────────────────────────────────────────

const RankMedal = ({ rank }) => {
  if (rank === 1) return <span style={{ fontSize: '1.2rem' }}>🥇</span>;
  if (rank === 2) return <span style={{ fontSize: '1.2rem' }}>🥈</span>;
  if (rank === 3) return <span style={{ fontSize: '1.2rem' }}>🥉</span>;
  return <span className="font-mono text-sm text-slate-500">{rank}</span>;
};

const Delta = ({ change }) => {
  if (change > 0) return (
    <span className="flex items-center gap-0.5 text-emerald-600 font-bold text-xs">
      <ArrowUp size={11} />{change}
    </span>
  );
  if (change < 0) return (
    <span className="flex items-center gap-0.5 text-red-500 font-bold text-xs">
      <ArrowDown size={11} />{Math.abs(change)}
    </span>
  );
  return <Minus size={13} className="text-slate-300" />;
};

const TeamBadge = ({ team, size = 'md' }) => {
  const color = teamColor(team);
  const abbr  = teamAbbr(team);
  const flag  = teamFlag(team);
  const pad   = size === 'sm' ? '0.2rem 0.5rem' : '0.25rem 0.6rem';
  const fs    = size === 'sm' ? '0.65rem' : '0.72rem';
  return (
    <span
      title={team}
      style={{
        backgroundColor: color,
        color: '#fff',
        fontWeight: 900,
        fontSize: fs,
        padding: pad,
        borderRadius: '0.35rem',
        letterSpacing: '0.05em',
        lineHeight: 1,
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.3rem',
      }}
    >
      <span>{flag}</span>
      <span>{abbr}</span>
    </span>
  );
};

const WinBar = ({ wins, losses, draws }) => {
  const total = wins + losses + draws;
  if (total === 0) return null;
  const wp = (wins   / total) * 100;
  const lp = (losses / total) * 100;
  const dp = (draws  / total) * 100;
  return (
    <div style={{ display: 'flex', width: '100%', height: '6px', borderRadius: '6px', overflow: 'hidden', gap: '1px' }}>
      {wp > 0 && <div style={{ flex: wp, backgroundColor: '#059669', borderRadius: '6px 0 0 6px' }} title={`${wins} wins`} />}
      {dp > 0 && <div style={{ flex: dp, backgroundColor: '#94a3b8' }} title={`${draws} draws`} />}
      {lp > 0 && <div style={{ flex: lp, backgroundColor: '#ef4444', borderRadius: '0 6px 6px 0' }} title={`${losses} losses`} />}
    </div>
  );
};

// ── Parameter slider ──────────────────────────────────────────────────────────
const ParamSlider = ({ label, hint, value, min, max, step, onChange, format }) => (
  <div>
    <div className="flex items-center justify-between mb-1">
      <label className="text-xs font-bold text-slate-600">{label}</label>
      <span
        className="text-xs font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200"
      >
        {format ? format(value) : value}
      </span>
    </div>
    {hint && <p className="text-[10px] text-slate-400 mb-1.5">{hint}</p>}
    <input
      type="range" min={min} max={max} step={step} value={value}
      onChange={e => onChange(parseFloat(e.target.value))}
      className="w-full h-1.5 rounded-lg appearance-none cursor-pointer accent-emerald-600"
      style={{
        background: `linear-gradient(to right,#059669 0%,#059669 ${((value - min) / (max - min)) * 100}%,#e2e8f0 ${((value - min) / (max - min)) * 100}%,#e2e8f0 100%)`
      }}
    />
    <div className="flex justify-between text-[9px] text-slate-400 mt-0.5">
      <span>{min}</span><span>{max}</span>
    </div>
  </div>
);

// ── EV explanation panel ──────────────────────────────────────────────────────
const EVExplainer = ({ show, onToggle }) => (
  <div className="bg-slate-50 border border-slate-200 rounded-xl overflow-hidden mb-4">
    <button
      onClick={onToggle}
      className="w-full flex items-center justify-between px-5 py-3 text-left"
      style={{ border: 'none', background: 'transparent', cursor: 'pointer' }}
    >
      <span className="flex items-center gap-2 text-sm font-black text-slate-700">
        <Info size={15} className="text-emerald-600" />
        How EV Rankings Work
      </span>
      {show ? <ChevronUp size={15} className="text-slate-400" /> : <ChevronDown size={15} className="text-slate-400" />}
    </button>
    {show && (
      <div className="px-5 pb-5">
        <div className="grid grid-cols-2 gap-4" style={{ gridTemplateColumns: '1fr 1fr' }}>
          <div className="bg-white rounded-xl p-4 border border-slate-200 text-xs text-slate-600 leading-relaxed">
            <p className="font-black text-slate-800 mb-2 text-sm">Simple Win Rate vs EV</p>
            <p>
              Basic win-rate treats all victories equally — beating a last-place team
              counts the same as beating the top team. <strong>EV Rankings</strong> fix this.
            </p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-slate-200 text-xs text-slate-600 leading-relaxed">
            <p className="font-black text-slate-800 mb-2 text-sm">Markov-Chain Iteration</p>
            <p>
              Each team's Expected Value = Σ (wins × opponent's EV<sup>p</sup>) ÷ matches played.
              The EV vector is normalised and iterated until stable — like PageRank for cricket.
            </p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-slate-200 text-xs text-slate-600 leading-relaxed">
            <p className="font-black text-slate-800 mb-2 text-sm">Power Exponent (p)</p>
            <p>
              Higher <strong>p</strong> amplifies the gap between top and bottom opponents.
              p = 1 → linear weighting. p = 2 → beating the #1 team is worth 4× beating #2.
            </p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-slate-200 text-xs text-slate-600 leading-relaxed">
            <p className="font-black text-slate-800 mb-2 text-sm">Rank Change (Δ)</p>
            <p>
              A positive Δ means the team moved <em>up</em> from its raw win-rate rank once
              quality-of-opposition is factored in. Negative = over-rated by simple record.
            </p>
          </div>
        </div>
      </div>
    )}
  </div>
);

// ── Head-to-head mini matrix ──────────────────────────────────────────────────
const H2HMatrix = ({ h2h, teams }) => {
  if (!teams || teams.length === 0) return null;
  // Limit to 10 teams for readability
  const display = teams.slice(0, 10);

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="px-5 py-3 border-b border-slate-100 flex items-center gap-2">
        <Grid size={14} className="text-slate-400" />
        <span className="text-xs font-black uppercase tracking-widest text-slate-500">
          Head-to-Head Matrix (Top {display.length})
        </span>
        <span className="text-[10px] text-slate-400 ml-2">
          Wins → (row beats column) · — = no encounter
        </span>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ borderCollapse: 'collapse', fontSize: '0.75rem' }}>
          <thead>
            <tr>
              <th style={{ padding: '0.5rem 0.75rem', backgroundColor: '#f8fafc', textAlign: 'left', fontWeight: 900, color: '#64748b', borderBottom: '1px solid #e2e8f0', whiteSpace: 'nowrap' }}>
                Team ↓ vs →
              </th>
              {display.map(t => (
                <th key={t} style={{ padding: '0.4rem 0.6rem', backgroundColor: '#f8fafc', textAlign: 'center', borderBottom: '1px solid #e2e8f0', whiteSpace: 'nowrap' }}>
                  <TeamBadge team={t} size="sm" />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {display.map((rowTeam, ri) => (
              <tr key={rowTeam} style={{ backgroundColor: ri % 2 === 0 ? '#fff' : '#f8fafc' }}>
                <td style={{ padding: '0.5rem 0.75rem', fontWeight: 700, color: '#1e293b', borderBottom: '1px solid #f1f5f9', whiteSpace: 'nowrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span>{teamFlag(rowTeam)}</span>
                    <span>{rowTeam}</span>
                  </div>
                </td>
                {display.map(colTeam => {
                  if (rowTeam === colTeam) {
                    return (
                      <td key={colTeam} style={{ padding: '0.4rem 0.6rem', textAlign: 'center', backgroundColor: '#1e293b', borderBottom: '1px solid #f1f5f9' }}>
                        <span style={{ color: '#475569', fontSize: '0.7rem' }}>—</span>
                      </td>
                    );
                  }
                  const cell = h2h[rowTeam]?.[colTeam];
                  const wins   = cell?.wins   ?? 0;
                  const losses = cell?.losses ?? 0;
                  const played = cell?.played ?? 0;
                  if (played === 0) {
                    return (
                      <td key={colTeam} style={{ padding: '0.4rem 0.6rem', textAlign: 'center', color: '#cbd5e1', fontSize: '0.7rem', borderBottom: '1px solid #f1f5f9' }}>
                        —
                      </td>
                    );
                  }
                  const dominant = wins > losses;
                  const even     = wins === losses;
                  return (
                    <td
                      key={colTeam}
                      style={{
                        padding: '0.4rem 0.6rem',
                        textAlign: 'center',
                        borderBottom: '1px solid #f1f5f9',
                        backgroundColor: dominant ? 'rgba(5,150,105,0.08)' : even ? 'transparent' : 'rgba(239,68,68,0.06)',
                      }}
                    >
                      <span style={{
                        fontWeight: 900,
                        fontFamily: 'monospace',
                        fontSize: '0.75rem',
                        color: dominant ? '#047857' : even ? '#64748b' : '#dc2626',
                      }}>
                        {wins}–{losses}
                      </span>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// ── Main rankings table ───────────────────────────────────────────────────────
const TeamTable = ({ teams }) => {
  const [sortKey, setSortKey] = useState('ev_rank');
  const [sortDir, setSortDir] = useState('asc');

  const sorted = useMemo(() => {
    return [...teams].sort((a, b) => {
      const va = a[sortKey], vb = b[sortKey];
      if (typeof va === 'number') return sortDir === 'asc' ? va - vb : vb - va;
      return sortDir === 'asc'
        ? String(va ?? '').localeCompare(String(vb ?? ''))
        : String(vb ?? '').localeCompare(String(va ?? ''));
    });
  }, [teams, sortKey, sortDir]);

  const toggleSort = (k) => {
    if (sortKey === k) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(k); setSortDir(k === 'ev_rank' || k === 'basic_rank' ? 'asc' : 'desc'); }
  };

  const SortTh = ({ k, children, title }) => (
    <th
      onClick={() => toggleSort(k)}
      title={title}
      className="px-4 py-4 text-xs font-black uppercase tracking-widest text-slate-400 cursor-pointer hover:text-slate-600 hover:bg-slate-100 transition-colors select-none text-center whitespace-nowrap"
    >
      <span className="inline-flex items-center gap-1 justify-center">
        {children}
        {sortKey === k && (sortDir === 'asc'
          ? <ArrowUp size={9} className="text-emerald-600" />
          : <ArrowDown size={9} className="text-emerald-600" />)}
      </span>
    </th>
  );

  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-200 shadow-sm bg-white">
      <table className="w-full text-left border-collapse text-sm">
        <thead className="bg-slate-50 border-b border-slate-200">
          <tr>
            <SortTh k="ev_rank"    title="EV Rank">Rank</SortTh>
            <th className="px-4 py-4 text-xs font-black uppercase tracking-widest text-slate-400 text-center">Δ</th>
            <th className="px-5 py-4 text-xs font-black uppercase tracking-widest text-slate-400">Team</th>
            <SortTh k="matches"    title="Total matches played">Played</SortTh>
            <SortTh k="wins"       title="Matches won">Wins</SortTh>
            <SortTh k="losses"     title="Matches lost">Losses</SortTh>
            <SortTh k="draws"      title="Draws / No result">Draws</SortTh>
            <SortTh k="win_pct"    title="Win percentage">Win %</SortTh>
            <SortTh k="basic_rank" title="Simple win-rate rank">Basic #</SortTh>
            <SortTh k="ev_score"   title="EV score (%)">EV Score</SortTh>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {sorted.map(row => {
            const isTop3 = row.ev_rank <= 3;
            const color  = teamColor(row.team);
            return (
              <tr
                key={row.team}
                className={`transition-colors ${isTop3 ? 'bg-emerald-50/40 hover:bg-emerald-50' : 'hover:bg-slate-50'}`}
              >
                {/* Rank */}
                <td className="px-4 py-4 text-center">
                  <RankMedal rank={row.ev_rank} />
                </td>

                {/* Delta */}
                <td className="px-4 py-4 text-center">
                  <Delta change={row.rank_change} />
                </td>

                {/* Team name + badge */}
                <td className="px-5 py-4">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    {/* Colour strip */}
                    <div style={{ width: '4px', height: '36px', borderRadius: '4px', backgroundColor: color, flexShrink: 0 }} />
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span className={`font-semibold text-base ${isTop3 ? 'text-slate-900 font-black' : 'text-slate-800'}`}>
                          {row.team}
                        </span>
                        <TeamBadge team={row.team} />
                      </div>
                      {/* Mini W/L/D bar */}
                      <div style={{ marginTop: '0.35rem', width: '120px' }}>
                        <WinBar wins={row.wins} losses={row.losses} draws={row.draws} />
                      </div>
                    </div>
                  </div>
                </td>

                {/* Played */}
                <td className="px-4 py-4 text-center font-mono text-slate-600 text-sm">{row.matches}</td>

                {/* Wins */}
                <td className="px-4 py-4 text-center font-mono text-emerald-700 font-bold text-sm">{row.wins}</td>

                {/* Losses */}
                <td className="px-4 py-4 text-center font-mono text-red-500 text-sm">{row.losses}</td>

                {/* Draws */}
                <td className="px-4 py-4 text-center font-mono text-slate-400 text-sm">{row.draws}</td>

                {/* Win % */}
                <td className="px-4 py-4 text-center">
                  <span className={`font-mono text-sm font-bold ${row.win_pct >= 60 ? 'text-emerald-700' : row.win_pct >= 45 ? 'text-slate-700' : 'text-red-500'}`}>
                    {row.win_pct.toFixed(1)}%
                  </span>
                </td>

                {/* Basic rank */}
                <td className="px-4 py-4 text-center">
                  <span className="text-sm font-mono text-slate-500 bg-slate-100 px-3 py-1 rounded-md">#{row.basic_rank}</span>
                </td>

                {/* EV Score */}
                <td className="px-4 py-4 text-center">
                  <span className={`font-black font-mono text-base px-3 py-1 rounded-lg ${
                    row.ev_rank <= 3  ? 'text-emerald-700 bg-emerald-100'
                    : row.ev_rank <= 6 ? 'text-emerald-600'
                    : 'text-slate-600'
                  }`}>
                    {row.ev_score.toFixed(2)}
                  </span>
                </td>
              </tr>
            );
          })}
          {sorted.length === 0 && (
            <tr>
              <td colSpan={10} className="px-6 py-10 text-center text-slate-400 text-sm">
                No teams found for current settings.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function TeamRankingsPage() {
  // Params
  const [iterations, setIterations] = useState(3);
  const [p,          setP]          = useState(1.0);
  const [minMatches, setMinMatches] = useState(5);

  // Data
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  // UI
  const [view,        setView]        = useState('table'); // 'table' | 'h2h'
  const [showParams,  setShowParams]  = useState(false);
  const [showExplain, setShowExplain] = useState(false);

  const fetchRankings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const url = `/api/team-rankings?iterations=${iterations}&p=${p}&minMatches=${minMatches}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Server error ${res.status}`);
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      setData(json);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [iterations, p, minMatches]);

  // Auto-load on mount
  useEffect(() => { fetchRankings(); }, []); // eslint-disable-line

  const handleApply = () => fetchRankings();

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="flex-1 overflow-y-auto p-8 custom-scrollbar" style={{ maxHeight: '100%' }}>
      <div className="max-w-6xl mx-auto space-y-6">

        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div className="flex items-start justify-between pb-2">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Globe size={26} className="text-emerald-600" />
              <h2 className="text-3xl font-black text-slate-900 m-0">Team EV Rankings</h2>
            </div>
            <p className="text-slate-500 text-base m-0" style={{ marginLeft: '2.25rem' }}>
              Quality-weighted rankings — beating stronger opponents earns more Expected Value.
            </p>
            {data?.year_range?.min && (
              <p className="text-[11px] text-slate-400 font-mono m-0 mt-1" style={{ marginLeft: '2.25rem' }}>
                {data.total_matches?.toLocaleString()} matches · {data.total_teams} qualified teams · {data.year_range.min}–{data.year_range.max}
              </p>
            )}
          </div>

          <button
            onClick={handleApply}
            disabled={loading}
            className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-800 border border-slate-200 px-4 py-2 rounded-lg bg-white transition-colors"
            style={{ cursor: loading ? 'not-allowed' : 'pointer' }}
          >
            <RefreshCw size={14} className={loading ? 'animate-spin text-emerald-500' : ''} />
            {loading ? 'Loading…' : 'Refresh'}
          </button>
        </div>

        {/* ── EV Explainer ────────────────────────────────────────────────── */}
        <EVExplainer show={showExplain} onToggle={() => setShowExplain(v => !v)} />

        {/* ── Parameters card ─────────────────────────────────────────────── */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <button
            onClick={() => setShowParams(v => !v)}
            className="w-full flex items-center justify-between px-6 py-4 text-left"
            style={{ border: 'none', background: 'transparent', cursor: 'pointer' }}
          >
            <div>
              <span className="font-black text-sm text-slate-700">⚙️ Model Parameters</span>
              <span className="text-[11px] text-slate-400 font-mono ml-3">
                p={p.toFixed(1)} · iter={iterations} · min={minMatches} matches
              </span>
            </div>
            {showParams ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
          </button>

          {showParams && (
            <div className="px-6 pb-6 border-t border-slate-100">
              {/* Formula banner */}
              <div className="mt-4 mb-5 p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-500 font-mono leading-relaxed">
                <span className="font-black text-slate-700 not-italic">EV(team) =</span>
                {' '}Σ (wins_vs_opp × EV(opp)<sup className="font-black">p</sup>) ÷ matches_played
                <br />
                <span className="text-slate-400">Normalised each iteration · Markov-chain convergence</span>
              </div>

              <div className="grid grid-cols-2 gap-x-8 gap-y-5" style={{ gridTemplateColumns: '1fr 1fr' }}>
                <ParamSlider
                  label="Power Exponent (p)"
                  hint="Higher p → quality of opposition matters exponentially more"
                  value={p} min={0.5} max={2.5} step={0.1}
                  onChange={setP} format={v => v.toFixed(1)}
                />
                <ParamSlider
                  label="Min Matches to Qualify"
                  hint="Teams with fewer matches are excluded from rankings"
                  value={minMatches} min={1} max={30} step={1}
                  onChange={setMinMatches}
                />
              </div>

              {/* Iterations */}
              <div className="mt-5">
                <label className="text-xs font-black text-slate-600 block mb-2">EV Iterations</label>
                <div className="flex gap-2">
                  {[1, 2, 3, 5].map(n => (
                    <button
                      key={n}
                      onClick={() => setIterations(n)}
                      className={`flex-1 py-2.5 rounded-xl border font-black text-sm transition-all ${
                        iterations === n
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-md'
                          : 'bg-white text-slate-600 border-slate-200 hover:border-emerald-400 hover:text-emerald-600'
                      }`}
                      style={{ cursor: 'pointer' }}
                    >
                      {n === 1 ? '1 — Quick' : n === 2 ? '2 — Standard' : n === 3 ? '3 — Refined' : '5 — Converged'}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-5">
                <button
                  onClick={handleApply}
                  disabled={loading}
                  className="flex items-center justify-center gap-2 py-3 px-8 rounded-xl font-black text-sm shadow-sm"
                  style={{ background: loading ? '#94a3b8' : '#059669', color: '#fff', border: 'none', cursor: loading ? 'not-allowed' : 'pointer' }}
                >
                  {loading ? <><RefreshCw size={15} className="animate-spin" /> Computing…</> : <>Apply Parameters</>}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ── Error state ──────────────────────────────────────────────────── */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-5 flex items-start gap-3">
            <Info size={18} className="shrink-0 mt-0.5 text-red-500" />
            <div>
              <p className="font-black text-red-700 m-0 text-sm">Failed to load rankings</p>
              <p className="m-0 mt-1 font-medium text-red-600 text-sm">{error}</p>
            </div>
          </div>
        )}

        {/* ── Loading skeleton ─────────────────────────────────────────────── */}
        {loading && !data && (
          <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center animate-pulse">
            <Shield size={36} className="text-emerald-300 mx-auto mb-4" />
            <p className="text-slate-400 text-sm font-bold">Computing EV Rankings…</p>
          </div>
        )}

        {/* ── Results ──────────────────────────────────────────────────────── */}
        {data && !loading && (
          <div>
            {/* View tabs */}
            <div className="flex gap-3 mb-5 items-center flex-wrap">
              {[
                { id: 'table', label: '🏆 Rankings Table',   icon: BarChart2 },
                { id: 'h2h',   label: '⚔️ Head-to-Head',    icon: Grid },
              ].map(({ id, label }) => (
                <button
                  key={id}
                  onClick={() => setView(id)}
                  className={`px-6 py-3 rounded-xl font-bold text-sm transition-all ${
                    view === id
                      ? 'bg-emerald-600 text-white shadow-md'
                      : 'bg-white text-slate-600 border border-slate-200 hover:border-emerald-400 hover:text-emerald-600'
                  }`}
                  style={{ cursor: 'pointer', border: view === id ? 'none' : undefined }}
                >
                  {label}
                </button>
              ))}

              {/* Summary bar */}
              <div className="ml-auto flex items-center gap-3 text-xs text-slate-400 font-mono bg-slate-50 border border-slate-200 px-4 py-2.5 rounded-lg">
                <span className="font-bold text-slate-600">{data.total_teams}</span> teams ·{' '}
                <span className="font-bold text-slate-600">{data.total_matches?.toLocaleString()}</span> matches
                {data.params && (
                  <span className="text-slate-300 ml-1">
                    · p={data.params.p} · {data.params.iterations} iter
                  </span>
                )}
              </div>
            </div>

            {/* Legend */}
            <div className="bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 mb-4 flex flex-wrap gap-4 items-center text-xs text-slate-500">
              <span className="flex items-center gap-1.5">
                <ArrowUp size={12} className="text-emerald-600" /> Moved up vs basic win-rate rank
              </span>
              <span className="flex items-center gap-1.5">
                <ArrowDown size={12} className="text-red-400" /> Moved down vs basic win-rate rank
              </span>
              <span className="flex items-center gap-3 ml-2">
                <span style={{ display: 'inline-block', width: 12, height: 6, borderRadius: 3, backgroundColor: '#059669' }} /> Wins
                <span style={{ display: 'inline-block', width: 12, height: 6, borderRadius: 3, backgroundColor: '#94a3b8' }} /> Draws
                <span style={{ display: 'inline-block', width: 12, height: 6, borderRadius: 3, backgroundColor: '#ef4444' }} /> Losses
              </span>
            </div>

            {view === 'table' && <TeamTable teams={data.teams} />}
            {view === 'h2h'   && (
              <H2HMatrix h2h={data.h2h} teams={data.h2h_teams} />
            )}
          </div>
        )}

      </div>
    </div>
  );
}
