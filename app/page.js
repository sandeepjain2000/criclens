"use client";

import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Search, BarChart2, Users, Activity, Database, Filter, ChevronDown, TrendingUp, Target, Shield, Zap, MoreVertical, Plus, Trash2, Info, ArrowUpDown, MessageSquare, Sparkles, ChevronRight, ArrowUp, ArrowDown, Trophy, Mail, Twitter, ArrowLeft, MessageCircle, Send, CheckCircle2, AlertCircle, Clock, Copy, CornerDownRight,
  MapPin, Swords, Eye, FileText, Sun, Moon, History, Bookmark, Flame, GitMerge, Star, Globe, UserCheck
} from 'lucide-react';
import AnalyticsTab from '../components/AnalyticsTab';
import RankingsPage from '../components/RankingsPage';
import TeamRankingsPage from '../components/TeamRankingsPage';
import T20RatingsPage from '../components/T20RatingsPage';
import FormTracker        from '../components/FormTracker';
import VenueIntelligence  from '../components/VenueIntelligence';
import SituationSimulator from '../components/SituationSimulator';
import BattleCardHub      from '../components/BattleCardHub';
import SimilarPlayers     from '../components/SimilarPlayers';
import AdvancedMetrics    from '../components/AdvancedMetrics';
import PredictionEngine   from '../components/PredictionEngine';
import TournamentMode     from '../components/TournamentMode';
import PartnershipAnalytics from '../components/PartnershipAnalytics';
import NarrativeReports   from '../components/NarrativeReports';
import TeamSelector        from '../components/TeamSelector';
import T20TeamRatingsPage from '../components/T20TeamRatingsPage';
import T20SliceDice from '../components/T20SliceDice';
import LOIRatingsPage from '../components/LOIRatingsPage';
import LOITeamRatingsPage from '../components/LOITeamRatingsPage';
import PlayerManager from '../components/PlayerManager';

// Role badge config (mirrors RankingsPage)
const VAULT_ROLE_CONFIG = {
  'BAT':   { cls: 'text-emerald-700 bg-emerald-50 border-emerald-200',  label: '🏏 BAT'     },
  'WK':    { cls: 'text-sky-700 bg-sky-50 border-sky-200',              label: '🧤 WK'      },
  'P-BOW': { cls: 'text-orange-700 bg-orange-50 border-orange-200',     label: '🏏⚡ P-BOW' },
  'BWL':   { cls: 'text-blue-700 bg-blue-50 border-blue-200',           label: '⚡ BWL'     },
  'AR':    { cls: 'text-purple-700 bg-purple-50 border-purple-200',     label: '✦ AR'       },
};

// Which player roles match each filter tab
const ROLE_FILTER_MAP = {
  batter: ['BAT', 'WK', 'P-BOW', 'AR'],
  bowler: ['BWL', 'AR', 'P-BOW'],
  wk:     ['WK'],
};

