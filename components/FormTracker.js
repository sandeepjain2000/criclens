"use client";
import React, { useState, useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, BarChart, Bar, Cell } from 'recharts';
import { TrendingUp, TrendingDown, Minus, Flame, Snowflake, ChevronDown } from 'lucide-react';

const PLAYERS = ["Virat Kohli","Rohit Sharma","Suryakumar Yadav","KL Rahul","Hardik Pandya",
  "Jos Buttler","Babar Azam","Mohammad Rizwan","Rashid Khan","Jasprit Bumrah"];

function genMatches(avgRuns, stdDev = 22) {
  const opps = ["AUS","ENG","SA","NZ","WI","PAK","SL","AFG","BAN","IRE","ZIM","SCO"];
  return Array.from({length:20},(_,i)=>{
    const base = Math.max(0, Math.round(avgRuns + (Math.random()-0.5)*stdDev*2));
    const balls = Math.max(1, Math.round(base / ((120 + Math.random()*60)/100)));
    return {
      m: i+1,
      vs: "vs " + opps[i % opps.length],
      runs: base,
      balls,
      sr: balls > 0 ? Math.round(base/balls*100) : 0,
      fours: Math.floor(base/18),
      sixes: Math.floor(base/35),
      result: Math.random() > 0.4 ? "W" : "L",
    };
  });
}

const FORM_DATA = {
  "Virat Kohli":      genMatches(52),
  "Rohit Sharma":     genMatches(44),
  "Suryakumar Yadav": genMatches(55),
  "KL Rahul":         genMatches(38),
  "Hardik Pandya":    genMatches(32),
  "Jos Buttler":      genMatches(47),
  "Babar Azam":       genMatches(50),
  "Mohammad Rizwan":  genMatches(43),
  "Rashid Khan":      genMatches(14),
  "Jasprit Bumrah":   genMatches(8),
};

const FORM_COLORS = { hot: "#10b981", warm: "#f59e0b", cold: "#ef4444", neutral: "#6366f1" };

function formRating(data) {
  const avg = data.reduce((a,b) => a+b.runs,0)/data.length;
  if (avg > 50) return { label:"🔥 On Fire", color: FORM_COLORS.hot,   Icon: Flame     };
  if (avg > 35) return { label:"📈 Good Form",color: FORM_COLORS.warm,  Icon: TrendingUp};
  if (avg > 20) return { label:"➡ Average",   color: FORM_COLORS.neutral,Icon: Minus    };
  return           { label:"❄ Cold Patch",  color: FORM_COLORS.cold,  Icon: Snowflake };
}

const CustomTooltip = ({ active, payload, label }) => {
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
        <span>S/R</span><span className="font-mono">{d?.sr}</span>
      </div>
      <div className="flex justify-between gap-4">
        <span>Result</span>
        <span className={d?.result === "W" ? "text-emerald-400 font-black" : "text-red-400 font-black"}>{d?.result}</span>
      </div>
    </div>
  );
};

