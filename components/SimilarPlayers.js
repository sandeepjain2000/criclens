"use client";
import React, { useState, useMemo } from 'react';
import { Users, Search, ChevronDown, Star } from 'lucide-react';

const PLAYER_PROFILES = {
  "Suryakumar Yadav":  { sr:171, avg:47, ppSR:155, midSR:174, deathSR:195, vsSpinSR:175, vsPaceSR:168, role:"BAT", country:"India",   style:"360° Aggressor" },
  "Virat Kohli":       { sr:139, avg:51, ppSR:122, midSR:138, deathSR:148, vsSpinSR:132, vsPaceSR:144, role:"BAT", country:"India",   style:"Classic Accumulator" },
  "Rohit Sharma":      { sr:140, avg:33, ppSR:148, midSR:135, deathSR:142, vsSpinSR:137, vsPaceSR:142, role:"BAT", country:"India",   style:"Powerplay Dominator" },
  "Babar Azam":        { sr:130, avg:44, ppSR:121, midSR:132, deathSR:138, vsSpinSR:127, vsPaceSR:132, role:"BAT", country:"Pakistan","style":"Elegant Stroker" },
  "Jos Buttler":       { sr:148, avg:37, ppSR:162, midSR:142, deathSR:168, vsSpinSR:142, vsPaceSR:152, role:"WK",  country:"England", style:"Explosive Opener" },
  "Mohammad Rizwan":   { sr:128, avg:42, ppSR:118, midSR:132, deathSR:135, vsSpinSR:125, vsPaceSR:130, role:"WK",  country:"Pakistan","style":"Anchor" },
  "KL Rahul":          { sr:136, avg:34, ppSR:145, midSR:132, deathSR:138, vsSpinSR:132, vsPaceSR:138, role:"WK",  country:"India",   style:"Elegant Anchor" },
  "Glenn Maxwell":     { sr:158, avg:29, ppSR:148, midSR:155, deathSR:188, vsSpinSR:162, vsPaceSR:155, role:"AR",  country:"Australia","style":"360° Aggressor" },
  "Hardik Pandya":     { sr:147, avg:27, ppSR:130, midSR:145, deathSR:178, vsSpinSR:145, vsPaceSR:148, role:"AR",  country:"India",   style:"Death Destroyer" },
  "Liam Livingstone":  { sr:168, avg:30, ppSR:158, midSR:164, deathSR:195, vsSpinSR:172, vsPaceSR:162, role:"AR",  country:"England", style:"360° Aggressor" },
  "David Miller":      { sr:150, avg:36, ppSR:135, midSR:148, deathSR:182, vsSpinSR:152, vsPaceSR:148, role:"BAT", country:"S. Africa","style":"Death Destroyer" },
  "Marcus Stoinis":    { sr:144, avg:28, ppSR:138, midSR:142, deathSR:168, vsSpinSR:140, vsPaceSR:148, role:"AR",  country:"Australia","style":"All-phase Hitter" },
  "Tim David":         { sr:162, avg:31, ppSR:140, midSR:155, deathSR:198, vsSpinSR:168, vsPaceSR:158, role:"BAT", country:"Singapore","style":"Death Destroyer" },
  "Kieron Pollard":    { sr:155, avg:28, ppSR:145, midSR:152, deathSR:185, vsSpinSR:158, vsPaceSR:152, role:"AR",  country:"W. Indies","style":"Death Destroyer" },
  "Andre Russell":     { sr:170, avg:26, ppSR:158, midSR:165, deathSR:205, vsSpinSR:172, vsPaceSR:168, role:"AR",  country:"W. Indies","style":"360° Aggressor" },
  "Quinton de Kock":   { sr:142, avg:36, ppSR:152, midSR:138, deathSR:145, vsSpinSR:138, vsPaceSR:146, role:"WK",  country:"S. Africa","style":"Powerplay Dominator" },
  "Devon Conway":      { sr:128, avg:38, ppSR:125, midSR:130, deathSR:132, vsSpinSR:128, vsPaceSR:130, role:"WK",  country:"N. Zealand","style":"Classic Accumulator" },
  "Travis Head":       { sr:151, avg:34, ppSR:165, midSR:148, deathSR:155, vsSpinSR:148, vsPaceSR:154, role:"BAT", country:"Australia","style":"Powerplay Dominator" },
};

const FEATURES = ["sr","avg","ppSR","midSR","deathSR","vsSpinSR","vsPaceSR"];
const FEATURE_WEIGHTS = [2, 1.5, 1.5, 1.5, 1.5, 1, 1]; // weight for similarity

function cosineSim(a, b) {
  let dot = 0, magA = 0, magB = 0;
  FEATURES.forEach((f,i) => {
    const va = a[f] * FEATURE_WEIGHTS[i], vb = b[f] * FEATURE_WEIGHTS[i];
    dot  += va * vb;
    magA += va * va;
    magB += vb * vb;
  });
  return dot / (Math.sqrt(magA) * Math.sqrt(magB));
}

const ROLE_COLORS = { BAT:"emerald", WK:"sky", AR:"purple", BWL:"blue" };
const STYLE_EMOJIS = {
  "360° Aggressor":      "🌀",
  "Classic Accumulator": "📈",
  "Powerplay Dominator": "⚡",
  "Elegant Stroker":     "🎨",
  "Explosive Opener":    "💥",
  "Anchor":              "⚓",
  "Elegant Anchor":      "🏛",
  "Death Destroyer":     "💀",
  "All-phase Hitter":    "🎯",
};

