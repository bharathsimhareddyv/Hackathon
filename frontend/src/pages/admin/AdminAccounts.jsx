import React, { useEffect, useState } from 'react';
import { ShieldCheck, UserPlus } from 'lucide-react';
import api from '../../utils/api';
import { useAuth } from '../../context/AuthContext';

export default function AdminAccounts() {
  const { showToast } = useAuth();
  const [admins, setAdmins] = useState([]);
  const [username, setUsername] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [saving, setSaving] = useState(false);

  const refresh = async () => {
    try { const response = await api.get('/admin/accounts'); setAdmins(response.data); }
    catch (err) { showToast(err.response?.data?.message || 'Could not load admin accounts', 'error'); }
  };
  useEffect(() => { refresh(); }, []);

  const createAdmin = async event => {
    event.preventDefault();
    setSaving(true);
    try {
      await api.post('/admin/accounts', { username, name, email, password });
      showToast('Admin account created', 'success');
      setUsername(''); setName(''); setEmail(''); setPassword('');
      refresh();
    } catch (err) { showToast(err.response?.data?.message || 'Could not create admin account', 'error'); }
    finally { setSaving(false); }
  };

  return <div className="space-y-6">
    <header><p className="text-xs font-bold uppercase tracking-[0.2em] text-cyan-300">Organizer access</p><h1 className="mt-1 font-outfit text-3xl font-extrabold text-white">Admin accounts</h1><p className="mt-2 text-sm text-slate-400">Create another organizer login so they can monitor rounds, teams, and submissions.</p></header>
    <section className="glass-panel max-w-3xl rounded-2xl border border-cyan-500/20 p-5 sm:p-7">
      <h2 className="flex items-center gap-2 font-bold text-white"><UserPlus className="h-4 w-4 text-cyan-300" />Add an administrator</h2>
      <form onSubmit={createAdmin} className="mt-5 grid gap-4 sm:grid-cols-2">
        <label className="text-xs text-slate-300">Display name<input value={name} onChange={event => setName(event.target.value)} className="glass-input mt-1.5 w-full rounded-lg px-3 py-2.5 text-sm" /></label>
        <label className="text-xs text-slate-300">Username<input value={username} onChange={event => setUsername(event.target.value)} required autoComplete="off" className="glass-input mt-1.5 w-full rounded-lg px-3 py-2.5 text-sm" /></label>
        <label className="text-xs text-slate-300">Email<input type="email" value={email} onChange={event => setEmail(event.target.value)} required className="glass-input mt-1.5 w-full rounded-lg px-3 py-2.5 text-sm" /></label>
        <label className="text-xs text-slate-300">Temporary password<input type="password" minLength="8" value={password} onChange={event => setPassword(event.target.value)} required className="glass-input mt-1.5 w-full rounded-lg px-3 py-2.5 text-sm" /></label>
        <button disabled={saving} className="flex items-center justify-center gap-2 rounded-lg bg-cyan-700 px-4 py-3 text-xs font-bold text-white hover:bg-cyan-600 disabled:opacity-50 sm:col-span-2"><UserPlus className="h-4 w-4" />{saving ? 'Creating…' : 'Create admin account'}</button>
      </form>
    </section>
    <section className="glass-panel max-w-3xl rounded-2xl border border-slate-800 p-5 sm:p-7">
      <h2 className="font-bold text-white">Administrators</h2>
      <div className="mt-3 divide-y divide-slate-800">{admins.map(admin => <div key={admin._id} className="flex items-center gap-3 py-4"><ShieldCheck className="h-5 w-5 text-emerald-300" /><div><p className="font-semibold text-white">{admin.name || admin.username}</p><p className="mt-1 text-xs text-slate-400">{admin.username} · {admin.email}</p></div></div>)}</div>
    </section>
  </div>;
}
