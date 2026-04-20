"use client";

import React, { useState, useEffect } from 'react';
import { Shield, Play, X, RefreshCw, Info, TrendingUp } from 'lucide-react';

/**
 * LOI Team Ratings Page
 * Displays team-level ratings based on average player impact scores
 */
export default function LOITeamRatingsPage() {
  const [computing, setComputing] = useState(false);
  const [teamRatings, setTeamRatings] = useState([]);
  const [progress, setProgress] = useState(0);
  const [statusLog, setStatusLog] = useState([]);
  const [computed, setComputed] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Auto-load cached team ratings on mount
    fetch('/api/team-rankings-loi?action=load')
      .then(r => r.json())
      .then(data => {
        if (data.teamRatings) {
          setTeamRatings(data.teamRatings);
          setComputed(true);
        }
      })
      .catch(() => {});
  }, []);

  const handleCompute = () => {
    setComputing(true);
    setProgress(0);
    setStatusLog(['⏳ Starting team ratings computation…']);
    setTeamRatings([]);
    setError(null);
    setComputed(false);

    const url = '/api/team-rankings-loi?minInnings=10';
    const es = new EventSource(url);

    es.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.phase === 'status') {
        setProgress(data.progress ?? 0);
        setStatusLog(prev => [...prev.slice(-19), `  ${data.message}`]);
      } else if (data.phase === 'done') {
        setProgress(100);
        setStatusLog(prev => [...prev, `✅ ${data.message}`]);
        setTeamRatings(data.teamRatings ?? []);
        setComputed(true);
        setComputing(false);
        es.close();
      } else if (data.phase === 'error') {
        setError(data.message);
        setStatusLog(prev => [...prev, `❌ Error: ${data.message}`]);
        setComputing(false);
        es.close();
      }
    };

    es.onerror = () => {
      setError('Server connection lost.');
      setStatusLog(prev => [...prev, '❌ Connection lost.']);
      setComputing(false);
      es.close();
    };
  };

  const handleReset = () => {
    setComputed(false);
    setTeamRatings([]);
    setStatusLog([]);
    setError(null);
  };

  return (
    <div className="flex-1 overflow-y-auto p-8 custom-scrollbar" style={{ maxHeight: '100%' }}>
      <div className="max-w-6xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-start justify-between pb-2">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Shield size={26} className="text-orange-600" />
              <h2 className="text-3xl font-black text-slate-900 m-0">LOI Team Ratings</h2>
            </div>
            <p className="text-slate-500 text-base m-0" style={{ marginLeft: '2.25rem' }}>
              Team strength for Limited Overs Internationals based on average player impact scores.
            </p>
          </div>
          {computed && (
            <button
              onClick={handleReset}
              className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-800 border border-slate-200 px-4 py-2 rounded-lg bg-white transition-colors"
              style={{ cursor: 'pointer' }}
            >
              <RefreshCw size={14} /> Reset
            </button>
          )}
        </div>

        {/* Configuration Card */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="px-6 pb-6 pt-6">
            <div className="flex gap-3 items-end">
              <button
                onClick={handleCompute}
                disabled={computing}
                className="flex items-center justify-center gap-2 py-3 px-6 rounded-xl font-black text-sm"
                style={{ background: computing ? '#94a3b8' : '#ea580c', color: '#fff', border: 'none', cursor: computing ? 'not-allowed' : 'pointer' }}
              >
                {computing ? <><RefreshCw size={15} className="animate-spin" /> Computing…</> : <><Play size={15} /> Compute Team Ratings</>}
              </button>
            </div>

            {/* Progress + log */}
            {(computing || statusLog.length > 0) && (
              <div className="mt-6 bg-slate-50 border border-slate-200 rounded-2xl p-5">
                {computing && (
                  <div className="mb-3">
                    <div className="flex justify-between text-xs text-slate-500 mb-1.5">
                      <span className="font-bold">Running…</span>
                      <span className="font-mono">{progress}%</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                      <div className="h-2 rounded-full bg-orange-500 transition-all duration-500" style={{ width: `${Math.min(100, progress)}%` }} />
                    </div>
                  </div>
                )}
                <div className="font-mono text-xs text-slate-600 space-y-0.5 max-h-36 overflow-y-auto custom-scrollbar" style={{ lineHeight: '1.6' }}>
                  {statusLog.map((msg, i) => (
                    <div key={i} className={msg.startsWith('✅') ? 'text-orange-600 font-bold' : msg.startsWith('❌') ? 'text-red-500' : ''}>{msg}</div>
                  ))}
                </div>
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="mt-4 bg-red-50 border border-red-200 rounded-2xl p-5 flex items-start gap-3">
                <Info size={18} className="shrink-0 mt-0.5 text-red-500" />
                <div>
                  <p className="font-black text-red-700 m-0 text-sm">Computation Failed</p>
                  <p className="m-0 mt-1 font-medium text-red-600 text-sm">{error}</p>
                </div>
              </div>
            )}

            {/* Results Table */}
            {computed && teamRatings.length > 0 && (
              <div className="mt-6">
                <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                  <TrendingUp size={18} className="text-orange-600" />
                  Team Rankings
                </h3>
                <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
                  <table className="w-full text-sm border-collapse">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                        <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-slate-400 text-left">Rank</th>
                        <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-slate-400 text-left">Team</th>
                        <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-slate-400 text-center">Matches</th>
                        <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-slate-400 text-center">Batting Impact</th>
                        <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-slate-400 text-center">Bowling Impact</th>
                        <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-slate-400 text-center">Combined Score</th>
                        <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-slate-400 text-center">Last Active</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {teamRatings.map((team) => (
                        <tr key={team.team_name} className="hover:bg-slate-50 transition-colors">
                          <td className="px-6 py-4 text-center">
                            <span className={`font-black text-sm ${team.impact_rank <= 5 ? 'text-orange-600' : 'text-slate-500'}`}>
                              #{team.impact_rank}
                            </span>
                          </td>
                          <td className="px-6 py-4 font-semibold text-slate-800">{team.team_name}</td>
                          <td className="px-6 py-4 text-center font-mono text-slate-600">{team.matches_played}</td>
                          <td className="px-6 py-4 text-center font-mono font-bold text-orange-700">{team.batting_avg_impact.toFixed(4)}</td>
                          <td className="px-6 py-4 text-center font-mono font-bold text-orange-700">{team.bowling_avg_impact.toFixed(4)}</td>
                          <td className="px-6 py-4 text-center font-mono font-black text-base text-orange-700 bg-orange-50 rounded-lg">{team.combined_impact.toFixed(4)}</td>
                          <td className="px-6 py-4 text-center font-mono text-slate-600">{team.last_played}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
