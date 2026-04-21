"use client";
import React, { useState, useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Eye, Zap, ChevronDown } from 'lucide-react';

const TEAMS = ["India","Pakistan","Australia","England","South Africa","New Zealand","West Indies","Sri Lanka","Bangladesh","Afghanistan"];
const VENUES = ["Wankhede (Mumbai)","MCG (Melbourne)","Lord's (London)","Dubai International","Eden Gardens (Kolkata)","Centurion","Pallekele (Kandy)","Adelaide Oval"];

const HEAD_TO_HEAD = {
  "India-Pakistan":       { t1Win:56, t2Win:44, avgScore:168, topRivalry:"Kohli vs Shaheen" },
  "India-Australia":      { t1Win:52, t2Win:48, avgScore:174, topRivalry:"SKY vs Cummins" },
  "India-England":        { t1Win:54, t2Win:46, avgScore:170, topRivalry:"Kohli vs Wood" },
  "Australia-England":    { t1Win:55, t2Win:45, avgScore:172, topRivalry:"Maxwell vs Archer" },
  "Pakistan-Australia":   { t1Win:48, t2Win:52, avgScore:166, topRivalry:"Babar vs Cummins" },
  "India-South Africa":   { t1Win:58, t2Win:42, avgScore:175, topRivalry:"Rohit vs Nortje" },
};

function getH2H(t1, t2) {
  const key1 = `${t1}-${t2}`, key2 = `${t2}-${t1}`;
  if (HEAD_TO_HEAD[key1]) return HEAD_TO_HEAD[key1];
  if (HEAD_TO_HEAD[key2]) {
    const h = HEAD_TO_HEAD[key2];
    return { t1Win: h.t2Win, t2Win: h.t1Win, avgScore: h.avgScore, topRivalry: h.topRivalry };
  }
  // Fallback: pseudo-random based on team names
  const seed = (t1.length * 7 + t2.length * 13) % 30;
  return { t1Win: 48 + seed % 10, t2Win: 52 - seed % 10, avgScore: 162 + seed, topRivalry: "Top matchup TBD" };
}

const PREDICTED_SCORERS = {
  India:       ["Virat Kohli","Rohit Sharma","Suryakumar Yadav","Hardik Pandya"],
  Pakistan:    ["Babar Azam","Mohammad Rizwan","Fakhar Zaman","Shadab Khan"],
  Australia:   ["Travis Head","Glenn Maxwell","David Warner","Marcus Stoinis"],
  England:     ["Jos Buttler","Liam Livingstone","Phil Salt","Sam Curran"],
  "South Africa": ["Quinton de Kock","David Miller","Rassie van der Dussen","Marco Jansen"],
  "New Zealand":  ["Devon Conway","Finn Allen","Glenn Phillips","Daryl Mitchell"],
  "West Indies":  ["Brandon King","Rovman Powell","Andre Russell","Nicholas Pooran"],
  "Sri Lanka":    ["Pathum Nissanka","Kusal Mendis","Charith Asalanka","Wanindu Hasaranga"],
  Bangladesh:  ["Litton Das","Shakib Al Hasan","Towhid Hridoy","Taskin Ahmed"],
  Afghanistan: ["Rahmanullah Gurbaz","Ibrahim Zadran","Rashid Khan","Azmatullah Omarzai"],
};

const PREDICTED_BOWLERS = {
  India:       ["Jasprit Bumrah","Mohammed Siraj","Axar Patel","Hardik Pandya"],
  Pakistan:    ["Shaheen Afridi","Haris Rauf","Naseem Shah","Shadab Khan"],
  Australia:   ["Pat Cummins","Mitchell Starc","Adam Zampa","Josh Hazlewood"],
  England:     ["Jofra Archer","Mark Wood","Adil Rashid","Sam Curran"],
  "South Africa": ["Kagiso Rabada","Anrich Nortje","Tabraiz Shamsi","Marco Jansen"],
  "New Zealand":  ["Trent Boult","Tim Southee","Ish Sodhi","Lockie Ferguson"],
  "West Indies":  ["Alzarri Joseph","Akeal Hosein","Andre Russell","Obed McCoy"],
  "Sri Lanka":    ["Dilshan Madushanka","Maheesh Theekshana","Wanindu Hasaranga","Dushmantha Chameera"],
  Bangladesh:  ["Taskin Ahmed","Shoriful Islam","Nasum Ahmed","Mustafizur Rahman"],
  Afghanistan: ["Fazalhaq Farooqi","Rashid Khan","Mujeeb Ur Rahman","Naveen-ul-Haq"],
};

