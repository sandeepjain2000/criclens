"use client";
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { ComposedChart, Line, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, Cell } from 'recharts';
import { TrendingUp, Minus, Flame, Snowflake, Search, Calendar } from 'lucide-react';

const FORM_COLORS = { hot: "#10b981", warm: "#f59e0b", cold: "#ef4444", neutral: "#6366f1" };

function formRating(data) {
  if (!data.length) return { label: "Unknown", color: FORM_COLORS.neutral, Icon: Minus };
  const avg = data.reduce((a,b) => a+b.runs,0)/data.length;
  if (avg > 50) return { label:"🔥 On Fire", color: FORM_COLORS.hot,   Icon: Flame     };
  if (avg > 35) return { label:"📈 Good Form",color: FORM_COLORS.warm,  Icon: TrendingUp};
  if (avg > 20) return { label:"➡ Average",   color: FORM_COLORS.neutral,Icon: Minus    };
  return           { label:"❄ Cold Patch",  color: FORM_COLORS.cold,  Icon: Snowflake };
}

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  return (
    <div className="bg-slate-900 text-white rounded-xl p-3 text-xs shadow-xl border border-slate-700 min-w-[130px]">
      <div className="font-black text-slate-300 mb-1">{d?.vs}</div>
      <div className="flex justify-between gap-4">
        <span>Runs</span><span className="font-black text-emerald-400">{d?.runs}</span>
      </div>
      <div className="flex justify-between gap-4">
        <span>Balls</span><span className="font-mono">{d?.balls}</span>
      </div>
      <div className="flex justify-between gap-4">
        <span>S/R</span><span className="font-mono text-amber-400">{d?.sr}</span>
      </div>
      <div className="flex justify-between gap-4 mt-1 border-t border-slate-700 pt-1">
        <span>Result</span>
        <span className={d?.result === "W" ? "text-emerald-400 font-black" : "text-red-400 font-black"}>{d?.result}</span>
      </div>
    </div>
  );
};

