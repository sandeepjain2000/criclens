"use client";
import React, { useState, useEffect, useMemo } from 'react';
import {
  Search, Users, X, ChevronDown, Copy, Shield, Zap, Activity,
  UserCheck, AlertCircle, RefreshCw, Sparkles, TrendingUp, Info
} from 'lucide-react';

// ── Constants ────────────────────────────────────────────────────────────────

const FORMATS = [
  { key: 'T20I', apiKey: 't20i', label: 'T20 Internationals', icon: Zap,      color: 'amber'  },
  { key: 'ODI',  apiKey: 'odi',  label: 'ODI / Limited Overs', icon: Activity, color: 'indigo' },
  { key: 'Test', apiKey: 'test', label: 'Test Matches',        icon: Shield,   color: 'emerald'},
];

const ROLE_COLORS = {
  BAT:     'text-emerald-700 bg-emerald-50 border-emerald-200',
  WK:      'text-sky-700     bg-sky-50     border-sky-200',
  AR:      'text-purple-700  bg-purple-50  border-purple-200',
  BWL:     'text-blue-700    bg-blue-50    border-blue-200',
  'P-BOW': 'text-orange-700  bg-orange-50  border-orange-200',
};

const STATUS_COLORS = {
  'Active':       'text-emerald-700 bg-emerald-50 border-emerald-200',
  'Out 2Y+':      'text-amber-700   bg-amber-50   border-amber-200',
  'Retired':      'text-slate-500   bg-slate-100  border-slate-200',
  'Never Played': 'text-slate-400   bg-slate-50   border-slate-100',
};

const RANK_LABEL_COLORS = {
  'Batsman':     'bg-emerald-100 text-emerald-700',
  'WK':          'bg-sky-100     text-sky-700',
  'All-Rounder': 'bg-purple-100  text-purple-700',
  'Pace Bowler': 'bg-orange-100  text-orange-700',
  'Spin Bowler': 'bg-indigo-100  text-indigo-700',
};

const MAX_SQUAD = 11;

// Default role requirements
const DEFAULT_REQS = { batsmen: 4, wk: 1, allRounders: 2, paceBowlers: 2, spinBowlers: 2 };

const ROLE_FIELDS = [
  { key: 'batsmen',     label: 'Batsmen',      icon: '🏏', color: 'emerald', hint: 'Pure batters (BAT)' },
  { key: 'wk',         label: 'Wicket-Keeper', icon: '🧤', color: 'sky',     hint: 'WK role players' },
  { key: 'allRounders',label: 'All-Rounders',  icon: '✦',  color: 'purple',  hint: 'AR role players' },
  { key: 'paceBowlers',label: 'Pace Bowlers',  icon: '⚡', color: 'orange',  hint: 'Fast / medium pace' },
  { key: 'spinBowlers',label: 'Spin Bowlers',  icon: '🌀', color: 'indigo',  hint: 'Off-break / leg-spin / orthodox' },
];

// ── Helpers ──────────────────────────────────────────────────────────────────

function exportSquad(squad, format) {
  const lines = [
    `CricLens Team Selector — ${format} XI`,
    '='.repeat(42),
    ...squad.map((p, i) =>
      `${i + 1}. ${p.player_name.padEnd(28)} ${(p.rank_label || p.playing_role).padEnd(16)} ${p.nationality}`
    ),
    '',
    `Ranking: ${squad[0]?.rank_score !== undefined ? 'DB-ranked by performance' : 'manual selection'}`,
    `Generated: ${new Date().toLocaleString()}`,
  ];
  navigator.clipboard.writeText(lines.join('\n'));
}

function squadValidation(squad) {
  const issues = [];
  const hasWK   = squad.some(p => p.playing_role === 'WK');
  const bowlers = squad.filter(p => ['BWL','P-BOW','AR'].includes(p.playing_role)).length;
  const batters = squad.filter(p => ['BAT','WK'].includes(p.playing_role)).length;
  if (!hasWK)      issues.push('No wicket-keeper selected');
  if (bowlers < 3) issues.push(`Only ${bowlers} bowler(s) — need at least 3`);
  if (batters < 4) issues.push(`Only ${batters} batter(s) — need at least 4`);
  return issues;
}

