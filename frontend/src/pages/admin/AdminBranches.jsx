import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Download, KeyRound, Trash2, UserPlus } from 'lucide-react';
import api from '../../utils/api';
import { useAuth } from '../../context/AuthContext';

export default function AdminBranches() {
  const { showToast } = useAuth();
  const [branches, setBranches] = useState([]);
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [busyBranchId, setBusyBranchId] = useState('');
  const [resetCredentials, setResetCredentials] = useState(null);
  const [branchReport, setBranchReport] = useState(null);
  const [reportLoading, setReportLoading] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const response = await api.get('/admin/branches');
      setBranches(response.data);
    } catch (error) {
      showToast(error.response?.data?.message || 'Could not load branches', 'error');
    }
  }, [showToast]);

  useEffect(() => { refresh(); }, [refresh]);

  const createBranch = async event => {
    event.preventDefault();
    setSaving(true);
    try {
      await api.post('/admin/branches', { name, username, password });
      showToast('Branch section created', 'success');
      setName('');
      setUsername('');
      setPassword('');
      await refresh();
    } catch (error) {
      showToast(error.response?.data?.message || 'Could not create branch', 'error');
    } finally {
      setSaving(false);
    }
  };

  const resetPassword = async branch => {
    setBusyBranchId(branch._id);
    try {
      const response = await api.post(`/admin/branches/${branch._id}/reset-password`);
      setResetCredentials({ branchName: branch.name, ...response.data });
      showToast(`Password reset for ${branch.name}`, 'success');
    } catch (error) {
      showToast(error.response?.data?.message || 'Could not reset branch password', 'error');
    } finally {
      setBusyBranchId('');
    }
  };

  const deleteBranchLogin = async branch => {
    if (!window.confirm(`Disable the login for ${branch.name}? Its branch and all data will be retained for admin access.`)) return;
    setBusyBranchId(branch._id);
    try {
      const response = await api.delete(`/admin/branches/${branch._id}`);
      showToast(response.data.message, 'success');
      await refresh();
    } catch (error) {
      showToast(error.response?.data?.message || 'Could not delete branch login', 'error');
    } finally {
      setBusyBranchId('');
    }
  };

  const enableBranchLogin = async branch => {
    setBusyBranchId(branch._id);
    try {
      const response = await api.post(`/admin/branches/${branch._id}/enable`);
      showToast(response.data.message, 'success');
      await refresh();
    } catch (error) {
      showToast(error.response?.data?.message || 'Could not enable branch login', 'error');
    } finally {
      setBusyBranchId('');
    }
  };

  const loadBranchReport = async branch => {
    setReportLoading(true);
    try {
      const response = await api.get(`/admin/branches/${branch._id}/report`);
      setBranchReport(response.data);
    } catch (error) {
      showToast(error.response?.data?.message || 'Could not load branch report', 'error');
    } finally {
      setReportLoading(false);
    }
  };

  const downloadBranchReport = () => {
    if (!branchReport) return;
    const csvEscape = value => `"${String(value ?? '').replaceAll('"', '""')}"`;
    const rows = [
      ['Branch report', branchReport.branch.name],
      ['Login', branchReport.branch.username],
      ['Login enabled', branchReport.branch.loginEnabled ? 'Yes' : 'No'],
      [],
      ['Metric', 'Value'],
      ...Object.entries(branchReport.summary),
      [],
      ['Round', 'Name', 'Status', 'Starts', 'Ends', 'Teams', 'Assigned students', 'Submissions', 'Progress claims', 'Evaluations', 'Projects'],
      ...branchReport.roundStats.map(round => [
        round.roundNumber, round.name, round.status, round.startAt, round.endAt, round.teams,
        round.assignedStudents, round.submissions, round.progressClaims, round.evaluations, round.projects
      ]),
      [],
      ['Student ID', 'Student name', 'Status', 'Active', 'Current round'],
      ...branchReport.students.map(student => [
        student.arohanId, student.name, student.status, student.active ? 'Yes' : 'No', student.currentRound
      ]),
      [],
      ['Team ID', 'Status', 'Current round', 'Assigned rounds and student IDs'],
      ...branchReport.teams.map(team => [
        team.loginId,
        team.status,
        team.currentRound,
        team.assignments.map(assignment => `Round ${assignment.roundNumber}: ${(assignment.participantIds || []).join(', ')}`).join(' | ')
      ]),
      [],
      ['Project', 'Round'],
      ...branchReport.projects.map(project => [project.name, project.roundNumber]),
      [],
      ['Submission round', 'Student ID', 'Team', 'Status', 'Submitted at'],
      ...branchReport.submissions.map(submission => [
        submission.roundNumber, submission.participantId, submission.teamCode, submission.status, submission.submittedAt
      ]),
      [],
      ['Evaluation round', 'Team', 'Marks', 'Max marks', 'Status'],
      ...branchReport.evaluations.map(evaluation => [
        evaluation.roundNumber, evaluation.teamCode, evaluation.marks, evaluation.maxMarks, evaluation.status
      ]),
      [],
      ['Progress claim round', 'Team', 'Status', 'Submitted at'],
      ...branchReport.progressClaims.map(claim => [
        claim.roundNumber, claim.teamCode, claim.status, claim.submittedAt
      ])
    ];
    const content = rows.map(row => row.map(csvEscape).join(',')).join('\r\n');
    const url = URL.createObjectURL(new Blob([`\uFEFF${content}`], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `${branchReport.branch.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-report.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const totals = branches.reduce((result, branch) => ({
    teams: result.teams + branch.stats.teams,
    students: result.students + branch.stats.students,
    rounds: result.rounds + branch.stats.rounds,
    projects: result.projects + branch.stats.projects,
    submissions: result.submissions + branch.stats.submissions
  }), { teams: 0, students: 0, rounds: 0, projects: 0, submissions: 0 });
  const maxCount = Math.max(1, ...branches.flatMap(branch => [
    branch.stats.teams, branch.stats.students, branch.stats.rounds, branch.stats.projects, branch.stats.submissions
  ]));

  return <div className="space-y-6">
    <header>
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-cyan-300">Branch access</p>
      <h1 className="mt-1 font-outfit text-3xl font-extrabold text-white">Branch sections</h1>
      <p className="mt-2 text-sm text-slate-400">Create branch logins. Each branch can generate and view only its own team accounts.</p>
      <Link to="/branch-login" className="mt-3 inline-flex text-xs font-bold text-cyan-300 hover:text-cyan-200">Open the separate branch login page →</Link>
    </header>
    <section className="glass-panel max-w-3xl rounded-2xl border border-cyan-500/20 p-5 sm:p-7">
      <h2 className="flex items-center gap-2 font-bold text-white"><UserPlus className="h-4 w-4 text-cyan-300" />Create a branch login</h2>
      <form onSubmit={createBranch} className="mt-5 grid gap-4 sm:grid-cols-2">
        <label className="text-xs text-slate-300">Branch name
          <input value={name} onChange={event => setName(event.target.value)} maxLength={100} required className="glass-input mt-1.5 w-full rounded-lg px-3 py-2.5 text-sm" />
        </label>
        <label className="text-xs text-slate-300">Login username
          <input value={username} onChange={event => setUsername(event.target.value)} maxLength={50} autoComplete="off" required className="glass-input mt-1.5 w-full rounded-lg px-3 py-2.5 text-sm" />
        </label>
        <label className="text-xs text-slate-300 sm:col-span-2">Temporary password (at least 8 characters)
          <input type="password" minLength="8" value={password} onChange={event => setPassword(event.target.value)} autoComplete="new-password" required className="glass-input mt-1.5 w-full rounded-lg px-3 py-2.5 text-sm" />
        </label>
        <button disabled={saving} className="flex items-center justify-center gap-2 rounded-lg bg-cyan-700 px-4 py-3 text-xs font-bold text-white hover:bg-cyan-600 disabled:opacity-50 sm:col-span-2">
          <UserPlus className="h-4 w-4" />{saving ? 'Creating…' : 'Create branch login'}
        </button>
      </form>
    </section>
    {resetCredentials && <section className="glass-panel max-w-3xl rounded-2xl border border-amber-500/30 p-5">
      <div className="flex items-start justify-between gap-4">
        <div><h2 className="font-bold text-amber-100">New branch password · {resetCredentials.branchName}</h2><p className="mt-1 text-xs text-amber-200/70">Share it securely with the branch. It is displayed here only for this reset.</p></div>
        <button onClick={() => setResetCredentials(null)} className="text-xs text-slate-400 hover:text-white">Dismiss</button>
      </div>
      <p className="mt-3 rounded-lg bg-slate-950 p-3 font-mono text-sm text-cyan-200">{resetCredentials.username}: {resetCredentials.temporaryPassword}</p>
    </section>}
    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {[
        ['Branches', branches.length],
        ['Students', totals.students],
        ['Teams', totals.teams],
        ['Projects', totals.projects],
        ['Rounds', totals.rounds],
        ['Submissions', totals.submissions]
      ].map(([label, value]) => <div key={label} className="glass-panel rounded-2xl border border-slate-800 p-5"><p className="text-xs uppercase tracking-widest text-slate-400">{label} · all branches</p><p className="mt-2 font-outfit text-3xl font-extrabold text-white">{value}</p></div>)}
    </section>
    <section className="glass-panel rounded-2xl border border-slate-800 p-5 sm:p-7">
      <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-bold text-white">Branch activity overview</h2><p className="mt-1 text-xs text-slate-400">Compare registered students, teams, rounds, and submissions across every branch.</p></div><p className="text-xs text-slate-500">{totals.rounds} rounds in total</p></div>
      <div className="mt-5 space-y-5">
        {branches.map(branch => <div key={branch._id}>
          <div className="mb-2 flex items-center justify-between gap-3"><span className="font-semibold text-white">{branch.name}</span><span className="text-xs text-slate-500">{branch.username}</span></div>
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
            {Object.entries({ Students: branch.stats.students, Teams: branch.stats.teams, Rounds: branch.stats.rounds, Projects: branch.stats.projects, Submissions: branch.stats.submissions }).map(([label, value]) => <div key={label} className="rounded-lg bg-slate-950/70 p-2.5">
              <div className="mb-1 flex justify-between text-[11px] text-slate-400"><span>{label}</span><strong className="text-slate-200">{value}</strong></div>
              <div className="h-1.5 overflow-hidden rounded-full bg-slate-800" role="progressbar" aria-label={`${branch.name} ${label}`} aria-valuenow={value} aria-valuemin="0" aria-valuemax={maxCount}><div className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-emerald-400" style={{ width: `${Math.max(value ? 3 : 0, value / maxCount * 100)}%` }} /></div>
            </div>)}
          </div>
        </div>)}
        {!branches.length && <p className="py-4 text-sm text-slate-500">No branches have been created yet.</p>}
      </div>
    </section>
    <section className="glass-panel rounded-2xl border border-slate-800 p-5 sm:p-7">
      <h2 className="font-bold text-white">All branch accounts and activity</h2>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[900px] text-left text-sm">
          <thead className="text-xs uppercase text-slate-500"><tr><th className="pb-3">Branch</th><th className="pb-3">Students</th><th className="pb-3">Teams</th><th className="pb-3">Rounds</th><th className="pb-3">Projects</th><th className="pb-3">Submissions</th><th className="pb-3">Actions</th></tr></thead>
          <tbody className="divide-y divide-slate-800">
            {branches.map(branch => <tr key={branch._id}>
              <td className="py-3"><strong className="text-white">{branch.name}</strong><p className="mt-1 text-xs text-slate-500">{branch.username} · {branch.loginEnabled ? 'Login enabled' : 'Login disabled; data retained'}</p></td>
              <td className="py-3 text-slate-300">{branch.stats.students} <span className="text-slate-500">({branch.stats.activeStudents} active)</span></td><td className="py-3 text-slate-300">{branch.stats.teams} <span className="text-slate-500">({branch.stats.activeTeams} active)</span></td><td className="py-3 text-slate-300">{branch.stats.rounds}</td><td className="py-3 text-slate-300">{branch.stats.projects}</td><td className="py-3 text-slate-300">{branch.stats.submissions}</td>
              <td className="py-3"><div className="flex flex-wrap gap-2">
                <button onClick={() => loadBranchReport(branch)} disabled={reportLoading} className="rounded-lg border border-cyan-800 px-2.5 py-2 text-xs font-semibold text-cyan-200 disabled:opacity-50">View report</button>
                {branch.loginEnabled ? <>
                  <button onClick={() => resetPassword(branch)} disabled={Boolean(busyBranchId)} className="flex items-center gap-1.5 rounded-lg border border-amber-800 px-2.5 py-2 text-xs font-semibold text-amber-200 disabled:opacity-50"><KeyRound className="h-3.5 w-3.5" />Reset password</button>
                  <button onClick={() => deleteBranchLogin(branch)} disabled={Boolean(busyBranchId)} className="flex items-center gap-1.5 rounded-lg border border-rose-900 px-2.5 py-2 text-xs font-semibold text-rose-200 disabled:opacity-50"><Trash2 className="h-3.5 w-3.5" />Disable login</button>
                </> : <button onClick={() => enableBranchLogin(branch)} disabled={Boolean(busyBranchId)} className="rounded-lg border border-emerald-800 px-2.5 py-2 text-xs font-semibold text-emerald-200 disabled:opacity-50">Enable login</button>}
              </div></td>
            </tr>)}
          </tbody>
        </table>
      </div>
    </section>
    {reportLoading && <p className="text-sm text-slate-400">Loading branch report…</p>}
    {branchReport && <section className="glass-panel space-y-5 rounded-2xl border border-cyan-500/20 p-5 sm:p-7">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div><p className="text-xs font-bold uppercase tracking-widest text-cyan-300">Branch report</p><h2 className="mt-1 text-2xl font-bold text-white">{branchReport.branch.name}</h2><p className="mt-1 text-xs text-slate-400">Detailed branch-only activity, assignments, and outcomes.</p></div>
        <div className="flex gap-2">
          <button onClick={downloadBranchReport} className="flex items-center gap-2 rounded-lg bg-cyan-800 px-3 py-2 text-xs font-bold text-white"><Download className="h-4 w-4" />Download CSV</button>
          <button onClick={() => setBranchReport(null)} className="rounded-lg border border-slate-700 px-3 py-2 text-xs text-slate-300">Close</button>
        </div>
      </header>
      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
        {Object.entries(branchReport.summary).map(([label, value]) => <div key={label} className="rounded-xl bg-slate-950/70 p-3"><p className="text-[11px] uppercase text-slate-500">{label.replace(/([A-Z])/g, ' $1')}</p><p className="mt-1 text-xl font-bold text-white">{value}</p></div>)}
      </div>
      <div className="overflow-x-auto">
        <h3 className="mb-2 font-bold text-white">Round-by-round report</h3>
        <table className="w-full min-w-[850px] text-left text-xs"><thead className="text-slate-500"><tr>{['Round', 'Status', 'Teams', 'Assigned students', 'Submissions', 'Progress claims', 'Evaluations', 'Projects'].map(label => <th key={label} className="px-2 py-2">{label}</th>)}</tr></thead>
          <tbody className="divide-y divide-slate-800">{branchReport.roundStats.map(round => <tr key={round.roundNumber}><td className="px-2 py-2 text-white">R{round.roundNumber} · {round.name}</td><td className="px-2 py-2">{round.status}</td><td className="px-2 py-2">{round.teams}</td><td className="px-2 py-2">{round.assignedStudents}</td><td className="px-2 py-2">{round.submissions}</td><td className="px-2 py-2">{round.progressClaims}</td><td className="px-2 py-2">{round.evaluations}</td><td className="px-2 py-2">{round.projects}</td></tr>)}</tbody>
        </table>
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        <div className="overflow-x-auto"><h3 className="mb-2 font-bold text-white">Branch students</h3><table className="w-full min-w-[420px] text-left text-xs"><thead className="text-slate-500"><tr><th className="px-2 py-2">ID</th><th className="px-2 py-2">Name</th><th className="px-2 py-2">Status</th><th className="px-2 py-2">Round</th></tr></thead><tbody className="divide-y divide-slate-800">{branchReport.students.map(student => <tr key={student._id}><td className="px-2 py-2 font-mono text-cyan-200">{student.arohanId}</td><td className="px-2 py-2">{student.name || '—'}</td><td className="px-2 py-2">{student.active ? student.status : 'INACTIVE'}</td><td className="px-2 py-2">{student.currentRound}</td></tr>)}</tbody></table></div>
        <div className="overflow-x-auto"><h3 className="mb-2 font-bold text-white">Team assignments</h3><table className="w-full min-w-[420px] text-left text-xs"><thead className="text-slate-500"><tr><th className="px-2 py-2">Team</th><th className="px-2 py-2">Round</th><th className="px-2 py-2">Student IDs</th></tr></thead><tbody className="divide-y divide-slate-800">{branchReport.teams.flatMap(team => team.assignments.map(assignment => <tr key={`${team._id}-${assignment.roundNumber}`}><td className="px-2 py-2 font-mono text-emerald-200">{team.loginId}</td><td className="px-2 py-2">{assignment.roundNumber}</td><td className="px-2 py-2">{(assignment.participantIds || []).join(', ') || '—'}</td></tr>))}</tbody></table></div>
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        <div className="overflow-x-auto"><h3 className="mb-2 font-bold text-white">Assigned projects</h3><table className="w-full min-w-[360px] text-left text-xs"><thead className="text-slate-500"><tr><th className="px-2 py-2">Project</th><th className="px-2 py-2">Round</th><th className="px-2 py-2">Source</th></tr></thead><tbody className="divide-y divide-slate-800">{branchReport.projects.map(project => <tr key={project._id}><td className="px-2 py-2 text-white">{project.name}</td><td className="px-2 py-2">{project.roundNumber}</td><td className="px-2 py-2">{project.githubUrl ? 'GitHub' : project.filePath ? 'ZIP' : 'No file'}</td></tr>)}</tbody></table></div>
        <div className="overflow-x-auto"><h3 className="mb-2 font-bold text-white">Submissions</h3><table className="w-full min-w-[460px] text-left text-xs"><thead className="text-slate-500"><tr><th className="px-2 py-2">Round</th><th className="px-2 py-2">Student ID</th><th className="px-2 py-2">Team</th><th className="px-2 py-2">Status</th><th className="px-2 py-2">Submitted</th></tr></thead><tbody className="divide-y divide-slate-800">{branchReport.submissions.map(submission => <tr key={submission._id}><td className="px-2 py-2">{submission.roundNumber}</td><td className="px-2 py-2 font-mono">{submission.participantId}</td><td className="px-2 py-2">{submission.teamCode || '—'}</td><td className="px-2 py-2">{submission.status}</td><td className="px-2 py-2">{new Date(submission.submittedAt).toLocaleString()}</td></tr>)}</tbody></table></div>
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        <div className="overflow-x-auto"><h3 className="mb-2 font-bold text-white">Evaluations</h3><table className="w-full min-w-[380px] text-left text-xs"><thead className="text-slate-500"><tr><th className="px-2 py-2">Round</th><th className="px-2 py-2">Team</th><th className="px-2 py-2">Marks</th><th className="px-2 py-2">Status</th></tr></thead><tbody className="divide-y divide-slate-800">{branchReport.evaluations.map((evaluation, index) => <tr key={`${evaluation.teamCode}-${evaluation.roundNumber}-${index}`}><td className="px-2 py-2">{evaluation.roundNumber}</td><td className="px-2 py-2">{evaluation.teamCode}</td><td className="px-2 py-2">{evaluation.marks}/{evaluation.maxMarks}</td><td className="px-2 py-2">{evaluation.status}</td></tr>)}</tbody></table></div>
        <div className="overflow-x-auto"><h3 className="mb-2 font-bold text-white">Team progress claims</h3><table className="w-full min-w-[360px] text-left text-xs"><thead className="text-slate-500"><tr><th className="px-2 py-2">Round</th><th className="px-2 py-2">Team</th><th className="px-2 py-2">Status</th><th className="px-2 py-2">Submitted</th></tr></thead><tbody className="divide-y divide-slate-800">{branchReport.progressClaims.map(claim => <tr key={claim._id}><td className="px-2 py-2">{claim.roundNumber}</td><td className="px-2 py-2">{claim.teamCode}</td><td className="px-2 py-2">{claim.status}</td><td className="px-2 py-2">{new Date(claim.submittedAt).toLocaleString()}</td></tr>)}</tbody></table></div>
      </div>
    </section>}
  </div>;
}
