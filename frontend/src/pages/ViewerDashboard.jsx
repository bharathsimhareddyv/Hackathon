import React, { useCallback, useEffect, useState } from 'react';
import { LogOut, RefreshCw, Trophy } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';

const statusStyle = status => ({
  QUALIFIED: 'text-emerald-300',
  APPROVED: 'text-emerald-300',
  EVALUATED: 'text-cyan-300',
  PENDING: 'text-amber-300',
  REJECTED: 'text-rose-300',
  NOT_QUALIFIED: 'text-rose-300',
  SUBMITTED: 'text-indigo-300',
  NOT_STARTED: 'text-slate-500'
}[status] || 'text-slate-300');

export default function ViewerDashboard() {
  const { user, logout, showToast } = useAuth();
  const navigate = useNavigate();
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get('/viewers/dashboard');
      setDashboard(response.data);
    } catch (error) {
      showToast(error.response?.data?.message || 'Could not load viewer dashboard', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    let active = true;
    api.get('/viewers/dashboard').then(response => {
      if (active) setDashboard(response.data);
    }).catch(error => {
      if (active) showToast(error.response?.data?.message || 'Could not load viewer dashboard', 'error');
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, [showToast]);

  const handleLogout = () => {
    logout();
    navigate('/viewer-login');
  };

  return <main className="min-h-screen bg-[#0B0F19] px-4 py-6 text-slate-100 sm:px-6 lg:px-10">
    <div className="mx-auto max-w-7xl space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-cyan-500/20 bg-slate-950/70 p-5">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-cyan-300">AAROHAN · Viewer workspace</p>
          <h1 className="mt-1 font-outfit text-3xl font-extrabold text-white">Welcome, {dashboard?.viewer?.name || user?.name}</h1>
          <p className="mt-1 text-sm text-slate-400">Read-only view · {dashboard?.branchScope === 'all' ? 'all branches' : 'selected branches'}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={refresh} disabled={loading} className="inline-flex items-center gap-2 rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-200 hover:border-cyan-700 disabled:opacity-50"><RefreshCw className="h-4 w-4" />Refresh</button>
          <button onClick={handleLogout} className="inline-flex items-center gap-2 rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-200 hover:border-rose-700"><LogOut className="h-4 w-4" />Logout</button>
        </div>
      </header>
      {loading && <p className="text-sm text-slate-400">Loading assigned rounds and branch progress…</p>}
      {!loading && dashboard?.rounds.map(round => <section key={round.roundNumber} className="space-y-4 rounded-2xl border border-slate-800 bg-slate-950/50 p-4 sm:p-6">
        <header className="flex flex-wrap items-start justify-between gap-3">
          <div><p className="text-xs font-bold uppercase tracking-widest text-cyan-300">Round {round.roundNumber} · {round.status}</p><h2 className="mt-1 text-2xl font-bold text-white">{round.name}</h2><p className="mt-1 text-xs text-slate-500">{round.startAt ? new Date(round.startAt).toLocaleString() : 'Start not set'} – {round.endAt ? new Date(round.endAt).toLocaleString() : 'End not set'}</p></div>
          {round.highestBranch && <div className="flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-950/20 px-4 py-3"><Trophy className="h-5 w-5 text-amber-300" /><div><p className="text-[10px] uppercase tracking-wider text-amber-200/70">Highest branch average</p><p className="font-bold text-amber-100">{round.highestBranch.branchName} · {round.highestBranch.averageScorePercent}%</p></div></div>}
        </header>

        {round.branchStatistics && <div className="overflow-x-auto rounded-xl border border-slate-800">
          <table className="w-full min-w-[680px] text-left text-sm">
            <thead className="bg-slate-900/80 text-xs uppercase tracking-wider text-slate-500"><tr><th className="p-3">Branch</th><th className="p-3">Teams</th><th className="p-3">Students</th><th className="p-3">Submitted</th><th className="p-3">Evaluated</th><th className="p-3">Qualified</th>{round.branchStatistics.some(branch => 'averageScorePercent' in branch) && <><th className="p-3">Avg score</th><th className="p-3">Qualified %</th></>}</tr></thead>
            <tbody className="divide-y divide-slate-800">{round.branchStatistics.map(branch => <tr key={branch.branchName}>
              <td className="p-3 font-semibold text-white">{branch.branchName}</td><td className="p-3">{branch.teams}</td><td className="p-3">{branch.students}</td><td className="p-3">{branch.submittedTeams}</td><td className="p-3">{branch.evaluatedTeams}</td><td className="p-3">{branch.qualifiedTeams}</td>
              {'averageScorePercent' in branch && <><td className="p-3">{branch.averageScorePercent === null ? '—' : `${branch.averageScorePercent}% (${branch.averageMarks})`}</td><td className="p-3">{branch.qualificationRate === null ? '—' : `${branch.qualificationRate}%`}</td></>}
            </tr>)}</tbody>
          </table>
          <div className="space-y-3 border-t border-slate-800 p-4">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Branch progress comparison</p>
            {round.branchStatistics.map(branch => {
              const ratio = branch.teams ? Math.round(branch.submittedTeams / branch.teams * 100) : 0;
              const average = branch.averageScorePercent;
              return <div key={`${branch.branchName}-chart`}>
                <div className="mb-1 flex justify-between gap-3 text-xs"><span className="text-slate-300">{branch.branchName}</span><span className="text-slate-500">{average === undefined ? `${ratio}% submitted` : `${average === null ? 'No marks yet' : `${average}% average`} · ${ratio}% submitted`}</span></div>
                <div className="h-2 overflow-hidden rounded-full bg-slate-800" role="progressbar" aria-label={`${branch.branchName} round progress`} aria-valuenow={average ?? ratio} aria-valuemin="0" aria-valuemax="100"><div className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-indigo-400" style={{ width: `${Math.min(100, Math.max(0, average ?? ratio))}%` }} /></div>
              </div>;
            })}
          </div>
        </div>}

        {round.teams && <div className="space-y-3">
          <h3 className="font-bold text-white">Team and student progress <span className="text-xs font-normal text-slate-500">({round.teams.length} teams)</span></h3>
          {round.teams.map((team, index) => <article key={`${team.branchName}-${team.teamCode}-${index}`} className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
            <div className="flex flex-wrap justify-between gap-2"><div><span className="font-bold text-cyan-200">{team.teamCode}</span><span className="ml-2 text-sm text-slate-400">· {team.branchName}</span>{team.projectName && <p className="mt-1 text-xs text-slate-500">Project: {team.projectName}</p>}</div><span className={`text-xs font-bold ${statusStyle(team.status)}`}>{team.status.replaceAll('_', ' ')}</span></div>
            <div className="mt-3 grid gap-3 lg:grid-cols-3">
              <div><p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Assigned students</p><div className="mt-1 space-y-1">{team.participantIds.map((id, studentIndex) => <p key={id} className="text-xs text-slate-300">{team.memberNames[studentIndex] || 'Name not recorded'} <span className="font-mono text-cyan-300">{id}</span></p>)}</div></div>
              <div><p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Submissions</p>{team.submissions.length ? team.submissions.map((submission, submissionIndex) => <p key={`${submission.participantId}-${submissionIndex}`} className="mt-1 text-xs text-slate-300">{submission.participantName || 'Name not recorded'} <span className="font-mono text-cyan-300">{submission.participantId}</span> · <span className={statusStyle(submission.status)}>{submission.status}</span></p>) : <p className="mt-1 text-xs text-slate-500">No submissions yet</p>}</div>
              <div><p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Round status</p><p className="mt-1 text-xs text-slate-300">{team.progressClaim ? `Progress claim: ${team.progressClaim.status}${team.progressClaim.claimedPercentage === null ? '' : ` · ${team.progressClaim.claimedPercentage}%`}` : 'No progress claim'}</p><p className="mt-1 text-xs text-slate-300">{team.evaluation ? `Evaluation: ${team.evaluation.status} · ${team.evaluation.marks}/${team.evaluation.maxMarks}` : 'Not evaluated'}</p></div>
            </div>
          </article>)}
          {!round.teams.length && <p className="text-sm text-slate-500">No teams assigned in this round for the selected branch scope.</p>}
        </div>}
      </section>)}
      {!loading && !dashboard?.rounds.length && <section className="rounded-2xl border border-slate-800 p-6 text-sm text-slate-400">No rounds are currently assigned to this viewer. Contact the administrator to update your access.</section>}
    </div>
  </main>;
}
