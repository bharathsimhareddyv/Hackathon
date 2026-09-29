import React, { useEffect, useState } from 'react';
import { Sparkles } from 'lucide-react';
import api from '../utils/api';

export default function AarohanLogo({ className = '' }) {
  const [logoUrl, setLogoUrl] = useState('');

  useEffect(() => {
    api.get('/settings').then(response => setLogoUrl(response.data.logoUrl || '')).catch(() => {});
  }, []);

  if (logoUrl) return <img src={logoUrl} alt="AAROHAN AI Fellowship Program" className={`h-11 w-44 object-contain object-left ${className}`} />;

  return <div className={`flex min-w-0 items-center gap-2.5 ${className}`}>
    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-emerald-500/30 bg-emerald-950/70 text-emerald-300"><Sparkles className="h-5 w-5" /></span>
    <span className="min-w-0"><strong className="block font-outfit text-base font-extrabold leading-none tracking-wide text-white">AAROHAN</strong><span className="mt-1 block truncate text-[9px] font-bold uppercase tracking-[0.18em] text-emerald-300">AI Fellowship Program</span></span>
  </div>;
}
