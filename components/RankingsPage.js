"use client";

import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import {
  Trophy, Play, X, ChevronDown, ChevronUp,
  ArrowUp, ArrowDown, Minus, RefreshCw,
  Info, Zap, Filter, Save, Calendar, Hash
} from 'lucide-react';

// ── Country helpers ───────────────────────────────────────────────────────────
const TEAM_COLORS = {
  'India':        '#1d4ed8', 'Australia':    '#15803d', 'England':      '#1e3a5f',
  'Pakistan':     '#166534', 'West Indies':  '#7c3aed', 'South Africa': '#b45309',
  'New Zealand':  '#0e7490', 'Sri Lanka':    '#9333ea', 'Bangladesh':   '#065f46',
  'Zimbabwe':     '#dc2626', 'Afghanistan':  '#2563eb', 'Ireland':      '#16a34a',
  'Kenya':        '#92400e', 'Netherlands':  '#f97316', 'Scotland':     '#3730a3',
};
const TEAM_ABBR = {
  'West Indies': 'WI',  'South Africa': 'SA', 'New Zealand': 'NZ',
  'Sri Lanka':   'SL',  'Bangladesh':   'BAN','Afghanistan':  'AFG',
  'Zimbabwe':    'ZIM', 'Ireland':      'IRE','Netherlands':  'NED', 'Scotland': 'SCO',
};
const teamColor = (c) => TEAM_COLORS[c] || '#64748b';
const teamAbbr  = (c) => c ? (TEAM_ABBR[c] || c.slice(0, 3).toUpperCase()) : '?';

// ── Role config ───────────────────────────────────────────────────────────────
const ROLE_CONFIG = {
  'BAT':   { cls: 'text-emerald-700 bg-emerald-50 border-emerald-200',  label: '🏏 BAT' },
  'WK':    { cls: 'text-sky-700 bg-sky-50 border-sky-200',              label: '🧤 WK'  },
  'P-BOW': { cls: 'text-orange-700 bg-orange-50 border-orange-200',     label: '🏏⚡ P-BOW' },
  'BWL':   { cls: 'text-blue-700 bg-blue-50 border-blue-200',           label: '⚡ BWL' },
  'AR':    { cls: 'text-purple-700 bg-purple-50 border-purple-200',     label: '✦ AR'  },
};

// ── Helpers ───────────────────────────────────────────────────────────────────
const CURRENT_YEAR = new Date().getFullYear();
const isActive = (last_played) => parseInt(last_played) >= CURRENT_YEAR - 1;

const formatDate = (iso) => {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  } catch { return iso; }
};

