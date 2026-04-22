"use client";
import React, { useState, useEffect, useMemo } from 'react';
import { Search, Users, X, ChevronDown, Copy, Download, RefreshCw, Shield, Zap, Activity, UserCheck, AlertCircle } from 'lucide-react';

// ── Constants ────────────────────────────────────────────────────────────────

const FORMATS = [
  { key: 'T20I', label: 'T20 Internationals', icon: Zap,      color: 'amber'  },
  { key: 'ODI',  label: 'ODI / Limited Overs', icon: Activity, color: 'indigo' },
  { key: 'Test', label: 'Test Matches',        icon: Shield,   color: 'emerald'},
];

const ROLES = [
  { key: '',    label: 'All Roles'  },
  { key: 'BAT', label: '🏏 Batter'  },
  { key: 'WK',  label: '🧤 WK'      },
  { key: 'AR',  label: '✦ All-Rounder' },
  { key: 'BWL', label: '⚡ Bowler'  },
  { key: 'P-BOW', label: '🏏⚡ P-Bow' },
];

const ROLE_COLORS = {
  BAT:   'text-emerald-700 bg-emerald-50 border-emerald-200',
  WK:    'text-sky-700 bg-sky-50 border-sky-200',
  AR:    'text-purple-700 bg-purple-50 border-purple-200',
  BWL:   'text-blue-700 bg-blue-50 border-blue-200',
  'P-BOW': 'text-orange-700 bg-orange-50 border-orange-200',
};

const STATUS_COLORS = {
  'Active':       'text-emerald-700 bg-emerald-50 border-emerald-200',
  'Out 2Y+':      'text-amber-700   bg-amber-50   border-amber-200',
  'Retired':      'text-slate-500   bg-slate-100  border-slate-200',
  'Never Played': 'text-slate-400   bg-slate-50   border-slate-100',
  'Unknown':      'text-slate-400   bg-slate-50   border-slate-100',
};

const MAX_SQUAD = 11;

