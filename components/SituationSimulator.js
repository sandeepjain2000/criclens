"use client";
import React, { useState, useMemo } from 'react';
import { Target, Zap, TrendingUp, Award, ChevronRight } from 'lucide-react';

const PLAYERS_DB = [
  { name:"Suryakumar Yadav", role:"BAT", country:"India",
    chaseProfile:{ sr:192, avgRuns:38, successRate:71 },
    powerplayProfile:{ sr:148, avgRuns:22, successRate:64 },
    deathProfile:{ sr:204, avgRuns:24, successRate:69 },
    highPressureRating: 92 },
  { name:"Virat Kohli", role:"BAT", country:"India",
    chaseProfile:{ sr:138, avgRuns:52, successRate:78 },
    powerplayProfile:{ sr:125, avgRuns:34, successRate:74 },
    deathProfile:{ sr:145, avgRuns:28, successRate:65 },
    highPressureRating: 95 },
  { name:"Jos Buttler", role:"WK", country:"England",
    chaseProfile:{ sr:158, avgRuns:44, successRate:70 },
    powerplayProfile:{ sr:162, avgRuns:38, successRate:68 },
    deathProfile:{ sr:175, avgRuns:22, successRate:63 },
    highPressureRating: 88 },
  { name:"Rohit Sharma", role:"BAT", country:"India",
    chaseProfile:{ sr:128, avgRuns:40, successRate:65 },
    powerplayProfile:{ sr:145, avgRuns:42, successRate:70 },
    deathProfile:{ sr:138, avgRuns:18, successRate:58 },
    highPressureRating: 82 },
  { name:"Hardik Pandya", role:"AR", country:"India",
    chaseProfile:{ sr:162, avgRuns:28, successRate:68 },
    powerplayProfile:{ sr:130, avgRuns:20, successRate:61 },
    deathProfile:{ sr:188, avgRuns:32, successRate:72 },
    highPressureRating: 84 },
  { name:"Babar Azam", role:"BAT", country:"Pakistan",
    chaseProfile:{ sr:125, avgRuns:48, successRate:74 },
    powerplayProfile:{ sr:118, avgRuns:36, successRate:70 },
    deathProfile:{ sr:130, avgRuns:16, successRate:54 },
    highPressureRating: 80 },
  { name:"Glenn Maxwell", role:"AR", country:"Australia",
    chaseProfile:{ sr:172, avgRuns:32, successRate:64 },
    powerplayProfile:{ sr:148, avgRuns:24, successRate:60 },
    deathProfile:{ sr:198, avgRuns:30, successRate:68 },
    highPressureRating: 87 },
  { name:"Liam Livingstone", role:"AR", country:"England",
    chaseProfile:{ sr:168, avgRuns:30, successRate:62 },
    powerplayProfile:{ sr:158, avgRuns:28, successRate:60 },
    deathProfile:{ sr:195, avgRuns:26, successRate:65 },
    highPressureRating: 79 },
  { name:"KL Rahul", role:"WK", country:"India",
    chaseProfile:{ sr:132, avgRuns:38, successRate:68 },
    powerplayProfile:{ sr:140, avgRuns:32, successRate:66 },
    deathProfile:{ sr:128, avgRuns:14, successRate:52 },
    highPressureRating: 76 },
  { name:"Quinton de Kock", role:"WK", country:"S. Africa",
    chaseProfile:{ sr:142, avgRuns:36, successRate:66 },
    powerplayProfile:{ sr:152, avgRuns:40, successRate:68 },
    deathProfile:{ sr:145, avgRuns:16, successRate:56 },
    highPressureRating: 82 },
];

function detectPhase(oversLeft, wicketsDown) {
  if (oversLeft > 15) return "powerplay";
  if (oversLeft <= 5) return "death";
  return "chase";
}

