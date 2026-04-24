"use client";
import React, { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend } from 'recharts';
import { MapPin, TrendingUp, Shield, Zap } from 'lucide-react';

const PITCH_COLORS = {
  "Batting":        "#10b981",
  "Balanced":       "#22d3ee",
  "Spin-friendly":  "#f59e0b",
  "Spin-dominant":  "#f97316",
  "Pace-friendly":  "#3b82f6",
  "Seam-friendly":  "#6366f1",
  "Pace & Bounce":  "#8b5cf6",
};

function StatBar({ label, value, max = 100, color = "#10b981" }) {
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-slate-500 font-medium">{label}</span>
        <span className="font-black" style={{ color }}>{value}%</span>
      </div>
      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${(value/max)*100}%`, background: color }} />
      </div>
    </div>
  );
}

function VenueCard({ venue, onClick, selected }) {
  const pitchColor = PITCH_COLORS[venue.pitchType] || "#6366f1";
  return (
    <button
      onClick={() => onClick(venue)}
      className={`w-full text-left bg-white border-2 rounded-2xl p-5 transition-all hover:shadow-md ${
        selected ? "border-emerald-400 shadow-md shadow-emerald-100" : "border-slate-200 hover:border-slate-300"
      }`}
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="font-black text-slate-800 text-sm leading-tight">{venue.name}</h3>
          <div className="flex items-center gap-1 mt-1">
            <MapPin size={11} className="text-slate-400"/>
            <span className="text-xs text-slate-500">{venue.city}, {venue.country}</span>
          </div>
        </div>
        <span className="text-[10px] font-black px-2 py-1 rounded-lg border text-white" style={{ background: pitchColor }}>
          {venue.pitchType}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="bg-slate-50 rounded-lg p-2 text-center">
          <div className="font-black text-slate-900 text-lg">{venue.avg1st}</div>
          <div className="text-slate-400">Avg 1st</div>
        </div>
        <div className="bg-slate-50 rounded-lg p-2 text-center">
          <div className={`font-black text-lg ${venue.chaseWin > 50 ? "text-emerald-600" : "text-orange-500"}`}>{venue.chaseWin}%</div>
          <div className="text-slate-400">Chase Win</div>
        </div>
      </div>
    </button>
  );
}

export default function VenueIntelligence() {
  const [venues, setVenues] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);

  React.useEffect(() => {
    fetch('/api/t20/venue-intel')
      .then(r => r.json())
      .then(d => {
        setVenues(d.data || []);
        if (d.data && d.data.length > 0) {
          setSelected(d.data[0]);
        }
        setLoading(false);
      })
      .catch(e => {
        console.error(e);
        setLoading(false);
      });
  }, []);

  const paceSpinData = selected ? [
    { label: "Pace", value: selected.paceAdv, color: "#3b82f6" },
    { label: "Spin", value: selected.spinAdv, color: "#f59e0b" },
  ] : [];

  return (
    <div className="max-w-6xl mx-auto py-8 px-2">
      {/* Header */}
      <div className="mb-8">
        <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-700 px-4 py-2 rounded-full text-xs font-black uppercase tracking-widest border border-blue-100 mb-4">
          <MapPin size={14}/> Venue Intelligence
        </div>
        <h2 className="text-3xl font-black text-slate-900 mb-1">Ground Analysis</h2>
        <p className="text-slate-500">Pitch behaviour, toss impact, and historical performance by venue</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Venue list */}
        <div className="lg:col-span-1 space-y-3 max-h-[780px] overflow-y-auto pr-1 custom-scrollbar">
          {loading ? (
            <div className="text-center py-10 text-slate-400 font-bold uppercase tracking-widest text-xs animate-pulse">Loading venue data...</div>
          ) : venues.length === 0 ? (
            <div className="text-center py-10 text-slate-400 font-bold uppercase tracking-widest text-xs">No venue data available</div>
          ) : (
            venues.map(v => (
              <VenueCard key={v.name} venue={v} onClick={setSelected} selected={selected?.name === v.name}/>
            ))
          )}
        </div>

        {/* Detail panel */}
        {selected && (
        <div className="lg:col-span-2 space-y-5">
          {/* Headline */}
          <div className="bg-slate-900 text-white rounded-2xl p-6">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-xl font-black">{selected.name}</h3>
                <div className="flex items-center gap-2 mt-1">
                  <MapPin size={13} className="text-slate-400"/>
                  <span className="text-slate-400 text-sm">{selected.city}, {selected.country}</span>
                </div>
              </div>
              <span className="text-xs font-black px-3 py-1.5 rounded-full" style={{ background: PITCH_COLORS[selected.pitchType], color:"#fff" }}>
                {selected.pitchType}
              </span>
            </div>
            <div className="grid grid-cols-4 gap-4 mt-6">
              {[
                {label:"Avg 1st Inn",  value: selected.avg1st},
                {label:"Avg 2nd Inn",  value: selected.avg2nd},
                {label:"Chase Win %",  value: `${selected.chaseWin}%`},
                {label:"Avg Boundaries", value: selected.avgBoundaries},
              ].map(({label,value})=>(
                <div key={label} className="text-center">
                  <div className="text-2xl font-black text-emerald-400">{value}</div>
                  <div className="text-xs text-slate-400 mt-1">{label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Pace vs Spin */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <h4 className="text-sm font-black text-slate-700 uppercase tracking-widest mb-5">Pace vs Spin Effectiveness</h4>
            <div className="space-y-4">
              <StatBar label="Pace Wickets %" value={selected.paceAdv} color="#3b82f6"/>
              <StatBar label="Spin Wickets %" value={selected.spinAdv} color="#f59e0b"/>
            </div>
            <div className="mt-5" style={{height:140}}>
              <ResponsiveContainer>
                <BarChart data={paceSpinData} margin={{top:0,right:0,left:0,bottom:0}} barCategoryGap="40%">
                  <XAxis dataKey="label" tick={{fontSize:12,fill:"#64748b",fontWeight:700}} axisLine={false} tickLine={false}/>
                  <YAxis tick={{fontSize:10,fill:"#94a3b8"}} axisLine={false} tickLine={false} domain={[0,100]}/>
                  <Tooltip formatter={v=>`${v}%`}/>
                  <Bar dataKey="value" radius={[6,6,0,0]}>
                    {paceSpinData.map((d,i)=><Cell key={i} fill={d.color}/>)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Toss + Day/Night */}
          <div className="grid grid-cols-2 gap-5">
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
              <h4 className="text-sm font-black text-slate-700 uppercase tracking-widest mb-4">Toss Impact</h4>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600">Bat first wins</span>
                  <span className="font-black text-slate-900">{selected.tossWinBat}%</span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full" style={{width:`${selected.tossWinBat}%`}}/>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600">Chase wins</span>
                  <span className="font-black text-slate-900">{100-selected.tossWinBat}%</span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-indigo-500 rounded-full" style={{width:`${100-selected.tossWinBat}%`}}/>
                </div>
              </div>
              <p className="text-xs text-slate-400 mt-4 bg-slate-50 p-2 rounded-lg">
                {selected.tossWinBat > 50 ? "🏏 Batting first is advantageous here" : "🎯 Chasing is historically stronger at this venue"}
              </p>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
              <h4 className="text-sm font-black text-slate-700 uppercase tracking-widest mb-4">Key Records</h4>
              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between py-2 border-b border-slate-100">
                  <span className="text-slate-500">Top Batter</span>
                  <span className="font-black text-slate-800">{selected.topBatter}</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-slate-100">
                  <span className="text-slate-500">Top Bowler</span>
                  <span className="font-black text-slate-800">{selected.topBowler}</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-slate-100">
                  <span className="text-slate-500">Day matches</span>
                  <span className="font-black text-slate-800">{selected.dayNightSplit.day}%</span>
                </div>
                <div className="flex items-center justify-between py-2">
                  <span className="text-slate-500">Night matches</span>
                  <span className="font-black text-slate-800">{selected.dayNightSplit.night}%</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        )}
      </div>
    </div>
  );
}
