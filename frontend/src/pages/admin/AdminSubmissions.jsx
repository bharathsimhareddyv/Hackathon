import React, { useState, useEffect } from 'react';
import api from '../../utils/api';
import { UploadCloud, ExternalLink, Download, Search } from 'lucide-react';

export default function AdminSubmissions() {
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRound, setSelectedRound] = useState('');

  const fetchSubmissions = async () => {
    try {
      setLoading(true);
      const res = await api.get('/submissions/admin', {
        params: { roundNumber: selectedRound }
      });
      setSubmissions(res.data);
    } catch (err) {
      console.error('Fetch Submissions Error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubmissions();
  }, [selectedRound]);

  return (
    <div className="space-y-8">
      
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white font-outfit">SUBMISSIONS MONITORING</h1>
          <p className="text-xs text-slate-400">Review participant repository links, commit SHAs, and uploaded ZIP files</p>
        </div>

        <select
          value={selectedRound}
          onChange={(e) => setSelectedRound(e.target.value)}
          className="px-3.5 py-2 rounded-xl glass-input text-xs font-mono font-bold"
        >
          <option value="">All Rounds</option>
          <option value="1">Round 1 Submissions</option>
          <option value="2">Round 2 Submissions</option>
          <option value="3">Round 3 Submissions</option>
        </select>
      </div>

      <div className="glass-panel p-6 rounded-3xl space-y-6">
        {loading ? (
          <div className="text-center py-12 text-slate-400">Loading submissions...</div>
        ) : submissions.length === 0 ? (
          <div className="text-center py-12 text-slate-500 text-sm">
            No submissions recorded yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950/80 text-slate-400 uppercase font-mono tracking-wider text-[11px] border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Round</th>
                  <th className="py-3 px-4">Team Code</th>
                  <th className="py-3 px-4">Participant</th>
                  <th className="py-3 px-4">GitHub Repo / Commit</th>
                  <th className="py-3 px-4">Submitted At</th>
                  <th className="py-3 px-4 text-right">ZIP File</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-sans">
                {submissions.map((sub) => (
                  <tr key={sub._id} className="hover:bg-slate-900/60 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-indigo-300">
                      Round {sub.roundNumber}
                    </td>

                    <td className="py-3 px-4 font-mono font-bold text-cyan-300">
                      {sub.teamCode}
                    </td>

                    <td className="py-3 px-4 font-mono text-slate-200">
                      {sub.participantId}
                    </td>

                    <td className="py-3 px-4 font-mono">
                      {sub.githubUrl ? (
                        <a
                          href={sub.githubUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-cyan-400 hover:underline inline-flex items-center gap-1"
                        >
                          <span>{sub.githubUrl}</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      ) : (
                        <span className="text-slate-500">N/A</span>
                      )}
                      {sub.commitSha && (
                        <div className="text-[11px] text-indigo-300">SHA: {sub.commitSha}</div>
                      )}
                    </td>

                    <td className="py-3 px-4 font-mono text-slate-400">
                      {new Date(sub.submittedAt).toLocaleString()}
                    </td>

                    <td className="py-3 px-4 text-right">
                      {sub.zipPath ? (
                        <a
                          href={`/${sub.zipPath}`}
                          download
                          className="px-2.5 py-1 rounded bg-indigo-950 text-indigo-300 text-xs font-bold border border-indigo-800 inline-flex items-center gap-1 hover:bg-indigo-900"
                        >
                          <Download className="w-3 h-3 text-cyan-400" />
                          <span>ZIP</span>
                        </a>
                      ) : (
                        <span className="text-slate-500">None</span>
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
