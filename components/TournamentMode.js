"use client";
import React, { useState } from 'react';
import { Trophy, ChevronDown, Star } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const TOURNAMENTS = {
  "ICC T20 World Cup 2024": {
    winner: "India",
    runnerUp: "South Africa",
    topScorer: { name:"Rohit Sharma", runs:257, matches:8, avg:36.7 },
    topWickets: { name:"Arshdeep Singh", wickets:17, matches:8, eco:7.2 },
    standings: [
      { team:"India",        p:8, w:8, l:0, pts:16, nrr:"+2.42", flag:"🇮🇳" },
      { team:"South Africa", p:8, w:7, l:1, pts:14, nrr:"+2.14", flag:"🇿🇦" },
      { team:"Afghanistan",  p:8, w:5, l:3, pts:10, nrr:"+0.92", flag:"🇦🇫" },
      { team:"Australia",    p:8, w:5, l:3, pts:10, nrr:"+0.86", flag:"🇦🇺" },
      { team:"England",      p:8, w:4, l:4, pts: 8, nrr:"-0.22", flag:"🏴󠁧󠁢󠁥󠁮󠁧󠁿" },
      { team:"West Indies",  p:8, w:4, l:4, pts: 8, nrr:"-0.38", flag:"🏝" },
      { team:"Pakistan",     p:8, w:3, l:5, pts: 6, nrr:"-0.68", flag:"🇵🇰" },
      { team:"New Zealand",  p:8, w:2, l:6, pts: 4, nrr:"-1.04", flag:"🇳🇿" },
    ],
    topBatters: [
      { name:"Rohit Sharma",     country:"India",        runs:257, avg:36.7, sr:156 },
      { name:"Rahmanullah Gurbaz",country:"Afghanistan", runs:231, avg:38.5, sr:148 },
      { name:"Virat Kohli",      country:"India",        runs:226, avg:37.7, sr:134 },
      { name:"David Miller",     country:"S. Africa",    runs:201, avg:50.2, sr:145 },
      { name:"Nicholas Pooran",  country:"W. Indies",    runs:198, avg:28.3, sr:164 },
    ],
    topBowlers: [
      { name:"Arshdeep Singh",    country:"India",     wickets:17, avg:12.4, eco:7.2 },
      { name:"Fazalhaq Farooqi",  country:"Afghanistan",wickets:17, avg:11.8, eco:7.4 },
      { name:"Jasprit Bumrah",    country:"India",     wickets:15, avg:8.3,  eco:4.2 },
      { name:"Anrich Nortje",     country:"S. Africa", wickets:12, avg:16.2, eco:7.8 },
      { name:"Wanindu Hasaranga", country:"Sri Lanka", wickets:10, avg:17.5, eco:7.1 },
    ],
  },
  "ICC T20 World Cup 2022": {
    winner: "England",
    runnerUp: "Pakistan",
    topScorer: { name:"Virat Kohli", runs:296, matches:6, avg:98.6 },
    topWickets: { name:"Sam Curran", wickets:13, matches:6, eco:7.5 },
    standings: [
      { team:"England",      p:6, w:5, l:1, pts:10, nrr:"+2.12", flag:"🏴󠁧󠁢󠁥󠁮󠁧󠁿" },
      { team:"Pakistan",     p:6, w:4, l:2, pts: 8, nrr:"+1.44", flag:"🇵🇰" },
      { team:"India",        p:6, w:4, l:2, pts: 8, nrr:"+1.08", flag:"🇮🇳" },
      { team:"New Zealand",  p:6, w:4, l:2, pts: 8, nrr:"+0.66", flag:"🇳🇿" },
      { team:"Australia",    p:6, w:3, l:3, pts: 6, nrr:"-0.18", flag:"🇦🇺" },
      { team:"South Africa", p:6, w:3, l:3, pts: 6, nrr:"-0.28", flag:"🇿🇦" },
      { team:"Zimbabwe",     p:6, w:1, l:5, pts: 2, nrr:"-1.88", flag:"🇿🇼" },
      { team:"Netherlands",  p:6, w:0, l:6, pts: 0, nrr:"-2.64", flag:"🇳🇱" },
    ],
    topBatters: [
      { name:"Virat Kohli",      country:"India",       runs:296, avg:98.6, sr:136 },
      { name:"Jos Buttler",      country:"England",     runs:225, avg:37.5, sr:142 },
      { name:"Suryakumar Yadav", country:"India",       runs:239, avg:34.1, sr:189 },
      { name:"Alex Hales",       country:"England",     runs:212, avg:35.3, sr:148 },
      { name:"Rilee Rossouw",    country:"S. Africa",   runs:193, avg:38.6, sr:158 },
    ],
    topBowlers: [
      { name:"Sam Curran",       country:"England",     wickets:13, avg:11.2, eco:7.5 },
      { name:"Shaheen Afridi",   country:"Pakistan",    wickets:11, avg:14.8, eco:7.2 },
      { name:"Wanindu Hasaranga",country:"Sri Lanka",   wickets:11, avg:13.5, eco:7.0 },
      { name:"Mark Wood",        country:"England",     wickets:11, avg:14.2, eco:8.2 },
      { name:"Adil Rashid",      country:"England",     wickets: 9, avg:18.0, eco:7.1 },
    ],
  },
  "IPL 2024": {
    winner: "Kolkata Knight Riders",
    runnerUp: "Sunrisers Hyderabad",
    topScorer: { name:"Virat Kohli", runs:741, matches:15, avg:61.8 },
    topWickets: { name:"Harshal Patel", wickets:24, matches:14, eco:9.6 },
    standings: [
      { team:"KKR",   p:14, w:9, l:5, pts:20, nrr:"+0.98", flag:"💜" },
      { team:"SRH",   p:14, w:8, l:6, pts:18, nrr:"+0.64", flag:"🧡" },
      { team:"RCB",   p:14, w:7, l:7, pts:14, nrr:"+0.42", flag:"❤️" },
      { team:"RR",    p:14, w:8, l:6, pts:18, nrr:"+0.42", flag:"💗" },
      { team:"CSK",   p:14, w:7, l:7, pts:14, nrr:"+0.22", flag:"💛" },
      { team:"DC",    p:14, w:7, l:7, pts:14, nrr:"-0.12", flag:"💙" },
      { team:"GT",    p:14, w:5, l:9, pts:10, nrr:"-0.44", flag:"💙" },
      { team:"PBKS",  p:14, w:4, l:10,pts: 8, nrr:"-0.88", flag:"🔴" },
    ],
    topBatters: [
      { name:"Virat Kohli",         country:"RCB",  runs:741, avg:61.8, sr:155 },
      { name:"Travis Head",         country:"SRH",  runs:567, avg:40.5, sr:191 },
      { name:"Abhishek Sharma",     country:"SRH",  runs:484, avg:34.6, sr:204 },
      { name:"Jos Buttler",         country:"RR",   runs:432, avg:36.0, sr:148 },
      { name:"Sunil Narine",        country:"KKR",  runs:488, avg:40.7, sr:181 },
    ],
    topBowlers: [
      { name:"Harshal Patel",       country:"RCB",  wickets:24, avg:18.4, eco:9.6 },
      { name:"Jasprit Bumrah",      country:"MI",   wickets:20, avg:16.8, eco:6.7 },
      { name:"Varun Chakaravarthy", country:"KKR",  wickets:21, avg:18.2, eco:8.8 },
      { name:"Mitchell Starc",      country:"KKR",  wickets:17, avg:22.4, eco:9.2 },
      { name:"Arshdeep Singh",      country:"PBKS", wickets:17, avg:20.6, eco:9.4 },
    ],
  },
};

