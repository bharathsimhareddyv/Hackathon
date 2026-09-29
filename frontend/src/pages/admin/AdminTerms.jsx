import React, { useState, useEffect } from 'react';
import api from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import { FileText, Save, Send } from 'lucide-react';

export default function AdminTerms() {
  const [version, setVersion] = useState('1.1');
  const [content, setContent] = useState('');
  const [currentTerms, setCurrentTerms] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const { showToast } = useAuth();

  const fetchTerms = async () => {
    try {
      setLoading(true);
      const res = await api.get('/terms/current');
      setCurrentTerms(res.data);
      if (res.data) {
        setVersion(res.data.version || '1.0');
        setContent(res.data.content || '');
      }
    } catch (err) {
      console.error('Fetch Terms Error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTerms();
  }, []);

  const handlePublishTerms = async (e) => {
    e.preventDefault();
    if (!version || !content) {
      showToast('Version and Content are required', 'error');
      return;
    }

    if (!window.confirm(`Publish Terms & Conditions Version ${version}? All participants will be required to re-accept the new terms upon next login.`)) {
      return;
    }

    try {
      setSaving(true);
      await api.post('/terms/admin', { version, content });
      showToast(`Published Terms Version ${version}!`, 'success');
      fetchTerms();
    } catch (err) {
      console.error('Publish Terms Error:', err);
      showToast('Failed to publish new terms', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-8">
      
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white font-outfit font-bold">TERMS & CONDITIONS ADMIN</h1>
        <p className="text-xs text-slate-400">Configure official hackathon rules and force re-acceptance on version updates</p>
      </div>

      <div className="glass-panel p-6 sm:p-8 rounded-3xl border-indigo-500/30 space-y-6">
        
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-cyan-400" />
            <h2 className="text-base font-bold text-white font-outfit uppercase">
              PUBLISH / EDIT TERMS & CONDITIONS VERSION
            </h2>
          </div>
          <span className="text-xs text-indigo-300 font-mono">
            Active Version: <strong>{currentTerms?.version || '1.0'}</strong>
          </span>
        </div>

        {loading ? (
          <div className="text-center py-12 text-slate-400">Loading terms...</div>
        ) : (
          <form onSubmit={handlePublishTerms} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">New Version Number</label>
              <input
                type="text"
                value={version}
                onChange={(e) => setVersion(e.target.value)}
                placeholder="1.1"
                className="w-full sm:w-48 px-3.5 py-2 rounded-xl glass-input text-xs font-mono font-bold"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Terms & Conditions Content (Markdown Supported)</label>
              <textarea
                rows={12}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="w-full px-4 py-3 rounded-xl glass-input text-xs font-sans leading-relaxed"
                required
              />
            </div>

            <button
              type="submit"
              disabled={saving}
              className="px-8 py-3.5 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-cyan-500 text-white font-bold text-xs hover:from-indigo-500 hover:to-cyan-400 transition-all shadow-lg shadow-indigo-600/20 flex items-center gap-2 disabled:opacity-40"
            >
              <Send className="w-4 h-4" />
              <span>{saving ? 'Publishing...' : `PUBLISH TERMS VERSION ${version}`}</span>
            </button>
          </form>
        )}

      </div>

    </div>
  );
}