// ── Sub-components ───────────────────────────────────────────────────────────

function RoleCounter({ field, value, onChange, total }) {
  const atMax = total >= MAX_SQUAD;
  return (
    <div className="flex items-center justify-between bg-white border border-slate-200 rounded-xl px-4 py-3 shadow-sm">
      <div className="flex items-center gap-3">
        <span className="text-xl">{field.icon}</span>
        <div>
          <div className="font-black text-slate-800 text-sm">{field.label}</div>
          <div className="text-[10px] text-slate-400">{field.hint}</div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={() => onChange(Math.max(0, value - 1))}
          disabled={value === 0}
          className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 font-black text-slate-600 flex items-center justify-center transition-all disabled:opacity-30 cursor-pointer"
        >−</button>
        <span className="w-6 text-center font-black text-slate-900 text-lg">{value}</span>
        <button
          onClick={() => onChange(value + 1)}
          disabled={atMax}
          className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-emerald-100 hover:text-emerald-700 font-black text-slate-600 flex items-center justify-center transition-all disabled:opacity-30 cursor-pointer"
        >+</button>
      </div>
    </div>
  );
}

function SquadCard({ player, index, onRemove, isAuto }) {
  const roleClass  = ROLE_COLORS[player.playing_role]  || 'text-slate-600 bg-slate-50 border-slate-200';
  const labelClass = RANK_LABEL_COLORS[player.rank_label] || 'bg-slate-100 text-slate-500';
  return (
    <div className="flex items-center gap-3 px-4 py-3 bg-white border border-slate-200 rounded-xl shadow-sm hover:border-emerald-300 transition-all group">
      <span className="text-xs font-mono text-slate-400 w-5 text-right shrink-0">{index + 1}</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-black text-slate-800 text-sm">{player.player_name}</span>
          {player.rank_label && (
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${labelClass}`}>{player.rank_label}</span>
          )}
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-xs text-slate-400">{player.nationality}</span>
          {player.rank_score !== undefined && (
            <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-0.5">
              <TrendingUp size={9}/> {player.rank_score}
            </span>
          )}
        </div>
      </div>
      <span className={`text-[10px] font-black uppercase border px-1.5 py-0.5 rounded shrink-0 ${roleClass}`}>
        {player.playing_role}
      </span>
      <button onClick={() => onRemove(player)}
        className="text-slate-300 hover:text-red-500 transition-colors cursor-pointer opacity-0 group-hover:opacity-100 shrink-0">
        <X size={14} />
      </button>
    </div>
  );
}

function PlayerRow({ player, inSquad, onAdd, onRemove }) {
  const roleClass   = ROLE_COLORS[player.playing_role]  || 'text-slate-600 bg-slate-50 border-slate-200';
  const statusClass = STATUS_COLORS[player.intl_status] || 'text-slate-400 bg-slate-50 border-slate-100';
  return (
    <div className={`flex items-center gap-3 px-4 py-3 border-b border-slate-100 hover:bg-slate-50 transition-colors ${inSquad ? 'bg-emerald-50/40' : ''}`}>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-bold text-slate-800 text-sm">{player.player_name}</span>
          <span className={`text-[10px] font-black uppercase border px-1.5 py-0.5 rounded ${roleClass}`}>{player.playing_role || '—'}</span>
          {player.intl_status && (
            <span className={`text-[10px] font-bold border px-1.5 py-0.5 rounded ${statusClass}`}>{player.intl_status}</span>
          )}
        </div>
        <div className="text-xs text-slate-400 mt-0.5 flex gap-2">
          <span>{player.nationality}</span>
          {player.batting_style && <span>· {player.batting_style}</span>}
          {player.bowling_type  && <span>· {player.bowling_type}</span>}
        </div>
      </div>
      {inSquad ? (
        <button onClick={() => onRemove(player)} className="text-xs font-bold text-red-500 border border-red-200 hover:bg-red-50 px-2 py-1.5 rounded-lg cursor-pointer flex items-center gap-1">
          <X size={11}/> Remove
        </button>
      ) : (
        <button onClick={() => onAdd(player)} className="text-xs font-bold text-emerald-700 border border-emerald-200 hover:bg-emerald-50 px-2 py-1.5 rounded-lg cursor-pointer">
          + Add
        </button>
      )}
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function TeamSelector() {
  const [format,        setFormat]        = useState('T20I');
  const [activeMode,    setActiveMode]    = useState('auto');   // 'auto' | 'manual'

  // Auto-select state
  const [requirements,  setRequirements]  = useState({ ...DEFAULT_REQS });
  const [autoCountry,   setAutoCountry]   = useState('');
  const [autoLoading,   setAutoLoading]   = useState(false);
  const [autoError,     setAutoError]     = useState('');
  const [autoNote,      setAutoNote]      = useState('');

  // Manual browse state
  const [statusFilter,  setStatusFilter]  = useState('Active');
  const [roleFilter,    setRoleFilter]    = useState('');
  const [browseCountry, setBrowseCountry] = useState('');
  const [search,        setSearch]        = useState('');
  const [players,       setPlayers]       = useState([]);
  const [countries,     setCountries]     = useState([]);
  const [browseLoading, setBrowseLoading] = useState(false);

  // Shared squad state
  const [squad,   setSquad]   = useState([]);
  const [isAuto,  setIsAuto]  = useState(false);

  const formatObj = FORMATS.find(f => f.key === format);

  // ── Auto-select requirements total ─────────────────────────────────────────
  const reqTotal = Object.values(requirements).reduce((a, b) => a + b, 0);
  const reqValid = reqTotal === MAX_SQUAD;

  function setReq(key, val) {
    setRequirements(r => ({ ...r, [key]: Math.max(0, val) }));
  }

  // ── Auto-Build XI ───────────────────────────────────────────────────────────
  async function handleAutoSelect() {
    if (!reqValid) return;
    setAutoLoading(true);
    setAutoError('');
    setAutoNote('');
    try {
      const res  = await fetch('/api/team-selector', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          format:       formatObj.apiKey,
          country:      autoCountry || null,
          requirements,
        }),
      });
      const data = await res.json();
      if (data.error) { setAutoError(data.error || data.message); return; }
      setSquad(data.squad || []);
      setIsAuto(true);
      if (data.note) setAutoNote(data.note);
    } catch (err) {
      setAutoError(err.message);
    } finally {
      setAutoLoading(false);
    }
  }

  // ── Browse players (manual mode) ────────────────────────────────────────────
  useEffect(() => {
    if (activeMode !== 'manual') return;
    setBrowseLoading(true);
    const params = new URLSearchParams({
      format: formatObj.apiKey,
      status: statusFilter,
      ...(roleFilter    && { role: roleFilter }),
      ...(browseCountry && { country: browseCountry }),
      ...(search.length > 1 && { search }),
    });
    fetch(`/api/team-selector?${params}`)
      .then(r => r.json())
      .then(data => {
        if (data.error) return;
        const statusKey = `intl_${formatObj.apiKey}_status`;
        setPlayers((data.players || []).map(p => ({ ...p, intl_status: p[statusKey] || '—' })));
        setCountries(data.countries || []);
      })
      .catch(console.error)
      .finally(() => setBrowseLoading(false));
  }, [activeMode, format, statusFilter, roleFilter, browseCountry, search]);

  // ── Squad helpers ───────────────────────────────────────────────────────────
  const squadNames = useMemo(() => new Set(squad.map(p => p.player_name)), [squad]);

  function addToSquad(player) {
    if (squadNames.has(player.player_name) || squad.length >= MAX_SQUAD) return;
    setSquad(s => [...s, player]);
    setIsAuto(false);
  }
  function removeFromSquad(player) {
    setSquad(s => s.filter(p => p.player_name !== player.player_name));
    setIsAuto(false);
  }
  function clearSquad() { setSquad([]); setIsAuto(false); }

  const validationIssues = squad.length === MAX_SQUAD ? squadValidation(squad) : [];

  const squadCounts = useMemo(() => ({
    bat:  squad.filter(p => ['BAT','WK'].includes(p.playing_role)).length,
    bowl: squad.filter(p => ['BWL','P-BOW','AR'].includes(p.playing_role)).length,
    wk:   squad.filter(p => p.playing_role === 'WK').length,
    ar:   squad.filter(p => p.playing_role === 'AR').length,
  }), [squad]);

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="max-w-7xl mx-auto py-8 px-2">

      {/* Header */}
      <div className="mb-8">
        <div className="inline-flex items-center gap-2 bg-emerald-50 text-emerald-700 px-4 py-2 rounded-full text-xs font-black uppercase tracking-widest border border-emerald-100 mb-4">
          <Users size={14}/> Team Selector
        </div>
        <h2 className="text-3xl font-black text-slate-900 mb-1">Build Your XI</h2>
        <p className="text-slate-500">Auto-select by ranking or manually pick from the active player pool</p>
      </div>

      {/* Format Toggle */}
      <div className="flex bg-slate-100 rounded-xl p-1 gap-1 w-fit mb-6">
        {FORMATS.map(({ key, icon: Icon }) => (
          <button key={key} onClick={() => { setFormat(key); setSquad([]); setIsAuto(false); }}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-black transition-all ${format === key ? 'bg-white shadow text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}>
            <Icon size={14}/> {key}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* ── LEFT PANEL ── */}
        <div className="lg:col-span-2 space-y-4">

          {/* Mode Tabs */}
          <div className="flex bg-slate-100 rounded-xl p-1 gap-1 w-fit">
            <button onClick={() => setActiveMode('auto')}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-black transition-all ${activeMode === 'auto' ? 'bg-white shadow text-slate-900' : 'text-slate-500'}`}>
              <Sparkles size={13}/> Auto-Select
            </button>
            <button onClick={() => setActiveMode('manual')}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-black transition-all ${activeMode === 'manual' ? 'bg-white shadow text-slate-900' : 'text-slate-500'}`}>
              <Search size={13}/> Browse & Pick
            </button>
          </div>

          {/* ── AUTO-SELECT MODE ── */}
          {activeMode === 'auto' && (
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
              <div className="px-6 py-4 bg-gradient-to-r from-slate-900 to-slate-800 flex items-center justify-between">
                <div>
                  <h3 className="font-black text-white text-base flex items-center gap-2"><Sparkles size={14} className="text-emerald-400"/> Smart XI Builder</h3>
                  <p className="text-xs text-slate-400 mt-0.5">System picks top-ranked active players for each role</p>
                </div>
                <div className={`text-sm font-black px-3 py-1.5 rounded-lg ${reqValid ? 'bg-emerald-600 text-white' : 'bg-amber-500 text-white'}`}>
                  {reqTotal}/11
                </div>
              </div>

              <div className="p-5 space-y-3">
                {ROLE_FIELDS.map(field => (
                  <RoleCounter
                    key={field.key}
                    field={field}
                    value={requirements[field.key]}
                    onChange={v => setReq(field.key, v)}
                    total={reqTotal}
                  />
                ))}

                {/* Country filter */}
                <div className="flex items-center gap-3 pt-1">
                  <label className="text-xs font-black text-slate-500 uppercase tracking-wider shrink-0">Country filter</label>
                  <select value={autoCountry} onChange={e => setAutoCountry(e.target.value)}
                    className="flex-1 text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white text-slate-700 focus:outline-none focus:border-emerald-400">
                    <option value="">All Countries (World XI)</option>
                    {countries.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>

                {/* Validation */}
                {!reqValid && (
                  <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-700 font-bold">
                    <AlertCircle size={14}/>
                    {reqTotal < 11 ? `Add ${11 - reqTotal} more player(s) to reach 11` : `Remove ${reqTotal - 11} player(s) — currently ${reqTotal}`}
                  </div>
                )}

                {autoError && (
                  <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-600 font-bold">
                    <AlertCircle size={14}/> {autoError}
                  </div>
                )}

                {autoNote && (
                  <div className="flex items-center gap-2 bg-indigo-50 border border-indigo-100 rounded-xl px-3 py-2 text-xs text-indigo-600">
                    <Info size={12}/> {autoNote}
                  </div>
                )}

                <button
                  onClick={handleAutoSelect}
                  disabled={!reqValid || autoLoading}
                  className="w-full py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-black text-sm flex items-center justify-center gap-2 transition-all shadow-sm cursor-pointer"
                >
                  {autoLoading
                    ? <><RefreshCw size={15} className="animate-spin"/> Building Best XI...</>
                    : <><Sparkles size={15}/> Auto-Build {format} XI</>}
                </button>

                <p className="text-[10px] text-slate-400 text-center flex items-center justify-center gap-1">
                  <TrendingUp size={10}/> Ranked by career batting average, bowling economy &amp; wickets
                  · Future: away form, conditions, head-to-head
                </p>
              </div>
            </div>
          )}

          {/* ── MANUAL BROWSE MODE ── */}
          {activeMode === 'manual' && (
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
              {/* Filters */}
              <div className="p-4 border-b border-slate-100 space-y-3">
                <div className="flex items-center gap-2 bg-slate-100 rounded-xl px-3 py-2.5">
                  <Search size={15} className="text-slate-400 shrink-0"/>
                  <input type="text" placeholder="Search player..." value={search} onChange={e => setSearch(e.target.value)}
                    className="flex-1 bg-transparent outline-none text-sm text-slate-700"/>
                  {search && <button onClick={() => setSearch('')} className="text-slate-400 cursor-pointer"><X size={12}/></button>}
                </div>
                <div className="flex flex-wrap gap-2">
                  <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
                    className="text-xs font-bold border border-slate-200 rounded-lg px-3 py-2 bg-white text-slate-700 focus:outline-none focus:border-emerald-400 cursor-pointer">
                    <option value="Active">Active Only</option>
                    <option value="Active,Out 2Y+">Active + Out 2Y+</option>
                    <option value="Active,Out 2Y+,Retired">All</option>
                  </select>
                  {['','BAT','WK','AR','BWL','P-BOW'].map(r => (
                    <button key={r} onClick={() => setRoleFilter(r)}
                      className={`text-xs font-bold px-3 py-1.5 rounded-lg border transition-all ${roleFilter === r ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-slate-600 border-slate-200 hover:border-emerald-400'}`}>
                      {r || 'All'}
                    </button>
                  ))}
                  {countries.length > 0 && (
                    <select value={browseCountry} onChange={e => setBrowseCountry(e.target.value)}
                      className="text-xs font-bold border border-slate-200 rounded-lg px-3 py-2 bg-white text-slate-700 focus:outline-none focus:border-emerald-400 cursor-pointer">
                      <option value="">All Countries</option>
                      {countries.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  )}
                </div>
              </div>

              {/* Player list */}
              <div className="overflow-y-auto" style={{ maxHeight: '500px' }}>
                {browseLoading ? (
                  <div className="flex flex-col items-center py-16 text-slate-400 animate-pulse">
                    <RefreshCw size={24} className="mb-2"/> <p className="text-xs font-black uppercase tracking-widest">Loading...</p>
                  </div>
                ) : players.length === 0 ? (
                  <div className="text-center py-14 text-slate-400 text-sm">No players found for these filters.</div>
                ) : (
                  players.map(p => (
                    <PlayerRow key={p.player_name} player={p}
                      inSquad={squadNames.has(p.player_name)}
                      onAdd={addToSquad} onRemove={removeFromSquad}/>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* ── RIGHT PANEL: Squad ── */}
        <div className="space-y-4">

          {/* Squad header card */}
          <div className="bg-slate-900 text-white rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-black text-lg">{format} XI</h3>
                <p className="text-xs text-slate-400 mt-0.5">{isAuto ? '⚡ Auto-ranked squad' : 'Manually selected'}</p>
              </div>
              <div className={`text-3xl font-black ${squad.length === MAX_SQUAD ? 'text-emerald-400' : 'text-slate-300'}`}>
                {squad.length}<span className="text-slate-500 text-lg">/{MAX_SQUAD}</span>
              </div>
            </div>
            <div className="grid grid-cols-4 gap-2 text-center text-xs">
              {[
                { label:'BAT/WK', val: squadCounts.bat,  ok: squadCounts.bat  >= 4 },
                { label:'BWL',    val: squadCounts.bowl, ok: squadCounts.bowl >= 3 },
                { label:'WK',     val: squadCounts.wk,   ok: squadCounts.wk  >= 1 },
                { label:'AR',     val: squadCounts.ar,   ok: true },
              ].map(({ label, val, ok }) => (
                <div key={label} className="bg-white/10 rounded-lg p-2">
                  <div className={`text-lg font-black ${ok ? 'text-emerald-400' : 'text-slate-300'}`}>{val}</div>
                  <div className="text-slate-400 text-[10px]">{label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Validation */}
          {validationIssues.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 space-y-1">
              <p className="text-xs font-black text-amber-700 flex items-center gap-1 mb-1.5"><AlertCircle size={11}/> Squad Issues</p>
              {validationIssues.map((issue, i) => <p key={i} className="text-xs text-amber-600">⚠ {issue}</p>)}
            </div>
          )}

          {/* Slots */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <span className="text-xs font-black text-slate-500 uppercase tracking-widest">Selected XI</span>
              {squad.length > 0 && (
                <button onClick={clearSquad} className="text-xs text-red-400 hover:text-red-600 font-bold cursor-pointer">Clear</button>
              )}
            </div>
            <div className="p-3 space-y-2">
              {squad.length === 0 ? (
                <div className="text-center py-10 text-slate-400">
                  <Users size={28} className="mx-auto mb-2 opacity-30"/>
                  <p className="text-xs">Use Auto-Select or Browse to build your squad</p>
                </div>
              ) : (
                squad.map((p, i) => (
                  <SquadCard key={p.player_name} player={p} index={i} onRemove={removeFromSquad} isAuto={isAuto}/>
                ))
              )}
              {/* Empty slots */}
              {squad.length < MAX_SQUAD && squad.length > 0 && Array.from({ length: MAX_SQUAD - squad.length }).map((_, i) => (
                <div key={`empty-${i}`} className="flex items-center gap-3 px-4 py-3 border border-dashed border-slate-200 rounded-xl">
                  <span className="text-xs font-mono text-slate-300 w-5 text-right">{squad.length + i + 1}</span>
                  <span className="text-sm text-slate-300 italic">Empty slot</span>
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          {squad.length > 0 && (
            <button onClick={() => exportSquad(squad, format)}
              className="w-full flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white text-sm font-black py-3 rounded-xl transition-all shadow-sm cursor-pointer">
              <Copy size={14}/> Copy Squad to Clipboard
            </button>
          )}

          {/* Future criteria hint */}
          <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4">
            <p className="text-xs font-black text-indigo-700 uppercase tracking-wider mb-2">Coming Soon</p>
            <div className="space-y-1 text-xs text-indigo-600">
              <p>→ Performance in away grounds</p>
              <p>→ Form in last 10 matches</p>
              <p>→ vs pace / vs spin filter</p>
              <p>→ Pitch &amp; conditions weighting</p>
              <p>→ Head-to-head vs opponent</p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