const TOURNAMENT_LIST = Object.keys(TOURNAMENTS);

export default function TournamentMode() {
  const [tournament, setTournament] = useState(TOURNAMENT_LIST[0]);
  const [batBowl, setBatBowl] = useState("bat");

  const t = TOURNAMENTS[tournament];
  const chartData = (batBowl === "bat" ? t.topBatters : t.topBowlers).map(p => ({
    name: p.name.split(" ").pop(),
    value: batBowl === "bat" ? p.runs : p.wickets,
    fullName: p.name,
  }));

  return (
    <div className="max-w-5xl mx-auto py-8 px-2">
      <div className="mb-8">
        <div className="inline-flex items-center gap-2 bg-amber-50 text-amber-700 px-4 py-2 rounded-full text-xs font-black uppercase tracking-widest border border-amber-100 mb-4">
          <Trophy size={14}/> Tournament Mode
        </div>
        <h2 className="text-3xl font-black text-slate-900 mb-1">Tournament Centre</h2>
        <p className="text-slate-500">Standings, top performers and key stats for major tournaments</p>
      </div>

      {/* Tournament selector */}
      <div className="relative w-fit mb-8">
        <select value={tournament} onChange={e=>setTournament(e.target.value)}
          className="appearance-none bg-white border border-slate-200 rounded-xl px-5 py-3 pr-10 text-sm font-black text-slate-700 shadow-sm focus:outline-none focus:border-amber-400 cursor-pointer">
          {TOURNAMENT_LIST.map(t=><option key={t}>{t}</option>)}
        </select>
        <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"/>
      </div>

      {/* Winner banner */}
      <div className="bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-2xl p-5 mb-6 flex items-center gap-4">
        <Trophy size={36} className="text-white/90 shrink-0"/>
        <div>
          <div className="text-xs font-black uppercase tracking-widest opacity-80">Tournament Winner</div>
          <div className="text-2xl font-black">{t.winner}</div>
          <div className="text-sm opacity-80">Runner-up: {t.runnerUp}</div>
        </div>
        <div className="ml-auto grid grid-cols-2 gap-4 text-center">
          <div className="bg-white/10 rounded-xl p-3">
            <div className="text-xl font-black">{t.topScorer.runs}</div>
            <div className="text-xs opacity-80">Top Scorer</div>
            <div className="text-xs font-bold mt-0.5">{t.topScorer.name.split(" ").pop()}</div>
          </div>
          <div className="bg-white/10 rounded-xl p-3">
            <div className="text-xl font-black">{t.topWickets.wickets}</div>
            <div className="text-xs opacity-80">Top Wickets</div>
            <div className="text-xs font-bold mt-0.5">{t.topWickets.name.split(" ").pop()}</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Standings */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100">
            <h3 className="text-sm font-black text-slate-700 uppercase tracking-widest">Points Table</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-xs font-black text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3 text-left">#</th>
                  <th className="px-4 py-3 text-left">Team</th>
                  <th className="px-4 py-3 text-center">P</th>
                  <th className="px-4 py-3 text-center">W</th>
                  <th className="px-4 py-3 text-center">L</th>
                  <th className="px-4 py-3 text-center">Pts</th>
                  <th className="px-4 py-3 text-center">NRR</th>
                </tr>
              </thead>
              <tbody>
                {t.standings.map((row, i) => (
                  <tr key={row.team} className={`border-b border-slate-50 hover:bg-slate-50 ${i < 4 ? "bg-emerald-50/20" : ""}`}>
                    <td className="px-4 py-3 text-center">
                      {i < 4 ? <span className="text-xs font-black text-emerald-600">Q</span>
                              : <span className="text-xs text-slate-400 font-mono">{i+1}</span>}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span>{row.flag}</span>
                        <span className="font-bold text-slate-800">{row.team}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center text-slate-500">{row.p}</td>
                    <td className="px-4 py-3 text-center font-bold text-emerald-600">{row.w}</td>
                    <td className="px-4 py-3 text-center font-bold text-red-400">{row.l}</td>
                    <td className="px-4 py-3 text-center font-black text-slate-900">{row.pts}</td>
                    <td className={`px-4 py-3 text-center text-xs font-bold ${row.nrr.startsWith("+")?"text-emerald-600":"text-red-500"}`}>{row.nrr}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-5 py-3 bg-emerald-50 border-t border-emerald-100">
            <p className="text-xs text-emerald-700 font-bold">Q = Qualified for knockouts</p>
          </div>
        </div>

        {/* Top performers */}
        <div className="space-y-5">
          {/* Chart */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-black text-slate-700 uppercase tracking-widest">Top Performers</h3>
              <div className="flex bg-slate-100 rounded-lg p-0.5">
                {["bat","bowl"].map(m=>(
                  <button key={m} onClick={()=>setBatBowl(m)}
                    className={`px-3 py-1.5 rounded-md text-xs font-black transition-all ${batBowl===m?"bg-white shadow text-slate-900":"text-slate-400"}`}>
                    {m==="bat"?"🏏 Runs":"⚡ Wkts"}
                  </button>
                ))}
              </div>
            </div>
            <div style={{height:200}}>
              <ResponsiveContainer>
                <BarChart data={chartData} margin={{top:0,right:0,left:-20,bottom:30}}>
                  <XAxis dataKey="name" tick={{fontSize:10,fill:"#64748b"}} axisLine={false} tickLine={false} angle={-25} textAnchor="end"/>
                  <YAxis tick={{fontSize:10,fill:"#94a3b8"}} axisLine={false} tickLine={false}/>
                  <Tooltip formatter={(v,_,p)=>[v, p.payload.fullName]}/>
                  <Bar dataKey="value" radius={[4,4,0,0]}>
                    {chartData.map((_,i)=><Cell key={i} fill={i===0?"#f59e0b":i===1?"#94a3b8":i===2?"#d97706":"#10b981"}/>)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100">
              <h3 className="text-sm font-black text-slate-700 uppercase tracking-widest">
                {batBowl==="bat"?"Top Run Scorers":"Top Wicket Takers"}
              </h3>
            </div>
            {(batBowl==="bat"?t.topBatters:t.topBowlers).map((p,i)=>(
              <div key={p.name} className="flex items-center gap-3 px-5 py-3 border-b border-slate-50 hover:bg-slate-50">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black ${
                  i===0?"bg-amber-500 text-white":i===1?"bg-slate-400 text-white":i===2?"bg-orange-400 text-white":"bg-slate-100 text-slate-500"}`}>
                  {i+1}
                </div>
                <div className="flex-1">
                  <div className="font-bold text-slate-800 text-sm">{p.name}</div>
                  <div className="text-xs text-slate-400">{p.country}</div>
                </div>
                <div className="text-right">
                  <div className="font-black text-slate-900">{batBowl==="bat"?p.runs:p.wickets}</div>
                  <div className="text-xs text-slate-400">{batBowl==="bat"?`SR: ${p.sr}`:`Eco: ${p.eco}`}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