const SidebarItem = ({ icon: Icon, label, active, onClick }) => (
  <button 
    onClick={onClick}
    className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-all ${
      active 
        ? 'bg-emerald-600 text-white shadow-md' 
        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 border-none bg-transparent'
    }`}
    style={{ border: 'none', cursor: 'pointer', outline: 'none' }}
  >
    <Icon size={20} />
    <span className="font-medium text-sm">{label}</span>
  </button>
);

// ── Smart Query Suggestions ──────────────────────────────────────────────────
const QUERY_SUGGESTIONS = [
  "Which player scored the most runs in T20Is in 2024?",
  "Compare Kohli vs Rohit vs Babar career averages",
  "Top 5 bowlers with lowest economy in death overs",
  "Who has the most T20I centuries ever?",
  "Best wicketkeepers by average in T20Is",
  "Which team won the most T20Is in 2023?",
  "Players with highest strike rate in powerplay",
  "Most sixes in T20I history",
  "Find bowlers with 50+ T20I wickets",
  "Who chased the most successfully in T20Is?",
  "Top allrounders by impact score",
  "Batters with best average vs pace bowling",
];

function TestDashboard({ onBack, format = 'test' }) {
  // Default tab depends on which format the user entered from the landing page
  const defaultTabForFormat = {
    test: 'matchups',
    t20:  't20-ratings',
    loi:  'loi-ratings',
  };
  const [activeTab, setActiveTab] = useState(defaultTabForFormat[format] || 'matchups');
  const [dbStatus, setDbStatus] = useState('Checking DB...');

  // Dark mode
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window !== 'undefined') return localStorage.getItem('criclens_dark') === '1';
    return false;
  });
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('criclens_dark', darkMode ? '1' : '0');
      document.documentElement.classList.toggle('dark', darkMode);
    }
  }, [darkMode]);

  // Players List
  const [playerData,     setPlayerData]     = useState([]);
  const [playerCountries, setPlayerCountries] = useState([]);
  const [playerSearch,   setPlayerSearch]   = useState('');
  const [playerCountry,  setPlayerCountry]  = useState('');
  const [playerRole,     setPlayerRole]     = useState('');

  useEffect(() => {
    fetch('/api/players')
      .then(res => res.json())
      .then(data => {
        setPlayerData(data.playerData || data.players.map(n => ({ name: n, country: '' })));
        setPlayerCountries(data.countries || []);
      })
      .catch(err => console.error(err));
  }, []);

  const filteredPlayers = playerData.filter(p => {
    const matchesSearch  = p.name.toLowerCase().includes(playerSearch.toLowerCase());
    const matchesCountry = !playerCountry || p.country === playerCountry;
    const allowedRoles   = playerRole ? ROLE_FILTER_MAP[playerRole] : null;
    const matchesRole    = !allowedRoles || allowedRoles.includes(p.role);
    return matchesSearch && matchesCountry && matchesRole;
  });

  // AI Query State
  const [aiQuery, setAiQuery] = useState('');
  const [aiResult, setAiResult] = useState(null);
  const [isQuerying, setIsQuerying] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [queryHistory, setQueryHistory] = useState(() => {
    if (typeof window !== 'undefined') {
      try { return JSON.parse(localStorage.getItem('criclens_qhistory') || '[]'); } catch { return []; }
    }
    return [];
  });
  const [savedQueries, setSavedQueries] = useState(() => {
    if (typeof window !== 'undefined') {
      try { return JSON.parse(localStorage.getItem('criclens_saved') || '[]'); } catch { return []; }
    }
    return [];
  });
  const [showHistory, setShowHistory] = useState(false);
  const suggestRef = useRef(null);

  // Close suggestion dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (suggestRef.current && !suggestRef.current.contains(e.target)) setShowSuggestions(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  function saveToHistory(q) {
    const updated = [q, ...queryHistory.filter(h => h !== q)].slice(0, 10);
    setQueryHistory(updated);
    if (typeof window !== 'undefined') localStorage.setItem('criclens_qhistory', JSON.stringify(updated));
  }

  function saveQuery(q) {
    if (savedQueries.includes(q)) return;
    const updated = [...savedQueries, q].slice(0, 20);
    setSavedQueries(updated);
    if (typeof window !== 'undefined') localStorage.setItem('criclens_saved', JSON.stringify(updated));
  }

  function removeSaved(q) {
    const updated = savedQueries.filter(s => s !== q);
    setSavedQueries(updated);
    if (typeof window !== 'undefined') localStorage.setItem('criclens_saved', JSON.stringify(updated));
  }

  const filteredSuggestions = QUERY_SUGGESTIONS.filter(s =>
    aiQuery.length > 2 ? s.toLowerCase().includes(aiQuery.toLowerCase()) : true
  ).slice(0, 6);

  const handleAiQuery = async (e) => {
    e.preventDefault();
    if (!aiQuery.trim()) return;
    saveToHistory(aiQuery.trim());
    setShowSuggestions(false);
    setIsQuerying(true);
    setAiResult(null);

    try {
      const response = await fetch('/api/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: aiQuery })
      });
      const data = await response.json();
      setAiResult(data);
    } catch (error) {
      console.error(error);
      setAiResult({
        query: aiQuery,
        answer: "Failed to connect to the database or AI engine.",
        recommendation: "Please ensure the backend is running and API keys are valid.",
        stats: [],
        error: true
      });
    } finally {
      setIsQuerying(false);
    }
  };

  const SCREEN_MAP = {
    'matchups': 'S-1',
    'vault': 'S-2',
    'analytics': 'S-3',
    'team-selector': 'S-4',
    'player-manager': 'S-5',
    'rankings': 'S-6',
    'team-rankings': 'S-7',
    't20-ratings': 'S-8',
    't20-team-ratings': 'S-9',
    't20-lab': 'S-10',
    'form-tracker': 'S-11',
    'venue-intel': 'S-12',
    'situation-sim': 'S-13',
    'battle-cards': 'S-14',
    'similar-players': 'S-15',
    'adv-metrics': 'S-16',
    'predictor': 'S-17',
    'tournaments': 'S-18',
    'partnerships': 'S-19',
    'reports': 'S-20',
    'loi-ratings': 'S-21',
    'loi-team-ratings': 'S-22'
  };

  return (
    <div className="flex h-screen bg-white">
      {/* Temporary Screen Number Badge - Using inline styles to guarantee visibility */}
      <div style={{ position: 'fixed', top: '16px', right: '16px', zIndex: 2147483647, backgroundColor: '#dc2626', color: 'white', fontSize: '14px', fontFamily: 'monospace', fontWeight: 'bold', padding: '4px 12px', borderRadius: '6px', pointerEvents: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
        {SCREEN_MAP[activeTab] || 'S-?'}
      </div>

      {/* Sidebar */}
      <aside className="w-64 border-r border-slate-200 flex flex-col p-4 z-20" style={{ backgroundColor: 'var(--bg-sidebar)' }}>
        <div className="flex items-center space-x-2 px-4 mb-4 mt-2">
          <div className="bg-emerald-600 p-1.5 rounded-lg flex items-center justify-center">
            <Target className="text-white" size={24} />
          </div>
          <h1 className="text-xl font-black tracking-tight text-slate-900" style={{ margin: 0 }}>CRICLENS</h1>
        </div>
        
        <button 
          onClick={onBack}
          className="mx-4 mb-6 flex items-center space-x-2 border border-slate-200 text-slate-600 bg-white hover:bg-slate-50 hover:text-slate-900 transition-colors px-3 py-2 rounded-lg text-sm font-bold shadow-sm"
          style={{ cursor: 'pointer' }}
        >
          <ArrowLeft size={16} />
          <span>Exit Dashboard</span>
        </button>

        <nav className="flex-1 space-y-2 flex flex-col">
          <SidebarItem icon={Zap}       label="Match-Up AI"    active={activeTab === 'matchups'}       onClick={() => setActiveTab('matchups')} />
          <SidebarItem icon={Database}  label="Player Vault"   active={activeTab === 'vault'}          onClick={() => setActiveTab('vault')} />
          <SidebarItem icon={BarChart2} label="Analytics Hub"  active={activeTab === 'analytics'}      onClick={() => setActiveTab('analytics')} />
          <SidebarItem icon={UserCheck} label="Team Selector"  active={activeTab === 'team-selector'}  onClick={() => setActiveTab('team-selector')} />
          <SidebarItem icon={Database}  label="Player Manager" active={activeTab === 'player-manager'} onClick={() => setActiveTab('player-manager')} />

          <div style={{ height: '1px', backgroundColor: '#e2e8f0', margin: '0.75rem 0' }} />

          {/* Format-specific Ratings — sidebar only shows the ratings for the format selected on the landing page */}
          {format === 'test' && (
            <>
              <SidebarItem icon={Trophy} label="Test Ratings" active={activeTab === 'rankings'} onClick={() => setActiveTab('rankings')} />
              <SidebarItem icon={Shield} label="Test Team Ratings" active={activeTab === 'team-rankings'} onClick={() => setActiveTab('team-rankings')} />
            </>
          )}

          {format === 't20' && (
            <>
              <SidebarItem icon={Trophy}    label="T20 Ratings"        active={activeTab === 't20-ratings'}       onClick={() => setActiveTab('t20-ratings')} />
              <SidebarItem icon={Shield}    label="T20 Team Ratings"   active={activeTab === 't20-team-ratings'}  onClick={() => setActiveTab('t20-team-ratings')} />
              <SidebarItem icon={Filter}    label="T20 Lab"            active={activeTab === 't20-lab'}           onClick={() => setActiveTab('t20-lab')} />

              <div style={{ height: '1px', backgroundColor: '#e2e8f0', margin: '0.5rem 0' }} />
              <p className="px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Intelligence</p>

              <SidebarItem icon={Flame}     label="Form Tracker"       active={activeTab === 'form-tracker'}      onClick={() => setActiveTab('form-tracker')} />
              <SidebarItem icon={MapPin}    label="Venue Intelligence" active={activeTab === 'venue-intel'}       onClick={() => setActiveTab('venue-intel')} />
              <SidebarItem icon={Target}    label="Situation Sim"      active={activeTab === 'situation-sim'}     onClick={() => setActiveTab('situation-sim')} />
              <SidebarItem icon={Swords}    label="Battle Cards"       active={activeTab === 'battle-cards'}      onClick={() => setActiveTab('battle-cards')} />
              <SidebarItem icon={GitMerge}  label="Similar Players"    active={activeTab === 'similar-players'}   onClick={() => setActiveTab('similar-players')} />
              <SidebarItem icon={Star}      label="Advanced Metrics"   active={activeTab === 'adv-metrics'}       onClick={() => setActiveTab('adv-metrics')} />
              <SidebarItem icon={Eye}       label="Match Predictor"    active={activeTab === 'predictor'}         onClick={() => setActiveTab('predictor')} />
              <SidebarItem icon={Globe}     label="Tournaments"        active={activeTab === 'tournaments'}       onClick={() => setActiveTab('tournaments')} />
              <SidebarItem icon={Users}     label="Partnerships"       active={activeTab === 'partnerships'}      onClick={() => setActiveTab('partnerships')} />
              <SidebarItem icon={FileText}  label="Player Reports"     active={activeTab === 'reports'}           onClick={() => setActiveTab('reports')} />
            </>
          )}

          {format === 'loi' && (
            <>
              <SidebarItem icon={Trophy} label="ODI Ratings" active={activeTab === 'loi-ratings'} onClick={() => setActiveTab('loi-ratings')} />
              <SidebarItem icon={Shield} label="ODI Team Ratings" active={activeTab === 'loi-team-ratings'} onClick={() => setActiveTab('loi-team-ratings')} />
            </>
          )}
        </nav>

        <div className="mt-auto p-4 bg-slate-50 rounded-xl border border-slate-100">
          <p className="text-xs text-slate-400 uppercase font-bold mb-1 tracking-widest" style={{margin:0}}>System</p>
          <p className="text-sm font-bold text-slate-900" style={{marginTop: 4, marginBottom: 0}}>SQLite Engine Active</p>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden relative">
        {/* Header */}
        <header className="h-16 border-b border-slate-200 bg-white flex items-center justify-between px-8 z-10" style={{ height: '4rem' }}>
          <div className="flex items-center flex-1 max-w-xl bg-slate-100 border border-slate-200 rounded-lg px-4 py-1.5">
            <Search size={18} className="text-slate-400" />
            <span className="text-sm ml-2 text-slate-400">Database connected. Try the Match-up AI.</span>
          </div>
          <div className="flex items-center gap-3 ml-4">
            {/* Dark mode toggle */}
            <button
              onClick={() => setDarkMode(d => !d)}
              title={darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
              className="flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-900 transition-all text-xs font-bold shadow-sm"
              style={{ cursor: 'pointer' }}
            >
              {darkMode ? <Sun size={15} /> : <Moon size={15} />}
              <span className="hidden sm:inline">{darkMode ? "Light" : "Dark"}</span>
            </button>
            {/* History toggle */}
            <button
              onClick={() => setShowHistory(h => !h)}
              title="Query History"
              className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-all text-xs font-bold shadow-sm ${showHistory ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}
              style={{ cursor: 'pointer' }}
            >
              <History size={15} />
              <span className="hidden sm:inline">History</span>
              {queryHistory.length > 0 && <span className="bg-indigo-500 text-white text-[10px] rounded-full px-1.5 py-0.5 font-black">{queryHistory.length}</span>}
            </button>
          </div>
        </header>

        {/* Query History Panel */}
        {showHistory && (
          <div className="border-b border-slate-200 bg-white shadow-sm px-8 py-4 z-10">
            <div className="max-w-4xl mx-auto">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest flex items-center gap-2"><History size={12}/> Recent Queries</h4>
                {queryHistory.length > 0 && (
                  <button onClick={() => { setQueryHistory([]); localStorage.removeItem('criclens_qhistory'); }} className="text-xs text-red-400 hover:text-red-600 font-bold cursor-pointer">Clear</button>
                )}
              </div>
              {queryHistory.length === 0 ? (
                <p className="text-xs text-slate-400">No query history yet.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {queryHistory.map((q, i) => (
                    <div key={i} className="flex items-center gap-1 bg-slate-100 rounded-lg px-3 py-1.5 text-xs text-slate-600 font-medium group">
                      <button onClick={() => { setAiQuery(q); setShowHistory(false); setActiveTab('matchups'); }} className="hover:text-indigo-600 cursor-pointer transition-colors">{q}</button>
                      <button onClick={() => saveQuery(q)} title="Save" className="ml-1 text-slate-400 hover:text-amber-500 cursor-pointer"><Bookmark size={10}/></button>
                    </div>
                  ))}
                </div>
              )}
              {savedQueries.length > 0 && (
                <>
                  <div className="flex items-center mt-4 mb-2 gap-2">
                    <Bookmark size={12} className="text-amber-500"/>
                    <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest">Saved Queries</h4>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {savedQueries.map((q, i) => (
                      <div key={i} className="flex items-center gap-1 bg-amber-50 border border-amber-100 rounded-lg px-3 py-1.5 text-xs text-amber-700 font-medium">
                        <button onClick={() => { setAiQuery(q); setShowHistory(false); setActiveTab('matchups'); }} className="hover:text-amber-900 cursor-pointer">{q}</button>
                        <button onClick={() => removeSaved(q)} title="Remove" className="ml-1 text-amber-400 hover:text-red-500 cursor-pointer"><Trash2 size={10}/></button>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* View Switching */}
        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
          
          {/* TAB: MATCH-UP LAB (NATURAL LANGUAGE QUERY) */}
          {activeTab === 'matchups' && (
            <div className="max-w-4xl mx-auto py-10">
              <div className="text-center mb-12">
                <div className="inline-flex items-center space-x-2 bg-indigo-50 text-indigo-700 px-5 py-2.5 rounded-full mb-6 border border-indigo-100" style={{ borderRadius: 9999 }}>
                  <Sparkles size={16} />
                  <span className="text-xs font-black uppercase tracking-widest">Natural Language Intelligence</span>
                </div>
                <h2 className="text-4xl font-black text-slate-900 mb-4 tracking-tight" style={{ marginTop: 0 }}>Ask the Database</h2>
                <p className="text-slate-500 text-lg font-medium max-w-2xl mx-auto" style={{ marginTop: 0 }}>Type your cricket analytics queries in plain English. The AI engine parses the Test Match database.</p>
              </div>

              <div className="relative mb-12" ref={suggestRef}>
                <form onSubmit={handleAiQuery} className="relative flex items-center shadow-lg" style={{ borderRadius: '1.5rem', backgroundColor: '#fff', border: '2px solid var(--slate-200)', overflow: 'hidden' }}>
                  <div className="flex items-center pl-6">
                    <MessageSquare className="text-slate-400" size={24} />
                  </div>
                  <input
                    type="text"
                    value={aiQuery}
                    onChange={(e) => { setAiQuery(e.target.value); setShowSuggestions(true); }}
                    onFocus={() => setShowSuggestions(true)}
                    placeholder="e.g. 'Which player scored the most runs total?' or 'Rank players by average'"
                    className="query-input"
                    style={{ flex: 1, border: 'none', padding: '1.5rem 1rem', fontSize: '1.125rem', outline: 'none', backgroundColor: 'transparent' }}
                    disabled={isQuerying}
                  />
                  <div className="pr-4 flex items-center gap-2">
                    {aiQuery.trim() && (
                      <button type="button" onClick={() => saveQuery(aiQuery.trim())} title="Save Query" className="p-2 text-slate-400 hover:text-amber-500 transition-colors" style={{ border: 'none', background: 'none', cursor: 'pointer' }}>
                        <Bookmark size={16} />
                      </button>
                    )}
                    <button
                      type="submit"
                      disabled={isQuerying || !aiQuery.trim()}
                      className="flex items-center space-x-2 bg-slate-900 text-white font-black px-6 py-3"
                      style={{ borderRadius: '1rem', border: 'none', cursor: isQuerying || !aiQuery.trim() ? 'not-allowed' : 'pointer', opacity: isQuerying || !aiQuery.trim() ? 0.6 : 1 }}
                    >
                      <span>{isQuerying ? 'Searching...' : 'Query'}</span>
                      {!isQuerying && <ChevronRight size={18} />}
                    </button>
                  </div>
                </form>

                {/* Smart Suggestions Dropdown */}
                {showSuggestions && filteredSuggestions.length > 0 && (
                  <div className="absolute left-0 right-0 top-full mt-2 bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden z-30">
                    <div className="px-4 py-2 border-b border-slate-100 flex items-center gap-2">
                      <Sparkles size={11} className="text-indigo-400" />
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Suggested Queries</span>
                    </div>
                    {filteredSuggestions.map((s, i) => (
                      <button key={i} type="button"
                        onClick={() => { setAiQuery(s); setShowSuggestions(false); }}
                        className="w-full text-left px-5 py-3 text-sm font-medium text-slate-600 hover:bg-indigo-50 hover:text-indigo-700 transition-colors flex items-center gap-3"
                        style={{ border: 'none', background: showSuggestions ? undefined : 'none', cursor: 'pointer' }}
                      >
                        <ChevronRight size={12} className="text-slate-300 shrink-0" />
                        {s}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {isQuerying ? (
                <div className="flex flex-col items-center justify-center py-12 text-slate-400 animate-pulse">
                  <Database size={40} className="mb-4 text-emerald-500 opacity-50" />
                  <p className="font-bold uppercase tracking-widest text-xs">Translating to SQL & Querying Database...</p>
                </div>
              ) : aiResult ? (
                <div className="bg-white border border-slate-200 p-8 shadow-sm" style={{ borderRadius: '1.5rem' }}>
                  <div className="flex items-center space-x-2 text-slate-400 mb-6 border-b border-slate-100 pb-4" style={{ borderBottomWidth: 1 }}>
                    <Database size={14} />
                    <span className="text-xs font-bold uppercase tracking-tight">Analytical Insights for: "{aiResult.query}"</span>
                  </div>

                  {aiResult.sql && (
                    <div className="p-6 flex flex-col space-y-2 mb-8" style={{ backgroundColor: '#f8fafc', borderRadius: '1rem', borderTop: '1px solid #e2e8f0', borderRight: '1px solid #e2e8f0', borderBottom: '1px solid #e2e8f0', borderLeft: '4px solid #6366f1' }}>
                        <div className="flex items-center">
                            <Shield size={16} className="text-slate-500 mr-2" />
                            <h4 className="text-sm font-bold text-slate-600 uppercase tracking-tight" style={{margin: 0}}>Executed SQL Command</h4>
                        </div>
                        <code className="text-sm font-mono overflow-x-auto" style={{whiteSpace: 'pre-wrap', color: '#4338ca', marginTop: '0.5rem'}}>{(typeof aiResult.sql === 'string' && aiResult.sql.trim().length > 0) ? aiResult.sql : 'No SQL code returned'}</code>
                    </div>
                  )}
                  
                  {aiResult.stats && aiResult.stats.length > 0 && (
                  <div className="grid grid-cols-3 gap-6 mb-8">
                    {aiResult.stats.map((stat, idx) => (
                      <div key={idx} className="bg-slate-50 p-5 border border-slate-100 text-center" style={{ borderRadius: '1rem' }}>
                        <p className="text-xs font-black text-slate-400 uppercase mb-1 tracking-widest" style={{margin: 0}}>{stat.label}</p>
                        <p className="text-2xl font-black text-slate-900" style={{margin: 0, marginTop: '0.25rem'}}>{stat.value}</p>
                      </div>
                    ))}
                  </div>
                  )}

                  <div className="mb-8">
                    <h4 className="text-sm font-black text-slate-900 mb-4 flex items-center" style={{ margin: 0, marginBottom: '1rem' }}>
                      <Zap size={16} className="text-yellow-500" style={{ marginRight: '0.5rem' }} /> Synthesis Result
                    </h4>
                    <p className="text-slate-600 font-medium" style={{ backgroundColor: 'rgba(238, 242, 255, 0.4)', padding: '1.5rem', borderRadius: '1rem', border: '1px solid rgba(224, 231, 255, 0.5)', margin: 0, fontStyle: 'italic', lineHeight: 1.6 }}>
                      "{aiResult.answer}"
                    </p>
                  </div>

                  {aiResult.results && aiResult.results.length > 0 && aiResult.columns && (
                    <details className="mb-8 group">
                      <summary className="cursor-pointer text-sm font-bold text-slate-600 hover:text-indigo-600 flex items-center outline-none list-none select-none transition-colors">
                        <Database size={14} className="mr-2" /> View Raw Tabular Data
                        <ChevronDown size={14} className="ml-1 opacity-50 group-open:rotate-180 transition-transform" />
                      </summary>
                      
                      <div className="mt-4 border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                        <div className="overflow-x-auto custom-scrollbar">
                          <table className="w-full text-left text-sm text-slate-600">
                            <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase font-black text-slate-500 tracking-wider">
                              <tr>
                                {aiResult.columns.map(col => (
                                  <th key={col} className="px-4 py-3 whitespace-nowrap">{col}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-slate-100">
                              {aiResult.results.map((row, idx) => (
                                <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                                  {aiResult.columns.map(col => (
                                    <td key={col} className="px-4 py-2.5 whitespace-nowrap font-medium text-slate-700">
                                      {row[col] === null ? <span className="text-slate-300 italic">null</span> : String(row[col])}
                                    </td>
                                  ))}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </details>
                  )}
                  
                  {/* Why? Layer — auto-generated insight bullets */}
                  <div className="mb-8 bg-indigo-50 border border-indigo-100 rounded-2xl p-5">
                    <div className="flex items-center gap-2 mb-3">
                      <Sparkles size={14} className="text-indigo-500" />
                      <span className="text-xs font-black text-indigo-700 uppercase tracking-widest">Why? — Key Takeaways</span>
                    </div>
                    <ul className="space-y-2">
                      {[
                        "Data sourced from Cricsheet ball-by-ball records — fully match-level granularity.",
                        "Results filtered to the format context of this dashboard session.",
                        "Statistics reflect career totals unless a date or tournament filter was specified.",
                      ].map((insight, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-sm text-indigo-700">
                          <span className="mt-0.5 text-indigo-400 shrink-0">→</span>
                          {insight}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="mt-4 flex items-center justify-between">
                    <button
                      onClick={() => saveQuery(aiResult.query)}
                      className="flex items-center gap-2 text-xs font-bold text-amber-600 hover:text-amber-800 border border-amber-200 bg-amber-50 px-3 py-2 rounded-lg transition-colors"
                      style={{ cursor: 'pointer' }}
                    >
                      <Bookmark size={13}/> Save this query
                    </button>
                    <button onClick={() => setAiResult(null)} className="text-xs font-bold text-slate-400 hover:text-slate-600 uppercase tracking-widest border-none bg-transparent" style={{ cursor: 'pointer' }}>
                      Clear Results
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 ml-2">Try these sample queries:</p>
                  <div className="grid grid-cols-1 gap-4" style={{ gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}>
                    {[
                      '"List the top 5 test batters with highest career runs"', 
                      '"Who scored the most runs against England?"', 
                      '"Find bowlers with the most wickets caught and bowled"', 
                      '"Which team won the most test matches?"'
                    ].map(hint => (
                      <button 
                        key={hint} 
                        onClick={() => setAiQuery(hint.replace(/"/g, ''))}
                        className="text-left bg-white border border-slate-200 p-5 text-sm font-bold text-slate-500 transition-all flex items-center"
                        style={{ borderRadius: '1rem', cursor: 'pointer' }}
                      >
                        <span className="flex-1 m-0">{hint}</span>
                        <ChevronRight size={14} className="text-emerald-500" />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB: VAULT */}
          {activeTab === 'vault' && (
            <div className="py-10 max-w-4xl mx-auto">
              <div className="mb-8">
                <h2 className="text-3xl font-black text-slate-900 mb-2 mt-0">Player Dictionary</h2>
                <p className="text-slate-500 font-medium m-0">Browse players to copy exact names for queries.</p>
              </div>

              {/* Vault filters */}
              <div className="space-y-3 mb-5">
                {/* Row 1: search + country + count + clear */}
                <div className="flex items-center gap-4 flex-wrap">
                  <div className="bg-white border border-slate-200 rounded-lg flex items-center px-3 py-2.5 flex-1 shadow-sm" style={{ minWidth: 200, maxWidth: 320 }}>
                    <Search size={16} className="text-slate-400 mr-2 shrink-0" />
                    <input
                      type="text"
                      placeholder="Search player name..."
                      className="border-none focus:ring-0 text-sm p-0 w-full outline-none bg-transparent"
                      value={playerSearch}
                      onChange={(e) => setPlayerSearch(e.target.value)}
                    />
                  </div>

                  {playerCountries.length > 0 && (
                    <select
                      value={playerCountry}
                      onChange={e => setPlayerCountry(e.target.value)}
                      className="text-sm border border-slate-200 rounded-lg px-3 py-2.5 bg-white text-slate-700 shadow-sm focus:outline-none focus:border-emerald-400"
                      style={{ minWidth: 150 }}
                    >
                      <option value="">All Countries</option>
                      {playerCountries.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  )}

                  <span className="text-sm text-slate-400 font-mono">
                    {filteredPlayers.length.toLocaleString()} of {playerData.length.toLocaleString()} players
                  </span>

                  {(playerSearch || playerCountry || playerRole) && (
                    <button
                      onClick={() => { setPlayerSearch(''); setPlayerCountry(''); setPlayerRole(''); }}
                      className="text-sm text-red-500 border border-red-200 px-3 py-2 rounded-lg bg-white hover:bg-red-50 transition-colors"
                      style={{ cursor: 'pointer' }}
                    >
                      Clear all
                    </button>
                  )}
                </div>

                {/* Row 2: role filter buttons */}
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wide mr-2">Role</span>
                  {[
                    { key: '',       label: 'All'     },
                    { key: 'batter', label: '🏏 Batter' },
                    { key: 'bowler', label: '⚡ Bowler' },
                    { key: 'wk',     label: '🧤 WK'    },
                  ].map(({ key, label }) => (
                    <button
                      key={key}
                      onClick={() => setPlayerRole(key)}
                      className={`text-sm font-bold px-4 py-2 rounded-lg border transition-all ${
                        playerRole === key
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                          : 'bg-white text-slate-600 border-slate-200 hover:border-emerald-400 hover:text-emerald-700'
                      }`}
                      style={{ cursor: 'pointer' }}
                    >
                      {label}
                    </button>
                  ))}
                  <span className="text-xs text-slate-400 ml-2">All-Rounders &amp; P-BOW appear in both Batter and Bowler</span>
                </div>
              </div>

              <div className="bg-white rounded-xl border border-slate-200 p-1 shadow-sm h-96 overflow-y-auto custom-scrollbar">
                {filteredPlayers.length > 0 ? (
                  <ul className="m-0 p-0" style={{ listStyle: 'none' }}>
                    {filteredPlayers.map((p, i) => (
                      <li key={i} className="px-5 py-3.5 border-b border-slate-100 hover:bg-slate-50 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-4 min-w-0">
                          {/* Sr No */}
                          <span className="text-sm font-mono text-slate-400 shrink-0 w-8 text-right">{i + 1}</span>
                          {/* Name */}
                          <span className="font-medium text-slate-900 text-base">
                            {p.name} <span className="text-slate-400 font-light text-sm ml-1">(Full Name)</span>
                          </span>
                          {/* Role badge */}
                          {p.role && VAULT_ROLE_CONFIG[p.role] && (
                            <span className={`text-xs font-bold uppercase border px-2 py-0.5 rounded leading-none shrink-0 ${VAULT_ROLE_CONFIG[p.role].cls}`}>
                              {VAULT_ROLE_CONFIG[p.role].label}
                            </span>
                          )}
                          {/* Country */}
                          {p.country && (
                            <span className="text-xs font-bold text-slate-400 shrink-0 ml-1">{p.country}</span>
                          )}
                        </div>
                        <button
                          onClick={() => navigator.clipboard.writeText(p.name)}
                          className="text-slate-400 p-2 rounded-full hover:bg-slate-200 hover:text-slate-800 transition-all cursor-pointer shrink-0"
                          title="Copy Shorthand Name"
                        >
                          <Copy size={16} />
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="p-10 text-center text-slate-500 text-sm">No players found{playerSearch ? ` matching "${playerSearch}"` : ''}{playerCountry ? ` from ${playerCountry}` : ''}{playerRole ? ` · role filter: ${playerRole}` : ''}</div>
                )}
              </div>
            </div>
          )}

          {/* TAB: ANALYTICS HUB */}
          {activeTab === 'analytics' && (
            <AnalyticsTab />
          )}

          {/* TAB: IMPACT RANKINGS */}
          {activeTab === 'rankings' && (
            <RankingsPage />
          )}

          {/* TAB: TEAM EV RANKINGS */}
          {activeTab === 'team-rankings' && (
            <TeamRankingsPage />
          )}

          {/* TAB: T20 INDIVIDUAL RATINGS */}
          {activeTab === 't20-ratings' && (
            <T20RatingsPage />
          )}

          {/* TAB: T20 TEAM RATINGS */}
          {activeTab === 't20-team-ratings' && (
            <T20TeamRatingsPage />
          )}

          {/* TAB: T20 LAB — slice & dice comparator */}
          {activeTab === 't20-lab' && (
            <T20SliceDice />
          )}

          {/* TAB: LOI INDIVIDUAL RATINGS */}
          {activeTab === 'loi-ratings' && (
            <LOIRatingsPage />
          )}

          {/* TAB: LOI TEAM RATINGS */}
          {activeTab === 'loi-team-ratings' && (
            <LOITeamRatingsPage />
          )}

          {/* ── NEW INTELLIGENCE TABS (T20 format) ── */}

          {/* TAB: FORM TRACKER */}
          {activeTab === 'form-tracker' && (
            <FormTracker />
          )}

          {/* TAB: VENUE INTELLIGENCE */}
          {activeTab === 'venue-intel' && (
            <VenueIntelligence />
          )}

          {/* TAB: SITUATION SIMULATOR */}
          {activeTab === 'situation-sim' && (
            <SituationSimulator />
          )}

          {/* TAB: BATTLE CARDS */}
          {activeTab === 'battle-cards' && (
            <BattleCardHub />
          )}

          {/* TAB: SIMILAR PLAYERS */}
          {activeTab === 'similar-players' && (
            <SimilarPlayers />
          )}

          {/* TAB: ADVANCED METRICS */}
          {activeTab === 'adv-metrics' && (
            <AdvancedMetrics />
          )}

          {/* TAB: MATCH PREDICTOR */}
          {activeTab === 'predictor' && (
            <PredictionEngine />
          )}

          {/* TAB: TOURNAMENT MODE */}
          {activeTab === 'tournaments' && (
            <TournamentMode />
          )}

          {/* TAB: PARTNERSHIP ANALYTICS */}
          {activeTab === 'partnerships' && (
            <PartnershipAnalytics />
          )}

          {/* TAB: NARRATIVE REPORTS */}
          {activeTab === 'reports' && (
            <NarrativeReports />
          )}

          {/* TAB: TEAM SELECTOR */}
          {activeTab === 'team-selector' && (
            <TeamSelector />
          )}

          {/* TAB: PLAYER MANAGER */}
          {activeTab === 'player-manager' && (
            <PlayerManager />
          )}

        </div>
      </main>
    </div>
  );
}

// ── Discussion Board Component ───────────────────────────────────────────────
function DiscussionBoard() {
  const [posts, setPosts] = useState([]);
  const [username, setUsername] = useState('');
  const [content, setContent] = useState('');
  const [replyingTo, setReplyingTo] = useState(null); // { id, username, level }
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    const saved = localStorage.getItem('criclens_username');
    if (saved) setUsername(saved);
  }, []);

  const fetchPosts = () => {
    setLoading(true);
    fetch('/api/discussion')
      .then(r => r.json())
      .then(d => {
        if (d.success) setPosts(d.posts);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchPosts();
    const interval = setInterval(fetchPosts, 30000);
    return () => clearInterval(interval);
  }, []);

  const buildThread = () => {
    // Top-level posts
    const threads = posts.filter(p => !p.parent_id);
    const byParent = {};
    posts.filter(p => p.parent_id).forEach(p => {
      if (!byParent[p.parent_id]) byParent[p.parent_id] = [];
      byParent[p.parent_id].push(p);
    });

    return threads.map(t => ({
      ...t,
      replies: (byParent[t.id] || []).map(r1 => ({
        ...r1,
        replies: byParent[r1.id] || [] // 2nd level
      }))
    }));
  };

  const threadedData = buildThread();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim() || !content.trim()) return;
    
    setError('');
    setSuccessMsg('');
    setSubmitting(true);
    
    localStorage.setItem('criclens_username', username.trim());

    try {
      const res = await fetch('/api/discussion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          username, 
          content,
          parent_id: replyingTo ? replyingTo.id : null
        })
      });
      const data = await res.json();
      if (data.success) {
        setContent('');
        setReplyingTo(null);
        fetchPosts(); 
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError('Network error. Failed to post.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReplyClick = (post, level) => {
    setReplyingTo({ id: post.id, username: post.username, level });
    // Focus content area usually
  };

  const MessageNode = ({ post, level }) => (
    <div className={`bg-white p-4 rounded-xl shadow-sm border border-slate-100 ${level > 0 ? 'ml-6 mt-3 border-l-4 border-l-indigo-300' : ''}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="font-bold text-slate-700 text-sm flex items-center gap-2">
          {level > 0 && <CornerDownRight size={14} className="text-slate-400" />}
          {post.username}
        </span>
        <span className="text-xs text-slate-400 flex items-center gap-1">
          <Clock size={12} /> {new Date(post.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
        </span>
      </div>
      <p className="text-slate-600 text-sm m-0 leading-relaxed whitespace-pre-wrap">{post.content}</p>
      
      {/* Reply Button (Only allowed up to level 1, so 2 levels total: Thread -> Reply -> ReplyToReply) */}
      {level < 2 && (
        <button 
          onClick={() => handleReplyClick(post, level)}
          className="mt-3 text-xs font-bold text-indigo-500 hover:text-indigo-700 uppercase tracking-widest bg-transparent cursor-pointer"
        >
          Reply
        </button>
      )}

      {post.replies?.map(r => (
        <MessageNode key={r.id} post={r} level={level + 1} />
      ))}
    </div>
  );

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 flex flex-col h-full overflow-hidden">
      <div className="p-6 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-indigo-100 p-2 rounded-lg text-indigo-600">
            <MessageCircle size={20} />
          </div>
          <div>
            <h3 className="font-black text-slate-800 m-0">Community Discussion</h3>
            <p className="text-xs text-slate-500 font-medium m-0">Talk about cricket analytics, data, or the app.</p>
          </div>
        </div>
        <div className="text-xs font-bold text-slate-400 bg-white border border-slate-200 px-3 py-1 rounded-full shadow-sm">
          {posts.length} messages
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50 flex flex-col gap-5 custom-scrollbar" style={{ minHeight: '400px' }}>
        {loading && posts.length === 0 ? (
          <div className="text-center py-10 text-slate-400 animate-pulse text-sm font-bold tracking-widest uppercase">
            Loading messages...
          </div>
        ) : threadedData.length === 0 ? (
          <div className="text-center py-12 text-slate-400 text-sm">
            No messages yet. Be the first to post!
          </div>
        ) : (
          threadedData.map(post => (
            <MessageNode key={post.id} post={post} level={0} />
          ))
        )}
      </div>

      <div className="p-4 bg-white border-t border-slate-100 relative">
        {error && <div className="text-xs text-red-600 bg-red-50 p-2 rounded mb-3 border border-red-100 font-bold flex items-center gap-1"><AlertCircle size={14}/> {error}</div>}
        {successMsg && <div className="text-xs text-emerald-600 bg-emerald-50 p-2 rounded mb-3 border border-emerald-100 font-bold flex items-center gap-1"><CheckCircle2 size={14}/> {successMsg}</div>}
        
        {replyingTo && (
           <div className="mb-2 flex items-center justify-between bg-indigo-50 border border-indigo-100 px-3 py-1.5 rounded-lg">
             <span className="text-xs font-bold text-indigo-600 flex items-center gap-1">
               <CornerDownRight size={12}/> Replying to <span className="text-slate-800">{replyingTo.username}</span>
             </span>
             <button onClick={() => setReplyingTo(null)} className="text-slate-400 hover:text-slate-700 cursor-pointer p-1 rounded-full hover:bg-indigo-100">
               <Trash2 size={12} />
             </button>
           </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <input 
            type="text" 
            placeholder="Your Name / Username" 
            value={username}
            onChange={e => setUsername(e.target.value)}
            className="w-full sm:w-1/3 outline-none border border-slate-200 rounded-lg px-3 py-2 text-sm focus:border-indigo-400"
            maxLength={50}
            required
            disabled={submitting}
          />
          <div className="flex gap-2">
            <textarea 
              placeholder={replyingTo ? "Write your reply..." : "Join the discussion..."}
              value={content}
              onChange={e => setContent(e.target.value)}
              className="flex-1 outline-none border border-slate-200 rounded-lg px-3 py-2 text-sm focus:border-indigo-400 resize-none h-12"
              maxLength={1000}
              required
              disabled={submitting}
            />
            <button 
              type="submit" 
              disabled={submitting || !content.trim() || !username.trim()}
              className="bg-indigo-600 hover:bg-indigo-700 text-white p-3 rounded-lg flex items-center justify-center transition-colors disabled:opacity-50"
              style={{ cursor: submitting || !content.trim() ? 'not-allowed' : 'pointer' }}
            >
              <Send size={18} />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Landing Page Component ───────────────────────────────────────────────────
function LandingPage({ onSelectFormat }) {
  const [showCaptcha, setShowCaptcha] = useState(false);
  const [captchaSum, setCaptchaSum] = useState(0);
  const [captchaQuestion, setCaptchaQuestion] = useState('');
  const [captchaAns, setCaptchaAns] = useState('');
  const [captchaError, setCaptchaError] = useState(false);

  // Pending format captured when the captcha is opened — used after verify
  const [pendingFormat, setPendingFormat] = useState(null);

  const handleFormatClick = (fmt) => {
    const n1 = Math.floor(Math.random() * 10) + 1;
    const n2 = Math.floor(Math.random() * 10) + 1;
    setCaptchaSum(n1 + n2);
    setCaptchaQuestion(`What is ${n1} + ${n2}?`);
    setCaptchaAns('');
    setCaptchaError(false);
    setPendingFormat(fmt);
    setShowCaptcha(true);
  };

  const submitCaptcha = (e) => {
    e.preventDefault();
    if (parseInt(captchaAns, 10) === captchaSum) {
      setShowCaptcha(false);
      onSelectFormat(pendingFormat || 'test');
    } else {
      setCaptchaError(true);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans relative">
      {/* Temporary Screen Number Badge */}
      <div style={{ position: 'fixed', top: '16px', right: '16px', zIndex: 2147483647, backgroundColor: '#dc2626', color: 'white', fontSize: '14px', fontFamily: 'monospace', fontWeight: 'bold', padding: '4px 12px', borderRadius: '6px', pointerEvents: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
        S-0
      </div>
      
      {/* Captcha Modal Overlay */}
      {showCaptcha && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 p-6" style={{ width: '100%', maxWidth: '300px' }}>
            <div className="flex items-center justify-center mb-3">
              <Shield size={26} className="text-emerald-500" />
            </div>
            <h3 className="text-base font-black text-center text-slate-800 mb-1">Security Verification</h3>
            <p className="text-xs text-center text-slate-500 mb-4">Solve the puzzle to enter the Dashboard.</p>

            <form onSubmit={submitCaptcha} className="flex flex-col gap-3">
              <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl text-center">
                <span className="text-xl font-black text-slate-700 tracking-widest">{captchaQuestion}</span>
              </div>
              <div>
                <input
                  type="number"
                  value={captchaAns}
                  onChange={e => { setCaptchaAns(e.target.value); setCaptchaError(false); }}
                  placeholder="Your answer"
                  className={`w-full outline-none border ${captchaError ? 'border-red-400 bg-red-50' : 'border-slate-300'} rounded-lg px-3 py-2.5 text-base text-center font-bold focus:border-emerald-500 transition-colors`}
                  autoFocus
                  required
                />
                {captchaError && <p className="text-xs text-red-500 mt-1.5 text-center font-bold">Incorrect answer. Try again.</p>}
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowCaptcha(false)}
                  className="flex-1 px-3 py-2.5 rounded-lg border border-slate-200 text-slate-600 text-sm font-bold hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-3 py-2.5 rounded-lg bg-emerald-600 text-white text-sm font-bold hover:bg-emerald-700 transition-colors cursor-pointer shadow-sm"
                >
                  Verify
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Hero */}
      <div className="bg-slate-900 text-white pt-20 pb-24 px-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-emerald-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-indigo-500/10 rounded-full blur-3xl translate-y-1/3 -translate-x-1/4 pointer-events-none" />
        
        <div className="max-w-5xl mx-auto relative z-10 text-center">
          <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-full border border-white/10 mb-8 text-emerald-400 text-sm font-bold tracking-widest uppercase">
            <Target size={16} /> Cricket Analytics Engine
          </div>
          <h1 className="text-5xl md:text-7xl font-black tracking-tight mb-6">
            Data. Insights. <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-indigo-400">Mastery.</span>
          </h1>
          <p className="text-lg text-slate-300 max-w-2xl mx-auto mb-12 font-medium leading-relaxed">
            Welcome to CricLens. Dive deep into ball-by-ball analysis, player matchups, dynamic team rankings, and contribution metrics powered by intelligent SQL mapping.
          </p>
        </div>
      </div>

      {/* Format Selectors */}
      <div className="max-w-6xl mx-auto px-6 -mt-12 relative z-20 w-full mb-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Test Matches - Active */}
          <div
            onClick={() => handleFormatClick('test')}
            className="group bg-white rounded-2xl shadow-xl shadow-slate-200/50 border border-emerald-100 cursor-pointer overflow-hidden flex flex-col hover:-translate-y-2 hover:shadow-2xl hover:border-emerald-300 transition-all duration-300 relative"
          >
            <div className="h-40 w-full relative">
              <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: 'url("https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?auto=format&fit=crop&q=80")' }} />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-900 to-transparent opacity-80" />
              <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between">
                <div className="bg-emerald-500/20 backdrop-blur-md text-emerald-100 p-2 rounded-lg border border-emerald-400/30">
                  <Shield size={24} />
                </div>
                <div className="bg-emerald-500 text-white text-xs font-black uppercase px-3 py-1 rounded-full shadow-sm">Active</div>
              </div>
            </div>
            <div className="p-8 flex flex-col flex-1 text-left items-start">
              <h2 className="text-2xl font-black text-slate-800 mb-2">Test Matches</h2>
              <p className="text-slate-500 text-sm leading-relaxed mb-6">Access the full database for Men's Test Cricket. Includes player vault, match-ups, and impact rankings.</p>
              <div className="mt-auto flex items-center text-emerald-600 font-bold text-sm group-hover:underline">
                Enter Dashboard <ChevronRight size={16} className="ml-1" />
              </div>
            </div>
          </div>

          {/* ODI / Limited Overs - Active */}
          <div
            onClick={() => handleFormatClick('loi')}
            className="group bg-white rounded-2xl shadow-xl shadow-slate-200/50 border border-indigo-100 cursor-pointer overflow-hidden flex flex-col hover:-translate-y-2 hover:shadow-2xl hover:border-indigo-300 transition-all duration-300 relative"
          >
            <div className="h-40 w-full relative">
              <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: 'url("https://images.unsplash.com/photo-1531415074968-036ba1b575da?auto=format&fit=crop&q=80")' }} />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-900 to-transparent opacity-80" />
              <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between">
                <div className="bg-indigo-500/20 backdrop-blur-md text-indigo-100 p-2 rounded-lg border border-indigo-400/30">
                  <Activity size={24} />
                </div>
                <div className="bg-indigo-500 text-white text-xs font-black uppercase px-3 py-1 rounded-full shadow-sm">Active</div>
              </div>
            </div>
            <div className="p-8 flex flex-col flex-1 text-left items-start">
              <h2 className="text-2xl font-black text-slate-800 mb-2">ODI / Limited Overs</h2>
              <p className="text-slate-500 text-sm leading-relaxed mb-6">50-over One Day International data — player ratings, team ratings, and impact metrics.</p>
              <div className="mt-auto flex items-center text-indigo-600 font-bold text-sm group-hover:underline">
                Enter Dashboard <ChevronRight size={16} className="ml-1" />
              </div>
            </div>
          </div>

          {/* T20 Internationals - Active */}
          <div
            onClick={() => handleFormatClick('t20')}
            className="group bg-white rounded-2xl shadow-xl shadow-slate-200/50 border border-amber-100 cursor-pointer overflow-hidden flex flex-col hover:-translate-y-2 hover:shadow-2xl hover:border-amber-300 transition-all duration-300 relative"
          >
            <div className="h-40 w-full relative">
              <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: 'url("https://images.unsplash.com/photo-1624526267942-ab0f0b580898?auto=format&fit=crop&q=80")' }} />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-900 to-transparent opacity-80" />
              <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between">
                <div className="bg-amber-500/20 backdrop-blur-md text-amber-100 p-2 rounded-lg border border-amber-400/30">
                  <Zap size={24} />
                </div>
                <div className="bg-amber-500 text-white text-xs font-black uppercase px-3 py-1 rounded-full shadow-sm">Active</div>
              </div>
            </div>
            <div className="p-8 flex flex-col flex-1 text-left items-start">
              <h2 className="text-2xl font-black text-slate-800 mb-2">T20 Internationals</h2>
              <p className="text-slate-500 text-sm leading-relaxed mb-6">Fast-paced T20I match data with specialized impact formulas and player/team ratings.</p>
              <div className="mt-auto flex items-center text-amber-600 font-bold text-sm group-hover:underline">
                Enter Dashboard <ChevronRight size={16} className="ml-1" />
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Discussion Board & Contact Info */}
      <div className="max-w-6xl mx-auto px-6 w-full pb-20">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          
          {/* Discussion */}
          <div className="lg:col-span-2 h-full">
            <DiscussionBoard />
          </div>

          {/* Contact / Feedback */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
            <h3 className="font-black text-xl text-slate-800 mb-2">Feedback & Suggestions</h3>
            <p className="text-slate-500 text-sm mb-6">Have an idea for a new chart? Spotted a data error? Reach out directly.</p>
            
            <div className="flex flex-col gap-4">
              <a 
                href="mailto:jain106sandeep@gmail.com" 
                className="flex items-center gap-4 p-4 rounded-xl bg-slate-50 border border-slate-100 hover:border-indigo-200 hover:bg-white hover:shadow-md transition-all group"
                style={{ textDecoration: 'none' }}
              >
                <div className="bg-white p-3 rounded-lg shadow-sm group-hover:text-indigo-600 text-slate-500 transition-colors">
                  <Mail size={20} />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-0.5">Email Me</div>
                  <div className="font-bold text-slate-700 text-sm">jain106sandeep@gmail.com</div>
                </div>
              </a>

              <a 
                href="https://twitter.com/bangles65" 
                target="_blank" 
                rel="noreferrer"
                className="flex items-center gap-4 p-4 rounded-xl bg-slate-50 border border-slate-100 hover:border-sky-200 hover:bg-white hover:shadow-md transition-all group"
                style={{ textDecoration: 'none' }}
              >
                <div className="bg-white p-3 rounded-lg shadow-sm group-hover:text-sky-500 text-slate-500 transition-colors">
                  <Twitter size={20} />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-0.5">Twitter</div>
                  <div className="font-bold text-slate-700 text-sm">@bangles65</div>
                </div>
              </a>
            </div>
            
            <div className="mt-8 pt-6 border-t border-slate-100 text-center">
              <div className="text-xs text-slate-400 font-medium">Built with Next.js, Recharts & Supabase.</div>
              <div className="text-xs text-slate-400 font-medium mt-1">Data updated via Cricsheet.</div>
            </div>
          </div>
          
        </div>
      </div>

    </div>
  );
}

// ── Application Entry Point ──────────────────────────────────────────────────
export default function MainApp() {
  const [selectedFormat, setSelectedFormat] = useState(null);

  if (selectedFormat === 'test' || selectedFormat === 't20' || selectedFormat === 'loi') {
    return (
      <TestDashboard
        format={selectedFormat}
        onBack={() => setSelectedFormat(null)}
      />
    );
  }

  return <LandingPage onSelectFormat={setSelectedFormat} />;
}