function scorePlayer(p, target, oversLeft, wicketsDown, crr) {
  const rrr = oversLeft > 0 ? ((target - 0) / oversLeft) : 99; // simplified
  const phase = detectPhase(oversLeft, wicketsDown);
  const profile = phase === "powerplay" ? p.powerplayProfile
                : phase === "death"     ? p.deathProfile
                : p.chaseProfile;
  const pressure = wicketsDown >= 5 ? 1.2 : wicketsDown >= 3 ? 1.0 : 0.8;
  const rrrFactor = rrr > 12 ? 1.3 : rrr > 9 ? 1.1 : 0.9;
  const score = (profile.sr / 100) * profile.successRate * pressure * rrrFactor *
    (p.highPressureRating / 80);
  return { ...p, profile, phase, score: Math.round(score * 10) / 10,
    recommendation: rrr > 12 ? "Attack from ball 1" : rrr > 9 ? "Build then attack" : "Rotate strike" };
}

const PHASE_LABELS = { powerplay: "Powerplay 🔥", death: "Death Overs 💀", chase: "Middle Overs ⚔" };
const ROLE_COLORS  = { BAT:"emerald", WK:"sky", AR:"purple", BWL:"blue" };

export default function SituationSimulator() {
  const [target,    setTarget]    = useState(185);
  const [oversLeft, setOversLeft] = useState(8);
  const [wickets,   setWickets]   = useState(3);
  const [crr,       setCrr]       = useState(9.2);
  const [simulated, setSimulated] = useState(false);

  const rrr = oversLeft > 0 ? ((target - Math.round(crr * (20 - oversLeft))) / oversLeft).toFixed(1) : "—";
  const phase = detectPhase(oversLeft, wickets);

  const ranked = useMemo(() => {
    if (!simulated) return [];
    return [...PLAYERS_DB]
      .map(p => scorePlayer(p, target, oversLeft, wickets, crr))
      .sort((a, b) => b.score - a.score)
      .slice(0, 6);
  }, [simulated, target, oversLeft, wickets, crr]);

  const scenarioLabel = () => {
    const needed = target - Math.round(crr * (20 - oversLeft));
    return `Need ${Math.max(0,needed)} from ${oversLeft} overs (${wickets} wkts down) · RRR: ${rrr}`;
  };

  return (
    <div className="max-w-5xl mx-auto py-8 px-2">
      {/* Header */}
      <div className="mb-8">
        <div className="inline-flex items-center gap-2 bg-rose-50 text-rose-700 px-4 py-2 rounded-full text-xs font-black uppercase tracking-widest border border-rose-100 mb-4">
          <Target size={14}/> Situation Simulator
        </div>
        <h2 className="text-3xl font-black text-slate-900 mb-1">Game Scenario Engine</h2>
        <p className="text-slate-500">Find the best players for any match situation based on historical data</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Input Panel */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <h3 className="text-sm font-black text-slate-700 uppercase tracking-widest mb-6">Define the Situation</h3>

          <div className="space-y-6">
            {/* Target */}
            <div>
              <div className="flex justify-between mb-2">
                <label className="text-sm font-bold text-slate-600">Target Score</label>
                <span className="text-lg font-black text-slate-900">{target}</span>
              </div>
              <input type="range" min={120} max={250} value={target} onChange={e=>setTarget(+e.target.value)}
                className="w-full accent-emerald-500 h-2 rounded-full"/>
              <div className="flex justify-between text-xs text-slate-400 mt-1">
                <span>120</span><span>250</span>
              </div>
            </div>

            {/* Overs Left */}
            <div>
              <div className="flex justify-between mb-2">
                <label className="text-sm font-bold text-slate-600">Overs Remaining</label>
                <span className="text-lg font-black text-slate-900">{oversLeft}</span>
              </div>
              <input type="range" min={1} max={20} value={oversLeft} onChange={e=>setOversLeft(+e.target.value)}
                className="w-full accent-indigo-500 h-2 rounded-full"/>
              <div className="flex justify-between text-xs text-slate-400 mt-1">
                <span>1</span><span>20</span>
              </div>
            </div>

            {/* Wickets Down */}
            <div>
              <div className="flex justify-between mb-2">
                <label className="text-sm font-bold text-slate-600">Wickets Fallen</label>
                <span className="text-lg font-black text-slate-900">{wickets}</span>
              </div>
              <div className="flex gap-2">
                {[0,1,2,3,4,5,6,7,8,9].map(w=>(
                  <button key={w} onClick={()=>setWickets(w)}
                    className={`flex-1 py-2 rounded-lg text-xs font-black transition-all border ${
                      wickets===w ? "bg-slate-900 text-white border-slate-900"
                                 : "bg-white text-slate-500 border-slate-200 hover:border-slate-400"}`}>
                    {w}
                  </button>
                ))}
              </div>
            </div>

            {/* Current Run Rate */}
            <div>
              <div className="flex justify-between mb-2">
                <label className="text-sm font-bold text-slate-600">Current Run Rate</label>
                <span className="text-lg font-black text-slate-900">{crr.toFixed(1)}</span>
              </div>
              <input type="range" min={4} max={16} step={0.1} value={crr} onChange={e=>setCrr(+e.target.value)}
                className="w-full accent-amber-500 h-2 rounded-full"/>
              <div className="flex justify-between text-xs text-slate-400 mt-1">
                <span>4.0</span><span>16.0</span>
              </div>
            </div>
          </div>

          {/* Situation Summary */}
          <div className="mt-6 bg-slate-900 text-white rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <Zap size={14} className="text-amber-400"/>
              <span className="text-xs font-black text-slate-300 uppercase tracking-wider">Scenario</span>
            </div>
            <p className="text-sm font-bold text-white">{scenarioLabel()}</p>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-xs px-2 py-1 rounded-full bg-white/10 text-slate-300 font-bold">
                {PHASE_LABELS[phase]}
              </span>
              <span className={`text-xs px-2 py-1 rounded-full font-bold ${
                +rrr > 12 ? "bg-red-500/20 text-red-300" :
                +rrr > 9  ? "bg-amber-500/20 text-amber-300" :
                             "bg-emerald-500/20 text-emerald-300"
              }`}>
                RRR {rrr}
              </span>
            </div>
          </div>

          <button
            onClick={() => setSimulated(true)}
            className="mt-4 w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black py-3 rounded-xl transition-colors flex items-center justify-center gap-2">
            Find Best Players <ChevronRight size={18}/>
          </button>
        </div>

        {/* Results Panel */}
        <div>
          {!simulated ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-20 text-slate-400">
              <Target size={48} className="mb-4 opacity-30"/>
              <p className="font-bold text-lg">Set the scenario and click</p>
              <p className="text-sm">"Find Best Players" to see recommendations</p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-2 mb-4">
                <Award size={16} className="text-amber-500"/>
                <h3 className="text-sm font-black text-slate-700 uppercase tracking-widest">Recommended Players</h3>
                <span className="ml-auto text-xs text-slate-400 bg-slate-100 px-2 py-1 rounded-full">
                  Ranked by situation score
                </span>
              </div>
              {ranked.map((p, i) => {
                const roleColor = ROLE_COLORS[p.role] || "slate";
                return (
                  <div key={p.name} className={`bg-white border rounded-xl p-4 shadow-sm ${i===0?"border-amber-300 bg-amber-50/30":"border-slate-200"}`}>
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-black ${
                        i===0?"bg-amber-500 text-white":i===1?"bg-slate-400 text-white":i===2?"bg-orange-400 text-white":"bg-slate-100 text-slate-500"}`}>
                        {i+1}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-black text-slate-900">{p.name}</span>
                          <span className={`text-[10px] font-black border px-1.5 py-0.5 rounded text-${roleColor}-700 bg-${roleColor}-50 border-${roleColor}-200`}>
                            {p.role}
                          </span>
                          <span className="text-xs text-slate-400">{p.country}</span>
                        </div>
                        <div className="flex items-center gap-4 mt-1 text-xs text-slate-500">
                          <span>S/R <b className="text-slate-700">{p.profile.sr}</b></span>
                          <span>Avg <b className="text-slate-700">{p.profile.avgRuns}</b></span>
                          <span>Success <b className="text-emerald-600">{p.profile.successRate}%</b></span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-black text-indigo-600">{p.score}</div>
                        <div className="text-[10px] text-slate-400">Fit Score</div>
                      </div>
                    </div>
                    <div className="mt-3 text-xs bg-slate-50 rounded-lg px-3 py-2 text-slate-600 font-medium">
                      💡 {p.recommendation}
                    </div>
                  </div>
                );
              })}
              <button onClick={()=>setSimulated(false)}
                className="w-full text-center text-xs font-bold text-slate-400 hover:text-slate-600 py-2 transition-colors">
                Reset simulation
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
