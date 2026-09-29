import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import StatusBadge from '../components/StatusBadge';
import CountdownTimer from '../components/CountdownTimer';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { Download, Terminal, GitBranch, Cpu, Bug, Upload, CheckCircle2, Clock, ShieldAlert, Award, FileCode2, ExternalLink } from 'lucide-react';

export default function StudentDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Submission Form State
  const [githubUrl, setGithubUrl] = useState('');
  const [commitSha, setCommitSha] = useState('');
  const [demoUrl, setDemoUrl] = useState('');
  const [description, setDescription] = useState('');
  const [submissionZip, setSubmissionZip] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const { user, showToast } = useAuth();
  const navigate = useNavigate();

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      const res = await api.get('/dashboard/student');
      setData(res.data);
      
      // If terms not accepted, redirect to /terms
      if (!res.data.participant.termsAccepted) {
        navigate('/terms');
      }
    } catch (err) {
      console.error('Fetch Student Dashboard Error:', err);
      setError('Failed to load participant dashboard');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  const handleDownloadProject = async (projectId, projectName) => {
    try {
      setDownloading(true);
      const response = await api.get(`/projects/${projectId}/download`, {
        responseType: 'blob'
      });
      
      const blob = new Blob([response.data], { type: 'application/zip' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${projectName || 'Project'}.zip`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      showToast('Project ZIP downloaded! Work locally on your system.', 'success');
    } catch (err) {
      console.error('Download Error:', err);
      showToast('Failed to download project ZIP file.', 'error');
    } finally {
      setDownloading(false);
    }
  };

  const handleSubmissionSubmit = async (e) => {
    e.preventDefault();
    if (!data || !data.activeRound) return;

    try {
      setSubmitting(true);
      const formData = new FormData();
      formData.append('roundNumber', data.activeRound.roundNumber);
      formData.append('githubUrl', githubUrl);
      formData.append('commitSha', commitSha);
      formData.append('demoUrl', demoUrl);
      formData.append('description', description);
      if (submissionZip) {
        formData.append('submissionZip', submissionZip);
      }

      await api.post('/submissions', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      showToast('Work submitted successfully for evaluation!', 'success');
      setGithubUrl('');
      setCommitSha('');
      setDemoUrl('');
      setDescription('');
      setSubmissionZip(null);

      fetchDashboard();
    } catch (err) {
      console.error('Submission Error:', err);
      showToast(err.response?.data?.message || 'Failed to submit work.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-[#0B0F19]">
        <Navbar />
        <div className="flex-1 flex items-center justify-center text-slate-400">
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            <span>Loading Arohan Student Portal...</span>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  const { participant, rounds, activeRound, currentTeam, currentProject, currentEvaluation, mySubmissions } = data || {};

  return (
    <div className="min-h-screen flex flex-col bg-[#0B0F19]">
      <Navbar />

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        {/* HEADER WELCOME CARD */}
        <div className="glass-panel p-6 sm:p-8 rounded-3xl relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-6 border-indigo-500/30">
          <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-600/10 blur-[100px] rounded-full pointer-events-none" />

          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="text-xs uppercase font-extrabold tracking-widest text-indigo-400 bg-indigo-950 px-3 py-1 rounded-full border border-indigo-800">
                AAROHAN PARTICIPANT
              </span>
              <StatusBadge status={participant?.status} />
            </div>
            
            {/* Display Arohan ID - NO fake student name! */}
            <h1 className="text-3xl sm:text-4xl font-extrabold text-white font-outfit tracking-tight">
              Welcome, <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-indigo-300 to-emerald-400 font-mono">{participant?.arohanId}</span>
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              Current Hackathon Stage: <strong className="text-slate-200">Round {participant?.currentRound}</strong>
            </p>
          </div>

          {activeRound && activeRound.status === 'ACTIVE' && activeRound.endAt && (
            <div className="shrink-0 bg-slate-950/80 p-4 rounded-2xl border border-indigo-500/30 text-right">
              <div className="text-xs text-slate-400 font-medium mb-1">Active Round Timer</div>
              <CountdownTimer targetDate={activeRound.endAt} />
            </div>
          )}
        </div>

        {/* HACKATHON JOURNEY STEPPER */}
        <div className="glass-panel p-6 rounded-3xl">
          <h2 className="text-sm font-extrabold text-slate-300 uppercase tracking-widest mb-6 font-outfit">
            HACKATHON JOURNEY STEPS
          </h2>

          <div className="grid md:grid-cols-3 gap-4">
            {rounds && rounds.map((r) => {
              const isCurrent = participant?.currentRound === r.roundNumber;
              const isPast = participant?.currentRound > r.roundNumber;
              const isLocked = participant?.currentRound < r.roundNumber;

              return (
                <div
                  key={r.roundNumber}
                  className={`p-5 rounded-2xl border transition-all ${
                    isCurrent ? 'bg-indigo-950/40 border-indigo-500/50 shadow-lg shadow-indigo-500/10' :
                    isPast ? 'bg-emerald-950/20 border-emerald-500/30' :
                    'bg-slate-900/40 border-slate-800 opacity-60'
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold font-mono px-2.5 py-0.5 rounded bg-slate-950 border border-slate-700 text-slate-300">
                      ROUND {r.roundNumber}
                    </span>
                    <StatusBadge status={isCurrent ? r.status : (isPast ? 'COMPLETED' : 'CLOSED')} />
                  </div>

                  <h3 className="text-lg font-bold text-white font-outfit mb-1">{r.name}</h3>
                  <p className="text-xs text-slate-400 line-clamp-2">{r.description}</p>

                  <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
                    <span className="text-slate-400">Max Marks: <strong className="text-slate-200">{r.maxMarks}</strong></span>
                    {isLocked ? (
                      <span className="text-slate-500 flex items-center gap-1">🔒 Locked</span>
                    ) : isPast ? (
                      <span className="text-emerald-400 flex items-center gap-1 font-semibold">✓ Completed</span>
                    ) : (
                      <span className="text-cyan-400 flex items-center gap-1 font-semibold">🟢 Active Stage</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ACTIVE ROUND & WORKSPACE CARD */}
        {activeRound ? (
          <div className="grid lg:grid-cols-3 gap-8">
            
            {/* Left 2 Cols: Project Download & Instructions */}
            <div className="lg:col-span-2 space-y-6">
              
              <div className="glass-panel p-6 sm:p-8 rounded-3xl border-indigo-500/20">
                <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-800">
                  <div>
                    <span className="text-xs font-bold text-cyan-400 uppercase tracking-widest block mb-1 font-mono">
                      ASSIGNED WORKSPACE — ROUND {activeRound.roundNumber}
                    </span>
                    <h2 className="text-2xl font-bold text-white font-outfit">{activeRound.name}</h2>
                  </div>
                  {currentTeam && (
                    <div className="text-right">
                      <span className="text-xs text-slate-400 block">Your Team Code</span>
                      <span className="text-sm font-bold font-mono text-indigo-300 bg-indigo-950 px-3 py-1 rounded-lg border border-indigo-800">
                        {currentTeam.teamCode}
                      </span>
                    </div>
                  )}
                </div>

                {/* Team Members info */}
                {currentTeam && currentTeam.participantIds && (
                  <div className="mb-6 p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
                    <div className="text-xs text-slate-400">
                      Team Teammates for Round {activeRound.roundNumber}:
                    </div>
                    <div className="flex items-center gap-2">
                      {currentTeam.participantIds.map(pid => (
                        <span key={pid} className={`text-xs font-mono font-bold px-2.5 py-1 rounded ${pid === participant.arohanId ? 'bg-cyan-950 text-cyan-300 border border-cyan-800' : 'bg-slate-800 text-slate-300'}`}>
                          {pid} {pid === participant.arohanId && '(You)'}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Download Project Box */}
                {currentProject ? (
                  <div className="p-6 rounded-2xl bg-gradient-to-r from-indigo-950/70 via-slate-900 to-slate-900 border border-indigo-500/40 mb-6">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <FileCode2 className="w-5 h-5 text-cyan-400" />
                          <h3 className="text-lg font-bold text-white font-outfit">{currentProject.name}</h3>
                        </div>
                        <p className="text-xs text-slate-300">{currentProject.description}</p>
                        {currentProject.totalErrors > 0 && (
                          <div className="mt-2 text-xs text-indigo-300 font-mono">
                            Total Debugging Errors: <strong>{currentProject.totalErrors}</strong> (HTML: {currentProject.htmlErrors}, CSS: {currentProject.cssErrors}, JS: {currentProject.jsErrors}, React: {currentProject.reactErrors})
                          </div>
                        )}
                      </div>

                      {currentProject.filePath ? (
                        <button
                          onClick={() => handleDownloadProject(currentProject._id, currentProject.name)}
                          disabled={downloading}
                          className="w-full sm:w-auto px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white font-bold text-sm shadow-lg shadow-cyan-500/20 flex items-center justify-center gap-2 shrink-0 transition-all"
                        >
                          <Download className="w-4 h-4" />
                          <span>{downloading ? 'Downloading...' : 'DOWNLOAD PROJECT ZIP'}</span>
                        </button>
                      ) : (
                        <span className="text-xs text-slate-400 bg-slate-800 px-3 py-1.5 rounded-lg">No ZIP attached</span>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="p-6 rounded-2xl bg-amber-950/30 border border-amber-800/40 text-amber-300 text-sm mb-6 flex items-center gap-3">
                    <span>⚠️</span>
                    <span>Admin has not yet assigned a project ZIP to your team for Round {activeRound.roundNumber}. Please wait or contact support.</span>
                  </div>
                )}

                {/* Round GitHub link if Round 2 */}
                {activeRound.type === 'REACT_GITHUB' && (activeRound.githubRepoUrl || (currentProject && currentProject.githubUrl)) && (
                  <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 mb-6">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-2 font-mono flex items-center gap-2">
                      <GitBranch className="w-4 h-4 text-indigo-400" />
                      GitHub Repository Assignment
                    </h4>
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                      <code className="text-xs text-cyan-300 bg-slate-950 px-3 py-2 rounded-lg border border-slate-800 font-mono w-full sm:w-auto overflow-x-auto">
                        git clone {activeRound.githubRepoUrl || currentProject?.githubUrl}
                      </code>
                      <a
                        href={activeRound.githubRepoUrl || currentProject?.githubUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="px-4 py-2 rounded-lg bg-indigo-950 border border-indigo-700 text-indigo-200 text-xs font-bold hover:bg-indigo-900 transition-all flex items-center gap-1.5 shrink-0"
                      >
                        <span>OPEN GITHUB</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  </div>
                )}

                {/* Instructions text */}
                <div className="space-y-3">
                  <h4 className="text-xs font-extrabold uppercase tracking-widest text-slate-300 font-mono">
                    ROUND INSTRUCTIONS & RULES
                  </h4>
                  <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 text-xs text-slate-300 whitespace-pre-wrap leading-relaxed">
                    {activeRound.instructions || 'Follow assigned guidelines, work locally on your system, save your changes, and submit repository link or ZIP before the timer finishes.'}
                  </div>
                </div>

              </div>

              {/* SUBMISSION FORM CARD */}
              <div className="glass-panel p-6 sm:p-8 rounded-3xl border-indigo-500/20">
                <h3 className="text-lg font-bold text-white font-outfit mb-1 flex items-center gap-2">
                  <Upload className="w-5 h-5 text-cyan-400" />
                  <span>SUBMIT YOUR COMPLETED WORK</span>
                </h3>
                <p className="text-xs text-slate-400 mb-6">
                  Submit your repository link, commit SHA, or solution ZIP for Round {activeRound.roundNumber}.
                </p>

                <form onSubmit={handleSubmissionSubmit} className="space-y-4">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        GitHub Repository URL (Optional)
                      </label>
                      <input
                        type="url"
                        value={githubUrl}
                        onChange={(e) => setGithubUrl(e.target.value)}
                        placeholder="https://github.com/myusername/aarohan-solution"
                        className="w-full px-3.5 py-2.5 rounded-xl glass-input text-xs"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        Commit SHA (Optional)
                      </label>
                      <input
                        type="text"
                        value={commitSha}
                        onChange={(e) => setCommitSha(e.target.value)}
                        placeholder="e.g. 7f8a9b2c"
                        className="w-full px-3.5 py-2.5 rounded-xl glass-input text-xs font-mono"
                      />
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        Live Demo URL (Optional)
                      </label>
                      <input
                        type="url"
                        value={demoUrl}
                        onChange={(e) => setDemoUrl(e.target.value)}
                        placeholder="https://aarohan-demo.vercel.app"
                        className="w-full px-3.5 py-2.5 rounded-xl glass-input text-xs"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        Upload Solution ZIP (Optional)
                      </label>
                      <input
                        type="file"
                        accept=".zip"
                        onChange={(e) => setSubmissionZip(e.target.files[0])}
                        className="w-full px-3.5 py-2 rounded-xl glass-input text-xs text-slate-300 file:mr-3 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-indigo-950 file:text-indigo-300"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Project Notes & Tasks Summary
                    </label>
                    <textarea
                      rows={3}
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Detail errors solved, features completed, or verification notes..."
                      className="w-full px-3.5 py-2.5 rounded-xl glass-input text-xs"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={submitting || activeRound.status === 'CLOSED'}
                    className="w-full sm:w-auto px-8 py-3 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-cyan-500 text-white font-bold text-sm hover:from-indigo-500 hover:to-cyan-400 transition-all shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2 disabled:opacity-40"
                  >
                    {submitting ? 'Submitting Work...' : `SUBMIT ROUND ${activeRound.roundNumber} WORK`}
                  </button>
                </form>
              </div>

            </div>

            {/* Right Col: Evaluation Result & Submission Log */}
            <div className="space-y-6">
              
              {/* EVALUATION STATUS CARD */}
              <div className="glass-panel p-6 rounded-3xl border-indigo-500/20">
                <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-800">
                  <Award className="w-5 h-5 text-amber-400" />
                  <h3 className="text-base font-bold text-white font-outfit">EVALUATION & RESULT</h3>
                </div>

                {currentEvaluation ? (
                  <div className="space-y-4">
                    <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 text-center">
                      <div className="text-xs text-slate-400 font-medium uppercase tracking-wider mb-1">Status</div>
                      <div className="text-lg font-bold">
                        {currentEvaluation.status === 'QUALIFIED' ? (
                          <span className="text-emerald-400 glow-emerald font-outfit">🎉 QUALIFIED FOR NEXT ROUND</span>
                        ) : currentEvaluation.status === 'NOT_QUALIFIED' ? (
                          <span className="text-rose-400">NOT QUALIFIED</span>
                        ) : (
                          <span className="text-amber-400">EVALUATION PENDING</span>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-center">
                      <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                        <span className="text-[10px] text-slate-400 block uppercase">Errors Solved</span>
                        <span className="text-xl font-bold font-mono text-cyan-400">{currentEvaluation.errorsSolved}</span>
                        <span className="text-[10px] text-slate-500 block">/ {currentEvaluation.totalErrors}</span>
                      </div>
                      <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                        <span className="text-[10px] text-slate-400 block uppercase">Total Marks</span>
                        <span className="text-xl font-bold font-mono text-emerald-400">{currentEvaluation.marks}</span>
                        <span className="text-[10px] text-slate-500 block">/ {currentEvaluation.maxMarks}</span>
                      </div>
                    </div>

                    {/* Breakdown */}
                    {activeRound.type === 'DEBUGGING' && (
                      <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2 text-xs">
                        <div className="font-bold text-slate-300 font-mono">Category Solved Count:</div>
                        <div className="grid grid-cols-2 gap-2 text-slate-400 font-mono">
                          <div>HTML: <strong className="text-slate-200">{currentEvaluation.htmlSolved}/50</strong></div>
                          <div>CSS: <strong className="text-slate-200">{currentEvaluation.cssSolved}/50</strong></div>
                          <div>JS: <strong className="text-slate-200">{currentEvaluation.jsSolved}/50</strong></div>
                          <div>React: <strong className="text-slate-200">{currentEvaluation.reactSolved}/50</strong></div>
                        </div>
                      </div>
                    )}

                    {currentEvaluation.remarks && (
                      <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300">
                        <span className="font-bold text-indigo-300 block mb-1">Mentor Remarks:</span>
                        <p className="italic">{currentEvaluation.remarks}</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 text-center text-xs text-slate-400 space-y-2">
                    <Clock className="w-8 h-8 text-amber-400 mx-auto opacity-80 animate-pulse" />
                    <p className="font-semibold text-slate-300">Evaluation Pending</p>
                    <p>Mentors will review your project submission manually once the round concludes.</p>
                  </div>
                )}
              </div>

              {/* MY SUBMISSIONS HISTORY */}
              <div className="glass-panel p-6 rounded-3xl border-indigo-500/20">
                <h3 className="text-base font-bold text-white font-outfit mb-3 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>SUBMISSION HISTORY</span>
                </h3>

                {mySubmissions && mySubmissions.length > 0 ? (
                  <div className="space-y-3">
                    {mySubmissions.map((sub, idx) => (
                      <div key={sub._id || idx} className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-xs space-y-1">
                        <div className="flex items-center justify-between text-slate-400">
                          <span className="font-mono font-semibold text-indigo-300">Round {sub.roundNumber}</span>
                          <span>{new Date(sub.submittedAt).toLocaleTimeString()}</span>
                        </div>
                        {sub.githubUrl && <div className="text-slate-300 font-mono truncate">Repo: {sub.githubUrl}</div>}
                        {sub.commitSha && <div className="text-slate-400 font-mono">SHA: {sub.commitSha}</div>}
                        {sub.description && <div className="text-slate-400 italic line-clamp-2">{sub.description}</div>}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6 text-xs text-slate-500">
                    No submissions recorded yet for this round.
                  </div>
                )}
              </div>

            </div>

          </div>
        ) : (
          <div className="glass-panel p-12 rounded-3xl text-center text-slate-400">
            No active round configured yet. Please check back later.
          </div>
        )}

      </main>

      <Footer />
    </div>
  );
}
