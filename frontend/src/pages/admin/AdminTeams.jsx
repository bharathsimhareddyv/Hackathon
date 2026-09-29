import React, { useState, useEffect } from 'react';
import api from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import { UserCheck, Plus, Trash2, Users, FolderGit2, CheckSquare, Square } from 'lucide-react';

export default function AdminTeams() {
  const [selectedRound, setSelectedRound] = useState(1);
  const [teams, setTeams] = useState([]);
  const [participants, setParticipants] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  // Team creation state
  const [selectedPids, setSelectedPids] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [creating, setCreating] = useState(false);

  const { showToast } = useAuth();

  const fetchData = async () => {
    try {
      setLoading(true);
      const [teamsRes, partsRes, projRes] = await Promise.all([
        api.get(`/admin/teams/round/${selectedRound}`),
        api.get('/admin/participants'),
        api.get('/projects', { params: { roundNumber: selectedRound } })
      ]);

      setTeams(teamsRes.data);
      setParticipants(partsRes.data);
      setProjects(projRes.data);
    } catch (err) {
      console.error('Fetch Teams Data Error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedRound]);

  const togglePidSelection = (pid) => {
    if (selectedPids.includes(pid)) {
      setSelectedPids(selectedPids.filter(id => id !== pid));
    } else {
      setSelectedPids([...selectedPids, pid]);
    }
  };

  const handleCreateTeam = async (e) => {
    e.preventDefault();
    if (selectedPids.length === 0) {
      showToast('Please select at least 1 participant to form a team', 'error');
      return;
    }

    try {
      setCreating(true);
      await api.post('/admin/teams', {
        roundNumber: selectedRound,
        participantIds: selectedPids,
        projectId: selectedProjectId || null
      });

      showToast(`Created team for Round ${selectedRound}!`, 'success');
      setSelectedPids([]);
      setSelectedProjectId('');
      fetchData();
    } catch (err) {
      console.error('Create Team Error:', err);
      showToast(err.response?.data?.message || 'Failed to create team', 'error');
    } finally {
      setCreating(false);
    }
  };

  const handleDissolveTeam = async (teamId, teamCode) => {
    if (!window.confirm(`Dissolve team ${teamCode}?`)) return;

    try {
      await api.delete(`/admin/teams/${teamId}`);
      showToast(`Dissolved team ${teamCode}`, 'success');
      fetchData();
    } catch (err) {
      console.error('Dissolve Team Error:', err);
      showToast('Failed to dissolve team', 'error');
    }
  };

  // Find participants already assigned in this round
  const assignedPidsInThisRound = new Set();
  teams.forEach(t => {
    if (t.participantIds) {
      t.participantIds.forEach(pid => assignedPidsInThisRound.add(pid));
    }
  });

  return (
    <div className="space-y-8">
      
      {/* Header & Round Switcher */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white font-outfit">ROUND-SPECIFIC TEAM FORMATION</h1>
          <p className="text-xs text-slate-400">Teams are created independently for each round under Admin control</p>
        </div>

        {/* Round Tabs */}
        <div className="flex items-center gap-2 bg-slate-950 p-1.5 rounded-2xl border border-slate-800">
          {[1, 2, 3].map((rNum) => (
            <button
              key={rNum}
              onClick={() => setSelectedRound(rNum)}
              className={`px-4 py-2 rounded-xl text-xs font-bold font-mono transition-all ${
                selectedRound === rNum ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              ROUND {rNum} TEAMS
            </button>
          ))}
        </div>
      </div>

      {/* CREATE TEAM SECTION */}
      <div className="glass-panel p-6 rounded-3xl border-indigo-500/30 space-y-6">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-cyan-400" />
            <h2 className="text-base font-bold text-white font-outfit uppercase">
              CREATE NEW TEAM FOR ROUND {selectedRound}
            </h2>
          </div>

          <div className="text-xs text-slate-400 font-mono">
            Selected: <strong className="text-cyan-400">{selectedPids.length}</strong> participants
          </div>
        </div>

        <form onSubmit={handleCreateTeam} className="space-y-4">
          
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Assign Project to Team (Optional)
              </label>
              <select
                value={selectedProjectId}
                onChange={(e) => setSelectedProjectId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl glass-input text-xs"
              >
                <option value="">-- Select Project --</option>
                {projects.map(p => (
                  <option key={p._id} value={p._id}>{p.name}</option>
                ))}
              </select>
            </div>

            <div className="flex items-end">
              <button
                type="submit"
                disabled={creating || selectedPids.length === 0}
                className="w-full py-2.5 px-6 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-cyan-500 text-white font-bold text-xs hover:from-indigo-500 hover:to-cyan-400 transition-all shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2 disabled:opacity-40"
              >
                <Plus className="w-4 h-4" />
                <span>CREATE TEAM ({selectedPids.length} MEMBERS)</span>
              </button>
            </div>
          </div>

          {/* Participant Picker Checklist */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2 font-mono">
              Select Participants for Round {selectedRound} Team:
            </label>

            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2.5 max-h-60 overflow-y-auto p-3 rounded-2xl bg-slate-950/80 border border-slate-800">
              {participants.map((p) => {
                const isAssigned = assignedPidsInThisRound.has(p.arohanId);
                const isSelected = selectedPids.includes(p.arohanId);

                return (
                  <button
                    key={p.arohanId}
                    type="button"
                    disabled={isAssigned}
                    onClick={() => togglePidSelection(p.arohanId)}
                    className={`
                      p-2.5 rounded-xl border text-left text-xs font-mono transition-all flex items-center justify-between
                      ${isSelected ? 'bg-indigo-950 border-indigo-500 text-indigo-200' :
                        isAssigned ? 'bg-slate-900/40 border-slate-800 opacity-40 cursor-not-allowed text-slate-500' :
                        'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'}
                    `}
                  >
                    <span className="font-bold">{p.arohanId}</span>
                    {isSelected ? <CheckSquare className="w-3.5 h-3.5 text-cyan-400" /> : <Square className="w-3.5 h-3.5 text-slate-600" />}
                  </button>
                );
              })}
            </div>
          </div>

        </form>
      </div>

      {/* TEAMS LIST FOR SELECTED ROUND */}
      <div className="glass-panel p-6 rounded-3xl space-y-6">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h2 className="text-base font-bold text-white font-outfit uppercase">
            ROUND {selectedRound} ACTIVE TEAMS LIST
          </h2>
          <span className="text-xs text-slate-400 font-mono">Count: {teams.length} Teams</span>
        </div>

        {loading ? (
          <div className="text-center py-12 text-slate-400">Loading Round {selectedRound} teams...</div>
        ) : teams.length === 0 ? (
          <div className="text-center py-12 text-slate-500 text-sm">
            No teams created for Round {selectedRound} yet. Form teams above.
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {teams.map((t) => (
              <div key={t._id} className="p-5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-3 relative group">
                <div className="flex items-center justify-between">
                  <span className="text-base font-bold font-mono text-indigo-300">{t.teamCode}</span>
                  <button
                    onClick={() => handleDissolveTeam(t._id, t.teamCode)}
                    className="p-1.5 rounded-lg bg-rose-950/50 hover:bg-rose-900 border border-rose-800/60 text-rose-300 text-xs transition-colors"
                    title="Dissolve Team"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] text-slate-500 uppercase font-mono block">Members:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {t.participantIds && t.participantIds.map(pid => (
                      <span key={pid} className="px-2.5 py-1 rounded-lg bg-indigo-950 text-indigo-200 border border-indigo-800 text-xs font-mono font-bold">
                        {pid}
                      </span>
                    ))}
                  </div>
                </div>

                {t.projectId && (
                  <div className="pt-2 text-xs text-cyan-300 font-mono truncate border-t border-slate-900 flex items-center gap-1.5">
                    <FolderGit2 className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Project: {t.projectId.name || 'Assigned'}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

      </div>

    </div>
  );
}
