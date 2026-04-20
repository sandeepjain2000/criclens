"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { FlaskConical, Plus, X, Search, ChevronDown, Loader2, Info, TrendingUp } from 'lucide-react';

// ─── Constants ───────────────────────────────────────────────────────────────

const MAX_PLAYERS = 5;

const FILTERS = [
  {
    key:     'phase',
    label:   'Phase',
    options: ['All', 'Powerplay', 'Middle', 'Death'],
    emoji:   '⚡',
  },
  {
    key:     'paceOrSpin',
    label:   'vs Bowler',
    options: ['All', 'Pace', 'Spin'],
    emoji:   '🎳',
  },
  {
    key:     'bowlerSubtype',
    label:   'Bowler Type',
    options: ['All', 'Pure Pace', 'Swing', 'Seam', 'Fast-medium', 'Off-spin', 'Leg-spin', 'Left-arm orthodox', 'Chinaman'],
    emoji:   '🧠',
  },
  {
    key:     'bowlerRank',
    label:   'Bowler Rank',
    options: ['All', 'Rank 1', 'Top 2', 'Top 3', 'Rank 4+'],
    emoji:   '🏅',
  },
  {
    key:     'inningsRole',
    label:   'Innings',
    options: ['All', 'Batting First', 'Batting Second'],
    emoji:   '🏏',
  },
  {
    key:     'venueContext',
    label:   'Venue',
    options: ['All', 'Home', 'Away', 'Neutral'],
    emoji:   '📍',
  },
  {
    key:     'competitionType',
    label:   'Competition',
    options: ['All', 'Bilateral', 'Tournament', 'Domestic'],
    emoji:   '🏆',
  },
  {
    key:     'matchStage',
    label:   'Stage',
    options: ['All', 'Group', 'Super 4', 'Super 8', 'Qualifier', 'Semi-final', 'Final'],
    emoji:   '🎯',
  },
];

