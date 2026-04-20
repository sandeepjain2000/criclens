"use client";
import React, { useState, useEffect, useCallback } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, CartesianGrid, Legend, ReferenceLine
} from 'recharts';
import { Filter, User, TrendingUp, BarChart2, Target, Award } from 'lucide-react';

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#3b82f6'];

const TABS = [
  { id: 'batting',      label: 'Batting',      icon: BarChart2 },
  { id: 'bowling',      label: 'Bowling',       icon: Target    },
  { id: 'teams',        label: 'Teams',         icon: Award     },
  { id: 'contribution', label: 'Contribution%', icon: TrendingUp },
];

// ── Custom tooltip for contribution charts ─────────────────────────────────────
function ContribTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  return (
    <div style={{ background: '#1e293b', borderRadius: 10, padding: '10px 14px', fontSize: 12, color: '#f8fafc', minWidth: 180 }}>
      <div style={{ fontWeight: 700, marginBottom: 4, color: '#94a3b8', fontSize: 10, lineHeight: 1.3 }}>{label}</div>
      <div>Player: <b style={{ color: '#34d399' }}>{d?.player_runs} runs</b></div>
      <div>Team: <b style={{ color: '#94a3b8' }}>{d?.team_runs} runs</b></div>
      <div style={{ marginTop: 4, borderTop: '1px solid #334155', paddingTop: 4 }}>
        Contribution: <b style={{ color: '#f59e0b', fontSize: 14 }}>{d?.contribution_pct}%</b>
      </div>
    </div>
  );
}

// ── Reusable chart card ────────────────────────────────────────────────────────
function ChartCard({ title, children }) {
  return (
    <div className="bg-white border border-slate-200 p-7 rounded-2xl shadow-sm">
      <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight mt-0 mb-6 border-b border-slate-100 pb-3">
        {title}
      </h3>
      {children}
    </div>
  );
}

