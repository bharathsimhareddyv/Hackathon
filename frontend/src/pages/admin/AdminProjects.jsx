import React, { useState, useEffect } from 'react';
import api from '../../utils/api';
import { downloadProject } from '../../utils/downloadProject';
import { useAuth } from '../../context/AuthContext';
import { GitBranch, UploadCloud, Trash2, Download, ExternalLink } from 'lucide-react';

export default function AdminProjects() {
  const [projects, setProjects] = useState([]);
  const [rounds, setRounds] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [downloadingId, setDownloadingId] = useState('');
  const [assigningProjectId, setAssigningProjectId] = useState('');
  const [branchSelections, setBranchSelections] = useState({});
  const [newProjectBranchIds, setNewProjectBranchIds] = useState([]);

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
  const [sourceType, setSourceType] = useState('zip');

  const { showToast } = useAuth();

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const [projectsRes, roundsRes, branchesRes] = await Promise.all([
        api.get('/projects'),
        api.get('/rounds'),
        api.get('/admin/branches')
      ]);
      setProjects(projectsRes.data);
      setRounds(roundsRes.data);
      setBranches(branchesRes.data);
      setBranchSelections(current => {
        const selections = { ...current };
        projectsRes.data.forEach(project => {
          if (!selections[project._id]) {
            selections[project._id] = (project.assignedBranchIds || []).map(branch => String(branch._id || branch));
          }
        });
        return selections;
      });
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
    if (sourceType === 'zip' && !projectZip) {
      showToast('Choose a ZIP archive to upload', 'error');
      return;
    }
    if (sourceType === 'github' && !githubUrl.trim()) {
      showToast('Enter the GitHub repository URL', 'error');
      return;
    }

    try {
      setUploading(true);
      const formData = new FormData();
      formData.append('name', name);
      formData.append('roundNumber', roundNumber);
      formData.append('assignedBranchIds', JSON.stringify(newProjectBranchIds));
      formData.append('description', description);
      if (sourceType === 'github') formData.append('githubUrl', githubUrl.trim());
      formData.append('instructions', instructions);
      formData.append('totalErrors', totalErrors);
      formData.append('htmlErrors', htmlErrors);
      formData.append('cssErrors', cssErrors);
      formData.append('jsErrors', jsErrors);
      formData.append('reactErrors', reactErrors);
      if (sourceType === 'zip' && projectZip) {
        formData.append('projectZip', projectZip);
      }

      await api.post('/projects/upload', formData);

      showToast(`Uploaded project '${name}'!`, 'success');
      setName('');
      setDescription('');
      setGithubUrl('');
      setInstructions('');
      setProjectZip(null);
      setGithubUrl('');
      setNewProjectBranchIds([]);
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

  const handleDownloadProject = async (project) => {
    try {
      setDownloadingId(project._id);
      await downloadProject(project, api);
    } catch (err) {
      showToast(err.response?.data?.message || 'Project download failed', 'error');
    } finally {
      setDownloadingId('');
    }
  };

  const toggleBranch = (projectId, branchId) => {
    setBranchSelections(current => {
      const selected = current[projectId] || [];
      return {
        ...current,
        [projectId]: selected.includes(branchId)
          ? selected.filter(id => id !== branchId)
          : [...selected, branchId]
      };
    });
  };

  const toggleNewProjectBranch = branchId => {
    setNewProjectBranchIds(current => current.includes(branchId)
      ? current.filter(id => id !== branchId)
      : [...current, branchId]);
  };

  const eligibleBranchesForRound = number => {
    const round = rounds.find(item => Number(item.roundNumber) === Number(number));
    if (!round) return [];
    const assignedIds = round.branchId
      ? [String(round.branchId)]
      : (round.assignedBranchIds || []).map(branch => String(branch._id || branch));
    return branches.filter(branch => assignedIds.includes(String(branch._id)));
  };

  const saveProjectBranches = async project => {
    setAssigningProjectId(project._id);
    try {
      const response = await api.put(`/projects/${project._id}/branches`, {
        assignedBranchIds: branchSelections[project._id] || []
      });
      setProjects(current => current.map(item => item._id === project._id ? response.data : item));
      showToast(`Branch access updated for '${project.name}'`, 'success');
    } catch (error) {
      showToast(error.response?.data?.message || 'Failed to update project branch access', 'error');
    } finally {
      setAssigningProjectId('');
    }
  };

  return (
    <div className="space-y-8">
      
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white font-outfit">PROJECT FILE MANAGER</h1>
        <p className="text-xs text-slate-400">Choose one delivery type for each project: a ZIP archive or a GitHub repository.</p>
      </div>

      {/* UPLOAD PROJECT FORM CARD */}
      <div className="glass-panel p-6 rounded-3xl border-indigo-500/30 space-y-6">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-800">
          <UploadCloud className="w-5 h-5 text-cyan-400" />
          <h2 className="text-base font-bold text-white font-outfit uppercase">
            ADD PROJECT SOURCE & METADATA
          </h2>
        </div>

        <form onSubmit={handleUploadProject} className="space-y-4">
          <div className="flex flex-wrap gap-2" role="group" aria-label="Project source type">
            <button type="button" onClick={() => { setSourceType('zip'); setGithubUrl(''); }} className={`flex items-center gap-2 rounded-lg border px-4 py-2.5 text-xs font-bold ${sourceType === 'zip' ? 'border-cyan-500 bg-cyan-950 text-cyan-100' : 'border-slate-700 text-slate-400'}`}><UploadCloud className="h-4 w-4" /> ZIP archive</button>
            <button type="button" onClick={() => { setSourceType('github'); setProjectZip(null); }} className={`flex items-center gap-2 rounded-lg border px-4 py-2.5 text-xs font-bold ${sourceType === 'github' ? 'border-emerald-500 bg-emerald-950 text-emerald-100' : 'border-slate-700 text-slate-400'}`}><GitBranch className="h-4 w-4" /> GitHub repository</button>
          </div>
          
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Project Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Community Portal Starter"
                className="w-full px-3.5 py-2.5 rounded-xl glass-input text-xs"
                required
              />
            </div>

            <fieldset className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
              <legend className="px-1 text-xs font-semibold text-slate-300">Branches that can access this project</legend>
              <p className="mb-3 text-xs text-slate-500">Assign the selected round to these branches first. Projects remain hidden until both the round and project are assigned.</p>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                {eligibleBranchesForRound(roundNumber).map(branch => {
                  const branchId = String(branch._id);
                  return <label key={branchId} className="flex items-center gap-2 text-xs text-slate-300">
                    <input type="checkbox" checked={newProjectBranchIds.includes(branchId)} onChange={() => toggleNewProjectBranch(branchId)} />
                    {branch.name}
                  </label>;
                })}
                {!eligibleBranchesForRound(roundNumber).length && <p className="text-xs text-slate-500">Assign the selected round to a branch before assigning project access.</p>}
              </div>
              {!newProjectBranchIds.length && <p className="mt-2 text-xs text-amber-300">No branch will see this project until you assign it.</p>}
            </fieldset>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Target Round</label>
              <select
                value={roundNumber}
                onChange={(e) => { setRoundNumber(parseInt(e.target.value, 10)); setNewProjectBranchIds([]); }}
                className="w-full px-3.5 py-2.5 rounded-xl glass-input text-xs font-mono"
              >
                {rounds.map(round => (
                  <option key={round._id} value={round.roundNumber}>{round.name}</option>
                ))}
              </select>
            </div>

            {sourceType === 'zip' && <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Select ZIP File</label>
              <input
                type="file"
                accept=".zip"
                onChange={(e) => setProjectZip(e.target.files[0])}
                className="w-full px-3.5 py-2 rounded-xl glass-input text-xs text-slate-300 file:mr-3 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-indigo-950 file:text-indigo-300"
              />
            </div>}
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
            {sourceType === 'github' && <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">GitHub Repository URL</label>
              <input
                type="url"
                value={githubUrl}
                onChange={(e) => setGithubUrl(e.target.value)}
                placeholder="https://github.com/organization/repository"
                className="w-full px-3.5 py-2.5 rounded-xl glass-input text-xs font-mono"
                required={sourceType === 'github'}
              />
            </div>}
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
                    {rounds.find(round => round.roundNumber === p.roundNumber)?.name || `Round ${p.roundNumber}`}
                  </span>
                  <button
                    onClick={() => handleDeleteProject(p._id, p.name)}
                    className="p-1.5 rounded-lg bg-rose-950/50 hover:bg-rose-900 border border-rose-800/60 text-rose-300 text-xs transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <span className="flex items-center gap-1 text-[11px] font-semibold text-slate-400">{p.githubUrl ? <><GitBranch className="h-3.5 w-3.5 text-emerald-300" />GitHub repository</> : <><Download className="h-3.5 w-3.5 text-cyan-300" />ZIP archive</>}</span>
                <h3 className="text-base font-bold text-white font-outfit">{p.name}</h3>
                <p className="text-xs text-slate-400">{p.description}</p>
                {p.githubUrl && <div className="rounded-lg bg-slate-900 p-3"><a href={p.githubUrl} target="_blank" rel="noreferrer" className="flex items-center gap-2 break-all text-xs text-emerald-300 hover:underline"><ExternalLink className="h-3.5 w-3.5 shrink-0" />{p.githubUrl}</a><code className="mt-2 block break-all text-xs text-slate-300">git clone {p.githubUrl}</code></div>}

                <fieldset className="rounded-xl border border-slate-800 p-3">
                  <legend className="px-1 text-[11px] font-semibold text-slate-300">Branch access</legend>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {branches.map(branch => {
                      const branchId = String(branch._id);
                      const selectedIds = branchSelections[p._id] || [];
                      const eligibleIds = eligibleBranchesForRound(p.roundNumber).map(item => String(item._id));
                      const selected = selectedIds.includes(branchId);
                      return <label key={branchId} className="flex items-center gap-2 text-[11px] text-slate-400">
                        <input type="checkbox" checked={selected} disabled={!selected && !eligibleIds.includes(branchId)} onChange={() => toggleBranch(p._id, branchId)} />
                        {branch.name}
                      </label>;
                    })}
                  </div>
                  <button type="button" onClick={() => saveProjectBranches(p)} disabled={assigningProjectId === p._id} className="mt-3 rounded-lg border border-cyan-800 px-3 py-2 text-[11px] font-bold text-cyan-200 disabled:opacity-50">
                    {assigningProjectId === p._id ? 'Saving…' : 'Save branch access'}
                  </button>
                  {!(branchSelections[p._id] || []).length && <p className="mt-2 text-[11px] text-amber-300">Not assigned to any branch.</p>}
                </fieldset>

                {p.totalErrors > 0 && (
                  <div className="text-[11px] text-cyan-300 font-mono bg-slate-900 p-2 rounded-lg border border-slate-800">
                    Total Errors: {p.totalErrors} (H:{p.htmlErrors}, C:{p.cssErrors}, JS:{p.jsErrors}, R:{p.reactErrors})
                  </div>
                )}

                <div className="pt-2 border-t border-slate-900 text-xs font-mono text-slate-400 flex items-center justify-between">
                  <span>Size: {(p.fileSize / 1024).toFixed(1)} KB</span>
                  {p.filePath && (
                    <button onClick={() => handleDownloadProject(p)} disabled={downloadingId === p._id} className="text-cyan-400 hover:underline flex items-center gap-1 font-semibold disabled:opacity-50">
                      <Download className="w-3.5 h-3.5" />
                      <span>{downloadingId === p._id ? 'Downloading…' : 'Download ZIP'}</span>
                    </button>
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
