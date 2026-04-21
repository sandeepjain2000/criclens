"use client";
import React, { useState, useRef } from 'react';
import { Swords, Download, Share2, ChevronDown, Trophy } from 'lucide-react';

const PLAYERS = {
  "Virat Kohli":      { country:"India",   flag:"🇮🇳", role:"BAT", sr:139, avg:51.1, runs:4188, innings:131, fifties:38, centuries:1,  phase:{pp:122,mid:138,death:148}, vs:{pace:144,spin:132}},
  "Rohit Sharma":     { country:"India",   flag:"🇮🇳", role:"BAT", sr:140, avg:32.5, runs:4231, innings:148, fifties:30, centuries:4,  phase:{pp:148,mid:135,death:142}, vs:{pace:142,spin:137}},
  "Suryakumar Yadav": { country:"India",   flag:"🇮🇳", role:"BAT", sr:171, avg:47.4, runs:3874, innings:97,  fifties:28, centuries:4,  phase:{pp:155,mid:174,death:195}, vs:{pace:168,spin:175}},
  "Babar Azam":       { country:"Pakistan",flag:"🇵🇰", role:"BAT", sr:130, avg:43.8, runs:4003, innings:108, fifties:34, centuries:3,  phase:{pp:121,mid:132,death:138}, vs:{pace:132,spin:127}},
  "Jos Buttler":      { country:"England", flag:"🏴󠁧󠁢󠁥󠁮󠁧󠁿", role:"WK",  sr:148, avg:36.5, runs:3282, innings:104, fifties:26, centuries:7,  phase:{pp:162,mid:142,death:168}, vs:{pace:152,spin:142}},
  "Mohammad Rizwan":  { country:"Pakistan",flag:"🇵🇰", role:"WK",  sr:128, avg:42.2, runs:3590, innings:98,  fifties:35, centuries:2,  phase:{pp:118,mid:132,death:135}, vs:{pace:130,spin:125}},
  "Glenn Maxwell":    { country:"Australia",flag:"🇦🇺",role:"AR",  sr:158, avg:28.5, runs:2574, innings:108, fifties:18, centuries:3,  phase:{pp:148,mid:155,death:188}, vs:{pace:155,spin:162}},
  "Hardik Pandya":    { country:"India",   flag:"🇮🇳", role:"AR",  sr:147, avg:27.1, runs:1820, innings:78,  fifties:11, centuries:0,  phase:{pp:130,mid:145,death:178}, vs:{pace:148,spin:145}},
  "KL Rahul":         { country:"India",   flag:"🇮🇳", role:"WK",  sr:136, avg:34.2, runs:2476, innings:83,  fifties:22, centuries:1,  phase:{pp:145,mid:132,death:138}, vs:{pace:138,spin:132}},
};

const PLAYER_LIST = Object.keys(PLAYERS);

function CompareBar({ label, v1, v2, max, p1Color = "#10b981", p2Color = "#6366f1" }) {
  const pct1 = Math.round((v1 / max) * 100);
  const pct2 = Math.round((v2 / max) * 100);
  const winner = v1 > v2 ? 1 : v2 > v1 ? 2 : 0;
  return (
    <div className="mb-3">
      <div className="flex justify-between items-center mb-1">
        <span className={`text-sm font-black ${winner===1?"text-emerald-600":"text-slate-700"}`}>{v1}</span>
        <span className="text-xs text-slate-400 uppercase tracking-wider font-bold">{label}</span>
        <span className={`text-sm font-black ${winner===2?"text-indigo-600":"text-slate-700"}`}>{v2}</span>
      </div>
      <div className="h-3 bg-slate-100 rounded-full overflow-hidden flex">
        <div className="h-full rounded-full transition-all duration-700" style={{width:`${pct1/2}%`, background:p1Color, marginLeft:`${50-pct1/2}%`}}/>
        <div className="h-full rounded-full transition-all duration-700" style={{width:`${pct2/2}%`, background:p2Color}}/>
      </div>
    </div>
  );
}