// ── Tab: Batting Overview ─────────────────────────────────────────────────────
function BattingTab({ year, opp }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/charts?type=top-batters&year=${year}&opposition=${opp}`)
      .then(r => r.json())
      .then(d => setData(d.data || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [year, opp]);

  if (loading) return <LoadingPulse />;
  return (
    <ChartCard title="Top 10 Batters — Career Runs">
      <div style={{ width: '100%', height: 340 }}>
        <ResponsiveContainer>
          <BarChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 40 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
            <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} angle={-35} textAnchor="end" />
            <YAxis tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
            <Tooltip wrapperStyle={{ outline: 'none' }} cursor={{ fill: '#f8fafc' }} />
            <Bar dataKey="runs" fill="#6366f1" radius={[4, 4, 0, 0]}>
              {data.map((_, i) => <Cell key={i} fill={`hsl(${245 - i * 12}, 70%, ${55 + i * 2}%)`} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  );
}

// ── Tab: Bowling Overview ─────────────────────────────────────────────────────
function BowlingTab({ year, opp }) {
  const [bowlers, setBowlers]   = useState([]);
  const [dismissals, setDismissals] = useState([]);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    setLoading(true);
    const qs = `year=${year}&opposition=${opp}`;
    Promise.all([
      fetch(`/api/charts?type=top-bowlers&${qs}`).then(r => r.json()),
      fetch(`/api/charts?type=dismissal-types&${qs}`).then(r => r.json()),
    ]).then(([b, d]) => {
      setBowlers(b.data || []);
      setDismissals(d.data || []);
    }).catch(console.error).finally(() => setLoading(false));
  }, [year, opp]);

  if (loading) return <LoadingPulse />;
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
      <ChartCard title="Top 10 Bowlers — Career Wickets">
        <div style={{ width: '100%', height: 300 }}>
          <ResponsiveContainer>
            <BarChart data={bowlers} margin={{ top: 4, right: 4, left: 0, bottom: 40 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} angle={-35} textAnchor="end" />
              <YAxis tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <Tooltip wrapperStyle={{ outline: 'none' }} cursor={{ fill: '#f8fafc' }} />
              <Bar dataKey="wickets" fill="#10b981" radius={[4, 4, 0, 0]}>
                {bowlers.map((_, i) => <Cell key={i} fill={`hsl(${160 - i * 8}, 65%, ${45 + i * 2}%)`} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>

      <ChartCard title="Dismissal Breakdown — Mode of Dismissal">
        <div style={{ width: '100%', height: 300 }}>
          <ResponsiveContainer>
            <PieChart>
              <Tooltip wrapperStyle={{ outline: 'none' }} />
              <Pie data={dismissals} cx="50%" cy="50%" innerRadius={55} outerRadius={95}
                paddingAngle={2} dataKey="value"
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                labelLine={false} style={{ fontSize: 10, fill: '#475569', fontWeight: 'bold' }}>
                {dismissals.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>
    </div>
  );
}

// ── Tab: Teams Overview ───────────────────────────────────────────────────────
function TeamsTab({ year, opp }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/charts?type=team-runs&year=${year}&opposition=${opp}`)
      .then(r => r.json())
      .then(d => setData(d.data || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [year, opp]);

  if (loading) return <LoadingPulse />;
  return (
    <ChartCard title="Team Batting Trajectory — Year-on-Year Runs">
      <div style={{ width: '100%', height: 360 }}>
        <ResponsiveContainer>
          <LineChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
            <XAxis dataKey="year" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
            <Tooltip wrapperStyle={{ outline: 'none' }} />
            <Legend wrapperStyle={{ fontSize: '10px' }} />
            <Line type="monotone" dataKey="India"        stroke="#10b981" strokeWidth={3} dot={{ r: 3 }} activeDot={{ r: 5 }} />
            <Line type="monotone" dataKey="Australia"    stroke="#f59e0b" strokeWidth={3} dot={{ r: 3 }} />
            <Line type="monotone" dataKey="England"      stroke="#ef4444" strokeWidth={2} opacity={0.7} dot={false} />
            <Line type="monotone" dataKey="South Africa" stroke="#8b5cf6" strokeWidth={2} opacity={0.7} dot={false} />
            <Line type="monotone" dataKey="New Zealand"  stroke="#3b82f6" strokeWidth={2} opacity={0.7} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  );
}

