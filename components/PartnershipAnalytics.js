"use client";
import React, { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Users, TrendingUp } from 'lucide-react';

const PARTNERSHIPS = [
  { p1:"Rohit Sharma",   p2:"Virat Kohli",      team:"India",   runs:1877, innings:62, avg:31.3, highest:160, sr:138, phase:"Any",      winRate:72 },
  { p1:"Jos Buttler",    p2:"Alex Hales",        team:"England", runs:1072, innings:24, avg:47.5, highest:170, sr:165, phase:"Powerplay", winRate:79 },
  { p1:"Babar Azam",     p2:"Mohammad Rizwan",   team:"Pakistan",runs:2283, innings:75, avg:32.6, highest:203, sr:126, phase:"Any",       winRate:68 },
  { p1:"Suryakumar Yadav",p2:"Hardik Pandya",   team:"India",   runs: 876, innings:38, avg:23.7, highest: 95, sr:162, phase:"Death",     winRate:74 },
  { p1:"Travis Head",    p2:"David Warner",      team:"Australia",runs:1254,innings:42, avg:30.9, highest:144, sr:153, phase:"Powerplay", winRate:71 },
  { p1:"Devon Conway",   p2:"Finn Allen",        team:"N. Zealand",runs:698,innings:22, avg:33.2, highest:121, sr:144, phase:"Powerplay", winRate:68 },
  { p1:"Quinton de Kock",p2:"Temba Bavuma",      team:"S. Africa",runs:842, innings:31, avg:27.2, highest:115, sr:134, phase:"Any",       winRate:65 },
  { p1:"Gurbaz",         p2:"Ibrahim Zadran",    team:"Afghanistan",runs:768,innings:28,avg:28.4, highest:132, sr:141, phase:"Powerplay", winRate:64 },
];

const PHASE_DATA = [
  { phase:"Powerplay", avgRuns:54, avgSR:142, winImpact:68 },
  { phase:"Middle",    avgRuns:38, avgSR:128, winImpact:52 },
  { phase:"Death",     avgRuns:46, avgSR:172, winImpact:71 },
];

const TEAM_PAIRS = [
  { team:"India",    topPair:"Rohit-Kohli",    avgPartnership:42, pairsUsed:12 },
  { team:"Pakistan", topPair:"Babar-Rizwan",   avgPartnership:38, pairsUsed:8  },
  { team:"England",  topPair:"Buttler-Hales",  avgPartnership:44, pairsUsed:11 },
  { team:"Australia",topPair:"Head-Warner",    avgPartnership:36, pairsUsed:10 },
  { team:"S. Africa",topPair:"DeKock-Bavuma",  avgPartnership:32, pairsUsed:9  },
];

const COLORS = ["#10b981","#6366f1","#f59e0b","#ef4444","#8b5cf6","#3b82f6","#ec4899","#14b8a6"];