export default function BattleCardHub() {
  const [p1Name, setP1Name] = useState("Virat Kohli");
  const [p2Name, setP2Name] = useState("Suryakumar Yadav");
  const [copied, setCopied] = useState(false);
  const cardRef = useRef(null);

  const p1 = PLAYERS[p1Name];
  const p2 = PLAYERS[p2Name];

  const metrics = [
    {label:"Strike Rate", k:"sr",     max:220},
    {label:"Average",     k:"avg",    max:65 },
    {label:"Innings",     k:"innings",max:180},
    {label:"50s",         k:"fifties",max:45 },
    {label:"100s",        k:"centuries",max:10},
  ];

  function getHeadline() {
    const wins = { [p1Name]: 0, [p2Name]: 0 };
    metrics.forEach(({k}) => {
      if (p1[k] > p2[k]) wins[p1Name]++;
      else if (p2[k] > p1[k]) wins[p2Name]++;
    });
    const winner = wins[p1Name] > wins[p2Name] ? p1Name : wins[p2Name] > wins[p1Name] ? p2Name : null;
    if (!winner) return "🤝 Too close to call — an epic rivalry!";
    const diff = Math.abs(wins[p1Name] - wins[p2Name]);
    const margin = diff >= 3 ? "dominates" : "edges out";
    return `🏆 ${winner} ${margin} this battle`;
  }

  function handleShare() {
    navigator.clipboard.writeText(`${window.location.origin}?battle=${encodeURIComponent(p1Name)}vs${encodeURIComponent(p2Name)}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleDownload() {
    window.print();
  }

  const Selector = ({ value, onChange, exclude }) => (
    <div className="relative">
      <select value={value} onChange={e=>onChange(e.target.value)}
        className="appearance-none bg-white border border-slate-200 rounded-xl px-4 py-2.5 pr-8 text-sm font-black text-slate-700 shadow-sm focus:outline-none focus:border-emerald-400 cursor-pointer max-w-[180px]">
        {PLAYER_LIST.filter(p=>p!==exclude).map(p=><option key={p}>{p}</option>)}
      </select>
      <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"/>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto py-8 px-2">
      {/* Header */}
      <div className="mb-8">
        <div className="inline-flex items-center gap-2 bg-purple-50 text-purple-700 px-4 py-2 rounded-full text-xs font-black uppercase tracking-widest border border-purple-100 mb-4">
          <Swords size={14}/> Battle Cards
        </div>
        <h2 className="text-3xl font-black text-slate-900 mb-1">Player vs Player</h2>
        <p className="text-slate-500">Head-to-head comparison cards you can download and share</p>
      </div>

      {/* Player selectors */}
      <div className="flex items-center gap-4 mb-8 flex-wrap">
        <Selector value={p1Name} onChange={setP1Name} exclude={p2Name}/>
        <span className="font-black text-slate-400 text-xl">VS</span>
        <Selector value={p2Name} onChange={setP2Name} exclude={p1Name}/>
        <div className="ml-auto flex gap-2">
          <button onClick={handleShare}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm font-bold text-slate-600 hover:border-indigo-300 hover:text-indigo-600 transition-all shadow-sm">
            <Share2 size={15}/> {copied ? "Copied!" : "Share Link"}
          </button>
          <button onClick={handleDownload}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-bold hover:bg-slate-800 transition-all shadow-sm">
            <Download size={15}/> Download
          </button>
        </div>
      </div>

      {/* Battle Card */}
      <div ref={cardRef} className="bg-white border-2 border-slate-200 rounded-3xl overflow-hidden shadow-xl print:shadow-none">

        {/* Header bar */}
        <div className="bg-gradient-to-r from-emerald-600 via-slate-800 to-indigo-600 p-6 text-white">
          <div className="flex items-center justify-between">
            <div className="text-center">
              <div className="text-3xl mb-1">{p1.flag}</div>
              <div className="font-black text-xl">{p1Name.split(" ").pop()}</div>
              <div className="text-xs text-white/70 font-bold">{p1.country} · {p1.role}</div>
            </div>
            <div className="text-center">
              <Swords size={32} className="text-amber-400 mx-auto mb-1"/>
              <span className="text-xs font-black uppercase tracking-widest text-white/60">T20I</span>
            </div>
            <div className="text-center">
              <div className="text-3xl mb-1">{p2.flag}</div>
              <div className="font-black text-xl">{p2Name.split(" ").pop()}</div>
              <div className="text-xs text-white/70 font-bold">{p2.country} · {p2.role}</div>
            </div>
          </div>
          {/* Headline */}
          <div className="mt-4 text-center bg-white/10 rounded-xl px-4 py-2">
            <p className="text-sm font-black">{getHeadline()}</p>
          </div>
        </div>

        {/* Stats comparison */}
        <div className="p-6">
          <div className="mb-6">
            <div className="flex justify-between text-xs font-black text-slate-400 uppercase tracking-widest mb-4">
              <span>{p1Name.split(" ")[0]}</span>
              <span>Metric</span>
              <span>{p2Name.split(" ")[0]}</span>
            </div>
            {metrics.map(({label,k,max})=>(
              <CompareBar key={k} label={label} v1={p1[k]} v2={p2[k]} max={max}/>
            ))}
          </div>

          {/* Phase breakdown */}
          <div className="border-t border-slate-100 pt-5">
            <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-4">Strike Rate by Phase</h4>
            <div className="grid grid-cols-3 gap-3">
              {[{ph:"pp",label:"Powerplay"},{ph:"mid",label:"Middle"},{ph:"death",label:"Death"}].map(({ph,label})=>{
                const v1 = p1.phase[ph], v2 = p2.phase[ph];
                const winner = v1 > v2 ? 1 : v2 > v1 ? 2 : 0;
                return (
                  <div key={ph} className="bg-slate-50 rounded-xl p-3 text-center border border-slate-100">
                    <div className="text-[10px] font-black text-slate-400 uppercase mb-2">{label}</div>
                    <div className="flex justify-between items-end">
                      <span className={`text-base font-black ${winner===1?"text-emerald-600":"text-slate-500"}`}>{v1}</span>
                      <span className="text-[10px] text-slate-300">S/R</span>
                      <span className={`text-base font-black ${winner===2?"text-indigo-600":"text-slate-500"}`}>{v2}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* vs Pace/Spin */}
          <div className="border-t border-slate-100 pt-5 mt-4">
            <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-4">Strike Rate vs Bowling Type</h4>
            <div className="grid grid-cols-2 gap-3">
              {[{k:"pace",label:"vs Pace"},{k:"spin",label:"vs Spin"}].map(({k,label})=>{
                const v1 = p1.vs[k], v2 = p2.vs[k];
                const winner = v1 > v2 ? 1 : v2 > v1 ? 2 : 0;
                return (
                  <div key={k} className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                    <div className="text-[10px] font-black text-slate-400 uppercase mb-2 text-center">{label}</div>
                    <div className="flex justify-between items-center">
                      <span className={`text-lg font-black ${winner===1?"text-emerald-600":"text-slate-500"}`}>{v1}</span>
                      <span className="text-xs text-slate-300">vs</span>
                      <span className={`text-lg font-black ${winner===2?"text-indigo-600":"text-slate-500"}`}>{v2}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Footer */}
          <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
            <span className="font-bold">CricLens T20 Analytics</span>
            <span>criclens1.netlify.app</span>
          </div>
        </div>
      </div>
    </div>
  );
}
