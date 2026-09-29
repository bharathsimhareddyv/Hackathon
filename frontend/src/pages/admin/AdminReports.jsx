import React from 'react';
import api from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import { FileSpreadsheet, Download, Users, Award, History } from 'lucide-react';

export default function AdminReports() {
  const { showToast } = useAuth();

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

        {/* Round 1 Evaluations */}
        <div className="glass-panel p-6 rounded-3xl space-y-4 border-cyan-500/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-950 border border-cyan-700/50 flex items-center justify-center">
              <Award className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white font-outfit">Round 1 Debugging Marks Report</h2>
              <p className="text-xs text-slate-400">Export Round 1 error breakdown (HTML, CSS, JS, React), marks, and qualification state.</p>
            </div>
          </div>
          <button
            onClick={() => downloadReport('/admin/export/evaluations/1', 'aarohan_round1_evaluations.csv')}
            className="w-full py-2.5 px-4 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs shadow-lg shadow-cyan-600/20 flex items-center justify-center gap-2 transition-all"
          >
            <Download className="w-4 h-4" />
            <span>EXPORT ROUND 1 EVALUATIONS CSV</span>
          </button>
        </div>

        {/* Round 2 Evaluations */}
        <div className="glass-panel p-6 rounded-3xl space-y-4 border-indigo-500/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-950 border border-indigo-700/50 flex items-center justify-center">
              <Award className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white font-outfit">Round 2 React/GitHub Marks Report</h2>
              <p className="text-xs text-slate-400">Export Round 2 repository scores, code quality ratings, and Round 3 qualification list.</p>
            </div>
          </div>
          <button
            onClick={() => downloadReport('/admin/export/evaluations/2', 'aarohan_round2_evaluations.csv')}
            className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2 transition-all"
          >
            <Download className="w-4 h-4" />
            <span>EXPORT ROUND 2 EVALUATIONS CSV</span>
          </button>
        </div>

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
