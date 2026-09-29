import React, { useState } from 'react';
import { Link, useLocation, useNavigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/api';
import AarohanLogo from '../../components/AarohanLogo';
import {
  LayoutDashboard, Users, KeyRound, Clock, UserCheck, FolderGit2,
  Award, UploadCloud, Trophy, FileSpreadsheet, FileText, History,
  Settings, LogOut, Menu, X, Sparkles, Terminal, ShieldCheck
} from 'lucide-react';

export default function AdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const { user, logout, showToast } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const handleSeedDemoData = async () => {
    if (!window.confirm('Seed Demo Mode data? This will create 5 demo participants (AIF260001-AIF260005), sample rounds, project ZIPs, and sample evaluations.')) {
      return;
    }

    try {
      setSeeding(true);
      await api.post('/admin/demo/seed');
      showToast('Demo Mode data seeded successfully!', 'success');
      window.location.reload();
    } catch (err) {
      console.error('Seed Error:', err);
      showToast('Failed to seed demo data', 'error');
    } finally {
      setSeeding(false);
    }
  };

  const navItems = [
    { path: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/admin/participants', label: 'Participants', icon: Users },
    { path: '/admin/credentials', label: 'Credentials', icon: KeyRound },
    { path: '/admin/team-accounts', label: 'Team Accounts', icon: Users },
    { path: '/admin/accounts', label: 'Admin Accounts', icon: ShieldCheck },
    { path: '/admin/rounds', label: 'Rounds & Timings', icon: Clock },
    { path: '/admin/teams', label: 'Team Assignments', icon: UserCheck },
    { path: '/admin/projects', label: 'Project Manager', icon: FolderGit2 },
    { path: '/admin/evaluations', label: 'Evaluations & Marks', icon: Award },
    { path: '/admin/submissions', label: 'Submissions', icon: UploadCloud },
    { path: '/admin/progress-claims', label: 'Progress Approvals', icon: Award },
    { path: '/admin/leaderboard', label: 'Leaderboard', icon: Trophy },
    { path: '/admin/reports', label: 'Reports & Export', icon: FileSpreadsheet },
    { path: '/admin/terms', label: 'Terms Admin', icon: FileText },
    { path: '/admin/logs', label: 'Activity Logs', icon: History },
    { path: '/admin/settings', label: 'Settings', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-[#0B0F19] text-slate-100 flex flex-col md:flex-row">
      
      {/* Mobile Top Header */}
      <div className="md:hidden flex items-center justify-between p-4 bg-[#070A12] border-b border-slate-800">
        <div className="flex items-center gap-2">
          <Terminal className="w-5 h-5 text-cyan-400" />
          <span className="font-bold text-white font-outfit text-base">AAROHAN ADMIN</span>
        </div>
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-2 rounded-lg bg-slate-800 text-slate-300"
        >
          {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Sidebar Navigation */}
      <aside className={`
        fixed md:static inset-y-0 left-0 z-50 w-64 bg-[#070A12] border-r border-slate-800 flex flex-col justify-between transition-transform duration-300
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        <div>
          {/* Logo Brand Header */}
          <div className="p-6 border-b border-slate-800/80 flex items-center gap-3">
            <AarohanLogo />
          </div>

          {/* Quick Demo Mode Seed Button */}
          <div className="px-4 py-3 border-b border-slate-800/50">
            <button
              onClick={handleSeedDemoData}
              disabled={seeding}
              className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-amber-500/20 via-indigo-600/30 to-cyan-500/20 border border-amber-500/40 text-amber-300 text-xs font-bold hover:bg-amber-500/30 transition-all flex items-center justify-center gap-2 shadow-sm"
            >
              <Sparkles className="w-4 h-4 text-amber-300 animate-spin-slow" />
              <span>{seeding ? 'Seeding...' : 'SEED DEMO MODE'}</span>
            </button>
          </div>

          {/* Nav Items List */}
          <nav className="p-4 space-y-1 text-xs font-medium max-h-[calc(100vh-230px)] overflow-y-auto">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setSidebarOpen(false)}
                  className={`
                    flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all
                    ${active ? 'bg-indigo-600 text-white font-bold shadow-lg shadow-indigo-600/20' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'}
                  `}
                >
                  <Icon className={`w-4 h-4 ${active ? 'text-white' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Footer Admin Info */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/50 flex items-center justify-between">
          <div className="text-xs">
            <span className="font-bold text-slate-200 block truncate">{user?.username || 'Admin'}</span>
            <span className="text-[10px] text-emerald-400 font-mono">● Director Role</span>
          </div>
          <button
            onClick={() => { logout(); navigate('/'); }}
            className="p-2 rounded-lg bg-slate-900 text-slate-400 hover:text-rose-400 transition-colors"
            title="Logout Admin"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 min-w-0 overflow-y-auto p-4 sm:p-6 lg:p-8">
        <Outlet />
      </main>

    </div>
  );
}
