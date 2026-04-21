"use client";
import React, { useState, useMemo } from 'react';
import { BarChart2, ArrowUp, ArrowDown, Info } from 'lucide-react';

const METRIC_DEFS = {
  xRuns:        { label: "xRuns",          hint: "Expected runs based on ball quality, pitch, phase, and bowler strength. Compares actual output to expected.", format: v => v.toFixed(1) },
  pressureIdx:  { label: "Pressure Index", hint: "How well the player performs in high-RRR situations (chase, death, must-win). 100 = average, >100 = better under pressure.", format: v => v.toFixed(0) },
  consistency:  { label: "Consistency",    hint: "Standard deviation of scores normalised to 0-100. Higher = more consistent innings-to-innings.", format: v => v.toFixed(0) },
  impactPerBall:{ label: "Impact/Ball",    hint: "Runs above average per ball faced, adjusted for matchup difficulty.", format: v => v.toFixed(3) },
  boundaryCat:  { label: "Boundary Cat.",  hint: "Percentage of balls hit for 4 or 6.", format: v => `${v}%` },
  dotPct:       { label: "Dot %",          hint: "Percentage of balls faced that resulted in no run.", format: v => `${v}%` },
};

const BATTER_DATA = [
  { name:"Suryakumar Yadav", country:"India",    xRuns:62.4, pressureIdx:128, consistency:58, impactPerBall:0.482, boundaryCat:28, dotPct:32 },
  { name:"Virat Kohli",       country:"India",    xRuns:54.8, pressureIdx:121, consistency:74, impactPerBall:0.358, boundaryCat:20, dotPct:38 },
  { name:"Jos Buttler",       country:"England",  xRuns:52.1, pressureIdx:118, consistency:62, impactPerBall:0.412, boundaryCat:24, dotPct:35 },
  { name:"Glenn Maxwell",     country:"Australia",xRuns:48.6, pressureIdx:135, consistency:44, impactPerBall:0.444, boundaryCat:26, dotPct:30 },
  { name:"Rohit Sharma",      country:"India",    xRuns:46.2, pressureIdx:104, consistency:60, impactPerBall:0.305, boundaryCat:22, dotPct:36 },
  { name:"Babar Azam",        country:"Pakistan", xRuns:50.8, pressureIdx: 97, consistency:78, impactPerBall:0.285, boundaryCat:18, dotPct:41 },
  { name:"Tim David",         country:"Singapore",xRuns:44.2, pressureIdx:142, consistency:50, impactPerBall:0.468, boundaryCat:30, dotPct:28 },
  { name:"Hardik Pandya",     country:"India",    xRuns:38.5, pressureIdx:118, consistency:52, impactPerBall:0.398, boundaryCat:25, dotPct:33 },
  { name:"Liam Livingstone",  country:"England",  xRuns:42.8, pressureIdx:122, consistency:47, impactPerBall:0.426, boundaryCat:29, dotPct:29 },
  { name:"David Miller",      country:"S. Africa",xRuns:40.1, pressureIdx:126, consistency:54, impactPerBall:0.375, boundaryCat:24, dotPct:34 },
  { name:"KL Rahul",          country:"India",    xRuns:38.8, pressureIdx: 94, consistency:68, impactPerBall:0.278, boundaryCat:19, dotPct:40 },
  { name:"Devon Conway",      country:"N. Zealand",xRuns:36.5, pressureIdx: 98, consistency:76, impactPerBall:0.245, boundaryCat:16, dotPct:43 },
];

const BOWLER_DATA = [
  { name:"Jasprit Bumrah",    country:"India",    xRuns:-8.2, pressureIdx:148, consistency:72, impactPerBall:0.512, boundaryCat:8,  dotPct:54 },
  { name:"Rashid Khan",       country:"Afghanistan",xRuns:-6.4,pressureIdx:140, consistency:68, impactPerBall:0.478, boundaryCat:6,  dotPct:58 },
  { name:"Trent Boult",       country:"N. Zealand",xRuns:-5.8, pressureIdx:132, consistency:65, impactPerBall:0.425, boundaryCat:9,  dotPct:51 },
  { name:"Shaheen Afridi",    country:"Pakistan", xRuns:-5.2, pressureIdx:128, consistency:60, impactPerBall:0.398, boundaryCat:10, dotPct:50 },
  { name:"Pat Cummins",       country:"Australia",xRuns:-4.8, pressureIdx:124, consistency:62, impactPerBall:0.372, boundaryCat:11, dotPct:49 },
  { name:"Adil Rashid",       country:"England",  xRuns:-4.4, pressureIdx:118, consistency:58, impactPerBall:0.345, boundaryCat:7,  dotPct:52 },
  { name:"Wanindu Hasaranga", country:"Sri Lanka",xRuns:-4.2, pressureIdx:120, consistency:62, impactPerBall:0.338, boundaryCat:8,  dotPct:53 },
  { name:"Kagiso Rabada",     country:"S. Africa",xRuns:-3.8, pressureIdx:116, consistency:55, impactPerBall:0.318, boundaryCat:12, dotPct:47 },
];