// ── Sub-components ────────────────────────────────────────────────────────────
const RankMedal = ({ rank }) => {
  if (rank === 1) return <span>🥇</span>;
  if (rank === 2) return <span>🥈</span>;
  if (rank === 3) return <span>🥉</span>;
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

const CountryBadge = ({ country }) => country ? (
  <span
    title={country}
    className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded text-white leading-none"
    style={{ backgroundColor: teamColor(country) }}
  >
    {teamAbbr(country)}
  </span>
) : null;

const RoleBadge = ({ role }) => {
  const cfg = ROLE_CONFIG[role];
  if (!cfg) return null;
  return (
    <span className={`text-[9px] font-bold uppercase border px-1.5 py-0.5 rounded leading-none ${cfg.cls}`}>
      {cfg.label}
    </span>
  );
};

const ActiveBadge = ({ last_played }) => isActive(last_played) ? (
  <span className="inline-flex items-center gap-0.5 text-[9px] font-black uppercase text-emerald-600 bg-emerald-50 border border-emerald-300 px-1.5 py-0.5 rounded leading-none">
    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" /> ACTIVE
  </span>
) : null;

// Slider
const Slider = ({ label, hint, value, min, max, step, onChange, format }) => (
  <div>
    <div className="flex items-center justify-between mb-1">
      <label className="text-xs font-bold text-slate-600">{label}</label>
      <span className="text-xs font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
        {format ? format(value) : value}
      </span>
    </div>
    {hint && <p className="text-[10px] text-slate-400 mb-1.5">{hint}</p>}
    <input
      type="range" min={min} max={max} step={step} value={value}
      onChange={e => onChange(parseFloat(e.target.value))}
      className="w-full h-1.5 rounded-lg appearance-none cursor-pointer accent-emerald-600"
      style={{ background: `linear-gradient(to right,#059669 0%,#059669 ${((value-min)/(max-min))*100}%,#e2e8f0 ${((value-min)/(max-min))*100}%,#e2e8f0 100%)` }}
    />
    <div className="flex justify-between text-[9px] text-slate-400 mt-0.5">
      <span>{min}</span><span>{max}</span>
    </div>
  </div>
);

// Progress bar
const ProgressBar = ({ pct }) => (
  <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
    <div className="h-2 rounded-full bg-emerald-500 transition-all duration-500" style={{ width: `${Math.min(100,pct)}%` }} />
  </div>
);

// ── Filters bar ───────────────────────────────────────────────────────────────
const FiltersBar = ({ allCountries, filterCountry, onCountryChange, filterMinYear, onMinYearChange, filterMinMatches, onMinMatchesChange, onClear, totalCount, filteredCount }) => {
  const hasFilters = filterCountry || filterMinYear || filterMinMatches > 0;
  return (
    <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 flex flex-wrap items-center gap-4 mb-4">
      <Filter size={13} className="text-slate-400 shrink-0" />

      <div className="flex items-center gap-3">
        <label className="text-xs font-bold text-slate-500 uppercase tracking-wide whitespace-nowrap">Country</label>
        <select
          value={filterCountry}
          onChange={e => onCountryChange(e.target.value)}
          className="text-xs border border-slate-200 rounded-lg px-2 py-1 bg-white text-slate-700 focus:outline-none focus:border-emerald-400"
          style={{ minWidth: 120 }}
        >
          <option value="">All Countries</option>
          {allCountries.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      <div className="flex items-center gap-3">
        <Calendar size={14} className="text-slate-400" />
        <label className="text-xs font-bold text-slate-500 uppercase tracking-wide whitespace-nowrap">Active Since</label>
        <input
          type="number" min="1950" max="2026" placeholder="Year"
          value={filterMinYear}
          onChange={e => onMinYearChange(e.target.value)}
          className="text-xs border border-slate-200 rounded-lg px-2 py-1 bg-white text-slate-700 w-20 focus:outline-none focus:border-emerald-400"
        />
      </div>

      <div className="flex items-center gap-3">
        <Hash size={14} className="text-slate-400" />
        <label className="text-xs font-bold text-slate-500 uppercase tracking-wide whitespace-nowrap">Min Matches</label>
        <input
          type="number" min="0" max="300" placeholder="0"
          value={filterMinMatches || ''}
          onChange={e => onMinMatchesChange(parseInt(e.target.value) || 0)}
          className="text-xs border border-slate-200 rounded-lg px-2 py-1 bg-white text-slate-700 w-16 focus:outline-none focus:border-emerald-400"
        />
      </div>

      <div className="ml-auto flex items-center gap-2">
        {hasFilters ? (
          <>
            <span className="text-[10px] font-mono text-slate-500">{filteredCount} of {totalCount} players</span>
            <button
              onClick={onClear}
              className="flex items-center gap-0.5 text-[10px] font-bold text-red-500 hover:text-red-700 border border-red-200 px-2 py-1 rounded-lg bg-white hover:bg-red-50 transition-colors"
              style={{ cursor: 'pointer' }}
            >
              <X size={10} /> Clear
            </button>
          </>
        ) : (
          <span className="text-xs text-slate-400">{totalCount} players</span>
        )}
      </div>
    </div>
  );
};

// ── Pagination controls ───────────────────────────────────────────────────────
const PAGE_SIZE_OPTIONS = [10, 25];

const Pagination = ({ page, total, pageSize, onChange, onPageSizeChange }) => {
  const totalPages = Math.ceil(total / pageSize);
  return (
    <div className="flex items-center justify-between mt-4 px-1 flex-wrap gap-2">
      {/* Left: row count info + page-size picker */}
      <div className="flex items-center gap-3">
        <span className="text-xs text-slate-400 font-mono">
          {total === 0
            ? 'No players'
            : `${Math.min((page - 1) * pageSize + 1, total)}–${Math.min(page * pageSize, total)} of ${total}`}
        </span>
        {onPageSizeChange && (
          <div className="flex items-center gap-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Rows</span>
            {PAGE_SIZE_OPTIONS.map(size => (
              <button
                key={size}
                onClick={() => { onPageSizeChange(size); onChange(1); }}
                className={`px-2 py-0.5 text-xs font-bold rounded border transition-colors ${
                  pageSize === size
                    ? 'bg-emerald-600 text-white border-emerald-600'
                    : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
                }`}
                style={{ cursor: 'pointer' }}
              >{size}</button>
            ))}
          </div>
        )}
      </div>

      {/* Right: page nav (hidden when only 1 page) */}
      {totalPages > 1 && (
        <div className="flex items-center gap-1">
          <button
            onClick={() => onChange(1)}
            disabled={page === 1}
            className="px-2 py-1 text-xs font-bold rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 disabled:opacity-30 transition-colors"
            style={{ cursor: page === 1 ? 'not-allowed' : 'pointer' }}
          >«</button>
          <button
            onClick={() => onChange(page - 1)}
            disabled={page === 1}
            className="px-2 py-1 text-xs font-bold rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 disabled:opacity-30 transition-colors"
            style={{ cursor: page === 1 ? 'not-allowed' : 'pointer' }}
          >‹</button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map(pg => (
            <button
              key={pg}
              onClick={() => onChange(pg)}
              className={`px-2.5 py-1 text-xs font-bold rounded-lg border transition-colors ${
                pg === page
                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                  : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
              }`}
              style={{ cursor: 'pointer' }}
            >{pg}</button>
          ))}
          <button
            onClick={() => onChange(page + 1)}
            disabled={page === totalPages}
            className="px-2 py-1 text-xs font-bold rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 disabled:opacity-30 transition-colors"
            style={{ cursor: page === totalPages ? 'not-allowed' : 'pointer' }}
          >›</button>
          <button
            onClick={() => onChange(totalPages)}
            disabled={page === totalPages}
            className="px-2 py-1 text-xs font-bold rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 disabled:opacity-30 transition-colors"
            style={{ cursor: page === totalPages ? 'not-allowed' : 'pointer' }}
          >»</button>
        </div>
      )}
    </div>
  );
};

// ── Basic rankings table (simple, no impact score) ────────────────────────────
const BasicTable = ({ data, type }) => {
  const [sortKey, setSortKey] = useState(type === 'batsmen' ? 'runs_per_innings' : 'wickets_per_innings');
  const [sortDir, setSortDir] = useState('desc');
  const [page,    setPage]    = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const sorted = useMemo(() => [...data].sort((a, b) => {
    const va = a[sortKey], vb = b[sortKey];
    return sortDir === 'asc' ? va - vb : vb - va;
  }), [data, sortKey, sortDir]);

  const handleSort = (k) => {
    if (sortKey === k) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(k); setSortDir('desc'); }
    setPage(1);
  };

  const paginated = sorted.slice((page - 1) * pageSize, page * pageSize);

  const Th = ({ k, children }) => (
    <th
      onClick={() => handleSort(k)}
      className="px-4 py-3 text-xs font-black uppercase tracking-widest text-slate-400 cursor-pointer hover:text-slate-600 hover:bg-slate-100 transition-colors select-none text-center whitespace-nowrap"
    >
      <span className="inline-flex items-center gap-1 justify-center">
        {children}
        {sortKey === k && (sortDir === 'asc' ? <ArrowUp size={9} className="text-emerald-600" /> : <ArrowDown size={9} className="text-emerald-600" />)}
      </span>
    </th>
  );

  return (
    <div>
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm border-collapse">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-4 py-3 text-xs font-black uppercase tracking-widest text-slate-400 text-center">#</th>
              <th className="px-5 py-3 text-xs font-black uppercase tracking-widest text-slate-400">Player</th>
              <Th k="innings">Inn</Th>
              {type === 'batsmen' ? <Th k="runs_per_innings">Runs/Inn</Th> : <Th k="wickets_per_innings">Wkts/Inn</Th>}
              {type === 'batsmen' ? <Th k="total_runs">Total Runs</Th> : <Th k="total_wickets">Total Wkts</Th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {paginated.map((row) => (
              <tr key={row.player_name} className={`hover:bg-slate-50 transition-colors ${row.basic_rank <= 3 ? 'bg-emerald-50/30' : ''}`}>
                <td className="px-4 py-3 text-center">
                  {row.basic_rank <= 3
                    ? <RankMedal rank={row.basic_rank} />
                    : <span className="font-mono text-sm text-slate-400">{row.basic_rank}</span>}
                </td>
                <td className="px-5 py-3 font-semibold text-slate-800 text-base">{row.player_name}</td>
                <td className="px-4 py-3 text-center font-mono text-sm text-slate-500">{row.innings}</td>
                <td className="px-4 py-3 text-center font-mono font-bold text-slate-800 text-sm">
                  {type === 'batsmen'
                    ? (row.runs_per_innings ?? 0).toFixed(2)
                    : (row.wickets_per_innings ?? 0).toFixed(4)}
                </td>
                <td className="px-4 py-3 text-center font-mono text-sm text-slate-500">
                  {type === 'batsmen' ? row.total_runs : row.total_wickets}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pagination
        page={page} total={sorted.length} pageSize={pageSize}
        onChange={setPage} onPageSizeChange={setPageSize}
      />
    </div>
  );
};

// ── Impact rankings table ─────────────────────────────────────────────────────
const RankTable = ({ data, type }) => {
  const [sortKey,  setSortKey]  = useState('impact_rank');
  const [sortDir,  setSortDir]  = useState('asc');
  const [page,     setPage]     = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const sorted = useMemo(() => [...data].sort((a, b) => {
    const va = a[sortKey], vb = b[sortKey];
    if (typeof va === 'number') return sortDir === 'asc' ? va - vb : vb - va;
    return sortDir === 'asc'
      ? String(va ?? '').localeCompare(String(vb ?? ''))
      : String(vb ?? '').localeCompare(String(va ?? ''));
  }), [data, sortKey, sortDir]);

  const toggleSort = (key) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir(key === 'impact_rank' || key === 'basic_rank' ? 'asc' : 'desc'); }
    setPage(1);
  };

  const paginated = sorted.slice((page - 1) * pageSize, page * pageSize);

  const SortTh = ({ k, children, title }) => (
    <th
      onClick={() => toggleSort(k)}
      title={title}
      className="px-4 py-4 text-xs font-black uppercase tracking-widest text-slate-400 cursor-pointer hover:text-slate-600 hover:bg-slate-100 transition-colors select-none text-center whitespace-nowrap"
    >
      <span className="inline-flex items-center gap-1 justify-center">
        {children}
        {sortKey === k && (sortDir === 'asc' ? <ArrowUp size={9} className="text-emerald-600" /> : <ArrowDown size={9} className="text-emerald-600" />)}
      </span>
    </th>
  );

  return (
    <div>
      <div className="overflow-x-auto rounded-2xl border border-slate-200 shadow-sm bg-white">
        <table className="w-full text-left border-collapse text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <SortTh k="impact_rank" title="Impact Rank">Rank</SortTh>
              <th className="px-4 py-4 text-xs font-black uppercase tracking-widest text-slate-400 text-center">Δ</th>
              <th className="px-5 py-4 text-xs font-black uppercase tracking-widest text-slate-400">Player</th>
              <SortTh k="innings"        title="Innings played">Inn</SortTh>
              <SortTh k="matches_played" title="Matches played">Matches</SortTh>
              <SortTh k="last_played"    title="Year of last match">Last Yr</SortTh>
              <SortTh k="basic_rank"     title="Basic rank">Basic #</SortTh>
              {type === 'batsmen'
                ? <SortTh k="runs_per_innings"    title="Runs per innings">Runs/Inn</SortTh>
                : <SortTh k="wickets_per_innings" title="Wickets per innings">Wkts/Inn</SortTh>}
              <SortTh k="impact_avg" title="Quality-weighted impact per innings">Impact/Inn</SortTh>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {paginated.map((row) => {
              const isTop3 = row.impact_rank <= 3;
              return (
                <tr key={row.player_name} className={`transition-colors ${isTop3 ? 'bg-emerald-50/40 hover:bg-emerald-50' : 'hover:bg-slate-50'}`}>
                  <td className="px-4 py-4 text-center"><RankMedal rank={row.impact_rank} /></td>
                  <td className="px-4 py-4 text-center"><Delta change={row.rank_change} /></td>
                  <td className="px-5 py-4">
                    <div>
                      <span className={`font-semibold text-base ${isTop3 ? 'text-slate-900 font-black' : 'text-slate-800'}`}>
                        {row.player_name}
                      </span>
                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                        <CountryBadge country={row.country} />
                        <RoleBadge role={row.role} />
                        <ActiveBadge last_played={row.last_played} />
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4 text-center font-mono text-slate-600 text-sm">{row.innings}</td>
                  <td className="px-4 py-4 text-center font-mono text-slate-600 text-sm">{row.matches_played || '—'}</td>
                  <td className="px-4 py-4 text-center">
                    <span className={`text-sm font-mono font-bold ${
                      parseInt(row.last_played) >= CURRENT_YEAR - 1 ? 'text-emerald-700'
                      : parseInt(row.last_played) >= 2010 ? 'text-slate-600'
                      : 'text-slate-400'
                    }`}>
                      {row.last_played || '—'}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-center">
                    <span className="text-sm font-mono text-slate-500 bg-slate-100 px-3 py-1 rounded-md">#{row.basic_rank}</span>
                  </td>
                  <td className="px-4 py-4 text-center font-mono text-slate-700 text-base">
                    {type === 'batsmen'
                      ? (row.runs_per_innings ?? 0).toFixed(2)
                      : (row.wickets_per_innings ?? 0).toFixed(4)}
                  </td>
                  <td className="px-4 py-4 text-center">
                    <span className={`font-black font-mono text-base px-3 py-1 rounded-lg ${
                      row.impact_rank <= 10 ? 'text-emerald-700 bg-emerald-100'
                      : row.impact_rank <= 30 ? 'text-emerald-600'
                      : 'text-slate-600'
                    }`}>
                      {(row.impact_avg ?? 0).toFixed(2)}
                    </span>
                  </td>
                </tr>
              );
            })}
            {sorted.length === 0 && (
              <tr><td colSpan={9} className="px-6 py-10 text-center text-slate-400 text-sm">No players match the current filters.</td></tr>
            )}
          </tbody>
        </table>
      </div>
      <Pagination
        page={page} total={sorted.length} pageSize={pageSize}
        onChange={setPage} onPageSizeChange={setPageSize}
      />
    </div>
  );
};

// ── Confirmation modal ────────────────────────────────────────────────────────
const SavedRankingsModal = ({ savedRankings, onUseSaved, onRecalculate }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}>
    <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-md w-full mx-4 border border-slate-200">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
          <Save size={20} className="text-amber-600" />
        </div>
        <div>
          <h3 className="font-black text-slate-900 text-base m-0">Saved Rankings Found</h3>
          <p className="text-slate-400 text-xs m-0 mt-0.5">Choose how to proceed</p>
        </div>
      </div>

      <div className="bg-slate-50 rounded-xl p-4 mb-5 border border-slate-200">
        <p className="text-xs text-slate-500 m-0">
          <span className="font-bold text-slate-700">Last computed:</span> {formatDate(savedRankings.savedAt)}
        </p>
        {savedRankings.params && (
          <p className="text-[11px] font-mono text-slate-400 mt-1.5 m-0">
            p={savedRankings.params.p} · α={savedRankings.params.alpha} · β={savedRankings.params.beta} · inn≥{savedRankings.params.minInnings} · {savedRankings.params.iterations} iteration{savedRankings.params.iterations > 1 ? 's' : ''}
          </p>
        )}
        <p className="text-[11px] text-slate-400 mt-1 m-0">
          {savedRankings.batsmen?.length ?? 0} batsmen · {savedRankings.bowlers?.length ?? 0} bowlers
        </p>
      </div>

      <div className="flex gap-3">
        <button
          onClick={onUseSaved}
          className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-black text-sm bg-emerald-600 text-white hover:bg-emerald-700 transition-colors shadow-sm"
          style={{ border: 'none', cursor: 'pointer' }}
        >
          <Save size={15} /> Use Saved Rankings
        </button>
        <button
          onClick={onRecalculate}
          className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors bg-white"
          style={{ cursor: 'pointer' }}
        >
          <RefreshCw size={15} /> Recompute
        </button>
      </div>
    </div>
  </div>
);

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function RankingsPage() {
  // Model parameters
  const [p,          setP]          = useState(1.5);
  const [alpha,      setAlpha]      = useState(25);
  const [beta,       setBeta]       = useState(0.5);
  const [minInnings, setMinInnings] = useState(20);
  const [iterations, setIterations] = useState(1);

  // Computation state
  const [computing,  setComputing]  = useState(false);
  const [progress,   setProgress]   = useState(0);
  const [statusLog,  setStatusLog]  = useState([]);
  const [batsmen,    setBatsmen]    = useState([]);
  const [bowlers,    setBowlers]    = useState([]);
  const [activeTab,  setActiveTab]  = useState('batsmen');
  const [error,      setError]      = useState(null);
  const [computed,   setComputed]   = useState(false);

  // Basic rankings (loaded on mount)
  const [basicBatsmen, setBasicBatsmen] = useState([]);
  const [basicBowlers, setBasicBowlers] = useState([]);
  const [basicTab,     setBasicTab]     = useState('batsmen');
  const [basicLoading, setBasicLoading] = useState(true);
  const [configTab,    setConfigTab]    = useState('base');  // 'base' or 'params'

  // Saved rankings + modal
  const [savedRankings,  setSavedRankings]  = useState(null);
  const [showSavedModal, setShowSavedModal] = useState(false);
  const [savedAt,        setSavedAt]        = useState(null);
  const [usedSaved,      setUsedSaved]      = useState(false);

  // Filters
  const [filterCountry,    setFilterCountry]    = useState('');
  const [filterMinYear,    setFilterMinYear]    = useState('');
  const [filterMinMatches, setFilterMinMatches] = useState(0);

  const esRef     = useRef(null);
  const logEndRef = useRef(null);

  // ── On mount: load basic rankings + check for saved rankings ─────────────
  useEffect(() => {
    fetch(`/api/rankings?action=basic&minInnings=${minInnings}`)
      .then(r => r.json())
      .then(data => {
        setBasicBatsmen(data.batsmen ?? []);
        setBasicBowlers(data.bowlers ?? []);
        setBasicLoading(false);
      })
      .catch(() => setBasicLoading(false));

    fetch('/api/rankings?action=load')
      .then(r => r.json())
      .then(data => {
        if (data.found) {
          setSavedRankings(data);
          setShowSavedModal(true);
        }
      })
      .catch(() => {});
  }, []);   // eslint-disable-line

  // ── Derived filtered data ─────────────────────────────────────────────────
  //
  // Country-minimum rule: when a country filter is active, always show at
  // least 11 players from that country (by impact_rank ascending), even if
  // they don't pass the minYear / minMatches filters.
  const applyFilters = useCallback((list) => {
    if (!filterCountry) {
      return list.filter(p => {
        if (filterMinYear    && p.last_played && parseInt(p.last_played) < parseInt(filterMinYear)) return false;
        if (filterMinMatches && p.matches_played < filterMinMatches)                                return false;
        return true;
      });
    }

    const countryPlayers = [...list]
      .filter(p => p.country === filterCountry)
      .sort((a, b) => (a.impact_rank ?? 9999) - (b.impact_rank ?? 9999));

    const guaranteedSet = new Set(countryPlayers.slice(0, 11).map(p => p.player_name));

    return countryPlayers.filter(p => {
      if (guaranteedSet.has(p.player_name)) return true;
      if (filterMinYear    && p.last_played && parseInt(p.last_played) < parseInt(filterMinYear)) return false;
      if (filterMinMatches && p.matches_played < filterMinMatches)                                return false;
      return true;
    });
  }, [filterCountry, filterMinYear, filterMinMatches]);

  const filteredBatsmen = useMemo(() => applyFilters(batsmen), [batsmen, applyFilters]);
  const filteredBowlers = useMemo(() => applyFilters(bowlers), [bowlers, applyFilters]);

  const allCountries = useMemo(() => {
    const set = new Set([...batsmen, ...bowlers].map(p => p.country).filter(Boolean));
    return Array.from(set).sort();
  }, [batsmen, bowlers]);

  const clearFilters = () => { setFilterCountry(''); setFilterMinYear(''); setFilterMinMatches(0); };

  const currentTotal    = activeTab === 'batsmen' ? batsmen.length    : bowlers.length;
  const currentFiltered = activeTab === 'batsmen' ? filteredBatsmen.length : filteredBowlers.length;

  // ── Saved rankings actions ────────────────────────────────────────────────
  const handleUseSaved = () => {
    setBatsmen(savedRankings.batsmen ?? []);
    setBowlers(savedRankings.bowlers ?? []);
    setSavedAt(savedRankings.savedAt);
    setUsedSaved(true);
    setComputed(true);
    setConfigTab('params'); // results live inside the Model Parameters tab
    setShowSavedModal(false);
    clearFilters();
  };

  const handleRecalculate = () => {
    setShowSavedModal(false);
    setConfigTab('params');
  };

  // ── SSE log ───────────────────────────────────────────────────────────────
  const appendLog = useCallback((msg) => {
    setStatusLog(prev => [...prev.slice(-19), msg]);
    setTimeout(() => logEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
  }, []);

  // ── Compute ───────────────────────────────────────────────────────────────
  const handleCompute = () => {
    if (esRef.current) { esRef.current.close(); esRef.current = null; }
    setComputing(true);
    setProgress(0);
    setStatusLog(['⏳ Starting computation…']);
    setBatsmen([]); setBowlers([]);
    setError(null); setComputed(false);
    setUsedSaved(false); setSavedAt(null);
    clearFilters();

    const url = `/api/rankings?p=${p}&alpha=${alpha}&beta=${beta}&minInnings=${minInnings}&iterations=${iterations}`;
    const es  = new EventSource(url);
    esRef.current = es;

    es.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.phase === 'status') {
        setProgress(data.progress ?? 0);
        appendLog(`  ${data.message}`);
      } else if (data.phase === 'done') {
        setProgress(100);
        appendLog(`✅ ${data.message}`);
        setBatsmen(data.batsmen ?? []);
        setBowlers(data.bowlers ?? []);
        setSavedAt(data.savedAt ?? null);
        setSavedRankings({ found: true, savedAt: data.savedAt, params: data.params, batsmen: data.batsmen ?? [], bowlers: data.bowlers ?? [] });
        setComputed(true); setComputing(false); // stay on 'params' tab — results live there
        es.close(); esRef.current = null;
      } else if (data.phase === 'error') {
        setError(data.message);
        appendLog(`❌ Error: ${data.message}`);
        setComputing(false);
        es.close(); esRef.current = null;
      }
    };

    es.onerror = () => {
      if (esRef.current) {
        setError('Server connection lost. Make sure the dev server is running.');
        appendLog('❌ Connection lost.');
        setComputing(false);
        es.close(); esRef.current = null;
      }
    };
  };

  const handleCancel = () => {
    if (esRef.current) { esRef.current.close(); esRef.current = null; }
    setComputing(false);
    appendLog('🚫 Cancelled.');
  };

  const handleReset = () => {
    setComputed(false); setConfigTab('params');
    setBatsmen([]); setBowlers([]);
    setSavedAt(null); setUsedSaved(false);
    clearFilters();
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="flex-1 overflow-y-auto p-8 custom-scrollbar" style={{ maxHeight: '100%' }}>

      {/* Confirmation modal */}
      {showSavedModal && savedRankings && (
        <SavedRankingsModal
          savedRankings={savedRankings}
          onUseSaved={handleUseSaved}
          onRecalculate={handleRecalculate}
        />
      )}

      <div className="max-w-6xl mx-auto space-y-6">

        {/* ── Page header ─────────────────────────────────────────────────── */}
        <div className="flex items-start justify-between pb-2">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Trophy size={26} className="text-emerald-600" />
              <h2 className="text-3xl font-black text-slate-900 m-0">Impact Rankings</h2>
            </div>
            <p className="text-slate-500 text-base m-0" style={{ marginLeft: '2.25rem' }}>
              Quality-weighted rankings — runs and wickets count more against elite opposition.
            </p>
          </div>
          {computed && (
            <button
              onClick={handleReset}
              className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-800 border border-slate-200 px-4 py-2 rounded-lg bg-white transition-colors"
              style={{ cursor: 'pointer' }}
            >
              <RefreshCw size={14} /> Reset
            </button>
          )}
        </div>

        {/* ── Single card with two tabs ────────────────────────────────────── */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">

          {/* Tab header — side by side */}
          <div className="flex border-b border-slate-200">
            {[
              { id: 'base',   label: '📊 Base Rankings',    subtitle: 'Runs/inn · Wickets/inn · No weighting' },
              { id: 'params', label: '⚡ Model Parameters', subtitle: `p=${p} · α=${alpha} · β=${beta} · inn≥${minInnings}` },
            ].map(({ id, label, subtitle }) => (
              <button
                key={id}
                onClick={() => setConfigTab(id)}
                className={`flex-1 flex flex-col items-start px-6 py-4 text-left transition-colors ${
                  configTab === id ? 'bg-emerald-50' : 'bg-white hover:bg-slate-50'
                }`}
                style={{
                  cursor: 'pointer',
                  border: 'none',
                  borderBottom: configTab === id ? '2px solid #059669' : '2px solid transparent',
                }}
              >
                <span className={`font-black text-sm ${configTab === id ? 'text-slate-900' : 'text-slate-500'}`}>{label}</span>
                <span className="text-[11px] text-slate-400 font-mono mt-0.5">{subtitle}</span>
              </button>
            ))}
          </div>

          {/* ── Tab: Base Rankings ──────────────────────────────────────────── */}
          {configTab === 'base' && (
            <div className="px-6 pb-6">
              <div className="flex items-center gap-3 mt-5 mb-4">
                {[
                  { id: 'batsmen', label: `🏏 Batsmen (${basicBatsmen.length})` },
                  { id: 'bowlers', label: `⚡ Bowlers (${basicBowlers.length})` },
                ].map(({ id, label }) => (
                  <button
                    key={id}
                    onClick={() => setBasicTab(id)}
                    className={`px-5 py-2.5 rounded-xl font-bold text-sm transition-all ${
                      basicTab === id
                        ? 'bg-emerald-50 text-slate-900'
                        : 'bg-white text-slate-500 hover:text-slate-700'
                    }`}
                    style={{
                      cursor: 'pointer',
                      border: 'none',
                      borderBottom: basicTab === id ? '2px solid #059669' : '2px solid transparent',
                    }}
                  >
                    {label}
                  </button>
                ))}
                <span className="text-xs text-slate-400 ml-2">Switch to ⚡ Model Parameters for quality-weighted rankings</span>
              </div>

              {basicLoading ? (
                <div className="py-8 text-center text-slate-400 text-sm animate-pulse">Loading base rankings…</div>
              ) : basicTab === 'batsmen' ? (
                <BasicTable data={basicBatsmen} type="batsmen" />
              ) : (
                <BasicTable data={basicBowlers} type="bowlers" />
              )}
            </div>
          )}

          {/* ── Tab: Model Parameters (owns config + all results) ────────────── */}
          {configTab === 'params' && (
            <div className="px-6 pb-6">
              {/* Formula */}
              <div className="mt-5 mb-5 p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-500 font-mono leading-relaxed">
                <span className="font-black text-slate-700 not-italic">Batsman:</span> Impact = Σ(runs × (1/bowler_rank)<b>p</b>) / innings<br />
                <span className="font-black text-slate-700 not-italic">Bowler: </span> Impact = Σ((wickets×<b>α</b> − runs_faced×<b>β</b>) × (1/batsman_rank)<b>p</b>) / innings<br />
                <span className="text-slate-400">Ranks capped at 100</span>
              </div>

              {/* Sliders */}
              <div className="grid grid-cols-2 gap-x-8 gap-y-5" style={{ gridTemplateColumns: '1fr 1fr' }}>
                <Slider label="Power Exponent (p)" hint="Higher p → top-ranked opposition counts much more" value={p} min={1.0} max={3.0} step={0.1} onChange={setP} format={v => v.toFixed(1)} />
                <Slider label="Min Innings to Qualify" hint="Filters out players with too few innings" value={minInnings} min={10} max={50} step={5} onChange={setMinInnings} />
                <Slider label="α — Wicket Credit (bowlers)" hint="How much each wicket of a top-ranked batsman is worth" value={alpha} min={5} max={50} step={1} onChange={setAlpha} />
                <Slider label="β — Run Penalty (bowlers)" hint="Penalises runs conceded to top-ranked batsmen" value={beta} min={0} max={2.0} step={0.1} onChange={setBeta} format={v => v.toFixed(1)} />
              </div>

              {/* Iterations */}
              <div className="mt-5">
                <label className="text-xs font-black text-slate-600 block mb-2">Refinement Iterations</label>
                <div className="flex gap-2">
                  {[1, 2].map(n => (
                    <button key={n} onClick={() => setIterations(n)}
                      className={`flex-1 py-2.5 rounded-xl border font-black text-sm transition-all ${iterations === n ? 'bg-emerald-600 text-white border-emerald-600 shadow-md' : 'bg-white text-slate-600 border-slate-200 hover:border-emerald-400 hover:text-emerald-600'}`}
                      style={{ cursor: 'pointer' }}>
                      {n === 1 ? '1 — Standard' : '2 — Refined (slower)'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Compute / Cancel */}
              <div className="mt-6 flex gap-3">
                <button
                  onClick={handleCompute}
                  disabled={computing}
                  className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-black text-sm shadow-sm"
                  style={{ background: computing ? '#94a3b8' : '#059669', color: '#fff', border: 'none', cursor: computing ? 'not-allowed' : 'pointer' }}
                >
                  {computing ? <><RefreshCw size={15} className="animate-spin" /> Computing…</> : <><Play size={15} /> Compute Impact Rankings</>}
                </button>
                {computing && (
                  <button onClick={handleCancel}
                    className="px-5 py-3 rounded-xl border border-red-200 text-red-600 font-bold text-sm hover:bg-red-50 transition-colors"
                    style={{ cursor: 'pointer', background: 'white' }}>
                    <X size={15} />
                  </button>
                )}
              </div>

              {/* Progress + log */}
              {(computing || statusLog.length > 0) && (
                <div className="mt-6 bg-slate-50 border border-slate-200 rounded-2xl p-5">
                  {computing && (
                    <div className="mb-3">
                      <div className="flex justify-between text-xs text-slate-500 mb-1.5">
                        <span className="font-bold">Running…</span>
                        <span className="font-mono">{progress}%</span>
                      </div>
                      <ProgressBar pct={progress} />
                    </div>
                  )}
                  <div className="font-mono text-xs text-slate-600 space-y-0.5 max-h-36 overflow-y-auto custom-scrollbar" style={{ lineHeight: '1.6' }}>
                    {statusLog.map((msg, i) => (
                      <div key={i} className={msg.startsWith('✅') ? 'text-emerald-600 font-bold' : msg.startsWith('❌') ? 'text-red-500' : msg.startsWith('🚫') ? 'text-slate-400' : ''}>{msg}</div>
                    ))}
                    <div ref={logEndRef} />
                  </div>
                </div>
              )}

              {/* Error */}
              {error && (
                <div className="mt-4 bg-red-50 border border-red-200 rounded-2xl p-5 flex items-start gap-3">
                  <Info size={18} className="shrink-0 mt-0.5 text-red-500" />
                  <div>
                    <p className="font-black text-red-700 m-0 text-sm">Computation Failed</p>
                    <p className="m-0 mt-1 font-medium text-red-600 text-sm">{error}</p>
                  </div>
                </div>
              )}

              {/* Impact Rankings Results — contained within this tab */}
              {computed && (batsmen.length > 0 || bowlers.length > 0) && (
                <div className="mt-6">
                  {/* Batsmen / Bowlers sub-tabs + source badge */}
                  <div className="flex flex-wrap gap-3 mb-5 items-center">
                    {[
                      { id: 'batsmen', label: `🏏 Batsmen (${batsmen.length})` },
                      { id: 'bowlers', label: `⚡ Bowlers (${bowlers.length})` },
                    ].map(({ id, label }) => (
                      <button key={id} onClick={() => setActiveTab(id)}
                        className={`px-6 py-3 rounded-xl font-bold text-sm transition-all ${activeTab === id ? 'bg-emerald-600 text-white shadow-md' : 'bg-white text-slate-600 border border-slate-200 hover:border-emerald-400 hover:text-emerald-600'}`}
                        style={{ cursor: 'pointer', border: activeTab === id ? 'none' : undefined }}>
                        {label}
                      </button>
                    ))}
                    <div className="flex items-center gap-4 text-sm text-slate-400">
                      <span className="flex items-center gap-1.5"><ArrowUp size={13} className="text-emerald-600" /> Moved up</span>
                      <span className="flex items-center gap-1.5"><ArrowDown size={13} className="text-red-400" /> Moved down</span>
                    </div>
                    <div className="ml-auto flex items-center gap-2 text-xs text-slate-400 font-mono bg-slate-50 border border-slate-200 px-3 py-2 rounded-lg">
                      {usedSaved
                        ? <><Save size={12} className="text-amber-500" /> Saved · {formatDate(savedAt)}</>
                        : <><Zap size={12} className="text-emerald-500" /> Live · {formatDate(savedAt)}</>}
                    </div>
                  </div>

                  {/* Role legend */}
                  <div className="bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 mb-4">
                    <div className="flex flex-wrap gap-2 items-center mb-2">
                      {Object.entries(ROLE_CONFIG).map(([role, cfg]) => (
                        <span key={role} className={`text-xs font-bold uppercase border px-2.5 py-1 rounded-lg ${cfg.cls}`}>{cfg.label}</span>
                      ))}
                      <span className="inline-flex items-center gap-1.5 text-xs font-black uppercase text-emerald-600 bg-emerald-50 border border-emerald-300 px-2.5 py-1 rounded-lg">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" /> ACTIVE
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 m-0">P-BOW = ≥50 career wkts · AR = ≥1500 career runs · ACTIVE = last played {CURRENT_YEAR - 1}/{CURRENT_YEAR}</p>
                  </div>

                  {/* Filters */}
                  <FiltersBar
                    allCountries={allCountries}
                    filterCountry={filterCountry}       onCountryChange={setFilterCountry}
                    filterMinYear={filterMinYear}        onMinYearChange={setFilterMinYear}
                    filterMinMatches={filterMinMatches}  onMinMatchesChange={setFilterMinMatches}
                    onClear={clearFilters}
                    totalCount={currentTotal}
                    filteredCount={currentFiltered}
                  />

                  {/* Table */}
                  {activeTab === 'batsmen' && <RankTable data={filteredBatsmen} type="batsmen" />}
                  {activeTab === 'bowlers' && <RankTable data={filteredBowlers} type="bowlers" />}
                </div>
              )}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
