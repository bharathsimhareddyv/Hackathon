import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, KeyRound, Users } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function TeamLogin() {
  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { teamLogin } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setLoading(true);
    try {
      await teamLogin(loginId, password);
      navigate('/team/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to sign in with those team credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-[#0B0F19] px-4 py-12 text-white">
      <section className="w-full max-w-md glass-panel rounded-3xl border border-emerald-500/20 p-8 shadow-2xl">
        <Link to="/" className="text-xs text-slate-400 hover:text-emerald-300">← AAROHAN home</Link>
        <div className="mt-8 mb-7">
          <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl border border-emerald-500/30 bg-emerald-950/60 text-emerald-300">
            <Users className="h-6 w-6" />
          </div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-300">Team workspace</p>
          <h1 className="mt-2 font-outfit text-3xl font-extrabold">Welcome back</h1>
          <p className="mt-2 text-sm text-slate-400">Sign in with the team ID and password shared by your organizer.</p>
        </div>
        {error && <p role="alert" className="mb-5 rounded-xl border border-rose-700 bg-rose-950/50 p-3 text-sm text-rose-200">{error}</p>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block text-xs font-semibold text-slate-300">Team login ID
            <input value={loginId} onChange={event => setLoginId(event.target.value)} autoComplete="username" required placeholder="aarohan-team1" className="glass-input mt-2 w-full rounded-xl px-4 py-3 text-sm" />
          </label>
          <label className="block text-xs font-semibold text-slate-300">Password
            <span className="relative mt-2 block">
              <KeyRound className="absolute left-3 top-3.5 h-4 w-4 text-slate-500" />
              <input type="password" value={password} onChange={event => setPassword(event.target.value)} autoComplete="current-password" required className="glass-input w-full rounded-xl py-3 pl-10 pr-4 text-sm" />
            </span>
          </label>
          <button disabled={loading} className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3.5 text-sm font-bold text-white transition hover:bg-emerald-500 disabled:opacity-50">
            {loading ? 'Signing in…' : 'Open team workspace'} <ArrowRight className="h-4 w-4" />
          </button>
        </form>
        <p className="mt-6 border-t border-slate-800 pt-5 text-center text-xs text-slate-500">Organizer? <Link to="/admin-login" className="text-emerald-300 hover:text-emerald-200">Admin sign in</Link></p>
      </section>
    </main>
  );
}
