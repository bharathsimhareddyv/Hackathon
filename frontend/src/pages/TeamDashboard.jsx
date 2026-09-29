import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowDownToLine, ExternalLink, GitBranch, LogOut, Send, UploadCloud } from 'lucide-react';
import api from '../utils/api';
import { downloadProject } from '../utils/downloadProject';
import { useAuth } from '../context/AuthContext';

export default function TeamDashboard() {
  const { user, logout, showToast } = useAuth();
  const navigate = useNavigate();
  const [assignments, setAssignments] = useState([]);
  const [rounds, setRounds] = useState([]);
  const [claims, setClaims] = useState([]);
  const [roundNumber, setRoundNumber] = useState('');
  const [percentage, setPercentage] = useState('');
  const [errorsSolved, setErrorsSolved] = useState('');
  const [githubUrl, setGithubUrl] = useState('');
  const [notes, setNotes] = useState('');
  const [proofZip, setProofZip] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);

  const refresh = async () => {
    try {
      const [assignmentRes, roundsRes, claimsRes] = await Promise.all([
        api.get('/admin/team-accounts/assignments'),
        api.get('/rounds'),
        api.get('/progress-claims/my')
      ]);
      setAssignments(assignmentRes.data);
      setRounds(roundsRes.data);
      setClaims(claimsRes.data);
      const active = roundsRes.data.find(round => round.status === 'ACTIVE');
      const nextRound = active?.roundNumber || assignmentRes.data[0]?.roundNumber;
      if (nextRound) setRoundNumber(String(nextRound));
    } catch (err) {
      showToast(err.response?.data?.message || 'Could not load team workspace', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { refresh(); }, []);

  const selectedRound = rounds.find(round => String(round.roundNumber) === String(roundNumber));
  const assignment = assignments.find(item => String(item.roundNumber) === String(roundNumber));
  const roundWindowClosed = selectedRound?.status === 'CLOSED' || (selectedRound?.endAt && new Date() > new Date(selectedRound.endAt));
  const assignedRepoUrl = selectedRound?.githubRepoUrl || assignment?.projectId?.githubUrl || '';
  const repositoryUrl = assignedRepoUrl.includes('github.com/aarohan-hackathon/round2-react-starter') ? '' : assignedRepoUrl;

  const handleDownload = async (project) => {
    try {
      setDownloading(true);
      await downloadProject(project, api);
    } catch (err) {
      showToast(err.response?.data?.message || 'Download failed', 'error');
    } finally {
      setDownloading(false);
    }
  };

  const submitClaim = async (event) => {
    event.preventDefault();
    const form = new FormData();
    form.append('roundNumber', roundNumber);
    if (percentage.trim()) form.append('claimedPercentage', percentage);
    form.append('claimedErrorsSolved', errorsSolved || '0');
    if (githubUrl.trim()) form.append('githubUrl', githubUrl.trim());
    form.append('notes', notes);
    if (proofZip) form.append('proofZip', proofZip);

    try {
      setSubmitting(true);
      await api.post('/progress-claims', form, { headers: { 'Content-Type': 'multipart/form-data' } });
      showToast('Progress submitted for organizer review', 'success');
      setPercentage('');
      setErrorsSolved('');
      setGithubUrl('');
      setNotes('');
      setProofZip(null);
      event.target.reset();
      refresh();
    } catch (err) {
      showToast(err.response?.data?.message || 'Progress could not be submitted', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <main className="min-h-screen bg-[#0B0F19] p-8 text-slate-300">Loading your team workspace…</main>;

  return (
    <main className="min-h-screen bg-[#0B0F19] px-4 py-6 text-slate-100 sm:px-8 lg:px-12">
      <header className="mx-auto flex max-w-6xl items-center justify-between border-b border-slate-800 pb-5">
        <div><p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-300">AAROHAN · Team workspace</p><h1 className="mt-1 font-outfit text-2xl font-extrabold sm:text-3xl">{user?.loginId}</h1></div>
        <button onClick={() => { logout(); navigate('/'); }} className="flex items-center gap-2 rounded-lg border border-slate-700 px-3 py-2 text-xs text-slate-300 hover:border-rose-500 hover:text-white"><LogOut className="h-4 w-4" /> Sign out</button>
      </header>

      <div className="mx-auto mt-7 grid max-w-6xl gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <section className="glass-panel rounded-2xl border border-emerald-500/20 p-5 sm:p-7">
          <div className="flex flex-wrap items-end justify-between gap-4 border-b border-slate-800 pb-4">
            <div><p className="text-xs uppercase tracking-widest text-slate-400">Assigned challenge</p><h2 className="mt-1 text-xl font-bold text-white">{assignment?.projectId?.name || selectedRound?.name || 'No round assigned'}</h2></div>
            <label className="text-xs text-slate-400">Round<select value={roundNumber} onChange={event => setRoundNumber(event.target.value)} className="glass-input ml-2 rounded-lg px-3 py-2 text-sm text-white">{rounds.map(round => <option key={round._id} value={round.roundNumber}>Round {round.roundNumber}</option>)}</select></label>
          </div>
          {selectedRound && <div className="mt-4 grid gap-3 sm:grid-cols-2 text-sm"><div className="rounded-xl bg-slate-950/70 p-4"><span className="text-xs text-slate-500">Round status</span><p className="mt-1 font-semibold text-emerald-300">{selectedRound.status}</p></div><div className="rounded-xl bg-slate-950/70 p-4"><span className="text-xs text-slate-500">Submission deadline</span><p className="mt-1 font-semibold text-slate-200">{new Date(selectedRound.endAt).toLocaleString()}</p></div></div>}
          {assignment && <div className="mt-4 rounded-xl border border-cyan-500/20 bg-cyan-950/20 p-4"><p className="text-xs font-bold uppercase tracking-wider text-cyan-200">Arohan IDs assigned to this team</p>{assignment.participantIds?.length ? <div className="mt-3 flex flex-wrap gap-2">{assignment.participantIds.map(id => <span key={id} className="rounded-md border border-cyan-800 bg-slate-950 px-2.5 py-1.5 font-mono text-xs font-bold text-cyan-100">{id}</span>)}</div> : <p className="mt-2 text-sm text-slate-300">No Arohan IDs have been assigned yet. Please contact the organizer.</p>}</div>}
          {selectedRound?.instructions && <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-slate-300">{selectedRound.instructions}</p>}
          {selectedRound?.criteriaSummary && <p className="mt-3 rounded-lg border-l-2 border-amber-400 bg-amber-950/20 px-3 py-2 text-sm text-amber-100">{selectedRound.criteriaSummary}</p>}
          {roundWindowClosed ? <p className="mt-5 rounded-xl border border-rose-800 bg-rose-950/30 p-4 text-sm font-semibold text-rose-200">Round window closed. Project downloads and repository links are unavailable.</p> : <>
            {repositoryUrl && <div className="mt-5 rounded-xl border border-slate-800 bg-slate-950 p-4"><p className="flex items-center gap-2 text-xs font-semibold text-slate-300"><GitBranch className="h-4 w-4 text-emerald-300" /> GitHub repository · {assignment?.projectId?.name || selectedRound?.name}</p><a href={repositoryUrl} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-2 break-all text-sm text-emerald-300 hover:underline">{repositoryUrl}<ExternalLink className="h-3.5 w-3.5 shrink-0" /></a><code className="mt-3 block overflow-x-auto rounded-lg bg-black/40 p-3 text-xs text-slate-300">git clone {repositoryUrl}</code></div>}
            {!repositoryUrl && assignment?.projectId?.filePath && <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-emerald-500/20 bg-emerald-950/20 p-4"><div><p className="font-semibold text-white">{assignment.projectId.name}</p><p className="mt-1 text-xs text-slate-400">{assignment.projectId.originalFileName || 'Project archive'}</p></div><button disabled={downloading} onClick={() => handleDownload(assignment.projectId)} className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-emerald-500 disabled:opacity-50"><ArrowDownToLine className="h-4 w-4" />{downloading ? 'Downloading…' : 'Download ZIP'}</button></div>}
            {!repositoryUrl && assignment?.projectId && !assignment.projectId.filePath && <p className="mt-5 text-sm text-amber-200">No GitHub repository or ZIP file is attached to this project.</p>}
          </>}
          {!assignment && <p className="mt-5 text-sm text-amber-200">No team assignment is available for this round yet.</p>}
        </section>

        <section className="glass-panel rounded-2xl border border-slate-800 p-5 sm:p-7">
          <p className="text-xs font-bold uppercase tracking-widest text-emerald-300">Progress review</p><h2 className="mt-1 text-xl font-bold text-white">Submit your progress</h2><p className="mt-2 text-xs leading-5 text-slate-400">Claims count only after organizer approval. Your criteria and deadline are set by the organizer.</p>
          {roundWindowClosed ? <p className="mt-5 rounded-lg border border-rose-800 bg-rose-950/30 p-3 text-sm text-rose-200">This round’s submission window is closed.</p> : <form onSubmit={submitClaim} className="mt-5 space-y-4">
            <label className="block text-xs text-slate-300">Completion percentage (optional)<input type="number" min="0" max="100" step="0.1" value={percentage} onChange={event => setPercentage(event.target.value)} className="glass-input mt-1.5 w-full rounded-lg px-3 py-2.5 text-sm" placeholder="Leave blank if unavailable" /></label>
            <label className="block text-xs text-slate-300">Errors solved<input type="number" min="0" value={errorsSolved} onChange={event => setErrorsSolved(event.target.value)} className="glass-input mt-1.5 w-full rounded-lg px-3 py-2.5 text-sm" /></label>
            <label className="block text-xs text-slate-300">Repository URL (optional)<input type="url" value={githubUrl} onChange={event => setGithubUrl(event.target.value)} className="glass-input mt-1.5 w-full rounded-lg px-3 py-2.5 text-sm" placeholder="https://github.com/..." /></label>
            <label className="block text-xs text-slate-300">Notes<textarea rows="3" value={notes} onChange={event => setNotes(event.target.value)} className="glass-input mt-1.5 w-full rounded-lg px-3 py-2.5 text-sm" /></label>
            <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-dashed border-slate-700 p-3 text-xs text-slate-300"><UploadCloud className="h-4 w-4 text-emerald-300" /><span className="min-w-0 flex-1 truncate">{proofZip?.name || 'Attach optional ZIP evidence'}</span><input type="file" accept=".zip" onChange={event => setProofZip(event.target.files[0])} className="sr-only" /></label>
            <button disabled={submitting || !assignment} className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white hover:bg-emerald-500 disabled:opacity-50"><Send className="h-4 w-4" />{submitting ? 'Submitting…' : 'Send for approval'}</button>
          </form>}
        </section>

        <section className="glass-panel rounded-2xl border border-slate-800 p-5 sm:p-7 lg:col-span-2">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3"><h2 className="font-bold text-white">Submission history</h2><span className="text-xs text-slate-500">{claims.length} claims</span></div>
          {claims.length === 0 ? <p className="py-8 text-center text-sm text-slate-500">No progress claims submitted.</p> : <div className="divide-y divide-slate-800">{claims.map(claim => <article key={claim._id} className="flex flex-wrap items-center justify-between gap-3 py-4 text-sm"><div><p className="font-semibold text-white">Round {claim.roundNumber} · {claim.claimedPercentage == null ? 'Percentage not provided' : `${claim.claimedPercentage}%`}</p><p className="mt-1 text-xs text-slate-500">Submitted {new Date(claim.submittedAt).toLocaleString()}{claim.rejectionReason ? ` · ${claim.rejectionReason}` : ''}</p></div><span className={`rounded-full px-3 py-1 text-xs font-bold ${claim.status === 'APPROVED' ? 'bg-emerald-950 text-emerald-300' : claim.status === 'REJECTED' ? 'bg-rose-950 text-rose-300' : 'bg-amber-950 text-amber-200'}`}>{claim.status}</span></article>)}</div>}
        </section>
      </div>
    </main>
  );
}
