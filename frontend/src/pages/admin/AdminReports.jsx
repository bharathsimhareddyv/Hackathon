import React, { useEffect, useState } from 'react';
import api from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import { FileSpreadsheet, Download, Users, Award, History } from 'lucide-react';

export default function AdminReports() {
  const { showToast } = useAuth();
  const [rounds, setRounds] = useState([]);

  useEffect(() => {
    api.get('/rounds').then(response => setRounds(response.data)).catch(error => {
      showToast(error.response?.data?.message || 'Could not load rounds for export', 'error');
    });
  }, [showToast]);

  const downloadReport = async (endpoint, fileName) => {
    try {
      const response = await api.get(endpoint, { responseType: 'blob' });
      const blob = new Blob([response.data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      showToast(`Exported ${fileName}`, 'success');
    } catch (err) {
      console.error('Export Error:', err);
      showToast('Failed to export CSV report', 'error');
    }
  };

  return (
    <div className="space-y-8">
      
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white font-outfit">REPORTS & DATA EXPORT</h1>
        <p className="text-xs text-slate-400">Generate CSV report files for participants, round evaluations, marks, and audit logs</p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        
        {/* Participant Report */}
        <div className="glass-panel p-6 rounded-3xl space-y-4 border-indigo-500/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-950 border border-indigo-700/50 flex items-center justify-center">
              <Users className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white font-outfit">Participant Roster CSV Report</h2>
              <p className="text-xs text-slate-400">Export full Arohan ID list, statuses, terms acceptance, and temporary passwords.</p>
            </div>
          </div>
          <button
            onClick={() => downloadReport('/admin/export/participants', 'aarohan_participants_report.csv')}
            className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2 transition-all"
          >
            <Download className="w-4 h-4" />
            <span>EXPORT PARTICIPANTS CSV</span>
          </button>
        </div>

        {rounds.map(round => <div key={round._id} className="glass-panel space-y-4 rounded-3xl border border-cyan-500/20 p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-cyan-700/50 bg-cyan-950"><Award className="h-5 w-5 text-cyan-400" /></div>
            <div><h2 className="font-outfit text-base font-bold text-white">{round.name}</h2><p className="text-xs text-slate-400">Export evaluation marks, participant IDs, and qualification status for this round.</p></div>
          </div>
          <button onClick={() => downloadReport(`/admin/export/evaluations/${round.roundNumber}`, `aarohan_${round.name.toLowerCase().replace(/[^a-z0-9]+/g, '_')}_evaluations.csv`)} className="flex w-full items-center justify-center gap-2 rounded-xl bg-cyan-700 px-4 py-2.5 text-xs font-bold text-white transition-all hover:bg-cyan-600">
            <Download className="h-4 w-4" /><span>EXPORT EVALUATIONS CSV</span>
          </button>
        </div>)}

        {/* Activity Logs */}
        <div className="glass-panel p-6 rounded-3xl space-y-4 border-emerald-500/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-950 border border-emerald-700/50 flex items-center justify-center">
              <History className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white font-outfit">System Activity Audit Log Report</h2>
              <p className="text-xs text-slate-400">Export full timestamped audit log of all manual overrides, timing shifts, and marks edits.</p>
            </div>
          </div>
          <button
            onClick={() => downloadReport('/admin/export/activity-logs', 'aarohan_system_activity_logs.csv')}
            className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2 transition-all"
          >
            <Download className="w-4 h-4" />
            <span>EXPORT AUDIT LOGS CSV</span>
          </button>
        </div>

      </div>

    </div>
  );
}