export default function PartnershipAnalytics() {
  const [tab, setTab] = useState("partnerships");
  const [sortK, setSortK] = useState("runs");
  const [sortD, setSortD] = useState("desc");

  const sorted = [...PARTNERSHIPS].sort((a, b) => {
    return sortD === "desc" ? b[sortK] - a[sortK] : a[sortK] - b[sortK];
  });

  function toggleSort(k) {
    if (sortK === k) setSortD(d => d === "asc" ? "desc" : "asc");
    else { setSortK(k); setSortD("desc"); }
  }

  const SortTh = ({ k, children }) => (
    <th onClick={() => toggleSort(k)}
      className={`px-4 py-3 text-center text-xs font-black uppercase tracking-wider cursor-pointer select-none whitespace-nowrap transition-colors ${sortK===k?"text-emerald-600":"text-slate-500 hover:text-slate-700"}`}>
      {children} {sortK===k&&(sortD==="desc"?"↓":"↑")}
    </th>
  );

  return (
    <div className="max-w-5xl mx-auto py-8 px-2">
      <div className="mb-8">
        <div className="inline-flex items-center gap-2 bg-teal-50 text-teal-700 px-4 py-2 rounded-full text-xs font-black uppercase tracking-widest border border-teal-100 mb-4">
          <Users size={14}/> Partnership Analytics
        </div>
        <h2 className="text-3xl font-black text-slate-900 mb-1">Partnership Analysis</h2>
        <p className="text-slate-500">Best T20I partnerships by runs, phase and win impact</p>
      </div>

      {/* Tab bar */}
      <div className="flex bg-slate-100 rounded-xl p-1 gap-1 w-fit mb-6">
        {[
          {k:"partnerships",l:"Top Pairs"},
          {k:"phase",l:"By Phase"},
          {k:"teams",l:"By Team"},
        ].map(({k,l})=>(
          <button key={k} onClick={()=>setTab(k)}
            className={`px-5 py-2.5 rounded-lg text-sm font-black transition-all ${tab===k?"bg-white shadow text-slate-900":"text-slate-500 hover:text-slate-700"}`}>
            {l}
          </button>
        ))}
      </div>

      {/* === TAB: PARTNERSHIPS === */}
      {tab === "partnerships" && (
        <div className="space-y-5">
          {/* Chart */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <h3 className="text-sm font-black text-slate-700 uppercase tracking-widest mb-4">Partnership Runs</h3>
            <div style={{height:220}}>
              <ResponsiveContainer>
                <BarChart data={sorted.map(p=>({name:`${p.p1.split(" ").pop()}-${p.p2.split(" ").pop()}`,runs:p.runs}))}
                  margin={{top:0,right:0,left:-10,bottom:40}}>
                  <XAxis dataKey="name" tick={{fontSize:9,fill:"#64748b"}} axisLine={false} tickLine={false} angle={-30} textAnchor="end"/>
                  <YAxis tick={{fontSize:10,fill:"#94a3b8"}} axisLine={false} tickLine={false}/>
                  <Tooltip/>
                  <Bar dataKey="runs" radius={[4,4,0,0]}>
                    {sorted.map((_,i)=><Cell key={i} fill={COLORS[i%COLORS.length]}/>)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-black text-slate-500 uppercase">#</th>
                    <th className="px-4 py-3 text-left text-xs font-black text-slate-500 uppercase">Partnership</th>
                    <th className="px-4 py-3 text-left text-xs font-black text-slate-500 uppercase">Team</th>
                    <SortTh k="runs">Runs</SortTh>
                    <SortTh k="innings">Inn</SortTh>
                    <SortTh k="avg">Avg</SortTh>
                    <SortTh k="highest">Best</SortTh>
                    <SortTh k="sr">S/R</SortTh>
                    <SortTh k="winRate">Win%</SortTh>
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((p,i)=>(
                    <tr key={`${p.p1}-${p.p2}`} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3.5 text-center">
                        {i===0?"🥇":i===1?"🥈":i===2?"🥉":<span className="text-xs text-slate-400">{i+1}</span>}
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="font-black text-slate-800 text-sm whitespace-nowrap">
                          {p.p1.split(" ").pop()} & {p.p2.split(" ").pop()}
                        </div>
                        <div className="text-xs text-slate-400">{p.p1} · {p.p2}</div>
                      </td>
                      <td className="px-4 py-3.5 text-slate-600 font-medium text-sm">{p.team}</td>
                      <td className="px-4 py-3.5 text-center font-black text-slate-900">{p.runs}</td>
                      <td className="px-4 py-3.5 text-center text-slate-500">{p.innings}</td>
                      <td className="px-4 py-3.5 text-center font-bold text-slate-700">{p.avg}</td>
                      <td className="px-4 py-3.5 text-center">
                        <span className="bg-emerald-100 text-emerald-700 font-black text-xs px-2 py-0.5 rounded-full">{p.highest}</span>
                      </td>
                      <td className="px-4 py-3.5 text-center font-bold text-indigo-600">{p.sr}</td>
                      <td className="px-4 py-3.5 text-center">
                        <span className={`text-xs font-black ${p.winRate>=70?"text-emerald-600":p.winRate>=60?"text-amber-600":"text-red-500"}`}>{p.winRate}%</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* === TAB: BY PHASE === */}
      {tab === "phase" && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {PHASE_DATA.map(ph=>(
            <div key={ph.phase} className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
              <h3 className="font-black text-slate-800 text-lg mb-1">{ph.phase}</h3>
              <p className="text-xs text-slate-500 mb-5">Avg partnership stats</p>
              <div className="space-y-4">
                <div className="bg-emerald-50 rounded-xl p-4 text-center">
                  <div className="text-3xl font-black text-emerald-600">{ph.avgRuns}</div>
                  <div className="text-xs text-slate-500 mt-1">Avg Runs / Partnership</div>
                </div>
                <div className="bg-indigo-50 rounded-xl p-4 text-center">
                  <div className="text-3xl font-black text-indigo-600">{ph.avgSR}</div>
                  <div className="text-xs text-slate-500 mt-1">Avg Strike Rate</div>
                </div>
                <div className="bg-amber-50 rounded-xl p-4 text-center">
                  <div className="text-3xl font-black text-amber-600">{ph.winImpact}%</div>
                  <div className="text-xs text-slate-500 mt-1">Team Win Rate when 50+ stand</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* === TAB: BY TEAM === */}
      {tab === "teams" && (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100">
            <h3 className="text-sm font-black text-slate-700 uppercase tracking-widest">Partnership Statistics by Country</h3>
          </div>
          {TEAM_PAIRS.map((t,i)=>(
            <div key={t.team} className="flex items-center gap-4 px-6 py-4 border-b border-slate-50 hover:bg-slate-50">
              <span className="text-xs font-mono text-slate-400 w-6 text-right">{i+1}</span>
              <div className="flex-1">
                <div className="font-black text-slate-800">{t.team}</div>
                <div className="text-xs text-slate-400 mt-0.5">Best pair: <span className="text-slate-600 font-bold">{t.topPair}</span></div>
              </div>
              <div className="text-center">
                <div className="text-lg font-black text-emerald-600">{t.avgPartnership}</div>
                <div className="text-xs text-slate-400">Avg runs</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-black text-indigo-600">{t.pairsUsed}</div>
                <div className="text-xs text-slate-400">Pairs used</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