// Ideal squad composition guide
const SQUAD_GUIDE = {
  batters: { min: 4, label: 'Batters (BAT/WK)' },
  bowlers: { min: 4, label: 'Bowlers (BWL/P-BOW)' },
  allRounders: { min: 1, label: 'All-Rounders (AR)' },
  wk: { min: 1, label: 'Wicket-Keeper (WK)' },
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function isBatter(role)  { return ['BAT', 'WK'].includes(role); }
function isBowler(role)  { return ['BWL', 'P-BOW', 'AR'].includes(role); }
function isWK(role)      { return role === 'WK'; }
function isAR(role)      { return role === 'AR'; }

function squadValidation(squad) {
  const issues = [];
  const batters   = squad.filter(p => isBatter(p.playing_role)).length;
  const bowlers   = squad.filter(p => isBowler(p.playing_role)).length;
  const wks       = squad.filter(p => isWK(p.playing_role)).length;
  const ars       = squad.filter(p => isAR(p.playing_role)).length;
  if (batters < SQUAD_GUIDE.batters.min)       issues.push(`Need ≥${SQUAD_GUIDE.batters.min} batters`);
  if (bowlers < SQUAD_GUIDE.bowlers.min)       issues.push(`Need ≥${SQUAD_GUIDE.bowlers.min} bowlers`);
  if (wks < SQUAD_GUIDE.wk.min)               issues.push('Need ≥1 wicket-keeper');
  return issues;
}

function exportSquad(squad, format) {
  const lines = [
    `CricLens Team Selector — ${format} Squad`,
    '='.repeat(40),
    ...squad.map((p, i) => `${i + 1}. ${p.player_name} (${p.playing_role}) — ${p.nationality}`),
    '',
    `Generated: ${new Date().toLocaleString()}`,
  ];
  navigator.clipboard.writeText(lines.join('\n'));
}

// ── Sub-components ───────────────────────────────────────────────────────────

function PlayerCard({ player, inSquad, onAdd, onRemove, compact = false }) {
  const statusClass = STATUS_COLORS[player.intl_status] || STATUS_COLORS['Unknown'];
  const roleClass   = ROLE_COLORS[player.playing_role]  || 'text-slate-600 bg-slate-50 border-slate-200';

  if (compact) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl hover:border-emerald-300 hover:bg-emerald-50 transition-all group">
        <div className="flex-1 min-w-0">
          <div className="font-bold text-slate-800 text-sm truncate">{player.player_name}</div>
          <div className="text-xs text-slate-400">{player.nationality}</div>
        </div>
        <span className={`text-[10px] font-black uppercase border px-1.5 py-0.5 rounded shrink-0 ${roleClass}`}>
          {player.playing_role}
        </span>
        {inSquad ? (
          <button onClick={() => onRemove(player)} className="text-red-400 hover:text-red-600 ml-1 shrink-0 cursor-pointer" title="Remove">
            <X size={14} />
          </button>
        ) : (
          <button onClick={() => onAdd(player)} className="text-slate-300 group-hover:text-emerald-600 ml-1 shrink-0 cursor-pointer font-black text-lg leading-none" title="Add to squad">
            +
          </button>
        )}
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-3 px-4 py-3.5 border-b border-slate-100 hover:bg-slate-50 transition-colors ${inSquad ? 'bg-emerald-50/50' : ''}`}>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-bold text-slate-800 text-sm">{player.player_name}</span>
          <span className={`text-[10px] font-black uppercase border px-1.5 py-0.5 rounded ${roleClass}`}>
            {player.playing_role || '—'}
          </span>
          {player.intl_status && (
            <span className={`text-[10px] font-bold border px-1.5 py-0.5 rounded ${statusClass}`}>
              {player.intl_status}
            </span>
          )}
        </div>
        <div className="text-xs text-slate-400 mt-0.5 flex items-center gap-2">
          <span>{player.nationality || '—'}</span>
          {player.batting_style && <span>· {player.batting_style}</span>}
          {player.bowling_type   && <span>· {player.bowling_type}</span>}
        </div>
      </div>
      {inSquad ? (
        <button onClick={() => onRemove(player)}
          className="flex items-center gap-1 text-xs font-bold text-red-500 hover:text-red-700 border border-red-200 hover:border-red-400 bg-white px-2 py-1.5 rounded-lg transition-all shrink-0 cursor-pointer">
          <X size={12} /> Remove
        </button>
      ) : (
        <button onClick={() => onAdd(player)}
          disabled={inSquad}
          className="flex items-center gap-1 text-xs font-bold text-emerald-700 hover:text-white hover:bg-emerald-600 border border-emerald-300 hover:border-emerald-600 bg-white px-2 py-1.5 rounded-lg transition-all shrink-0 cursor-pointer">
          + Add
        </button>
      )}
    </div>
  );
}

function SquadSlot({ index, player, onRemove }) {
  const roleClass = player ? (ROLE_COLORS[player.playing_role] || 'text-slate-600 bg-slate-50 border-slate-200') : '';
  return (
    <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-all ${
      player
        ? 'bg-white border-slate-200 shadow-sm hover:border-emerald-300'
        : 'bg-slate-50/50 border-dashed border-slate-200'
    }`}>
      <span className="text-xs font-mono text-slate-400 w-5 text-right shrink-0">{index + 1}</span>
      {player ? (
        <>
          <div className="flex-1 min-w-0">
            <div className="font-bold text-slate-800 text-sm truncate">{player.player_name}</div>
            <div className="text-xs text-slate-400 truncate">{player.nationality}</div>
          </div>
          <span className={`text-[10px] font-black uppercase border px-1.5 py-0.5 rounded shrink-0 ${roleClass}`}>
            {player.playing_role}
          </span>
          <button onClick={() => onRemove(player)} className="text-slate-300 hover:text-red-500 transition-colors shrink-0 cursor-pointer" title="Remove">
            <X size={14} />
          </button>
        </>
      ) : (
        <span className="text-sm text-slate-300 italic">Empty slot</span>
      )}
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function TeamSelector() {
  const [format,     setFormat]     = useState('T20I');
  const [statusFilter, setStatusFilter] = useState('Active');
  const [roleFilter, setRoleFilter] = useState('');
  const [country,    setCountry]    = useState('');
  const [search,     setSearch]     = useState('');

  const [players,   setPlayers]   = useState([]);
  const [countries, setCountries] = useState([]);
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState('');

  const [squad, setSquad] = useState([]);

  // Fetch players from API
  useEffect(() => {
    setLoading(true);
    setError('');
    const params = new URLSearchParams({
      format: format.toLowerCase(),
      status: statusFilter,
      ...(roleFilter && { role: roleFilter }),
      ...(country    && { country }),
      ...(search.length > 1 && { search }),
    });
    fetch(`/api/team-selector?${params}`)
      .then(r => r.json())
      .then(data => {
        if (data.error) { setError(data.message || 'API error'); return; }
        // Attach the format-specific status for display
        const statusKey = `intl_${format.toLowerCase()}_status`;
        const enriched = (data.players || []).map(p => ({
          ...p,
          intl_status: p[statusKey] || p.intl_t20i_status || '—',
        }));
        setPlayers(enriched);
        setCountries(data.countries || []);
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [format, statusFilter, roleFilter, country, search]);

  // Squad logic
  const squadNames = useMemo(() => new Set(squad.map(p => p.player_name)), [squad]);

  function addToSquad(player) {
    if (squadNames.has(player.player_name)) return;
    if (squad.length >= MAX_SQUAD) return;
    setSquad(s => [...s, player]);
  }

  function removeFromSquad(player) {
    setSquad(s => s.filter(p => p.player_name !== player.player_name));
  }

  function clearSquad() { setSquad([]); }

  const validationIssues = squad.length === MAX_SQUAD ? squadValidation(squad) : [];

  // Squad composition counts
  const squadCounts = useMemo(() => ({
    batters:    squad.filter(p => isBatter(p.playing_role)).length,
    bowlers:    squad.filter(p => isBowler(p.playing_role)).length,
    wk:         squad.filter(p => isWK(p.playing_role)).length,
    ar:         squad.filter(p => isAR(p.playing_role)).length,
  }), [squad]);

  const formatObj = FORMATS.find(f => f.key === format);
  const FormatIcon = formatObj?.icon || Zap;

  return (
    <div className="max-w-7xl mx-auto py-8 px-2">
      {/* Header */}
      <div className="mb-8">
        <div className="inline-flex items-center gap-2 bg-emerald-50 text-emerald-700 px-4 py-2 rounded-full text-xs font-black uppercase tracking-widest border border-emerald-100 mb-4">
          <Users size={14} /> Team Selector
        </div>
        <h2 className="text-3xl font-black text-slate-900 mb-1">Build Your XI</h2>
        <p className="text-slate-500">Select from currently active international players filtered by format and role</p>
      </div>

      {/* Format Toggle */}
      <div className="flex bg-slate-100 rounded-xl p-1 gap-1 w-fit mb-6">
        {FORMATS.map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => { setFormat(key); setSquad([]); }}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-black transition-all ${
              format === key ? 'bg-white shadow text-slate-900' : 'text-slate-500 hover:text-slate-700'
            }`}>
            <Icon size={14} /> {key}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* ── LEFT: Player Pool ── */}
        <div className="lg:col-span-2 space-y-4">

          {/* Filters */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-3">
            {/* Search */}
            <div className="flex items-center gap-2 bg-slate-100 rounded-xl px-3 py-2.5 border border-slate-200">
              <Search size={15} className="text-slate-400 shrink-0" />
              <input
                type="text"
                placeholder="Search player name..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="flex-1 bg-transparent outline-none text-sm text-slate-700"
              />
              {search && <button onClick={() => setSearch('')} className="text-slate-400 hover:text-slate-700 cursor-pointer"><X size={13} /></button>}
            </div>

            {/* Role + Country + Status row */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Status filter */}
              <div className="relative">
                <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
                  className="appearance-none text-sm font-bold border border-slate-200 rounded-lg px-3 py-2 bg-white text-slate-700 pr-7 focus:outline-none focus:border-emerald-400 cursor-pointer shadow-sm">
                  <option value="Active">Active Only</option>
                  <option value="Active,Out 2Y+">Active + Out 2Y+</option>
                  <option value="Active,Out 2Y+,Retired">All (incl. Retired)</option>
                </select>
                <ChevronDown size={11} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>

              {/* Role filter */}
              <div className="flex flex-wrap gap-1">
                {ROLES.map(({ key, label }) => (
                  <button key={key} onClick={() => setRoleFilter(key)}
                    className={`text-xs font-bold px-3 py-1.5 rounded-lg border transition-all ${
                      roleFilter === key
                        ? 'bg-emerald-600 text-white border-emerald-600'
                        : 'bg-white text-slate-600 border-slate-200 hover:border-emerald-400'
                    }`}>
                    {label}
                  </button>
                ))}
              </div>

              {/* Country filter */}
              {countries.length > 0 && (
                <div className="relative">
                  <select value={country} onChange={e => setCountry(e.target.value)}
                    className="appearance-none text-sm font-bold border border-slate-200 rounded-lg px-3 py-2 bg-white text-slate-700 pr-7 focus:outline-none focus:border-emerald-400 cursor-pointer shadow-sm">
                    <option value="">All Countries</option>
                    {countries.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <ChevronDown size={11} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>
              )}
            </div>
          </div>

          {/* Player List */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <span className="text-xs font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                <FormatIcon size={12} /> {format} Player Pool
              </span>
              <span className="text-xs font-mono text-slate-400">
                {loading ? 'Loading...' : `${players.length} players`}
              </span>
            </div>

            {error && (
              <div className="flex items-center gap-2 p-4 bg-red-50 border-b border-red-100 text-red-600 text-sm">
                <AlertCircle size={14} /> {error}
              </div>
            )}

            <div className="overflow-y-auto" style={{ maxHeight: '520px' }}>
              {loading ? (
                <div className="flex flex-col items-center justify-center py-16 text-slate-400 animate-pulse">
                  <RefreshCw size={28} className="mb-3" />
                  <p className="text-xs font-black uppercase tracking-widest">Fetching players...</p>
                </div>
              ) : players.length === 0 ? (
                <div className="text-center py-16 text-slate-400 text-sm">
                  No players found for the selected filters.
                </div>
              ) : (
                players.map(player => (
                  <PlayerCard
                    key={player.player_name}
                    player={player}
                    inSquad={squadNames.has(player.player_name)}
                    onAdd={addToSquad}
                    onRemove={removeFromSquad}
                  />
                ))
              )}
            </div>
          </div>
        </div>

        {/* ── RIGHT: Squad Builder ── */}
        <div className="space-y-4">

          {/* Squad header */}
          <div className="bg-slate-900 text-white rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-black text-lg">{format} XI</h3>
                <p className="text-xs text-slate-400 mt-0.5">Click + to add players</p>
              </div>
              <div className="text-right">
                <div className={`text-3xl font-black ${squad.length === MAX_SQUAD ? 'text-emerald-400' : 'text-slate-300'}`}>
                  {squad.length}<span className="text-slate-500 text-lg">/{MAX_SQUAD}</span>
                </div>
              </div>
            </div>

            {/* Composition bars */}
            <div className="grid grid-cols-2 gap-2 text-center text-xs">
              {[
                { label: 'BAT/WK', count: squadCounts.batters,  color: 'bg-emerald-500', need: 4 },
                { label: 'BWL',    count: squadCounts.bowlers,  color: 'bg-blue-500',    need: 4 },
                { label: 'WK',     count: squadCounts.wk,       color: 'bg-sky-500',     need: 1 },
                { label: 'AR',     count: squadCounts.ar,       color: 'bg-purple-500',  need: 1 },
              ].map(({ label, count, color, need }) => (
                <div key={label} className="bg-white/10 rounded-lg p-2">
                  <div className={`text-lg font-black ${count >= need ? 'text-emerald-400' : 'text-slate-300'}`}>{count}</div>
                  <div className="text-slate-400">{label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Validation issues */}
          {validationIssues.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 space-y-1">
              <p className="text-xs font-black text-amber-700 uppercase tracking-wider mb-1.5 flex items-center gap-1"><AlertCircle size={12}/> Squad Issues</p>
              {validationIssues.map((issue, i) => (
                <p key={i} className="text-xs text-amber-600">⚠ {issue}</p>
              ))}
            </div>
          )}

          {/* Squad slots */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <span className="text-xs font-black text-slate-500 uppercase tracking-widest">Selected XI</span>
              {squad.length > 0 && (
                <button onClick={clearSquad} className="text-xs text-red-400 hover:text-red-600 font-bold cursor-pointer">Clear all</button>
              )}
            </div>
            <div className="p-3 space-y-2">
              {Array.from({ length: MAX_SQUAD }).map((_, i) => (
                <SquadSlot key={i} index={i} player={squad[i] || null} onRemove={removeFromSquad} />
              ))}
            </div>
          </div>

          {/* Actions */}
          {squad.length > 0 && (
            <div className="flex gap-2">
              <button
                onClick={() => exportSquad(squad, format)}
                className="flex-1 flex items-center justify-center gap-2 bg-slate-900 text-white text-sm font-black py-3 rounded-xl hover:bg-slate-800 transition-all shadow-sm cursor-pointer">
                <Copy size={14} /> Copy Squad
              </button>
              <button
                onClick={clearSquad}
                className="flex items-center justify-center gap-2 bg-white border border-slate-200 text-slate-600 text-sm font-bold py-3 px-4 rounded-xl hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-all cursor-pointer">
                <X size={14} />
              </button>
            </div>
          )}

          {/* Legend */}
          <div className="bg-slate-50 border border-slate-100 rounded-xl p-4">
            <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Status Legend</p>
            <div className="space-y-1.5">
              {Object.entries(STATUS_COLORS).map(([status, cls]) => (
                <div key={status} className="flex items-center gap-2">
                  <span className={`text-[10px] font-bold border px-1.5 py-0.5 rounded ${cls}`}>{status}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
