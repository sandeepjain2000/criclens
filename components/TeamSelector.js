"use client";
import React, { useState, useEffect, useMemo } from 'react';
import {
  Users, X, Shield, Zap, Activity,
  AlertCircle, RefreshCw, Sparkles, TrendingUp, Info, ChevronDown, Copy, Globe, Search
} from 'lucide-react';

// Top 10 cricket nations — shown first in the country picker
const MAJOR_COUNTRIES = [
  'India','Australia','England','Pakistan','South Africa',
  'New Zealand','Sri Lanka','West Indies','Bangladesh','Afghanistan',
];

// Full-name lookup for common CricSheet abbreviated names
const PLAYER_FULL_NAMES = {
  // India
  'V Kohli':'Virat Kohli', 'RG Sharma':'Rohit Sharma', 'JJ Bumrah':'Jasprit Bumrah',
  'KL Rahul':'KL Rahul', 'SA Yadav':'Suryakumar Yadav', 'RR Pant':'Rishabh Pant',
  'RA Jadeja':'Ravindra Jadeja', 'YS Chahal':'Yuzvendra Chahal',
  'B Kumar':'Bhuvneshwar Kumar', 'YBK Jaiswal':'Yashasvi Jaiswal',
  'HH Pandya':'Hardik Pandya', 'Shubman Gill':'Shubman Gill',
  'Rinku Singh':'Rinku Singh', 'AR Patel':'Axar Patel',
  'Arshdeep Singh':'Arshdeep Singh', 'Mohammed Siraj':'Mohammed Siraj',
  'S Samson':'Sanju Samson', 'DL Chahar':'Deepak Chahar',
  'SN Thakur':'Shardul Thakur', 'Washington Sundar':'Washington Sundar',
  'Ravi Bishnoi':'Ravi Bishnoi', 'KH Ahmed':'Khaleel Ahmed',
  'Harshit Rana':'Harshit Rana', 'N Kumar Reddy':'Nitish Kumar Reddy',
  'Abhishek Sharma':'Abhishek Sharma', 'Tilak Varma':'Tilak Varma',
  'Kuldeep Yadav':'Kuldeep Yadav', 'R Ashwin':'Ravichandran Ashwin',
  'Mohammed Shami':'Mohammed Shami', 'SS Iyer':'Shreyas Iyer',
  'MA Agarwal':'Mayank Agarwal', 'CA Pujara':'Cheteshwar Pujara',
  'AM Rahane':'Ajinkya Rahane', 'WP Saha':'Wriddhiman Saha',
  'I Sharma':'Ishant Sharma', 'UT Yadav':'Umesh Yadav',
  'T Natarajan':'T Natarajan', 'Navdeep Saini':'Navdeep Saini',
  'S Nadeem':'Shahbaz Nadeem', 'GH Vihari':'Hanuma Vihari',
  // Australia
  'SPD Smith':'Steve Smith', 'DA Warner':'David Warner',
  'GJ Maxwell':'Glenn Maxwell', 'MR Marsh':'Mitchell Marsh',
  'PJ Cummins':'Pat Cummins', 'JR Hazlewood':'Josh Hazlewood',
  'MA Starc':'Mitchell Starc', 'MS Wade':'Matthew Wade',
  'T Head':'Travis Head', 'MP Stoinis':'Marcus Stoinis',
  'AT Finch':'Aaron Finch', 'A Finch':'Aaron Finch',
  'Cameron Green':'Cameron Green', 'D Warner':'David Warner',
  // England
  'JE Root':'Joe Root', 'BEN Stokes':'Ben Stokes',
  'JC Buttler':'Jos Buttler', 'JM Bairstow':'Jonny Bairstow',
  'MA Wood':'Mark Wood', 'MJ Ali':'Moeen Ali',
  'CR Woakes':'Chris Woakes', 'LS Livingstone':'Liam Livingstone',
  'JJ Roy':'Jason Roy', 'SCJ Broad':'Stuart Broad',
  'EJG Morgan':'Eoin Morgan', 'BA Stokes':'Ben Stokes',
  // Pakistan
  'Babar Azam':'Babar Azam', 'Mohammad Rizwan':'Mohammad Rizwan',
  'Shaheen Afridi':'Shaheen Shah Afridi', 'Shadab Khan':'Shadab Khan',
  'Fakhar Zaman':'Fakhar Zaman', 'Naseem Shah':'Naseem Shah',
  'Hasan Ali':'Hasan Ali', 'Imam ul Haq':'Imam-ul-Haq',
  // South Africa
  'K Rabada':'Kagiso Rabada', 'Q de Kock':'Quinton de Kock',
  'AB de Villiers':'AB de Villiers', 'F du Plessis':'Faf du Plessis',
  'Temba Bavuma':'Temba Bavuma', 'KA Maharaj':'Keshav Maharaj',
  'L Ngidi':'Lungi Ngidi', 'Anrich Nortje':'Anrich Nortje',
  'David Miller':'David Miller', 'HM Amla':'Hashim Amla',
  // New Zealand
  'KS Williamson':'Kane Williamson', 'TR Southee':'Tim Southee',
  'TA Boult':'Trent Boult', 'MJ Henry':'Matt Henry',
  'MJ Guptill':'Martin Guptill', 'GD Phillips':'Glenn Phillips',
  'DP Conway':'Devon Conway', 'CJ Anderson':'Corey Anderson',
  // West Indies
  'KA Pollard':'Kieron Pollard', 'SP Narine':'Sunil Narine',
  'DJ Bravo':'Dwayne Bravo', 'CH Gayle':'Chris Gayle',
  'A Russell':'Andre Russell', 'N Pooran':'Nicholas Pooran',
  'SS Hetmyer':'Shimron Hetmyer', 'Shai Hope':'Shai Hope',
  // Sri Lanka
  'W Hasaranga':'Wanindu Hasaranga', 'C Asalanka':'Charith Asalanka',
  'D Chameera':'Dushmantha Chameera', 'AD Mathews':'Angelo Mathews',
  'PBB Rajapaksa':'Bhanuka Rajapaksa',
  // Bangladesh
  'Shakib Al Hasan':'Shakib Al Hasan', 'Tamim Iqbal':'Tamim Iqbal',
  'Mushfiqur Rahim':'Mushfiqur Rahim', 'Mahmudullah':'Mahmudullah',
  'Mustafizur Rahman':'Mustafizur Rahman', 'Taskin Ahmed':'Taskin Ahmed',
  // Afghanistan
  'Rashid Khan':'Rashid Khan', 'Mohammad Nabi':'Mohammad Nabi',
  'Mujeeb Ur Rahman':'Mujeeb Ur Rahman', 'Ibrahim Zadran':'Ibrahim Zadran',
  // Zimbabwe
  'Sikandar Raza':'Sikandar Raza', 'SC Williams':'Sean Williams',
  'BRM Taylor':'Brendan Taylor', 'BN Muzarabani':'Blessing Muzarabani',
};

