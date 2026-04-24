"use client";
import React, { useState, useRef } from 'react';
import { Swords, Download, Share2, ChevronDown, Trophy } from 'lucide-react';

// Player data loaded dynamically from API

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
  const [playerList, setPlayerList] = useState([]);
  const [p1Name, setP1Name] = useState("");
  const [p2Name, setP2Name] = useState("");
  const [p1, setP1] = useState(null);
  const [p2, setP2] = useState(null);
  const [loading, setLoading] = useState(true);
  const [comparing, setComparing] = useState(false);
  const [copied, setCopied] = useState(false);
  const cardRef = useRef(null);

  // Load player list on mount
  React.useEffect(() => {
    fetch('/api/t20/battle-cards?action=players')
      .then(r => r.json())
      .then(d => {
        const list = d.players || [];
        setPlayerList(list);
        if (list.length >= 2) {
          setP1Name(list[0].name);
          setP2Name(list[1].name);
        }
        setLoading(false);
      })
      .catch(e => { console.error(e); setLoading(false); });
  }, []);

  // Compare when names change
  React.useEffect(() => {
    if (!p1Name || !p2Name) return;
    setComparing(true);
    fetch(`/api/t20/battle-cards?action=compare&p1=${encodeURIComponent(p1Name)}&p2=${encodeURIComponent(p2Name)}`)
      .then(r => r.json())
      .then(d => {
        if (d.p1) setP1(d.p1);
        if (d.p2) setP2(d.p2);
        setComparing(false);
      })
      .catch(e => { console.error(e); setComparing(false); });
  }, [p1Name, p2Name]);

  const metrics = [
    {label:"Strike Rate", k:"sr",     max:220},
    {label:"Average",     k:"avg",    max:65 },
    {label:"Innings",     k:"innings",max:180},
    {label:"50s",         k:"fifties",max:45 },
    {label:"100s",        k:"centuries",max:10},
  ];

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto py-8 px-2">
        <div className="text-center py-20 text-slate-400 font-bold uppercase tracking-widest text-xs animate-pulse">
          Loading Battle Cards engine...
        </div>
      </div>
    );
  }

  if (!p1 || !p2) {
    return (
      <div className="max-w-4xl mx-auto py-8 px-2">
        <div className="text-center py-20 text-slate-400 font-bold uppercase tracking-widest text-xs">
          {comparing ? <span className="animate-pulse">Loading comparison...</span> : "Select two players to compare"}
        </div>
      </div>
    );
  }

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
        {playerList.filter(p=>p.name!==exclude).map(p=><option key={p.name} value={p.name}>{p.name}</option>)}
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
              <div className="text-3xl mb-1">🏆</div>
              <div className="font-black text-xl">{p1Name.split(" ").pop()}</div>
              <div className="text-xs text-white/70 font-bold">{p1.country} · {p1.role}</div>
            </div>
            <div className="text-center">
              <Swords size={32} className="text-amber-400 mx-auto mb-1"/>
              <span className="text-xs font-black uppercase tracking-widest text-white/60">T20I</span>
            </div>
            <div className="text-center">
              <div className="text-3xl mb-1">🏆</div>
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