export default function SimilarPlayers() {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState("Suryakumar Yadav");

  const allPlayers = Object.keys(PLAYER_PROFILES);
  const filtered   = allPlayers.filter(p => p.toLowerCase().includes(search.toLowerCase()));

  const similar = useMemo(() => {
    const base = PLAYER_PROFILES[selected];
    if (!base) return [];
    return allPlayers
      .filter(p => p !== selected)
      .map(p => ({ name: p, sim: cosineSim(base, PLAYER_PROFILES[p]) }))
      .sort((a,b) => b.sim - a.sim)
      .slice(0, 6);
  }, [selected]);

  const base = PLAYER_PROFILES[selected];

  return (
    <div className="max-w-5xl mx-auto py-8 px-2">
      {/* Header */}
      <div className="mb-8">
        <div className="inline-flex items-center gap-2 bg-purple-50 text-purple-700 px-4 py-2 rounded-full text-xs font-black uppercase tracking-widest border border-purple-100 mb-4">
          <Users size={14}/> Find Similar Players
        </div>
        <h2 className="text-3xl font-black text-slate-900 mb-1">Player Similarity Engine</h2>
        <p className="text-slate-500">Find batters with similar profiles based on strike rate patterns, phase performance & style</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Player picker */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100">
            <div className="flex items-center gap-2 bg-slate-50 rounded-xl px-3 py-2">
              <Search size={14} className="text-slate-400"/>
              <input value={search} onChange={e=>setSearch(e.target.value)}
                placeholder="Search player…"
                className="bg-transparent text-sm outline-none flex-1 text-slate-700"/>
            </div>
          </div>
          <div className="max-h-96 overflow-y-auto custom-scrollbar">
            {filtered.map(p => {
              const pr = PLAYER_PROFILES[p];
              const rc = ROLE_COLORS[pr.role] || "slate";
              return (
                <button key={p} onClick={() => setSelected(p)}
                  className={`w-full text-left px-4 py-3 border-b border-slate-50 flex items-center gap-3 hover:bg-slate-50 transition-colors ${selected===p?"bg-emerald-50":""}`}>
                  <div className="flex-1">
                    <div className={`font-bold text-sm ${selected===p?"text-emerald-700":"text-slate-800"}`}>{p}</div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className={`text-[10px] font-black border px-1.5 py-0.5 rounded text-${rc}-700 bg-${rc}-50 border-${rc}-200`}>{pr.role}</span>
                      <span className="text-xs text-slate-400">{pr.country}</span>
                    </div>
                  </div>
                  {selected===p && <div className="w-2 h-2 rounded-full bg-emerald-500"/>}
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected player card + results */}
        <div className="lg:col-span-2 space-y-5">
          {/* Selected player */}
          <div className="bg-slate-900 text-white rounded-2xl p-5">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Analysing</div>
                <h3 className="text-xl font-black">{selected}</h3>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-slate-400">{base?.country} · {base?.role}</span>
                  <span className="text-xs bg-white/10 px-2 py-0.5 rounded-full font-bold text-emerald-300">
                    {STYLE_EMOJIS[base?.style]} {base?.style}
                  </span>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3 text-center">
                {[{l:"S/R",v:base?.sr},{l:"Avg",v:base?.avg},{l:"Death S/R",v:base?.deathSR}].map(({l,v})=>(
                  <div key={l}>
                    <div className="text-xl font-black text-emerald-400">{v}</div>
                    <div className="text-xs text-slate-400">{l}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Similar players grid */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Star size={14} className="text-amber-500"/>
              <h4 className="text-sm font-black text-slate-700 uppercase tracking-widest">Most Similar Players</h4>
              <span className="ml-auto text-xs text-slate-400">Ranked by profile similarity</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {similar.map(({ name, sim }, i) => {
                const pr    = PLAYER_PROFILES[name];
                const rc    = ROLE_COLORS[pr.role] || "slate";
                const pctSim= Math.round(sim * 100);
                return (
                  <div key={name}
                    className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm hover:shadow-md transition-all cursor-pointer"
                    onClick={() => setSelected(name)}>
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="font-black text-slate-800">{name}</div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className={`text-[10px] font-black border px-1.5 py-0.5 rounded text-${rc}-700 bg-${rc}-50 border-${rc}-200`}>{pr.role}</span>
                          <span className="text-xs text-slate-400">{pr.country}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`text-lg font-black ${pctSim>=95?"text-emerald-600":pctSim>=90?"text-indigo-600":"text-slate-600"}`}>
                          {pctSim}%
                        </div>
                        <div className="text-[10px] text-slate-400">Match</div>
                      </div>
                    </div>
                    {/* Similarity bar */}
                    <div className="h-1.5 bg-slate-100 rounded-full mb-3 overflow-hidden">
                      <div className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-indigo-400" style={{width:`${pctSim}%`}}/>
                    </div>
                    {/* Mini stats */}
                    <div className="grid grid-cols-3 gap-2 text-center">
                      {[{l:"S/R",v:pr.sr},{l:"Avg",v:pr.avg},{l:"Death",v:pr.deathSR}].map(({l,v})=>(
                        <div key={l} className="bg-slate-50 rounded-lg py-1.5">
                          <div className="text-sm font-black text-slate-800">{v}</div>
                          <div className="text-[9px] text-slate-400 uppercase">{l}</div>
                        </div>
                      ))}
                    </div>
                    <div className="mt-2 text-xs text-center text-slate-500 bg-slate-50 rounded-lg py-1">
                      {STYLE_EMOJIS[pr.style]} {pr.style}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
