"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { Search, Globe, Power, CheckCircle, XCircle } from 'lucide-react';

export default function PlayerManager() {
  const [profiles, setProfiles] = useState([]);
  const [countries, setCountries] = useState([]);
  const [country, setCountry] = useState('India');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(null);

  useEffect(() => {
    fetchProfiles(country);
  }, [country]);

  async function fetchProfiles(selectedCountry) {
    setLoading(true);
    try {
      const url = selectedCountry ? `/api/player-profiles?country=${encodeURIComponent(selectedCountry)}` : `/api/player-profiles`;
      const res = await fetch(url);
      const data = await res.json();
      if (!data.error) {
        setProfiles(data.profiles || []);
        if (data.countries && data.countries.length > 0 && countries.length === 0) {
          setCountries(data.countries);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  const filteredProfiles = useMemo(() => {
    if (!search) return profiles;
    const q = search.toLowerCase();
    return profiles.filter(p => p.player_name.toLowerCase().includes(q));
  }, [profiles, search]);

  async function toggleRetirement(playerName, currentStatus) {
    const newStatus = !currentStatus;
    setUpdating(playerName);
    
    // Optimistic update
    setProfiles(prev => prev.map(p => 
      p.player_name === playerName ? { ...p, is_retired: newStatus } : p
    ));

    try {
      const res = await fetch('/api/player-profiles', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ player_name: playerName, is_retired: newStatus }),
      });
      const data = await res.json();
      if (data.error) {
        // Revert on error
        setProfiles(prev => prev.map(p => 
          p.player_name === playerName ? { ...p, is_retired: currentStatus } : p
        ));
        alert('Failed to update: ' + data.error);
      }
    } catch (e) {
      // Revert on error
      setProfiles(prev => prev.map(p => 
        p.player_name === playerName ? { ...p, is_retired: currentStatus } : p
      ));
      alert('Failed to update status');
    } finally {
      setUpdating(null);
    }
  }

  return (
    <div className="max-w-5xl mx-auto py-10 px-4">
      <div className="mb-8">
        <h2 className="text-3xl font-black text-slate-900 mb-2 mt-0 flex items-center gap-3">
          <Power className="text-emerald-500" /> Player Retirement Manager
        </h2>
        <p className="text-slate-500 font-medium m-0">
          Manually update retirement status. This overrides automated filters to ensure accurate squad selections.
        </p>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm mb-6 flex items-center gap-4 flex-wrap">
        <div className="flex-1 min-w-[250px]">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1">
            <Globe size={10}/> Country Filter
          </label>
          <select 
            value={country} 
            onChange={(e) => setCountry(e.target.value)}
            className="w-full text-sm border-2 border-slate-200 rounded-lg px-3 py-2.5 bg-slate-50 text-slate-800 font-bold focus:outline-none focus:border-emerald-500 transition-colors"
          >
            <option value="">All Countries</option>
            {countries.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        <div className="flex-2 min-w-[300px]">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1">
            <Search size={10}/> Search Player
          </label>
          <input
            type="text"
            placeholder="Search by name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full text-sm border-2 border-slate-200 rounded-lg px-3 py-2.5 bg-slate-50 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-emerald-500 transition-colors"
          />
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400 font-bold animate-pulse">Loading players...</div>
        ) : filteredProfiles.length === 0 ? (
          <div className="p-12 text-center text-slate-500">No players found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase font-black text-slate-500 tracking-wider">
                <tr>
                  <th className="px-6 py-4">Player Name</th>
                  <th className="px-6 py-4">Nationality</th>
                  <th className="px-6 py-4 text-center">Status</th>
                  <th className="px-6 py-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredProfiles.map(p => (
                  <tr key={p.player_name} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 font-bold text-slate-800">
                      {p.player_name}
                    </td>
                    <td className="px-6 py-4 text-slate-500 font-medium">
                      {p.nationality || '—'}
                    </td>
                    <td className="px-6 py-4 text-center">
                      {p.is_retired ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-red-50 text-red-700 text-xs font-black">
                          <XCircle size={12}/> RETIRED
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-700 text-xs font-black">
                          <CheckCircle size={12}/> ACTIVE
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => toggleRetirement(p.player_name, p.is_retired)}
                        disabled={updating === p.player_name}
                        className={`text-xs font-bold px-4 py-2 rounded-lg transition-all ${
                          p.is_retired 
                            ? 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm' 
                            : 'bg-red-600 text-white hover:bg-red-700 shadow-sm'
                        } ${updating === p.player_name ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                      >
                        {updating === p.player_name ? 'Saving...' : (p.is_retired ? 'Mark Active' : 'Mark Retired')}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