const DEFAULT_FILTERS = {
  phase:           'All',
  paceOrSpin:      'All',
  bowlerSubtype:   'All',
  bowlerRank:      'All',
  inningsRole:     'All',
  venueContext:    'All',
  competitionType: 'All',
  matchStage:      'All',
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function FilterDropdown({ filter, value, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function handler(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false); }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const active = value !== 'All';

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '7px 12px', borderRadius: 10,
          border: active ? '2px solid #0891b2' : '1.5px solid #e2e8f0',
          background: active ? '#ecfeff' : '#fff',
          cursor: 'pointer', fontSize: 13, fontWeight: 600,
          color: active ? '#0e7490' : '#475569',
          whiteSpace: 'nowrap',
        }}
      >
        <span>{filter.emoji}</span>
        <span>{filter.label}</span>
        {active && (
          <span style={{
            background: '#0891b2', color: '#fff',
            borderRadius: 6, padding: '1px 7px', fontSize: 11, fontWeight: 700,
          }}>{value}</span>
        )}
        <ChevronDown size={14} style={{ opacity: 0.5, marginLeft: 2 }} />
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 6px)', left: 0, zIndex: 100,
          background: '#fff', border: '1.5px solid #e2e8f0', borderRadius: 12,
          boxShadow: '0 8px 24px rgba(0,0,0,0.10)', minWidth: 160, padding: 4,
        }}>
          {filter.options.map(opt => (
            <button
              key={opt}
              onClick={() => { onChange(filter.key, opt); setOpen(false); }}
              style={{
                display: 'block', width: '100%', textAlign: 'left',
                padding: '8px 14px', border: 'none', cursor: 'pointer',
                background: value === opt ? '#ecfeff' : 'transparent',
                color: value === opt ? '#0e7490' : '#334155',
                fontWeight: value === opt ? 700 : 500,
                fontSize: 13, borderRadius: 8,
              }}
            >
              {opt === 'All' ? `All ${filter.label}` : opt}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function PlayerSearchBox({ onAdd, existingPlayers }) {
  const [query, setQuery]       = useState('');
  const [results, setResults]   = useState([]);
  const [loading, setLoading]   = useState(false);
  const [open, setOpen]         = useState(false);
  const ref = useRef(null);
  const timerRef = useRef(null);

  useEffect(() => {
    function handler(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false); }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  function handleInput(e) {
    const val = e.target.value;
    setQuery(val);
    clearTimeout(timerRef.current);
    if (val.length < 2) { setResults([]); setOpen(false); return; }
    timerRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/slice-dice-t20?action=search&q=${encodeURIComponent(val)}`);
        const data = await res.json();
        setResults((data.players || []).filter(p => !existingPlayers.includes(p)));
        setOpen(true);
      } catch { /* ignore */ }
      setLoading(false);
    }, 300);
  }

  function select(name) {
    onAdd(name);
    setQuery('');
    setResults([]);
    setOpen(false);
  }

  return (
    <div ref={ref} style={{ position: 'relative', width: 280 }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        border: '1.5px solid #e2e8f0', borderRadius: 12,
        padding: '8px 14px', background: '#fff',
      }}>
        {loading
          ? <Loader2 size={16} style={{ color: '#94a3b8', flexShrink: 0, animation: 'spin 1s linear infinite' }} />
          : <Search size={16} style={{ color: '#94a3b8', flexShrink: 0 }} />
        }
        <input
          value={query}
          onChange={handleInput}
          placeholder="Search player (e.g. V Kohli)"
          style={{
            border: 'none', outline: 'none', fontSize: 13,
            fontWeight: 500, color: '#334155', background: 'transparent', width: '100%',
          }}
        />
      </div>

      {open && results.length > 0 && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0, zIndex: 100,
          background: '#fff', border: '1.5px solid #e2e8f0', borderRadius: 12,
          boxShadow: '0 8px 24px rgba(0,0,0,0.10)', maxHeight: 220, overflowY: 'auto', padding: 4,
        }}>
          {results.map(name => (
            <button
              key={name}
              onClick={() => select(name)}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                width: '100%', textAlign: 'left',
                padding: '8px 14px', border: 'none', cursor: 'pointer',
                background: 'transparent', color: '#334155',
                fontWeight: 500, fontSize: 13, borderRadius: 8,
              }}
              onMouseEnter={e => e.currentTarget.style.background = '#f1f5f9'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <Plus size={13} style={{ color: '#0891b2' }} />
              {name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}


// ─── Main component ───────────────────────────────────────────────────────────

export default function T20SliceDice() {
  const [players,    setPlayers]    = useState([]);   // string[] — Cricsheet names
  const [filters,    setFilters]    = useState(DEFAULT_FILTERS);
  const [stats,      setStats]      = useState({});   // { [playerName]: rowData }
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState(null);

  // Active filter label for the column header
  const activeFilterLabels = FILTERS
    .filter(f => filters[f.key] !== 'All')
    .map(f => `${f.emoji} ${filters[f.key]}`);
  const filterLabel = activeFilterLabels.length
    ? activeFilterLabels.join('  ·  ')
    : 'No filter applied';
  const hasFilter = activeFilterLabels.length > 0;

  // Fetch stats whenever players or filters change
  const fetchStats = useCallback(async (playerList, currentFilters) => {
    if (!playerList.length) { setStats({}); return; }
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        players:         playerList.join(','),
        phase:           currentFilters.phase,
        paceOrSpin:      currentFilters.paceOrSpin,
        bowlerSubtype:   currentFilters.bowlerSubtype,
        bowlerRank:      currentFilters.bowlerRank,
        inningsRole:     currentFilters.inningsRole,
        venueContext:    currentFilters.venueContext,
        competitionType: currentFilters.competitionType,
        matchStage:      currentFilters.matchStage,
      });
      const res  = await fetch(`/api/slice-dice-t20?${params}`);
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      const map = {};
      (data.data || []).forEach(row => { map[row.name] = row; });
      setStats(map);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats(players, filters);
  }, [players, filters, fetchStats]);

  function addPlayer(name) {
    if (players.includes(name) || players.length >= MAX_PLAYERS) return;
    setPlayers(prev => [...prev, name]);
  }

  function removePlayer(name) {
    setPlayers(prev => prev.filter(p => p !== name));
    setStats(prev => { const n = { ...prev }; delete n[name]; return n; });
  }

  function setFilter(key, val) {
    setFilters(prev => ({ ...prev, [key]: val }));
  }

  function resetFilters() {
    setFilters(DEFAULT_FILTERS);
  }

  // Active tab — defaults to first player
  const [activeTab, setActiveTab] = useState(null);
  useEffect(() => {
    if (players.length && !players.includes(activeTab)) setActiveTab(players[0]);
    if (!players.length) setActiveTab(null);
  }, [players]);

  const activePlayer = activeTab && stats[activeTab];

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: 32 }}>
      <div style={{ maxWidth: 900, margin: '0 auto' }}>

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <FlaskConical size={26} style={{ color: '#0891b2' }} />
            <div>
              <h2 style={{ margin: 0, fontSize: 26, fontWeight: 900, color: '#0f172a', letterSpacing: '-0.5px' }}>T20 Lab</h2>
              <p style={{ margin: 0, color: '#94a3b8', fontSize: 13, fontWeight: 500 }}>
                Slice batting stats across any condition
              </p>
            </div>
          </div>
          {loading && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#0891b2', fontSize: 13, fontWeight: 600 }}>
              <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> Loading…
            </div>
          )}
        </div>

        {/* ── Filter bar ──────────────────────────────────────────────────── */}
        <div style={{
          background: '#fff', border: '1.5px solid #e2e8f0', borderRadius: 16,
          padding: '14px 18px', marginBottom: 16,
          display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap',
        }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', marginRight: 4 }}>
            Filters
          </span>
          {FILTERS.map(f => (
            <FilterDropdown key={f.key} filter={f} value={filters[f.key]} onChange={setFilter} />
          ))}
          {hasFilter && (
            <button onClick={resetFilters} style={{
              marginLeft: 'auto', padding: '6px 14px', border: '1.5px solid #fecaca',
              borderRadius: 10, background: '#fff5f5', color: '#dc2626',
              fontSize: 12, fontWeight: 700, cursor: 'pointer',
            }}>
              Reset
            </button>
          )}
        </div>

        {/* ── Player search + tabs row ─────────────────────────────────────── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24, flexWrap: 'wrap' }}>
          {players.length < MAX_PLAYERS && (
            <PlayerSearchBox onAdd={addPlayer} existingPlayers={players} />
          )}
          {/* Tabs */}
          {players.map(name => (
            <button
              key={name}
              onClick={() => setActiveTab(name)}
              style={{
                display: 'flex', alignItems: 'center', gap: 7,
                padding: '8px 16px', borderRadius: 12, cursor: 'pointer',
                fontSize: 13, fontWeight: 700,
                border: activeTab === name ? '2px solid #0891b2' : '1.5px solid #e2e8f0',
                background: activeTab === name ? '#ecfeff' : '#fff',
                color: activeTab === name ? '#0e7490' : '#475569',
                transition: 'all 0.15s',
              }}
            >
              {name}
              <span
                onClick={e => { e.stopPropagation(); removePlayer(name); }}
                style={{ color: activeTab === name ? '#0891b2' : '#cbd5e1', lineHeight: 1, cursor: 'pointer' }}
                onMouseEnter={e => e.currentTarget.style.color = '#e11d48'}
                onMouseLeave={e => e.currentTarget.style.color = activeTab === name ? '#0891b2' : '#cbd5e1'}
              >
                <X size={13} />
              </span>
            </button>
          ))}
          {players.length === MAX_PLAYERS && (
            <span style={{ fontSize: 12, color: '#f59e0b', fontWeight: 600, background: '#fffbeb', padding: '5px 10px', borderRadius: 8, border: '1px solid #fed7aa' }}>
              Max {MAX_PLAYERS}
            </span>
          )}
        </div>

        {/* ── Error ───────────────────────────────────────────────────────── */}
        {error && (
          <div style={{ display: 'flex', gap: 10, background: '#fff1f2', border: '1.5px solid #fecdd3', borderRadius: 12, padding: 16, marginBottom: 20 }}>
            <Info size={16} style={{ color: '#e11d48', marginTop: 1, flexShrink: 0 }} />
            <p style={{ margin: 0, fontSize: 13, color: '#be123c', fontWeight: 500 }}>{error}</p>
          </div>
        )}

        {/* ── Empty state ─────────────────────────────────────────────────── */}
        {!players.length && (
          <div style={{ border: '2px dashed #e2e8f0', borderRadius: 20, padding: '60px 32px', textAlign: 'center', background: '#fafafa' }}>
            <TrendingUp size={40} style={{ color: '#cbd5e1', marginBottom: 16 }} />
            <p style={{ margin: 0, fontWeight: 700, color: '#94a3b8', fontSize: 16 }}>Search and add a player above</p>
            <p style={{ margin: '8px 0 0', color: '#cbd5e1', fontSize: 13 }}>Each player gets their own tab</p>
          </div>
        )}

        {/* ── Player panel ────────────────────────────────────────────────── */}
        {activeTab && (
          <div>
            {loading && !activePlayer ? (
              <div style={{ textAlign: 'center', padding: 60, color: '#94a3b8', fontSize: 14 }}>
                <Loader2 size={24} style={{ animation: 'spin 1s linear infinite', marginBottom: 12 }} />
                <div>Loading stats…</div>
              </div>
            ) : activePlayer ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

                {/* ── Overall + Filtered side by side ─────────────────── */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>

                  {/* Overall card */}
                  <StatCard title="Overall Career" color="#64748b" bg="#f8fafc" border="#e2e8f0">
                    <StatGrid stats={[
                      { label: 'Innings',     value: activePlayer.overall.innings },
                      { label: 'Runs',        value: activePlayer.overall.runs },
                      { label: 'Balls',       value: activePlayer.overall.balls },
                      { label: 'Average',     value: activePlayer.overall.avg },
                      { label: 'Strike Rate', value: activePlayer.overall.sr },
                    ]} />
                  </StatCard>

                  {/* Filtered card */}
                  <StatCard
                    title={hasFilter ? `Filtered: ${filterLabel}` : 'Filtered (no filter active)'}
                    color="#0891b2" bg="#ecfeff" border="#bae6fd"
                  >
                    <StatGrid stats={[
                      { label: 'Innings',     value: activePlayer.filtered.innings },
                      { label: 'Runs',        value: activePlayer.filtered.runs },
                      { label: 'Balls',       value: activePlayer.filtered.balls },
                      { label: 'Average',     value: activePlayer.filtered.avg },
                      { label: 'Strike Rate', value: activePlayer.filtered.sr },
                    ]} highlight />
                  </StatCard>
                </div>

                {/* ── Career analytics ────────────────────────────────── */}
                <StatCard title="Career Analytics" color="#7c3aed" bg="#f5f3ff" border="#ddd6fe">
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                    <StatGroup label="Scoring Pattern">
                      <StatRow label="Dot Ball %"       value={activePlayer.career?.dotPct}       unit="%" />
                      <StatRow label="Boundary %"       value={activePlayer.career?.boundaryPct}  unit="%" />
                      <StatRow label="Balls / Boundary" value={activePlayer.career?.ballsPerBdry} />
                    </StatGroup>
                    <StatGroup label="Contribution">
                      <StatRow label="% of Team Total"  value={activePlayer.career?.contribTeam}  unit="%" />
                      <StatRow label="% of Match Total" value={activePlayer.career?.contribMatch} unit="%" />
                      <StatRow label="Consistency"      value={activePlayer.career?.consistency}
                               sub="σ ÷ median · lower = better" />
                    </StatGroup>
                    <StatGroup label="Win Impact">
                      <StatRow label="Runs in Wins"    value={activePlayer.career?.runsInWins} />
                      <StatRow label="Runs in Losses"  value={activePlayer.career?.runsInLosses} />
                      <StatRow label="Win Contrib %"   value={activePlayer.career?.winContribPct} unit="%" />
                    </StatGroup>
                  </div>
                </StatCard>

              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>No data found for {activeTab}</div>
            )}
          </div>
        )}

      </div>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

// ── Layout helpers ────────────────────────────────────────────────────────────

function StatCard({ title, color, bg, border, children }) {
  return (
    <div style={{ background: bg, border: `1.5px solid ${border}`, borderRadius: 16, padding: 20 }}>
      <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.07em', color, marginBottom: 16 }}>
        {title}
      </div>
      {children}
    </div>
  );
}

function StatGrid({ stats, highlight }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8 }}>
      {stats.map(({ label, value }) => (
        <div key={label} style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600, marginBottom: 4 }}>{label}</div>
          <div style={{ fontSize: 22, fontWeight: 900, color: highlight ? '#0e7490' : '#0f172a' }}>
            {value ?? '-'}
          </div>
        </div>
      ))}
    </div>
  );
}

function StatGroup({ label, children }) {
  return (
    <div style={{ background: '#fff', borderRadius: 12, padding: '14px 16px' }}>
      <div style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#a78bfa', marginBottom: 12 }}>
        {label}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {children}
      </div>
    </div>
  );
}

function StatRow({ label, value, unit, sub }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
      <div>
        <div style={{ fontSize: 12, color: '#64748b', fontWeight: 500 }}>{label}</div>
        {sub && <div style={{ fontSize: 10, color: '#a78bfa', fontWeight: 500 }}>{sub}</div>}
      </div>
      <div style={{ fontSize: 18, fontWeight: 800, color: '#6d28d9', whiteSpace: 'nowrap' }}>
        {value ?? '-'}{value != null && value !== '-' && unit ? unit : ''}
      </div>
    </div>
  );
}
