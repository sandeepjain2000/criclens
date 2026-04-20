"use client";

import React, { useState, useEffect } from 'react';
import { Trophy, Play, RefreshCw, Info } from 'lucide-react';

export default function T20RatingsPage() {
  const [batsmen, setBatsmen] = useState([]);
  const [bowlers, setBowlers] = useState([]);
  const [activeTab, setActiveTab] = useState('batsmen');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch('/api/rankings-t20?action=basic&minInnings=10')
      .then(r => r.json())
      .then(data => {
        setBatsmen(data.batsmen || []);
        setBowlers(data.bowlers || []);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  return (
    <div className="flex-1 overflow-y-auto p-8 custom-scrollbar" style={{ maxHeight: '100%' }}>
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-start justify-between pb-2">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Trophy size={26} className="text-cyan-600" />
              <h2 className="text-3xl font-black text-slate-900 m-0">T20 International Ratings</h2>
            </div>
            <p className="text-slate-500 text-base m-0" style={{ marginLeft: '2.25rem' }}>
              Player performance rankings across T20 Internationals
            </p>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-start gap-3">
            <Info size={18} className="shrink-0 mt-0.5 text-red-500" />
            <div>
              <p className="font-bold text-red-700 m-0">Error loading data</p>
              <p className="m-0 mt-1 text-sm text-red-600">{error}</p>
            </div>
          </div>
        )}

        {loading ? (
          <div className="py-12 text-center text-slate-400 animate-pulse">
            <p className="font-bold">Loading T20 ratings...</p>
          </div>
        ) : !batsmen.length && !bowlers.length ? (
          <div className="bg-cyan-50 border border-cyan-200 rounded-2xl p-6">
            <p className="text-slate-600 text-sm m-0">
              <span className="font-bold">No data available yet.</span> Please run the T20 downloader script on your machine to populate the database with T20 deliveries and player data. Once loaded, ratings will appear here.
            </p>
          </div>
        ) : (
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            {/* Tabs */}
            <div className="flex border-b border-slate-200">
              {[
                { id: 'batsmen', label: `🏏 Batsmen (${batsmen.length})` },
                { id: 'bowlers', label: `⚡ Bowlers (${bowlers.length})` }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 px-6 py-4 text-left transition-colors ${
                    activeTab === tab.id ? 'bg-cyan-50 border-b-2 border-cyan-600' : 'bg-white hover:bg-slate-50'
                  }`}
                  style={{ border: 'none', cursor: 'pointer' }}
                >
                  <span className={`font-black text-sm ${activeTab === tab.id ? 'text-slate-900' : 'text-slate-500'}`}>
                    {tab.label}
                  </span>
                </button>
              ))}
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-4 text-xs font-black text-slate-400 text-left">Rank</th>
                    <th className="px-6 py-4 text-xs font-black text-slate-400 text-left">Player</th>
                    <th className="px-6 py-4 text-xs font-black text-slate-400 text-center">Innings</th>
                    <th className="px-6 py-4 text-xs font-black text-slate-400 text-right">
                      {activeTab === 'batsmen' ? 'Runs/Inn' : 'Wkts/Inn'}
                    </th>
                    <th className="px-6 py-4 text-xs font-black text-slate-400 text-right">
                      {activeTab === 'batsmen' ? 'Total Runs' : 'Total Wkts'}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(activeTab === 'batsmen' ? batsmen : bowlers).map((player, idx) => (
                    <tr key={`${activeTab}-${idx}`} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 font-bold text-cyan-600">{idx + 1}</td>
                      <td className="px-6 py-4 font-semibold text-slate-800">{player.player_name}</td>
                      <td className="px-6 py-4 text-center font-mono text-slate-600">{player.innings}</td>
                      <td className="px-6 py-4 text-right font-mono font-bold text-slate-800">
                        {activeTab === 'batsmen'
                          ? (player.runs_per_innings || 0).toFixed(2)
                          : (player.wickets_per_innings || 0).toFixed(3)
                        }
                      </td>
                      <td className="px-6 py-4 text-right font-mono text-slate-600">
                        {activeTab === 'batsmen' ? player.total_runs : player.total_wickets}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
