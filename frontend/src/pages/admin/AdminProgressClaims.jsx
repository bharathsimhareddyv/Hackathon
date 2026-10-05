import React, { useEffect, useState } from 'react';
import { Check, Download, Search, X } from 'lucide-react';
import api from '../../utils/api';
import { useAuth } from '../../context/AuthContext';

export default function AdminProgressClaims() {
  const { showToast } = useAuth();
  const [claims, setClaims] = useState([]);
  const [rounds, setRounds] = useState([]);
  const [manualTeams, setManualTeams] = useState([]);
  const [manualEvaluations, setManualEvaluations] = useState([]);
  const [roundNumber, setRoundNumber] = useState('');
  const [manualRoundNumber, setManualRoundNumber] = useState('');
  const [manualTeamId, setManualTeamId] = useState('');
  const [manualMarks, setManualMarks] = useState('');
  const [manualStatus, setManualStatus] = useState('QUALIFIED');
  const [manualRemarks, setManualRemarks] = useState('');
  const [status, setStatus] = useState('PENDING');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState('');
  const [savingManual, setSavingManual] = useState(false);
  const [reviewMarks, setReviewMarks] = useState({});

  const refresh = async () => {
    setLoading(true);
    try {
      const params = { status, ...(roundNumber ? { roundNumber } : {}), ...(search ? { search } : {}) };
      const [claimsRes, roundsRes] = await Promise.all([api.get('/progress-claims/admin', { params }), api.get('/rounds')]);
      setClaims(claimsRes.data);
      setRounds(roundsRes.data);
      if (!manualRoundNumber && roundsRes.data.length > 0) setManualRoundNumber(String(roundsRes.data[0].roundNumber));
    } catch (err) { showToast(err.response?.data?.message || 'Could not load progress claims', 'error'); }
    finally { setLoading(false); }
  };
  useEffect(() => { refresh(); }, [status, roundNumber, search]);

  useEffect(() => {
    if (!manualRoundNumber) return;
    const fetchManualRound = async () => {
      try {
        const [teamsRes, evaluationsRes] = await Promise.all([
          api.get(`/admin/teams/round/${manualRoundNumber}`),
          api.get(`/admin/evaluations/round/${manualRoundNumber}`)
        ]);
        setManualTeams(teamsRes.data);
        setManualEvaluations(evaluationsRes.data);
        const teamId = teamsRes.data[0]?._id || '';
        const existing = evaluationsRes.data.find(evaluation => String(evaluation.teamId?._id || evaluation.teamId) === String(teamId));
        setManualTeamId(teamId);
        setManualMarks(existing ? String(existing.marks) : '');
        setManualStatus(existing?.status || 'QUALIFIED');
        setManualRemarks(existing?.remarks || '');
      } catch (err) {
        showToast(err.response?.data?.message || 'Could not load teams for manual scoring', 'error');
      }
    };
    fetchManualRound();
  }, [manualRoundNumber, showToast]);

  const selectManualTeam = teamId => {
    setManualTeamId(teamId);
    const existing = manualEvaluations.find(evaluation => String(evaluation.teamId?._id || evaluation.teamId) === String(teamId));
    setManualMarks(existing ? String(existing.marks) : '');
    setManualStatus(existing?.status || 'QUALIFIED');
    setManualRemarks(existing?.remarks || '');
  };

  const saveManualEvaluation = async event => {
    event.preventDefault();
    const round = rounds.find(item => String(item.roundNumber) === String(manualRoundNumber));
    const marks = Number(manualMarks);
    const maxMarks = Number(round?.maxMarks);
    if (!manualTeamId || !Number.isFinite(marks) || marks < 0 || marks > maxMarks) {
      showToast(`Enter marks between 0 and ${maxMarks || 100}`, 'error');
      return;
    }
    setSavingManual(true);
    try {
      await api.post('/admin/evaluations', {
        roundNumber: Number(manualRoundNumber),
        teamId: manualTeamId,
        marks,
        maxMarks,
        status: manualStatus,
        remarks: manualRemarks
      });
      showToast('Manual marks and qualification result saved', 'success');
      const evaluationsRes = await api.get(`/admin/evaluations/round/${manualRoundNumber}`);
      setManualEvaluations(evaluationsRes.data);
      refresh();
    } catch (err) {
      showToast(err.response?.data?.message || 'Could not save manual marks', 'error');
    } finally {
      setSavingManual(false);
    }
  };

  const review = async (claim, action) => {
    const maxMarks = Number(rounds.find(round => round.roundNumber === claim.roundNumber)?.maxMarks || 100);
    const marks = Number(reviewMarks[claim._id]);
    if (reviewMarks[claim._id] === undefined || reviewMarks[claim._id] === '' || !Number.isFinite(marks) || marks < 0 || marks > maxMarks) {
      showToast(`Enter final marks between 0 and ${maxMarks}`, 'error');
      return;
    }
    let reason = '';
    if (action === 'reject') {
      reason = window.prompt('Reason for rejecting this claim?') || '';
      if (!reason) return;
    }
    setBusyId(claim._id);
    try {
      await api.post(`/progress-claims/admin/${claim._id}/${action}`, { marks, ...(reason ? { reason } : {}) });
      showToast(action === 'approve' ? 'Approved with final marks for the leaderboard' : 'Rejected with final marks for the leaderboard', 'success');
      refresh();
    } catch (err) { showToast(err.response?.data?.message || 'Review action failed', 'error'); }
    finally { setBusyId(''); }
  };

  const downloadEvidence = async (claim) => {
    setBusyId(`download-${claim._id}`);
    try {
      const response = await api.get(`/progress-claims/admin/${claim._id}/download`, { responseType: 'blob' });
      let fileData = response.data;
      let fileName = claim.zipOriginalName || `${claim.teamCode}-round-${claim.roundNumber}.zip`;
      if (response.data.type === 'application/json') {
        const payload = JSON.parse(await response.data.text());
        fileData = payload.downloadUrl;
        fileName = payload.fileName || fileName;
      }

      const link = document.createElement('a');
      link.href = typeof fileData === 'string' ? fileData : URL.createObjectURL(fileData);
      link.download = fileName;
      link.rel = 'noopener noreferrer';
      document.body.appendChild(link);
      link.click();
      link.remove();
      if (typeof fileData !== 'string') window.setTimeout(() => URL.revokeObjectURL(link.href), 1000);
    } catch (err) {
      showToast(err.response?.data?.message || 'Could not download submission ZIP', 'error');
    } finally {
      setBusyId('');
    }
  };

  const closeRound = async () => {
    if (!roundNumber || !window.confirm(`Close Round ${roundNumber} and eliminate teams without an approved claim or manually qualified evaluation?`)) return;
    try {
      const response = await api.post(`/progress-claims/admin/close-round/${roundNumber}`);
      showToast(response.data.message, 'success');
      refresh();
    } catch (err) {
      showToast(err.response?.data?.message || 'Could not close the round', 'error');
    }
  };

  return <div className="space-y-6">
    <header><p className="text-xs font-bold uppercase tracking-[0.2em] text-amber-300">Organizer decisions</p><h1 className="mt-1 font-outfit text-3xl font-extrabold text-white">Progress approvals</h1><p className="mt-2 text-sm text-slate-400">Review submitted progress or record marks and qualification manually for any assigned team.</p></header>
    <section className="glass-panel rounded-2xl border border-cyan-900/70 p-4 sm:p-6">
      <div className="mb-4"><h2 className="font-outfit text-lg font-bold text-white">Manual marks entry</h2><p className="mt-1 text-xs text-slate-400">No student submission is needed. Saved results update the leaderboard and round qualification.</p></div>
      <form onSubmit={saveManualEvaluation} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_1.5fr_1fr_1fr_1.5fr_auto] lg:items-end">
        <label className="text-xs text-slate-400">Round<select value={manualRoundNumber} onChange={event => setManualRoundNumber(event.target.value)} className="glass-input mt-1 w-full rounded-lg px-3 py-2.5 text-sm text-white">{rounds.map(round => <option key={round._id} value={round.roundNumber}>Round {round.roundNumber}</option>)}</select></label>
        <label className="text-xs text-slate-400">Team<select value={manualTeamId} onChange={event => selectManualTeam(event.target.value)} disabled={!manualTeams.length} className="glass-input mt-1 w-full rounded-lg px-3 py-2.5 text-sm text-white"><option value="">{manualTeams.length ? 'Select a team' : 'No teams assigned'}</option>{manualTeams.map(team => <option key={team._id} value={team._id}>{team.teamCode} {team.participantIds?.length ? `(${team.participantIds.join(', ')})` : ''}</option>)}</select></label>
        <label className="text-xs text-slate-400">Marks / {rounds.find(round => String(round.roundNumber) === String(manualRoundNumber))?.maxMarks || 100}<input type="number" min="0" max={rounds.find(round => String(round.roundNumber) === String(manualRoundNumber))?.maxMarks || 100} step="any" value={manualMarks} onChange={event => setManualMarks(event.target.value)} required className="glass-input mt-1 w-full rounded-lg px-3 py-2.5 text-sm text-white" /></label>
        <label className="text-xs text-slate-400">Result<select value={manualStatus} onChange={event => setManualStatus(event.target.value)} className="glass-input mt-1 w-full rounded-lg px-3 py-2.5 text-sm text-white"><option value="QUALIFIED">Qualified</option><option value="NOT_QUALIFIED">Not qualified</option><option value="PENDING">Pending</option><option value="DISQUALIFIED">Disqualified</option></select></label>
        <label className="text-xs text-slate-400">Remarks<input value={manualRemarks} onChange={event => setManualRemarks(event.target.value)} placeholder="Optional" className="glass-input mt-1 w-full rounded-lg px-3 py-2.5 text-sm text-white" /></label>
        <button type="submit" disabled={savingManual || !manualTeamId} className="rounded-lg bg-cyan-700 px-4 py-2.5 text-xs font-bold text-white hover:bg-cyan-600 disabled:opacity-50">{savingManual ? 'Saving…' : 'Save marks'}</button>
      </form>
    </section>
    <section className="glass-panel rounded-2xl border border-slate-800 p-4 sm:p-6">
      <div className="grid gap-3 sm:grid-cols-[1fr_1fr_2fr_auto]">
        <label className="text-xs text-slate-400">Status<select value={status} onChange={event => setStatus(event.target.value)} className="glass-input mt-1 w-full rounded-lg px-3 py-2.5 text-sm text-white"><option value="PENDING">Pending</option><option value="APPROVED">Approved</option><option value="REJECTED">Rejected</option></select></label>
        <label className="text-xs text-slate-400">Round<select value={roundNumber} onChange={event => setRoundNumber(event.target.value)} className="glass-input mt-1 w-full rounded-lg px-3 py-2.5 text-sm text-white"><option value="">All rounds</option>{rounds.map(round => <option key={round._id} value={round.roundNumber}>Round {round.roundNumber}</option>)}</select></label>
        <label className="relative text-xs text-slate-400">Search teams<input value={search} onChange={event => setSearch(event.target.value)} placeholder="Team ID or claim notes" className="glass-input mt-1 w-full rounded-lg py-2.5 pl-9 pr-3 text-sm" /><Search className="absolute left-3 top-8 h-4 w-4 text-slate-500" /></label>
        <button type="button" onClick={closeRound} disabled={!roundNumber} className="mt-auto rounded-lg border border-rose-800 px-3 py-2.5 text-xs font-bold text-rose-200 hover:bg-rose-950 disabled:opacity-40">Close & review missing claims</button>
      </div>
      <div className="mt-5 divide-y divide-slate-800">{loading ? <p className="py-10 text-center text-sm text-slate-500">Loading claims…</p> : claims.length === 0 ? <p className="py-10 text-center text-sm text-slate-500">No claims match these filters.</p> : claims.map(claim => <article key={claim._id} className="grid gap-4 py-5 lg:grid-cols-[1fr_1fr_auto] lg:items-center">
        <div><p className="font-mono font-bold text-white">{claim.teamCode} <span className="font-sans font-normal text-slate-500">· Round {claim.roundNumber}</span></p><p className="mt-1 text-xs text-slate-400">Submitted {new Date(claim.submittedAt).toLocaleString()}</p><p className="mt-3 text-[11px] font-bold uppercase tracking-wider text-slate-500">Team notes</p><p className="mt-1 whitespace-pre-wrap break-words text-sm text-slate-300">{claim.notes || 'No notes provided.'}</p></div>
        <div><p className="text-2xl font-extrabold text-emerald-300">{claim.claimedPercentage == null ? 'Not provided' : `${claim.claimedPercentage}%`}</p><p className="text-xs text-slate-400">{claim.claimedErrorsSolved} errors marked solved</p>{(() => { const criteria = rounds.find(round => round.roundNumber === claim.roundNumber)?.qualificationCriteria; const minimum = criteria?.minPercentage ?? 0; const hasPercentage = claim.claimedPercentage != null; return <p className={`mt-1 text-xs ${!hasPercentage ? 'text-slate-400' : claim.claimedPercentage >= minimum ? 'text-emerald-300' : 'text-amber-300'}`}>{!hasPercentage ? 'No percentage supplied · manual review' : `Round criterion: ${minimum}% · ${claim.claimedPercentage >= minimum ? 'threshold met' : 'below threshold'}`}</p>; })()}<div className="mt-3 flex flex-wrap gap-3 text-xs">{claim.githubUrl && <a href={claim.githubUrl} target="_blank" rel="noreferrer" className="text-cyan-300 underline">Open GitHub repository</a>}{claim.zipPath && <button type="button" onClick={() => downloadEvidence(claim)} disabled={busyId === `download-${claim._id}`} className="inline-flex items-center gap-1 text-emerald-300 underline disabled:opacity-50"><Download className="h-3.5 w-3.5" />{busyId === `download-${claim._id}` ? 'Preparing ZIP…' : 'Download ZIP'}</button>}</div>{claim.rejectionReason && <p className="mt-2 text-xs text-rose-300">Reason: {claim.rejectionReason}</p>}</div>
        {claim.status === 'PENDING' ? <div className="space-y-2"><label className="block text-xs text-slate-400">Final marks / {rounds.find(round => round.roundNumber === claim.roundNumber)?.maxMarks || 100}<input type="number" min="0" max={rounds.find(round => round.roundNumber === claim.roundNumber)?.maxMarks || 100} step="any" value={reviewMarks[claim._id] ?? ''} onChange={event => setReviewMarks(previous => ({ ...previous, [claim._id]: event.target.value }))} className="glass-input mt-1 w-full rounded-lg px-3 py-2 text-sm text-white" /></label><div className="flex gap-2"><button disabled={busyId === claim._id} onClick={() => review(claim, 'approve')} className="flex items-center gap-1.5 rounded-lg bg-emerald-700 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-600 disabled:opacity-50"><Check className="h-4 w-4" />Approve</button><button disabled={busyId === claim._id} onClick={() => review(claim, 'reject')} className="flex items-center gap-1.5 rounded-lg border border-rose-800 px-3 py-2 text-xs font-bold text-rose-200 hover:bg-rose-950 disabled:opacity-50"><X className="h-4 w-4" />Reject</button></div></div> : <span className={`text-xs font-bold ${claim.status === 'APPROVED' ? 'text-emerald-300' : 'text-rose-300'}`}>{claim.status}</span>}
      </article>)}</div>
    </section>
  </div>;
}