function fullName(name) {
  return PLAYER_FULL_NAMES[name] || name;
}

const FORMATS = [
  { key: 'T20I', apiKey: 't20i', icon: Zap     },
  { key: 'ODI',  apiKey: 'odi',  icon: Activity },
  { key: 'Test', apiKey: 'test', icon: Shield   },
];

const ROLE_COLORS = {
  BAT:     'text-emerald-700 bg-emerald-50 border-emerald-200',
  WK:      'text-sky-700     bg-sky-50     border-sky-200',
  AR:      'text-purple-700  bg-purple-50  border-purple-200',
  BWL:     'text-blue-700    bg-blue-50    border-blue-200',
  'P-BOW': 'text-orange-700  bg-orange-50  border-orange-200',
};

const RANK_LABEL_COLORS = {
  'Batsman':     'bg-emerald-100 text-emerald-700',
  'WK':          'bg-sky-100     text-sky-700',
  'All-Rounder': 'bg-purple-100  text-purple-700',
  'Pace Bowler': 'bg-orange-100  text-orange-700',
  'Spin Bowler': 'bg-indigo-100  text-indigo-700',
  'Bowler':      'bg-blue-100    text-blue-700',
};

const MAX_SQUAD   = 11;
const DEFAULT_REQS = { batsmen: 4, wk: 1, allRounders: 2, paceBowlers: 2, spinBowlers: 2 };
const ROLE_FIELDS = [
  { key: 'batsmen',      label: 'Batsmen',      icon: '🏏', hint: 'Pure batters' },
  { key: 'wk',          label: 'Wicket-Keeper', icon: '🧤', hint: 'WK role' },
  { key: 'allRounders', label: 'All-Rounders',  icon: '✦',  hint: 'AR role' },
  { key: 'paceBowlers', label: 'Pace Bowlers',  icon: '⚡', hint: 'Fast / medium' },
  { key: 'spinBowlers', label: 'Spin Bowlers',  icon: '🌀', hint: 'Off-break / leg-spin' },
];

