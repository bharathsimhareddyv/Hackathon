import React, { useState, useEffect } from 'react';
import api from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import { KeyRound, Download, RefreshCw, Eye, EyeOff, ShieldAlert } from 'lucide-react';

export default function AdminCredentials() {
  const [participants, setParticipants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showPasswords, setShowPasswords] = useState(false);
  const [generating, setGenerating] = useState(false);

  const { showToast } = useAuth();

  const fetchCredentials = async () => {
    try {
      setLoading(true);
      const res = await api.get('/admin/participants');
      setParticipants(res.data);
    } catch (err) {
      console.error('Fetch Credentials Error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCredentials();
  }, []);

  const handleGenerateAllPasswords = async () => {
    if (!window.confirm('Generate unique temporary passwords for all participants who do not have one?')) return;

    try {
      setGenerating(true);
      const res = await api.post('/admin/participants/generate-passwords', { overwriteExisting: false });
      showToast(res.data.message, 'success');
      fetchCredentials();
    } catch (err) {
      console.error('Generate Passwords Error:', err);
      showToast('Failed to bulk generate passwords', 'error');
    } finally {
      setGenerating(false);
    }
  };

  const handleExportCSV = async () => {
    try {
      const response = await api.get('/admin/export/participants', { responseType: 'blob' });
      const blob = new Blob([response.data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'aarohan_participant_credentials.csv');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      showToast('Credentials CSV exported successfully!', 'success');
    } catch (err) {
      console.error('Export Error:', err);
      showToast('Failed to export credentials', 'error');
    }
  };

  return (
    <div className="space-y-8">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white font-outfit">CREDENTIAL MANAGEMENT</h1>
          <p className="text-xs text-slate-400">Generate unique temporary passwords and export credential sheets for participants</p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleGenerateAllPasswords}
            disabled={generating}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-500 hover:from-indigo-500 hover:to-cyan-400 text-white font-bold text-xs shadow-lg shadow-indigo-600/20 transition-all flex items-center gap-1.5 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${generating ? 'animate-spin' : ''}`} />
            <span>GENERATE PASSWORDS</span>
          </button>

          <button
            onClick={handleExportCSV}
            className="px-4 py-2.5 rounded-xl bg-emerald-950 border border-emerald-700 hover:bg-emerald-900 text-emerald-300 font-bold text-xs shadow-lg shadow-emerald-950/40 transition-all flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5 text-emerald-400" />
            <span>EXPORT CREDENTIALS CSV</span>
          </button>
        </div>
      </div>

      {/* Security Warning Notice */}
      <div className="p-4 rounded-2xl bg-amber-950/40 border border-amber-800/50 text-amber-200 text-xs flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0" />
          <span>
            Passwords are stored using secure <strong>bcrypt hashing</strong>. Temporary passwords displayed below are only visible to authorized Admins prior to student initial password change.
          </span>
        </div>

        <button
          onClick={() => setShowPasswords(!showPasswords)}
          className="px-3 py-1.5 rounded-lg bg-amber-900/60 hover:bg-amber-900 text-amber-100 font-semibold text-xs transition-all flex items-center gap-1 shrink-0"
        >
          {showPasswords ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
          <span>{showPasswords ? 'Hide Passwords' : 'Reveal Passwords'}</span>
        </button>
      </div>

      {/* CREDENTIALS TABLE */}
      <div className="glass-panel p-6 rounded-3xl space-y-6">
        
        {loading ? (
          <div className="text-center py-12 text-slate-400">Loading credentials database...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950/80 text-slate-400 uppercase font-mono tracking-wider text-[11px] border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">#</th>
                  <th className="py-3 px-4">Arohan ID</th>
                  <th className="py-3 px-4">Temporary Plain Password</th>
                  <th className="py-3 px-4">Force Pass Change</th>
                  <th className="py-3 px-4">Account Status</th>
                  <th className="py-3 px-4 text-right">Created At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-sans">
                {participants.map((p, idx) => (
                  <tr key={p._id} className="hover:bg-slate-900/60 transition-colors">
                    <td className="py-3 px-4 font-mono text-slate-500">{idx + 1}</td>
                    <td className="py-3 px-4 font-mono font-bold text-indigo-300 text-sm">{p.arohanId}</td>
                    <td className="py-3 px-4 font-mono font-bold">
                      {showPasswords ? (
                        <span className="px-2.5 py-1 rounded bg-slate-900 border border-indigo-500/40 text-cyan-300">
                          {p.temporaryPasswordPlain || '*** (User Changed)'}
                        </span>
                      ) : (
                        <span className="text-slate-500">••••••••</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {p.forcePasswordChange ? (
                        <span className="text-amber-400 font-semibold">YES</span>
                      ) : (
                        <span className="text-slate-500">NO</span>
                      )}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-300">{p.status}</td>
                    <td className="py-3 px-4 text-right font-mono text-slate-500">
                      {new Date(p.createdAt).toLocaleDateString()}
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
