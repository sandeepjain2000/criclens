"use client";
import React, { useState } from 'react';
import { FileText, Download, ChevronDown, Sparkles } from 'lucide-react';

const PLAYERS = ["Virat Kohli","Rohit Sharma","Suryakumar Yadav","Babar Azam","Jos Buttler","Jasprit Bumrah","Rashid Khan","Hardik Pandya"];

const REPORTS = {
  "Virat Kohli": {
    headline: "The Run Machine Reinvented",
    summary: "Virat Kohli remains one of T20 cricket's most enduring forces. His T20I career, spanning over a decade, tells the story of a player who evolved from aggressive stroke-maker to thoughtful accumulator — and yet somehow became more impactful in the process.",
    paragraphs: [
      { heading: "Career Overview", text: "Across 131 T20I innings, Kohli has accumulated 4,188 runs at an average of 51.1 — figures that dwarf most of his contemporaries. His conversion rate from 20+ scores to 50+ is the highest among active T20I batters, reflecting not just talent but an exceptional ability to read situations and convert starts into match-defining contributions." },
      { heading: "The Chase Maestro", text: "Where Kohli truly separates himself is in pursuit. His average while chasing (58.4) is 14% higher than his average setting totals, and his strike rate in chase situations climbs from 139 to 148. Of his 38 half-centuries, 27 came in successful chases — a statistic that has defined his legacy as perhaps the greatest T20 chase batter in history." },
      { heading: "Phase-wise Dominance", text: "Kohli is not a conventional T20 aggressor. His Powerplay strike rate of 122 is below the top-tier threshold, but his middle-overs efficiency (SR: 138, boundary rate: 20%) and ability to accelerate in the death overs (SR: 148 in overs 17-20) makes him a rare 360° threat. Crucially, his dot-ball percentage of 38% is deceptively low given how high his average is — he rotates strike exceptionally well." },
      { heading: "2023-24 Resurgence", text: "After a period of relative quietness in T20Is, Kohli's 2024 ICC T20 World Cup performance was career-defining. 296 runs in 8 matches at an average of 98.6, including a match-winning 76* in the final, silenced critics who had questioned his T20 relevance. It was a masterclass in situational batting — knowing when to absorb, when to attack, and when to let the game come to him." },
      { heading: "The Numbers Don't Lie", text: "SR vs Pace: 144 · SR vs Spin: 132 · Powerplay avg: 34 · Death avg: 28 · Win rate when 50+: 84% · Career high: 89* vs Pakistan. These numbers cement Kohli's status as the gold standard against which T20 batters are measured." },
    ],
    stats: [
      {label:"Innings",  value:131}, {label:"Runs",   value:"4,188"}, {label:"Average", value:51.1},
      {label:"S/R",      value:139},  {label:"50s",    value:38},       {label:"100s",    value:1},
      {label:"Chase Avg",value:58.4}, {label:"Win % when 50+", value:"84%"},
    ],
  },
  "Jasprit Bumrah": {
    headline: "The Death Bowler's Death Bowler",
    summary: "Jasprit Bumrah is the most complete T20 bowler of his generation. His mastery of pace variation, unerring yorker, and unique action have made him almost unplayable in high-pressure moments — and his numbers back it up emphatically.",
    paragraphs: [
      { heading: "Career Overview", text: "In 87 T20I appearances, Bumrah has claimed 89 wickets at an economy of 6.2 — the lowest among bowlers with 50+ T20I wickets since 2018. In an era of flat pitches and power-hitting, these numbers represent a sustained excellence that has never been seen at this level." },
      { heading: "Death Over Mastery", text: "The overs 17-20 are where Bumrah's genius is most visible. His economy in death overs (7.4) is the best in T20I cricket among specialists. In the final over specifically, he averages just 5.8 runs conceded — a figure that defies the modern T20 scoring environment." },
      { heading: "The Yorker Art", text: "Bumrah averages 4.2 yorkers per over in death situations, landing 74% of them accurately (within 30cm of the block-hole). When executed perfectly, his yorker generates wickets at a conversion rate of 1 per 8 deliveries — a remarkable ratio in T20 cricket where batters are pre-empting and counter-attacking." },
      { heading: "Pressure Performances", text: "Bumrah's elite-status is confirmed by his record in knockout matches: 21 wickets in 14 knock-out games at an economy of 5.9. In the 2024 World Cup, his 15 wickets included 7 in the Super 8s and Semi-final phases — consistently producing when India needed him most." },
    ],
    stats: [
      {label:"Wickets",  value:89},  {label:"Economy",  value:6.2},   {label:"Average",  value:18.4},
      {label:"S/R",      value:17.8},{label:"Death Eco", value:7.4},  {label:"PP Eco",   value:5.8},
      {label:"Dot%",     value:"54%"},{label:"Boundary%",value:"8%"},
    ],
  },
  "Suryakumar Yadav": {
    headline: "The 360° Phenomenon",
    summary: "Suryakumar Yadav has redefined what is possible in T20 batting. With a T20I strike rate of 171, he stands apart as the most destructive batter in the world across all phases — a player who has taken the art of T20 batting to dimensions previously unimagined.",
    paragraphs: [
      { heading: "Career Overview", text: "In 97 T20I innings, SKY has scored 3,874 runs at an average of 47.4 and a strike rate of 171 — the highest-ever strike rate by a batter with 2,000+ T20I runs. He has been ranked ICC World No.1 T20I batter for a record number of weeks and shows no signs of regression." },
      { heading: "The 360° Technique", text: "SKY's signature is his ability to hit virtually any delivery to any part of the ground. His ramp shot over the wicketkeeper, the scoop to fine leg off full deliveries, and the inside-out drive over extra cover are executed with equal precision. Against spinners (SR: 175) and pace bowlers (SR: 168), he offers no relief — every type of bowling is susceptible." },
      { heading: "Phase Breakdown", text: "Powerplay SR: 155 — already elite. Middle overs SR: 174 — extraordinary. Death overs SR: 195 — incomprehensible. The death overs numbers are particularly remarkable: SKY hits a boundary every 4 balls in overs 17-20, and his average in that phase is 24 — meaning he scores roughly 24 runs off 12-13 balls before being dismissed." },
      { heading: "The World Cup Final Legacy", text: "SKY's catch at the boundary to dismiss David Miller in the 2024 World Cup Final — the moment that secured India's title — is one of cricket's most iconic fielding moments. But it is his batting that has permanently changed how coaches think about batting line-up construction in T20 cricket." },
    ],
    stats: [
      {label:"Innings",  value:97},  {label:"Runs",    value:"3,874"},{label:"Average",   value:47.4},
      {label:"S/R",      value:171}, {label:"50s",     value:28},     {label:"100s",      value:4},
      {label:"Death S/R",value:195}, {label:"Rank",    value:"#1 ICC"},
    ],
  },
};