// ── Tab: Contribution % ───────────────────────────────────────────────────────
function ContributionTab({ teams }) {
  const [playerInput, setPlayerInput] = useState('V Kohli');
  const [playerQuery, setPlayerQuery] = useState('V Kohli');
  const [threshold, setThreshold]     = useState(25);
  const [threshInput, setThreshInput] = useState('25');
  const [host, setHost]               = useState('all');
  const [homeAway, setHomeAway]       = useState('all');
  const [contribData, setContribData] = useState({ matchByMatch: [], yearOnYear: [] });
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState('');

  const fetchData = useCallback((name, hst = 'all', ha = 'all') => {
    if (!name.trim()) return;
    setLoading(true);
    setError('');
    const qs = `type=batsman-contribution&player=${encodeURIComponent(name.trim())}&host=${hst}&homeAway=${ha}`;
    fetch(`/api/charts?${qs}`)
      .then(r => r.json())
      .then(d => {
        if (d.success) {
          const mb = d.data?.matchByMatch || [];
          const yy = d.data?.yearOnYear   || [];
          if (!mb.length && !yy.length) setError(`No data found for "${name}". Check the exact name in Player Vault.`);
          setContribData({ matchByMatch: mb, yearOnYear: yy });
        } else {
          setError(d.error || 'Failed to load.');
        }
      })
      .catch(() => setError('Network error.'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchData('V Kohli', host, homeAway); }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    setPlayerQuery(playerInput);
    fetchData(playerInput, host, homeAway);
  };

  const applyThreshold = (e) => {
    e.preventDefault();
    const val = parseFloat(threshInput);
    if (!isNaN(val) && val >= 0 && val <= 100) setThreshold(val);
  };

  const { matchByMatch, yearOnYear } = contribData;

  // Innings exceeding threshold
  const exceededCount = matchByMatch.filter(r => r.contribution_pct >= threshold).length;
  const totalInnings  = matchByMatch.length;

  // Years exceeding threshold
  const yyExceededCount = yearOnYear.filter(r => r.contribution_pct >= threshold).length;
  const yyTotalYears    = yearOnYear.length;

  // Career average
  const avgContrib = yearOnYear.length
    ? (yearOnYear.reduce((s, r) => s + r.contribution_pct, 0) / yearOnYear.length).toFixed(1)
    : null;

  return (
    <div className="space-y-8">

      {/* Controls row */}
      <div className="flex flex-wrap items-end gap-x-6 gap-y-4 bg-slate-50 border border-slate-200 p-5 rounded-xl shadow-sm">
        
        {/* Player search */}
        <form onSubmit={handleSearch} className="flex items-center gap-3">
          <div className="flex items-center bg-white border border-slate-300 rounded-lg px-4 py-2 shadow-sm gap-2">
            <User size={15} className="text-slate-400 shrink-0" />
            <input type="text" value={playerInput} onChange={e => setPlayerInput(e.target.value)}
              placeholder="e.g. V Kohli"
              className="outline-none text-sm text-slate-800 font-medium bg-transparent w-36" />
          </div>
          <button type="submit"
            className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold px-4 py-2 rounded-lg transition-colors">
            Analyse
          </button>
        </form>

        {/* Home/Away & Host Filters */}
        <div className="flex items-center gap-3">
          <Filter size={15} className="text-slate-400" />
          <select value={homeAway} onChange={e => { setHomeAway(e.target.value); fetchData(playerInput, host, e.target.value); }}
            className="border border-slate-300 rounded-lg px-3 py-2 text-sm font-medium outline-none bg-white">
            <option value="all">Home & Away</option>
            <option value="home">Home Matches</option>
            <option value="away">Away Matches</option>
          </select>
          <select value={host} onChange={e => { setHost(e.target.value); fetchData(playerInput, e.target.value, homeAway); }}
            className="border border-slate-300 rounded-lg px-3 py-2 text-sm font-medium outline-none bg-white">
            <option value="all">Any Host Country</option>
            {teams?.map(t => <option key={t} value={t}>Host: {t}</option>)}
          </select>
        </div>

        {/* Threshold setter */}
        <form onSubmit={applyThreshold} className="flex items-center gap-2 ml-auto">
          <span className="text-xs text-slate-500 font-semibold uppercase tracking-wide">Threshold %</span>
          <input type="number" value={threshInput} min={0} max={100} step={1}
            onChange={e => setThreshInput(e.target.value)}
            className="border border-slate-300 rounded-lg px-3 py-2 text-sm font-bold text-slate-800 outline-none bg-white w-16 text-center" />
          <button type="submit"
            className="bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold px-4 py-2 rounded-lg transition-colors">
            Set
          </button>
        </form>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-5 py-3 text-sm font-medium">{error}</div>
      )}

      {loading ? <LoadingPulse /> : (
        <>
          {/* Chart 1 — Innings by Innings */}
          <div className="bg-white border border-slate-200 p-7 rounded-2xl shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-4 mb-6 border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight m-0">
                  {playerQuery} — Contribution % per Innings
                </h3>
                <p className="text-xs text-slate-400 mt-1 m-0">{totalInnings} innings recorded</p>
              </div>
              {/* Stat badge */}
              {totalInnings > 0 && (
                <div className="flex items-center gap-3">
                  <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5 text-center">
                    <div className="text-2xl font-black text-amber-600 leading-none">{exceededCount}</div>
                    <div className="text-xs text-amber-500 font-semibold mt-0.5">of {totalInnings} innings</div>
                    <div className="text-xs text-slate-400 mt-0.5">≥ {threshold}% contribution</div>
                  </div>
                  <div className="bg-indigo-50 border border-indigo-200 rounded-xl px-4 py-2.5 text-center">
                    <div className="text-2xl font-black text-indigo-600 leading-none">
                      {totalInnings > 0 ? ((exceededCount / totalInnings) * 100).toFixed(0) : 0}%
                    </div>
                    <div className="text-xs text-indigo-500 font-semibold mt-0.5">hit rate</div>
                    <div className="text-xs text-slate-400 mt-0.5">above {threshold}%</div>
                  </div>
                </div>
              )}
            </div>

            {matchByMatch.length === 0 ? (
              <div className="text-center py-12 text-slate-400 text-sm">No innings data found</div>
            ) : (
              <div style={{ width: '100%', height: 320 }}>
                <ResponsiveContainer>
                  <BarChart data={matchByMatch} margin={{ top: 8, right: 8, left: 0, bottom: 60 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="match" tick={{ fontSize: 8, fill: '#94a3b8' }} axisLine={false} tickLine={false}
                      angle={-45} textAnchor="end"
                      interval={Math.max(0, Math.floor(matchByMatch.length / 15))} />
                    <YAxis tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false}
                      tickFormatter={v => `${v}%`} domain={[0, 100]} />
                    <Tooltip content={<ContribTooltip />} cursor={{ fill: '#f8fafc' }} />
                    <ReferenceLine y={threshold} stroke="#f59e0b" strokeDasharray="5 4" strokeWidth={2}
                      label={{ value: `${threshold}%`, position: 'insideTopRight', fontSize: 10, fill: '#f59e0b', fontWeight: 700 }} />
                    <Bar dataKey="contribution_pct" name="Contribution %" radius={[3, 3, 0, 0]}>
                      {matchByMatch.map((r, i) => (
                        <Cell key={i} fill={r.contribution_pct >= threshold ? '#6366f1' : '#cbd5e1'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Chart 2 — Year on Year */}
          <div className="bg-white border border-slate-200 p-7 rounded-2xl shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-4 mb-6 border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight m-0">
                  {playerQuery} — Year-on-Year Contribution %
                </h3>
                <p className="text-xs text-slate-400 mt-1 m-0">Aggregated per calendar year</p>
                {avgContrib && (
                  <span className="inline-block mt-2 text-xs bg-emerald-50 text-emerald-600 font-bold px-3 py-1 rounded-full border border-emerald-200">
                    Career avg {avgContrib}%
                  </span>
                )}
              </div>
              
              {/* Stat badge */}
              {yyTotalYears > 0 && (
                <div className="flex items-center gap-3">
                  <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5 text-center">
                    <div className="text-2xl font-black text-amber-600 leading-none">{yyExceededCount}</div>
                    <div className="text-xs text-amber-500 font-semibold mt-0.5">of {yyTotalYears} years</div>
                    <div className="text-xs text-slate-400 mt-0.5">≥ {threshold}% contribution</div>
                  </div>
                  <div className="bg-indigo-50 border border-indigo-200 rounded-xl px-4 py-2.5 text-center">
                    <div className="text-2xl font-black text-indigo-600 leading-none">
                      {yyTotalYears > 0 ? ((yyExceededCount / yyTotalYears) * 100).toFixed(0) : 0}%
                    </div>
                    <div className="text-xs text-indigo-500 font-semibold mt-0.5">hit rate</div>
                    <div className="text-xs text-slate-400 mt-0.5">above {threshold}%</div>
                  </div>
                </div>
              )}
            </div>

            {yearOnYear.length === 0 ? (
              <div className="text-center py-12 text-slate-400 text-sm">No yearly data found</div>
            ) : (
              <div style={{ width: '100%', height: 320 }}>
                <ResponsiveContainer>
                  <BarChart data={yearOnYear} margin={{ top: 8, right: 8, left: 0, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="year" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false}
                      tickFormatter={v => `${v}%`} domain={[0, 100]} />
                    <Tooltip content={<ContribTooltip />} cursor={{ fill: '#f8fafc' }} />
                    {avgContrib && (
                      <ReferenceLine y={Number(avgContrib)} stroke="#10b981" strokeDasharray="5 5" strokeWidth={2}
                        label={{ value: `Avg ${avgContrib}%`, position: 'insideTopRight', fontSize: 10, fill: '#10b981', fontWeight: 700 }} />
                    )}
                    <ReferenceLine y={threshold} stroke="#f59e0b" strokeDasharray="4 4" strokeWidth={1.5}
                      label={{ value: `${threshold}%`, position: 'insideBottomRight', fontSize: 10, fill: '#f59e0b', fontWeight: 700 }} />
                    <Bar dataKey="contribution_pct" name="Contribution %" radius={[4, 4, 0, 0]}>
                      {yearOnYear.map((r, i) => (
                        <Cell key={i} fill={r.contribution_pct >= threshold ? '#10b981' : '#94a3b8'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// ── Loading pulse ─────────────────────────────────────────────────────────────
function LoadingPulse() {
  return (
    <div className="text-center py-24 text-slate-400 font-bold uppercase tracking-widest text-sm animate-pulse">
      Loading chart data…
    </div>
  );
}

// ── Main Analytics component ──────────────────────────────────────────────────
export default function AnalyticsTab() {
  const [activeTab, setActiveTab] = useState('batting');
  const [filters, setFilters]     = useState({ years: [], teams: [] });
  const [selectedYear, setSelectedYear] = useState('all');
  const [selectedOpp,  setSelectedOpp]  = useState('all');

  useEffect(() => {
    fetch('/api/charts?getFilters=true')
      .then(r => r.json())
      .then(d => { if (d.success) setFilters(d.filters); })
      .catch(console.error);
  }, []);

  return (
    <div className="py-10 max-w-5xl mx-auto pb-20">

      {/* Page header */}
      <div className="mb-8">
        <h2 className="text-3xl font-black text-slate-900 mb-1 mt-0 tracking-tight">Analytics Hub</h2>
        <p className="text-slate-500 font-medium m-0">Telemetry Visualizations · Powered by Cricsheet</p>
      </div>

      {/* Tab bar + global filters row */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-8">

        {/* Tabs */}
        <div className="flex bg-slate-100 rounded-xl p-1 gap-1">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => setActiveTab(id)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                activeTab === id
                  ? 'bg-white text-indigo-700 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }`}>
              <Icon size={14} />
              {label}
            </button>
          ))}
        </div>

        {/* Global filters — hidden on Contribution tab (player-specific) */}
        {activeTab !== 'contribution' && (
          <div className="flex items-center gap-3">
            <Filter size={14} className="text-slate-400" />
            <select value={selectedYear} onChange={e => setSelectedYear(e.target.value)}
              className="border border-slate-300 rounded-lg px-3 py-2 text-sm font-medium outline-none bg-white">
              <option value="all">Any Year</option>
              {filters.years?.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
            <select value={selectedOpp} onChange={e => setSelectedOpp(e.target.value)}
              className="border border-slate-300 rounded-lg px-3 py-2 text-sm font-medium outline-none bg-white">
              <option value="all">Any Opposition</option>
              {filters.teams?.map(t => <option key={t} value={t}>vs {t}</option>)}
            </select>
          </div>
        )}
      </div>

      {/* Tab content — only renders active tab */}
      <div>
        {activeTab === 'batting'      && <BattingTab      year={selectedYear} opp={selectedOpp} />}
        {activeTab === 'bowling'      && <BowlingTab      year={selectedYear} opp={selectedOpp} />}
        {activeTab === 'teams'        && <TeamsTab        year={selectedYear} opp={selectedOpp} />}
        {activeTab === 'contribution' && <ContributionTab teams={filters.teams} />}
      </div>

    </div>
  );
}
