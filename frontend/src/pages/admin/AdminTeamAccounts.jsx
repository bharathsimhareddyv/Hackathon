import React, { useEffect, useState } from 'react';
import { KeyRound, Mail, Plus, RefreshCw, Send, Users } from 'lucide-react';
import api from '../../utils/api';
import { useAuth } from '../../context/AuthContext';

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

  const refresh = async () => {
    try {
      const [teamRes, roundRes] = await Promise.all([api.get('/admin/team-accounts'), api.get('/rounds')]);
      setTeams(teamRes.data);
      setRounds(roundRes.data);
      setEmailDrafts(Object.fromEntries(teamRes.data.map(team => [team._id, (team.contactEmails || []).join(', ')])));
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
      const response = await api.post('/admin/team-accounts/send-welcome', { teamAccountIds: selected });
      showToast(response.data.message, 'success');
    } catch (err) { showToast(err.response?.data?.message || 'Welcome emails failed', 'error'); }
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

    {credentials.length > 0 && <section className="glass-panel rounded-2xl border border-amber-500/30 p-5"><h2 className="flex items-center gap-2 font-bold text-amber-100"><KeyRound className="h-4 w-4" /> Newly generated credentials</h2><p className="mt-1 text-xs text-amber-200/70">Copy these credentials into your invitation. Passwords are shown only for this generated batch.</p><div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{credentials.map(item => <div key={item.loginId} className="rounded-lg bg-slate-950/70 p-3 font-mono text-xs"><strong className="text-cyan-200">{item.loginId}</strong><p className="mt-1 text-slate-300">{item.password}</p></div>)}</div></section>}

    <section className="glass-panel rounded-2xl border border-slate-800 p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4"><div><h2 className="font-bold text-white">Created accounts</h2><p className="mt-1 text-xs text-slate-500">{teams.length} teams · select teams to send messages or results</p></div><div className="flex flex-wrap gap-2"><button onClick={sendWelcome} disabled={!selected.length || working} className="flex items-center gap-2 rounded-lg bg-emerald-700 px-3 py-2 text-xs font-bold text-white disabled:opacity-40"><Send className="h-4 w-4" />Welcome · {selected.length}</button><button onClick={() => sendStatusEmail('qualified')} disabled={!selected.length || working} className="rounded-lg border border-cyan-700 px-3 py-2 text-xs font-bold text-cyan-200 disabled:opacity-40">Qualified · {selected.length}</button><button onClick={() => sendStatusEmail('eliminated')} disabled={!selected.length || working} className="rounded-lg border border-rose-800 px-3 py-2 text-xs font-bold text-rose-200 disabled:opacity-40">Eliminated · {selected.length}</button></div></div>
      {loading ? <p className="py-8 text-center text-sm text-slate-500">Loading accounts…</p> : <div className="mt-3 divide-y divide-slate-800">{teams.map(team => <article key={team._id} className="grid gap-3 py-4 md:grid-cols-[auto_1fr_2fr_auto_auto] md:items-center"><input type="checkbox" aria-label={`Select ${team.loginId}`} checked={selected.includes(team._id)} onChange={event => setSelected(current => event.target.checked ? [...current, team._id] : current.filter(id => id !== team._id))} className="h-4 w-4 accent-emerald-500" /><div><p className="font-mono font-bold text-cyan-200">{team.loginId}</p><p className="mt-1 text-[11px] text-slate-500">Round {team.currentRound}</p></div><label className="relative block"><Mail className="absolute left-3 top-3 h-3.5 w-3.5 text-slate-500" /><input value={emailDrafts[team._id] || ''} onChange={event => setEmailDrafts(current => ({ ...current, [team._id]: event.target.value }))} placeholder="Add emails separated by commas" className="glass-input w-full rounded-lg py-2 pl-9 pr-3 text-xs" /></label><div className="flex gap-2"><button onClick={() => saveEmails(team)} className="rounded-lg border border-slate-700 px-3 py-2 text-[11px] font-semibold text-slate-300 hover:border-emerald-600">Save email</button><button onClick={() => resetPassword(team)} title="Generate a new password" className="rounded-lg border border-slate-700 p-2 text-slate-300 hover:border-amber-500 hover:text-amber-200"><KeyRound className="h-4 w-4" /></button></div><select aria-label={`Status for ${team.loginId}`} value={team.status} onChange={event => updateStatus(team, event.target.value)} className="glass-input rounded-lg px-2 py-2 text-[11px]"><option value="ACTIVE">Active</option><option value="ELIMINATED">Eliminated</option><option value="DISQUALIFIED">Disqualified</option><option value="QUALIFIED_PENDING">Pending review</option></select></article>)}</div>}
    </section>
  </div>;
}
