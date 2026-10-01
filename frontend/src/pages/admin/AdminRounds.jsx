import React, { useState, useEffect } from 'react';
import api from '../../utils/api';
import StatusBadge from '../../components/StatusBadge';
import { useAuth } from '../../context/AuthContext';
import { Clock, Play, Pause, Square, RotateCcw, Edit, Save, GitBranch } from 'lucide-react';

const toLocalDateTimeInput = value => {
  const date = new Date(value);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};

const localDateTimeToIso = value => new Date(value).toISOString();

export default function AdminRounds() {
  const [rounds, setRounds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingRound, setEditingRound] = useState(null);
  
  // Edit Form State
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [instructions, setInstructions] = useState('');
  const [startAt, setStartAt] = useState('');
  const [endAt, setEndAt] = useState('');
  const [maxMarks, setMaxMarks] = useState(100);
  const [minErrorsSolved, setMinErrorsSolved] = useState(120);
  const [minMarks, setMinMarks] = useState(60);
  const [githubRepoUrl, setGithubRepoUrl] = useState('');
  const [minPercentage, setMinPercentage] = useState(60);
  const [criteriaSummary, setCriteriaSummary] = useState('');
  const [roundSearch, setRoundSearch] = useState('');
  const [newRoundName, setNewRoundName] = useState('');
  const [newRoundType, setNewRoundType] = useState('APPLICATION');
  const [newRoundStart, setNewRoundStart] = useState('');
  const [newRoundEnd, setNewRoundEnd] = useState('');
  const [newRoundMaxMarks, setNewRoundMaxMarks] = useState(100);
  const [newRoundMinPercentage, setNewRoundMinPercentage] = useState(60);
  const [newRoundCriteria, setNewRoundCriteria] = useState('');
  const [newRoundInstructions, setNewRoundInstructions] = useState('');
  const [creating, setCreating] = useState(false);

  const { showToast } = useAuth();

  const fetchRounds = async () => {
    try {
      setLoading(true);
      const res = await api.get('/rounds');
      setRounds(res.data);
    } catch (err) {
      console.error('Fetch Rounds Error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRounds();
  }, []);

  const handleEditClick = (r) => {
    setEditingRound(r._id);
    setName(r.name);
    setDescription(r.description || '');
    setInstructions(r.instructions || '');
    setStartAt(toLocalDateTimeInput(r.startAt));
    setEndAt(toLocalDateTimeInput(r.endAt));
    setMaxMarks(r.maxMarks || 100);
    setMinErrorsSolved(r.qualificationCriteria?.minErrorsSolved || 120);
    setMinMarks(r.qualificationCriteria?.minMarks || 60);
    setGithubRepoUrl(r.githubRepoUrl || '');
    setMinPercentage(r.qualificationCriteria?.minPercentage ?? r.requiredMinPercentage ?? 60);
    setCriteriaSummary(r.criteriaSummary || '');
  };

  const handleSaveRound = async (id) => {
    const startDate = new Date(startAt);
    const endDate = new Date(endAt);
    if (!startAt || !endAt || !Number.isFinite(startDate.getTime()) || !Number.isFinite(endDate.getTime()) || endDate <= startDate) {
      showToast('End time must be later than start time', 'error');
      return;
    }
    if (!Number.isFinite(Number(maxMarks)) || Number(maxMarks) <= 0) {
      showToast('Maximum marks must be greater than zero', 'error');
      return;
    }
    try {
      await api.put(`/rounds/${id}`, {
        name,
        description,
        instructions,
        startAt: localDateTimeToIso(startAt),
        endAt: localDateTimeToIso(endAt),
        maxMarks: parseInt(maxMarks, 10),
        qualificationCriteria: {
          minErrorsSolved: parseInt(minErrorsSolved, 10),
          minMarks: parseInt(minMarks, 10),
          minPercentage: parseInt(minPercentage, 10),
          ruleType: 'OR'
        },
        githubRepoUrl,
        criteriaSummary,
        requiredMinPercentage: parseInt(minPercentage, 10)
      });

      showToast('Round schedule & settings saved!', 'success');
      setEditingRound(null);
      fetchRounds();
    } catch (err) {
      console.error('Save Round Error:', err);
      showToast('Failed to save round settings', 'error');
    }
  };

  const handleRoundAction = async (roundId, action, extraPayload = {}) => {
    try {
      await api.post(`/rounds/${roundId}/${action}`, extraPayload);
      showToast(`Round status updated to ${action.toUpperCase()}`, 'success');
      fetchRounds();
    } catch (err) {
      console.error('Round Action Error:', err);
      showToast(err.response?.data?.message || 'Failed to update status', 'error');
    }
  };

  const handleCreateRound = async (event) => {
    event.preventDefault();
    const startAt = newRoundStart ? new Date(newRoundStart) : new Date();
    const endAt = newRoundEnd ? new Date(newRoundEnd) : new Date(startAt.getTime() + 2 * 60 * 60 * 1000);
    if (!Number.isFinite(startAt.getTime()) || !Number.isFinite(endAt.getTime()) || endAt <= startAt) {
      showToast('End time must be later than start time', 'error');
      return;
    }
    if (!Number.isFinite(Number(newRoundMaxMarks)) || Number(newRoundMaxMarks) <= 0) {
      showToast('Maximum marks must be greater than zero', 'error');
      return;
    }
    const roundNumber = rounds.reduce((max, round) => Math.max(max, round.roundNumber), 0) + 1;
    try {
      setCreating(true);
      await api.post('/rounds', {
        roundNumber,
        name: newRoundName,
        type: newRoundType,
        instructions: newRoundInstructions,
        criteriaSummary: newRoundCriteria,
        requiredMinPercentage: Number(newRoundMinPercentage),
        startAt: startAt.toISOString(),
        endAt: endAt.toISOString(),
        maxMarks: Number(newRoundMaxMarks),
        qualificationCriteria: { minErrorsSolved: 0, minPercentage: Number(newRoundMinPercentage), minMarks: 60, ruleType: 'OR' }
      });
      showToast(`Round ${roundNumber} created`, 'success');
      setNewRoundName('');
      setNewRoundCriteria('');
      setNewRoundInstructions('');
      setNewRoundMaxMarks(100);
      fetchRounds();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to create round', 'error');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-8">
      
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white font-outfit">ROUND MANAGEMENT & TIMINGS</h1>
        <p className="text-xs text-slate-400">Configure round schedules, start/end dates, max marks, and live controls</p>
      </div>

      <form onSubmit={handleCreateRound} className="glass-panel grid gap-4 rounded-2xl border border-emerald-500/20 p-5 sm:grid-cols-2 lg:grid-cols-7 lg:items-end">
        <div className="sm:col-span-2 lg:col-span-7"><h2 className="text-base font-bold text-white">Create another round</h2><p className="mt-1 text-xs text-slate-400">Rounds are numbered automatically and can be added whenever your event needs them.</p></div>
        <label className="text-xs text-slate-300 sm:col-span-2">Round name<input value={newRoundName} onChange={event => setNewRoundName(event.target.value)} required placeholder="e.g. Final showcase" className="glass-input mt-1.5 w-full rounded-lg px-3 py-2.5 text-sm" /></label>
        <label className="text-xs text-slate-300">Challenge type<select value={newRoundType} onChange={event => setNewRoundType(event.target.value)} className="glass-input mt-1.5 w-full rounded-lg px-3 py-2.5 text-sm"><option value="DEBUGGING">Debugging</option><option value="REACT_GITHUB">React / GitHub</option><option value="APPLICATION">Application</option></select></label>
        <label className="text-xs text-slate-300">Starts<input type="datetime-local" value={newRoundStart} onChange={event => setNewRoundStart(event.target.value)} className="glass-input mt-1.5 w-full rounded-lg px-3 py-2.5 text-xs" /></label>
        <label className="text-xs text-slate-300">Ends<input type="datetime-local" value={newRoundEnd} onChange={event => setNewRoundEnd(event.target.value)} className="glass-input mt-1.5 w-full rounded-lg px-3 py-2.5 text-xs" /></label>
        <label className="text-xs text-slate-300">Max marks<input type="number" min="1" step="any" value={newRoundMaxMarks} onChange={event => setNewRoundMaxMarks(event.target.value)} className="glass-input mt-1.5 w-full rounded-lg px-3 py-2.5 text-sm" /></label>
        <div className="flex gap-3">
          <label className="min-w-0 flex-1 text-xs text-slate-300">Min %<input type="number" min="0" max="100" value={newRoundMinPercentage} onChange={event => setNewRoundMinPercentage(event.target.value)} className="glass-input mt-1.5 w-full rounded-lg px-3 py-2.5 text-sm" /></label>
          <button disabled={creating} className="mt-auto rounded-lg bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-emerald-500 disabled:opacity-50">{creating ? 'Creating…' : 'Create round'}</button>
        </div>
        <label className="text-xs text-slate-300 sm:col-span-2">Qualification criteria<textarea rows={2} value={newRoundCriteria} onChange={event => setNewRoundCriteria(event.target.value)} placeholder="Describe what teams need to qualify" className="glass-input mt-1.5 w-full rounded-lg px-3 py-2.5 text-sm" /></label>
        <label className="text-xs text-slate-300 sm:col-span-2">Team instructions<textarea rows={2} value={newRoundInstructions} onChange={event => setNewRoundInstructions(event.target.value)} className="glass-input mt-1.5 w-full rounded-lg px-3 py-2.5 text-sm" /></label>
      </form>

      <label className="block max-w-lg text-xs text-slate-400">Search rounds and criteria<input value={roundSearch} onChange={event => setRoundSearch(event.target.value)} placeholder="Name, description, or qualification criteria" className="glass-input mt-1.5 w-full rounded-lg px-3 py-2.5 text-sm" /></label>

      {loading ? (
        <div className="text-center py-12 text-slate-400">Loading round schedules...</div>
      ) : (
        <div className="space-y-6">
          {rounds.filter(round => `${round.name} ${round.description} ${round.criteriaSummary}`.toLowerCase().includes(roundSearch.toLowerCase())).map((r) => {
            const isEditing = editingRound === r._id;

            return (
              <div key={r._id} className="glass-panel p-6 sm:p-8 rounded-3xl border-indigo-500/20 space-y-6">
                
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-mono font-bold px-3 py-1 rounded-lg bg-indigo-950 text-indigo-300 border border-indigo-800">
                      ROUND {r.roundNumber}
                    </span>
                    <h2 className="text-xl font-bold text-white font-outfit">{r.name}</h2>
                    <StatusBadge status={r.status} />
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 flex-wrap">
                    {r.status !== 'ACTIVE' && (
                      <button
                        onClick={() => handleRoundAction(r._id, 'start')}
                        className="px-3 py-1.5 rounded-lg bg-emerald-950 border border-emerald-700 text-emerald-300 text-xs font-bold hover:bg-emerald-900 transition-all flex items-center gap-1"
                      >
                        <Play className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Start</span>
                      </button>
                    )}

                    {r.status === 'ACTIVE' && (
                      <button
                        onClick={() => handleRoundAction(r._id, 'pause')}
                        className="px-3 py-1.5 rounded-lg bg-amber-950 border border-amber-700 text-amber-300 text-xs font-bold hover:bg-amber-900 transition-all flex items-center gap-1"
                      >
                        <Pause className="w-3.5 h-3.5 text-amber-400" />
                        <span>Pause</span>
                      </button>
                    )}

                    {r.status !== 'CLOSED' && (
                      <button
                        onClick={() => handleRoundAction(r._id, 'close')}
                        className="px-3 py-1.5 rounded-lg bg-rose-950 border border-rose-700 text-rose-300 text-xs font-bold hover:bg-rose-900 transition-all flex items-center gap-1"
                      >
                        <Square className="w-3.5 h-3.5 text-rose-400" />
                        <span>Close</span>
                      </button>
                    )}

                    <button
                      onClick={() => handleRoundAction(r._id, 'reopen', { minutesToExtend: 60 })}
                      className="px-3 py-1.5 rounded-lg bg-indigo-950 border border-indigo-700 text-indigo-300 text-xs font-bold hover:bg-indigo-900 transition-all flex items-center gap-1"
                    >
                      <RotateCcw className="w-3.5 h-3.5 text-indigo-400" />
                      <span>+60 Mins</span>
                    </button>

                    {!isEditing ? (
                      <button
                        onClick={() => handleEditClick(r)}
                        className="px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-200 text-xs font-bold hover:bg-slate-700 transition-all flex items-center gap-1"
                      >
                        <Edit className="w-3.5 h-3.5 text-cyan-400" />
                        <span>Edit</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => setEditingRound(null)}
                        className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-400 text-xs font-bold"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </div>

                {/* Edit Form or View Panel */}
                {isEditing ? (
                  <div className="space-y-4 pt-2">
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1">Round Title</label>
                        <input
                          type="text"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          className="w-full px-3.5 py-2 rounded-xl glass-input text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1">GitHub Repo URL (Optional)</label>
                        <input
                          type="url"
                          value={githubRepoUrl}
                          onChange={(e) => setGithubRepoUrl(e.target.value)}
                          className="w-full px-3.5 py-2 rounded-xl glass-input text-xs font-mono"
                        />
                      </div>
                    </div>

                    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1">Start Date & Time</label>
                        <input
                          type="datetime-local"
                          value={startAt}
                          onChange={(e) => setStartAt(e.target.value)}
                          className="w-full px-3.5 py-2 rounded-xl glass-input text-xs font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1">End Date & Time</label>
                        <input
                          type="datetime-local"
                          value={endAt}
                          onChange={(e) => setEndAt(e.target.value)}
                          className="w-full px-3.5 py-2 rounded-xl glass-input text-xs font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1">Max Marks</label>
                        <input
                          type="number"
                          min="1"
                          step="any"
                          value={maxMarks}
                          onChange={(e) => setMaxMarks(e.target.value)}
                          className="w-full px-3.5 py-2 rounded-xl glass-input text-xs font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1">Min Errors Solved (Round 1)</label>
                        <input
                          type="number"
                          value={minErrorsSolved}
                          onChange={(e) => setMinErrorsSolved(e.target.value)}
                          className="w-full px-3.5 py-2 rounded-xl glass-input text-xs font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1">Required Completion %</label>
                        <input type="number" min="0" max="100" value={minPercentage} onChange={(e) => setMinPercentage(e.target.value)} className="w-full px-3.5 py-2 rounded-xl glass-input text-xs font-mono" />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">Round Description</label>
                      <textarea
                        rows={2}
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        className="w-full px-3.5 py-2 rounded-xl glass-input text-xs"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">Round Instructions</label>
                      <textarea
                        rows={3}
                        value={instructions}
                        onChange={(e) => setInstructions(e.target.value)}
                        className="w-full px-3.5 py-2 rounded-xl glass-input text-xs"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">Qualification Criteria</label>
                      <textarea rows={2} value={criteriaSummary} onChange={(e) => setCriteriaSummary(e.target.value)} className="w-full px-3.5 py-2 rounded-xl glass-input text-xs" />
                    </div>

                    <button
                      onClick={() => handleSaveRound(r._id)}
                      className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-cyan-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/20 flex items-center gap-1.5"
                    >
                      <Save className="w-4 h-4" />
                      <span>SAVE CHANGES</span>
                    </button>
                  </div>
                ) : (
                  <div className="grid sm:grid-cols-3 gap-6 text-xs text-slate-300">
                    <div>
                      <span className="text-slate-500 block font-mono">Start Time:</span>
                      <strong className="text-slate-200">{new Date(r.startAt).toLocaleString()}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block font-mono">End Time:</span>
                      <strong className="text-slate-200">{new Date(r.endAt).toLocaleString()}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block font-mono">Qualification Rule:</span>
                      <strong className="text-cyan-300 font-mono">
                        {r.qualificationCriteria?.minPercentage ?? r.requiredMinPercentage ?? 60}% completion · Solved &ge; {r.qualificationCriteria?.minErrorsSolved || 0} OR Marks &ge; {r.qualificationCriteria?.minMarks || 60}
                      </strong>
                      {r.criteriaSummary && <p className="mt-2 text-slate-400">{r.criteriaSummary}</p>}
                    </div>
                  </div>
                )}

              </div>
            );
          })}
        </div>
      )}

    </div>
  );
}
