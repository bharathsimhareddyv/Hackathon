import React, { useEffect, useState } from 'react';
import { Download, Eye, EyeOff, KeyRound, Lock, Mail, Plus, RefreshCw, Send, Trash2, Unlock, Users } from 'lucide-react';
import api from '../../utils/api';
import { useAuth } from '../../context/AuthContext';

const DEFAULT_WELCOME_SUBJECT = 'Welcome to {{hackathonName}}';
const DEFAULT_WELCOME_BODY = `Welcome to {{hackathonName}}!

Your team credentials:
Team login: {{loginId}}
Password: {{password}}
Team name: {{teamName}}

Log in on the hackathon portal to download your project or clone the repository.

Good luck — Learn • Debug • Build • Innovate`;

export default function AdminTeamAccounts() {
  const { showToast } = useAuth();
  const [teams, setTeams] = useState([]);
  const [rounds, setRounds] = useState([]);
  const [roundNumber, setRoundNumber] = useState('1');
  const [memberNames, setMemberNames] = useState('');
  const [contactEmails, setContactEmails] = useState('');
  const [count, setCount] = useState(1);
  const [credentials, setCredentials] = useState([]);
  const [selected, setSelected] = useState([]);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [emailDrafts, setEmailDrafts] = useState({});
  const [showPasswords, setShowPasswords] = useState(false);
  const [welcomeSubject, setWelcomeSubject] = useState(DEFAULT_WELCOME_SUBJECT);
  const [welcomeBody, setWelcomeBody] = useState(DEFAULT_WELCOME_BODY);
  const [testEmail, setTestEmail] = useState('');

  const refresh = async () => {
    try {
      const [teamRes, roundRes, settingsRes] = await Promise.all([
        api.get('/admin/team-accounts'),
        api.get('/rounds'),
        api.get('/settings')
      ]);
      setTeams(teamRes.data);
      setRounds(roundRes.data);
      setEmailDrafts(Object.fromEntries(teamRes.data.map(team => [team._id, (team.contactEmails || []).join(', ')])));
      setWelcomeSubject(settingsRes.data.welcomeEmailSubject || DEFAULT_WELCOME_SUBJECT);
      setWelcomeBody(settingsRes.data.welcomeEmailBody || DEFAULT_WELCOME_BODY);
    } catch (err) {
      showToast(err.response?.data?.message || 'Could not load team accounts', 'error');
    } finally { setLoading(false); }
  };
  useEffect(() => { refresh(); }, []);

  const createSingle = async event => {
    event.preventDefault();
    try {
      setWorking(true);
      const response = await api.post('/admin/team-accounts/create', {
        roundNumber: Number(roundNumber),
        memberNames: memberNames.split(',').map(value => value.trim()).filter(Boolean),
        contactEmails: contactEmails.split(',').map(value => value.trim()).filter(Boolean)
      });
      setCredentials([{ loginId: response.data.account.loginId, password: response.data.temporaryPassword }]);
      setMemberNames(''); setContactEmails('');
      showToast(`Created ${response.data.account.loginId}`, 'success');
      refresh();
    } catch (err) { showToast(err.response?.data?.message || 'Could not create team', 'error'); }
    finally { setWorking(false); }
  };

  const generateMany = async () => {
    try {
      setWorking(true);
      const response = await api.post('/admin/team-accounts/bulk-generate', { count: Number(count), roundNumber: Number(roundNumber) });
      setCredentials(response.data.teams);
      showToast(response.data.message, 'success');
      refresh();
    } catch (err) { showToast(err.response?.data?.message || 'Could not generate teams', 'error'); }
    finally { setWorking(false); }
  };

  const sendWelcome = async () => {
    try {
      setWorking(true);
      const response = await api.post('/admin/team-accounts/send-welcome', {
        teamAccountIds: selected,
        subject: welcomeSubject,
        body: welcomeBody
      });
      showToast(response.data.message, 'success');
    } catch (err) { showToast(err.response?.data?.message || 'Welcome emails failed', 'error'); }
    finally { setWorking(false); }
  };

  const saveWelcomeTemplate = async () => {
    try {
      setWorking(true);
      await api.put('/settings', { welcomeEmailSubject: welcomeSubject, welcomeEmailBody: welcomeBody });
      showToast('Welcome email template saved', 'success');
    } catch (err) { showToast(err.response?.data?.message || 'Could not save email template', 'error'); }
    finally { setWorking(false); }
  };

  const sendTestEmail = async () => {
    try {
      setWorking(true);
      const response = await api.post('/admin/team-accounts/send-test', {
        to: testEmail,
        subject: welcomeSubject,
        body: welcomeBody
      });
      showToast(response.data.message, 'success');
    } catch (err) { showToast(err.response?.data?.message || 'Email provider test failed', 'error'); }
    finally { setWorking(false); }
  };

  const sendStatusEmail = async type => {
    try {
      setWorking(true);
      const response = await api.post('/admin/team-accounts/send-bulk-status', {
        teamAccountIds: selected,
        type,
        roundNumber: Number(roundNumber),
        nextRound: Number(roundNumber) + 1
      });
      showToast(response.data.message, 'success');
    } catch (err) { showToast(err.response?.data?.message || 'Could not send status emails', 'error'); }
    finally { setWorking(false); }
  };

  const updateStatus = async (team, status) => {
    try {
      await api.put(`/admin/team-accounts/${team._id}`, { status });
      showToast(`${team.loginId} marked ${status.toLowerCase()}`, 'success');
      refresh();
    } catch (err) { showToast(err.response?.data?.message || 'Could not update team status', 'error'); }
  };

  const saveEmails = async team => {
    try {
      const emails = (emailDrafts[team._id] || '').split(',').map(value => value.trim()).filter(Boolean);
      await api.put(`/admin/team-accounts/${team._id}`, { contactEmails: emails });
      showToast(`Saved contacts for ${team.loginId}`, 'success');
      refresh();
    } catch (err) { showToast(err.response?.data?.message || 'Could not save contacts', 'error'); }
  };

  const resetPassword = async team => {
    try {
      const response = await api.post(`/admin/team-accounts/${team._id}/reset-password`);
      setCredentials(current => [{ loginId: response.data.loginId, password: response.data.temporaryPassword }, ...current.filter(item => item.loginId !== response.data.loginId)]);
      showToast(`New password generated for ${team.loginId}`, 'success');
    } catch (err) { showToast(err.response?.data?.message || 'Password reset failed', 'error'); }
  };

  const downloadCsv = (filename, rows) => {
    const csv = rows.map(row => row.map(value => `"${String(value ?? '').replaceAll('"', '""')}"`).join(',')).join('\r\n');
    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  };

  const exportGeneratedCredentials = () => {
    downloadCsv('aarohan_new_team_credentials.csv', [
      ['Team login ID', 'Password', 'Members'],
      ...credentials.map(team => [team.loginId, team.password, (team.memberNames || []).join('; ')])
    ]);
  };

  const exportAllCredentials = () => {
    downloadCsv('aarohan_team_credentials.csv', [
      ['Team login ID', 'Temporary password', 'Status', 'Current round', 'Members', 'Contact emails'],
      ...teams.map(team => [
        team.loginId,
        team.temporaryPasswordPlain || 'Password changed; reset required',
        team.status,
        team.currentRound,
        (team.memberNames || []).join('; '),
        (team.contactEmails || []).join('; ')
      ])
    ]);
  };

  const deleteTeam = async team => {
    if (!window.confirm(`Delete ${team.loginId}? Its round assignments, claims, evaluations, and submissions will also be deleted.`)) return;
    try {
      const response = await api.delete(`/admin/team-accounts/${team._id}`);
      setSelected(current => current.filter(id => id !== team._id));
      showToast(response.data.message, 'success');
      refresh();
    } catch (err) { showToast(err.response?.data?.message || 'Could not delete team', 'error'); }
  };

  return <div className="space-y-7">
    <header><p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-300">Access and invitations</p><h1 className="mt-1 font-outfit text-3xl font-extrabold text-white">Team accounts</h1><p className="mt-2 text-sm text-slate-400">Create randomized team IDs, assign rounds, manage contact emails, and send welcome details in bulk.</p></header>
    <div className="grid gap-6 xl:grid-cols-2">
      <section className="glass-panel rounded-2xl border border-emerald-500/20 p-5 sm:p-6">
        <h2 className="flex items-center gap-2 font-bold text-white"><Plus className="h-4 w-4 text-emerald-300" /> Create a team account</h2>
        <form onSubmit={createSingle} className="mt-5 space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-xs text-slate-300">Assign to round<select value={roundNumber} onChange={event => setRoundNumber(event.target.value)} className="glass-input mt-1.5 w-full rounded-lg px-3 py-2.5 text-sm">{rounds.map(round => <option key={round._id} value={round.roundNumber}>Round {round.roundNumber} · {round.name}</option>)}</select></label>
            <label className="text-xs text-slate-300">Member names<input value={memberNames} onChange={event => setMemberNames(event.target.value)} placeholder="Comma-separated names" className="glass-input mt-1.5 w-full rounded-lg px-3 py-2.5 text-sm" /></label>
          </div>
          <label className="block text-xs text-slate-300">Contact emails<input type="text" value={contactEmails} onChange={event => setContactEmails(event.target.value)} placeholder="student@example.org, teammate@example.org" className="glass-input mt-1.5 w-full rounded-lg px-3 py-2.5 text-sm" /></label>
          <button disabled={working || !rounds.length} className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-emerald-500 disabled:opacity-50"><Plus className="h-4 w-4" />Create team and generate password</button>
        </form>
      </section>
      <section className="glass-panel rounded-2xl border border-slate-800 p-5 sm:p-6">
        <h2 className="flex items-center gap-2 font-bold text-white"><Users className="h-4 w-4 text-cyan-300" /> Generate teams in bulk</h2>
        <p className="mt-2 text-xs leading-5 text-slate-400">Bulk-created accounts receive unique IDs and passwords. Add team email addresses in the accounts list before sending invitations.</p>
        <div className="mt-5 grid gap-3 sm:grid-cols-[1fr_2fr]">
          <label className="text-xs text-slate-300">Number of teams<input type="number" min="1" max="200" value={count} onChange={event => setCount(event.target.value)} className="glass-input mt-1.5 w-full rounded-lg px-3 py-2.5 text-sm" /></label>
          <button onClick={generateMany} disabled={working || !rounds.length} className="mt-auto flex items-center justify-center gap-2 rounded-lg border border-cyan-700 bg-cyan-950/60 px-4 py-2.5 text-xs font-bold text-cyan-200 hover:bg-cyan-900 disabled:opacity-50"><RefreshCw className="h-4 w-4" />Generate randomized team IDs</button>
        </div>
      </section>
    </div>

    {credentials.length > 0 && <section className="glass-panel rounded-2xl border border-amber-500/30 p-5"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="flex items-center gap-2 font-bold text-amber-100"><KeyRound className="h-4 w-4" /> Newly generated credentials</h2><p className="mt-1 text-xs text-amber-200/70">Download this batch as an Excel-compatible CSV for distribution.</p></div><button onClick={exportGeneratedCredentials} className="flex items-center gap-2 rounded-lg bg-amber-700 px-3 py-2 text-xs font-bold text-white hover:bg-amber-600"><Download className="h-4 w-4" />Download CSV</button></div><div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{credentials.map(item => <div key={item.loginId} className="rounded-lg bg-slate-950/70 p-3 font-mono text-xs"><strong className="text-cyan-200">{item.loginId}</strong><p className="mt-1 text-slate-300">{item.password}</p></div>)}</div></section>}

    <section className="glass-panel rounded-2xl border border-cyan-800/60 p-5 sm:p-6">
      <div className="flex items-center gap-2"><Mail className="h-4 w-4 text-cyan-300" /><h2 className="font-bold text-white">Welcome email format</h2></div>
      <p className="mt-1 text-xs text-slate-400">Messages are sent from the Gmail account connected to the backend. Placeholders: {'{{hackathonName}}'}, {'{{teamName}}'}, {'{{loginId}}'}, {'{{password}}'}.</p>
      <div className="mt-4 grid gap-4">
        <label className="text-xs text-slate-300">Subject<input value={welcomeSubject} maxLength={200} onChange={event => setWelcomeSubject(event.target.value)} className="glass-input mt-1.5 w-full rounded-lg px-3 py-2.5 text-sm" /></label>
        <label className="text-xs text-slate-300">Message<textarea value={welcomeBody} maxLength={10000} rows={8} onChange={event => setWelcomeBody(event.target.value)} className="glass-input mt-1.5 w-full rounded-lg px-3 py-2.5 text-sm" /></label>
      </div>
      <div className="mt-4 flex flex-col gap-3 border-t border-slate-800 pt-4 sm:flex-row sm:items-end">
        <label className="min-w-0 flex-1 text-xs text-slate-300">Send test to<input type="email" value={testEmail} onChange={event => setTestEmail(event.target.value)} placeholder="you@example.com" className="glass-input mt-1.5 w-full rounded-lg px-3 py-2.5 text-sm" /></label>
        <button onClick={saveWelcomeTemplate} disabled={working || !welcomeSubject.trim() || !welcomeBody.trim()} className="rounded-lg border border-slate-700 px-4 py-2.5 text-xs font-bold text-slate-200 disabled:opacity-40">Save format</button>
        <button onClick={sendTestEmail} disabled={working || !testEmail.trim() || !welcomeSubject.trim() || !welcomeBody.trim()} className="flex items-center justify-center gap-2 rounded-lg bg-cyan-700 px-4 py-2.5 text-xs font-bold text-white disabled:opacity-40"><Send className="h-4 w-4" />Verify and send test</button>
      </div>
    </section>

    <section className="glass-panel rounded-2xl border border-slate-800 p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4"><div><h2 className="font-bold text-white">Created accounts</h2><p className="mt-1 text-xs text-slate-500">{teams.length} teams · select teams to send messages or results</p></div><div className="flex flex-wrap gap-2"><button onClick={() => setShowPasswords(value => !value)} className="flex items-center gap-2 rounded-lg border border-slate-700 px-3 py-2 text-xs font-bold text-slate-200">{showPasswords ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}{showPasswords ? 'Hide passwords' : 'Show passwords'}</button><button onClick={exportAllCredentials} disabled={!teams.length} className="flex items-center gap-2 rounded-lg border border-amber-700 px-3 py-2 text-xs font-bold text-amber-100 disabled:opacity-40"><Download className="h-4 w-4" />Excel-compatible CSV</button><button onClick={sendWelcome} disabled={!selected.length || working} className="flex items-center gap-2 rounded-lg bg-emerald-700 px-3 py-2 text-xs font-bold text-white disabled:opacity-40"><Send className="h-4 w-4" />Welcome · {selected.length}</button><button onClick={() => sendStatusEmail('qualified')} disabled={!selected.length || working} className="rounded-lg border border-cyan-700 px-3 py-2 text-xs font-bold text-cyan-200 disabled:opacity-40">Qualified · {selected.length}</button><button onClick={() => sendStatusEmail('eliminated')} disabled={!selected.length || working} className="rounded-lg border border-rose-800 px-3 py-2 text-xs font-bold text-rose-200 disabled:opacity-40">Eliminated · {selected.length}</button></div></div>
      {loading ? <p className="py-8 text-center text-sm text-slate-500">Loading accounts…</p> : <div className="mt-3 divide-y divide-slate-800">{teams.map(team => <article key={team._id} className="grid gap-3 py-4 md:grid-cols-[auto_1fr_2fr_auto_auto] md:items-center"><input type="checkbox" aria-label={`Select ${team.loginId}`} checked={selected.includes(team._id)} onChange={event => setSelected(current => event.target.checked ? [...current, team._id] : current.filter(id => id !== team._id))} className="h-4 w-4 accent-emerald-500" /><div><p className="font-mono font-bold text-cyan-200">{team.loginId}</p><p className="mt-1 text-[11px] text-slate-500">Round {team.currentRound} · {team.status}</p>{showPasswords && <p className="mt-1 break-all font-mono text-xs text-amber-200">{team.temporaryPasswordPlain || 'Password changed; reset to generate a new one'}</p>}</div><label className="relative block"><Mail className="absolute left-3 top-3 h-3.5 w-3.5 text-slate-500" /><input value={emailDrafts[team._id] || ''} onChange={event => setEmailDrafts(current => ({ ...current, [team._id]: event.target.value }))} placeholder="Add emails separated by commas" className="glass-input w-full rounded-lg py-2 pl-9 pr-3 text-xs" /></label><div className="flex flex-wrap gap-2"><button onClick={() => saveEmails(team)} className="rounded-lg border border-slate-700 px-3 py-2 text-[11px] font-semibold text-slate-300 hover:border-emerald-600">Save email</button><button onClick={() => resetPassword(team)} title="Generate a new password" aria-label={`Reset ${team.loginId} password`} className="rounded-lg border border-slate-700 p-2 text-slate-300 hover:border-amber-500 hover:text-amber-200"><KeyRound className="h-4 w-4" /></button><button onClick={() => updateStatus(team, team.status === 'BLOCKED' ? 'ACTIVE' : 'BLOCKED')} title={team.status === 'BLOCKED' ? 'Unblock team' : 'Block team'} aria-label={team.status === 'BLOCKED' ? `Unblock ${team.loginId}` : `Block ${team.loginId}`} className="rounded-lg border border-slate-700 p-2 text-slate-300 hover:border-amber-500 hover:text-amber-200">{team.status === 'BLOCKED' ? <Unlock className="h-4 w-4" /> : <Lock className="h-4 w-4" />}</button><button onClick={() => deleteTeam(team)} title="Delete team account and related data" aria-label={`Delete ${team.loginId}`} className="rounded-lg border border-rose-900 p-2 text-rose-300 hover:bg-rose-950"><Trash2 className="h-4 w-4" /></button></div><select aria-label={`Status for ${team.loginId}`} value={team.status} onChange={event => updateStatus(team, event.target.value)} className="glass-input rounded-lg px-2 py-2 text-[11px]"><option value="ACTIVE">Active</option><option value="BLOCKED">Blocked</option><option value="ELIMINATED">Eliminated</option><option value="DISQUALIFIED">Disqualified</option><option value="QUALIFIED_PENDING">Pending review</option></select></article>)}</div>}
    </section>
  </div>;
}
