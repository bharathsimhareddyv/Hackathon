import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, GitBranch, Lock, User } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { useAuth } from '../context/AuthContext';

export default function BranchLogin() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { branchLogin } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async event => {
    event.preventDefault();
    setError('');
    setLoading(true);
    try {
      await branchLogin(username, password);
      navigate('/branch/dashboard');
    } catch (loginError) {
      setError(loginError.response?.data?.message || 'Branch login failed. Check the credentials and try again.');
    } finally {
      setLoading(false);
    }
  };

  return <div className="min-h-screen flex flex-col bg-[#0B0F19]">
    <Navbar />
    <main className="flex-1 flex items-center justify-center p-4 py-16">
      <section className="w-full max-w-md glass-panel rounded-3xl border border-emerald-500/20 p-8 shadow-2xl">
        <Link to="/admin-login" className="text-xs text-slate-400 hover:text-emerald-300">← Organizer login</Link>
        <div className="mt-8 mb-7">
          <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl border border-emerald-500/30 bg-emerald-950/60 text-emerald-300"><GitBranch className="h-6 w-6" /></div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-300">Branch workspace</p>
          <h1 className="mt-2 font-outfit text-3xl font-extrabold text-white">Branch login</h1>
          <p className="mt-2 text-sm text-slate-400">Sign in to generate and view your branch’s team accounts.</p>
        </div>
        {error && <p role="alert" className="mb-5 rounded-xl border border-rose-700 bg-rose-950/50 p-3 text-sm text-rose-200">{error}</p>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block text-xs font-semibold text-slate-300">Username
            <span className="relative mt-2 block"><User className="absolute left-3 top-3.5 h-4 w-4 text-slate-500" /><input value={username} onChange={event => setUsername(event.target.value)} autoComplete="username" required className="glass-input w-full rounded-xl py-3 pl-10 pr-4 text-sm" /></span>
          </label>
          <label className="block text-xs font-semibold text-slate-300">Password
            <span className="relative mt-2 block"><Lock className="absolute left-3 top-3.5 h-4 w-4 text-slate-500" /><input type="password" value={password} onChange={event => setPassword(event.target.value)} autoComplete="current-password" required className="glass-input w-full rounded-xl py-3 pl-10 pr-4 text-sm" /></span>
          </label>
          <button disabled={loading} className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3.5 text-sm font-bold text-white transition hover:bg-emerald-500 disabled:opacity-50">
            {loading ? 'Signing in…' : 'Open branch workspace'} <ArrowRight className="h-4 w-4" />
          </button>
        </form>
      </section>
    </main>
    <Footer />
  </div>;
}
