import React, { useState, useEffect } from 'react';
import api from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import { FolderGit2, UploadCloud, Trash2, FileCode2, Download } from 'lucide-react';

export default function AdminProjects() {
  const [projects, setProjects] = useState([]);
  const [rounds, setRounds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  // Upload Form State
  const [name, setName] = useState('');
  const [roundNumber, setRoundNumber] = useState(1);
  const [description, setDescription] = useState('');
  const [githubUrl, setGithubUrl] = useState('');
  const [instructions, setInstructions] = useState('');
  const [totalErrors, setTotalErrors] = useState(200);
  const [htmlErrors, setHtmlErrors] = useState(50);
  const [cssErrors, setCssErrors] = useState(50);
  const [jsErrors, setJsErrors] = useState(50);
  const [reactErrors, setReactErrors] = useState(50);
  const [projectZip, setProjectZip] = useState(null);

  const { showToast } = useAuth();

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const [projectsRes, roundsRes] = await Promise.all([api.get('/projects'), api.get('/rounds')]);
      setProjects(projectsRes.data);
      setRounds(roundsRes.data);
    } catch (err) {
      console.error('Fetch Projects Error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const handleUploadProject = async (e) => {
    e.preventDefault();
    if (!name || !roundNumber) {
      showToast('Project name and Round Number are required', 'error');
      return;
    }

    try {
      setUploading(true);
      const formData = new FormData();
      formData.append('name', name);
      formData.append('roundNumber', roundNumber);
      formData.append('description', description);
      formData.append('githubUrl', githubUrl);
      formData.append('instructions', instructions);
      formData.append('totalErrors', totalErrors);
      formData.append('htmlErrors', htmlErrors);
      formData.append('cssErrors', cssErrors);
      formData.append('jsErrors', jsErrors);
      formData.append('reactErrors', reactErrors);
      if (projectZip) {
        formData.append('projectZip', projectZip);
      }

      await api.post('/projects/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      showToast(`Uploaded project '${name}'!`, 'success');
      setName('');
      setDescription('');
      setGithubUrl('');
      setInstructions('');
      setProjectZip(null);
      fetchProjects();
    } catch (err) {
      console.error('Upload Error:', err);
      showToast(err.response?.data?.message || 'Failed to upload project', 'error');
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteProject = async (id, projName) => {
    if (!window.confirm(`Delete project '${projName}'?`)) return;

    try {
      await api.delete(`/projects/${id}`);
      showToast(`Deleted project '${projName}'`, 'success');
      fetchProjects();
    } catch (err) {
      console.error('Delete Project Error:', err);
      showToast('Failed to delete project', 'error');
    }
  };

  return (
    <div className="space-y-8">
      
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white font-outfit">PROJECT FILE MANAGER</h1>
        <p className="text-xs text-slate-400">Upload ZIP project archives, GitHub source links, and debugging task configurations</p>
      </div>

      {/* UPLOAD PROJECT FORM CARD */}
      <div className="glass-panel p-6 rounded-3xl border-indigo-500/30 space-y-6">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-800">
          <UploadCloud className="w-5 h-5 text-cyan-400" />
          <h2 className="text-base font-bold text-white font-outfit uppercase">
            UPLOAD NEW PROJECT ZIP & METADATA
          </h2>
        </div>

        <form onSubmit={handleUploadProject} className="space-y-4">
          
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Project Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Round1_Master_Debugging.zip"
                className="w-full px-3.5 py-2.5 rounded-xl glass-input text-xs"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Target Round</label>
              <select
                value={roundNumber}
                onChange={(e) => setRoundNumber(parseInt(e.target.value, 10))}
                className="w-full px-3.5 py-2.5 rounded-xl glass-input text-xs font-mono"
              >
                {rounds.map(round => (
                  <option key={round._id} value={round.roundNumber}>Round {round.roundNumber} ({round.name})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Select ZIP File</label>
              <input
                type="file"
                accept=".zip"
                onChange={(e) => setProjectZip(e.target.files[0])}
                className="w-full px-3.5 py-2 rounded-xl glass-input text-xs text-slate-300 file:mr-3 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-indigo-950 file:text-indigo-300"
              />
            </div>
          </div>

          <div className="grid sm:grid-cols-5 gap-3 bg-slate-950 p-3 rounded-2xl border border-slate-800">
            <div>
              <label className="block text-[11px] text-slate-400 font-mono">Total Errors</label>
              <input
                type="number"
                value={totalErrors}
                onChange={(e) => setTotalErrors(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-lg glass-input text-xs font-mono text-center"
              />
            </div>
            <div>
              <label className="block text-[11px] text-slate-400 font-mono">HTML Errors</label>
              <input
                type="number"
                value={htmlErrors}
                onChange={(e) => setHtmlErrors(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-lg glass-input text-xs font-mono text-center"
              />
            </div>
            <div>
              <label className="block text-[11px] text-slate-400 font-mono">CSS Errors</label>
              <input
                type="number"
                value={cssErrors}
                onChange={(e) => setCssErrors(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-lg glass-input text-xs font-mono text-center"
              />
            </div>
            <div>
              <label className="block text-[11px] text-slate-400 font-mono">JS Errors</label>
              <input
                type="number"
                value={jsErrors}
                onChange={(e) => setJsErrors(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-lg glass-input text-xs font-mono text-center"
              />
            </div>
            <div>
              <label className="block text-[11px] text-slate-400 font-mono">React Errors</label>
              <input
                type="number"
                value={reactErrors}
                onChange={(e) => setReactErrors(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-lg glass-input text-xs font-mono text-center"
              />
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">GitHub Repo URL (Optional)</label>
              <input
                type="url"
                value={githubUrl}
                onChange={(e) => setGithubUrl(e.target.value)}
                placeholder="https://github.com/aarohan/starter"
                className="w-full px-3.5 py-2.5 rounded-xl glass-input text-xs font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Description</label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Short summary of files included..."
                className="w-full px-3.5 py-2.5 rounded-xl glass-input text-xs"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={uploading}
            className="w-full sm:w-auto px-8 py-3 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-cyan-500 text-white font-bold text-xs hover:from-indigo-500 hover:to-cyan-400 transition-all shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2 disabled:opacity-40"
          >
            <UploadCloud className="w-4 h-4" />
            <span>{uploading ? 'Uploading Project...' : 'UPLOAD & SAVE PROJECT'}</span>
          </button>
        </form>
      </div>

      {/* EXISTING PROJECTS LIST */}
      <div className="glass-panel p-6 rounded-3xl space-y-6">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h2 className="text-base font-bold text-white font-outfit uppercase">
            UPLOADED HACKATHON PROJECTS LIST
          </h2>
          <span className="text-xs text-slate-400 font-mono">Total: {projects.length}</span>
        </div>

        {loading ? (
          <div className="text-center py-12 text-slate-400">Loading projects...</div>
        ) : projects.length === 0 ? (
          <div className="text-center py-12 text-slate-500 text-sm">
            No projects uploaded yet. Use the form above to upload ZIP files.
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {projects.map((p) => (
              <div key={p._id} className="p-5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-3 relative">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-800">
                    ROUND {p.roundNumber}
                  </span>
                  <button
                    onClick={() => handleDeleteProject(p._id, p.name)}
                    className="p-1.5 rounded-lg bg-rose-950/50 hover:bg-rose-900 border border-rose-800/60 text-rose-300 text-xs transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <h3 className="text-base font-bold text-white font-outfit">{p.name}</h3>
                <p className="text-xs text-slate-400">{p.description}</p>

                {p.totalErrors > 0 && (
                  <div className="text-[11px] text-cyan-300 font-mono bg-slate-900 p-2 rounded-lg border border-slate-800">
                    Total Errors: {p.totalErrors} (H:{p.htmlErrors}, C:{p.cssErrors}, JS:{p.jsErrors}, R:{p.reactErrors})
                  </div>
                )}

                <div className="pt-2 border-t border-slate-900 text-xs font-mono text-slate-400 flex items-center justify-between">
                  <span>Size: {(p.fileSize / 1024).toFixed(1)} KB</span>
                  {p.filePath && (
                    <a
                      href={`/api/projects/${p._id}/download`}
                      className="text-cyan-400 hover:underline flex items-center gap-1 font-semibold"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download ZIP</span>
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

      </div>

    </div>
  );
}
