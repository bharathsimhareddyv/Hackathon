import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Terminal, Shield, Code2, Bug, GitBranch, Cpu, Trophy, CheckCircle2, ArrowRight, BookOpen, Clock, Users, HelpCircle, Sparkles } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

export default function LandingPage() {
  const [showCelebration, setShowCelebration] = useState(true);

  useEffect(() => {
    const timer = window.setTimeout(() => setShowCelebration(false), 2300);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-[#0B0F19]">
      {showCelebration && (
        <div aria-hidden="true" className="aarohan-arrival pointer-events-none fixed inset-0 z-50 flex items-center justify-center bg-[#0B0F19]/90 backdrop-blur-sm motion-reduce:hidden">
          <div className="relative text-center">
            <Sparkles className="mx-auto h-8 w-8 text-amber-300" />
            <p className="mt-3 font-outfit text-3xl font-extrabold tracking-wide text-white sm:text-5xl">AAROHAN</p>
            <p className="mt-2 text-xs font-bold uppercase tracking-[0.24em] text-emerald-300 sm:text-sm">The hackathon begins</p>
          </div>
          {Array.from({ length: 24 }, (_, index) => (
            <span key={index} className={`aarohan-confetti aarohan-confetti-${index % 6}`} style={{ left: `${(index * 37) % 100}%`, animationDelay: `${(index % 8) * 0.08}s` }} />
          ))}
        </div>
      )}
      <Navbar />

      {/* HERO SECTION */}
      <section className="relative pt-16 pb-24 overflow-hidden">
        {/* Glow backdrop effects */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-indigo-600/20 blur-[120px] rounded-full pointer-events-none" />
        <div className="absolute top-1/3 right-10 w-[400px] h-[250px] bg-cyan-500/15 blur-[100px] rounded-full pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-950/80 border border-indigo-500/40 text-indigo-300 text-xs sm:text-sm font-semibold mb-8 animate-pulse-glow">
            <Terminal className="w-4 h-4 text-cyan-400" />
            <span>AAROHAN TRIBAL YOUTH EMPOWERMENT HACKATHON 2026</span>
          </div>

          <h1 className="text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-tight text-white font-outfit max-w-4xl mx-auto leading-tight">
            WELCOME TO <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-indigo-300 to-emerald-400 glow-indigo">
              AAROHAN PROGRAM HACKATHON
            </span>
          </h1>

          <p className="mt-6 text-lg sm:text-xl text-slate-300 max-w-2xl mx-auto font-medium">
            Learn • Debug • Build • Innovate
          </p>

          <p className="mt-3 text-sm sm:text-base text-slate-400 max-w-xl mx-auto">
            A state-of-the-art hackathon platform designed specifically for tribal students to download project source code, debug locally on their machines, build real-world software, and showcase tech innovation.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to="/team-login"
              className="w-full sm:w-auto px-8 py-4 rounded-xl bg-gradient-to-r from-emerald-700 via-emerald-600 to-teal-500 text-white font-bold text-base hover:from-emerald-600 hover:to-teal-400 transition-all shadow-xl shadow-emerald-900/30 flex items-center justify-center gap-2 group"
            >
              <Code2 className="w-5 h-5 text-cyan-200" />
              <span>TEAM LOGIN</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>

            <Link
              to="/admin-login"
              className="w-full sm:w-auto px-8 py-4 rounded-xl bg-slate-900/90 border border-slate-700 text-slate-200 font-bold text-base hover:border-indigo-500 hover:text-white transition-all shadow-lg flex items-center justify-center gap-2"
            >
              <Shield className="w-5 h-5 text-indigo-400" />
              <span>ADMIN LOGIN</span>
            </Link>
          </div>

          {/* Key Stat Cards */}
          <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
            <div className="glass-card p-5 rounded-2xl text-center">
              <Users className="w-6 h-6 text-cyan-400 mx-auto mb-2" />
              <div className="text-2xl font-bold text-white font-outfit">60+</div>
              <div className="text-xs text-slate-400 font-medium">Tribal Student Hackers</div>
            </div>

            <div className="glass-card p-5 rounded-2xl text-center">
              <Bug className="w-6 h-6 text-indigo-400 mx-auto mb-2" />
              <div className="text-2xl font-bold text-white font-outfit">200</div>
              <div className="text-xs text-slate-400 font-medium">Debugging Tasks</div>
            </div>

            <div className="glass-card p-5 rounded-2xl text-center">
              <GitBranch className="w-6 h-6 text-emerald-400 mx-auto mb-2" />
              <div className="text-2xl font-bold text-white font-outfit">3 Rounds</div>
              <div className="text-xs text-slate-400 font-medium">Progressive Evaluation</div>
            </div>

            <div className="glass-card p-5 rounded-2xl text-center">
              <Trophy className="w-6 h-6 text-amber-400 mx-auto mb-2" />
              <div className="text-2xl font-bold text-white font-outfit">100%</div>
              <div className="text-xs text-slate-400 font-medium">Local Work Execution</div>
            </div>
          </div>

        </div>
      </section>

      {/* ABOUT AAROHAN SECTION */}
      <section className="py-20 bg-slate-950/60 border-t border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-white font-outfit">
              ABOUT AAROHAN PROGRAM
            </h2>
            <p className="mt-4 text-slate-400 text-base">
              The AAROHAN Program is an initiative aimed at equipping tribal youth with practical web development, debugging, and software engineering skills. The hackathon provides a real-world environment where participants solve actual code problems locally on their machines.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="glass-card p-6 rounded-2xl">
              <div className="w-12 h-12 rounded-xl bg-cyan-950/80 border border-cyan-500/30 flex items-center justify-center mb-5">
                <BookOpen className="w-6 h-6 text-cyan-400" />
              </div>
              <h3 className="text-xl font-bold text-white font-outfit mb-3">Local Workspace Freedom</h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Participants download full project ZIPs, work in VS Code, inspect in Chrome, and test code locally. No restrictive online compiler limitations.
              </p>
            </div>

            <div className="glass-card p-6 rounded-2xl">
              <div className="w-12 h-12 rounded-xl bg-indigo-950/80 border border-indigo-500/30 flex items-center justify-center mb-5">
                <Users className="w-6 h-6 text-indigo-400" />
              </div>
              <h3 className="text-xl font-bold text-white font-outfit mb-3">Dynamic Round Teams</h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Teams are round-specific! Qualified participants can be reshuffled into new collaborative teams across rounds under full Admin guidance.
              </p>
            </div>

            <div className="glass-card p-6 rounded-2xl">
              <div className="w-12 h-12 rounded-xl bg-emerald-950/80 border border-emerald-500/30 flex items-center justify-center mb-5">
                <Shield className="w-6 h-6 text-emerald-400" />
              </div>
              <h3 className="text-xl font-bold text-white font-outfit mb-3">Complete Admin Oversight</h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                The platform empowers organizers with live round timers, manual evaluation marksheets, qualification controls, and credential management.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* HACKATHON JOURNEY / ROUNDS SECTION */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-white font-outfit">
              THE HACKATHON JOURNEY
            </h2>
            <p className="mt-4 text-slate-400 text-base">
              Three progressive stages designed to test debugging precision, React repository building, and real-world application delivery.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 relative">
            
            {/* Round 1 */}
            <div className="glass-card p-6 rounded-2xl relative border-t-4 border-t-cyan-500">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-bold uppercase tracking-wider text-cyan-400 bg-cyan-950 px-3 py-1 rounded-full border border-cyan-800">
                  ROUND 1
                </span>
                <Bug className="w-6 h-6 text-cyan-400" />
              </div>
              <h3 className="text-2xl font-bold text-white font-outfit mb-2">DEBUGGING CHALLENGE</h3>
              <p className="text-slate-400 text-sm mb-6">
                Inspect 200 code tasks across HTML, CSS, JavaScript, and React. Extract ZIP locally, solve bugs, and submit for evaluation.
              </p>
              <ul className="space-y-2 text-xs text-slate-300">
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-cyan-400" /> 50 HTML Debugging Tasks</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-cyan-400" /> 50 CSS Styling Tasks</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-cyan-400" /> 50 JavaScript Logic Tasks</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-cyan-400" /> 50 React State/Prop Tasks</li>
              </ul>
            </div>

            {/* Round 2 */}
            <div className="glass-card p-6 rounded-2xl relative border-t-4 border-t-indigo-500">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-400 bg-indigo-950 px-3 py-1 rounded-full border border-indigo-800">
                  ROUND 2
                </span>
                <GitBranch className="w-6 h-6 text-indigo-400" />
              </div>
              <h3 className="text-2xl font-bold text-white font-outfit mb-2">REACT / GITHUB CHALLENGE</h3>
              <p className="text-slate-400 text-sm mb-6">
                Qualified hackers get new teams! Clone assigned GitHub repository, add components, run `npm dev`, and submit commit SHA.
              </p>
              <ul className="space-y-2 text-xs text-slate-300">
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-indigo-400" /> GitHub Repository Cloning</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-indigo-400" /> React Component Architecture</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-indigo-400" /> State Management & APIs</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-indigo-400" /> Clean Git Commit Submission</li>
              </ul>
            </div>

            {/* Round 3 */}
            <div className="glass-card p-6 rounded-2xl relative border-t-4 border-t-emerald-500">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 bg-emerald-950 px-3 py-1 rounded-full border border-emerald-800">
                  ROUND 3
                </span>
                <Cpu className="w-6 h-6 text-emerald-400" />
              </div>
              <h3 className="text-2xl font-bold text-white font-outfit mb-2">APPLICATION CHALLENGE</h3>
              <p className="text-slate-400 text-sm mb-6">
                The ultimate final round. Build a complete end-to-end full stack web application tackling tribal welfare problems.
              </p>
              <ul className="space-y-2 text-xs text-slate-300">
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-400" /> Full Stack MERN Solution</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-400" /> Real-time Data Integration</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-400" /> Multi-criteria Jury Evaluation</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-400" /> Final Leaderboard Ranking</li>
              </ul>
            </div>

          </div>
        </div>
      </section>

      {/* RULES & SUPPORT */}
      <section className="py-16 bg-slate-950/80 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-8">
          <div>
            <h3 className="text-2xl font-bold text-white font-outfit mb-2">Ready to Enter the Hackathon?</h3>
            <p className="text-slate-400 text-sm">
              Use your team login ID and password to open your assigned round workspace.
            </p>
          </div>
          <div className="flex items-center gap-4">
            <Link
              to="/terms"
              className="px-5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-200 text-sm font-semibold hover:border-cyan-500 hover:text-white transition-all"
            >
              Read Hackathon Terms
            </Link>
            <Link
              to="/team-login"
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-500 text-white text-sm font-bold shadow-lg shadow-indigo-600/20 hover:from-indigo-500 hover:to-cyan-400 transition-all"
            >
              Student Login Now
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
