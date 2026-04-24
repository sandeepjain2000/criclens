"use client";
import React, { useState, useMemo } from 'react';
import { Users, Search, ChevronDown, Star } from 'lucide-react';

// PLAYER_PROFILES loaded dynamically from API
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
  const [selected, setSelected] = useState("");
  const [playerProfiles, setPlayerProfiles] = useState({});
  const [loading, setLoading] = useState(true);

  React.useEffect(() => {
    fetch('/api/t20/similar-players')
      .then(r => r.json())
      .then(d => {
        setPlayerProfiles(d.data || {});
        const keys = Object.keys(d.data || {});
        if (keys.length > 0) {
          // Select an interesting default player or the first one
          setSelected(keys.includes("Suryakumar Yadav") ? "Suryakumar Yadav" : keys[0]);
        }
        setLoading(false);
      })
      .catch(e => {
        console.error(e);
        setLoading(false);
      });
  }, []);

  const allPlayers = Object.keys(playerProfiles);
  const filtered   = allPlayers.filter(p => p.toLowerCase().includes(search.toLowerCase()));

  const similar = useMemo(() => {
    const base = playerProfiles[selected];
    if (!base) return [];
    return allPlayers
      .filter(p => p !== selected)
      .map(p => ({ name: p, sim: cosineSim(base, playerProfiles[p]) }))
      .sort((a,b) => b.sim - a.sim)
      .slice(0, 6);
  }, [selected, playerProfiles, allPlayers]);

  const base = playerProfiles[selected];

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
            {loading ? (
              <div className="text-center py-10 text-slate-400 font-bold uppercase tracking-widest text-xs animate-pulse">
                Loading database...
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-10 text-slate-400 font-bold uppercase tracking-widest text-xs">
                No players found
              </div>
            ) : filtered.map(p => {
              const pr = playerProfiles[p];
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
            {loading ? (
              <div className="text-center py-4 text-slate-400 font-bold uppercase tracking-widest text-xs animate-pulse">Loading player data...</div>
            ) : base && (
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Analysing</div>
                  <h3 className="text-xl font-black">{selected}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-slate-400">{base.country} · {base.role}</span>
                    <span className="text-xs bg-white/10 px-2 py-0.5 rounded-full font-bold text-emerald-300">
                      {STYLE_EMOJIS[base.style] || "📊"} {base.style}
                    </span>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3 text-center">
                  {[{l:"S/R",v:base.sr},{l:"Avg",v:base.avg},{l:"Death S/R",v:base.deathSR}].map(({l,v})=>(
                    <div key={l}>
                      <div className="text-xl font-black text-emerald-400">{v}</div>
                      <div className="text-xs text-slate-400">{l}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Similar players grid */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Star size={14} className="text-amber-500"/>
              <h4 className="text-sm font-black text-slate-700 uppercase tracking-widest">Most Similar Players</h4>
              <span className="ml-auto text-xs text-slate-400">Ranked by profile similarity</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {loading ? (
                <div className="col-span-2 text-center py-20 text-slate-400 font-bold uppercase tracking-widest text-xs animate-pulse">
                  Finding similar players...
                </div>
              ) : similar.length === 0 ? (
                <div className="col-span-2 text-center py-20 text-slate-400 font-bold uppercase tracking-widest text-xs">
                  No similar players found
                </div>
              ) : similar.map(({ name, sim }, i) => {
                const pr    = playerProfiles[name];
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
                      {STYLE_EMOJIS[pr.style] || "📊"} {pr.style}
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
