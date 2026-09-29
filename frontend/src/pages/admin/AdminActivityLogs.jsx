import React, { useState, useEffect } from 'react';
import api from '../../utils/api';
import { History, Search } from 'lucide-react';

export default function AdminActivityLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const res = await api.get('/admin/activity-logs');
      setLogs(res.data);
    } catch (err) {
      console.error('Fetch Logs Error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const filteredLogs = logs.filter(l => {
    const text = `${l.actor} ${l.action} ${l.details} ${l.participantId || ''} ${l.teamId || ''}`.toLowerCase();
    return text.includes(search.toLowerCase());
  });

  return (
    <div className="space-y-8">
      
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white font-outfit">SYSTEM ACTIVITY LOGS</h1>
          <p className="text-xs text-slate-400">Complete immutable audit stream of all admin manual overrides and system changes</p>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search audit logs..."
            className="w-full pl-10 pr-4 py-2 rounded-xl glass-input text-xs"
          />
        </div>
      </div>

      <div className="glass-panel p-6 rounded-3xl space-y-6">
        {loading ? (
          <div className="text-center py-12 text-slate-400">Loading audit logs...</div>
        ) : filteredLogs.length === 0 ? (
          <div className="text-center py-12 text-slate-500 text-sm">No activity logs recorded.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950/80 text-slate-400 uppercase font-mono tracking-wider text-[11px] border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">Actor</th>
                  <th className="py-3 px-4">Action</th>
                  <th className="py-3 px-4">Details</th>
                  <th className="py-3 px-4">Old Value &rarr; New Value</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-sans">
                {filteredLogs.map((log) => (
                  <tr key={log._id} className="hover:bg-slate-900/60 transition-colors">
                    <td className="py-3 px-4 font-mono text-slate-400 whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>

                    <td className="py-3 px-4 font-mono font-bold text-indigo-300">
                      {log.actor}
                    </td>

                    <td className="py-3 px-4 font-mono uppercase font-bold text-cyan-300">
                      {log.action}
                    </td>

                    <td className="py-3 px-4 text-slate-200">
                      {log.details}
                    </td>

                    <td className="py-3 px-4 font-mono text-[11px]">
                      {log.oldValue || log.newValue ? (
                        <span>
                          <strong className="text-rose-400">{log.oldValue || 'N/A'}</strong> &rarr; <strong className="text-emerald-400">{log.newValue}</strong>
                        </span>
                      ) : (
                        <span className="text-slate-500">-</span>
                      )}
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
