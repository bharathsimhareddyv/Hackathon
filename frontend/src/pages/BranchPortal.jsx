import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowDownToLine, CheckCircle2, ExternalLink, FileText, GitBranch, KeyRound,
  LogOut, Pencil, Trophy, Users, UserRoundPlus
} from 'lucide-react';
import api from '../utils/api';
import { downloadProject } from '../utils/downloadProject';
import { useAuth } from '../context/AuthContext';

const sections = ['Overview', 'Students', 'Teams', 'Rounds', 'Submissions', 'Projects', 'Leaderboard'];

function downloadCsv(filename, rows) {
  const csv = rows.map(row => row.map(value => `"${String(value ?? '').replaceAll('"', '""')}"`).join(',')).join('\r\n');
  const url = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export default function BranchPortal() {
  const { user, logout, showToast } = useAuth();
  const navigate = useNavigate();
  const [section, setSection] = useState('Overview');
  const [rounds, setRounds] = useState([]);
  const [teams, setTeams] = useState([]);
  const [students, setStudents] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [claims, setClaims] = useState([]);
  const [projects, setProjects] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [leaderboardRounds, setLeaderboardRounds] = useState([]);
  const [leaderboardRound, setLeaderboardRound] = useState('all');
  const [roundNumber, setRoundNumber] = useState('');
  const [teamName, setTeamName] = useState('');
  const [startingNumber, setStartingNumber] = useState('1');
  const [teamCount, setTeamCount] = useState('1');
  const [studentStartId, setStudentStartId] = useState('AIF260001');
  const [studentEndId, setStudentEndId] = useState('AIF260010');
  const [credentials, setCredentials] = useState([]);
  const [selectedTeamId, setSelectedTeamId] = useState('');
  const [selectedStudentIds, setSelectedStudentIds] = useState(null);
  const [studentNamesInput, setStudentNamesInput] = useState('');
  const [memberLimit, setMemberLimit] = useState('4');
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [roundName, setRoundName] = useState('');
  const [roundType, setRoundType] = useState('APPLICATION');
  const [roundStart, setRoundStart] = useState('');
  const [roundEnd, setRoundEnd] = useState('');
  const [roundInstructions, setRoundInstructions] = useState('');
  const [roundMaxMarks, setRoundMaxMarks] = useState('100');
  const [working, setWorking] = useState(false);
  const [downloading, setDownloading] = useState('');
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const [roundResponse, teamResponse, studentResponse, assignmentResponse, submissionResponse, claimResponse, projectResponse, leaderboardResponse] = await Promise.all([
        api.get('/branch/rounds'),
        api.get('/branch/team-accounts'),
        api.get('/branch/students'),
        api.get('/branch/assignments'),
        api.get('/branch/submissions'),
        api.get('/branch/progress-claims'),
        api.get('/branch/projects'),
        api.get('/branch/leaderboard', { params: { roundNumber: leaderboardRound } })
      ]);
      setRounds(roundResponse.data);
      setTeams(teamResponse.data);
      setStudents(studentResponse.data);
      setAssignments(assignmentResponse.data);
      setSubmissions(submissionResponse.data);
      setClaims(claimResponse.data);
      setProjects(projectResponse.data);
      setLeaderboard(leaderboardResponse.data.leaderboard);
      setLeaderboardRounds(leaderboardResponse.data.rounds);
      setRoundNumber(current => current || String(roundResponse.data[0]?.roundNumber || ''));
      setSelectedTeamId(current => current || teamResponse.data[0]?._id || '');
    } catch (error) {
      showToast(error.response?.data?.message || 'Could not load branch data', 'error');
    } finally {
      setLoading(false);
    }
  }, [leaderboardRound, showToast]);

  useEffect(() => { refresh(); }, [refresh]);

  const selectedAssignment = useMemo(() => assignments.find(item =>
    String(item.teamAccountId?._id) === String(selectedTeamId) &&
    String(item.roundNumber) === String(roundNumber)
  ), [assignments, selectedTeamId, roundNumber]);
  const checkedStudentIds = selectedStudentIds ?? selectedAssignment?.participantIds ?? [];
  const roundProjects = projects.filter(project => String(project.roundNumber) === String(roundNumber));

  const namesForAssignment = assignment => {
    if (!assignment) return '';
    return (assignment.memberNames || []).join(', ');
  };

  const getAssignment = (teamId, round) => assignments.find(item =>
    String(item.teamAccountId?._id) === String(teamId) &&
    String(item.roundNumber) === String(round)
  );

  const namesForStudents = (ids, assignment) => ids.map(id => {
    const assignmentIndex = assignment?.participantIds?.indexOf(id) ?? -1;
    return assignmentIndex >= 0
      ? assignment.memberNames?.[assignmentIndex] || students.find(student => student.arohanId === id)?.name || ''
      : students.find(student => student.arohanId === id)?.name || '';
  }).join(', ');

  const runAction = async action => {
    setWorking(true);
    try {
      const { response, message } = await action();
      if (response?.data?.students) {
        setCredentials(response.data.students.map(item => ({ loginId: item.arohanId, password: item.temporaryPassword })));
      } else if (response?.data?.teams) {
        setCredentials(response.data.teams);
      } else if (response?.data?.temporaryPassword) {
        setCredentials([{ loginId: response.data.loginId, password: response.data.temporaryPassword }]);
      } else {
        setCredentials([]);
      }
      if (message) showToast(message, 'success');
      await refresh();
    } catch (error) {
      showToast(error.response?.data?.message || 'The requested action failed', 'error');
    } finally {
      setWorking(false);
    }
  };

  const generateTeams = event => {
    event.preventDefault();
    return runAction(async () => {
      const response = await api.post('/branch/team-accounts/bulk-generate', {
        roundNumber: Number(roundNumber),
        teamName,
        startingNumber: Number(startingNumber),
        count: Number(teamCount)
      });
      return { response, message: response.data.message };
    });
  };

  const generateStudents = event => {
    event.preventDefault();
    return runAction(async () => {
      const response = await api.post('/branch/students/generate', {
        startId: studentStartId,
        endId: studentEndId
      });
      return { response, message: response.data.message };
    });
  };

  const resetAccountPassword = (endpoint, loginId) => runAction(async () => {
    const response = await api.post(endpoint);
    return { response, message: `Password reset for ${loginId}` };
  });

  const editStudent = student => {
    const name = window.prompt(`Student name for ${student.arohanId}`, student.name || '');
    if (name === null) return;
    return runAction(async () => {
      const response = await api.put(`/branch/students/${student._id}`, { name });
      return { response, message: `Updated ${student.arohanId}` };
    });
  };

  const setStudentActive = (student, active) => {
    if (!active && !window.confirm(`Disable login for ${student.arohanId}? Submission history will be retained.`)) return;
    return runAction(async () => {
      const response = await api.put(`/branch/students/${student._id}`, { active });
      return { response, message: active ? `Enabled ${student.arohanId}` : `Disabled ${student.arohanId}` };
    });
  };

  const editTeam = team => {
    const loginId = window.prompt('Team login ID', team.loginId);
    if (loginId === null || !loginId.trim()) return;
    return runAction(async () => {
      const response = await api.put(`/branch/team-accounts/${team._id}`, { loginId });
      return { response, message: `Updated team ID to ${response.data.team.loginId}` };
    });
  };

  const setTeamActive = (team, active) => {
    if (!active && !window.confirm(`Disable ${team.loginId}? Existing assignments, marks, and submissions will be retained.`)) return;
    return runAction(async () => {
    const response = await api.put(`/branch/team-accounts/${team._id}`, { status: active ? 'ACTIVE' : 'BLOCKED' });
    return { response, message: active ? `Enabled ${team.loginId}` : `Disabled ${team.loginId}` };
    });
  };

  const approveSubmission = submission => {
    const value = window.prompt('Optional official marks (leave blank to record 0 and qualify this team)', '');
    if (value === null) return;
    return runAction(async () => {
      const response = await api.post(`/branch/submissions/${submission._id}/review`, {
        ...(value.trim() ? { marks: value.trim() } : {})
      });
      return { response, message: response.data.message };
    });
  };

  const approveProgressClaim = claim => {
    const value = window.prompt('Optional official marks (leave blank to record 0 and qualify this team)', '');
    if (value === null) return;
    return runAction(async () => {
      const response = await api.post(`/branch/progress-claims/${claim._id}/review`, {
        ...(value.trim() ? { marks: value.trim() } : {})
      });
      return { response, message: response.data.message };
    });
  };

  const downloadProgressClaim = async claim => {
    try {
      setDownloading(claim._id);
      const endpoint = `/branch/progress-claims/${claim._id}/download`;
      if (/^https?:\/\//i.test(claim.zipPath || '')) {
        const response = await api.get(endpoint);
        const link = document.createElement('a');
        link.href = response.data.downloadUrl;
        link.download = response.data.fileName || 'team-submission.zip';
        link.click();
      } else {
        const response = await api.get(endpoint, { responseType: 'blob' });
        const url = URL.createObjectURL(response.data);
        const link = document.createElement('a');
        link.href = url;
        link.download = claim.zipOriginalName || `${claim.teamCode || 'team-submission'}.zip`;
        link.click();
        window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      }
    } catch (error) {
      showToast(error.response?.data?.message || 'Team submission download failed', 'error');
    } finally {
      setDownloading('');
    }
  };

  const downloadSubmission = async submission => {
    try {
      setDownloading(submission._id);
      const endpoint = `/branch/submissions/${submission._id}/download`;
      if (/^https?:\/\//i.test(submission.zipPath || '')) {
        const response = await api.get(endpoint);
        const link = document.createElement('a');
        link.href = response.data.downloadUrl;
        link.download = response.data.fileName || 'submission.zip';
        link.click();
      } else {
        const blobResponse = await api.get(endpoint, { responseType: 'blob' });
        const url = URL.createObjectURL(blobResponse.data);
        const link = document.createElement('a');
        link.href = url;
        link.download = submission.zipOriginalName || `${submission.teamCode || 'submission'}.zip`;
        link.click();
        window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      }
    } catch (error) {
      showToast(error.response?.data?.message || 'Submission download failed', 'error');
    } finally {
      setDownloading('');
    }
  };

  const assignStudents = event => {
    event.preventDefault();
    const studentNames = studentNamesInput.split(',').map(name => name.trim());
    if (studentNames.length !== checkedStudentIds.length || studentNames.some(name => !name)) {
      showToast(`Enter exactly ${checkedStudentIds.length} comma-separated student name(s), in the order shown`, 'error');
      return;
    }
    return runAction(async () => {
      const response = await api.post(`/branch/team-accounts/${selectedTeamId}/assign-students`, {
        roundNumber: Number(roundNumber),
        participantIds: checkedStudentIds,
        studentNames,
        memberLimit: Number(memberLimit),
        projectId: selectedProjectId || null
      });
      setSelectedStudentIds(null);
      setStudentNamesInput('');
      return { response, message: response.data.message };
    });
  };

  const createRound = event => {
    event.preventDefault();
    return runAction(async () => {
      const response = await api.post('/branch/rounds', {
        name: roundName,
        type: roundType,
        startAt: roundStart ? new Date(roundStart).toISOString() : undefined,
        endAt: roundEnd ? new Date(roundEnd).toISOString() : undefined,
        instructions: roundInstructions,
        maxMarks: Number(roundMaxMarks)
      });
      setRoundName('');
      setRoundInstructions('');
      setRoundStart('');
      setRoundEnd('');
      return { response, message: `Round ${response.data.roundNumber} created` };
    });
  };

  const changeRoundStatus = (round, status) => runAction(async () => {
    const response = await api.post(`/branch/rounds/${round._id}/status`, { status });
    return { response, message: response.data.message };
  });

  const handleDownloadProject = async project => {
    setDownloading(project._id);
    try {
      await downloadProject(project, api);
    } catch (error) {
      showToast(error.response?.data?.message || 'Project download failed', 'error');
    } finally {
      setDownloading('');
    }
  };

  const toggleStudent = arohanId => {
    const currentIds = selectedStudentIds ?? selectedAssignment?.participantIds ?? [];
    const nextIds = currentIds.includes(arohanId)
      ? currentIds.filter(id => id !== arohanId)
      : [...currentIds, arohanId];
    setSelectedStudentIds(nextIds);
    setStudentNamesInput(namesForStudents(nextIds, selectedAssignment));
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  if (loading) return <main className="min-h-screen bg-[#0B0F19] p-8 text-slate-300">Loading branch workspace…</main>;

  const statCards = [
    ['Students', students.length, UserRoundPlus],
    ['Teams', teams.length, Users],
    ['Rounds', rounds.length, GitBranch],
    ['Student submissions', submissions.length, FileText]
  ];

  return <main className="min-h-screen bg-[#0B0F19] px-4 py-6 text-slate-100 sm:px-6 lg:px-8">
    <div className="mx-auto max-w-7xl space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div className="flex items-center gap-3"><GitBranch className="h-7 w-7 text-emerald-300" /><div><p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-300">Branch workspace</p><h1 className="font-outfit text-3xl font-extrabold text-white">{user?.branchName || 'Branch'}</h1><p className="mt-1 text-sm text-slate-400">Manage this branch’s students, teams, rounds, projects, and submissions.</p></div></div>
        <button onClick={handleLogout} className="flex items-center gap-2 rounded-lg border border-slate-700 px-3 py-2 text-xs font-bold text-slate-200 hover:text-rose-300"><LogOut className="h-4 w-4" />Log out</button>
      </header>

      <nav className="flex gap-2 overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/70 p-1.5" aria-label="Branch sections">
        {sections.map(item => <button key={item} onClick={() => setSection(item)} className={`shrink-0 rounded-lg px-4 py-2.5 text-xs font-bold transition ${section === item ? 'bg-emerald-700 text-white' : 'text-slate-400 hover:bg-slate-900 hover:text-white'}`}>{item}</button>)}
      </nav>

      {credentials.length > 0 && <section className="glass-panel rounded-2xl border border-amber-500/30 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-bold text-amber-100">New credentials</h2><p className="mt-1 text-xs text-amber-200/70">Download and save these passwords now. They are not shown again.</p></div>
          <button onClick={() => downloadCsv('branch-generated-credentials.csv', [['Login ID', 'Temporary password'], ...credentials.map(item => [item.loginId, item.password])])} className="rounded-lg bg-amber-700 px-3 py-2 text-xs font-bold text-white">Download CSV</button>
        </div>
        <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{credentials.map(item => <div key={item.loginId} className="rounded-lg bg-slate-950/70 p-3 font-mono text-xs"><strong className="text-cyan-200">{item.loginId}</strong><p className="mt-1 text-slate-300">{item.password}</p></div>)}</div>
      </section>}

      {section === 'Overview' && <>
        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {statCards.map(([label, value, Icon]) => <div key={label} className="glass-panel rounded-2xl border border-slate-800 p-5"><div className="flex items-center justify-between"><p className="text-xs uppercase tracking-widest text-slate-400">{label}</p><Icon className="h-4 w-4 text-emerald-300" /></div><p className="mt-2 font-outfit text-3xl font-extrabold text-white">{value}</p></div>)}
        </section>
        <section className="glass-panel rounded-2xl border border-slate-800 p-5 sm:p-6">
          <h2 className="font-bold text-white">Round activity</h2>
          <div className="mt-4 space-y-4">
            {rounds.map(round => {
              const roundTeams = assignments.filter(item => item.roundNumber === round.roundNumber);
              const roundSubmissions = submissions.filter(item => item.roundNumber === round.roundNumber);
              const ratio = Math.min(100, Math.round(roundSubmissions.length / Math.max(1, roundTeams.length) * 100));
              return <div key={round._id} className="rounded-xl bg-slate-950/70 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2"><div><h3 className="font-semibold text-white">{round.name}</h3><p className="mt-1 text-xs text-slate-400">{roundTeams.length} teams · {roundSubmissions.length} student submissions · {claims.filter(claim => claim.roundNumber === round.roundNumber).length} team progress submissions</p></div><span className="rounded-full bg-slate-800 px-2.5 py-1 text-xs text-emerald-200">{round.status}</span></div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-800"><div className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-emerald-400" style={{ width: `${ratio}%` }} /></div>
              </div>;
            })}
            {!rounds.length && <p className="text-sm text-slate-500">Create a branch round to get started.</p>}
          </div>
        </section>
      </>}

      {section === 'Students' && <section className="space-y-5">
        <div className="glass-panel rounded-2xl border border-emerald-500/20 p-5 sm:p-6">
          <h2 className="font-bold text-white">Generate branch student IDs</h2>
          <p className="mt-1 text-xs text-slate-400">New students are owned by this branch and receive generated temporary passwords.</p>
          <form onSubmit={generateStudents} className="mt-4 grid gap-3 sm:grid-cols-3">
            <label className="text-xs text-slate-300">First student ID<input value={studentStartId} onChange={event => setStudentStartId(event.target.value)} required placeholder="AIF260001" className="glass-input mt-1.5 w-full rounded-lg px-3 py-2.5 text-sm" /></label>
            <label className="text-xs text-slate-300">Last student ID<input value={studentEndId} onChange={event => setStudentEndId(event.target.value)} required placeholder="AIF260020" className="glass-input mt-1.5 w-full rounded-lg px-3 py-2.5 text-sm" /></label>
            <button disabled={working} className="mt-auto rounded-lg bg-emerald-700 px-4 py-3 text-xs font-bold text-white disabled:opacity-50">{working ? 'Generating…' : 'Generate student IDs'}</button>
          </form>
        </div>
        <DataTable title="Students in this branch" headers={['Student ID', 'Name', 'College', 'Status', 'Temporary password', 'Actions']} rows={students.map(student => [
          student.arohanId,
          student.name || '—',
          student.college || '—',
          student.active ? student.status : 'INACTIVE',
          <span key={`${student._id}-password`} className="font-mono">{student.temporaryPasswordPlain || 'Changed / not available'}</span>,
          <div key={`${student._id}-actions`} className="flex flex-wrap gap-2">
            <button onClick={() => editStudent(student)} disabled={working} className="inline-flex items-center gap-1 rounded border border-slate-700 px-2 py-1 text-xs hover:text-white"><Pencil className="h-3 w-3" />Edit</button>
            <button onClick={() => resetAccountPassword(`/branch/students/${student._id}/reset-password`, student.arohanId)} disabled={working} className="inline-flex items-center gap-1 rounded border border-cyan-800 px-2 py-1 text-xs text-cyan-200"><KeyRound className="h-3 w-3" />Reset password</button>
            <button onClick={() => setStudentActive(student, !student.active)} disabled={working} className="rounded border border-rose-900 px-2 py-1 text-xs text-rose-200">{student.active ? 'Remove login' : 'Enable login'}</button>
          </div>
        ])} />
      </section>}

      {section === 'Teams' && <section className="space-y-5">
        <div className="glass-panel rounded-2xl border border-emerald-500/20 p-5 sm:p-6">
          <h2 className="font-bold text-white">Generate branch team accounts</h2>
          <p className="mt-1 text-xs text-slate-400">Choose a custom name and sequence, for example “Team Alpha” starting at 1 creates team-alpha1, team-alpha2, and so on.</p>
          <form onSubmit={generateTeams} className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <label className="text-xs text-slate-300">Team name<input value={teamName} onChange={event => setTeamName(event.target.value)} required maxLength={40} placeholder="Team Alpha" className="glass-input mt-1.5 w-full rounded-lg px-3 py-2.5 text-sm" /></label>
            <label className="text-xs text-slate-300">Starting number<input type="number" min="1" max="999999999" value={startingNumber} onChange={event => setStartingNumber(event.target.value)} required className="glass-input mt-1.5 w-full rounded-lg px-3 py-2.5 text-sm" /></label>
            <label className="text-xs text-slate-300">Number of teams<input type="number" min="1" max="200" value={teamCount} onChange={event => setTeamCount(event.target.value)} required className="glass-input mt-1.5 w-full rounded-lg px-3 py-2.5 text-sm" /></label>
            <label className="text-xs text-slate-300">Round<select value={roundNumber} onChange={event => { setRoundNumber(event.target.value); setSelectedStudentIds(null); }} required className="glass-input mt-1.5 w-full rounded-lg px-3 py-2.5 text-sm">{rounds.map(round => <option key={round._id} value={round.roundNumber}>{round.name}</option>)}</select></label>
            <button disabled={working || !rounds.length} className="mt-auto rounded-lg bg-emerald-700 px-4 py-3 text-xs font-bold text-white disabled:opacity-50">{working ? 'Generating…' : 'Generate teams'}</button>
          </form>
        </div>
        <div className="glass-panel rounded-2xl border border-cyan-500/20 p-5 sm:p-6">
          <h2 className="font-bold text-white">Assign students to a team</h2>
          <form onSubmit={assignStudents} className="mt-4 space-y-4">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <label className="text-xs text-slate-300">Round<select value={roundNumber} onChange={event => { const nextRound = event.target.value; setRoundNumber(nextRound); setSelectedStudentIds(null); setStudentNamesInput(namesForAssignment(getAssignment(selectedTeamId, nextRound))); setSelectedProjectId(''); }} required className="glass-input mt-1.5 w-full rounded-lg px-3 py-2.5 text-sm">{rounds.map(round => <option key={round._id} value={round.roundNumber}>{round.name}</option>)}</select></label>
              <label className="text-xs text-slate-300">Team<select value={selectedTeamId} onChange={event => { const nextTeam = event.target.value; setSelectedTeamId(nextTeam); setSelectedStudentIds(null); setStudentNamesInput(namesForAssignment(getAssignment(nextTeam, roundNumber))); }} required className="glass-input mt-1.5 w-full rounded-lg px-3 py-2.5 text-sm"><option value="">Select team</option>{teams.filter(team => team.status === 'ACTIVE').map(team => <option key={team._id} value={team._id}>{team.loginId}</option>)}</select></label>
              <label className="text-xs text-slate-300">Maximum team size<input type="number" min="1" max="20" value={memberLimit} onChange={event => setMemberLimit(event.target.value)} required className="glass-input mt-1.5 w-full rounded-lg px-3 py-2.5 text-sm" /></label>
              <label className="text-xs text-slate-300">Project for this round<select value={selectedProjectId} onChange={event => setSelectedProjectId(event.target.value)} className="glass-input mt-1.5 w-full rounded-lg px-3 py-2.5 text-sm"><option value="">No project selected</option>{roundProjects.map(project => <option key={project._id} value={project._id}>{project.name}</option>)}</select></label>
            </div>
            <div className="max-h-72 overflow-y-auto rounded-xl border border-slate-800 bg-slate-950/70 p-3">
              <p className="mb-2 text-xs text-slate-400">Select students from this branch · {checkedStudentIds.length}/{memberLimit}. Name order follows the order you select.</p>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{students.filter(student => student.active).map(student => {
                const assignedTeam = assignments.find(item =>
                  Number(item.roundNumber) === Number(roundNumber) &&
                  item.participantIds?.includes(student.arohanId)
                );
                const assignedElsewhere = assignedTeam &&
                  String(assignedTeam.teamAccountId?._id) !== String(selectedTeamId);
                return <label key={student._id} className="flex items-center gap-2 rounded-lg bg-slate-900 px-3 py-2 text-xs text-slate-200">
                  <input type="checkbox" checked={checkedStudentIds.includes(student.arohanId)} onChange={() => toggleStudent(student.arohanId)} disabled={Boolean(assignedElsewhere) || (!checkedStudentIds.includes(student.arohanId) && checkedStudentIds.length >= Number(memberLimit))} className="accent-emerald-500" />
                  <span className="font-mono">{student.arohanId}</span>
                  <span className="truncate text-slate-400">{student.name || ''}</span>
                  {assignedElsewhere && <span className="shrink-0 text-amber-300">Assigned: {assignedTeam.teamAccountId?.loginId || assignedTeam.teamCode}</span>}
                </label>;
              })}</div>
              {!students.length && <p className="text-xs text-slate-500">Generate student IDs first.</p>}
            </div>
            {!!checkedStudentIds.length && <div>
              <label className="block text-xs text-slate-300">Student names, comma-separated (match this selected ID order)
                <input value={studentNamesInput} onChange={event => setStudentNamesInput(event.target.value)} required placeholder="Asha Reddy, Ravi Kumar" className="glass-input mt-1.5 w-full rounded-lg px-3 py-2.5 text-sm" />
              </label>
              <p className="mt-2 text-xs text-slate-500">{checkedStudentIds.map((id, index) => `${index + 1}. ${id}`).join('  ·  ')}</p>
            </div>}
            <button disabled={working || !selectedTeamId || !checkedStudentIds.length} className="rounded-lg bg-cyan-700 px-4 py-3 text-xs font-bold text-white disabled:opacity-50">{working ? 'Saving…' : 'Save team assignment'}</button>
          </form>
        </div>
        <DataTable title="Branch teams" headers={['Team ID', 'Round', 'Status', 'Assigned students', 'Temporary password', 'Actions']} rows={teams.map(team => {
          const teamAssignments = assignments.filter(item => String(item.teamAccountId?._id) === String(team._id));
          return [team.loginId, team.currentRound, team.status, teamAssignments.map(item => {
            const members = (item.participantIds || []).map((id, index) =>
              item.memberNames?.[index] ? `${id} (${item.memberNames[index]})` : id
            );
            return `${item.roundNumber}: ${members.join(', ') || 'none'}`;
          }).join(' · ') || 'Not assigned',
          <span key={`${team._id}-password`} className="font-mono">{team.temporaryPasswordPlain || 'Changed / not available'}</span>,
          <div key={`${team._id}-actions`} className="flex flex-wrap gap-2">
            <button onClick={() => editTeam(team)} disabled={working} className="inline-flex items-center gap-1 rounded border border-slate-700 px-2 py-1 text-xs hover:text-white"><Pencil className="h-3 w-3" />Rename</button>
            <button onClick={() => resetAccountPassword(`/branch/team-accounts/${team._id}/reset-password`, team.loginId)} disabled={working} className="inline-flex items-center gap-1 rounded border border-cyan-800 px-2 py-1 text-xs text-cyan-200"><KeyRound className="h-3 w-3" />Reset password</button>
            <button onClick={() => setTeamActive(team, team.status !== 'ACTIVE')} disabled={working} className="rounded border border-rose-900 px-2 py-1 text-xs text-rose-200">{team.status === 'ACTIVE' ? 'Remove login' : 'Enable login'}</button>
          </div>];
        })} />
      </section>}

      {section === 'Rounds' && <section className="space-y-5">
        <div className="glass-panel rounded-2xl border border-emerald-500/20 p-5 sm:p-6">
          <h2 className="font-bold text-white">Create a branch-only round</h2>
          <p className="mt-1 text-xs text-slate-400">A unique round number is assigned automatically. This round is available only to this branch’s students and teams.</p>
          <form onSubmit={createRound} className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <label className="text-xs text-slate-300">Round name<input value={roundName} onChange={event => setRoundName(event.target.value)} required maxLength={150} className="glass-input mt-1.5 w-full rounded-lg px-3 py-2.5 text-sm" /></label>
            <label className="text-xs text-slate-300">Challenge type<select value={roundType} onChange={event => setRoundType(event.target.value)} className="glass-input mt-1.5 w-full rounded-lg px-3 py-2.5 text-sm"><option value="APPLICATION">Application</option><option value="DEBUGGING">Debugging</option><option value="REACT_GITHUB">React / GitHub</option></select></label>
            <label className="text-xs text-slate-300">Maximum marks<input type="number" min="1" value={roundMaxMarks} onChange={event => setRoundMaxMarks(event.target.value)} className="glass-input mt-1.5 w-full rounded-lg px-3 py-2.5 text-sm" /></label>
            <label className="text-xs text-slate-300">Starts<input type="datetime-local" value={roundStart} onChange={event => setRoundStart(event.target.value)} className="glass-input mt-1.5 w-full rounded-lg px-3 py-2.5 text-sm" /></label>
            <label className="text-xs text-slate-300">Ends<input type="datetime-local" value={roundEnd} onChange={event => setRoundEnd(event.target.value)} className="glass-input mt-1.5 w-full rounded-lg px-3 py-2.5 text-sm" /></label>
            <label className="text-xs text-slate-300">Instructions<textarea value={roundInstructions} onChange={event => setRoundInstructions(event.target.value)} rows="2" className="glass-input mt-1.5 w-full rounded-lg px-3 py-2.5 text-sm" /></label>
            <button disabled={working} className="rounded-lg bg-emerald-700 px-4 py-3 text-xs font-bold text-white disabled:opacity-50 sm:col-span-2 lg:col-span-3">{working ? 'Creating…' : 'Create round'}</button>
          </form>
        </div>
        <section className="glass-panel rounded-2xl border border-slate-800 p-5">
          <h2 className="font-bold text-white">Round schedule and controls</h2>
          <div className="mt-4 divide-y divide-slate-800">{rounds.map(round => <div key={round._id} className="flex flex-wrap items-center justify-between gap-3 py-4">
            <div><p className="font-semibold text-white">{round.name}</p><p className="mt-1 text-xs text-slate-400">{round.type} · {new Date(round.startAt).toLocaleString()} – {new Date(round.endAt).toLocaleString()} · {round.maxMarks} marks</p></div>
            <div className="flex flex-wrap gap-2"><span className="rounded-lg bg-slate-900 px-3 py-2 text-xs text-emerald-200">{round.status}</span>{(round.status === 'SCHEDULED' || round.status === 'PAUSED') && <button onClick={() => changeRoundStatus(round, 'ACTIVE')} disabled={working} className="rounded-lg border border-emerald-800 px-3 py-2 text-xs text-emerald-200">Start</button>}{round.status === 'ACTIVE' && <button onClick={() => changeRoundStatus(round, 'PAUSED')} disabled={working} className="rounded-lg border border-amber-800 px-3 py-2 text-xs text-amber-200">Pause</button>}{round.status !== 'CLOSED' && <button onClick={() => changeRoundStatus(round, 'CLOSED')} disabled={working} className="rounded-lg border border-rose-900 px-3 py-2 text-xs text-rose-200">Close</button>}</div>
          </div>)}{!rounds.length && <p className="py-4 text-sm text-slate-500">No rounds created yet.</p>}</div>
        </section>
      </section>}

      {section === 'Submissions' && <section className="space-y-5">
        <DataTable title="Student submissions for this branch" headers={['Student', 'Round', 'Team', 'Submitted', 'Status', 'Official marks', 'Links', 'Review']} rows={submissions.map(submission => [
          <span key={`${submission._id}-student`}><strong className="block text-white">{submission.studentName || 'Name not provided'}</strong><span className="font-mono text-xs text-slate-400">{submission.participantId}</span></span>,
          submission.roundNumber,
          submission.teamCode || submission.teamId?.teamCode || '—',
          new Date(submission.submittedAt).toLocaleString(),
          submission.status,
          submission.evaluation ? `${submission.evaluation.marks} / ${submission.evaluation.maxMarks} · ${submission.evaluation.status}` : 'Not evaluated',
          <span className="flex flex-wrap gap-2" key={`${submission._id}-links`}>{submission.githubUrl && <a href={submission.githubUrl} target="_blank" rel="noreferrer" className="text-cyan-300 hover:underline">GitHub <ExternalLink className="inline h-3 w-3" /></a>}{submission.demoUrl && <a href={submission.demoUrl} target="_blank" rel="noreferrer" className="text-emerald-300 hover:underline">Demo <ExternalLink className="inline h-3 w-3" /></a>}{submission.zipPath && <button onClick={() => downloadSubmission(submission)} disabled={Boolean(downloading)} className="text-amber-200 hover:underline disabled:opacity-50">{downloading === submission._id ? 'Downloading…' : 'Download ZIP'} <ArrowDownToLine className="inline h-3 w-3" /></button>}</span>,
          <button key={`${submission._id}-review`} onClick={() => approveSubmission(submission)} disabled={working || submission.status === 'EVALUATED' || submission.evaluation?.status !== undefined && submission.evaluation.status !== 'PENDING'} className="inline-flex items-center gap-1 rounded-lg border border-emerald-800 px-2.5 py-1.5 text-xs text-emerald-200 disabled:opacity-50"><CheckCircle2 className="h-3.5 w-3.5" />{submission.status === 'EVALUATED' || submission.evaluation?.status && submission.evaluation.status !== 'PENDING' ? 'Reviewed' : 'Approve / qualify'}</button>
        ])} />
        <DataTable title="Team project submissions" headers={['Team and members', 'Round', 'Progress', 'Links / archive', 'Status', 'Submitted', 'Review']} rows={claims.map(claim => [
          <span key={`${claim._id}-members`}><strong className="block text-white">{claim.teamCode}</strong><span className="text-xs text-slate-400">{(claim.teamId?.participantIds || []).map((id, index) => `${claim.teamId?.memberNames?.[index] || 'Name not provided'} (${id})`).join(', ') || 'No students assigned'}</span></span>,
          claim.roundNumber,
          claim.claimedPercentage == null ? '—' : `${claim.claimedPercentage}%`,
          <span key={`${claim._id}-links`} className="flex flex-wrap gap-2">{claim.githubUrl && <a href={claim.githubUrl} target="_blank" rel="noreferrer" className="text-cyan-300 hover:underline">GitHub <ExternalLink className="inline h-3 w-3" /></a>}{claim.zipPath && <button onClick={() => downloadProgressClaim(claim)} disabled={Boolean(downloading)} className="text-amber-200 hover:underline disabled:opacity-50">{downloading === claim._id ? 'Downloading…' : 'Download ZIP'} <ArrowDownToLine className="inline h-3 w-3" /></button>}</span>,
          claim.status,
          new Date(claim.submittedAt).toLocaleString(),
          <button key={`${claim._id}-review`} onClick={() => approveProgressClaim(claim)} disabled={working || claim.status !== 'PENDING'} className="inline-flex items-center gap-1 rounded-lg border border-emerald-800 px-2.5 py-1.5 text-xs text-emerald-200 disabled:opacity-50"><CheckCircle2 className="h-3.5 w-3.5" />{claim.status === 'PENDING' ? 'Approve / qualify' : 'Reviewed'}</button>
        ])} />
      </section>}

      {section === 'Leaderboard' && <section className="space-y-5">
        <div className="glass-panel flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-500/20 p-5">
          <div><h2 className="flex items-center gap-2 font-bold text-white"><Trophy className="h-5 w-5 text-amber-300" />Branch leaderboard</h2><p className="mt-1 text-xs text-slate-400">Ranks your branch teams by official marks for a selected round or across all rounds.</p></div>
          <label className="text-xs text-slate-300">Leaderboard scope<select value={leaderboardRound} onChange={event => setLeaderboardRound(event.target.value)} className="glass-input ml-2 rounded-lg px-3 py-2"><option value="all">All rounds</option>{leaderboardRounds.map(round => <option key={round._id || round.roundNumber} value={round.roundNumber}>{round.name}</option>)}</select></label>
        </div>
        <DataTable title={leaderboardRound === 'all' ? 'All-round team rankings' : `Round ${leaderboardRound} team rankings`} headers={['Rank', 'Team', 'Students', 'Marks', 'Status']} rows={leaderboard.map(item => [
          `#${item.rank}`,
          item.teamCode,
          item.members.map(member => `${member.name || 'Name not provided'} (${member.arohanId})`).join(', ') || '—',
          `${item.totalMarks} / ${item.totalMaxMarks}`,
          item.finalStatus
        ])} />
      </section>}

      {section === 'Projects' && <DataTable title="Projects available to this branch" headers={['Round', 'Project', 'Description', 'Source']} rows={projects.map(project => [project.roundNumber, project.name, project.description || '—', <span key={project._id} className="flex flex-wrap gap-3">{project.githubUrl && <a href={project.githubUrl} target="_blank" rel="noreferrer" className="text-cyan-300 hover:underline">GitHub <ExternalLink className="inline h-3 w-3" /></a>}{project.filePath && <button onClick={() => handleDownloadProject(project)} disabled={Boolean(downloading)} className="text-amber-200 hover:underline disabled:opacity-50">{downloading === project._id ? 'Downloading…' : 'Download ZIP'} <ArrowDownToLine className="inline h-3 w-3" /></button>}{!project.githubUrl && !project.filePath && 'No files or links yet'}</span>])} />}
    </div>
  </main>;
}

function DataTable({ title, headers, rows }) {
  return <section className="glass-panel rounded-2xl border border-slate-800 p-5 sm:p-6">
    <h2 className="font-bold text-white">{title}</h2>
    <div className="mt-4 overflow-x-auto">
      <table className="w-full min-w-[650px] text-left text-sm">
        <thead className="text-xs uppercase text-slate-500"><tr>{headers.map(header => <th key={header} className="pb-3 pr-4">{header}</th>)}</tr></thead>
        <tbody className="divide-y divide-slate-800">
          {rows.map((row, index) => <tr key={index}>{row.map((cell, cellIndex) => <td key={cellIndex} className="py-3 pr-4 align-top text-slate-300">{cell}</td>)}</tr>)}
          {!rows.length && <tr><td colSpan={headers.length} className="py-5 text-center text-slate-500">Nothing to show yet.</td></tr>}
        </tbody>
      </table>
    </div>
  </section>;
}