const VENUE_BIAS = {
  "Wankhede (Mumbai)":        { t1Boost: 5, pitchNote:"High-scoring batting track, dew factor" },
  "MCG (Melbourne)":          { t1Boost: -2,pitchNote:"Pace-friendly, big boundaries" },
  "Lord's (London)":          { t1Boost: 4, pitchNote:"Seam movement early, good batting later" },
  "Dubai International":      { t1Boost: -3,pitchNote:"Slow and spin-friendly, dew critical" },
  "Eden Gardens (Kolkata)":   { t1Boost: 6, pitchNote:"Flat track, great atmosphere" },
  "Centurion":                { t1Boost: -1,pitchNote:"Pace and bounce, afternoon dew" },
  "Pallekele (Kandy)":        { t1Boost: -2,pitchNote:"Spin-dominant, humid conditions" },
  "Adelaide Oval":            { t1Boost: -1,pitchNote:"Day-night, pace bowlers benefit" },
};

const COLORS = ["#10b981","#ef4444"];

export default function PredictionEngine() {
  const [team1,   setTeam1]   = useState("India");
  const [team2,   setTeam2]   = useState("Australia");
  const [venue,   setVenue]   = useState("Wankhede (Mumbai)");
  const [toss,    setToss]    = useState("India bat");
  const [run,     setRun]     = useState(false);

  const prediction = useMemo(() => {
    if (!run) return null;
    const h2h  = getH2H(team1, team2);
    const vb   = VENUE_BIAS[venue] || {t1Boost:0, pitchNote:"Neutral conditions"};
    const tossBias = toss.includes(team1) && toss.includes("bat") ? 3 : toss.includes(team2) && toss.includes("bat") ? -3 : 0;
    let t1Win  = Math.min(82, Math.max(18, h2h.t1Win + vb.t1Boost + tossBias));
    let t2Win  = 100 - t1Win;
    const predictedScore = h2h.avgScore + Math.round(vb.t1Boost * 0.4);
    return {
      t1Win, t2Win, predictedScore, pitchNote: vb.pitchNote,
      topRivalry: h2h.topRivalry,
      t1Scorers: PREDICTED_SCORERS[team1]?.slice(0,3) || [],
      t2Scorers: PREDICTED_SCORERS[team2]?.slice(0,3) || [],
      t1Bowlers: PREDICTED_BOWLERS[team1]?.slice(0,2) || [],
      t2Bowlers: PREDICTED_BOWLERS[team2]?.slice(0,2) || [],
    };
  }, [run, team1, team2, venue, toss]);

  const TeamSelect = ({ value, onChange, exclude }) => (
    <div className="relative">
      <select value={value} onChange={e=>onChange(e.target.value)}
        className="appearance-none bg-white border border-slate-200 rounded-xl px-4 py-2.5 pr-8 text-sm font-bold text-slate-700 shadow-sm focus:outline-none focus:border-emerald-400 cursor-pointer">
        {TEAMS.filter(t=>t!==exclude).map(t=><option key={t}>{t}</option>)}
      </select>
      <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"/>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto py-8 px-2">
      <div className="mb-8">
        <div className="inline-flex items-center gap-2 bg-violet-50 text-violet-700 px-4 py-2 rounded-full text-xs font-black uppercase tracking-widest border border-violet-100 mb-4">
          <Eye size={14}/> Prediction Engine
        </div>
        <h2 className="text-3xl font-black text-slate-900 mb-1">Match Predictor</h2>
        <p className="text-slate-500">Win probability, predicted scorers and key matchups based on historical data</p>
      </div>

      {/* Setup */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <label className="block text-xs font-black text-slate-500 uppercase tracking-wider mb-2">Team 1</label>
            <TeamSelect value={team1} onChange={v=>{setTeam1(v);setRun(false);}} exclude={team2}/>
          </div>
          <div>
            <label className="block text-xs font-black text-slate-500 uppercase tracking-wider mb-2">Team 2</label>
            <TeamSelect value={team2} onChange={v=>{setTeam2(v);setRun(false);}} exclude={team1}/>
          </div>
          <div>
            <label className="block text-xs font-black text-slate-500 uppercase tracking-wider mb-2">Venue</label>
            <div className="relative">
              <select value={venue} onChange={e=>{setVenue(e.target.value);setRun(false);}}
                className="appearance-none bg-white border border-slate-200 rounded-xl px-4 py-2.5 pr-8 text-sm font-bold text-slate-700 shadow-sm focus:outline-none focus:border-emerald-400 cursor-pointer w-full">
                {VENUES.map(v=><option key={v}>{v}</option>)}
              </select>
              <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"/>
            </div>
          </div>
          <div>
            <label className="block text-xs font-black text-slate-500 uppercase tracking-wider mb-2">Toss Decision</label>
            <div className="flex gap-2 flex-wrap">
              {[`${team1} bat`,`${team1} bowl`,`${team2} bat`,`${team2} bowl`].map(t=>(
                <button key={t} onClick={()=>{setToss(t);setRun(false);}}
                  className={`text-xs font-bold px-3 py-2 rounded-lg border transition-all ${toss===t?"bg-emerald-600 text-white border-emerald-600":"bg-white text-slate-600 border-slate-200 hover:border-emerald-300"}`}>
                  {t}
                </button>
              ))}
            </div>
          </div>
        </div>
        <button onClick={()=>setRun(true)}
          className="w-full bg-violet-600 hover:bg-violet-700 text-white font-black py-3.5 rounded-xl transition-colors flex items-center justify-center gap-2 text-sm">
          <Zap size={16}/> Generate Prediction
        </button>
      </div>

      {/* Results */}
      {prediction && (
        <div className="space-y-5">
          {/* Win Probability */}
          <div className="bg-slate-900 text-white rounded-2xl p-6">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Win Probability</h3>
            <div className="flex items-center gap-6">
              <div style={{height:160,width:160,flexShrink:0}}>
                <ResponsiveContainer>
                  <PieChart>
                    <Pie data={[{v:prediction.t1Win},{v:prediction.t2Win}]} dataKey="v"
                      cx="50%" cy="50%" innerRadius={45} outerRadius={70} startAngle={90} endAngle={-270}>
                      <Cell fill="#10b981"/><Cell fill="#6366f1"/>
                    </Pie>
                    <Tooltip formatter={(v,_,p)=>p.dataIndex===0?[`${v}%`,team1]:[`${v}%`,team2]}/>
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex-1 space-y-4">
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="font-black text-emerald-400">{team1}</span>
                    <span className="font-black text-emerald-400">{prediction.t1Win}%</span>
                  </div>
                  <div className="h-3 bg-white/10 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full" style={{width:`${prediction.t1Win}%`}}/>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="font-black text-indigo-300">{team2}</span>
                    <span className="font-black text-indigo-300">{prediction.t2Win}%</span>
                  </div>
                  <div className="h-3 bg-white/10 rounded-full overflow-hidden">
                    <div className="h-full bg-indigo-400 rounded-full" style={{width:`${prediction.t2Win}%`}}/>
                  </div>
                </div>
                <div className="bg-white/5 rounded-xl p-3">
                  <div className="text-xs text-slate-400 mb-1">Predicted Score (1st inn)</div>
                  <div className="text-2xl font-black text-amber-400">{prediction.predictedScore}</div>
                  <div className="text-xs text-slate-400 mt-1">📍 {prediction.pitchNote}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Predicted Performers */}
          <div className="grid grid-cols-2 gap-5">
            {[
              { team:team1, scorers:prediction.t1Scorers, bowlers:prediction.t1Bowlers, color:"emerald" },
              { team:team2, scorers:prediction.t2Scorers, bowlers:prediction.t2Bowlers, color:"indigo" },
            ].map(({team,scorers,bowlers,color})=>(
              <div key={team} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                <h4 className={`font-black text-${color}-600 text-sm mb-4 border-b border-slate-100 pb-2`}>{team}</h4>
                <div className="mb-3">
                  <div className="text-xs font-black text-slate-400 uppercase tracking-wider mb-2">Top Scorers</div>
                  {scorers.map((n,i)=>(
                    <div key={n} className="flex items-center gap-2 py-1.5 border-b border-slate-50">
                      <span className="text-xs font-mono text-slate-400 w-4">{i+1}</span>
                      <span className="text-sm font-bold text-slate-700">{n}</span>
                    </div>
                  ))}
                </div>
                <div>
                  <div className="text-xs font-black text-slate-400 uppercase tracking-wider mb-2">Key Bowlers</div>
                  {bowlers.map((n,i)=>(
                    <div key={n} className="flex items-center gap-2 py-1.5">
                      <span className="text-xs font-mono text-slate-400 w-4">{i+1}</span>
                      <span className="text-sm font-bold text-slate-700">{n}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Key Matchup */}
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
            <div className="text-xs font-black text-amber-700 uppercase tracking-wider mb-2">⚔ Key Matchup to Watch</div>
            <p className="font-black text-slate-800 text-lg">{prediction.topRivalry}</p>
            <p className="text-sm text-slate-500 mt-1">Based on historical head-to-head data and current form</p>
          </div>

          <p className="text-xs text-center text-slate-400">
            ⚠ Predictions are based on historical T20I data and statistical models — not actual forecasts.
          </p>
        </div>
      )}
    </div>
  );
}
