import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import StatusBadge from '../components/StatusBadge';
import { Trophy, Medal, Award, EyeOff, Search } from 'lucide-react';

export default function LeaderboardPage() {
  const [leaderboard, setLeaderboard] = useState([]);
  const [isPublic, setIsPublic] = useState(true);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchLeaderboard = async () => {
    try {
      setLoading(true);
      const res = await api.get('/leaderboard');
      setIsPublic(res.data.public);
      setLeaderboard(res.data.leaderboard || []);
    } catch (err) {
      console.error('Fetch Leaderboard Error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  const filtered = leaderboard.filter(item => {
    const code = item.teamCode ? item.teamCode.toLowerCase() : '';
    const pids = item.participants ? item.participants.join(' ').toLowerCase() : '';
    const term = search.toLowerCase();
    return code.includes(term) || pids.includes(term);
  });

  return (
    <div className="min-h-screen flex flex-col bg-[#0B0F19]">
      <Navbar />

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-10 space-y-8">
        
        <div className="text-center max-w-3xl mx-auto">
          <div className="w-14 h-14 rounded-2xl bg-amber-950 border border-amber-500/40 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-amber-500/20">
            <Trophy className="w-7 h-7 text-amber-400" />
          </div>
          <h1 className="text-3xl sm:text-5xl font-extrabold text-white font-outfit">
            AAROHAN LEADERBOARD
          </h1>
          <p className="text-slate-400 text-sm mt-2">
            Live evaluation rankings accumulated across Round 1, Round 2, and Round 3.
          </p>
        </div>

        {!isPublic ? (
          <div className="glass-panel p-12 rounded-3xl text-center max-w-lg mx-auto">
            <EyeOff className="w-12 h-12 text-amber-400 mx-auto mb-3" />
            <h3 className="text-xl font-bold text-white font-outfit">Leaderboard is Hidden</h3>
            <p className="text-slate-400 text-sm mt-2">
              The Admin has temporarily made the public leaderboard private during evaluation. Please check back later.
            </p>
          </div>
        ) : (
          <div className="glass-panel p-6 sm:p-8 rounded-3xl space-y-6">
            
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="relative w-full sm:w-80">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search team code or Arohan ID..."
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl glass-input text-xs"
                />
              </div>

              <div className="text-xs text-slate-400 font-mono">
                Total Ranked Teams: <strong className="text-cyan-400">{filtered.length}</strong>
              </div>
            </div>

            {loading ? (
              <div className="text-center py-12 text-slate-400">Loading live rankings...</div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-12 text-slate-500 text-sm">
                No evaluation rankings available yet. Once Admin completes evaluations, team scores will appear here.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-950/80 text-slate-400 uppercase font-mono tracking-wider text-[11px] border-b border-slate-800">
                    <tr>
                      <th className="py-3.5 px-4 font-semibold">Rank</th>
                      <th className="py-3.5 px-4 font-semibold">Team Code</th>
                      <th className="py-3.5 px-4 font-semibold">Participants</th>
                      <th className="py-3.5 px-4 font-semibold text-center">Round 1</th>
                      <th className="py-3.5 px-4 font-semibold text-center">Round 2</th>
                      <th className="py-3.5 px-4 font-semibold text-center">Round 3</th>
                      <th className="py-3.5 px-4 font-semibold text-right">Total Marks</th>
                      <th className="py-3.5 px-4 font-semibold text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-sans">
                    {filtered.map((item) => (
                      <tr key={item.rank} className="hover:bg-slate-900/60 transition-colors">
                        <td className="py-4 px-4 font-bold font-mono">
                          {item.rank === 1 ? (
                            <span className="inline-flex items-center gap-1 text-amber-400 glow-amber font-outfit text-sm">
                              🥇 #1
                            </span>
                          ) : item.rank === 2 ? (
                            <span className="inline-flex items-center gap-1 text-slate-300 font-outfit text-sm">
                              🥈 #2
                            </span>
                          ) : item.rank === 3 ? (
                            <span className="inline-flex items-center gap-1 text-amber-600 font-outfit text-sm">
                              🥉 #3
                            </span>
                          ) : (
                            <span className="text-slate-400">#{item.rank}</span>
                          )}
                        </td>

                        <td className="py-4 px-4 font-mono font-bold text-indigo-300">
                          {item.teamCode}
                        </td>

                        <td className="py-4 px-4 font-mono">
                          <div className="flex flex-wrap gap-1">
                            {item.participants.map(pid => (
                              <span key={pid} className="px-2 py-0.5 rounded bg-slate-900 text-slate-300 text-[11px] border border-slate-800">
                                {pid}
                              </span>
                            ))}
                          </div>
                        </td>

                        <td className="py-4 px-4 text-center font-mono font-semibold text-cyan-300">
                          {item.round1Marks}
                        </td>

                        <td className="py-4 px-4 text-center font-mono font-semibold text-indigo-300">
                          {item.round2Marks}
                        </td>

                        <td className="py-4 px-4 text-center font-mono font-semibold text-emerald-300">
                          {item.round3Marks}
                        </td>

                        <td className="py-4 px-4 text-right font-mono font-extrabold text-amber-400 text-sm">
                          {item.totalMarks}
                        </td>

                        <td className="py-4 px-4 text-center">
                          <StatusBadge status={item.finalStatus} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

          </div>
        )}

      </main>

      <Footer />
    </div>
  );
}
