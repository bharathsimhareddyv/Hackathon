import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../utils/api';
import CountdownTimer from '../../components/CountdownTimer';
import StatusBadge from '../../components/StatusBadge';
import { useAuth } from '../../context/AuthContext';
import { Users, UserCheck, Play, Pause, Square, RotateCcw, Clock, Award, FolderGit2, UploadCloud, History, KeyRound, Sparkles } from 'lucide-react';

export default function AdminDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const { showToast } = useAuth();

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const res = await api.get('/dashboard/admin');
      setData(res.data);
    } catch (err) {
      console.error('Fetch Admin Dashboard Error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handleRoundAction = async (roundId, action, extraPayload = {}) => {
    try {
      await api.post(`/rounds/${roundId}/${action}`, extraPayload);
      showToast(`Round action '${action.toUpperCase()}' successful!`, 'success');
      fetchDashboardData();
    } catch (err) {
      console.error('Round Action Error:', err);
      showToast(err.response?.data?.message || 'Failed to update round status', 'error');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-slate-400">
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <span>Loading Admin Control Center...</span>
        </div>
      </div>
    );
  }

  const { summary, rounds, activeRound, recentActivityLogs } = data || {};

  return (
    <div className="space-y-8">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white font-outfit">ADMIN CONTROL CENTER</h1>
          <p className="text-xs text-slate-400">Overview of team access, round timing, progress approvals, and results</p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            to="/admin/team-accounts"
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/20 transition-all flex items-center gap-1.5"
          >
            <Users className="w-3.5 h-3.5" />
            <span>Create team accounts</span>
          </Link>
          <Link
            to="/admin/team-accounts"
            className="px-4 py-2 rounded-xl bg-slate-800 border border-slate-700 hover:border-cyan-500 text-slate-200 font-bold text-xs transition-all flex items-center gap-1.5"
          >
            <KeyRound className="w-3.5 h-3.5 text-cyan-400" />
            <span>Manage credentials & emails</span>
          </Link>
        </div>
      </div>

      {/* SUMMARY STAT CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        
        <div className="glass-card p-5 rounded-2xl">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase font-mono">Team Accounts</span>
            <Users className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-3xl font-extrabold text-white font-outfit">{summary?.totalTeams || 0}</div>
          <div className="text-[11px] text-emerald-400 font-medium mt-1">{summary?.activeTeams || 0} Active</div>
        </div>

        <div className="glass-card p-5 rounded-2xl">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase font-mono">Awaiting Review</span>
            <UploadCloud className="w-4 h-4 text-amber-300" />
          </div>
          <div className="text-3xl font-extrabold text-amber-200 font-outfit">{summary?.pendingProgressClaims || 0}</div>
          <Link to="/admin/progress-claims" className="text-[11px] text-cyan-300 font-medium mt-1 inline-block">Review progress claims</Link>
        </div>

        <div className="glass-card p-5 rounded-2xl">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase font-mono">Round 1 Teams</span>
            <UserCheck className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-3xl font-extrabold text-indigo-300 font-outfit">{summary?.round1Teams || 0}</div>
          <div className="text-[11px] text-slate-400 font-medium mt-1">
            <strong className="text-emerald-400">{summary?.round1Qualified || 0}</strong> Qualified | <strong className="text-rose-400">{summary?.round1NotQualified || 0}</strong> Unqualified
          </div>
        </div>

        <div className="glass-card p-5 rounded-2xl">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase font-mono">Round 2 Teams</span>
            <FolderGit2 className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-3xl font-extrabold text-cyan-300 font-outfit">{summary?.round2Teams || 0}</div>
          <div className="text-[11px] text-emerald-400 font-medium mt-1">{summary?.round2Qualified || 0} Qualified</div>
        </div>

        <div className="glass-card p-5 rounded-2xl">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase font-mono">Round 3 Submissions</span>
            <UploadCloud className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-3xl font-extrabold text-emerald-400 font-outfit">{summary?.finalSubmissions || 0}</div>
          <div className="text-[11px] text-slate-400 font-medium mt-1">{summary?.round3Teams || 0} Final Teams</div>
        </div>

      </div>

      {/* LIVE ROUND MONITORING CARD */}
      <div className="glass-panel p-6 sm:p-8 rounded-3xl border-indigo-500/30">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 pb-6 border-b border-slate-800">
          <div>
            <span className="text-xs font-extrabold text-cyan-400 uppercase tracking-widest font-mono block mb-1">
              LIVE ROUND MONITORING & CONTROL
            </span>
            <h2 className="text-2xl font-bold text-white font-outfit">
              {activeRound ? activeRound.name : 'No Active Round'}
            </h2>
          </div>

          {activeRound && activeRound.status === 'ACTIVE' && (
            <div className="bg-slate-950 p-3 rounded-2xl border border-indigo-500/30 flex items-center gap-3">
              <CountdownTimer targetDate={activeRound.endAt} onExpire={fetchDashboardData} />
            </div>
          )}
        </div>

        {/* Round Status list and quick actions */}
        <div className="mt-6 space-y-4">
          {rounds && rounds.map((r) => (
            <div key={r._id} className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-800">
                    ROUND {r.roundNumber}
                  </span>
                  <span className="font-bold text-white text-sm font-outfit">{r.name}</span>
                  <StatusBadge status={r.status} />
                </div>
                <div className="text-xs text-slate-400 font-mono">
                  Start: {new Date(r.startAt).toLocaleString()} | End: {new Date(r.endAt).toLocaleString()}
                </div>
              </div>

              {/* Round Action buttons */}
              <div className="flex items-center gap-2 flex-wrap">
                {r.status !== 'ACTIVE' && (
                  <button
                    onClick={() => handleRoundAction(r._id, 'start')}
                    className="px-3 py-1.5 rounded-lg bg-emerald-950 border border-emerald-700 text-emerald-300 text-xs font-bold hover:bg-emerald-900 transition-all flex items-center gap-1"
                  >
                    <Play className="w-3.5 h-3.5 text-emerald-400" />
                    <span>START</span>
                  </button>
                )}

                {r.status === 'ACTIVE' && (
                  <button
                    onClick={() => handleRoundAction(r._id, 'pause')}
                    className="px-3 py-1.5 rounded-lg bg-amber-950 border border-amber-700 text-amber-300 text-xs font-bold hover:bg-amber-900 transition-all flex items-center gap-1"
                  >
                    <Pause className="w-3.5 h-3.5 text-amber-400" />
                    <span>PAUSE</span>
                  </button>
                )}

                {r.status !== 'CLOSED' && (
                  <button
                    onClick={() => handleRoundAction(r._id, 'close')}
                    className="px-3 py-1.5 rounded-lg bg-rose-950 border border-rose-700 text-rose-300 text-xs font-bold hover:bg-rose-900 transition-all flex items-center gap-1"
                  >
                    <Square className="w-3.5 h-3.5 text-rose-400" />
                    <span>CLOSE</span>
                  </button>
                )}

                <button
                  onClick={() => handleRoundAction(r._id, 'reopen', { minutesToExtend: 60 })}
                  className="px-3 py-1.5 rounded-lg bg-indigo-950 border border-indigo-700 text-indigo-300 text-xs font-bold hover:bg-indigo-900 transition-all flex items-center gap-1"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-indigo-400" />
                  <span>+60 MINS</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* RECENT ACTIVITY LOGS STREAM */}
      <div className="glass-panel p-6 rounded-3xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-cyan-400" />
            <h3 className="text-sm font-bold text-white font-outfit uppercase tracking-wider">
              RECENT SYSTEM ACTIVITY AUDIT LOGS
            </h3>
          </div>
          <Link to="/admin/logs" className="text-xs text-indigo-400 hover:underline">
            View All Logs →
          </Link>
        </div>

        {recentActivityLogs && recentActivityLogs.length > 0 ? (
          <div className="space-y-2">
            {recentActivityLogs.map(log => (
              <div key={log._id} className="p-3 rounded-xl bg-slate-950/80 border border-slate-800/80 flex items-center justify-between text-xs font-mono">
                <div className="flex items-center gap-3">
                  <span className="text-indigo-400 font-bold">[{log.actor}]</span>
                  <span className="text-cyan-300 uppercase">{log.action}</span>
                  <span className="text-slate-300">{log.details}</span>
                </div>
                <span className="text-slate-500 text-[10px]">
                  {new Date(log.timestamp).toLocaleTimeString()}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-xs text-slate-500 text-center py-4">No recent activity logs.</div>
        )}
      </div>

    </div>
  );
}
