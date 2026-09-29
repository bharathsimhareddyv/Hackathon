import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Shield, LogOut, LayoutDashboard, FileText, Trophy, Code2 } from 'lucide-react';
import AarohanLogo from './AarohanLogo';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800 bg-[#0B0F19]/80 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        
        {/* Brand */}
        <Link to="/" className="flex items-center gap-3 group">
          <AarohanLogo />
        </Link>

        {/* Navigation Links */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-300">
          <Link 
            to="/" 
            className={`hover:text-cyan-400 transition-colors ${location.pathname === '/' ? 'text-cyan-400 font-semibold' : ''}`}
          >
            Home
          </Link>
          <Link 
            to="/leaderboard" 
            className={`flex items-center gap-1.5 hover:text-cyan-400 transition-colors ${location.pathname === '/leaderboard' ? 'text-cyan-400 font-semibold' : ''}`}
          >
            <Trophy className="w-4 h-4 text-amber-400" />
            Leaderboard
          </Link>
          <Link 
            to="/terms" 
            className={`flex items-center gap-1.5 hover:text-cyan-400 transition-colors ${location.pathname === '/terms' ? 'text-cyan-400 font-semibold' : ''}`}
          >
            <FileText className="w-4 h-4 text-indigo-400" />
            Terms & Rules
          </Link>
        </nav>

        {/* Actions */}
        <div className="flex items-center gap-3">
          {user ? (
            <div className="flex items-center gap-3">
              <Link
                to={user.role === 'ADMIN' ? '/admin/dashboard' : user.role === 'TEAM' ? '/team/dashboard' : '/student/dashboard'}
                className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-indigo-950/70 border border-indigo-500/40 text-indigo-200 text-sm font-semibold hover:bg-indigo-900/80 transition-all shadow-md"
              >
                <LayoutDashboard className="w-4 h-4 text-cyan-400" />
                <span>{user.role === 'ADMIN' ? 'Admin Portal' : user.role === 'TEAM' ? user.loginId : user.arohanId}</span>
              </Link>
              <button
                onClick={handleLogout}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700 text-slate-300 text-xs font-semibold hover:bg-rose-950/70 hover:border-rose-700 hover:text-rose-300 transition-all"
                title="Logout"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2.5">
              <Link
                to="/team-login"
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-700 to-emerald-600 text-white font-semibold text-xs sm:text-sm hover:from-emerald-600 hover:to-emerald-500 transition-all shadow-lg shadow-emerald-900/30"
              >
                <Code2 className="w-4 h-4" />
                TEAM LOGIN
              </Link>
              <Link
                to="/admin-login"
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800/90 border border-slate-700 text-slate-300 font-semibold text-xs sm:text-sm hover:border-indigo-500 hover:text-white transition-all"
              >
                <Shield className="w-3.5 h-3.5 text-indigo-400" />
                ADMIN LOGIN
              </Link>
            </div>
          )}
        </div>

      </div>
    </header>
  );
}
