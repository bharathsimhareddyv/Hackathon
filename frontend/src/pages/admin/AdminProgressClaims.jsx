import React, { useEffect, useState } from 'react';
import { Check, Search, X } from 'lucide-react';
import api from '../../utils/api';
import { useAuth } from '../../context/AuthContext';

export default function AdminProgressClaims() {
  const { showToast } = useAuth();
  const [claims, setClaims] = useState([]);
  const [rounds, setRounds] = useState([]);
  const [roundNumber, setRoundNumber] = useState('');
  const [status, setStatus] = useState('PENDING');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState('');

  const refresh = async () => {
    setLoading(true);
    try {
      const params = { status, ...(roundNumber ? { roundNumber } : {}), ...(search ? { search } : {}) };
      const [claimsRes, roundsRes] = await Promise.all([api.get('/progress-claims/admin', { params }), api.get('/rounds')]);
      setClaims(claimsRes.data);
      setRounds(roundsRes.data);
    } catch (err) { showToast(err.response?.data?.message || 'Could not load progress claims', 'error'); }
    finally { setLoading(false); }
  };
  useEffect(() => { refresh(); }, [status, roundNumber, search]);

  const review = async (claim, action) => {
    let reason = '';
    if (action === 'reject') {
      reason = window.prompt('Reason for rejecting this claim?') || '';
      if (!reason) return;
    }
    setBusyId(claim._id);
    try {
      await api.post(`/progress-claims/admin/${claim._id}/${action}`, action === 'reject' ? { reason } : {});
      showToast(action === 'approve' ? 'Claim approved and progress recorded' : 'Claim rejected', 'success');
      refresh();
    } catch (err) { showToast(err.response?.data?.message || 'Review action failed', 'error'); }
    finally { setBusyId(''); }
  };

  const closeRound = async () => {
    if (!roundNumber || !window.confirm(`Close Round ${roundNumber} and eliminate teams without an approved progress claim?`)) return;
    try {
      const response = await api.post(`/progress-claims/admin/close-round/${roundNumber}`);
      showToast(response.data.message, 'success');
      refresh();
    } catch (err) {
      showToast(err.response?.data?.message || 'Could not close the round', 'error');
    }
  };

  return <div className="space-y-6">
    <header><p className="text-xs font-bold uppercase tracking-[0.2em] text-amber-300">Organizer decisions</p><h1 className="mt-1 font-outfit text-3xl font-extrabold text-white">Progress approvals</h1><p className="mt-2 text-sm text-slate-400">Team-submitted percentages remain pending until approved. Review evidence and decide each claim.</p></header>
    <section className="glass-panel rounded-2xl border border-slate-800 p-4 sm:p-6">
      <div className="grid gap-3 sm:grid-cols-[1fr_1fr_2fr_auto]">
        <label className="text-xs text-slate-400">Status<select value={status} onChange={event => setStatus(event.target.value)} className="glass-input mt-1 w-full rounded-lg px-3 py-2.5 text-sm text-white"><option value="PENDING">Pending</option><option value="APPROVED">Approved</option><option value="REJECTED">Rejected</option></select></label>
        <label className="text-xs text-slate-400">Round<select value={roundNumber} onChange={event => setRoundNumber(event.target.value)} className="glass-input mt-1 w-full rounded-lg px-3 py-2.5 text-sm text-white"><option value="">All rounds</option>{rounds.map(round => <option key={round._id} value={round.roundNumber}>Round {round.roundNumber}</option>)}</select></label>
        <label className="relative text-xs text-slate-400">Search teams<input value={search} onChange={event => setSearch(event.target.value)} placeholder="Team ID or claim notes" className="glass-input mt-1 w-full rounded-lg py-2.5 pl-9 pr-3 text-sm" /><Search className="absolute left-3 top-8 h-4 w-4 text-slate-500" /></label>
        <button type="button" onClick={closeRound} disabled={!roundNumber} className="mt-auto rounded-lg border border-rose-800 px-3 py-2.5 text-xs font-bold text-rose-200 hover:bg-rose-950 disabled:opacity-40">Close & review missing claims</button>
      </div>
      <div className="mt-5 divide-y divide-slate-800">{loading ? <p className="py-10 text-center text-sm text-slate-500">Loading claims…</p> : claims.length === 0 ? <p className="py-10 text-center text-sm text-slate-500">No claims match these filters.</p> : claims.map(claim => <article key={claim._id} className="grid gap-4 py-5 lg:grid-cols-[1fr_1fr_auto] lg:items-center">
        <div><p className="font-mono font-bold text-white">{claim.teamCode} <span className="font-sans font-normal text-slate-500">· Round {claim.roundNumber}</span></p><p className="mt-1 text-xs text-slate-400">Submitted {new Date(claim.submittedAt).toLocaleString()}</p><p className="mt-2 text-sm text-slate-300">{claim.notes || 'No notes added.'}</p></div>
        <div><p className="text-2xl font-extrabold text-emerald-300">{claim.claimedPercentage == null ? 'Not provided' : `${claim.claimedPercentage}%`}</p><p className="text-xs text-slate-400">{claim.claimedErrorsSolved} errors marked solved</p>{(() => { const criteria = rounds.find(round => round.roundNumber === claim.roundNumber)?.qualificationCriteria; const minimum = criteria?.minPercentage ?? 0; const hasPercentage = claim.claimedPercentage != null; return <p className={`mt-1 text-xs ${!hasPercentage ? 'text-slate-400' : claim.claimedPercentage >= minimum ? 'text-emerald-300' : 'text-amber-300'}`}>{!hasPercentage ? 'No percentage supplied · manual review' : `Round criterion: ${minimum}% · ${claim.claimedPercentage >= minimum ? 'threshold met' : 'below threshold'}`}</p>; })()}<div className="mt-2 flex gap-3 text-xs">{claim.githubUrl && <a href={claim.githubUrl} target="_blank" rel="noreferrer" className="text-cyan-300 underline">Repository</a>}{claim.zipPath && <a href={claim.zipPath} target="_blank" rel="noreferrer" className="text-cyan-300 underline">Evidence ZIP</a>}</div>{claim.rejectionReason && <p className="mt-2 text-xs text-rose-300">Reason: {claim.rejectionReason}</p>}</div>
        {claim.status === 'PENDING' ? <div className="flex gap-2"><button disabled={busyId === claim._id || (claim.claimedPercentage != null && claim.claimedPercentage < (rounds.find(round => round.roundNumber === claim.roundNumber)?.qualificationCriteria?.minPercentage ?? rounds.find(round => round.roundNumber === claim.roundNumber)?.requiredMinPercentage ?? 0))} onClick={() => review(claim, 'approve')} className="flex items-center gap-1.5 rounded-lg bg-emerald-700 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-600 disabled:opacity-50"><Check className="h-4 w-4" />Approve</button><button disabled={busyId === claim._id} onClick={() => review(claim, 'reject')} className="flex items-center gap-1.5 rounded-lg border border-rose-800 px-3 py-2 text-xs font-bold text-rose-200 hover:bg-rose-950 disabled:opacity-50"><X className="h-4 w-4" />Reject</button></div> : <span className={`text-xs font-bold ${claim.status === 'APPROVED' ? 'text-emerald-300' : 'text-rose-300'}`}>{claim.status}</span>}
      </article>)}</div>
    </section>
  </div>;
}
