import React, { useState, useEffect } from 'react';
import api from '../../utils/api';
import StatusBadge from '../../components/StatusBadge';
import { useAuth } from '../../context/AuthContext';
import { Award, Save, CheckCircle, XCircle, RotateCcw, AlertTriangle } from 'lucide-react';

export default function AdminEvaluations() {
  const [selectedRound, setSelectedRound] = useState(1);
  const [teams, setTeams] = useState([]);
  const [evaluations, setEvaluations] = useState([]);
  const [rounds, setRounds] = useState([]);
  const [selectedTeamId, setSelectedTeamId] = useState('');
  const [loading, setLoading] = useState(true);

  // Form State
  const [totalErrors, setTotalErrors] = useState(200);
  const [errorsSolved, setErrorsSolved] = useState(137);
  const [htmlSolved, setHtmlSolved] = useState(35);
  const [cssSolved, setCssSolved] = useState(32);
  const [jsSolved, setJsSolved] = useState(38);
  const [reactSolved, setReactSolved] = useState(32);

  const [marks, setMarks] = useState(82);
  const [maxMarks, setMaxMarks] = useState(100);
  const [remarks, setRemarks] = useState('Excellent performance in debugging tasks.');
  const [status, setStatus] = useState('QUALIFIED');
  const [saving, setSaving] = useState(false);

  const { showToast } = useAuth();

  const fetchData = async () => {
    try {
      setLoading(true);
      const [teamsRes, evalsRes, roundsRes] = await Promise.all([
        api.get(`/admin/teams/round/${selectedRound}`),
        api.get(`/admin/evaluations/round/${selectedRound}`),
        api.get('/rounds')
      ]);

      setTeams(teamsRes.data);
      setEvaluations(evalsRes.data);
      setRounds(roundsRes.data);

      if (teamsRes.data.length > 0 && !selectedTeamId) {
        setSelectedTeamId(teamsRes.data[0]._id);
      }
    } catch (err) {
      console.error('Fetch Evaluation Data Error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedRound]);

  // When team changes, prefill form with existing evaluation if available
  useEffect(() => {
    if (!selectedTeamId) return;
    const existing = evaluations.find(e => String(e.teamId?._id || e.teamId) === String(selectedTeamId));

    if (existing) {
      setTotalErrors(existing.totalErrors || 200);
      setErrorsSolved(existing.errorsSolved || 0);
      setHtmlSolved(existing.htmlSolved || 0);
      setCssSolved(existing.cssSolved || 0);
      setJsSolved(existing.jsSolved || 0);
      setReactSolved(existing.reactSolved || 0);
      setMarks(existing.marks || 0);
      setMaxMarks(existing.maxMarks || 100);
      setRemarks(existing.remarks || '');
      setStatus(existing.status || 'PENDING');
    } else {
      // Default initial values
      setTotalErrors(200);
      setErrorsSolved(137);
      setHtmlSolved(35);
      setCssSolved(32);
      setJsSolved(38);
      setReactSolved(32);
      setMarks(82);
      setMaxMarks(100);
      setRemarks('');
      setStatus('QUALIFIED');
    }
  }, [selectedTeamId, evaluations]);

  const handleSaveEvaluation = async (e) => {
    e.preventDefault();
    if (!selectedTeamId) {
      showToast('Please select a team to evaluate', 'error');
      return;
    }

    try {
      setSaving(true);
      await api.post('/admin/evaluations', {
        roundNumber: selectedRound,
        teamId: selectedTeamId,
        totalErrors: parseInt(totalErrors, 10),
        errorsSolved: parseInt(errorsSolved, 10),
        htmlSolved: parseInt(htmlSolved, 10),
        cssSolved: parseInt(cssSolved, 10),
        jsSolved: parseInt(jsSolved, 10),
        reactSolved: parseInt(reactSolved, 10),
        marks: parseFloat(marks),
        maxMarks: parseFloat(maxMarks),
        remarks,
        status
      });

      showToast('Evaluation and marks saved successfully!', 'success');
      fetchData();
    } catch (err) {
      console.error('Save Evaluation Error:', err);
      showToast(err.response?.data?.message || 'Failed to save evaluation', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleOverrideStatus = async (evalId, newStatus) => {
    try {
      await api.post(`/admin/evaluations/${evalId}/override-status`, { status: newStatus });
      showToast(`Qualification status updated to ${newStatus}`, 'success');
      fetchData();
    } catch (err) {
      console.error('Override Status Error:', err);
      showToast('Failed to override status', 'error');
    }
  };

  const currentTeam = teams.find(t => t._id === selectedTeamId);

  return (
    <div className="space-y-8">
      
      {/* Header & Round Switcher */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white font-outfit">EVALUATION & MARKS MANAGEMENT</h1>
          <p className="text-xs text-slate-400">Enter debugging errors solved, marks, remarks, and qualification decisions</p>
        </div>

        <div className="flex items-center gap-2 bg-slate-950 p-1.5 rounded-2xl border border-slate-800">
          {rounds.map((round) => (
            <button
              key={round._id}
              onClick={() => { setSelectedRound(round.roundNumber); setSelectedTeamId(''); }}
              className={`px-4 py-2 rounded-xl text-xs font-bold font-mono transition-all ${
                selectedRound === round.roundNumber ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              ROUND {round.roundNumber} EVALUATION
            </button>
          ))}
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        
        {/* Left 2 Cols: Evaluation Form */}
        <div className="lg:col-span-2 glass-panel p-6 sm:p-8 rounded-3xl border-indigo-500/30 space-y-6">
          
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
            <div>
              <span className="text-xs font-bold text-cyan-400 uppercase tracking-widest block font-mono">
                EVALUATION MARKSHEET — ROUND {selectedRound}
              </span>
              <h2 className="text-xl font-bold text-white font-outfit">
                {currentTeam ? currentTeam.teamCode : 'Select Team'}
              </h2>
            </div>

            {/* Select Team Dropdown */}
            <div className="w-full sm:w-64">
              <label className="block text-[11px] text-slate-400 font-mono mb-1">Select Team:</label>
              <select
                value={selectedTeamId}
                onChange={(e) => setSelectedTeamId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl glass-input text-xs font-mono font-bold text-indigo-300"
              >
                {teams.map(t => (
                  <option key={t._id} value={t._id}>
                    {t.teamCode} ({t.participantIds ? t.participantIds.join(', ') : ''})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {currentTeam ? (
            <form onSubmit={handleSaveEvaluation} className="space-y-6">
              
              {/* Team Members Banner */}
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                <span className="text-xs text-slate-400 font-mono">Assigned Team Members:</span>
                <div className="flex items-center gap-2">
                  {currentTeam.participantIds && currentTeam.participantIds.map(pid => (
                    <span key={pid} className="px-3 py-1 rounded-lg bg-indigo-950 text-indigo-200 border border-indigo-800 text-xs font-mono font-bold">
                      {pid}
                    </span>
                  ))}
                </div>
              </div>

              {/* Debugging Category Breakdown (Round 1) */}
              {selectedRound === 1 && (
                <div className="space-y-3">
                  <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider font-mono">
                    DEBUGGING TASKS SOLVED (OUT OF 200 ERRORS)
                  </h3>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-950 p-4 rounded-2xl border border-slate-800">
                    <div>
                      <label className="block text-[11px] text-slate-400 font-mono mb-1">HTML (Max 50)</label>
                      <input
                        type="number"
                        value={htmlSolved}
                        onChange={(e) => setHtmlSolved(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl glass-input text-xs font-mono font-bold text-center"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] text-slate-400 font-mono mb-1">CSS (Max 50)</label>
                      <input
                        type="number"
                        value={cssSolved}
                        onChange={(e) => setCssSolved(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl glass-input text-xs font-mono font-bold text-center"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] text-slate-400 font-mono mb-1">JS (Max 50)</label>
                      <input
                        type="number"
                        value={jsSolved}
                        onChange={(e) => setJsSolved(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl glass-input text-xs font-mono font-bold text-center"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] text-slate-400 font-mono mb-1">React (Max 50)</label>
                      <input
                        type="number"
                        value={reactSolved}
                        onChange={(e) => setReactSolved(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl glass-input text-xs font-mono font-bold text-center"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between px-2 text-xs font-mono">
                    <span className="text-slate-400">Total Errors Solved:</span>
                    <strong className="text-cyan-400 text-sm">
                      {parseInt(htmlSolved || 0) + parseInt(cssSolved || 0) + parseInt(jsSolved || 0) + parseInt(reactSolved || 0)} / 200
                    </strong>
                  </div>
                </div>
              )}

              {/* Marks & Status Inputs */}
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Awarded Marks</label>
                  <input
                    type="number"
                    value={marks}
                    onChange={(e) => setMarks(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl glass-input text-sm font-mono font-bold text-emerald-400"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Maximum Marks</label>
                  <input
                    type="number"
                    value={maxMarks}
                    onChange={(e) => setMaxMarks(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl glass-input text-sm font-mono"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Mentor Remarks & Performance Feedback</label>
                <textarea
                  rows={3}
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="Enter remarks..."
                  className="w-full px-4 py-2.5 rounded-xl glass-input text-xs"
                />
              </div>

              {/* Status Selector */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-2 font-mono uppercase">
                  Qualification Result Status:
                </label>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {['QUALIFIED', 'NOT_QUALIFIED', 'PENDING', 'DISQUALIFIED'].map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setStatus(s)}
                      className={`
                        py-2.5 px-3 rounded-xl border text-xs font-bold transition-all
                        ${status === s ?
                          s === 'QUALIFIED' ? 'bg-emerald-600 text-white border-emerald-400 shadow-lg shadow-emerald-600/30' :
                          s === 'NOT_QUALIFIED' ? 'bg-rose-600 text-white border-rose-400 shadow-lg shadow-rose-600/30' :
                          s === 'DISQUALIFIED' ? 'bg-slate-800 text-rose-300 border-rose-800' :
                          'bg-amber-600 text-white border-amber-400 shadow-lg'
                        : 'bg-slate-900 text-slate-400 border-slate-800 hover:border-slate-700'}
                      `}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                disabled={saving}
                className="w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-cyan-500 text-white font-bold text-sm hover:from-indigo-500 hover:to-cyan-400 transition-all shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2 disabled:opacity-40"
              >
                <Save className="w-4 h-4" />
                <span>{saving ? 'Saving Evaluation...' : 'SAVE EVALUATION & UPDATE MARKS'}</span>
              </button>

            </form>
          ) : (
            <div className="text-center py-12 text-slate-500 text-sm">
              No teams available for Round {selectedRound}. Create teams first.
            </div>
          )}

        </div>

        {/* Right Col: Round Evaluations Summary List */}
        <div className="glass-panel p-6 rounded-3xl space-y-4">
          <h3 className="text-base font-bold text-white font-outfit border-b border-slate-800 pb-3">
            ROUND {selectedRound} EVALUATED TEAMS
          </h3>

          {evaluations.length === 0 ? (
            <div className="text-xs text-slate-500 text-center py-8">
              No evaluations completed yet for Round {selectedRound}.
            </div>
          ) : (
            <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
              {evaluations.map((ev) => (
                <div
                  key={ev._id}
                  onClick={() => setSelectedTeamId(ev.teamId?._id || ev.teamId)}
                  className={`
                    p-4 rounded-2xl border cursor-pointer transition-all space-y-2
                    ${String(ev.teamId?._id || ev.teamId) === String(selectedTeamId) ? 'bg-indigo-950/60 border-indigo-500' : 'bg-slate-950/80 border-slate-800 hover:border-slate-700'}
                  `}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold font-mono text-indigo-300 text-sm">{ev.teamCode}</span>
                    <StatusBadge status={ev.status} />
                  </div>

                  <div className="flex items-center justify-between text-xs font-mono text-slate-400">
                    <span>Solved: {ev.errorsSolved}/{ev.totalErrors}</span>
                    <strong className="text-emerald-400">{ev.marks}/{ev.maxMarks} Marks</strong>
                  </div>

                  {/* Override buttons */}
                  <div className="pt-2 border-t border-slate-900 flex items-center justify-end gap-1.5">
                    {ev.status !== 'QUALIFIED' && (
                      <button
                        onClick={(e) => { e.stopPropagation(); handleOverrideStatus(ev._id, 'QUALIFIED'); }}
                        className="px-2 py-1 rounded bg-emerald-950 text-emerald-300 text-[10px] font-bold border border-emerald-800 hover:bg-emerald-900"
                      >
                        Mark Qualified
                      </button>
                    )}
                    {ev.status !== 'NOT_QUALIFIED' && (
                      <button
                        onClick={(e) => { e.stopPropagation(); handleOverrideStatus(ev._id, 'NOT_QUALIFIED'); }}
                        className="px-2 py-1 rounded bg-rose-950 text-rose-300 text-[10px] font-bold border border-rose-800 hover:bg-rose-900"
                      >
                        Mark Unqualified
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

    </div>
  );
}