function exportSquad(squad, label) {
  const lines = [
    `CricLens — ${label} XI`,
    '='.repeat(40),
    ...squad.map((p, i) =>
      `${String(i + 1).padStart(2)}. ${fullName(p.player_name).padEnd(26)} [${(p.rank_label || '—').padEnd(12)}]  score: ${p.rank_score ?? '—'}`
    ),
    '',
    `Generated: ${new Date().toLocaleString()}`,
  ];
  navigator.clipboard.writeText(lines.join('\n'));
}

// ── Sub-components ────────────────────────────────────────────────────────────

function RoleCounter({ field, value, onChange, total }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
      <div className="flex items-center gap-2">
        <span className="text-base w-5 text-center">{field.icon}</span>
        <div>
          <div className="font-bold text-slate-700 text-xs">{field.label}</div>
          <div className="text-[10px] text-slate-400">{field.hint}</div>
        </div>
      </div>
      <div className="flex items-center gap-1.5">
        <button onClick={() => onChange(Math.max(0, value - 1))} disabled={value === 0}
          className="w-6 h-6 rounded-md bg-slate-100 hover:bg-slate-200 font-black text-slate-600 flex items-center justify-center text-sm transition-all disabled:opacity-30 cursor-pointer">−</button>
        <span className="w-5 text-center font-black text-slate-800 text-sm">{value}</span>
        <button onClick={() => onChange(value + 1)} disabled={total >= MAX_SQUAD}
          className="w-6 h-6 rounded-md bg-slate-100 hover:bg-emerald-100 hover:text-emerald-700 font-black text-slate-600 flex items-center justify-center text-sm transition-all disabled:opacity-30 cursor-pointer">+</button>
      </div>
    </div>
  );
}

