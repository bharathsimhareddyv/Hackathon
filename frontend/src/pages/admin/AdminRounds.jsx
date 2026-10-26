import React, { useState, useEffect } from 'react';
import api from '../../utils/api';
import StatusBadge from '../../components/StatusBadge';
import { useAuth } from '../../context/AuthContext';
import { Play, Pause, Square, RotateCcw, Edit, Save, Trash2 } from 'lucide-react';

const toLocalDateTimeInput = value => {
  const date = new Date(value);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};

const localDateTimeToIso = value => new Date(value).toISOString();

function BranchAssignmentSelector({ branches, allBranches, setAllBranches, selectedBranchIds, setSelectedBranchIds }) {
  const toggleBranch = (branchId, checked) => {
    setSelectedBranchIds(current => checked
      ? [...new Set([...current, branchId])]
      : current.filter(id => id !== branchId));
  };
  const allBranchIds = branches.map(branch => String(branch._id));

  return (
    <fieldset className="space-y-2 rounded-xl border border-slate-700 p-3 sm:col-span-2 lg:col-span-7">
      <legend className="px-1 text-xs font-semibold text-slate-300">Branches that can access this round</legend>
      <label className="flex items-center gap-2 text-xs text-cyan-200">
        <input
          type="checkbox"
          checked={allBranches}
          onChange={event => {
            setAllBranches(event.target.checked);
            setSelectedBranchIds(event.target.checked ? allBranchIds : []);
          }}
        />
        All current branches — same round timing for everyone
      </label>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {branches.map(branch => {
          const branchId = String(branch._id);
          return (
            <label key={branchId} className="flex items-center gap-2 text-xs text-slate-300">
              <input
                type="checkbox"
                checked={selectedBranchIds.includes(branchId)}
                onChange={event => {
                  setAllBranches(false);
                  toggleBranch(branchId, event.target.checked);
                }}
              />
              {branch.name}
            </label>
          );
        })}
        {!branches.length && <span className="text-xs text-slate-500">No branches are available.</span>}
      </div>
    </fieldset>
  );
}

export default function AdminRounds() {
  const [rounds, setRounds] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingRound, setEditingRound] = useState(null);
  const [editAllBranches, setEditAllBranches] = useState(false);
  const [editBranchIds, setEditBranchIds] = useState([]);
  
  // Edit Form State
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [instructions, setInstructions] = useState('');
  const [startAt, setStartAt] = useState('');
  const [endAt, setEndAt] = useState('');
  const [maxMarks, setMaxMarks] = useState(100);
  const [minErrorsSolved, setMinErrorsSolved] = useState(0);
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
  const [newRoundAllBranches, setNewRoundAllBranches] = useState(false);
  const [newRoundBranchIds, setNewRoundBranchIds] = useState([]);
  const [creating, setCreating] = useState(false);
  const [deletingRound, setDeletingRound] = useState('');

  const { showToast } = useAuth();

  const fetchRounds = async () => {
    try {
      setLoading(true);
      const [roundsResponse, branchesResponse] = await Promise.all([
        api.get('/rounds'),
        api.get('/admin/branches')
      ]);
      setRounds(roundsResponse.data);
      setBranches(branchesResponse.data);
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
    setMinErrorsSolved(r.qualificationCriteria?.minErrorsSolved ?? 0);
    setMinMarks(r.qualificationCriteria?.minMarks || 60);
    setGithubRepoUrl(r.githubRepoUrl || '');
    setMinPercentage(r.qualificationCriteria?.minPercentage ?? r.requiredMinPercentage ?? 60);
    setCriteriaSummary(r.criteriaSummary || '');
    const assignedBranchIds = r.branchId
      ? [String(r.branchId)]
      : (r.assignedBranchIds || []).map(branch => String(branch._id || branch));
    setEditAllBranches(assignedBranchIds.length > 0 && assignedBranchIds.length === branches.length);
    setEditBranchIds(assignedBranchIds);
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
    if (editBranchIds.length === 0) {
      showToast('Select at least one branch or choose all branches', 'error');
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
        requiredMinPercentage: parseInt(minPercentage, 10),
        assignedBranchIds: editBranchIds
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

  const handleDeleteRound = async round => {
    const confirmed = window.confirm(
      `Delete "${round.name}"? This also deletes its team assignments, projects, submissions, evaluations, and progress claims.`
    );
    if (!confirmed) return;
    setDeletingRound(round._id);
    try {
      await api.delete(`/rounds/${round._id}`);
      showToast(`Deleted ${round.name}`, 'success');
      if (editingRound === round._id) setEditingRound(null);
      await fetchRounds();
    } catch (error) {
      showToast(error.response?.data?.message || 'Failed to delete round', 'error');
    } finally {
      setDeletingRound('');
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
    if (newRoundBranchIds.length === 0) {
      showToast('Select at least one branch or choose all branches', 'error');
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
        assignedBranchIds: newRoundBranchIds,
        qualificationCriteria: { minErrorsSolved: 0, minPercentage: Number(newRoundMinPercentage), minMarks: 60, ruleType: 'OR' }
      });
      showToast(`Created ${newRoundName.trim()}`, 'success');
      setNewRoundName('');
      setNewRoundCriteria('');
      setNewRoundInstructions('');
      setNewRoundMaxMarks(100);
      setNewRoundAllBranches(true);
      setNewRoundBranchIds([]);
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
        <div className="sm:col-span-2 lg:col-span-7"><h2 className="text-base font-bold text-white">Create a round</h2><p className="mt-1 text-xs text-slate-400">Name and configure rounds to fit your event. Round identifiers are assigned automatically.</p></div>
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
        <BranchAssignmentSelector
          branches={branches}
          allBranches={newRoundAllBranches}
          setAllBranches={setNewRoundAllBranches}
          selectedBranchIds={newRoundBranchIds}
          setSelectedBranchIds={setNewRoundBranchIds}
        />
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
                      {r.name}
                    </span>
                    <div>
                      <h2 className="text-xl font-bold text-white font-outfit">{r.name}</h2>
                      <p className="mt-1 text-[11px] text-slate-400">
                        {r.branchId
                          ? `Branch: ${branches.find(branch => String(branch._id) === String(r.branchId))?.name || 'Branch'}`
                          : (r.assignedBranchIds?.length
                            ? `Assigned to: ${r.assignedBranchIds.map(id => branches.find(branch => String(branch._id) === String(id._id || id))?.name || 'Branch').join(', ')}`
                            : 'Not assigned to any branch')}
                      </p>
                    </div>
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
                    <button
                      onClick={() => handleDeleteRound(r)}
                      disabled={deletingRound === r._id}
                      className="px-3 py-1.5 rounded-lg bg-rose-950 border border-rose-800 text-rose-300 text-xs font-bold hover:bg-rose-900 disabled:opacity-50 flex items-center gap-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>{deletingRound === r._id ? 'Deleting…' : 'Delete'}</span>
                    </button>
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
                        <label className="block text-xs font-semibold text-slate-300 mb-1">Minimum Errors Solved</label>
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

                    <BranchAssignmentSelector
                      branches={branches}
                      allBranches={editAllBranches}
                      setAllBranches={setEditAllBranches}
                      selectedBranchIds={editBranchIds}
                      setSelectedBranchIds={setEditBranchIds}
                    />

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