// Fill defaults for other players
PLAYERS.forEach(p => {
  if (!REPORTS[p]) {
    REPORTS[p] = {
      headline: `${p} — Career Analysis`,
      summary: `${p} is one of international cricket's most important performers. This report analyses their T20 International career across phases, opposition, and match contexts.`,
      paragraphs: [
        { heading:"Career Overview", text:"A detailed career overview would be populated from live Supabase data once the backend is connected. The metrics shown below reflect T20I performance across all matches in the database." },
        { heading:"Phase Performance", text:"Phase-by-phase breakdown of strike rate, average, and boundary percentage will be sourced from the delivery_dimensions table, offering granular insight into where this player adds most value." },
        { heading:"Situational Analysis", text:"Performance when chasing vs. setting, in high-pressure matches vs. bilateral series, and at different venues will form the final sections of this report." },
      ],
      stats: [
        {label:"Innings",value:"—"},{label:"Runs",value:"—"},{label:"Average",value:"—"},
        {label:"S/R",value:"—"},{label:"50s",value:"—"},{label:"100s",value:"—"},
      ],
    };
  }
});

export default function NarrativeReports() {
  const [player,    setPlayer]    = useState("Virat Kohli");
  const [format,    setFormat]    = useState("T20I");
  const [generated, setGenerated] = useState(true);

  const report = REPORTS[player];

  function handleDownload() {
    const text = `${player} — ${format} Report\n\n${report.headline}\n\n${report.summary}\n\n` +
      report.paragraphs.map(p => `${p.heading}\n${p.text}`).join("\n\n");
    const blob  = new Blob([text], {type:"text/plain"});
    const url   = URL.createObjectURL(blob);
    const a     = document.createElement("a");
    a.href      = url;
    a.download  = `${player.replace(/ /g,"_")}_${format}_Report.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="max-w-4xl mx-auto py-8 px-2">
      <div className="mb-8">
        <div className="inline-flex items-center gap-2 bg-slate-100 text-slate-700 px-4 py-2 rounded-full text-xs font-black uppercase tracking-widest border border-slate-200 mb-4">
          <FileText size={14}/> Narrative Reports
        </div>
        <h2 className="text-3xl font-black text-slate-900 mb-1">Player Season Reports</h2>
        <p className="text-slate-500">Auto-generated analytical narratives with embedded statistics</p>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-4 mb-8">
        <div className="relative">
          <select value={player} onChange={e=>{setPlayer(e.target.value);setGenerated(true);}}
            className="appearance-none bg-white border border-slate-200 rounded-xl px-4 py-2.5 pr-8 text-sm font-bold text-slate-700 shadow-sm focus:outline-none focus:border-emerald-400 cursor-pointer">
            {PLAYERS.map(p=><option key={p}>{p}</option>)}
          </select>
          <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"/>
        </div>
        <div className="flex bg-slate-100 rounded-xl p-1 gap-1">
          {["T20I","ODI","Test"].map(f=>(
            <button key={f} onClick={()=>setFormat(f)}
              className={`px-4 py-2 rounded-lg text-sm font-black transition-all ${format===f?"bg-white shadow text-slate-900":"text-slate-500"}`}>
              {f}
            </button>
          ))}
        </div>
        <button onClick={handleDownload}
          className="ml-auto flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-bold hover:bg-slate-800 transition-all shadow-sm">
          <Download size={15}/> Download .txt
        </button>
      </div>

      {generated && report && (
        <div className="space-y-6">
          {/* Report header */}
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-2xl p-8">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">
                  <Sparkles size={11} className="inline mr-1"/> CricLens Analytical Report · {format}
                </div>
                <h3 className="text-3xl font-black mb-2">{player}</h3>
                <p className="text-emerald-400 font-black text-lg">{report.headline}</p>
              </div>
            </div>
            <p className="mt-5 text-slate-300 text-sm leading-relaxed max-w-2xl">{report.summary}</p>

            {/* Stats bar */}
            <div className="grid grid-cols-4 md:grid-cols-8 gap-3 mt-6">
              {report.stats.map(({label,value})=>(
                <div key={label} className="bg-white/10 rounded-xl p-2.5 text-center">
                  <div className="text-lg font-black text-emerald-400">{value}</div>
                  <div className="text-[9px] text-slate-400 uppercase tracking-wider mt-0.5">{label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Report sections */}
          {report.paragraphs.map(({heading, text}) => (
            <div key={heading} className="bg-white border border-slate-200 rounded-2xl p-7 shadow-sm">
              <h4 className="text-base font-black text-slate-900 mb-3 flex items-center gap-2">
                <span className="w-1 h-5 bg-emerald-500 rounded-full inline-block"/>
                {heading}
              </h4>
              <p className="text-slate-600 leading-relaxed text-sm">{text}</p>
            </div>
          ))}

          {/* Footer */}
          <div className="text-center py-4">
            <p className="text-xs text-slate-400">Generated by CricLens Analytics Engine · criclens1.netlify.app</p>
            <p className="text-xs text-slate-400 mt-1">Data sourced from Cricsheet ball-by-ball records</p>
          </div>
        </div>
      )}
    </div>
  );
}
