import React, { useState, useEffect } from 'react';
import api from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import { ImagePlus } from 'lucide-react';
import { Settings, Save, Eye, EyeOff, KeyRound } from 'lucide-react';

export default function AdminSettings() {
  const [hackathonName, setHackathonName] = useState('AAROHAN PROGRAM HACKATHON');
  const [programName, setProgramName] = useState('Aarohan Tribal Youth Empowerment');
  const [description, setDescription] = useState('Learn • Debug • Build • Innovate');
  const [contactInfo, setContactInfo] = useState('support@aarohan-hackathon.org');
  const [leaderboardPublic, setLeaderboardPublic] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);
  const [logoUrl, setLogoUrl] = useState('');
  const [uploadingLogo, setUploadingLogo] = useState(false);

  const { showToast } = useAuth();

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const res = await api.get('/settings');
      if (res.data) {
        setHackathonName(res.data.hackathonName || 'AAROHAN PROGRAM HACKATHON');
        setProgramName(res.data.programName || 'Aarohan Tribal Youth Empowerment');
        setDescription(res.data.description || 'Learn • Debug • Build • Innovate');
        setContactInfo(res.data.contactInfo || 'support@aarohan-hackathon.org');
        setLeaderboardPublic(res.data.leaderboardPublic !== undefined ? res.data.leaderboardPublic : true);
        setLogoUrl(res.data.logoUrl || '');
      }
    } catch (err) {
      console.error('Fetch Settings Error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      await api.put('/settings', {
        hackathonName,
        programName,
        description,
        contactInfo,
        leaderboardPublic
      });

      showToast('Hackathon platform settings updated!', 'success');
      fetchSettings();
    } catch (err) {
      console.error('Save Settings Error:', err);
      showToast('Failed to save settings', 'error');
    } finally {
      setSaving(false);
    }
  };

  const requestPasswordCode = async () => {
    try {
      const response = await api.post('/auth/admin-password-change/request-code');
      setOtpSent(true);
      showToast(response.data.message, 'success');
    } catch (err) {
      showToast(err.response?.data?.message || 'Could not send verification code', 'error');
    }
  };

  const verifyAndChangePassword = async (event) => {
    event.preventDefault();
    try {
      setChangingPassword(true);
      const response = await api.post('/auth/admin-password-change/verify-code', { code: otpCode, newPassword });
      showToast(response.data.message, 'success');
      setOtpCode('');
      setNewPassword('');
      setOtpSent(false);
    } catch (err) {
      showToast(err.response?.data?.message || 'Password change failed', 'error');
    } finally {
      setChangingPassword(false);
    }
  };

  const uploadLogo = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('logo', file);
    try {
      setUploadingLogo(true);
      const response = await api.post('/settings/logo', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      setLogoUrl(response.data.logoUrl);
      showToast('AAROHAN logo uploaded to Cloudinary', 'success');
    } catch (err) {
      showToast(err.response?.data?.message || 'Logo upload failed', 'error');
    } finally {
      setUploadingLogo(false);
      event.target.value = '';
    }
  };

  return (
    <div className="space-y-8">
      
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white font-outfit">PLATFORM SETTINGS</h1>
        <p className="text-xs text-slate-400">Branding customization, leaderboard visibility, and contact preferences</p>
      </div>

      <section className="glass-panel max-w-3xl rounded-2xl border border-amber-500/20 p-6 sm:p-8">
        <div className="flex items-center gap-2"><KeyRound className="h-4 w-4 text-amber-300" /><h2 className="font-bold text-white">Change admin password</h2></div>
        <p className="mt-2 text-xs text-slate-400">A one-time verification code is sent to the configured organizer email before a new password can be saved.</p>
        {!otpSent ? <button type="button" onClick={requestPasswordCode} className="mt-5 rounded-lg border border-amber-700 bg-amber-950/40 px-4 py-2.5 text-xs font-bold text-amber-100 hover:bg-amber-900/50">Send verification code</button> : <form onSubmit={verifyAndChangePassword} className="mt-5 grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
          <label className="text-xs text-slate-300">6-digit code<input inputMode="numeric" pattern="[0-9]{6}" required value={otpCode} onChange={event => setOtpCode(event.target.value)} className="glass-input mt-1.5 w-full rounded-lg px-3 py-2.5 text-sm" /></label>
          <label className="text-xs text-slate-300">New password<input type="password" minLength="8" required value={newPassword} onChange={event => setNewPassword(event.target.value)} className="glass-input mt-1.5 w-full rounded-lg px-3 py-2.5 text-sm" /></label>
          <button disabled={changingPassword} className="rounded-lg bg-amber-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-amber-500 disabled:opacity-50">{changingPassword ? 'Saving…' : 'Verify & change'}</button>
        </form>}
      </section>

      <div className="glass-panel p-6 sm:p-8 rounded-3xl border-indigo-500/30 space-y-6">
        {loading ? (
          <div className="text-center py-12 text-slate-400">Loading settings...</div>
        ) : (
          <form onSubmit={handleSaveSettings} className="space-y-5">
            
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Hackathon Name</label>
                <input
                  type="text"
                  value={hackathonName}
                  onChange={(e) => setHackathonName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl glass-input text-xs"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Program Title</label>
                <input
                  type="text"
                  value={programName}
                  onChange={(e) => setProgramName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl glass-input text-xs"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Subtitle / Motto</label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl glass-input text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Support Contact Email</label>
              <input
                type="email"
                value={contactInfo}
                onChange={(e) => setContactInfo(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl glass-input text-xs"
              />
            </div>

            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between">
              <div>
                <span className="font-bold text-white text-xs block">Public Leaderboard Visibility</span>
                <span className="text-[11px] text-slate-400">Controls whether students can view the live overall leaderboard.</span>
              </div>
              <button
                type="button"
                onClick={() => setLeaderboardPublic(!leaderboardPublic)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  leaderboardPublic ? 'bg-emerald-950 text-emerald-300 border border-emerald-700' : 'bg-rose-950 text-rose-300 border border-rose-700'
                }`}
              >
                {leaderboardPublic ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                <span>{leaderboardPublic ? 'PUBLICLY VISIBLE' : 'HIDDEN / PRIVATE'}</span>
              </button>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="px-8 py-3 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-cyan-500 text-white font-bold text-xs hover:from-indigo-500 hover:to-cyan-400 transition-all shadow-lg shadow-indigo-600/20 flex items-center gap-2 disabled:opacity-40"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'Saving Settings...' : 'SAVE SETTINGS'}</span>
            </button>
          </form>
        )}
      </div>

      <section className="glass-panel max-w-3xl rounded-2xl border border-emerald-500/20 p-6 sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-4"><div><h2 className="flex items-center gap-2 font-bold text-white"><ImagePlus className="h-4 w-4 text-emerald-300" />Program logo</h2><p className="mt-1 text-xs text-slate-400">Upload the AAROHAN logo for public and admin headers. PNG, JPG, or WebP, up to 5 MB.</p></div><label className="cursor-pointer rounded-lg bg-emerald-700 px-4 py-2.5 text-xs font-bold text-white hover:bg-emerald-600">{uploadingLogo ? 'Uploading…' : 'Upload logo'}<input type="file" accept="image/png,image/jpeg,image/webp" onChange={uploadLogo} disabled={uploadingLogo} className="sr-only" /></label></div>
        {logoUrl && <img src={logoUrl} alt="Current AAROHAN logo" className="mt-5 h-16 max-w-full object-contain object-left" />}
      </section>

    </div>
  );
}