export default function FormTracker() {
  const [player, setPlayer] = useState("Virat Kohli");
  const [nMatches, setNMatches] = useState(10);
  const [viewMode, setViewMode] = useState("runs"); // runs | sr

  const allData  = FORM_DATA[player] || [];
  const data     = useMemo(() => allData.slice(-nMatches), [allData, nMatches]);
  const avg      = data.length ? Math.round(data.reduce((a,b)=>a+b.runs,0)/data.length) : 0;
  const avgSR    = data.length ? Math.round(data.reduce((a,b)=>a+b.sr,0)/data.length) : 0;
  const form     = formRating(data);
  const wins     = data.filter(d=>d.result==="W").length;
  const best     = Math.max(...data.map(d=>d.runs));
  const overallAvg = allData.length ? Math.round(allData.reduce((a,b)=>a+b.runs,0)/allData.length) : 0;

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

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-4 mb-8">
        <div className="relative">
          <select
            value={player}
            onChange={e=>setPlayer(e.target.value)}
            className="appearance-none bg-white border border-slate-200 rounded-xl px-4 py-2.5 pr-10 text-sm font-bold text-slate-700 shadow-sm focus:outline-none focus:border-emerald-400 cursor-pointer"
          >
            {PLAYERS.map(p=><option key={p}>{p}</option>)}
          </select>
          <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"/>
        </div>

        <div className="flex bg-slate-100 rounded-xl p-1 gap-1">
          {[5,10,20].map(n=>(
            <button key={n} onClick={()=>setNMatches(n)}
              className={`px-4 py-2 rounded-lg text-sm font-black transition-all ${nMatches===n?"bg-white shadow text-slate-900":"text-slate-500 hover:text-slate-700"}`}>
              Last {n}
            </button>
          ))}
        </div>

        <div className="flex bg-slate-100 rounded-xl p-1 gap-1">
          {[{k:"runs",l:"Runs"},{k:"sr",l:"Strike Rate"}].map(({k,l})=>(
            <button key={k} onClick={()=>setViewMode(k)}
              className={`px-4 py-2 rounded-lg text-sm font-black transition-all ${viewMode===k?"bg-white shadow text-slate-900":"text-slate-500"}`}>
              {l}
            </button>
          ))}
        </div>
      </div>

      {/* Form badge + summary stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
        <div className="md:col-span-1 bg-white border border-slate-200 rounded-2xl p-5 flex flex-col items-center justify-center text-center shadow-sm">
          <form.Icon size={28} style={{color:form.color}} className="mb-2"/>
          <span className="text-sm font-black" style={{color:form.color}}>{form.label}</span>
          <span className="text-xs text-slate-400 mt-1">Last {nMatches} matches</span>
        </div>
        {[
          {label:`Avg (L${nMatches})`, value: avg,       sub:`Overall: ${overallAvg}`, accent:"emerald"},
          {label:"Strike Rate",        value: avgSR,      sub:`/100 balls`,             accent:"indigo"},
          {label:"Best Score",         value: best,       sub:`in last ${nMatches}`,    accent:"amber"},
          {label:"Win Rate",           value:`${wins}/${nMatches}`, sub:`matches won`,  accent:"slate"},
        ].map(({label,value,sub,accent})=>(
          <div key={label} className={`bg-white border border-${accent}-100 rounded-2xl p-5 shadow-sm`}>
            <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">{label}</p>
            <p className={`text-2xl font-black text-${accent}-600`}>{value}</p>
            <p className="text-xs text-slate-400 mt-0.5">{sub}</p>
          </div>
        ))}
      </div>

      {/* Chart */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm mb-6">
        <h3 className="text-sm font-black text-slate-700 uppercase tracking-widest mb-6">
          {viewMode === "runs" ? "Runs Scored" : "Strike Rate"} — Last {nMatches} Matches
        </h3>
        <div style={{height:260}}>
          <ResponsiveContainer>
            <LineChart data={data} margin={{top:4,right:8,left:0,bottom:0}}>
              <XAxis dataKey="vs" tick={{fontSize:10,fill:"#94a3b8"}} axisLine={false} tickLine={false}/>
              <YAxis tick={{fontSize:10,fill:"#94a3b8"}} axisLine={false} tickLine={false} width={28}/>
              <Tooltip content={<CustomTooltip/>}/>
              <ReferenceLine y={avg} stroke="#6366f1" strokeDasharray="4 4" strokeWidth={1.5}
                label={{value:`Avg ${avg}`,position:"right",fontSize:10,fill:"#6366f1"}}/>
              <Line
                type="monotone"
                dataKey={viewMode}
                stroke="#10b981"
                strokeWidth={2.5}
                dot={(props)=>{
                  const {cx,cy,payload} = props;
                  const color = payload.result==="W"?"#10b981":"#ef4444";
                  return <circle key={`dot-${payload.m}`} cx={cx} cy={cy} r={5} fill={color} stroke="#fff" strokeWidth={2}/>;
                }}
                activeDot={{r:7,strokeWidth:2,stroke:"#fff"}}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="flex items-center gap-6 mt-4 text-xs text-slate-500">
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-emerald-500 inline-block"/>Win</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-red-400 inline-block"/>Loss</span>
          <span className="flex items-center gap-1.5"><span className="w-6 border-t-2 border-dashed border-indigo-400 inline-block"/>Average</span>
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
    </div>
  );
}