function SquadCard({ player, index, onRemove }) {
  // Use rank_label to drive the role badge (more reliable than playing_role from DB)
  const labelToRole = { 'Batsman':'BAT','WK':'WK','All-Rounder':'AR','Pace Bowler':'P-BOW','Spin Bowler':'BWL','Bowler':'BWL' };
  const displayRole = labelToRole[player.rank_label] || player.playing_role || player.eff_role || '—';
  const roleClass   = ROLE_COLORS[displayRole] || 'text-slate-600 bg-slate-50 border-slate-200';
  const labelClass  = RANK_LABEL_COLORS[player.rank_label] || 'bg-slate-100 text-slate-500';

  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-100 rounded-lg hover:border-emerald-200 transition-all group">
      <span className="text-[10px] font-mono text-slate-300 w-4 text-right shrink-0">{index + 1}</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="font-bold text-slate-800 text-sm leading-tight">{fullName(player.player_name)}</span>
          {player.rank_label && (
            <span className={`text-[9px] font-black px-1.5 py-0.5 rounded ${labelClass}`}>{player.rank_label}</span>
          )}
        </div>
        {player.rank_score !== undefined && (
          <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-0.5">
            <TrendingUp size={8}/> {player.rank_score}
          </span>
        )}
      </div>
      <span className={`text-[9px] font-black uppercase border px-1 py-0.5 rounded shrink-0 ${roleClass}`}>
        {displayRole}
      </span>
      <button onClick={() => onRemove(player)}
        className="text-slate-200 hover:text-red-400 transition-colors cursor-pointer opacity-0 group-hover:opacity-100 shrink-0 ml-0.5">
        <X size={12} />
      </button>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────

export default function TeamSelector() {
  const [format,       setFormat]       = useState('T20I');
  const [country,      setCountry]      = useState('');
  const [countries,    setCountries]    = useState([]);
  const [requirements, setRequirements] = useState({ ...DEFAULT_REQS });
  const [loading,      setLoading]      = useState(false);
  const [error,        setError]        = useState('');
  const [note,         setNote]         = useState('');
  const [squad,        setSquad]        = useState([]);
  const [source,       setSource]       = useState('');
  const [hasResult,    setHasResult]    = useState(false);
  const [copied,       setCopied]       = useState(false);
  const [countrySearch, setCountrySearch] = useState('');

  const formatObj = FORMATS.find(f => f.key === format);

  useEffect(() => {
    setCountries([]); setCountry(''); setSquad([]); setHasResult(false); setError('');
    fetch(`/api/team-selector?format=${formatObj.apiKey}`)
      .then(r => r.json())
      .then(d => { if (!d.error) setCountries(d.countries || []); })
      .catch(console.error);
  }, [format]);

  // Split countries into major / other based on the top-10 list,
  // then filter both groups by the search text.
  const filteredMajor = useMemo(() => {
    const q = countrySearch.toLowerCase();
    return MAJOR_COUNTRIES.filter(c => countries.includes(c) && c.toLowerCase().includes(q));
  }, [countries, countrySearch]);

  const filteredOther = useMemo(() => {
    const q = countrySearch.toLowerCase();
    return countries
      .filter(c => !MAJOR_COUNTRIES.includes(c) && c.toLowerCase().includes(q))
      .sort();
  }, [countries, countrySearch]);

  useEffect(() => { if (country) handleBuild(); }, [country]);

  const reqTotal = Object.values(requirements).reduce((a, b) => a + b, 0);
  const reqValid = reqTotal === MAX_SQUAD;
  function setReq(k, v) { setRequirements(r => ({ ...r, [k]: Math.max(0, v) })); }

  async function handleBuild() {
    if (!reqValid || !country) return;
    setLoading(true); setError(''); setNote(''); setSquad([]); setHasResult(false);
    try {
      const res  = await fetch('/api/team-selector', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ format: formatObj.apiKey, country, requirements }),
      });
      const data = await res.json();
      if (data.error) { setError(typeof data.error === 'string' ? data.error : data.message); return; }
      setSquad(data.squad || []);
      setSource(data.source || '');
      setHasResult(true);
      if (data.note) setNote(data.note);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }

  function handleCopy() {
    exportSquad(squad, `${country} ${format}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function removeFromSquad(p) { setSquad(s => s.filter(x => x.player_name !== p.player_name)); }

  // Use rank_label for accurate counting (not raw DB playing_role)
  const labelToType = (lbl) => {
    if (!lbl) return 'other';
    if (['Batsman','WK'].includes(lbl)) return 'bat';
    if (['Pace Bowler','Spin Bowler','Bowler'].includes(lbl)) return 'bowl';
    if (lbl === 'All-Rounder') return 'ar';
    return 'other';
  };
  const squadCounts = useMemo(() => ({
    bat:  squad.filter(p => labelToType(p.rank_label) === 'bat').length,
    bowl: squad.filter(p => labelToType(p.rank_label) === 'bowl').length,
    wk:   squad.filter(p => p.rank_label === 'WK').length,
    ar:   squad.filter(p => p.rank_label === 'All-Rounder').length,
  }), [squad]);

  return (
    <div className="max-w-5xl mx-auto py-6 px-2">

      {/* Header */}
      <div className="mb-5">
        <div className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-emerald-100 mb-2">
          <Sparkles size={10}/> AI Team Selector
        </div>
        <h2 className="text-2xl font-black text-slate-900 mb-0.5">Auto-Build Best XI</h2>
        <p className="text-slate-400 text-sm">Select a country — system proposes the strongest XI from active players by career ratings</p>
      </div>

      {/* Format Toggle */}
      <div className="flex bg-slate-100 rounded-lg p-0.5 gap-0.5 w-fit mb-5">
        {FORMATS.map(({ key, icon: Icon }) => (
          <button key={key} onClick={() => { setFormat(key); setSquad([]); setHasResult(false); }}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-black transition-all ${format === key ? 'bg-white shadow text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}>
            <Icon size={13}/> {key}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">

        {/* ── LEFT — Config (2/5) ── */}
        <div className="lg:col-span-2 space-y-3">

          {/* Country */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1">
              <Globe size={10}/> Country
            </label>

            {/* Search filter */}
            <div className="relative mb-2">
              <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"/>
              <input
                type="text"
                placeholder="Filter countries…"
                value={countrySearch}
                onChange={e => setCountrySearch(e.target.value)}
                className="w-full text-xs border border-slate-200 rounded-lg pl-7 pr-3 py-2 bg-slate-50 text-slate-700 placeholder-slate-300 focus:outline-none focus:border-emerald-400 focus:bg-white transition-all"
              />
              {countrySearch && (
                <button onClick={() => setCountrySearch('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500 cursor-pointer">
                  <X size={11}/>
                </button>
              )}
            </div>

            {/* Grouped select */}
            <div className="relative">
              <select value={country} onChange={e => setCountry(e.target.value)}
                className="w-full text-sm border-2 border-emerald-400 rounded-lg px-3 py-2.5 bg-white text-slate-800 font-bold focus:outline-none focus:border-emerald-500 appearance-none cursor-pointer"
                style={{ paddingRight: '2rem' }}>
                <option value="">— Pick a country —</option>

                {filteredMajor.length > 0 && (
                  <optgroup label="⭐ Major Nations">
                    {filteredMajor.map(c => <option key={c} value={c}>{c}</option>)}
                  </optgroup>
                )}

                {filteredOther.length > 0 && (
                  <optgroup label="🌍 Other Nations">
                    {filteredOther.map(c => <option key={c} value={c}>{c}</option>)}
                  </optgroup>
                )}

                {filteredMajor.length === 0 && filteredOther.length === 0 && (
                  <option disabled>No matches for "{countrySearch}"</option>
                )}
              </select>
              <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-emerald-500 pointer-events-none"/>
            </div>

            {country && !loading && (
              <p className="text-[10px] text-emerald-600 font-bold mt-1.5 flex items-center gap-1">
                <Sparkles size={9}/> Auto-building {format} XI for {country}
              </p>
            )}
          </div>

          {/* Role Requirements */}
          <div className="bg-white border border-slate-200 rounded-xl px-4 py-3 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Role Requirements</span>
              <span className={`text-xs font-black px-2 py-0.5 rounded-md ${reqValid ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                {reqTotal}/11
              </span>
            </div>
            {ROLE_FIELDS.map(f => (
              <RoleCounter key={f.key} field={f} value={requirements[f.key]}
                onChange={v => setReq(f.key, v)} total={reqTotal}/>
            ))}
          </div>

          {/* Validation / Error / Note */}
          {!reqValid && (
            <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-xs text-amber-700 font-bold">
              <AlertCircle size={12}/>
              {reqTotal < 11 ? `Add ${11 - reqTotal} more` : `Remove ${reqTotal - 11}`} — need exactly 11
            </div>
          )}
          {error && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-xs text-red-600 font-bold">
              <AlertCircle size={12}/> {error}
            </div>
          )}
          {note && (
            <div className="flex items-center gap-2 bg-indigo-50 border border-indigo-100 rounded-lg px-3 py-2 text-xs text-indigo-600">
              <Info size={11}/> {note}
            </div>
          )}

          {/* Rebuild button */}
          <button onClick={handleBuild} disabled={!reqValid || loading || !country}
            className="w-full py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white font-black text-xs flex items-center justify-center gap-2 transition-all cursor-pointer">
            {loading
              ? <><RefreshCw size={13} className="animate-spin"/> Building…</>
              : <><Sparkles size={13}/> {country ? `Rebuild XI` : 'Select Country First'}</>}
          </button>

          {source && (
            <p className="text-[10px] text-slate-400 text-center">{source}</p>
          )}
        </div>

        {/* ── RIGHT — Squad (3/5) ── */}
        <div className="lg:col-span-3">

          {/* Squad summary strip */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 mb-3 flex items-center justify-between">
            <div>
              <p className="font-black text-slate-700 text-sm">{country || '—'} {format} XI</p>
              <p className="text-[10px] text-slate-400">
                {hasResult ? '⚡ Auto-ranked by performance' : 'Awaiting country selection'}
              </p>
            </div>
            <div className="flex items-center gap-3">
              {/* Compact stat pills */}
              <div className="flex gap-1.5 text-[10px] font-black">
                {[
                  { l:'BAT', v: squadCounts.bat,  ok: squadCounts.bat  >= 4 },
                  { l:'BWL', v: squadCounts.bowl, ok: squadCounts.bowl >= 3 },
                  { l:'WK',  v: squadCounts.wk,   ok: squadCounts.wk  >= 1 },
                  { l:'AR',  v: squadCounts.ar,   ok: true },
                ].map(({ l, v, ok }) => (
                  <span key={l} className={`px-1.5 py-0.5 rounded ${ok ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-500'}`}>
                    {l}: {v}
                  </span>
                ))}
              </div>
              <span className={`text-lg font-black ${squad.length === MAX_SQUAD ? 'text-emerald-600' : 'text-slate-400'}`}>
                {squad.length}<span className="text-slate-300 text-sm">/{MAX_SQUAD}</span>
              </span>
            </div>
          </div>

          {/* Squad table */}
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
            <div className="px-4 py-2.5 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Selected XI</span>
              <div className="flex items-center gap-2">
                {squad.length > 0 && (
                  <button onClick={handleCopy} title="Copy squad to clipboard"
                    className={`flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded border transition-all cursor-pointer ${copied ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-white text-slate-400 border-slate-200 hover:text-slate-700 hover:border-slate-300'}`}>
                    <Copy size={11}/> {copied ? 'Copied!' : 'Copy'}
                  </button>
                )}
                {squad.length > 0 && (
                  <button onClick={() => { setSquad([]); setHasResult(false); }}
                    className="text-[10px] text-red-400 hover:text-red-600 font-bold cursor-pointer">Clear</button>
                )}
              </div>
            </div>

            <div className="p-2.5 space-y-1.5">
              {loading ? (
                <div className="flex flex-col items-center py-10 text-slate-400 animate-pulse">
                  <RefreshCw size={20} className="mb-2 animate-spin"/>
                  <p className="text-[10px] font-black uppercase tracking-widest">Building XI…</p>
                </div>
              ) : squad.length === 0 ? (
                <div className="text-center py-10 text-slate-400">
                  <Users size={24} className="mx-auto mb-2 opacity-30"/>
                  <p className="text-xs">{country ? 'No players found.' : 'Select a country to auto-build'}</p>
                </div>
              ) : (
                squad.map((p, i) => (
                  <SquadCard key={p.player_name} player={p} index={i} onRemove={removeFromSquad}/>
                ))
              )}
              {squad.length > 0 && squad.length < MAX_SQUAD && Array.from({ length: MAX_SQUAD - squad.length }).map((_, i) => (
                <div key={`e-${i}`} className="flex items-center gap-2 px-3 py-2 border border-dashed border-slate-100 rounded-lg">
                  <span className="text-[10px] font-mono text-slate-200 w-4 text-right">{squad.length + i + 1}</span>
                  <span className="text-xs text-slate-200 italic">Empty slot</span>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
