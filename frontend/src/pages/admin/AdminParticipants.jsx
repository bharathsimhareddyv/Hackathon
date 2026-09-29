import React, { useState, useEffect } from 'react';
import api from '../../utils/api';
import StatusBadge from '../../components/StatusBadge';
import { useAuth } from '../../context/AuthContext';
import { Users, UserPlus, KeyRound, Search, Filter, RefreshCw, CheckCircle, XCircle } from 'lucide-react';

export default function AdminParticipants() {
  const [participants, setParticipants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Bulk Generator Form State
  const [startId, setStartId] = useState('AIF260001');
  const [endId, setEndId] = useState('AIF260054');
  const [generating, setGenerating] = useState(false);

  const { showToast } = useAuth();

  const fetchParticipants = async () => {
    try {
      setLoading(true);
      const res = await api.get('/admin/participants', {
        params: { search, status: statusFilter }
      });
      setParticipants(res.data);
    } catch (err) {
      console.error('Fetch Participants Error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchParticipants();
  }, [search, statusFilter]);

  const handleBulkGenerate = async (e) => {
    e.preventDefault();
    if (!startId || !endId) {
      showToast('Please enter both Start ID and End ID', 'error');
      return;
    }

    try {
      setGenerating(true);
      const res = await api.post('/admin/participants/generate', { startId, endId });
      showToast(res.data.message, 'success');
      fetchParticipants();
    } catch (err) {
      console.error('Bulk Generate Error:', err);
      showToast(err.response?.data?.message || 'Failed to generate participants', 'error');
    } finally {
      setGenerating(false);
    }
  };

  const handleResetPassword = async (id, arohanId) => {
    if (!window.confirm(`Reset temporary password for ${arohanId}?`)) return;

    try {
      const res = await api.post(`/admin/participants/${id}/reset-password`);
      showToast(`New Temp Password for ${arohanId}: ${res.data.temporaryPassword}`, 'success');
      fetchParticipants();
    } catch (err) {
      console.error('Reset Password Error:', err);
      showToast('Failed to reset password', 'error');
    }
  };

  const handleToggleActive = async (id, currentActive, arohanId) => {
    try {
      await api.put(`/admin/participants/${id}`, { active: !currentActive });
      showToast(`Updated status for ${arohanId}`, 'success');
      fetchParticipants();
    } catch (err) {
      console.error('Toggle Active Error:', err);
      showToast('Failed to update participant state', 'error');
    }
  };

  return (
    <div className="space-y-8">
      
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white font-outfit">PARTICIPANT MANAGEMENT</h1>
        <p className="text-xs text-slate-400">Bulk generate Arohan IDs and manage tribal student participant accounts</p>
      </div>

      {/* BULK GENERATOR FORM CARD */}
      <div className="glass-panel p-6 rounded-3xl border-indigo-500/30">
        <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-800">
          <UserPlus className="w-5 h-5 text-cyan-400" />
          <h2 className="text-base font-bold text-white font-outfit uppercase">
            BULK AROHAN ID GENERATOR
          </h2>
        </div>

        <form onSubmit={handleBulkGenerate} className="grid sm:grid-cols-3 gap-4 items-end">
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
              Starting Arohan ID
            </label>
            <input
              type="text"
              value={startId}
              onChange={(e) => setStartId(e.target.value.toUpperCase())}
              placeholder="AIF260001"
              className="w-full px-4 py-2.5 rounded-xl glass-input text-xs font-mono tracking-wider"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
              Ending Arohan ID
            </label>
            <input
              type="text"
              value={endId}
              onChange={(e) => setEndId(e.target.value.toUpperCase())}
              placeholder="AIF260054"
              className="w-full px-4 py-2.5 rounded-xl glass-input text-xs font-mono tracking-wider"
              required
            />
          </div>

          <button
            type="submit"
            disabled={generating}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-cyan-500 hover:from-indigo-500 hover:to-cyan-400 text-white font-bold text-xs shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2 disabled:opacity-40 transition-all"
          >
            <Users className="w-4 h-4" />
            <span>{generating ? 'Generating IDs...' : 'GENERATE PARTICIPANTS'}</span>
          </button>
        </form>
      </div>

      {/* PARTICIPANTS TABLE LIST */}
      <div className="glass-panel p-6 rounded-3xl space-y-6">
        
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search Arohan ID..."
                className="w-full pl-10 pr-4 py-2 rounded-xl glass-input text-xs"
              />
            </div>
            
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 rounded-xl glass-input text-xs"
            >
              <option value="">All Statuses</option>
              <option value="REGISTERED">REGISTERED</option>
              <option value="READY">READY</option>
              <option value="ROUND1_QUALIFIED">ROUND1 QUALIFIED</option>
              <option value="ROUND2_QUALIFIED">ROUND2 QUALIFIED</option>
              <option value="DISQUALIFIED">DISQUALIFIED</option>
            </select>
          </div>

          <div className="text-xs text-slate-400 font-mono">
            Total Participants: <strong className="text-cyan-400">{participants.length}</strong>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12 text-slate-400">Loading participants...</div>
        ) : participants.length === 0 ? (
          <div className="text-center py-12 text-slate-500 text-sm">
            No participants found. Use the bulk generator above to create Arohan IDs.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950/80 text-slate-400 uppercase font-mono tracking-wider text-[11px] border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Arohan ID</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Terms</th>
                  <th className="py-3 px-4">Current Round</th>
                  <th className="py-3 px-4">Account State</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-sans">
                {participants.map((p) => (
                  <tr key={p._id} className="hover:bg-slate-900/60 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-indigo-300 text-sm">
                      {p.arohanId}
                    </td>

                    <td className="py-3.5 px-4">
                      <StatusBadge status={p.status} />
                    </td>

                    <td className="py-3.5 px-4">
                      {p.termsAccepted ? (
                        <span className="text-emerald-400 font-semibold flex items-center gap-1">
                          <CheckCircle className="w-3.5 h-3.5" /> Accepted
                        </span>
                      ) : (
                        <span className="text-amber-400 font-semibold flex items-center gap-1">
                          <XCircle className="w-3.5 h-3.5" /> Pending
                        </span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 font-mono font-bold text-slate-200">
                      Round {p.currentRound}
                    </td>

                    <td className="py-3.5 px-4">
                      <button
                        onClick={() => handleToggleActive(p._id, p.active, p.arohanId)}
                        className={`px-2.5 py-1 rounded-full text-[11px] font-bold border ${
                          p.active ? 'bg-emerald-950/60 text-emerald-300 border-emerald-800' : 'bg-rose-950/60 text-rose-300 border-rose-800'
                        }`}
                      >
                        {p.active ? 'ACTIVE' : 'DISABLED'}
                      </button>
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => handleResetPassword(p._id, p.arohanId)}
                        className="px-3 py-1.5 rounded-lg bg-indigo-950 border border-indigo-700 text-indigo-200 text-xs font-bold hover:bg-indigo-900 transition-all inline-flex items-center gap-1"
                        title="Reset temporary password"
                      >
                        <KeyRound className="w-3.5 h-3.5 text-cyan-400" />
                        <span>Reset Pass</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

      </div>

    </div>
  );
}