function MetricCell({ value, metricKey, allValues }) {
  const def   = METRIC_DEFS[metricKey];
  const min   = Math.min(...allValues);
  const max   = Math.max(...allValues);
  const pct   = max === min ? 0.5 : (value - min) / (max - min);
  // For bowlers xRuns: lower is better (negative = better)
  const isInverted = metricKey === "dotPct" || (metricKey === "xRuns" && value < 0);
  const heat  = isInverted ? pct : pct;
  const color = heat > 0.75 ? "#10b981" : heat > 0.45 ? "#f59e0b" : "#ef4444";
  return (
    <td className="px-4 py-3.5 text-center">
      <span className="font-black text-sm" style={{ color }}>
        {def.format(value)}
      </span>
    </td>
  );
}

function InfoTip({ hint }) {
  const [show, setShow] = useState(false);
  return (
    <span className="relative inline-block ml-1" onMouseEnter={()=>setShow(true)} onMouseLeave={()=>setShow(false)}>
      <Info size={11} className="text-slate-400 cursor-help inline"/>
      {show && (
        <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-52 bg-slate-900 text-white text-xs rounded-xl p-3 z-50 font-medium leading-relaxed shadow-xl">
          {hint}
          <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-900"/>
        </span>
      )}
    </span>
  );
}

export default function AdvancedMetrics() {
  const [tab,  setTab]  = useState("batters");
  const [sortK, setSortK] = useState("pressureIdx");
  const [sortD, setSortD] = useState("desc");

  const rawData = tab === "batters" ? BATTER_DATA : BOWLER_DATA;

  const data = useMemo(() => {
    return [...rawData].sort((a, b) => {
      const va = a[sortK], vb = b[sortK];
      return sortD === "desc" ? vb - va : va - vb;
    });
  }, [rawData, sortK, sortD]);

  function handleSort(k) {
    if (sortK === k) setSortD(d => d === "asc" ? "desc" : "asc");
    else { setSortK(k); setSortD("desc"); }
  }

  const allValues = (k) => rawData.map(r => r[k]);

  return (
    <div className="max-w-5xl mx-auto py-8 px-2">
      {/* Header */}
      <div className="mb-8">
        <div className="inline-flex items-center gap-2 bg-amber-50 text-amber-700 px-4 py-2 rounded-full text-xs font-black uppercase tracking-widest border border-amber-100 mb-4">
          <BarChart2 size={14}/> Advanced Metrics
        </div>
        <h2 className="text-3xl font-black text-slate-900 mb-1">Beyond the Basics</h2>
        <p className="text-slate-500">xRuns, Pressure Index, Consistency Score, and Impact per Ball</p>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 mb-6">
        {Object.entries(METRIC_DEFS).map(([k, {label, hint}]) => (
          <div key={k} className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-full px-3 py-1.5 text-xs font-bold text-slate-600 shadow-sm">
            {label}<InfoTip hint={hint}/>
          </div>
        ))}
      </div>

      {/* Tab toggle */}
      <div className="flex bg-slate-100 rounded-xl p-1 gap-1 w-fit mb-6">
        {["batters","bowlers"].map(t => (
          <button key={t} onClick={() => { setTab(t); setSortK("pressureIdx"); setSortD("desc"); }}
            className={`px-5 py-2.5 rounded-lg text-sm font-black transition-all capitalize ${
              tab===t ? "bg-white shadow text-slate-900" : "text-slate-500 hover:text-slate-700"}`}>
            {t === "batters" ? "🏏 Batters" : "⚡ Bowlers"}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3.5 text-left text-xs font-black text-slate-500 uppercase tracking-wider w-8">#</th>
                <th className="px-4 py-3.5 text-left text-xs font-black text-slate-500 uppercase tracking-wider">Player</th>
                {Object.entries(METRIC_DEFS).map(([k, {label}]) => (
                  <th key={k} onClick={() => handleSort(k)}
                    className="px-4 py-3.5 text-center text-xs font-black text-slate-500 uppercase tracking-wider cursor-pointer hover:text-emerald-600 transition-colors whitespace-nowrap select-none">
                    <span className="flex items-center justify-center gap-1">
                      {label}
                      {sortK===k && (sortD==="asc"
                        ? <ArrowUp size={10} className="text-emerald-500"/>
                        : <ArrowDown size={10} className="text-emerald-500"/>
                      )}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.map((row, i) => (
                <tr key={row.name} className={`border-b border-slate-50 hover:bg-slate-50 transition-colors ${i < 3 ? "bg-emerald-50/20" : ""}`}>
                  <td className="px-4 py-3.5 text-center">
                    {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : <span className="text-xs text-slate-400 font-mono">{i+1}</span>}
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="font-black text-slate-800 whitespace-nowrap">{row.name}</div>
                    <div className="text-xs text-slate-400">{row.country}</div>
                  </td>
                  {Object.keys(METRIC_DEFS).map(k => (
                    <MetricCell key={k} value={row[k]} metricKey={k} allValues={allValues(k)}/>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 text-xs text-slate-400">
          <span className="font-bold">Color coding:</span> <span className="text-emerald-600 font-bold">Green</span> = top quartile · <span className="text-amber-600 font-bold">Amber</span> = mid · <span className="text-red-500 font-bold">Red</span> = bottom quartile · Click any header to sort
        </div>
      </div>
    </div>
  );
}