export default function FormTracker() {
  const [player, setPlayer] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [nMatches, setNMatches] = useState(10);
  
  const [allData, setAllData] = useState([]);
  const [loading, setLoading] = useState(false);
  
  const [initData, setInitData] = useState({ topPlayers: [], allPlayers: [] });
  const [showDropdown, setShowDropdown] = useState(false);
  
  const searchRef = useRef(null);

  useEffect(() => {
    fetch('/api/t20/form-tracker-init')
      .then(r => r.json())
      .then(d => {
        setInitData(d);
        if (d.topPlayers?.length > 0 && !player) {
          setPlayer(d.topPlayers[0]);
        }
      })
      .catch(console.error);
  }, []);

  useEffect(() => {
    if (!player) return;
    setLoading(true);
    fetch(`/api/t20/form-tracker?player=${encodeURIComponent(player)}&limit=50`)
      .then(r => r.json())
      .then(d => {
        setAllData(d.data || []);
        setLoading(false);
      })
      .catch(e => {
        console.error(e);
        setLoading(false);
      });
  }, [player]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const data     = useMemo(() => allData.slice(-nMatches), [allData, nMatches]);
  const avg      = data.length ? Math.round(data.reduce((a,b)=>a+b.runs,0)/data.length) : 0;
  const avgSR    = data.length ? Math.round(data.reduce((a,b)=>a+b.sr,0)/data.length) : 0;
  const form     = formRating(data);
  const wins     = data.filter(d=>d.result==="W").length;
  const best     = Math.max(...data.map(d=>d.runs), 0);
  
  const lastPlayedStr = useMemo(() => {
    if (!allData.length) return null;
    const dates = allData.map(d => new Date(d.start_date).getTime()).filter(t => !isNaN(t));
    if (!dates.length) return null;
    const maxDate = new Date(Math.max(...dates));
    return maxDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  }, [allData]);

  // Filter autocomplete suggestions
  const suggestions = useMemo(() => {
    if (!searchInput.trim()) return [];
    const lower = searchInput.toLowerCase();
    return initData.allPlayers.filter(p => p.toLowerCase().includes(lower)).slice(0, 10);
  }, [searchInput, initData.allPlayers]);

  return (
    <div className="max-w-5xl mx-auto py-8 px-2">
      {/* Header */}
      <div className="mb-8">
        <div className="inline-flex items-center gap-2 bg-emerald-50 text-emerald-700 px-4 py-2 rounded-full text-xs font-black uppercase tracking-widest border border-emerald-100 mb-4">
          <TrendingUp size={14}/> Form Tracker
        </div>
        <h2 className="text-3xl font-black text-slate-900 mb-1">Player Form Analysis</h2>
        <p className="text-slate-500">Recent match-by-match performance with trend analysis</p>
      </div>

      {/* Top 10 Pills */}
      {initData.topPlayers.length > 0 && (
        <div className="mb-6 flex flex-wrap items-center gap-2">
          <span className="text-[10px] font-black text-slate-400 uppercase mr-2 tracking-widest">Trending:</span>
          {initData.topPlayers.map(p => (
            <button key={p} onClick={() => setPlayer(p)}
              className={`px-3 py-1 rounded-full text-[11px] font-bold transition-all border ${player === p ? 'bg-emerald-500 text-white border-emerald-500' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-50'}`}>
              {p}
            </button>
          ))}
        </div>
      )}

      {/* Controls Container */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-4 flex-1">
          {/* Search Autocomplete */}
          <div className="relative flex-1 max-w-xs" ref={searchRef}>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input 
                type="text" 
                placeholder="Search any player..."
                value={searchInput}
                onChange={e => { setSearchInput(e.target.value); setShowDropdown(true); }}
                onFocus={() => setShowDropdown(true)}
                className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-sm font-bold text-slate-700 shadow-sm focus:outline-none focus:border-emerald-400"
              />
            </div>
            {showDropdown && suggestions.length > 0 && (
              <ul className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-60 overflow-y-auto">
                {suggestions.map(s => (
                  <li key={s} 
                    onClick={() => { setPlayer(s); setSearchInput(""); setShowDropdown(false); }}
                    className="px-4 py-2 text-sm text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 cursor-pointer font-medium">
                    {s}
                  </li>
                ))}
              </ul>
            )}
          </div>
          
          <div className="flex bg-slate-100 rounded-xl p-1 gap-1">
            {[5,10,20].map(n=>(
              <button key={n} onClick={()=>setNMatches(n)}
                className={`px-4 py-1.5 rounded-lg text-sm font-black transition-all ${nMatches===n?"bg-white shadow text-slate-900":"text-slate-500 hover:text-slate-700"}`}>
                L{n}
              </button>
            ))}
          </div>
        </div>
        
        {/* Last Played Context */}
        {lastPlayedStr && !loading && data.length > 0 && (
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500 bg-slate-50 px-3 py-2 rounded-lg border border-slate-100">
            <Calendar size={14} className="text-slate-400"/> Last match: {lastPlayedStr}
          </div>
        )}
      </div>

      {loading ? (
        <div className="py-20 text-center text-slate-400 font-bold uppercase tracking-widest text-xs animate-pulse">Loading {player} matches...</div>
      ) : data.length === 0 ? (
        <div className="py-20 text-center text-slate-400 font-bold uppercase tracking-widest text-xs">No match data found for {player}</div>
      ) : (
      <>
        {/* Compact Metric Cards Row */}
        <div className="flex flex-wrap md:flex-nowrap gap-3 mb-6">
          <div className="flex-1 bg-white border border-slate-200 rounded-xl p-3 flex items-center justify-between shadow-sm min-w-[140px]">
             <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Current Form</p>
                <span className="text-sm font-black flex items-center gap-1" style={{color:form.color}}><form.Icon size={14}/>{form.label}</span>
             </div>
          </div>
          {[
            {label:`Avg (L${nMatches})`, value: avg, accent:"emerald"},
            {label:"Strike Rate",        value: avgSR, accent:"indigo"},
            {label:"Best Score",         value: best, accent:"amber"},
            {label:"Win Rate",           value:`${wins}/${nMatches}`, accent:"slate"},
          ].map(({label,value,accent})=>(
            <div key={label} className={`flex-1 bg-white border border-${accent}-100 rounded-xl p-3 shadow-sm min-w-[120px]`}>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">{label}</p>
              <p className={`text-lg leading-tight font-black text-${accent}-600`}>{value}</p>
            </div>
          ))}
        </div>

      {/* Dual Axis Chart */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm mb-6">
        <h3 className="text-sm font-black text-slate-700 uppercase tracking-widest mb-6 flex justify-between">
          <span>Runs & Strike Rate — Last {nMatches} Matches</span>
          <span className="text-[10px] text-slate-400 normal-case tracking-normal font-medium bg-slate-50 px-2 py-1 rounded">Bar: Runs | Line: S/R</span>
        </h3>
        <div style={{height:280}}>
          <ResponsiveContainer>
            <ComposedChart data={data} margin={{top:4,right:0,left:0,bottom:0}}>
              <XAxis dataKey="vs" tick={{fontSize:10,fill:"#94a3b8"}} axisLine={false} tickLine={false}/>
              <YAxis yAxisId="left" tick={{fontSize:10,fill:"#10b981"}} axisLine={false} tickLine={false} width={28}/>
              <YAxis yAxisId="right" orientation="right" tick={{fontSize:10,fill:"#f59e0b"}} axisLine={false} tickLine={false} width={35}/>
              <Tooltip content={<CustomTooltip/>}/>
              <ReferenceLine yAxisId="left" y={avg} stroke="#10b981" strokeDasharray="4 4" strokeWidth={1} opacity={0.5}/>
              <Bar yAxisId="left" dataKey="runs" fill="#10b981" radius={[4,4,0,0]} barSize={32}>
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.result === "W" ? "#10b981" : "#94a3b8"} />
                ))}
              </Bar>
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="sr"
                stroke="#f59e0b"
                strokeWidth={3}
                dot={{ r: 4, fill: "#f59e0b", stroke: "#fff", strokeWidth: 2 }}
                activeDot={{r:6,strokeWidth:2,stroke:"#fff"}}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
        <div className="flex items-center gap-6 mt-4 text-xs text-slate-500">
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-emerald-500 inline-block"/>Win (Runs)</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-slate-400 inline-block"/>Loss (Runs)</span>
          <span className="flex items-center gap-1.5"><span className="w-4 border-t-2 border-amber-500 inline-block"/>Strike Rate</span>
        </div>
      </div>

      {/* Match log table */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-sm font-black text-slate-700 uppercase tracking-widest">Match Log</h3>
          <span className="text-xs text-slate-400">{nMatches} matches</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs font-black text-slate-500 uppercase tracking-wider">
              <tr>
                {["#","Opposition","Runs","Balls","S/R","4s","6s","Result"].map(h=>(
                  <th key={h} className="px-4 py-3 text-left">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[...data].reverse().map((d,i)=>(
                <tr key={d.m} className={`border-b border-slate-50 hover:bg-slate-50 transition-colors ${i%2===0?"bg-white":"bg-slate-50/30"}`}>
                  <td className="px-4 py-3 font-mono text-slate-400 text-xs">{data.length-i}</td>
                  <td className="px-4 py-3 font-semibold text-slate-700">{d.vs}</td>
                  <td className="px-4 py-3 font-black text-slate-900 text-base">{d.runs}</td>
                  <td className="px-4 py-3 text-slate-500">{d.balls}</td>
                  <td className="px-4 py-3">
                    <span className={`font-bold ${d.sr>=150?"text-emerald-600":d.sr>=100?"text-slate-700":"text-red-500"}`}>{d.sr}</span>
                  </td>
                  <td className="px-4 py-3 text-slate-500">{d.fours}</td>
                  <td className="px-4 py-3 text-slate-500">{d.sixes}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-black px-2 py-1 rounded-md ${d.result==="W"?"bg-emerald-100 text-emerald-700":"bg-red-100 text-red-600"}`}>{d.result}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      </>
      )}
    </div>
  );
}
