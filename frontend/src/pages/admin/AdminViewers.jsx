import React, { useCallback, useEffect, useState } from 'react';
import { Eye, KeyRound, Plus, Save, UserRound, X } from 'lucide-react';
import api from '../../utils/api';
import { useAuth } from '../../context/AuthContext';

const defaultForm = {
  name: '',
  username: '',
  password: '',
  roundNumbers: [],
  allBranches: true,
  branchIds: [],
  permissions: { roundProgress: true, branchStatistics: true, branchAverages: true }
};

export default function AdminViewers() {
  const { showToast } = useAuth();
  const [viewers, setViewers] = useState([]);
  const [rounds, setRounds] = useState([]);
  const [branches, setBranches] = useState([]);
  const [form, setForm] = useState(defaultForm);
  const [editingId, setEditingId] = useState('');
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState('');
  const [resetCredentials, setResetCredentials] = useState(null);

  const applyResponse = useCallback(data => {
    setViewers(data.viewers);
    setRounds(data.rounds);
    setBranches(data.branches);
    setForm(current => current.roundNumbers.length ? current : {
      ...current,
      roundNumbers: data.rounds.map(round => round.roundNumber)
    });
  }, []);

  const refresh = useCallback(async () => {
    try {
      const response = await api.get('/viewers/admin');
      applyResponse(response.data);
    } catch (error) {
      showToast(error.response?.data?.message || 'Could not load viewer access', 'error');
    }
  }, [applyResponse, showToast]);

  useEffect(() => {
    let active = true;
    api.get('/viewers/admin').then(response => {
      if (active) applyResponse(response.data);
    }).catch(error => {
      if (active) showToast(error.response?.data?.message || 'Could not load viewer access', 'error');
    });
    return () => { active = false; };
  }, [applyResponse, showToast]);

  const startNew = () => {
    setEditingId('');
    setForm({
      ...defaultForm,
      roundNumbers: rounds.map(round => round.roundNumber)
    });
    setResetCredentials(null);
  };

  const editViewer = viewer => {
    setEditingId(viewer._id);
    setForm({
      name: viewer.name,
      username: viewer.username,
      password: '',
      roundNumbers: viewer.roundNumbers,
      allBranches: viewer.allBranches,
      branchIds: viewer.branchIds.map(branch => String(branch._id || branch)),
      permissions: { ...viewer.permissions }
    });
    setResetCredentials(null);
  };

  const toggleRound = number => setForm(current => ({
    ...current,
    roundNumbers: current.roundNumbers.includes(number)
      ? current.roundNumbers.filter(item => item !== number)
      : [...current.roundNumbers, number]
  }));

  const toggleBranch = id => setForm(current => ({
    ...current,
    branchIds: current.branchIds.includes(id)
      ? current.branchIds.filter(item => item !== id)
      : [...current.branchIds, id]
  }));

  const saveViewer = async event => {
    event.preventDefault();
    setSaving(true);
    try {
      if (editingId) {
        await api.put(`/viewers/admin/${editingId}`, form);
        showToast('Viewer access updated', 'success');
      } else {
        await api.post('/viewers/admin', form);
        showToast('Viewer account created', 'success');
      }
      startNew();
      await refresh();
    } catch (error) {
      showToast(error.response?.data?.message || 'Could not save viewer settings', 'error');
    } finally {
      setSaving(false);
    }
  };

  const resetPassword = async viewer => {
    setBusyId(viewer._id);
    try {
      const response = await api.post(`/viewers/admin/${viewer._id}/reset-password`);
      setResetCredentials({ name: viewer.name, ...response.data });
      showToast(`Password reset for ${viewer.name}`, 'success');
    } catch (error) {
      showToast(error.response?.data?.message || 'Could not reset viewer password', 'error');
    } finally {
      setBusyId('');
    }
  };

  const setLoginEnabled = async viewer => {
    setBusyId(viewer._id);
    try {
      const response = viewer.loginEnabled
        ? await api.delete(`/viewers/admin/${viewer._id}`)
        : await api.post(`/viewers/admin/${viewer._id}/enable`);
      showToast(response.data.message, 'success');
      await refresh();
    } catch (error) {
      showToast(error.response?.data?.message || 'Could not update viewer login', 'error');
    } finally {
      setBusyId('');
    }
  };

  const permissionOptions = [
    ['roundProgress', 'Round progress details', 'Team status, student names and Aarohan IDs, branch, submissions, claims, and evaluation.'],
    ['branchStatistics', 'Branch statistics and graphs', 'Team/student counts, submission progress, evaluated teams, and qualified teams.'],
    ['branchAverages', 'Branch averages and highest branch', 'Average marks, average score percentage, qualification rate, and top branch per round.']
  ];

  return <div className="space-y-6">
    <header className="flex flex-wrap items-end justify-between gap-3">
      <div><p className="text-xs font-bold uppercase tracking-[0.2em] text-cyan-300">Read-only access control</p><h1 className="mt-1 font-outfit text-3xl font-extrabold text-white">Viewer accounts</h1><p className="mt-2 text-sm text-slate-400">Create named viewer logins and control the exact rounds, branches, and statistics each account can access.</p></div>
      <button type="button" onClick={startNew} className="inline-flex items-center gap-2 rounded-lg border border-cyan-700 px-3 py-2 text-sm font-bold text-cyan-200"><Plus className="h-4 w-4" />New viewer</button>
    </header>

    <section className="glass-panel rounded-2xl border border-cyan-500/20 p-5 sm:p-7">
      <h2 className="flex items-center gap-2 font-bold text-white"><UserRound className="h-4 w-4 text-cyan-300" />{editingId ? 'Edit viewer access' : 'Create viewer login'}</h2>
      <form onSubmit={saveViewer} className="mt-5 space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-xs text-slate-300">Viewer name
            <input value={form.name} onChange={event => setForm(current => ({ ...current, name: event.target.value }))} maxLength={100} required className="glass-input mt-1.5 w-full rounded-lg px-3 py-2.5 text-sm" />
          </label>
          <label className="text-xs text-slate-300">Login username
            <input value={form.username} onChange={event => setForm(current => ({ ...current, username: event.target.value }))} maxLength={50} autoComplete="off" required className="glass-input mt-1.5 w-full rounded-lg px-3 py-2.5 text-sm" />
          </label>
          {!editingId && <label className="text-xs text-slate-300 sm:col-span-2">Password (at least 8 characters)
            <input type="password" value={form.password} onChange={event => setForm(current => ({ ...current, password: event.target.value }))} minLength={8} autoComplete="new-password" required className="glass-input mt-1.5 w-full rounded-lg px-3 py-2.5 text-sm" />
          </label>}
        </div>

        <fieldset>
          <legend className="text-xs font-bold uppercase tracking-wider text-slate-300">Rounds this viewer can see</legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {rounds.map(round => <label key={round.roundNumber} className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-xs ${form.roundNumbers.includes(round.roundNumber) ? 'border-cyan-700 bg-cyan-950/40 text-cyan-100' : 'border-slate-800 text-slate-400'}`}>
              <input type="checkbox" checked={form.roundNumbers.includes(round.roundNumber)} onChange={() => toggleRound(round.roundNumber)} />
              Round {round.roundNumber}: {round.name}
            </label>)}
            {!rounds.length && <p className="text-xs text-amber-300">Create rounds before assigning viewer access.</p>}
          </div>
        </fieldset>

        <fieldset>
          <legend className="text-xs font-bold uppercase tracking-wider text-slate-300">Branch scope</legend>
          <div className="mt-2 flex flex-wrap gap-3">
            <label className="flex items-center gap-2 text-sm text-slate-200"><input type="radio" checked={form.allBranches} onChange={() => setForm(current => ({ ...current, allBranches: true, branchIds: [] }))} />All branches</label>
            <label className="flex items-center gap-2 text-sm text-slate-200"><input type="radio" checked={!form.allBranches} onChange={() => setForm(current => ({ ...current, allBranches: false }))} />Only selected branches</label>
          </div>
          {!form.allBranches && <div className="mt-3 flex flex-wrap gap-2">
            {branches.map(branch => <label key={branch._id} className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-xs ${form.branchIds.includes(branch._id) ? 'border-indigo-700 bg-indigo-950/40 text-indigo-100' : 'border-slate-800 text-slate-400'}`}>
              <input type="checkbox" checked={form.branchIds.includes(branch._id)} onChange={() => toggleBranch(branch._id)} />{branch.name}
            </label>)}
            {!branches.length && <p className="text-xs text-amber-300">There are no branches to select.</p>}
          </div>}
        </fieldset>

        <fieldset>
          <legend className="text-xs font-bold uppercase tracking-wider text-slate-300">Viewer permissions</legend>
          <div className="mt-2 grid gap-2 lg:grid-cols-3">
            {permissionOptions.map(([key, title, description]) => <label key={key} className="flex cursor-pointer gap-3 rounded-xl border border-slate-800 bg-slate-950/50 p-3">
              <input type="checkbox" checked={form.permissions[key]} onChange={event => setForm(current => ({ ...current, permissions: { ...current.permissions, [key]: event.target.checked } }))} />
              <span><strong className="block text-xs text-white">{title}</strong><span className="mt-1 block text-[11px] leading-relaxed text-slate-500">{description}</span></span>
            </label>)}
          </div>
        </fieldset>

        <div className="flex flex-wrap gap-2">
          <button disabled={saving || !rounds.length} className="inline-flex items-center gap-2 rounded-lg bg-cyan-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-cyan-600 disabled:opacity-50"><Save className="h-4 w-4" />{saving ? 'Saving…' : editingId ? 'Save viewer access' : 'Create viewer'}</button>
          {editingId && <button type="button" onClick={startNew} className="inline-flex items-center gap-2 rounded-lg border border-slate-700 px-4 py-2.5 text-sm text-slate-300"><X className="h-4 w-4" />Cancel edit</button>}
        </div>
      </form>
    </section>

    {resetCredentials && <section className="rounded-xl border border-amber-500/30 bg-amber-950/20 p-4">
      <div className="flex items-start justify-between gap-4"><div><h2 className="font-bold text-amber-100">Temporary password · {resetCredentials.name}</h2><p className="mt-1 text-xs text-amber-200/70">Share it securely with the viewer.</p></div><button onClick={() => setResetCredentials(null)} className="text-xs text-slate-400 hover:text-white">Dismiss</button></div>
      <p className="mt-3 rounded-lg bg-slate-950 p-3 font-mono text-sm text-cyan-200">{resetCredentials.username}: {resetCredentials.temporaryPassword}</p>
    </section>}

    <section className="glass-panel rounded-2xl border border-slate-800 p-5 sm:p-7">
      <h2 className="font-bold text-white">Viewer accounts and current access</h2>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[900px] text-left text-sm">
          <thead className="text-xs uppercase text-slate-500"><tr><th className="pb-3">Viewer</th><th className="pb-3">Rounds</th><th className="pb-3">Branches</th><th className="pb-3">Permissions</th><th className="pb-3">Actions</th></tr></thead>
          <tbody className="divide-y divide-slate-800">{viewers.map(viewer => <tr key={viewer._id}>
            <td className="py-3"><strong className="text-white">{viewer.name}</strong><p className="mt-1 text-xs text-slate-500">{viewer.username} · {viewer.loginEnabled ? 'Enabled' : 'Disabled'}</p></td>
            <td className="py-3 text-xs text-slate-300">{viewer.roundNumbers.map(number => `R${number}`).join(', ') || 'None'}</td>
            <td className="py-3 text-xs text-slate-300">{viewer.allBranches ? 'All branches' : `${viewer.branchIds.length} selected`}</td>
            <td className="py-3 text-xs text-slate-400">{permissionOptions.filter(([key]) => viewer.permissions[key]).map(([, title]) => title).join(', ') || 'No permissions'}</td>
            <td className="py-3"><div className="flex flex-wrap gap-2">
              <button onClick={() => editViewer(viewer)} className="rounded-lg border border-cyan-800 px-2.5 py-2 text-xs font-semibold text-cyan-200">Edit access</button>
              <button onClick={() => resetPassword(viewer)} disabled={Boolean(busyId)} className="inline-flex items-center gap-1 rounded-lg border border-amber-800 px-2.5 py-2 text-xs font-semibold text-amber-200 disabled:opacity-50"><KeyRound className="h-3.5 w-3.5" />Reset password</button>
              <button onClick={() => setLoginEnabled(viewer)} disabled={Boolean(busyId)} className={`rounded-lg border px-2.5 py-2 text-xs font-semibold disabled:opacity-50 ${viewer.loginEnabled ? 'border-rose-900 text-rose-200' : 'border-emerald-800 text-emerald-200'}`}>{viewer.loginEnabled ? 'Disable login' : 'Enable login'}</button>
            </div></td>
          </tr>)}</tbody>
        </table>
        {!viewers.length && <p className="py-6 text-sm text-slate-500">No viewer logins created yet.</p>}
      </div>
      <p className="mt-4 flex items-center gap-2 text-xs text-slate-500"><Eye className="h-3.5 w-3.5" />Viewers can only read assigned dashboard data; changing permissions takes effect on their next data request.</p>
    </section>
  </div>;
}
