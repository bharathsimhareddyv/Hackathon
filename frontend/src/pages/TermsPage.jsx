import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import { ShieldCheck, FileText, CheckSquare, Square, ArrowRight } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

export default function TermsPage() {
  const [terms, setTerms] = useState(null);
  const [accepted, setAccepted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const { user, updateUser, showToast } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchTerms = async () => {
      try {
        const res = await api.get('/terms/current');
        setTerms(res.data);
      } catch (err) {
        console.error('Fetch Terms Error:', err);
        setError('Failed to load terms & conditions');
      } finally {
        setLoading(false);
      }
    };
    fetchTerms();
  }, []);

  const handleAccept = async () => {
    if (!accepted) return;

    try {
      setSubmitting(true);
      const res = await api.post('/terms/accept', { version: terms ? terms.version : '1.0' });
      updateUser({ termsAccepted: true });
      showToast('Terms & Conditions accepted!', 'success');
      navigate('/student/dashboard');
    } catch (err) {
      console.error('Accept Terms Error:', err);
      setError(err.response?.data?.message || 'Failed to accept terms');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#0B0F19]">
      <Navbar />

      <main className="flex-1 max-w-4xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-12">
        <div className="glass-panel p-8 sm:p-10 rounded-3xl relative shadow-2xl border-indigo-500/20">
          
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 rounded-2xl bg-indigo-950 border border-indigo-500/40 flex items-center justify-center">
              <FileText className="w-6 h-6 text-cyan-400" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white font-outfit">
                AAROHAN HACKATHON TERMS & CONDITIONS
              </h1>
              <div className="flex items-center gap-3 text-xs text-slate-400 mt-1">
                <span>Version: <strong className="text-cyan-400">{terms ? terms.version : '1.0'}</strong></span>
                <span>•</span>
                <span>Mandatory Participant Agreement</span>
              </div>
            </div>
          </div>

          {error && (
            <div className="mb-6 p-4 rounded-xl bg-rose-950/80 border border-rose-800 text-rose-200 text-xs font-semibold">
              ⚠️ {error}
            </div>
          )}

          {/* Terms content box */}
          <div className="bg-slate-950/90 border border-slate-800 rounded-2xl p-6 mb-8 max-h-[400px] overflow-y-auto text-sm text-slate-300 space-y-4 leading-relaxed font-sans">
            {loading ? (
              <div className="text-center py-12 text-slate-500">Loading terms content...</div>
            ) : terms ? (
              <div className="prose prose-invert max-w-none text-slate-300 whitespace-pre-wrap">
                {terms.content}
              </div>
            ) : (
              <div>No terms content published yet.</div>
            )}
          </div>

          {/* Acceptance Box */}
          <div className="p-5 rounded-2xl bg-indigo-950/40 border border-indigo-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
            <button
              type="button"
              onClick={() => setAccepted(!accepted)}
              className="flex items-center gap-3 text-left cursor-pointer group"
            >
              {accepted ? (
                <CheckSquare className="w-6 h-6 text-emerald-400 shrink-0" />
              ) : (
                <Square className="w-6 h-6 text-slate-500 group-hover:text-indigo-400 shrink-0 transition-colors" />
              )}
              <span className="text-sm font-semibold text-slate-200 group-hover:text-white transition-colors">
                I have read and agree to the Terms & Conditions of AAROHAN Hackathon 2026.
              </span>
            </button>

            <button
              type="button"
              onClick={handleAccept}
              disabled={!accepted || submitting}
              className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-gradient-to-r from-emerald-600 via-emerald-500 to-cyan-500 text-white font-bold text-sm hover:from-emerald-500 hover:to-cyan-400 transition-all shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2 disabled:opacity-40 shrink-0"
            >
              {submitting ? (
                <span>Recording Acceptance...</span>
              ) : (
                <>
                  <span>ACCEPT & CONTINUE</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>

        </div>
      </main>

      <Footer />
    </div>
  );
}
