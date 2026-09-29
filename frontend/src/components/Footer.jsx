import React from 'react';
import { Link } from 'react-router-dom';
import { Terminal, Heart } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="w-full border-t border-slate-800 bg-[#070A12] py-8 text-slate-400 text-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-4">
        
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg bg-indigo-950 border border-indigo-700/50 flex items-center justify-center">
            <Terminal className="w-4 h-4 text-cyan-400" />
          </div>
          <div>
            <span className="font-bold text-slate-200 font-outfit">AAROHAN PROGRAM HACKATHON</span>
            <span className="text-xs text-slate-400 block">Empowering Tribal Students Through Code</span>
          </div>
        </div>

        <div className="flex items-center gap-6 text-xs font-medium">
          <Link to="/" className="hover:text-cyan-400 transition-colors">Home</Link>
          <Link to="/terms" className="hover:text-cyan-400 transition-colors">Terms & Conditions</Link>
          <Link to="/leaderboard" className="hover:text-cyan-400 transition-colors">Leaderboard</Link>
          <Link to="/team-login" className="hover:text-emerald-300 transition-colors">Team Login</Link>
          <Link to="/admin-login" className="hover:text-cyan-400 transition-colors">Admin Portal</Link>
        </div>

        <div className="text-xs text-slate-400">
          © {new Date().getFullYear()} AAROHAN Hackathon Management Platform. All rights reserved.
        </div>

      </div>
    </footer>
  );
}
